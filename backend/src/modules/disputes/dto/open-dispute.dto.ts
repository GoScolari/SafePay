import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DisputeReason } from '../../../common/enums';

export class OpenDisputeDto {
  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
