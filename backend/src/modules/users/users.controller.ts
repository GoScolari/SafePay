import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.update(user.id, body);
  }

  @Post('validate-rut')
  validateRut(@Body() body: any) {
    return this.usersService.validateRut(body.rut);
  }

  @Get(':id/reputation')
  getReputation(@Param('id') id: string) {
    return this.usersService.getReputation(id);
  }

  @Get('mp/connect')
  mpConnect(@CurrentUser() user: any) {
    return this.usersService.getMpConnectUrl(user.id);
  }

  @Get('mp/callback')
  mpCallback(@Body() body: any) {
    return this.usersService.handleMpCallback(body.code);
  }

  @Delete('mp/disconnect')
  mpDisconnect(@CurrentUser() user: any) {
    return this.usersService.disconnectMp(user.id);
  }

  @Get('mp/status')
  mpStatus(@CurrentUser() user: any) {
    return this.usersService.getMpStatus(user.id);
  }
}
