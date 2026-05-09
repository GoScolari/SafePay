import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../common/enums';
import { Transaction } from './transaction.entity';
import { Notification } from './notification.entity';
import { Rating } from './rating.entity';
import { TransactionFile } from './transaction-file.entity';
import { Dispute } from './dispute.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ length: 15, unique: true })
  phone: string;

  @Column({ length: 255, unique: true, nullable: true })
  email: string;

  @Column({ length: 12, unique: true, nullable: true })
  rut: string;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'rut_verified', default: false })
  rutVerified: boolean;

  @Exclude()
  @Column({ name: 'mp_access_token', type: 'text', nullable: true })
  mpAccessToken: string;

  @Exclude()
  @Column({ name: 'device_token', type: 'text', nullable: true })
  deviceToken: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating: number;

  @Column({ name: 'total_tx', type: 'integer', nullable: true })
  totalTx: number;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  banned: boolean;

  @Exclude()
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (tx) => tx.initiator)
  initiatedTransactions: Transaction[];

  @OneToMany(() => Transaction, (tx) => tx.counterpart)
  counterpartTransactions: Transaction[];

  @OneToMany(() => TransactionFile, (f) => f.uploadedBy)
  uploadedFiles: TransactionFile[];

  @OneToMany(() => Dispute, (d) => d.openedBy)
  openedDisputes: Dispute[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  @OneToMany(() => Rating, (r) => r.ratedBy)
  givenRatings: Rating[];

  @OneToMany(() => Rating, (r) => r.ratedUser)
  receivedRatings: Rating[];
}
