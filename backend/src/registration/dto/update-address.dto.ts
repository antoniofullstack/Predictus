import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
  @IsString({ message: 'CEP deve ser um texto' })
  @IsNotEmpty({ message: 'CEP é obrigatório' })
  cep: string;

  @IsString({ message: 'Rua deve ser um texto' })
  @IsNotEmpty({ message: 'Rua é obrigatória' })
  street: string;

  @IsString({ message: 'Número deve ser um texto' })
  @IsNotEmpty({ message: 'Número é obrigatório' })
  number: string;

  @IsString({ message: 'Complemento deve ser um texto' })
  @IsOptional()
  complement?: string;

  @IsString({ message: 'Bairro deve ser um texto' })
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  neighborhood: string;

  @IsString({ message: 'Cidade deve ser um texto' })
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  city: string;

  @IsString({ message: 'UF deve ser um texto' })
  @IsNotEmpty({ message: 'UF é obrigatório' })
  state: string;
}
