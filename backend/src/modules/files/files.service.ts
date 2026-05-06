import { Injectable } from '@nestjs/common';

@Injectable()
export class FilesService {
  async upload(_file: Express.Multer.File, _userId: string) {
    // TODO: subir a S3, guardar s3_key en transaction_files
    return { message: 'upload' };
  }

  async getSignedUrl(_fileId: string, _userId: string) {
    // TODO: verificar acceso del usuario, generar URL firmada con expiración 1h
    return { url: '' };
  }

  async remove(_fileId: string, _userId: string) {
    // TODO: eliminar de S3 y de la DB
    return { message: 'deleted' };
  }
}
