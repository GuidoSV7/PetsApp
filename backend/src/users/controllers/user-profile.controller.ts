import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/authenticated-user.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { DeleteAccountDto } from '../dto/delete-account.dto.js';

/** Profile of the authenticated user: only their own data. */
@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUserProfile(user.id);
  }

  @Patch()
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateData: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, updateData);
  }

  @Delete()
  deleteMyAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DeleteAccountDto,
  ) {
    return this.usersService.delete(user.id, body.password);
  }
}
