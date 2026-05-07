import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as crypto from 'crypto';
import twilio from 'twilio';
import { User } from '../../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly twilioClient: twilio.Twilio;
  private readonly twilioServiceSid: string;
  private readonly isProd: boolean;
  private readonly refreshExpires: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const sid = this.config.get<string>('twilio.sid');
    const token = this.config.get<string>('twilio.token');
    this.twilioServiceSid = this.config.get<string>('twilio.serviceSid') ?? '';
    this.isProd = this.config.get<string>('nodeEnv') === 'production';
    this.refreshExpires = this.config.get<string>('jwt.refreshExpires') ?? '30d';

    if (sid && token) {
      this.twilioClient = twilio(sid, token);
    }
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('El teléfono ya está registrado');
    }

    const user = this.userRepo.create({
      phone: dto.phone,
      fullName: dto.fullName,
      phoneVerified: false,
    });
    await this.userRepo.save(user);

    await this.sendOtp(dto.phone);
    return { message: 'OTP enviado. Verificá tu teléfono.' };
  }

  async login(dto: LoginDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('Teléfono no registrado');
    }

    await this.sendOtp(dto.phone);
    return { message: 'OTP enviado. Verificá tu teléfono.' };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    res: Response,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('Teléfono no registrado');
    }

    await this.checkOtp(dto.phone, dto.code);

    user.phoneVerified = true;
    const refreshToken = this.signRefreshToken(user.id);
    user.refreshToken = this.hashToken(refreshToken);
    await this.userRepo.save(user);

    this.setRefreshCookie(res, refreshToken);

    const accessToken = this.signAccessToken(user);
    return {
      accessToken,
      user: { id: user.id, fullName: user.fullName, phone: user.phone, role: user.role },
    };
  }

  async refresh(
    userId: string,
    rawRefreshToken: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const hash = this.hashToken(rawRefreshToken);
    if (hash !== user.refreshToken) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const newRefreshToken = this.signRefreshToken(user.id);
    user.refreshToken = this.hashToken(newRefreshToken);
    await this.userRepo.save(user);

    this.setRefreshCookie(res, newRefreshToken);
    return { accessToken: this.signAccessToken(user) };
  }

  async logout(userId: string, res: Response): Promise<{ message: string }> {
    await this.userRepo.update(userId, { refreshToken: null });
    res.clearCookie('refresh_token');
    return { message: 'Sesión cerrada' };
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  private signAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });
  }

  private signRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.refreshExpires as any,
      },
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private setRefreshCookie(res: Response, token: string): void {
    const thirtyDays = 1000 * 60 * 60 * 24 * 30;
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'strict',
      maxAge: thirtyDays,
    });
  }

  private async sendOtp(phone: string): Promise<void> {
    if (!this.twilioClient) return; // sin credenciales en dev, no falla
    await this.twilioClient.verify.v2
      .services(this.twilioServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
  }

  private async checkOtp(phone: string, code: string): Promise<void> {
    if (!this.twilioClient) return; // sin credenciales en dev, acepta cualquier código

    const check = await this.twilioClient.verify.v2
      .services(this.twilioServiceSid)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== 'approved') {
      throw new UnauthorizedException('Código OTP inválido o expirado');
    }
  }
}
