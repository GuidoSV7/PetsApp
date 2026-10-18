import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { SetCoatDto } from './dto/set-coat.dto.js';
import { PetService } from './pet.service.js';

export const PET_GUEST_HEADER = 'x-pet-guest-key';

@Public()
@Controller('pet')
export class PetController {
  constructor(private readonly pets: PetService) {}

  @Get('state')
  getState(@Headers(PET_GUEST_HEADER) guestKey: string | undefined) {
    return this.pets.getOrCreate(guestKey);
  }

  @Post('actions/:action')
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
}
