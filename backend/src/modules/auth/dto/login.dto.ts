import { IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber(undefined, { message: 'El teléfono debe ser un número válido (ej: +56912345678)' })
  phone: string;
}
