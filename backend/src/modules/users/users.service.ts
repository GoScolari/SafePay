import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { User } from '../../database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly mpAppId: string;
  private readonly mpClientSecret: string;
  private readonly mpEncryptionKey: string;
  private readonly appUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.mpAppId = this.config.get<string>('mercadoPago.appId') ?? '';
    this.mpClientSecret = this.config.get<string>('mercadoPago.clientSecret') ?? '';
    this.mpEncryptionKey = this.config.get<string>('mercadoPago.encryptionKey') ?? '';
    this.appUrl = this.config.get<string>('apiUrl') ?? 'http://localhost:3000';
  }

  async findById(id: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { refreshToken: _rt, mpAccessToken: _mp, ...safe } = user;
    return safe;
  }

  async update(id: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    await this.userRepo.update(id, dto);
    const user = await this.findById(id);
    return { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email, role: user.role };
  }

  validateRut(rut: string): { valid: boolean } {
    const clean = rut.replace(/[.\-]/g, '').toUpperCase();
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    if (!/^\d+$/.test(body)) return { valid: false };

    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = 11 - (sum % 11);
    const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);

    return { valid: dv === expected };
  }

  async getReputation(id: string) {
    const user = await this.findById(id);
    return { rating: user.rating, totalTx: user.totalTx };
  }

  getMpConnectUrl(userId: string): { url: string } {
    if (!this.mpAppId) return { url: '' };
    const redirectUri = `${this.appUrl}/api/v1/users/mp/callback`;
    const url =
      `https://auth.mercadopago.com/authorization` +
      `?client_id=${this.mpAppId}` +
      `&response_type=code` +
      `&platform_id=mp` +
      `&state=${userId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return { url };
  }

  async handleMpCallback(code: string, userId: string): Promise<{ connected: boolean }> {
    if (!this.mpAppId || !this.mpClientSecret) {
      throw new BadRequestException('Integración con Mercado Pago no configurada');
    }

    const redirectUri = `${this.appUrl}/api/v1/users/mp/callback`;
    const response = await firstValueFrom(
      this.http.post<{ access_token: string }>(
        'https://api.mercadopago.com/oauth/token',
        {
          client_id: this.mpAppId,
          client_secret: this.mpClientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        },
      ),
    );
    const data = response.data;

    const encrypted = this.encrypt(data.access_token);
    await this.userRepo.update(userId, { mpAccessToken: encrypted });
    return { connected: true };
  }

  async disconnectMp(userId: string): Promise<{ disconnected: boolean }> {
    await this.userRepo.update(userId, { mpAccessToken: undefined });
    return { disconnected: true };
  }

  async getMpStatus(userId: string): Promise<{ connected: boolean }> {
    const user = await this.findById(userId);
    return { connected: !!user.mpAccessToken };
  }

  // ── helpers privados ──────────────────────────────────────────────────────

  private encrypt(text: string): string {
    const key = Buffer.from(this.mpEncryptionKey.padEnd(64, '0').slice(0, 64), 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decryptMpToken(token: string): string {
    const key = Buffer.from(this.mpEncryptionKey.padEnd(64, '0').slice(0, 64), 'hex');
    const [ivHex, encHex] = token.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      Buffer.from(ivHex, 'hex'),
    );
    return Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
