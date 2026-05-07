import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from '../../common/enums';
import { Transaction } from './transaction.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', unique: true })
  transactionId: string;

  @Column({ name: 'mp_payment_id', length: 50, unique: true, nullable: true })
  mpPaymentId: string;

  @Column({ name: 'mp_preference_id', type: 'text', nullable: true })
  mpPreferenceId: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'amount_total', type: 'integer' })
  amountTotal: number;

  @Column({ name: 'amount_fee_mp', type: 'integer', nullable: true })
  amountFeeMp: number | null;

  @Column({ name: 'amount_fee_platform', type: 'integer', nullable: true })
  amountFeePlatform: number | null;

  @Column({ name: 'amount_seller', type: 'integer', nullable: true })
  amountSeller: number | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Transaction, (tx) => tx.payment)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}
