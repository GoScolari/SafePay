import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterTrackingDto } from './dto/register-tracking.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('track')
  @UseGuards(JwtAuthGuard)
  track(
    @Body() dto: RegisterTrackingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.shippingService.registerTracking(dto, user.id);
  }

  @Get(':txId/status')
  @UseGuards(JwtAuthGuard)
  status(
    @Param('txId') txId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.shippingService.getStatus(txId, user.id);
  }

  @Post('dev-deliver/:txId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  devDeliver(@Param('txId') txId: string) {
    return this.shippingService.devDeliver(txId);
  }

  // Sin JwtAuthGuard — validado internamente con HMAC-SHA256
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ) {
    return this.shippingService.handleWebhook(req.rawBody, signature);
  }
}
