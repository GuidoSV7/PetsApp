import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenamePetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  name!: string;
}
