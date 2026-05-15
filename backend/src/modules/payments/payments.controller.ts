import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentsService.initiate(dto, user.id);
  }

  @Post('release/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  release(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentsService.release(id, user.id);
  }

  @Post('refund/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  refund(@Param('id') id: string) {
    return this.paymentsService.refund(id);
  }

  @Post('dev-confirm/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  devConfirm(@Param('id') id: string) {
    return this.paymentsService.devConfirm(id);
  }

  // Sin JwtAuthGuard — validado internamente con HMAC-SHA256
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
