import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  applyCare,
  applyCoat,
  applyRename,
  initialSnapshot,
  isCareAction,
  isHexColor,
  moodFromNeeds,
  type CareAction,
  type PetCoat,
  type PetSnapshot,
} from './pet-rules.js';
import {
  PET_REPOSITORY,
  type PetRepository,
  type PetStateRow,
} from './ports/pet-repository.port.js';

export type PetStateDto = PetSnapshot & { mood: string };

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
    const existing = await this.pets.findByGuestKey(key);
    if (existing) return this.toDto(existing);
    const created = await this.pets.create(key, initialSnapshot());
    return this.toDto(created);
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
    const result = applyCare(this.toSnapshot(current), action);
    const saved = await this.pets.update(key, result.snapshot);
    return this.toDto(saved);
  }

  async setCoat(
    guestKey: string | undefined,
    coat: PetCoat,
  ): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    if (
      !isHexColor(coat.primary) ||
      !isHexColor(coat.secondary) ||
      !isHexColor(coat.accent)
    ) {
      throw new BadRequestException('Coat colors must be #RRGGBB');
    }
    const current = await this.requireRow(key);
    const next = applyCoat(this.toSnapshot(current), {
      primary: coat.primary.toLowerCase(),
      secondary: coat.secondary.toLowerCase(),
      accent: coat.accent.toLowerCase(),
    });
    const saved = await this.pets.update(key, next);
    return this.toDto(saved);
  }

  async rename(
    guestKey: string | undefined,
    rawName: string,
  ): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    const current = await this.requireRow(key);
    const result = applyRename(this.toSnapshot(current), rawName);
    if (!result.ok && result.reason === 'invalid') {
      throw new BadRequestException('Invalid pet name');
    }
    const saved = await this.pets.update(key, result.snapshot);
    return this.toDto(saved);
  }

  private async requireRow(guestKey: string): Promise<PetStateRow> {
    const existing = await this.pets.findByGuestKey(guestKey);
    if (existing) return existing;
    return this.pets.create(guestKey, initialSnapshot());
  }

  private toSnapshot(row: PetStateRow): PetSnapshot {
    return {
      coins: row.coins,
      needs: { ...row.needs },
      coat: { ...row.coat },
      statusKey: row.statusKey,
      name: row.name,
      renameCount: row.renameCount,
    };
  }

  private toDto(row: PetStateRow): PetStateDto {
    const snapshot = this.toSnapshot(row);
    return { ...snapshot, mood: moodFromNeeds(snapshot.needs) };
  }
}
