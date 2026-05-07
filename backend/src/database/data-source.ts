import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Transaction } from './entities/transaction.entity';
import { Payment } from './entities/payment.entity';
import { TransactionFile } from './entities/transaction-file.entity';
import { Shipment } from './entities/shipment.entity';
import { Dispute } from './entities/dispute.entity';
import { Notification } from './entities/notification.entity';
import { Rating } from './entities/rating.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'safepay_db',
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  entities: [User, Transaction, Payment, TransactionFile, Shipment, Dispute, Notification, Rating],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
