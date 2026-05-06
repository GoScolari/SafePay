import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../database/entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async create(_body: any, _userId: string) {
    // TODO: crear transacción con slug único, calcular fee, expires_at +24h
    return { message: 'create' };
  }

  async findById(id: string) {
    return this.txRepo.findOne({ where: { id }, relations: ['initiator', 'counterpart', 'payment', 'shipment'] });
  }

  async findByUser(userId: string) {
    return this.txRepo.find({
      where: [{ initiatorId: userId }, { counterpartId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  async accept(_id: string, _userId: string) {
    // TODO: validar contraparte, transición PROPUESTA → CONFIRMADA
    return { message: 'accept' };
  }

  async cancel(_id: string, _userId: string) {
    // TODO: validar estado PAGADO → CANCELADO, trigger reembolso MP
    return { message: 'cancel' };
  }
}
