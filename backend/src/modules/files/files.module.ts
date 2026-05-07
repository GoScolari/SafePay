import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { TransactionFile } from '../../database/entities/transaction-file.entity';
import { Transaction } from '../../database/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionFile, Transaction]),
    ConfigModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
