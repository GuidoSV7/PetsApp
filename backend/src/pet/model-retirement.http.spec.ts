import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createValidationPipe } from '../config/validation-pipe.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { DRIZZLE, PG_POOL } from '../database/database.tokens.js';
import { configureHttpApp } from '../config/http-setup.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';

const GUEST = '44444444-4444-4444-8444-444444444444';
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

describe('model retirement through the real application', () => {
  let app: NestExpressApplication | undefined;
  let fixture: TestDb | undefined;
  let storage: string | undefined;
  const trace: {
    method: string;
    path: string;
    status: number;
    body: unknown;
  }[] = [];

  beforeAll(async () => {
    fixture = await createTestDb();
    storage = await mkdtemp(join(tmpdir(), 'petsapp-retirement-http-'));
    // AppModule must never load a real environment file, even during RED.
    const forRoot = ConfigModule.forRoot.bind(ConfigModule);
    vi.spyOn(ConfigModule, 'forRoot').mockImplementation((options) =>
      forRoot({ ...options, ignoreEnvFile: true }),
    );
    const { AppModule } = await import('../app.module.js');
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      PROD: 'test',
      TRUST_PROXY: '0',
      JWT_SECRET: 'retirement-http-test-secret-at-least-32-characters',
      JWT_EXPIRES_IN: '12h',
      DATABASE_URL: 'postgresql://must-not-be-used.invalid/application',
    };
    const config = {
      get: (key: string) => (key.endsWith('_DIR') ? storage : values[key]),
    };
    // The fixture alone owns its pool; application shutdown must not end it twice.
    const applicationPool = { end: async () => undefined };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(PG_POOL)
      .useValue(applicationPool)
      .overrideProvider(DRIZZLE)
      .useValue(fixture.db)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureHttpApp(app, { NODE_ENV: 'test', TRUST_PROXY: '0' });
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    expect(app.get(PG_POOL)).toBe(applicationPool);
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
        try {
          const output = process.env.RETIREMENT_HTTP_TRACE;
          if (output) {
            await mkdir(dirname(output), { recursive: true });
            await writeFile(output, JSON.stringify(trace, null, 2) + '\n');
          }
        } finally {
          if (storage) await rm(storage, { recursive: true });
          vi.restoreAllMocks();
        }
      }
    }
  });

  async function http(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    body?: object,
    guest = false,
  ) {
    const req = request(app!.getHttpServer())[method](path);
    if (guest) req.set('X-Pet-Guest-Key', GUEST);
    if (body) req.send(body);
    const response = await req;
    trace.push({ method, path, status: response.status, body: response.body });
    return response;
  }

  it.each([
    ['get', '/pet/model'],
    ['get', '/pet/model/file'],
    ['post', '/admin/pet-model'],
    ['put', '/admin/pet-model'],
    ['delete', '/admin/pet-model'],
  ] as const)(
    '%s %s is an exact routing 404 without credentials',
    async (method, path) => {
      const response = await http(method, path);
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: `Cannot ${method.toUpperCase()} ${path}`,
      });
    },
  );

  it('keeps an unrelated unknown route as a routing 404', async () => {
    const response = await http('get', '/retirement-nonexistent-control');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /retirement-nonexistent-control',
    });
  });

  it('keeps the real global authentication guard on an existing route', async () => {
    const response = await http('get', '/users/me');
    expect(response.status).toBe(401);
    expect(response.body.statusCode).toBe(401);
  });

  it('creates and reloads real persisted pet state', async () => {
    const created = await http('get', '/pet/state', undefined, true);
    expect(created.status).toBe(200);
    expect(created.body).toEqual(initial);
    const again = await http('get', '/pet/state', undefined, true);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(initial);
    const missingGuest = await http('get', '/pet/state');
    expect(missingGuest.status).toBe(400);
    const unchanged = await http('get', '/pet/state', undefined, true);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toEqual(initial);
  });

  it('preserves care effects and rejects unknown actions without changing state', async () => {
    const fed = await http('post', '/pet/actions/feed', {}, true);
    expect(fed.status).toBe(201);
    const fedState = {
      ...initial,
      coins: 0,
      needs: { ...initial.needs, hunger: 90 },
      statusKey: 'fed',
    };
    expect(fed.body).toEqual(fedState);
    const fedAgain = await http('post', '/pet/actions/feed', {}, true);
    expect(fedAgain.status).toBe(201);
    const cappedState = { ...fedState, needs: { ...fedState.needs, hunger: 100 } };
    expect(fedAgain.body).toEqual(cappedState);
    expect((await http('post', '/pet/actions/unknown', {}, true)).status).toBe(
      400,
    );
    const unchanged = await http('get', '/pet/state', undefined, true);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toEqual(cappedState);
  });

  it('preserves coat updates and rejects invalid colors without changing state', async () => {
    const coat = {
      primary: '#AABBCC',
      secondary: '#DDEEFF',
      accent: '#123456',
    };
    const updated = await http('post', '/pet/coat', coat, true);
    expect(updated.status).toBe(201);
    const coated = {
      ...initial,
      coat: {
        primary: '#aabbcc',
        secondary: '#ddeeff',
        accent: '#123456',
        pattern: 'solid',
      },
      statusKey: 'coated',
    };
    expect(updated.body).toEqual(coated);
    expect(
      (await http('post', '/pet/coat', { ...coat, primary: 'invalid' }, true))
        .status,
    ).toBe(400);
    const unchanged = await http('get', '/pet/state', undefined, true);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toEqual(coated);
  });

  it('preserves free repeated renames and invalid-name rejection counters', async () => {
    const first = await http('post', '/pet/name', { name: 'Luna' }, true);
    expect(first.status).toBe(201);
    expect(first.body).toEqual({
      ...initial,
      name: 'Luna',
      renameCount: 1,
      statusKey: 'renamed',
    });
    const second = await http('post', '/pet/name', { name: 'Sol' }, true);
    expect(second.status).toBe(201);
    const renamedTwice = {
      ...initial,
      name: 'Sol',
      renameCount: 2,
      coins: 0,
      statusKey: 'renamed',
    };
    expect(second.body).toEqual(renamedTwice);
    const third = await http('post', '/pet/name', { name: 'Nube' }, true);
    expect(third.status).toBe(201);
    const renamedThrice = { ...renamedTwice, name: 'Nube', renameCount: 3 };
    expect(third.body).toEqual(renamedThrice);
    expect((await http('post', '/pet/name', { name: '' }, true)).status).toBe(
      400,
    );
    const unchanged = await http('get', '/pet/state', undefined, true);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body).toEqual(renamedThrice);
  });
});
