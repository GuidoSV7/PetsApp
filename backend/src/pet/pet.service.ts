import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  applyCare,
  applyCoat,
  applyRename,
  initialSnapshot,
  isCareAction,
  isCoatPattern,
  isHexColor,
  moodFromNeeds,
  type CareAction,
  type PetCoatInput,
  type PetSnapshot,
} from './pet-rules.js';
import {
  PET_REPOSITORY,
  PetStateMissingError,
  type PetMutate,
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
    return this.mutate(key, (current) =>
      applyCare(this.toSnapshot(current), action).snapshot,
    );
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
    return this.mutate(key, (current) =>
      applyCoat(this.toSnapshot(current), {
        primary: coat.primary.toLowerCase(),
        secondary: coat.secondary.toLowerCase(),
        accent: coat.accent.toLowerCase(),
        pattern: coat.pattern,
      }),
    );
  }

  async rename(
    guestKey: string | undefined,
    rawName: string,
  ): Promise<PetStateDto> {
    const key = this.assertGuestKey(guestKey);
    return this.mutate(key, (current) => {
      const result = applyRename(this.toSnapshot(current), rawName);
      if (!result.ok && result.reason === 'invalid') {
        throw new BadRequestException('Invalid pet name');
      }
      return result.snapshot;
    });
  }

  /**
   * Mutates the pet under a row lock so concurrent writes cannot lose updates.
   * A pet never seen before is created first (race-safe); a row that vanishes
   * after it was known answers 404 instead of a plain 500.
   */
  private async mutate(
    guestKey: string,
    compute: PetMutate,
  ): Promise<PetStateDto> {
    const existing = await this.pets.findByGuestKey(guestKey);
    if (!existing) {
      await this.pets.create(guestKey, initialSnapshot());
    }
    try {
      return this.toDto(await this.pets.mutateLocked(guestKey, compute));
    } catch (error) {
      if (error instanceof PetStateMissingError) {
        throw new NotFoundException('Pet state not found');
      }
      throw error;
    }
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
    return {
      ...snapshot,
      statusKey: snapshot.statusKey === 'broke' ? 'idle' : snapshot.statusKey,
      mood: moodFromNeeds(snapshot.needs),
    };
  }
}
