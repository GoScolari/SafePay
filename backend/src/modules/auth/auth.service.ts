import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async register(_body: any) {
    // TODO: implementar registro con OTP SMS
    return { message: 'register' };
  }

  async login(_body: any) {
    // TODO: implementar login con JWT
    return { message: 'login' };
  }

  async verifyOtp(_body: any) {
    // TODO: verificar OTP Twilio Verify
    return { message: 'verify-otp' };
  }

  async refresh(_body: any) {
    // TODO: rotar access token con refresh token HTTP-only
    return { message: 'refresh' };
  }

  async logout(_body: any) {
    // TODO: invalidar refresh token
    return { message: 'logout' };
  }
}
