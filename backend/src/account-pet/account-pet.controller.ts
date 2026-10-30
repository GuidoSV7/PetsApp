import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { RenamePetDto } from '../pet/dto/rename-pet.dto.js';
import { SetCoatDto } from '../pet/dto/set-coat.dto.js';
import { isCareAction } from '../pet/pet-rules.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AccountPetService } from './account-pet.service.js';
import { ClaimGuestDto } from './dto/claim-guest.dto.js';

@Controller('account/pet')
@UseGuards(JwtAuthGuard)
export class AccountPetController {
  constructor(private readonly pets: AccountPetService) {}
  @Post('claim-guest')
  @HttpCode(200)
  claim(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClaimGuestDto) {
    return this.pets.claim(user?.id, dto);
  }
  @Get('claims/:operationId')
  status(@CurrentUser() user: AuthenticatedUser, @Param('operationId', new ParseUUIDPipe()) operationId: string) {
    return this.pets.status(user?.id, operationId);
  }
  @Get('state')
  state(@CurrentUser() user: AuthenticatedUser) { return this.pets.state(user?.id); }
  @Post('actions/:action')
  action(@CurrentUser() user: AuthenticatedUser, @Param('action') action: string) {
    if (!isCareAction(action)) throw new BadRequestException(`Unknown care action: ${action}`);
    return this.pets.mutate(user?.id, { kind: 'care', action });
  }
  @Post('coat')
  coat(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetCoatDto) {
    return this.pets.mutate(user?.id, { kind: 'coat', coat: dto });
  }
  @Post('name')
  name(@CurrentUser() user: AuthenticatedUser, @Body() dto: RenamePetDto) {
    return this.pets.mutate(user?.id, { kind: 'rename', name: dto.name });
  }
}
