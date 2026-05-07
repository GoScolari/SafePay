import { Controller, Get, Param } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionsService } from './modules/transactions/transactions.service';

@Controller()
export class AppController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get('health')
  async health() {
    const dbOk = this.dataSource.isInitialized;
    return {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tx/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.transactionsService.findBySlug(slug);
  }
}
