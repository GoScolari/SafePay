import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: { id: string }) {
    return this.transactionsService.create(dto, user.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyTransactions(@CurrentUser() user: { id: string }) {
    return this.transactionsService.findByUser(user.id);
  }

  @Get('archived')
  @UseGuards(JwtAuthGuard)
  getArchivedTransactions(@CurrentUser() user: { id: string }) {
    return this.transactionsService.findArchivedByUser(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  accept(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.accept(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.cancel(id, user.id);
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  deliver(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.deliver(id, user.id);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  archive(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.transactionsService.archive(id, user.id);
  }

  @Get('public/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.transactionsService.findBySlug(slug);
  }
}
