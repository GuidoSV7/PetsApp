import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  ValidateIf,
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

  /** S5: required by the request whenever the email actually changes. */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  /** S10: only secure image URLs (or null to clear the avatar). */
  @IsOptional()
  @ValidateIf((o) => o.profileImage !== null)
  @IsUrl({ require_tld: false, protocols: ['https'], require_protocol: true })
  profileImage?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string | null;
}
