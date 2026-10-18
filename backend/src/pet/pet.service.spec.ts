import { BadRequestException } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DRIZZLE } from '../database/database.tokens.js';
import { createTestDb, type TestDb } from '../testing/pglite.js';
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
    await testDb.client.exec('TRUNCATE pet_states RESTART IDENTITY CASCADE');
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
  });

  it('persists feed across getOrCreate', async () => {
    await service.getOrCreate(GUEST);
    const fed = await service.applyAction(GUEST, 'feed');
    expect(fed.coins).toBe(STARTING_COINS - 5);
    expect(fed.needs.hunger).toBe(90);
    const again = await service.getOrCreate(GUEST);
    expect(again.coins).toBe(fed.coins);
    expect(again.needs.hunger).toBe(90);
  });

  it('marks broke without spending when out of coins', async () => {
    await service.getOrCreate(GUEST);
    for (let i = 0; i < 6; i++) {
      await service.applyAction(GUEST, 'feed');
    }
    const state = await service.applyAction(GUEST, 'feed');
    expect(state.statusKey).toBe('broke');
    expect(state.coins).toBe(0);
  });

  it('applies coat colors', async () => {
    await service.getOrCreate(GUEST);
    const state = await service.setCoat(GUEST, {
      primary: '#AABBCC',
      secondary: '#DDEEFF',
      accent: '#123456',
    });
    expect(state.coat.primary).toBe('#aabbcc');
    expect(state.coins).toBe(STARTING_COINS + 5);
    expect(state.statusKey).toBe('coated');
  });
});
