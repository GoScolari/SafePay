import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Disputas
  @Get('disputes')
  getDisputes() {
    return this.adminService.getDisputes();
  }

  @Get('disputes/:id')
  getDispute(@Param('id') id: string) {
    return this.adminService.getDisputeDetail(id);
  }

  @Post('disputes/:id/resolve')
  resolveDispute(@Param('id') id: string, @Body() body: any) {
    return this.adminService.resolveDispute(id, body);
  }

  // Transacciones
  @Get('transactions')
  getTransactions() {
    return this.adminService.getTransactions();
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    return this.adminService.getTransactionDetail(id);
  }

  @Post('transactions/:id/force-status')
  forceStatus(@Param('id') id: string, @Body() body: any) {
    return this.adminService.forceStatus(id, body.status);
  }

  // Usuarios
  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.adminService.banUser(id);
  }
}
