import { Module } from '@nestjs/common';
import { AdminPetModelController } from './admin-pet-model.controller.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import { GlobalPetModelService } from './global-pet-model.service.js';
import { PET_REPOSITORY } from './ports/pet-repository.port.js';
import { PetController } from './pet.controller.js';
import { PetModelController } from './pet-model.controller.js';
import { PetService } from './pet.service.js';

@Module({
  controllers: [PetController, PetModelController, AdminPetModelController],
  providers: [
    PetService,
    GlobalPetModelService,
    { provide: PET_REPOSITORY, useClass: DrizzlePetRepository },
  ],
  exports: [PetService, GlobalPetModelService],
})
export class PetModule {}
