import { Test } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_REPOSITORY } from '../users/ports/user-repository.port.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { userData } from '../users/testing/user-repository.fixtures.js';
import {
  AuthService,
  GOOGLE_INVALID,
  GOOGLE_UNVERIFIED,
} from './auth.service.js';
import {
  GOOGLE_TOKEN_VERIFIER,
  type GoogleIdProfile,
} from './google-token.verifier.js';
import bcrypt from 'bcrypt';

describe('AuthService loginWithGoogle', () => {
  let service: AuthService;
  let users: InMemoryUserRepository;
  const jwt = { sign: vi.fn(() => 'jwt-google') };
  const verify = vi.fn<(token: string) => Promise<GoogleIdProfile>>();

  const profile = (
    overrides: Partial<GoogleIdProfile> = {},
  ): GoogleIdProfile => ({
    sub: 'google-sub-1',
    email: 'Michi@Gmail.com',
    emailVerified: true,
    name: 'Michi Google',
    ...overrides,
  });

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    verify.mockReset();
    jwt.sign.mockClear();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: GOOGLE_TOKEN_VERIFIER, useValue: { verify } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('creates a verified member and issues a session for a new Google email', async () => {
    verify.mockResolvedValue(profile());
    const result = await service.loginWithGoogle('id-token-abc');

    const stored = await users.findByEmail('michi@gmail.com');
    expect(stored).not.toBeNull();
    expect(stored!.isVerified).toBe(true);
    expect(stored!.role).toBe(UserRole.MEMBER);
    expect(result.token).toBe('jwt-google');
    expect(result.user.email).toBe('michi@gmail.com');
    expect(result.user.name).toBe('Michi Google');
  });

  it('signs in an existing email without creating a duplicate', async () => {
    await users.create(
      userData({
        email: 'michi@gmail.com',
        name: 'Existing',
        password: bcrypt.hashSync('secret1', 4),
        isVerified: false,
      }),
    );
    verify.mockResolvedValue(profile({ name: 'From Google' }));

    const result = await service.loginWithGoogle('id-token-abc');
    const all = await users.findMany();
    expect(all).toHaveLength(1);
    expect(result.user.name).toBe('Existing');
    expect(result.user.email).toBe('michi@gmail.com');
    const stored = await users.findByEmail('michi@gmail.com');
    expect(stored!.isVerified).toBe(true);
  });

  it('rejects unverified Google emails', async () => {
    verify.mockResolvedValue(profile({ emailVerified: false }));
    await expect(service.loginWithGoogle('tok')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.loginWithGoogle('tok')).rejects.toThrow(
      GOOGLE_UNVERIFIED,
    );
  });

  it('rejects invalid Google tokens', async () => {
    verify.mockRejectedValue(new Error('bad token'));
    await expect(service.loginWithGoogle('tok')).rejects.toThrow(GOOGLE_INVALID);
  });

  it('fails closed when Google client id is not configured', async () => {
    verify.mockRejectedValue(new Error('GOOGLE_CLIENT_ID is not configured'));
    await expect(service.loginWithGoogle('tok')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('replaces the pre-registered password of an unverified account with an unusable hash and revokes its sessions (S1)', async () => {
    await users.create(
      userData({
        email: 'michi@gmail.com',
        password: bcrypt.hashSync('secret1', 4),
        isVerified: false,
      }),
    );
    const before = (await users.findByEmail('michi@gmail.com'))!;
    verify.mockResolvedValue(profile());

    await service.loginWithGoogle('id-token-abc');

    const storedUser = (await users.findByEmail('michi@gmail.com'))!;
    expect(storedUser.isVerified).toBe(true);
    // The pre-registered password no longer matches anything.
    expect(await bcrypt.compare('secret1', storedUser.password)).toBe(false);
    expect(storedUser.password).toMatch(/^\$2[aby]\$/);
    expect(storedUser.password).not.toBe(before.password);
    expect(storedUser.tokenVersion).toBe(before.tokenVersion + 1);
  });

  it('keeps the pre-registered password and token version of a verified account (S1)', async () => {
    await users.create(
      userData({
        email: 'michi@gmail.com',
        password: bcrypt.hashSync('secret1', 4),
        isVerified: true,
      }),
    );
    const before = (await users.findByEmail('michi@gmail.com'))!;
    verify.mockResolvedValue(profile());

    await service.loginWithGoogle('id-token-abc');

    const storedUser = (await users.findByEmail('michi@gmail.com'))!;
    expect(await bcrypt.compare('secret1', storedUser.password)).toBe(true);
    expect(storedUser.tokenVersion).toBe(before.tokenVersion);
  });

  it('rejects a blocked account before any takeover and leaves the credentials untouched (S1)', async () => {
    await users.create(
      userData({
        email: 'bloqueada@gmail.com',
        password: bcrypt.hashSync('secret1', 4),
        isBlocked: true,
      }),
    );
    const before = (await users.findByEmail('bloqueada@gmail.com'))!;
    verify.mockResolvedValue(profile({ email: 'bloqueada@gmail.com' }));

    await expect(service.loginWithGoogle('tok')).rejects.toMatchObject({
      message: 'Invalid credentials',
    });

    const storedUser = (await users.findByEmail('bloqueada@gmail.com'))!;
    expect(storedUser.password).toBe(before.password);
    expect(storedUser.isVerified).toBe(before.isVerified);
    expect(storedUser.tokenVersion).toBe(before.tokenVersion);
  });
});
