import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_REPOSITORY } from '../users/ports/user-repository.port.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { userData } from '../users/testing/user-repository.fixtures.js';
import { AuthService, EMAIL_TAKEN } from './auth.service.js';

describe('AuthService register (in-memory repositories)', () => {
  let service: AuthService;
  let users: InMemoryUserRepository;
  const jwt = { sign: vi.fn<(payload: object) => string>(() => 'jwt-token') };

  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (e: unknown) => e as Error,
    );
  const dto = (overrides: Record<string, unknown> = {}) => ({
    email: 'Ana@Example.com ',
    password: 'secret-1',
    name: ' Ana ',
    ...overrides,
  });

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  afterEach(() => vi.clearAllMocks());

  it('creates a member with a hashed password and answers the login shape', async () => {
    const result = await service.register(dto({ country: 'co' }));

    const stored = await users.findByEmail('ana@example.com');
    expect(stored).not.toBeNull();
    expect(stored!.password).not.toBe('secret-1');
    expect(await bcrypt.compare('secret-1', stored!.password)).toBe(true);
    expect(result).toEqual({
      user: {
        id: stored!.id,
        name: 'Ana',
        email: 'ana@example.com',
        role: UserRole.MEMBER,
        roles: [UserRole.MEMBER],
        country: 'CO',
      },
      token: 'jwt-token',
    });
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: stored!.id,
      email: 'ana@example.com',
    });
  });

  it('answers what login answers for the same account', async () => {
    const registered = await service.register(dto());

    const loggedIn = await service.login({
      email: 'ana@example.com',
      password: 'secret-1',
    });

    expect(loggedIn).toEqual(registered);
  });

  it('stores a null country when it is omitted', async () => {
    const result = await service.register(dto());

    expect(result.user.country).toBeNull();
  });

  it('never grants a role other than member, whatever the payload says', async () => {
    const result = await service.register(
      dto({ role: UserRole.SUPER_ADMIN, roles: [UserRole.ADMIN] }) as never,
    );

    expect(result.user.role).toBe(UserRole.MEMBER);
    expect(result.user.roles).toEqual([UserRole.MEMBER]);
  });

  it('rejects a taken email with 409, case-insensitively, without signing a token', async () => {
    await users.create(userData({ email: 'ana@example.com' }));

    const error = await failure(
      service.register(dto({ email: 'ANA@example.com' })),
    );

    expect(error).toBeInstanceOf(ConflictException);
    expect(error?.message).toBe(EMAIL_TAKEN);
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(await users.findMany()).toHaveLength(1);
  });

  it('maps a unique violation raised by the repository (the race) to the same 409', async () => {
    vi.spyOn(users, 'findByEmail').mockResolvedValueOnce(null);
    await users.create(userData({ email: 'ana@example.com' }));

    const error = await failure(service.register(dto()));

    expect(error).toBeInstanceOf(ConflictException);
    expect(error?.message).toBe(EMAIL_TAKEN);
  });

  it('rejects a short password with 400 before touching the repository', async () => {
    const create = vi.spyOn(users, 'create');

    const error = await failure(service.register(dto({ password: '1234567' })));

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error?.message).toBe(
      'The password must be at least 8 characters long',
    );
    expect(create).not.toHaveBeenCalled();
  });
});
