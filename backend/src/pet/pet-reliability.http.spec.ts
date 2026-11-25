import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createValidationPipe } from '../config/validation-pipe.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import {
  PET_REPOSITORY,
  type PetRepository,
  type PetStateRow,
  type PetStateWrite,
} from './ports/pet-repository.port.js';
import { applyCare, initialSnapshot } from './pet-rules.js';
import { PetController } from './pet.controller.js';
import { PetService } from './pet.service.js';

const GUEST = '77777777-7777-4777-8777-777777777777';

/**
 * First-write and mutation reliability under concurrency (S1, S2) and the
 * vanished-row answer (S3), through the public HTTP interface.
 */
describe('pet reliability under concurrency (HTTP)', () => {
  let app: NestExpressApplication;
  let fixture: TestDb;

  beforeAll(async () => {
    fixture = await createTestDb();
    const module = await Test.createTestingModule({
      controllers: [PetController],
      providers: [
        PetService,
        { provide: DRIZZLE, useValue: fixture.db },
        { provide: PET_REPOSITORY, useClass: DrizzlePetRepository },
      ],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  beforeEach(async () => {
    await fixture.client.query('TRUNCATE pet_states RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
    }
  });

  function http(
    method: 'get' | 'post',
    path: string,
    body?: object,
    guest = GUEST,
  ) {
    const req = request(app.getHttpServer())
      [method](path)
      .set('X-Pet-Guest-Key', guest);
    return body ? req.send(body) : req;
  }

  describe('first write (S1)', () => {
    it('answers concurrent first requests with the same pet row, one row stored, no 500', async () => {
      const responses = await Promise.all(
        Array.from({ length: 12 }, () => http('get', '/pet/state')),
      );
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
      const bodies = new Set(responses.map((r) => JSON.stringify(r.body)));
      expect(bodies.size).toBe(1);
      const count = await fixture.client.query(
        'SELECT count(*)::int AS n FROM pet_states',
      );
      expect(count.rows[0].n).toBe(1);
    });
  });

  describe('mutations (S2)', () => {
    it('keeps N concurrent care actions equal to N sequential ones', async () => {
      await http('get', '/pet/state');
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => http('post', '/pet/actions/feed')),
      );
      for (const response of responses) {
        expect(response.status).toBe(201);
      }

      let expected = initialSnapshot();
      for (let i = 0; i < 6; i++) {
        expected = applyCare(expected, 'feed').snapshot;
      }
      const final = await http('get', '/pet/state');
      expect(final.status).toBe(200);
      expect(final.body.coins).toBe(expected.coins);
      expect(final.body.needs).toEqual(expected.needs);
      expect(final.body.statusKey).toBe(expected.statusKey);
    });

    it('does not lose concurrent renames', async () => {
      await http('get', '/pet/state');
      const names = ['Luna', 'Sol', 'Nube', 'Mia', 'Tila'];
      const responses = await Promise.all(
        names.map((name) => http('post', '/pet/name', { name })),
      );
      for (const response of responses) {
        expect(response.status).toBe(201);
      }
      const final = await http('get', '/pet/state');
      expect(final.status).toBe(200);
      expect(final.body.renameCount).toBe(names.length);
      expect(names).toContain(final.body.name);
    });
  });

  describe('vanished row (S3)', () => {
    /** Deletes the row right after the service reads it, mid-update. */
    class VanishingPetRepository implements PetRepository {
      constructor(private readonly inner: DrizzlePetRepository) {}

      async findByGuestKey(guestKey: string): Promise<PetStateRow | null> {
        const row = await this.inner.findByGuestKey(guestKey);
        if (row) {
          await fixture.client.query(
            'DELETE FROM pet_states WHERE guest_key = $1',
            [guestKey],
          );
        }
        return row;
      }

      create(guestKey: string, data: PetStateWrite): Promise<PetStateRow> {
        return this.inner.create(guestKey, data);
      }

      mutateLocked(
        guestKey: string,
        compute: (current: PetStateRow) => PetStateWrite,
      ): Promise<PetStateRow> {
        return this.inner.mutateLocked(guestKey, compute);
      }
    }

    it('answers 404, not 500, and does not silently recreate the row', async () => {
      const module = await Test.createTestingModule({
        controllers: [PetController],
        providers: [
          PetService,
          { provide: DRIZZLE, useValue: fixture.db },
          {
            provide: PET_REPOSITORY,
            useValue: new VanishingPetRepository(new DrizzlePetRepository(fixture.db)),
          },
        ],
      }).compile();
      const vanishApp = module.createNestApplication<NestExpressApplication>();
      vanishApp.useGlobalPipes(createValidationPipe());
      await vanishApp.init();
      try {
        const server = vanishApp.getHttpServer();
        await request(server)
          .get('/pet/state')
          .set('X-Pet-Guest-Key', GUEST)
          .expect(200);

        const response = await request(server)
          .post('/pet/actions/pet')
          .set('X-Pet-Guest-Key', GUEST);
        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({ statusCode: 404 });

        const count = await fixture.client.query(
          'SELECT count(*)::int AS n FROM pet_states',
        );
        expect(count.rows[0].n).toBe(0);
      } finally {
        await vanishApp.close();
      }
    });
  });
});
