import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { MaxPasswordBytes } from './password-max-bytes.js';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxPasswordBytes()
  password: string;
}
