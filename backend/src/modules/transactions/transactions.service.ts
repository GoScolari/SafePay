import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Transaction } from '../../database/entities/transaction.entity';
import { Payment } from '../../database/entities/payment.entity';
import { TxModality, TxRole, TxStatus, PaymentStatus } from '../../common/enums';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateTransactionDto, userId: string): Promise<Transaction> {
    const fee = this.calculateFee(dto.amount);
    const slug = await this.generateUniqueSlug();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tx = this.txRepo.create({
      initiatorId: userId,
      initiatorRole: dto.initiatorRole,
      modality: dto.modality,
      amount: dto.amount,
      fee,
      feePayer: dto.feePayer,
      description: dto.description,
      slug,
      status: TxStatus.PROPUESTA,
      expiresAt,
    });

    return this.txRepo.save(tx);
  }

  async findById(id: string): Promise<Transaction> {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: ['initiator', 'counterpart', 'payment', 'shipment', 'dispute'],
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    return tx;
  }

  async findArchivedByUser(userId: string): Promise<Transaction[]> {
    return this.txRepo
      .createQueryBuilder('tx')
      .where('tx.archived_at IS NOT NULL')
      .andWhere('(tx.initiator_id = :userId OR tx.counterpart_id = :userId)', { userId })
      .orderBy('tx.archived_at', 'DESC')
      .getMany();
  }

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.txRepo.find({
      where: [
        { initiatorId: userId, archivedAt: IsNull() },
        { counterpartId: userId, archivedAt: IsNull() },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySlug(slug: string) {
    const tx = await this.txRepo.findOne({
      where: { slug },
      relations: ['initiator'],
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    return {
      id: tx.id,
      slug: tx.slug,
      status: tx.status,
      amount: tx.amount,
      fee: tx.fee,
      feePayer: tx.feePayer,
      description: tx.description,
      modality: tx.modality,
      initiatorRole: tx.initiatorRole,
      initiatorName: tx.initiator?.fullName,
      createdAt: tx.createdAt,
    };
  }

  async accept(id: string, userId: string): Promise<Transaction> {
    const tx = await this.findById(id);

    if (tx.status !== TxStatus.PROPUESTA) {
      throw new BadRequestException('Solo se puede aceptar una transacción en estado PROPUESTA');
    }
    if (tx.initiatorId === userId) {
      throw new ForbiddenException('El iniciador no puede ser la contraparte');
    }

    tx.counterpartId = userId;
    tx.status = TxStatus.CONFIRMADA;
    tx.acceptedAt = new Date();
    await this.txRepo.save(tx);
    return this.findById(id);
  }

  async archive(id: string, userId: string): Promise<Transaction> {
    const tx = await this.findById(id);

    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés permiso para archivar esta transacción');
    }
    const archivableStatuses: TxStatus[] = [TxStatus.COMPLETADO, TxStatus.CANCELADO, TxStatus.EXPIRADO, TxStatus.REEMBOLSADO];
    if (!archivableStatuses.includes(tx.status)) {
      throw new BadRequestException('Solo se pueden archivar transacciones completadas, canceladas, expiradas o reembolsadas');
    }

    tx.archivedAt = new Date();
    return this.txRepo.save(tx);
  }

  async deliver(id: string, userId: string): Promise<Transaction> {
    const tx = await this.findById(id);

    if (tx.modality !== TxModality.PRESENTIAL) {
      throw new BadRequestException('Este endpoint solo aplica a transacciones presenciales');
    }
    if (tx.status !== TxStatus.PAGADO) {
      throw new BadRequestException('Solo se puede confirmar entrega en una transacción PAGADO');
    }
    const sellerId = tx.initiatorRole === TxRole.SELLER ? tx.initiatorId : tx.counterpartId;
    if (sellerId !== userId) {
      throw new ForbiddenException('Solo el vendedor puede confirmar la entrega presencial');
    }

    tx.status = TxStatus.ENTREGADO;
    tx.autoReleaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return this.txRepo.save(tx);
  }

  async cancel(id: string, userId: string): Promise<Transaction> {
    const tx = await this.findById(id);

    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés permiso para cancelar esta transacción');
    }
    if (tx.status !== TxStatus.PROPUESTA && tx.status !== TxStatus.PAGADO) {
      throw new BadRequestException('Solo se puede cancelar en estado PROPUESTA o PAGADO');
    }

    if (tx.status === TxStatus.PAGADO) {
      const payment = await this.paymentRepo.findOne({
        where: { transactionId: id, status: PaymentStatus.HELD },
      });
      if (payment) {
        const mpAccessToken = this.config.get<string>('mercadopago.accessToken');
        if (mpAccessToken && payment.mpPaymentId) {
          await firstValueFrom(
            this.http.post(
              `https://api.mercadopago.com/v1/payments/${payment.mpPaymentId}/refunds`,
              {},
              { headers: { Authorization: `Bearer ${mpAccessToken}` } },
            ),
          );
        } else {
          this.logger.warn('Sin credenciales MP — reembolso solo en DB (modo dev)');
        }
        payment.status = PaymentStatus.REFUNDED;
        await this.paymentRepo.save(payment);
      }
    }

    tx.status = TxStatus.CANCELADO;
    return this.txRepo.save(tx);
  }

  // ── cron jobs ─────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async expireProposals(): Promise<void> {
    await this.txRepo.update(
      { status: TxStatus.PROPUESTA, expiresAt: LessThan(new Date()) },
      { status: TxStatus.EXPIRADO },
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoRelease(): Promise<void> {
    await this.txRepo.update(
      { status: TxStatus.ENTREGADO, autoReleaseAt: LessThan(new Date()) },
      { status: TxStatus.COMPLETADO },
    );
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  private calculateFee(amount: number): number {
    if (amount <= 100_000) return 990;
    if (amount <= 500_000) return 1_490;
    return 1_990;
  }

  private async generateUniqueSlug(): Promise<string> {
    let slug: string;
    let exists: Transaction | null;
    do {
      slug = 'tx-' + crypto.randomBytes(4).toString('hex');
      exists = await this.txRepo.findOne({ where: { slug } });
    } while (exists);
    return slug;
  }
}
