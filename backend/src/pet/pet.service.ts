import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  applyCare,
  applyCoat,
  applyRename,
  initialSnapshot,
  isCareAction,
  isCoatPattern,
  isHexColor,
  type CareAction,
  type PetCoatInput,
} from './pet-rules.js';
import {
  PET_REPOSITORY,
  GuestPetUnavailableError,
  type PetRepository,
  type PetStateRow,
} from './ports/pet-repository.port.js';
import { petSnapshot, petStateDto, type PetStateDto } from './pet-state.mapper.js';

export type { PetStateDto } from './pet-state.mapper.js';

const GUEST_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PetService {
  constructor(
    @Inject(PET_REPOSITORY) private readonly pets: PetRepository,
  ) {}

  assertGuestKey(guestKey: string | undefined): string {
    if (!guestKey || !GUEST_KEY.test(guestKey)) {
      throw new BadRequestException(
        'X-Pet-Guest-Key must be a valid UUID',
      );
    }
    return guestKey;
  }

  async getOrCreate(guestKey: string | undefined): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    const existing = await this.guestCall(this.pets.findByGuestKey(key));
    if (existing) return petStateDto(existing);
    const created = await this.guestCall(this.pets.create(key, initialSnapshot()));
    return petStateDto(created);
  }

  async applyAction(
    guestKey: string | undefined,
    actionRaw: string,
  ): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    if (!isCareAction(actionRaw)) {
      throw new BadRequestException(`Unknown care action: ${actionRaw}`);
    }
    const action: CareAction = actionRaw;
    const current = await this.requireRow(key);
    const result = applyCare(petSnapshot(current), action);
    const saved = await this.guestCall(this.pets.update(key, result.snapshot));
    return petStateDto(saved);
  }

  async setCoat(
    guestKey: string | undefined,
    coat: PetCoatInput,
  ): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    if (
      !isHexColor(coat.primary) ||
      !isHexColor(coat.secondary) ||
      !isHexColor(coat.accent)
    ) {
      throw new BadRequestException('Coat colors must be #RRGGBB');
    }
    if (coat.pattern !== undefined && !isCoatPattern(coat.pattern)) {
      throw new BadRequestException('Unknown coat pattern');
    }
    const current = await this.requireRow(key);
    const next = applyCoat(petSnapshot(current), {
      primary: coat.primary.toLowerCase(),
      secondary: coat.secondary.toLowerCase(),
      accent: coat.accent.toLowerCase(),
      pattern: coat.pattern,
    });
    const saved = await this.guestCall(this.pets.update(key, next));
    return petStateDto(saved);
  }

  async rename(
    guestKey: string | undefined,
    rawName: string,
  ): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    const current = await this.requireRow(key);
    const result = applyRename(petSnapshot(current), rawName);
    if (!result.ok && result.reason === 'invalid') {
      throw new BadRequestException('Invalid pet name');
    }
    const saved = await this.guestCall(this.pets.update(key, result.snapshot));
    return petStateDto(saved);
  }

  private async requireRow(guestKey: string): Promise<PetStateRow> {
    const existing = await this.guestCall(this.pets.findByGuestKey(guestKey));
    if (existing) return existing;
    return this.guestCall(this.pets.create(guestKey, initialSnapshot()));
  }

  private async guestCall<T>(result: Promise<T>): Promise<T> {
    try {
      return await result;
    } catch (error) {
      if (error instanceof GuestPetUnavailableError) {
        throw new ForbiddenException('GUEST_PET_UNAVAILABLE');
      }
      throw error;
    }
  }
}
