import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FilesModule } from './modules/files/files.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { User } from './database/entities/user.entity';
import { Transaction } from './database/entities/transaction.entity';
import { Payment } from './database/entities/payment.entity';
import { TransactionFile } from './database/entities/transaction-file.entity';
import { Shipment } from './database/entities/shipment.entity';
import { Dispute } from './database/entities/dispute.entity';
import { Notification } from './database/entities/notification.entity';
import { Rating } from './database/entities/rating.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        database: process.env.DB_NAME ?? 'safepay_db',
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        entities: [User, Transaction, Payment, TransactionFile, Shipment, Dispute, Notification, Rating],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    TransactionsModule,
    PaymentsModule,
    FilesModule,
    ShippingModule,
    DisputesModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
