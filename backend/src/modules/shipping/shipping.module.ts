import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { Shipment } from '../../database/entities/shipment.entity';
import { Transaction } from '../../database/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment, Transaction]), ConfigModule, HttpModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
