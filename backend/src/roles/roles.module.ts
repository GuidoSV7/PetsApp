import { Module } from '@nestjs/common';
import { DrizzleRoleRepository } from './infrastructure/drizzle-role.repository.js';
import { ROLE_REPOSITORY } from './ports/role-repository.port.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    { provide: ROLE_REPOSITORY, useClass: DrizzleRoleRepository },
  ],
  exports: [RolesService, ROLE_REPOSITORY],
})
export class RolesModule {}
