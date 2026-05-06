import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { TransactionFile } from '../../database/entities/transaction-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionFile])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
