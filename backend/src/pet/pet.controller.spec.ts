import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.tokens.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import { PET_REPOSITORY } from './ports/pet-repository.port.js';
import { PetController } from './pet.controller.js';
import { STARTING_COINS } from './pet-rules.js';
import { PetService } from './pet.service.js';

const GUEST = '33333333-3333-4333-8333-333333333333';

describe('PetController (drizzle)', () => {
  let controller: PetController;
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
      controllers: [PetController],
      providers: [
        PetService,
        { provide: DRIZZLE, useValue: testDb.db },
        { provide: PET_REPOSITORY, useClass: DrizzlePetRepository },
      ],
    }).compile();
    controller = module.get(PetController);
  });

  it('rejects missing guest key', async () => {
    await expect(controller.getState(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates, feeds, and reloads persisted state', async () => {
    const created = await controller.getState(GUEST);
    expect(created.coins).toBe(STARTING_COINS);
    expect(created.statusKey).toBe('idle');

    const fed = await controller.applyAction(GUEST, 'feed');
    expect(fed.coins).toBe(STARTING_COINS - 5);
    expect(fed.needs.hunger).toBe(90);
    expect(fed.statusKey).toBe('fed');

    const again = await controller.getState(GUEST);
    expect(again.coins).toBe(STARTING_COINS - 5);
    expect(again.needs.hunger).toBe(90);
  });

  it('persists coat colors', async () => {
    await controller.getState(GUEST);
    const coated = await controller.setCoat(GUEST, {
      primary: '#AABBCC',
      secondary: '#DDEEFF',
      accent: '#123456',
    });
    expect(coated.coat.primary).toBe('#aabbcc');
    expect(coated.coins).toBe(STARTING_COINS);
    expect(coated.statusKey).toBe('coated');
  });

  it('renames via POST body', async () => {
    await controller.getState(GUEST);
    const renamed = await controller.rename(GUEST, { name: 'Luna' });
    expect(renamed.name).toBe('Luna');
    expect(renamed.renameCount).toBe(1);
    expect(renamed.coins).toBe(STARTING_COINS);
  });
});
