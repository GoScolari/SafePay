import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { Dispute } from '../../database/entities/dispute.entity';
import { Payment } from '../../database/entities/payment.entity';
import { DisputeResolution, DisputeStatus, PaymentStatus, TxStatus } from '../../common/enums';

const TX_STATUS_VALUES = Object.values(TxStatus) as string[];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ── Disputas ───────────────────────────────────────────────────────────────

  async getDisputes(): Promise<Dispute[]> {
    return this.disputeRepo.find({
      where: { status: In([DisputeStatus.OPEN, DisputeStatus.RESPONDED]) },
      relations: ['transaction', 'openedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  async getDisputeDetail(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: [
        'transaction',
        'transaction.initiator',
        'transaction.counterpart',
        'transaction.files',
        'openedBy',
      ],
    });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');
    return dispute;
  }

  async resolveDispute(
    id: string,
    body: { resolution: DisputeResolution; resolutionNote: string },
  ): Promise<{ id: string; resolution: DisputeResolution; status: DisputeStatus }> {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['transaction'],
    });
    if (!dispute) throw new NotFoundException('Disputa no encontrada');
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('La disputa ya fue resuelta');
    }

    dispute.resolution     = body.resolution;
    dispute.resolutionNote = body.resolutionNote;
    dispute.status         = DisputeStatus.RESOLVED;
    dispute.resolvedAt     = new Date();
    await this.disputeRepo.save(dispute);

    const tx = dispute.transaction;
    const payment = await this.paymentRepo.findOne({ where: { transactionId: tx.id } });

    if (body.resolution === DisputeResolution.BUYER) {
      tx.status = TxStatus.REEMBOLSADO;
      if (payment) payment.status = PaymentStatus.REFUNDED;
    } else {
      // SELLER o SPLIT → fondos liberados
      tx.status = TxStatus.COMPLETADO;
      if (payment) payment.status = PaymentStatus.RELEASED;
    }
    await this.txRepo.save(tx);
    if (payment) await this.paymentRepo.save(payment);

    this.logger.log(`Admin resolvió disputa ${id} → ${body.resolution}`);
    return { id: dispute.id, resolution: dispute.resolution, status: dispute.status };
  }

  // ── Transacciones ──────────────────────────────────────────────────────────

  async getTransactions(status?: string): Promise<Transaction[]> {
    const where = status && TX_STATUS_VALUES.includes(status)
      ? { status: status as TxStatus }
      : {};
    return this.txRepo.find({
      where,
      relations: ['initiator', 'counterpart'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getTransactionDetail(id: string): Promise<Transaction> {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: ['initiator', 'counterpart', 'payment', 'shipment', 'dispute'],
    });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    return tx;
  }

  async forceStatus(id: string, status: string): Promise<{ id: string; status: string }> {
    if (!TX_STATUS_VALUES.includes(status)) {
      throw new BadRequestException(
        `Estado inválido: "${status}". Valores válidos: ${TX_STATUS_VALUES.join(', ')}`,
      );
    }
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');

    const previous = tx.status;
    tx.status = status as TxStatus;
    await this.txRepo.save(tx);

    this.logger.warn(`[ADMIN] forceStatus tx ${id}: ${previous} → ${status}`);
    return { id: tx.id, status: tx.status };
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────

  async getUsers(): Promise<object[]> {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return users.map(({ refreshToken: _r, mpAccessToken: _m, ...u }) => u);
  }

  async getUserDetail(id: string): Promise<object> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const recentTx = await this.txRepo.find({
      where: [{ initiatorId: id }, { counterpartId: id }],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const { refreshToken: _r, mpAccessToken: _m, ...safeUser } = user;
    return { ...safeUser, recentTransactions: recentTx };
  }

  async banUser(id: string): Promise<{ id: string; banned: boolean }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.banned) throw new BadRequestException('El usuario ya está baneado');

    user.banned = true;
    await this.userRepo.save(user);

    this.logger.warn(`[ADMIN] baneó usuario ${id}`);
    return { id: user.id, banned: true };
  }
}
