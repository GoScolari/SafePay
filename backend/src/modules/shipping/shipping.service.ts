import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Shipment } from '../../database/entities/shipment.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { CourierType, NotificationType, ShipmentStatus, TxRole, TxStatus } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterTrackingDto } from './dto/register-tracking.dto';

interface CourierTrackResult {
  rawStatus: string;
  mappedStatus: ShipmentStatus;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  private readonly chxApiKey: string;
  private readonly chxBaseUrl: string;
  private readonly hasChxCredentials: boolean;

  private readonly blxToken: string;
  private readonly blxWebhookSecret: string;
  private readonly blxBaseUrl: string;
  private readonly hasBlxCredentials: boolean;

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.chxApiKey  = this.config.get<string>('chilexpress.apiKey')  ?? '';
    this.chxBaseUrl = this.config.get<string>('chilexpress.baseUrl') ?? 'https://testservices.chilexpress.cl/v1';
    this.hasChxCredentials = !!this.chxApiKey;

    this.blxToken         = this.config.get<string>('bluexpress.token')         ?? '';
    this.blxWebhookSecret = this.config.get<string>('bluexpress.webhookSecret') ?? '';
    this.blxBaseUrl       = this.config.get<string>('bluexpress.baseUrl')       ?? 'https://www.blue.cl/api/v1';
    this.hasBlxCredentials = !!this.blxToken;
  }

  // ── POST /shipping/track ───────────────────────────────────────────────────

  async registerTracking(
    dto: RegisterTrackingDto,
    userId: string,
  ): Promise<{ shipmentId: string; trackingNumber: string; courier: CourierType; status: ShipmentStatus }> {
    const tx = await this.txRepo.findOne({ where: { id: dto.transactionId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    if (tx.status !== TxStatus.PAGADO) {
      throw new BadRequestException('Solo se puede registrar tracking en una transacción PAGADO');
    }

    const sellerId = tx.initiatorRole === TxRole.SELLER ? tx.initiatorId : tx.counterpartId;
    if (sellerId !== userId) {
      throw new ForbiddenException('Solo el vendedor puede registrar el tracking');
    }

    const existing = await this.shipmentRepo.findOne({ where: { transactionId: tx.id } });
    if (existing) throw new ConflictException('Ya existe un tracking registrado para esta transacción');

    const shipment = this.shipmentRepo.create({
      transactionId: tx.id,
      courier: dto.courier,
      trackingNumber: dto.trackingNumber,
      status: ShipmentStatus.PENDING,
    });
    await this.shipmentRepo.save(shipment);

    tx.status = TxStatus.EN_TRANSITO;
    await this.txRepo.save(tx);

    // TODO: notify TX_SHIPPED al comprador

    void this.pollSingleShipment(shipment);

    return {
      shipmentId:     shipment.id,
      trackingNumber: shipment.trackingNumber,
      courier:        shipment.courier,
      status:         shipment.status,
    };
  }

  // ── GET /shipping/:txId/status ─────────────────────────────────────────────

  async getStatus(
    txId: string,
    userId: string,
  ): Promise<{
    courier: CourierType;
    trackingNumber: string;
    status: ShipmentStatus;
    rawStatus: string | null;
    lastCheckedAt: Date | null;
    deliveredAt: Date | null;
  }> {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés acceso a esta transacción');
    }

    const shipment = await this.shipmentRepo.findOne({ where: { transactionId: txId } });
    if (!shipment) throw new NotFoundException('No hay tracking registrado para esta transacción');

    return {
      courier:        shipment.courier,
      trackingNumber: shipment.trackingNumber,
      status:         shipment.status,
      rawStatus:      shipment.rawStatus ?? null,
      lastCheckedAt:  shipment.lastCheckedAt ?? null,
      deliveredAt:    shipment.deliveredAt ?? null,
    };
  }

  // ── POST /shipping/webhook ─────────────────────────────────────────────────

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string,
  ): Promise<{ received: boolean }> {
    if (this.blxWebhookSecret) {
      if (!rawBody) throw new BadRequestException('Body vacío');

      const expected = crypto
        .createHmac('sha256', this.blxWebhookSecret)
        .update(rawBody)
        .digest('hex');
      const sigBuffer = Buffer.from(signature ?? '', 'utf8');
      const expBuffer = Buffer.from(expected, 'utf8');
      if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
        throw new UnauthorizedException('Firma de webhook inválida');
      }
    } else {
      this.logger.warn('BLUEXPRESS_WEBHOOK_SECRET no configurado — skip validación HMAC');
    }

    let body: { tracking_code?: string; status?: string; status_description?: string };
    try {
      const raw = rawBody?.toString('utf8') ?? '{}';
      body = JSON.parse(raw) as typeof body;
    } catch {
      throw new BadRequestException('Body inválido');
    }

    if (!body.tracking_code) return { received: true };

    const shipment = await this.shipmentRepo.findOne({
      where: { trackingNumber: body.tracking_code, courier: CourierType.BLUEXPRESS },
      relations: ['transaction'],
    });
    if (!shipment) return { received: true };

    const rawStatus = body.status_description ?? body.status ?? '';
    const mappedStatus = this.mapBlueExpressStatus(body.status ?? rawStatus);
    await this.applyStatusUpdate(shipment, mappedStatus, rawStatus);

    return { received: true };
  }

  // ── Cron: polling cada 2h ──────────────────────────────────────────────────

  @Cron('0 */2 * * *')
  async pollActiveShipments(): Promise<void> {
    const active = await this.shipmentRepo.find({
      where: { status: ShipmentStatus.IN_TRANSIT },
      relations: ['transaction'],
    });

    this.logger.log(`pollActiveShipments: ${active.length} envíos activos`);

    for (const shipment of active) {
      try {
        await this.pollSingleShipment(shipment);
      } catch (err) {
        this.logger.error(`Error al consultar courier para shipment ${shipment.id}: ${String(err)}`);
      }
    }
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  private async pollSingleShipment(shipment: Shipment): Promise<void> {
    try {
      const result: CourierTrackResult =
        shipment.courier === CourierType.CHILEXPRESS
          ? await this.trackChilexpress(shipment.trackingNumber)
          : await this.trackBlueExpress(shipment.trackingNumber);

      await this.applyStatusUpdate(shipment, result.mappedStatus, result.rawStatus);
    } catch (err) {
      this.logger.error(`pollSingleShipment ${shipment.id}: ${String(err)}`);
    }
  }

  private async applyStatusUpdate(
    shipment: Shipment,
    mappedStatus: ShipmentStatus,
    rawStatus: string,
  ): Promise<void> {
    const tx =
      shipment.transaction ??
      (await this.txRepo.findOne({ where: { id: shipment.transactionId } }));

    if (!tx) {
      this.logger.error(`Transacción no encontrada para shipment ${shipment.id}`);
      return;
    }

    shipment.rawStatus     = rawStatus;
    shipment.lastCheckedAt = new Date();

    if (mappedStatus === ShipmentStatus.DELIVERED && shipment.status !== ShipmentStatus.DELIVERED) {
      shipment.status      = ShipmentStatus.DELIVERED;
      shipment.deliveredAt = new Date();
      tx.status        = TxStatus.ENTREGADO;
      tx.autoReleaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await this.txRepo.save(tx);
      const buyerId = tx.initiatorRole === TxRole.SELLER ? tx.counterpartId : tx.initiatorId;
      if (buyerId) {
        void this.notificationsService.notify({
          userId: buyerId,
          type: NotificationType.TX_DELIVERED,
          title: 'Entrega confirmada',
          body: `Tu pedido "${tx.description}" fue entregado. Tienes 48h para confirmar.`,
          transactionId: tx.id,
        });
      }

    } else if (mappedStatus === ShipmentStatus.FAILED && shipment.status !== ShipmentStatus.FAILED) {
      shipment.status = ShipmentStatus.FAILED;
      // tx permanece EN_TRANSITO — no cambiar tx.status
      for (const userId of [tx.initiatorId, tx.counterpartId].filter(Boolean)) {
        void this.notificationsService.notify({
          userId: userId as string,
          type: NotificationType.TX_SHIPPING_ALERT,
          title: 'Alerta de envío',
          body: `Hubo un problema con el envío de "${tx.description}".`,
          transactionId: tx.id,
        });
      }

    } else if (mappedStatus === ShipmentStatus.IN_TRANSIT && shipment.status === ShipmentStatus.PENDING) {
      shipment.status = ShipmentStatus.IN_TRANSIT;
    }

    await this.shipmentRepo.save(shipment);
  }

  // ── Chilexpress ────────────────────────────────────────────────────────────

  private async trackChilexpress(trackingNumber: string): Promise<CourierTrackResult> {
    if (!this.hasChxCredentials) {
      this.logger.warn('Sin credenciales Chilexpress — modo dev: simulando IN_TRANSIT');
      return { rawStatus: 'EN CAMINO (simulado)', mappedStatus: ShipmentStatus.IN_TRANSIT };
    }

    const resp = await firstValueFrom(
      this.http.get<{
        statusDescription?: string;
        data?: { statusDescription?: string }[];
      }>(`${this.chxBaseUrl}/tracking-shipments/shipments`, {
        params: { ShipmentDocumentNumber: trackingNumber, regionCode: 13 },
        headers: { 'Ocp-Apim-Subscription-Key': this.chxApiKey },
      }),
    );

    const rawStatus =
      resp.data?.data?.[0]?.statusDescription ??
      resp.data?.statusDescription ??
      '';

    return { rawStatus, mappedStatus: this.mapChilexpressStatus(rawStatus) };
  }

  private mapChilexpressStatus(rawStatus: string): ShipmentStatus {
    const s = rawStatus.toUpperCase().trim();
    if (s === 'ENTREGADO') return ShipmentStatus.DELIVERED;
    if (s.includes('EN CAMINO') || s.includes('EN TRÁNSITO') || s.includes('EN TRANSITO')) {
      return ShipmentStatus.IN_TRANSIT;
    }
    if (s.includes('NO ENTREGADO') || s.includes('DEVUELTO')) return ShipmentStatus.FAILED;
    this.logger.warn(`Chilexpress: estado desconocido "${rawStatus}" → IN_TRANSIT`);
    return ShipmentStatus.IN_TRANSIT;
  }

  // ── BlueExpress ────────────────────────────────────────────────────────────

  private async trackBlueExpress(trackingNumber: string): Promise<CourierTrackResult> {
    if (!this.hasBlxCredentials) {
      this.logger.warn('Sin credenciales BlueExpress — modo dev: simulando IN_TRANSIT');
      return { rawStatus: 'in_transit (simulado)', mappedStatus: ShipmentStatus.IN_TRANSIT };
    }

    const resp = await firstValueFrom(
      this.http.get<{ status?: string; status_description?: string }>(
        `${this.blxBaseUrl}/tracking/${trackingNumber}`,
        { headers: { Authorization: `Bearer ${this.blxToken}` } },
      ),
    );

    const rawStatus = resp.data?.status_description ?? resp.data?.status ?? '';
    return { rawStatus, mappedStatus: this.mapBlueExpressStatus(resp.data?.status ?? rawStatus) };
  }

  private mapBlueExpressStatus(status: string): ShipmentStatus {
    const s = status.toLowerCase().trim();
    if (s === 'delivered')  return ShipmentStatus.DELIVERED;
    if (s === 'in_transit') return ShipmentStatus.IN_TRANSIT;
    if (s === 'failed')     return ShipmentStatus.FAILED;
    this.logger.warn(`BlueExpress: estado desconocido "${status}" → IN_TRANSIT`);
    return ShipmentStatus.IN_TRANSIT;
  }
}
