import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

@Entity('ratings')
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @Column({ name: 'rated_by' })
  ratedById: string;

  @Column({ name: 'rated_user' })
  ratedUserId: string;

  @Column({ type: 'smallint' })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Transaction, (tx) => tx.ratings)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @ManyToOne(() => User, (u) => u.givenRatings)
  @JoinColumn({ name: 'rated_by' })
  ratedBy: User;

  @ManyToOne(() => User, (u) => u.receivedRatings)
  @JoinColumn({ name: 'rated_user' })
  ratedUser: User;
}
