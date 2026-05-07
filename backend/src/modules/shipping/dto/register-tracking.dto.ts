import { IsEnum, IsString, IsUUID, MaxLength } from 'class-validator';
import { CourierType } from '../../../common/enums';

export class RegisterTrackingDto {
  @IsUUID()
  transactionId: string;

  @IsEnum(CourierType)
  courier: CourierType;

  @IsString()
  @MaxLength(50)
  trackingNumber: string;
}
