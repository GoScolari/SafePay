import { IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber()
  phone: string;
}
