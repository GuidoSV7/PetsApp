import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';
import { IS_PUBLIC_KEY } from './auth/decorators/public.decorator.js';
import { PG_POOL } from './database/database.tokens.js';

type ProbePool = { query: (sql: string) => Promise<unknown> };

function moduleWith(pool: ProbePool): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [AppController],
    providers: [{ provide: PG_POOL, useValue: pool }],
  }).compile();
}

describe('AppController', () => {
  it('answers a liveness status and is public', async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PG_POOL, useValue: { query: async () => ({}) } }],
    }).compile();
    const controller = app.get(AppController);

    expect(controller.health()).toEqual({ status: 'ok' });
    const health = Object.getOwnPropertyDescriptor(
      AppController.prototype,
      'health',
    )?.value as object;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, health)).toBe(true);
  });
});

describe('AppController readiness (GET /health/ready, S8)', () => {
  it('runs SELECT 1 and answers ok when the database is reachable', async () => {
    const queries: string[] = [];
    const module = await moduleWith({
      query: async (sql) => {
        queries.push(sql);
        return { rows: [{ '?column?': 1 }] };
      },
    });

    expect(await module.get(AppController).ready()).toEqual({ status: 'ok' });
    expect(queries).toEqual(['SELECT 1']);
  });

  it('answers 503 when the database is unreachable', async () => {
    const module = await moduleWith({
      query: async () => {
        throw new Error('ECONNREFUSED 127.0.0.1:5432');
      },
    });

    await expect(module.get(AppController).ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('is public', async () => {
    await moduleWith({ query: async () => ({}) });
    const ready = Object.getOwnPropertyDescriptor(
      AppController.prototype,
      'ready',
    )?.value as object;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, ready)).toBe(true);
  });
});
