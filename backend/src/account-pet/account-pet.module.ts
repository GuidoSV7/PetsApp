import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountPetController } from './account-pet.controller.js';
import { AccountPetService } from './account-pet.service.js';
import { AccountPetConfig } from './account-pet.config.js';
import { ACCOUNT_PET_REPOSITORY } from './ports/account-pet-repository.port.js';
import { DrizzleAccountPetRepository } from './infrastructure/drizzle-account-pet.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [AccountPetController],
  providers: [AccountPetService, AccountPetConfig, { provide: ACCOUNT_PET_REPOSITORY, useClass: DrizzleAccountPetRepository }],
})
export class AccountPetModule {}
