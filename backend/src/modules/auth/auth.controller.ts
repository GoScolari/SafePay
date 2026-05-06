import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: any) {
    return this.authService.verifyOtp(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: any) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() body: any) {
    return this.authService.logout(body);
  }
}
