import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { SetUserRolesDto } from './dto/set-user-roles.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('roles')
  @Roles(UserRole.ADMIN)
  list() {
    return this.roles.list();
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch('roles/:code')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('code') code: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(code, dto);
  }

  @Put('users/:id/roles')
  @Roles(UserRole.SUPER_ADMIN)
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserRolesDto,
  ) {
    return this.roles.replace(id, dto.roles);
  }
}
