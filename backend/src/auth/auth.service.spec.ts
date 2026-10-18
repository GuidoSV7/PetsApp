import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_REPOSITORY } from '../users/ports/user-repository.port.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { userData } from '../users/testing/user-repository.fixtures.js';
import { AuthService, INVALID_CREDENTIALS } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { GOOGLE_TOKEN_VERIFIER } from './google-token.verifier.js';

const NOW = new Date('2025-06-01T12:00:00.000Z');

describe('AuthService login (in-memory repositories)', () => {
  let service: AuthService;
  let users: InMemoryUserRepository;
  const jwt = { sign: vi.fn<(payload: object) => string>(() => 'jwt-token') };

  const addUser = (overrides: Record<string, unknown> = {}) =>
    users.create(
      userData({
        email: 'ana@example.com',
        name: 'Ana',
        country: 'CO',
        password: bcrypt.hashSync('secret1', 4),
        ...overrides,
      }),
    );
  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (e: unknown) => e as Error,
    );

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    users = new InMemoryUserRepository();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: JwtService, useValue: jwt },
        {
          provide: GOOGLE_TOKEN_VERIFIER,
          useValue: { verify: vi.fn() },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('logs in a member and answers the session user plus the token', async () => {
    const user = await addUser();

    const result = await service.login({
      email: 'Ana@Example.com ',
      password: 'secret1',
    });

    expect(result).toEqual({
      user: {
        id: user.id,
        name: 'Ana',
        email: 'ana@example.com',
        role: UserRole.MEMBER,
        roles: [UserRole.MEMBER],
        country: 'CO',
      },
      token: 'jwt-token',
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email });
  });

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])(
    'logs in a %s with the same plain response shape',
    async (role) => {
      await addUser({ role });

      const result = await service.login({
        email: 'ana@example.com',
        password: 'secret1',
      });

      expect(result.user.role).toBe(role);
      expect(result).toHaveProperty('token', 'jwt-token');
    },
  );

  it('rejects a wrong password, an unknown email, an inactive and a blocked user with one message', async () => {
    await addUser();
    await addUser({ email: 'off@example.com', isActive: false });
    await addUser({ email: 'blocked@example.com', isBlocked: true });
    const login = (email: string, password = 'secret1') =>
      failure(service.login({ email, password }));

    const errors = [
      await login('ana@example.com', 'nope'),
      await login('ghost@example.com'),
      await login('off@example.com'),
      await login('blocked@example.com'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error?.message).toBe(INVALID_CREDENTIALS);
    }
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});

describe('AuthController route surface', () => {
  const routes = () =>
    Object.getOwnPropertyNames(AuthController.prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => {
        const handler = (AuthController.prototype as Record<string, unknown>)[
          name
        ] as object;
        return {
          path: Reflect.getMetadata('path', handler) as string | undefined,
          method: Reflect.getMetadata('method', handler) as number | undefined,
        };
      })
      .filter((route) => route.method !== undefined)
      .map((route) => route.path ?? '')
      .sort((a, b) => a.localeCompare(b));

  it('exposes exactly the session routes', () => {
    expect(routes()).toEqual([
      'change-password',
      'google',
      'login',
      'logout',
      'profile',
      'register',
      'verify-password',
    ]);
  });

  it('is mounted under /auth', () => {
    expect(Reflect.getMetadata('path', AuthController)).toBe('auth');
  });
});
