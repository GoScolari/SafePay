import { IsPhoneNumber, IsNumberString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber()
  phone: string;

  @IsNumberString()
  @Length(6, 6)
  code: string;
}
