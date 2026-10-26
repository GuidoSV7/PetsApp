import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureHttpApp } from '../config/http-setup.js';
import { createValidationPipe } from '../config/validation-pipe.js';
import { DRIZZLE, PG_POOL } from '../database/database.tokens.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzlePetRepository } from './infrastructure/drizzle-pet.repository.js';

const GUEST = '88888888-8888-4888-8888-888888888888';
const MISSING = '99999999-9999-4999-8999-999999999999';
const colors = { primary: '#AABBCC', secondary: '#DDEEFF', accent: '#123456' };
const initial = {
  coins: 5,
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

describe('coat pattern through the real application and shared pipe', () => {
  let app: NestExpressApplication | undefined;
  let fixture: TestDb | undefined;

  beforeAll(async () => {
    fixture = await createTestDb();
    const forRoot = ConfigModule.forRoot.bind(ConfigModule);
    vi.spyOn(ConfigModule, 'forRoot').mockImplementation((options) =>
      forRoot({ ...options, ignoreEnvFile: true }),
    );
    const { AppModule } = await import('../app.module.js');
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      PROD: 'test',
      TRUST_PROXY: '0',
      JWT_SECRET: 'coat-pattern-test-secret-at-least-32-characters',
      JWT_EXPIRES_IN: '12h',
      DATABASE_URL: 'postgresql://must-not-be-used.invalid/application',
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => values[key] })
      .overrideProvider(PG_POOL)
      .useValue({ end: async () => undefined })
      .overrideProvider(DRIZZLE)
      .useValue(fixture.db)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureHttpApp(app, { NODE_ENV: 'test', TRUST_PROXY: '0' });
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    expect(app.get(DRIZZLE)).toBe(fixture.db);
  });

  beforeEach(async () => {
    await fixture!.client.query('TRUNCATE pet_states RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await fixture?.close();
      } finally {
        vi.restoreAllMocks();
      }
    }
  });

  function http(
    method: 'get' | 'post',
    path: string,
    body?: object,
    guest = GUEST,
  ) {
    const req = request(app!.getHttpServer())
      [method](path)
      .set('X-Pet-Guest-Key', guest);
    return body ? req.send(body) : req;
  }

  it('returns solid on a new persisted pet', async () => {
    const state = await http('get', '/pet/state');
    expect(state.status).toBe(200);
    expect(state.body).toEqual(initial);
  });

  it('persists calico through GET, colors-only saves, care and name updates', async () => {
    const coated = {
      ...initial,
      statusKey: 'coated',
      coat: {
        primary: '#aabbcc',
        secondary: '#ddeeff',
        accent: '#123456',
        pattern: 'calico',
      },
    };
    const saved = await http('post', '/pet/coat', {
      ...colors,
      pattern: 'calico',
    });
    expect(saved.status).toBe(201);
    expect(saved.body).toEqual(coated);
    let reloaded = await http('get', '/pet/state');
    expect(reloaded.status).toBe(200);
    expect(reloaded.body).toEqual(coated);
    const nextColors = {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    };
    const recolored = { ...coated, coat: { ...nextColors, pattern: 'calico' } };
    const savedColors = await http('post', '/pet/coat', nextColors);
    expect(savedColors.status).toBe(201);
    expect(savedColors.body).toEqual(recolored);
    reloaded = await http('get', '/pet/state');
    expect(reloaded.status).toBe(200);
    expect(reloaded.body).toEqual(recolored);
    const petted = {
      ...recolored,
      needs: { ...initial.needs, fun: 88 },
      statusKey: 'petted',
    };
    const action = await http('post', '/pet/actions/pet', {});
    expect(action.status).toBe(201);
    expect(action.body).toEqual(petted);
    const named = {
      ...petted,
      name: 'Luna',
      renameCount: 1,
      statusKey: 'renamed',
    };
    const rename = await http('post', '/pet/name', { name: 'Luna' });
    expect(rename.status).toBe(201);
    expect(rename.body).toEqual(named);
    reloaded = await http('get', '/pet/state');
    expect(reloaded.status).toBe(200);
    expect(reloaded.body).toEqual(named);
  });

  it.each([
    [
      'striped',
      {
        message: [
          'pattern must be one of the following values: solid, tabby, tuxedo, calico, pointed',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
    ],
    [
      null,
      {
        message: 'Unknown coat pattern',
        error: 'Bad Request',
        statusCode: 400,
      },
    ],
  ])(
    'rejects pattern %s without changing existing or creating missing state',
    async (pattern, errorBody) => {
      expect((await http('get', '/pet/state')).body).toEqual(initial);
      const repo = new DrizzlePetRepository(fixture!.db);
      const row = await repo.findByGuestKey(GUEST);
      for (const guest of [GUEST, MISSING]) {
        const rejected = await http(
          'post',
          '/pet/coat',
          { ...colors, pattern },
          guest,
        );
        expect(rejected.status).toBe(400);
        expect(rejected.body).toEqual(errorBody);
      }
      const unchanged = await http('get', '/pet/state');
      expect(unchanged.status).toBe(200);
      expect(unchanged.body).toEqual(initial);
      expect(await repo.findByGuestKey(GUEST)).toEqual(row);
      expect(await repo.findByGuestKey(MISSING)).toBeNull();
    },
  );

  it('returns solid for a raw zebra row without repairing storage', async () => {
    expect((await http('get', '/pet/state')).body).toEqual(initial);
    await fixture!.client.query(
      'UPDATE pet_states SET coat_pattern=$1 WHERE guest_key=$2',
      ['zebra', GUEST],
    );
    const state = await http('get', '/pet/state');
    expect(state.status).toBe(200);
    expect(state.body).toEqual(initial);
    expect(
      (
        await fixture!.client.query(
          'SELECT coat_pattern FROM pet_states WHERE guest_key=$1',
          [GUEST],
        )
      ).rows,
    ).toEqual([{ coat_pattern: 'zebra' }]);
  });
});
