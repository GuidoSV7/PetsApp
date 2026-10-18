import { Module } from '@nestjs/common';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import { PET_REPOSITORY } from './ports/pet-repository.port.js';
import { PetController } from './pet.controller.js';
import { PetService } from './pet.service.js';

@Module({
  controllers: [PetController],
  providers: [
    PetService,
    { provide: PET_REPOSITORY, useClass: DrizzlePetRepository },
  ],
  exports: [PetService],
})
export class PetModule {}
