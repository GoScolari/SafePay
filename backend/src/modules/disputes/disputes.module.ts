import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Dispute } from '../../database/entities/dispute.entity';
import { Transaction } from '../../database/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, Transaction])],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
