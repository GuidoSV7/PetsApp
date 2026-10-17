import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
} from 'class-validator';
import { PERMISSIONS } from '../permission-catalog.js';

export class UpdateRoleDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([...PERMISSIONS], { each: true })
  permissions?: string[];
}
