import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import request from 'supertest';
import type { TestDb } from '../../testing/postgres.js';
import { DRIZZLE } from '../../database/database.tokens.js';
import { configureHttpApp } from '../../config/http-setup.js';
import { createValidationPipe } from '../../config/validation-pipe.js';
import { AuthModule } from '../auth.module.js';
import { GOOGLE_TOKEN_VERIFIER } from '../google-token.verifier.js';
import { GlobalAuthGuard } from '../guards/global-auth.guard.js';

export const STELLAR_TEST_ORIGIN = 'https://pets.example';
export const STELLAR_TEST_PASSWORD = 'integration-password';
export const STELLAR_TEST_HMAC = 'synthetic-http-hmac-key-at-least-32-characters';
export const STELLAR_TEST_JWT = 'synthetic-http-jwt-key-at-least-32-characters';
export const STELLAR_TEST_SERVER = Keypair.random();

export async function stellarHttpTestApp(fixture: TestDb, overrides: Record<string, string> = {}) {
  @Global()
  @Module({ providers: [{ provide: DRIZZLE, useValue: fixture.db }], exports: [DRIZZLE] })
  class FixtureDatabaseModule {}
  const env = {
    NODE_ENV: 'test', TRUST_PROXY: '0', CORS_ORIGIN: STELLAR_TEST_ORIGIN, CLIENT_SECRET: 'synthetic-internal-secret',
    JWT_SECRET: STELLAR_TEST_JWT, STELLAR_AUTH_ENABLED: 'true',
    STELLAR_AUTH_SIGNING_SECRET: STELLAR_TEST_SERVER.secret(), STELLAR_AUTH_HMAC_SECRET: STELLAR_TEST_HMAC,
    STELLAR_HOME_DOMAIN: 'pets.example', STELLAR_WEB_AUTH_DOMAIN: 'auth.pets.example', ...overrides,
  };
  const module = await Test.createTestingModule({
    imports: [FixtureDatabaseModule, ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, ignoreEnvVars: true, load: [() => env] }), AuthModule, ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }])],
    providers: [{ provide: APP_GUARD, useClass: GlobalAuthGuard }, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).overrideProvider(GOOGLE_TOKEN_VERIFIER).useValue({ verify: async () => ({ email: 'google@example.com', name: 'Google', emailVerified: true }) }).compile();
  const app = module.createNestApplication<NestExpressApplication>();
  app.useLogger(false);
  configureHttpApp(app, env); app.useGlobalPipes(createValidationPipe()); await app.init();
  return { app, env, jwt: app.get(JwtService) };
}

export function stellarSigned(transaction: string, keys: Keypair[]) {
  const tx = TransactionBuilder.fromXDR(transaction, Networks.TESTNET); tx.sign(...keys); return tx.toXDR();
}
export function stellarCookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
}
export function stellarCookie(response: request.Response, name: string): string {
  const cookie = stellarCookies(response).find(c => c.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Expected ${name} cookie was not issued`);
  return cookie.split(';')[0];
}
export async function stellarSnapshot(fixture: TestDb) {
  const snapshot: Record<string, Array<Record<string, unknown>>> = {};
  for (const table of ['users', 'user_stellar_identities', 'roles', 'user_roles', 'user_coin_balances', 'user_coin_entries', 'pet_states', 'stellar_auth_challenges', 'stellar_auth_attempts']) {
    snapshot[table] = (await fixture.client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;
  }
  return snapshot;
}
