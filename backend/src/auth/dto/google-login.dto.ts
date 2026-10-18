import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  idToken!: string;
}
