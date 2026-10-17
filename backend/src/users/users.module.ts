import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UserProfileController } from './controllers/user-profile.controller.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { DrizzleUserRepository } from './infrastructure/drizzle-user.repository.js';
import { USER_REPOSITORY } from './ports/user-repository.port.js';

@Module({
  controllers: [UserProfileController, AdminUsersController],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
