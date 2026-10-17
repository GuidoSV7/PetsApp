import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';
import { IS_PUBLIC_KEY } from './auth/decorators/public.decorator.js';

describe('AppController', () => {
  it('answers a liveness status and is public', async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
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
