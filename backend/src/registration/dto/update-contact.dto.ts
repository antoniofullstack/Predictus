import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateContactDto {
  @IsString({ message: 'Telefone deve ser um texto' })
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  phone: string;
}
