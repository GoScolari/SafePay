import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../database/entities/user.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { Dispute } from '../../database/entities/dispute.entity';
import { Payment } from '../../database/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, Dispute, Payment])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
