import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createValidationPipe } from '../config/validation-pipe.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';
import { PET_REPOSITORY } from './ports/pet-repository.port.js';
import { PetController } from './pet.controller.js';
import { PetService } from './pet.service.js';

const GUEST = '88888888-8888-4888-8888-888888888888';
const initial = {
  coins: 0,
  needs: { hunger: 72, fun: 80, energy: 65, hygiene: 78 },
  coat: {
    primary: '#8a8a8e',
    secondary: '#b4b4b8',
    accent: '#c9a0a8',
    pattern: 'solid',
  },
  statusKey: 'idle',
  name: 'Michi',
  renameCount: 0,
  mood: 'Feliz',
};

describe('free care HTTP contract', () => {
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

  it('creates zero coins with the unchanged complete guest API shape', async () => {
    const response = await http('get', '/pet/state');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(initial);
  });

  it.each([0, 5, 37])(
    'persists repeated care and renames without spending balance %s',
    async (coins) => {
      await http('get', '/pet/state');
      await fixture.client.query(
        'UPDATE pet_states SET coins=$1, hunger=10 WHERE guest_key=$2',
        [coins, GUEST],
      );
      let expected = {
        ...initial,
        coins,
        needs: { ...initial.needs, hunger: 10 },
        mood: 'Bien',
      };
      for (const hunger of [28, 46, 64]) {
        expected = {
          ...expected,
          needs: { ...expected.needs, hunger },
          statusKey: 'fed',
          mood: hunger === 64 ? 'Feliz' : 'Bien',
        };
        const response = await http('post', '/pet/actions/feed');
        expect(response.status).toBe(201);
        expect(response.body).toEqual(expected);
      }
      for (const [i, name] of ['Luna', 'Nube', 'Sol'].entries()) {
        expected = {
          ...expected,
          name,
          renameCount: i + 1,
          statusKey: 'renamed',
        };
        const response = await http('post', '/pet/name', { name });
        expect(response.status).toBe(201);
        expect(response.body).toEqual(expected);
      }
      const reload = await http('get', '/pet/state');
      expect(reload.status).toBe(200);
      expect(reload.body).toEqual(expected);
    },
  );

  it('maps legacy broke to idle without changing any stored column', async () => {
    await http('get', '/pet/state');
    await fixture.client.query(
      "UPDATE pet_states SET status_key='broke', coins=37 WHERE guest_key=$1",
      [GUEST],
    );
    const before = (await fixture.client.query('SELECT * FROM pet_states'))
      .rows;
    const response = await http('get', '/pet/state');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...initial, coins: 37 });
    expect(
      (await fixture.client.query('SELECT * FROM pet_states')).rows,
    ).toEqual(before);
  });

  it('preserves exact validation errors and leaves existing rows and counters unchanged', async () => {
    await http('get', '/pet/state');
    const before = (await fixture.client.query('SELECT * FROM pet_states'))
      .rows;
    for (const [path, body, message] of [
      ['/pet/actions/dance', {}, 'Unknown care action: dance'],
      ['/pet/name', { name: '   ' }, 'Invalid pet name'],
      ['/pet/name', { name: 'Michi' }, 'Invalid pet name'],
      [
        '/pet/name',
        { name: 'a'.repeat(17) },
        ['name must be shorter than or equal to 16 characters'],
      ],
    ] as const) {
      const response = await http('post', path, body);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message,
      });
      expect(
        (await fixture.client.query('SELECT * FROM pet_states')).rows,
      ).toEqual(before);
    }
    const badKey = await http('get', '/pet/state', undefined, 'invalid');
    expect(badKey.status).toBe(400);
    expect(badKey.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'X-Pet-Guest-Key must be a valid UUID',
    });
    expect(
      (await fixture.client.query('SELECT * FROM pet_states')).rows,
    ).toEqual(before);
  });
});
