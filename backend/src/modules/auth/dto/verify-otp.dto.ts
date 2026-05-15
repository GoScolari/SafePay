import { IsPhoneNumber, IsNumberString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber(undefined, { message: 'El teléfono debe ser un número válido (ej: +56912345678)' })
  phone: string;

  @IsNumberString({}, { message: 'El código debe ser numérico' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code: string;
}
