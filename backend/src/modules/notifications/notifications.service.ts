import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async registerDevice(_userId: string, _deviceToken: string) {
    // TODO: actualizar users.device_token en DB
    return { registered: true };
  }

  async findByUser(userId: string) {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    await this.notificationRepo.update({ id, userId }, { read: true });
    return { read: true };
  }
}
