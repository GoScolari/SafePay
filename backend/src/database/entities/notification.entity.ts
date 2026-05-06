import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../../common/enums';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('notifications')
@Index(['userId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Index()
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 100, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Index()
  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Transaction, (tx) => tx.notifications, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}
