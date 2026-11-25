import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { MaxPasswordBytes } from './password-max-bytes.js';

export const MIN_PASSWORD_LENGTH = 8;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxPasswordBytes()
  currentPassword: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxPasswordBytes()
  newPassword: string;
}
