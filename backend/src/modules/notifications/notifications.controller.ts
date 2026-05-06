import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  registerDevice(@Body() body: any, @CurrentUser() user: any) {
    return this.notificationsService.registerDevice(user.id, body.deviceToken);
  }

  @Get('my')
  getMyNotifications(@CurrentUser() user: any) {
    return this.notificationsService.findByUser(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markRead(id, user.id);
  }
}
