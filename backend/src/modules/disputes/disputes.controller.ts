import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post(':txId/open')
  open(@Param('txId') txId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.disputesService.open(txId, body, user.id);
  }

  @Post(':id/respond')
  respond(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.disputesService.respond(id, body, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.disputesService.resolve(id, body, user.id);
  }
}
