import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DisputeReason, DisputeResolution, DisputeStatus } from '../../common/enums';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', unique: true })
  transactionId: string;

  @Column({ name: 'opened_by' })
  openedById: string;

  @Column({ type: 'enum', enum: DisputeReason })
  reason: DisputeReason;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'enum', enum: DisputeResolution, nullable: true })
  resolution: DisputeResolution;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string;

  @Column({ name: 'respond_before', nullable: true })
  respondBefore: Date;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Transaction, (tx) => tx.dispute)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @ManyToOne(() => User, (u) => u.openedDisputes)
  @JoinColumn({ name: 'opened_by' })
  openedBy: User;
}
