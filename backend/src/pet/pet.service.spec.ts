import { BadRequestException } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DRIZZLE } from '../database/database.tokens.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import { PET_REPOSITORY } from './ports/pet-repository.port.js';
import { STARTING_COINS } from './pet-rules.js';
import { PetService } from './pet.service.js';
import { Test } from '@nestjs/testing';

const GUEST = '11111111-1111-4111-8111-111111111111';

describe('PetService (drizzle)', () => {
  let service: PetService;
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  afterAll(async () => {
    await testDb.close();
  });

  beforeEach(async () => {
    await testDb.client.query('TRUNCATE pet_states RESTART IDENTITY CASCADE');
    const module = await Test.createTestingModule({
      providers: [
        PetService,
        { provide: DRIZZLE, useValue: testDb.db },
        { provide: PET_REPOSITORY, useClass: DrizzlePetRepository },
      ],
    }).compile();
    service = module.get(PetService);
  });

  it('rejects a bad guest key', async () => {
    await expect(service.getOrCreate('nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates default state for a new guest', async () => {
    const state = await service.getOrCreate(GUEST);
    expect(state.coins).toBe(STARTING_COINS);
    expect(state.mood).toBe('Feliz');
    expect(state.statusKey).toBe('idle');
    expect(state.coat.pattern).toBe('solid');
  });

  it('persists feed across getOrCreate', async () => {
    await service.getOrCreate(GUEST);
    const fed = await service.applyAction(GUEST, 'feed');
    expect(fed.coins).toBe(0);
    expect(fed.needs.hunger).toBe(90);
    const again = await service.getOrCreate(GUEST);
    expect(again.coins).toBe(fed.coins);
    expect(again.needs.hunger).toBe(90);
  });

  it('repeated feeding remains free at zero coins', async () => {
    await service.getOrCreate(GUEST);
    for (let i = 0; i < 6; i++) {
      await service.applyAction(GUEST, 'feed');
    }
    const state = await service.applyAction(GUEST, 'feed');
    expect(state.statusKey).toBe('fed');
    expect(state.needs.hunger).toBe(100);
    expect(state.coins).toBe(0);
  });

  it.each([0, 5, 37])(
    'reads legacy broke balance %s as idle without saving',
    async (coins) => {
      const repo = new DrizzlePetRepository(testDb.db);
      await service.getOrCreate(GUEST);
      await testDb.client.query(
        'UPDATE pet_states SET coins=$1, status_key=$2 WHERE guest_key=$3',
        [coins, 'broke', GUEST],
      );
      const before = await repo.findByGuestKey(GUEST);
      const state = await service.getOrCreate(GUEST);
      expect(state).toEqual({
        coins,
        needs: before!.needs,
        coat: before!.coat,
        statusKey: 'idle',
        name: 'Michi',
        renameCount: 0,
        mood: 'Feliz',
      });
      expect(await repo.findByGuestKey(GUEST)).toEqual(before);
      const fed = await service.applyAction(GUEST, 'feed');
      expect(fed).toEqual({
        ...state,
        needs: { ...state.needs, hunger: 90 },
        statusKey: 'fed',
      });
      expect(await service.getOrCreate(GUEST)).toEqual(fed);
    },
  );

  it('rejects invalid actions and names without changing persisted state', async () => {
    await service.rename(GUEST, 'Luna');
    const repo = new DrizzlePetRepository(testDb.db);
    const before = await repo.findByGuestKey(GUEST);
    await expect(service.applyAction(GUEST, 'dance')).rejects.toMatchObject({
      response: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unknown care action: dance',
      },
    });
    for (const name of [' ', 'a'.repeat(17), ' Luna ']) {
      await expect(service.rename(GUEST, name)).rejects.toMatchObject({
        response: {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid pet name',
        },
      });
      expect(await repo.findByGuestKey(GUEST)).toEqual(before);
    }
  });

  it('applies coat colors', async () => {
    await service.getOrCreate(GUEST);
    const state = await service.setCoat(GUEST, {
      primary: '#AABBCC',
      secondary: '#DDEEFF',
      accent: '#123456',
    });
    expect(state.coat.primary).toBe('#aabbcc');
    expect(state.coins).toBe(STARTING_COINS);
    expect(state.statusKey).toBe('coated');
  });

  it('persists calico and preserves it on a later colors-only save', async () => {
    const initial = await service.getOrCreate(GUEST);
    const colors = {
      primary: '#AABBCC',
      secondary: '#DDEEFF',
      accent: '#123456',
    };
    const expected = {
      ...initial,
      coat: {
        primary: '#aabbcc',
        secondary: '#ddeeff',
        accent: '#123456',
        pattern: 'calico',
      },
      statusKey: 'coated',
    };
    expect(
      await service.setCoat(GUEST, { ...colors, pattern: 'calico' }),
    ).toEqual(expected);
    expect(await service.getOrCreate(GUEST)).toEqual(expected);
    const nextColors = {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    };
    const again = { ...expected, coat: { ...nextColors, pattern: 'calico' } };
    expect(await service.setCoat(GUEST, nextColors)).toEqual(again);
    expect(await service.getOrCreate(GUEST)).toEqual(again);
  });

  it.each(['striped', null])(
    'rejects direct invalid pattern %s without mutating or creating rows',
    async (pattern) => {
      const repo = new DrizzlePetRepository(testDb.db);
      const before = await service.getOrCreate(GUEST);
      const row = await repo.findByGuestKey(GUEST);
      const input = {
        primary: '#112233',
        secondary: '#445566',
        accent: '#778899',
        pattern: pattern as never,
      };
      const missing = '77777777-7777-4777-8777-777777777777';
      for (const guest of [GUEST, missing]) {
        await expect(service.setCoat(guest, input)).rejects.toMatchObject({
          response: {
            statusCode: 400,
            message: 'Unknown coat pattern',
            error: 'Bad Request',
          },
        });
      }
      expect(await service.getOrCreate(GUEST)).toEqual(before);
      expect(await repo.findByGuestKey(GUEST)).toEqual(row);
      expect(await repo.findByGuestKey(missing)).toBeNull();
    },
  );

  it('preserves a saved pattern through existing care and name updates', async () => {
    const colors = {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    };
    const coated = await service.setCoat(GUEST, {
      ...colors,
      pattern: 'pointed',
    });
    const petted = {
      ...coated,
      needs: { ...coated.needs, fun: 88 },
      statusKey: 'petted',
    };
    expect(await service.applyAction(GUEST, 'pet')).toEqual(petted);
    const named = {
      ...petted,
      name: 'Luna',
      renameCount: 1,
      statusKey: 'renamed',
    };
    expect(await service.rename(GUEST, 'Luna')).toEqual(named);
    expect(await service.getOrCreate(GUEST)).toEqual(named);
    expect(named.coat.pattern).toBe('pointed');
    expect(named.coins).toBe(STARTING_COINS);
  });

  it('renames repeatedly for free', async () => {
    await service.getOrCreate(GUEST);
    const first = await service.rename(GUEST, 'Luna');
    expect(first.name).toBe('Luna');
    expect(first.renameCount).toBe(1);
    expect(first.coins).toBe(STARTING_COINS);

    const second = await service.rename(GUEST, 'Nube');
    expect(second.name).toBe('Nube');
    expect(second.renameCount).toBe(2);
    expect(second.coins).toBe(0);
    const third = await service.rename(GUEST, 'Sol');
    expect(third).toEqual({ ...second, name: 'Sol', renameCount: 3 });
    expect(await service.getOrCreate(GUEST)).toEqual(third);
  });
});
