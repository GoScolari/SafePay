import { IsEnum, IsUUID } from 'class-validator';
import { FileType } from '../../../common/enums';

export class UploadFileDto {
  @IsUUID()
  transactionId: string;

  @IsEnum(FileType)
  type: FileType;
}
