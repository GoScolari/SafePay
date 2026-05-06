import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../database/entities/user.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { Dispute } from '../../database/entities/dispute.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, Dispute])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
