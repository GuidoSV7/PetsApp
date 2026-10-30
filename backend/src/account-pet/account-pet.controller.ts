import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
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
}
