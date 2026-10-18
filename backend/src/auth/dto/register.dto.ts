import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { MIN_PASSWORD_LENGTH } from './change-password.dto.js';

/** Public sign-up payload. The created account is always a `member`. */
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password: string;

  @IsString()
  @Length(1, 120)
  name: string;

  /** ISO 3166-1 alpha-2 code; stored upper-cased. */
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}
