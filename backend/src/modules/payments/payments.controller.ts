import { Controller, Post, Param, Body, UseGuards, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(@Body() body: any) {
    return this.paymentsService.initiate(body);
  }

  @Post('release/:id')
  @UseGuards(JwtAuthGuard)
  release(@Param('id') id: string) {
    return this.paymentsService.release(id);
  }

  @Post('refund/:id')
  @UseGuards(JwtAuthGuard)
  refund(@Param('id') id: string) {
    return this.paymentsService.refund(id);
  }

  @Post('webhook')
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-signature') signature: string) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
