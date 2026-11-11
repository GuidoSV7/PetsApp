import { IsNotEmpty, IsString } from 'class-validator';
import { MaxPasswordBytes } from './password-max-bytes.js';

export class VerifyPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxPasswordBytes()
  password: string;
}
