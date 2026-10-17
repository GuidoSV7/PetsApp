import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum.js';

export class SetUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
