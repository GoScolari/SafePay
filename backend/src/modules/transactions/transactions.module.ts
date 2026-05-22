import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../database/entities/transaction.entity';
import { Payment } from '../../database/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Payment]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
