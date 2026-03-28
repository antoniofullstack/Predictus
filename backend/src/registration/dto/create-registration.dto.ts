import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
