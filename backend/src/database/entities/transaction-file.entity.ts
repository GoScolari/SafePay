import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FileType } from '../../common/enums';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

@Entity('transaction_files')
@Index(['transactionId', 'type'])
export class TransactionFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedById: string;

  @Index()
  @Column({ type: 'enum', enum: FileType })
  type: FileType;

  @Column({ name: 's3_key', type: 'text' })
  s3Key: string;

  @Column({ name: 'mime_type', length: 50, nullable: true })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer', nullable: true })
  sizeBytes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Transaction, (tx) => tx.files)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @ManyToOne(() => User, (u) => u.uploadedFiles, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;
}
