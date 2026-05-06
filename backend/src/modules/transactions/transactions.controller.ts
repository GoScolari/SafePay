import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.transactionsService.create(body, user.id);
  }

  @Get('my')
  getMyTransactions(@CurrentUser() user: any) {
    return this.transactionsService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionsService.accept(id, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.transactionsService.cancel(id, user.id);
  }
}
