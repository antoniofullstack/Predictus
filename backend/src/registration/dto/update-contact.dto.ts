import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateContactDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}
