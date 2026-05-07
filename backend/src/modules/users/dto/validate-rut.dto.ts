import { IsString, Matches } from 'class-validator';

export class ValidateRutDto {
  @IsString()
  @Matches(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, {
    message: 'El RUT debe tener formato XX.XXX.XXX-X',
  })
  rut: string;
}
