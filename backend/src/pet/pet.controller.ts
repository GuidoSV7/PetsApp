import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator.js';
import { RenamePetDto } from './dto/rename-pet.dto.js';
import { SetCoatDto } from './dto/set-coat.dto.js';
import { PetService } from './pet.service.js';

export const PET_GUEST_HEADER = 'x-pet-guest-key';

/** Pet reads (and first write) 60 per minute per client; care actions are stricter. */
@Public()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('pet')
export class PetController {
  constructor(private readonly pets: PetService) {}

  @Get('state')
  getState(@Headers(PET_GUEST_HEADER) guestKey: string | undefined) {
    return this.pets.getOrCreate(guestKey);
  }

  @Post('actions/:action')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  applyAction(
    @Headers(PET_GUEST_HEADER) guestKey: string | undefined,
    @Param('action') action: string,
  ) {
    return this.pets.applyAction(guestKey, action);
  }

  @Post('coat')
  setCoat(
    @Headers(PET_GUEST_HEADER) guestKey: string | undefined,
    @Body() body: SetCoatDto,
  ) {
    return this.pets.setCoat(guestKey, body);
  }

  @Post('name')
  rename(
    @Headers(PET_GUEST_HEADER) guestKey: string | undefined,
    @Body() body: RenamePetDto,
  ) {
    return this.pets.rename(guestKey, body.name);
  }
}
