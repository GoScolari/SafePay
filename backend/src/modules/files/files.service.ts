import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TransactionFile } from '../../database/entities/transaction-file.entity';
import { Transaction } from '../../database/entities/transaction.entity';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileType } from '../../common/enums';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly hasAwsCredentials: boolean;

  constructor(
    @InjectRepository(TransactionFile)
    private readonly fileRepo: Repository<TransactionFile>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('aws.s3Bucket') ?? '';
    const accessKeyId = this.config.get<string>('aws.accessKeyId') ?? '';
    const secretAccessKey = this.config.get<string>('aws.secretAccessKey') ?? '';
    const region = this.config.get<string>('aws.region') ?? 'us-east-1';
    this.hasAwsCredentials = !!accessKeyId && !!secretAccessKey;

    if (this.hasAwsCredentials) {
      this.s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    }
  }

  async listByTransaction(
    transactionId: string,
    userId: string,
    type?: FileType,
  ): Promise<{ id: string; s3Key: string; mimeType: string; sizeBytes: number }[]> {
    const tx = await this.txRepo.findOne({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No pertenecés a esta transacción');
    }
    const where = type ? { transactionId, type } : { transactionId };
    const files = await this.fileRepo.find({ where });
    return files.map((f) => ({
      id: f.id,
      s3Key: f.s3Key,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
    }));
  }

  async upload(
    file: Express.Multer.File,
    dto: UploadFileDto,
    userId: string,
  ): Promise<{ id: string; s3Key: string; mimeType: string; sizeBytes: number }> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Solo se permiten imágenes JPEG, PNG o WebP');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException('El archivo no puede superar 5 MB');
    }

    const tx = await this.txRepo.findOne({ where: { id: dto.transactionId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No pertenecés a esta transacción');
    }

    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const s3Key = this.hasAwsCredentials
      ? `transactions/${dto.transactionId}/${uuid()}.${ext}`
      : `mock/${uuid()}.${ext}`;

    if (this.hasAwsCredentials && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } else {
      this.logger.warn('Sin credenciales AWS — archivo guardado solo en DB (modo dev)');
    }

    const record = this.fileRepo.create({
      transactionId: dto.transactionId,
      uploadedById: userId,
      type: dto.type,
      s3Key,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
    await this.fileRepo.save(record);

    return { id: record.id, s3Key, mimeType: file.mimetype, sizeBytes: file.size };
  }

  async getSignedUrl(
    fileId: string,
    userId: string,
  ): Promise<{ url: string | null; expiresAt: string | null }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Archivo no encontrado');

    const tx = await this.txRepo.findOne({ where: { id: file.transactionId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    if (tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés acceso a este archivo');
    }

    if (!this.hasAwsCredentials || !this.s3) {
      this.logger.warn('Sin credenciales AWS — URL firmada no disponible (modo dev)');
      return { url: null, expiresAt: null };
    }

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: file.s3Key }),
      { expiresIn: 3600 },
    );
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    return { url, expiresAt };
  }

  async remove(fileId: string, userId: string): Promise<{ deleted: boolean }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Archivo no encontrado');

    const tx = await this.txRepo.findOne({ where: { id: file.transactionId } });
    if (!tx) throw new NotFoundException('Transacción no encontrada');
    if (file.uploadedById !== userId && tx.initiatorId !== userId && tx.counterpartId !== userId) {
      throw new ForbiddenException('No tenés permiso para eliminar este archivo');
    }

    if (this.hasAwsCredentials && this.s3) {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: file.s3Key }),
      );
    } else {
      this.logger.warn('Sin credenciales AWS — eliminación solo en DB (modo dev)');
    }

    await this.fileRepo.remove(file);
    return { deleted: true };
  }
}
