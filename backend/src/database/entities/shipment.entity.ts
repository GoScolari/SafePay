import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourierType, ShipmentStatus } from '../../common/enums';
import { Transaction } from './transaction.entity';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'enum', enum: CourierType })
  courier: CourierType;

  @Column({ name: 'tracking_number', length: 50 })
  trackingNumber: string;

  @Index()
  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Column({ name: 'raw_status', length: 100, nullable: true })
  rawStatus: string;

  @Column({ name: 'last_checked_at', nullable: true })
  lastCheckedAt: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Transaction, (tx) => tx.shipment)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}
