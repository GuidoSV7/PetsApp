import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PERMISSIONS } from '../permission-catalog.js';

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn([...PERMISSIONS], { each: true })
  permissions: string[];
}
