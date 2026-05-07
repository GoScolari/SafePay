import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ValidateRutDto } from './dto/validate-rut.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(user.id, dto);
  }

  @Post('validate-rut')
  @HttpCode(HttpStatus.OK)
  validateRut(@Body() dto: ValidateRutDto) {
    return this.usersService.validateRut(dto.rut);
  }

  @Get(':id/reputation')
  getReputation(@Param('id') id: string) {
    return this.usersService.getReputation(id);
  }

  @Get('mp/connect')
  @UseGuards(JwtAuthGuard)
  mpConnect(@CurrentUser() user: { id: string }) {
    return this.usersService.getMpConnectUrl(user.id);
  }

  // Sin JwtAuthGuard — es un redirect externo de Mercado Pago
  @Get('mp/callback')
  mpCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
  ) {
    return this.usersService.handleMpCallback(code, userId);
  }

  @Delete('mp/disconnect')
  @UseGuards(JwtAuthGuard)
  mpDisconnect(@CurrentUser() user: { id: string }) {
    return this.usersService.disconnectMp(user.id);
  }

  @Get('mp/status')
  @UseGuards(JwtAuthGuard)
  mpStatus(@CurrentUser() user: { id: string }) {
    return this.usersService.getMpStatus(user.id);
  }
}
