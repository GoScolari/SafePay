import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Notification } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';
import { NotificationType } from '../../common/enums';

export interface NotifyPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  transactionId?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App | null = null;
  private readonly hasFirebaseCredentials: boolean;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {
    const firebaseKey = this.config.get<string>('firebase.key') ?? '';
    this.hasFirebaseCredentials = !!firebaseKey;
  }

  onModuleInit() {
    const firebaseKey = this.config.get<string>('firebase.key') ?? '';
    if (!firebaseKey) {
      this.logger.warn('FIREBASE_KEY no configurado — push notifications deshabilitadas (modo dev)');
      return;
    }

    try {
      const serviceAccount = JSON.parse(firebaseKey) as admin.ServiceAccount;
      this.firebaseApp = admin.initializeApp(
        { credential: admin.credential.cert(serviceAccount) },
        'safepay',
      );
    } catch {
      this.logger.error('Error al inicializar Firebase Admin — push notifications deshabilitadas');
    }
  }

  // ── POST /notifications/register-device ───────────────────────────────────

  async registerDevice(userId: string, deviceToken: string): Promise<{ registered: boolean }> {
    await this.userRepo.update(userId, { deviceToken });
    return { registered: true };
  }

  // ── GET /notifications/my ─────────────────────────────────────────────────

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // ── PATCH /notifications/:id/read ─────────────────────────────────────────

  async markRead(id: string, userId: string): Promise<{ read: boolean }> {
    await this.notificationRepo.update({ id, userId }, { read: true });
    return { read: true };
  }

  // ── Servicio interno: guardar en DB + enviar push FCM ─────────────────────

  async notify(payload: NotifyPayload): Promise<void> {
    // 1. Persistir en DB
    const record = this.notificationRepo.create({
      userId: payload.userId,
      transactionId: payload.transactionId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      read: false,
    });
    await this.notificationRepo.save(record);

    // 2. Enviar push FCM
    await this.sendPush(payload.userId, payload.title, payload.body, {
      type: payload.type,
      transactionId: payload.transactionId ?? '',
    });
  }

  // ── Helper privado: envío FCM ─────────────────────────────────────────────

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn(`Push omitida (sin Firebase) — userId: ${userId} | título: "${title}"`);
      return;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.deviceToken) return;

    try {
      await admin.messaging(this.firebaseApp).send({
        token: user.deviceToken,
        notification: { title, body },
        data,
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        android: { priority: 'high' },
      });
    } catch (err) {
      this.logger.error(`Error enviando push a userId ${userId}: ${String(err)}`);
    }
  }
}
