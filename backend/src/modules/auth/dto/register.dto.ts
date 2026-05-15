import { IsPhoneNumber, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsPhoneNumber(undefined, { message: 'El teléfono debe ser un número válido (ej: +56912345678)' })
  phone: string;

  @IsString({ message: 'El nombre es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  fullName: string;
}
