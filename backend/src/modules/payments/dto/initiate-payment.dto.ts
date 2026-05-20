import { IsOptional, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
