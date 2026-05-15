import {
  BadRequestException,
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
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Payment } from '../../database/entities/payment.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { FeePayer, NotificationType, PaymentStatus, TxRole, TxStatus } from '../../common/enums';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly mpAccessToken: string;
  private readonly mpWebhookSecret: string;
  private readonly apiUrl: string;
  private readonly hasMpCredentials: boolean;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.mpAccessToken = this.config.get<string>('mercadoPago.appId') ?? '';
    this.mpWebhookSecret = this.config.get<string>('mercadoPago.webhookSecret') ?? '';
    this.apiUrl = this.config.get<string>('apiUrl') ?? 'http://localhost:3000';
    this.hasMpCredentials = !!this.mpAccessToken;
  }

  async initiate(
    dto: InitiatePaymentDto,
    userId: string,
  ): Promise<{ checkoutUrl: string | null; paymentId: string }> {
    const tx = await this.txRepo.findOne({
      where: { id: dto.transactionId },
      relations: ['initiator', 'counterpart'],
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    if (tx.status !== TxStatus.CONFIRMADA) {
      throw new BadRequestException(
        'Solo se puede iniciar el pago en una transacción CONFIRMADA',
      );
    }
    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés permiso para iniciar este pago');
    }

    // Determinar quién es el vendedor para obtener su token MP
    const sellerId =
      tx.initiatorRole === TxRole.SELLER ? tx.initiatorId : tx.counterpartId;
    const seller = tx.initiatorRole === TxRole.SELLER ? tx.initiator : tx.counterpart;

    // Si ya existe un payment para esta tx, devolverlo
    const existing = await this.paymentRepo.findOne({
      where: { transactionId: tx.id },
    });
    if (existing) {
      return { checkoutUrl: null, paymentId: existing.id };
    }

    const unitPrice = this.calculateUnitPrice(tx.amount, tx.fee, tx.feePayer);

    let checkoutUrl: string | null = null;
    let mpPreferenceId: string | null = null;

    if (this.hasMpCredentials && seller?.mpAccessToken) {
      const vendorToken = this.usersService.decryptMpToken(seller.mpAccessToken);
      const preferenceBody = {
        items: [
          {
            title: tx.description,
            quantity: 1,
            currency_id: 'CLP',
            unit_price: unitPrice,
          },
        ],
        marketplace_fee: tx.fee,
        back_urls: {
          success: `safepay://tx/${tx.slug}/success`,
          failure: `safepay://tx/${tx.slug}/failure`,
        },
        notification_url: `${this.apiUrl}/api/v1/payments/webhook`,
        metadata: { transaction_id: tx.id },
      };

      const resp = await firstValueFrom(
        this.http.post<{ id: string; init_point: string }>(
          'https://api.mercadopago.com/checkout/preferences',
          preferenceBody,
          { headers: { Authorization: `Bearer ${vendorToken}` } },
        ),
      );
      checkoutUrl = resp.data.init_point;
      mpPreferenceId = resp.data.id;
    } else if (!this.hasMpCredentials) {
      this.logger.warn('Sin credenciales MP — modo dev: checkoutUrl null');
    }

    const payment = this.paymentRepo.create({
      transactionId: tx.id,
      mpPreferenceId: mpPreferenceId ?? undefined,
      amountTotal: unitPrice,
      amountFeePlatform: tx.fee,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(payment);

    // Guardar sellerId en tx para usarlo en release (no existe campo aún, usamos metadata)
    void sellerId;

    return { checkoutUrl, paymentId: payment.id };
  }

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string,
  ): Promise<{ received: boolean }> {
    if (!rawBody) throw new BadRequestException('Body vacío');

    // Validar firma HMAC-SHA256
    if (this.mpWebhookSecret) {
      const expected = crypto
        .createHmac('sha256', this.mpWebhookSecret)
        .update(rawBody)
        .digest('hex');
      const sigBuffer = Buffer.from(signature ?? '', 'utf8');
      const expBuffer = Buffer.from(expected, 'utf8');
      if (
        sigBuffer.length !== expBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expBuffer)
      ) {
        throw new UnauthorizedException('Firma de webhook inválida');
      }
    } else {
      this.logger.warn('MP_WEBHOOK_SECRET no configurado — skip validación HMAC');
    }

    const body = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      data?: { id?: string };
    };

    if (body.type === 'payment' && body.data?.id) {
      await this.processPaymentEvent(body.data.id);
    }

    return { received: true };
  }

  async release(
    paymentId: string,
    userId: string,
  ): Promise<{ released: boolean }> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['transaction', 'transaction.counterpart', 'transaction.initiator'],
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('El pago no está en estado retenido');
    }

    const tx = payment.transaction;
    // Solo el comprador puede confirmar la recepción y liberar fondos
    const buyerId =
      tx.initiatorRole === TxRole.SELLER ? tx.counterpartId : tx.initiatorId;
    if (buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede liberar los fondos');
    }

    if (this.hasMpCredentials && payment.mpPaymentId) {
      const seller =
        tx.initiatorRole === TxRole.SELLER ? tx.initiator : tx.counterpart;
      const vendorToken = seller?.mpAccessToken
        ? this.usersService.decryptMpToken(seller.mpAccessToken)
        : '';

      await firstValueFrom(
        this.http.post(
          `https://api.mercadopago.com/v1/advanced_payments/${payment.mpPaymentId}/disbursements/release`,
          {},
          { headers: { Authorization: `Bearer ${vendorToken}` } },
        ),
      );
    } else {
      this.logger.warn('Sin credenciales MP — liberación solo en DB (modo dev)');
    }

    payment.status = PaymentStatus.RELEASED;
    payment.releasedAt = new Date();
    await this.paymentRepo.save(payment);

    tx.status = TxStatus.COMPLETADO;
    await this.txRepo.save(tx);

    return { released: true };
  }

  async refund(paymentId: string): Promise<{ refunded: boolean }> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['transaction'],
    });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('El pago no está en estado retenido');
    }

    if (this.hasMpCredentials && payment.mpPaymentId) {
      await firstValueFrom(
        this.http.post(
          `https://api.mercadopago.com/v1/payments/${payment.mpPaymentId}/refunds`,
          {},
          { headers: { Authorization: `Bearer ${this.mpAccessToken}` } },
        ),
      );
    } else {
      this.logger.warn('Sin credenciales MP — reembolso solo en DB (modo dev)');
    }

    payment.status = PaymentStatus.REFUNDED;
    await this.paymentRepo.save(payment);

    payment.transaction.status = TxStatus.REEMBOLSADO;
    await this.txRepo.save(payment.transaction);

    return { refunded: true };
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  private calculateUnitPrice(amount: number, fee: number, feePayer: FeePayer): number {
    if (feePayer === FeePayer.BUYER) return amount + fee;
    if (feePayer === FeePayer.SPLIT) return amount + Math.ceil(fee / 2);
    return amount; // SELLER absorbe el fee
  }

  private async processPaymentEvent(mpPaymentId: string): Promise<void> {
    if (!this.hasMpCredentials) return;

    let mpData: { status: string; metadata?: { transaction_id?: string }; transaction_amount?: number; marketplace_fee?: number };
    try {
      const resp = await firstValueFrom(
        this.http.get<typeof mpData>(
          `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
          { headers: { Authorization: `Bearer ${this.mpAccessToken}` } },
        ),
      );
      mpData = resp.data;
    } catch {
      this.logger.error(`Error consultando pago MP ${mpPaymentId}`);
      return;
    }

    const txId = mpData.metadata?.transaction_id;
    if (!txId) return;

    const payment = await this.paymentRepo.findOne({
      where: { transactionId: txId },
      relations: ['transaction'],
    });
    if (!payment) return;

    switch (mpData.status) {
      case 'approved':
        payment.mpPaymentId = mpPaymentId;
        payment.status = PaymentStatus.HELD;
        payment.amountFeeMp = mpData.marketplace_fee ?? null;
        payment.amountSeller =
          (mpData.transaction_amount ?? 0) - (mpData.marketplace_fee ?? 0);
        await this.paymentRepo.save(payment);
        payment.transaction.status = TxStatus.PAGADO;
        await this.txRepo.save(payment.transaction);
        void this.notificationsService.notify({
          userId: payment.transaction.initiatorId,
          type: NotificationType.TX_PAID,
          title: 'Pago recibido',
          body: `El pago por "${payment.transaction.description}" fue acreditado.`,
          transactionId: payment.transaction.id,
        });
        break;

      case 'rejected':
        payment.transaction.status = TxStatus.CONFIRMADA;
        await this.txRepo.save(payment.transaction);
        break;

      case 'refunded':
        payment.status = PaymentStatus.REFUNDED;
        await this.paymentRepo.save(payment);
        payment.transaction.status = TxStatus.REEMBOLSADO;
        await this.txRepo.save(payment.transaction);
        break;
    }
  }

  async devConfirm(paymentId: string): Promise<{ status: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('No disponible en producción');
    }
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: ['transaction'],
    });
    if (!payment) throw new NotFoundException('Payment no encontrado');
    if (payment.transaction.status !== TxStatus.CONFIRMADA) {
      throw new BadRequestException(`Estado actual: ${payment.transaction.status}`);
    }
    payment.status = PaymentStatus.HELD;
    await this.paymentRepo.save(payment);
    payment.transaction.status = TxStatus.PAGADO;
    await this.txRepo.save(payment.transaction);
    void this.notificationsService.notify({
      userId: payment.transaction.initiatorId,
      type: NotificationType.TX_PAID,
      title: 'Pago recibido',
      body: `El pago por "${payment.transaction.description}" fue acreditado.`,
      transactionId: payment.transaction.id,
    });
    return { status: 'PAGADO' };
  }
}
