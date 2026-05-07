import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DisputeResolution, UserRole } from '../../common/enums';
import { IsEnum, IsString, MinLength } from 'class-validator';

class ResolveDisputeAdminDto {
  @IsEnum(DisputeResolution)
  resolution: DisputeResolution;

  @IsString()
  @MinLength(10)
  resolutionNote: string;
}

class ForceStatusDto {
  @IsString()
  status: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Disputas ───────────────────────────────────────────────────────────────

  @Get('disputes')
  getDisputes() {
    return this.adminService.getDisputes();
  }

  @Get('disputes/:id')
  getDispute(@Param('id') id: string) {
    return this.adminService.getDisputeDetail(id);
  }

  @Post('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeAdminDto) {
    return this.adminService.resolveDispute(id, dto);
  }

  // ── Transacciones ──────────────────────────────────────────────────────────

  @Get('transactions')
  getTransactions(@Query('status') status?: string) {
    return this.adminService.getTransactions(status);
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    return this.adminService.getTransactionDetail(id);
  }

  @Post('transactions/:id/force-status')
  @HttpCode(HttpStatus.OK)
  forceStatus(@Param('id') id: string, @Body() dto: ForceStatusDto) {
    return this.adminService.forceStatus(id, dto.status);
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }
}
