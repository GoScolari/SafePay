import { IsPhoneNumber, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;
}
