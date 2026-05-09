import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { Transaction } from '../../database/entities/transaction.entity';
import { TxStatus } from '../../common/enums';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
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

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.txRepo.find({
      where: [{ initiatorId: userId }, { counterpartId: userId }],
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

  async cancel(id: string, userId: string): Promise<Transaction> {
    const tx = await this.findById(id);

    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés permiso para cancelar esta transacción');
    }
    if (tx.status !== TxStatus.PAGADO) {
      throw new BadRequestException('Solo se puede cancelar una transacción en estado PAGADO');
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
