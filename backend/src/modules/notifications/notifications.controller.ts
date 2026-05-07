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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  registerDevice(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.registerDevice(user.id, dto.deviceToken);
  }

  @Get('my')
  getMyNotifications(@CurrentUser() user: { id: string }) {
    return this.notificationsService.findByUser(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markRead(id, user.id);
  }
}
