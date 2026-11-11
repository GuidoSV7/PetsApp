import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users.service.js';
import { ListUsersQueryDto } from '../dto/list-users-query.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { UserRole } from '../enums/user-role.enum.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';

/** Administrator endpoints: JWT + ADMIN role, full user data. */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAllComplete(
      query.search,
      true,
      query.limit,
      query.offset,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOneComplete(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateData, actor.id);
  }

  @Post(':id/toggle-block')
  toggleBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.toggleBlock(id, actor.id);
  }
}
