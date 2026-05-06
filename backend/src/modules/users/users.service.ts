import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepo.update(id, data);
    return this.findById(id);
  }

  async validateRut(_rut: string) {
    // TODO: validación módulo 11
    return { valid: true };
  }

  async getReputation(id: string) {
    const user = await this.findById(id);
    return { rating: user.rating, totalTx: user.totalTx };
  }

  async getMpConnectUrl(_userId: string) {
    // TODO: generar URL OAuth Mercado Pago
    return { url: '' };
  }

  async handleMpCallback(_code: string) {
    // TODO: intercambiar code por access_token y cifrar AES-256
    return { connected: true };
  }

  async disconnectMp(userId: string) {
    await this.userRepo.update(userId, { mpAccessToken: undefined });
    return { disconnected: true };
  }

  async getMpStatus(userId: string) {
    const user = await this.findById(userId);
    return { connected: !!user.mpAccessToken };
  }
}
