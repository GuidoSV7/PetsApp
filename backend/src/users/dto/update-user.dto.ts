import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** The only columns a profile update may write; everything else is rejected. */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string | null;
}
