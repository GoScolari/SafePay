import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Dispute } from '../../database/entities/dispute.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { Payment } from '../../database/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute, Transaction, Payment]),
    ConfigModule,
    HttpModule,
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
