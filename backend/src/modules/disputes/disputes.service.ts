import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { Dispute } from '../../database/entities/dispute.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { Payment } from '../../database/entities/payment.entity';
import {
  DisputeResolution,
  DisputeStatus,
  PaymentStatus,
  TxRole,
  TxStatus,
} from '../../common/enums';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  private readonly mpAccessToken: string;
  private readonly mpApiUrl = 'https://api.mercadopago.com';
  private readonly hasMpCredentials: boolean;

  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.mpAccessToken  = this.config.get<string>('mercadoPago.appId') ?? '';
    this.hasMpCredentials = !!this.mpAccessToken;
  }

  // ── POST /disputes/:txId/open ──────────────────────────────────────────────

  async open(
    txId: string,
    dto: OpenDisputeDto,
    userId: string,
  ): Promise<{ disputeId: string; respondBefore: Date; status: DisputeStatus }> {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    if (tx.status !== TxStatus.ENTREGADO) {
      throw new BadRequestException('Solo se puede disputar una transacción en estado ENTREGADO');
    }

    const buyerId = tx.initiatorRole === TxRole.SELLER ? tx.counterpartId : tx.initiatorId;
    if (buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede abrir una disputa');
    }

    const existing = await this.disputeRepo.findOne({ where: { transactionId: tx.id } });
    if (existing) throw new ConflictException('Ya existe una disputa para esta transacción');

    const respondBefore = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const dispute = this.disputeRepo.create({
      transactionId: tx.id,
      openedById: userId,
      reason: dto.reason,
      description: dto.description,
      status: DisputeStatus.OPEN,
      respondBefore,
    });
    await this.disputeRepo.save(dispute);

    tx.status = TxStatus.EN_DISPUTA;
    (tx as any).autoReleaseAt = null;
    await this.txRepo.save(tx);

    // TODO: notify TX_DISPUTED al vendedor

    return { disputeId: dispute.id, respondBefore, status: dispute.status };
  }

  // ── POST /disputes/:id/respond ─────────────────────────────────────────────

  async respond(
    id: string,
    dto: RespondDisputeDto,
    userId: string,
  ): Promise<{ id: string; status: DisputeStatus }> {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['transaction'],
    });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');

    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('La disputa no está en estado abierto');
    }

    const tx = dispute.transaction;
    const sellerId = tx.initiatorRole === TxRole.SELLER ? tx.initiatorId : tx.counterpartId;
    if (sellerId !== userId) {
      throw new ForbiddenException('Solo el vendedor puede responder a una disputa');
    }

    dispute.vendorResponse = dto.response;
    dispute.status = DisputeStatus.RESPONDED;
    await this.disputeRepo.save(dispute);

    // TODO: notify al comprador

    return { id: dispute.id, status: dispute.status };
  }

  // ── GET /disputes/:id ──────────────────────────────────────────────────────

  async findById(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['transaction', 'openedBy'],
    });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');
    return dispute;
  }

  // ── POST /disputes/:id/resolve ─────────────────────────────────────────────

  async resolve(
    id: string,
    dto: ResolveDisputeDto,
    _userId: string,
  ): Promise<{ id: string; resolution: DisputeResolution; status: DisputeStatus }> {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['transaction'],
    });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('La disputa ya fue resuelta');
    }

    const tx = dispute.transaction;
    const payment = await this.paymentRepo.findOne({ where: { transactionId: tx.id } });

    dispute.resolution     = dto.resolution;
    dispute.resolutionNote = dto.resolutionNote;
    dispute.status         = DisputeStatus.RESOLVED;
    dispute.resolvedAt     = new Date();
    await this.disputeRepo.save(dispute);

    await this.executeResolution(dto.resolution, payment, tx);

    // TODO: notify a ambas partes

    return { id: dispute.id, resolution: dispute.resolution, status: dispute.status };
  }

  // ── Cron: escalar disputas sin respuesta cada 30 min ──────────────────────

  @Cron('*/30 * * * *')
  async escalateExpiredDisputes(): Promise<void> {
    const expired = await this.disputeRepo.find({
      where: { status: DisputeStatus.OPEN, respondBefore: LessThan(new Date()) },
      relations: ['transaction'],
    });

    if (expired.length === 0) return;
    this.logger.log(`escalateExpiredDisputes: ${expired.length} disputas vencidas`);

    for (const dispute of expired) {
      try {
        const tx = dispute.transaction;
        const payment = await this.paymentRepo.findOne({ where: { transactionId: tx.id } });

        dispute.resolution     = DisputeResolution.BUYER;
        dispute.resolutionNote = 'Vendedor no respondió en el plazo de 48 horas — fallo automático a favor del comprador';
        dispute.status         = DisputeStatus.RESOLVED;
        dispute.resolvedAt     = new Date();
        await this.disputeRepo.save(dispute);

        await this.executeResolution(DisputeResolution.BUYER, payment, tx);

        // TODO: notify a ambas partes
      } catch (err) {
        this.logger.error(`Error al escalar disputa ${dispute.id}: ${String(err)}`);
      }
    }
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  private async executeResolution(
    resolution: DisputeResolution,
    payment: Payment | null,
    tx: Transaction,
  ): Promise<void> {
    switch (resolution) {
      case DisputeResolution.BUYER:
        await this.mpRefund(payment?.mpPaymentId ?? null);
        tx.status = TxStatus.REEMBOLSADO;
        break;

      case DisputeResolution.SELLER:
        await this.mpRelease(payment?.mpPaymentId ?? null);
        tx.status = TxStatus.COMPLETADO;
        break;

      case DisputeResolution.SPLIT: {
        const partialAmount = payment ? Math.floor(payment.amountTotal / 2) : undefined;
        await this.mpRefund(payment?.mpPaymentId ?? null, partialAmount);
        await this.mpRelease(payment?.mpPaymentId ?? null);
        tx.status = TxStatus.COMPLETADO;
        break;
      }
    }

    if (payment) {
      payment.status = resolution === DisputeResolution.BUYER
        ? PaymentStatus.REFUNDED
        : PaymentStatus.RELEASED;
      await this.paymentRepo.save(payment);
    }

    await this.txRepo.save(tx);
  }

  private async mpRefund(mpPaymentId: string | null, amount?: number): Promise<void> {
    if (!this.hasMpCredentials || !mpPaymentId) {
      this.logger.warn('Sin credenciales MP — reembolso solo en DB (modo dev)');
      return;
    }
    const body = amount !== undefined ? { amount } : {};
    try {
      await firstValueFrom(
        this.http.post(
          `${this.mpApiUrl}/v1/payments/${mpPaymentId}/refunds`,
          body,
          { headers: { Authorization: `Bearer ${this.mpAccessToken}` } },
        ),
      );
    } catch (err) {
      this.logger.error(`mpRefund error: ${String(err)}`);
    }
  }

  private async mpRelease(mpPaymentId: string | null): Promise<void> {
    if (!this.hasMpCredentials || !mpPaymentId) {
      this.logger.warn('Sin credenciales MP — liberación solo en DB (modo dev)');
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(
          `${this.mpApiUrl}/v1/advanced_payments/${mpPaymentId}/disbursements/release`,
          {},
          { headers: { Authorization: `Bearer ${this.mpAccessToken}` } },
        ),
      );
    } catch (err) {
      this.logger.error(`mpRelease error: ${String(err)}`);
    }
  }
}
