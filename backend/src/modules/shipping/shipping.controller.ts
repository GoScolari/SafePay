import { Controller, Post, Get, Param, Body, UseGuards, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('track')
  @UseGuards(JwtAuthGuard)
  track(@Body() body: any) {
    return this.shippingService.registerTracking(body);
  }

  @Get(':txId/status')
  @UseGuards(JwtAuthGuard)
  status(@Param('txId') txId: string) {
    return this.shippingService.getStatus(txId);
  }

  @Post('webhook')
  webhook(@Req() req: Request, @Headers('x-signature') signature: string) {
    return this.shippingService.handleWebhook(req.body, signature);
  }
}
