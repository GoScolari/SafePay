import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from '../../database/entities/payment.entity';
import { Transaction } from '../../database/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Transaction])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
