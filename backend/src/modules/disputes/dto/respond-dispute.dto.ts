import { IsString, MaxLength, MinLength } from 'class-validator';

export class RespondDisputeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  response: string;
}
