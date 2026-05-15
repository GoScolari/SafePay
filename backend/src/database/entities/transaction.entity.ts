import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeePayer, TxModality, TxRole, TxStatus } from '../../common/enums';
import { User } from './user.entity';
import { Payment } from './payment.entity';
import { TransactionFile } from './transaction-file.entity';
import { Shipment } from './shipment.entity';
import { Dispute } from './dispute.entity';
import { Notification } from './notification.entity';
import { Rating } from './rating.entity';

@Entity('transactions')
@Index(['initiatorId', 'status'])
@Index(['counterpartId', 'status'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'initiator_id' })
  initiatorId: string;

  @Column({ name: 'counterpart_id', nullable: true })
  counterpartId: string;

  @Column({ name: 'initiator_role', type: 'enum', enum: TxRole })
  initiatorRole: TxRole;

  @Column({ type: 'enum', enum: TxModality })
  modality: TxModality;

  @Index()
  @Column({ type: 'enum', enum: TxStatus, default: TxStatus.PROPUESTA })
  status: TxStatus;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'integer' })
  fee: number;

  @Column({ name: 'fee_payer', type: 'enum', enum: FeePayer })
  feePayer: FeePayer;

  @Index({ unique: true })
  @Column({ length: 12, unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  @Index()
  @Column({ name: 'auto_release_at', type: 'timestamptz', nullable: true })
  autoReleaseAt: Date;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @ManyToOne(() => User, (u) => u.initiatedTransactions)
  @JoinColumn({ name: 'initiator_id' })
  initiator: User;

  @ManyToOne(() => User, (u) => u.counterpartTransactions, { nullable: true })
  @JoinColumn({ name: 'counterpart_id' })
  counterpart: User;

  @OneToOne(() => Payment, (p) => p.transaction)
  payment: Payment;

  @OneToMany(() => TransactionFile, (f) => f.transaction)
  files: TransactionFile[];

  @OneToOne(() => Shipment, (s) => s.transaction)
  shipment: Shipment;

  @OneToOne(() => Dispute, (d) => d.transaction)
  dispute: Dispute;

  @OneToMany(() => Notification, (n) => n.transaction)
  notifications: Notification[];

  @OneToMany(() => Rating, (r) => r.transaction)
  ratings: Rating[];
}
