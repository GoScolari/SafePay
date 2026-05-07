import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FeePayer, TxModality, TxRole } from '../../../common/enums';

export class CreateTransactionDto {
  @IsEnum(TxRole)
  initiatorRole: TxRole;

  @IsEnum(TxModality)
  modality: TxModality;

  @IsInt()
  @Min(1000)
  @Max(2000000)
  amount: number;

  @IsEnum(FeePayer)
  feePayer: FeePayer;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;
}
