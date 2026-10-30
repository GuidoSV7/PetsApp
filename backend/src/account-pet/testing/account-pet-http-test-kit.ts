import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { vi } from 'vitest';
import { configureHttpApp } from '../../config/http-setup.js';
import { createValidationPipe } from '../../config/validation-pipe.js';
import { DRIZZLE, PG_POOL } from '../../database/database.tokens.js';
import type { TestDb } from '../../testing/postgres.js';
import { DrizzleUserRepository } from '../../users/infrastructure/drizzle-user.repository.js';

export const ORIGIN = 'https://pets.example';
export const INTERNAL_SECRET = 'synthetic-account-pet-internal-secret';

/** Separate from the frozen SEP-10 kit; exercises the real application graph. */
export async function accountPetApp(fixture: TestDb, overrides: Record<string, string | undefined> = {}) {
  const forRoot = ConfigModule.forRoot.bind(ConfigModule);
  const spy = vi.spyOn(ConfigModule, 'forRoot').mockImplementation(options =>
    forRoot({ ...options, ignoreEnvFile: true, ignoreEnvVars: true }));
  let AppModule;
  try { ({ AppModule } = await import('../../app.module.js')); }
  finally { spy.mockRestore(); }
  const values: Record<string, string | undefined> = {
    NODE_ENV: 'test', TRUST_PROXY: '0', CORS_ORIGIN: ORIGIN,
    CLIENT_SECRET: INTERNAL_SECRET, JWT_SECRET: 'synthetic-account-pet-jwt-secret-at-least-32',
    ACCOUNT_PET_ENABLED: 'true', ...overrides,
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService).useValue({ get: (key: string) => values[key] })
    .overrideProvider(PG_POOL).useValue({ end: async () => undefined })
    .overrideProvider(DRIZZLE).useValue(fixture.db).compile();
  const app = module.createNestApplication<NestExpressApplication>();
  app.useLogger(false);
  configureHttpApp(app, { NODE_ENV: values.NODE_ENV, TRUST_PROXY: '0' });
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  const jwt = app.get(JwtService);
  return { app, values, async owner(name = 'Owner') {
    const user = await new DrizzleUserRepository(fixture.db).create({ name });
    const token = jwt.sign({ sub: user.id, email: user.email });
    return { user, token, cookie: `petsapp_session=${token}` };
  } };
}

export async function accountPetSnapshot(fixture: TestDb) {
  const result: Record<string, Array<Record<string, unknown>>> = {};
  for (const table of ['users', 'user_stellar_identities', 'roles', 'user_roles', 'pet_states', 'user_pet_ownership', 'pet_claim_operations', 'user_coin_balances', 'user_coin_entries', 'stellar_auth_challenges', 'stellar_auth_attempts']) {
    result[table] = (await fixture.client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
  }
  return result;
}
