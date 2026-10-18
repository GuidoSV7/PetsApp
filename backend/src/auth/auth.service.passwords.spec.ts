import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole } from '../users/enums/user-role.enum.js';
import { USER_REPOSITORY } from '../users/ports/user-repository.port.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { userData } from '../users/testing/user-repository.fixtures.js';
import { AuthService } from './auth.service.js';
import { GOOGLE_TOKEN_VERIFIER } from './google-token.verifier.js';

describe('AuthService profile and passwords (in-memory repositories)', () => {
  let service: AuthService;
  let users: InMemoryUserRepository;

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
    users = new InMemoryUserRepository();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: JwtService, useValue: {} },
        {
          provide: GOOGLE_TOKEN_VERIFIER,
          useValue: { verify: () => Promise.reject(new Error('unused')) },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('maps the profile to its six public fields, roles included', async () => {
    const user = await addUser();

    expect(service.getProfile(user)).toEqual({
      id: user.id,
      name: 'Ana',
      email: 'ana@example.com',
      role: UserRole.MEMBER,
      roles: [UserRole.MEMBER],
      country: 'CO',
    });
  });

  it('changes only the password hash of the row the request carries', async () => {
    const user = await addUser({ profileImage: 'ana.png' });

    const result = await service.changePassword(
      user,
      'secret1',
      'brand-new-pass',
    );

    const stored = await users.findById(user.id);
    expect(result).toEqual({ message: 'Password updated successfully' });
    expect(await bcrypt.compare('brand-new-pass', stored!.password)).toBe(true);
    expect(stored).toMatchObject({ profileImage: 'ana.png', name: 'Ana' });
  });

  it('rejects a wrong current password and a short new one', async () => {
    const user = await addUser();

    const wrong = await failure(service.changePassword(user, 'nope', '123'));
    const short = await failure(
      service.changePassword(user, 'secret1', '1234567'),
    );

    expect(wrong).toBeInstanceOf(UnauthorizedException);
    expect(wrong?.message).toBe('Current password is incorrect');
    expect(short).toBeInstanceOf(BadRequestException);
    expect(short?.message).toBe(
      'The new password must be at least 8 characters long',
    );
    expect((await users.findById(user.id))!.password).toBe(user.password);
  });

  it('does not re-create a user that no longer exists', async () => {
    const user = await addUser();
    const ghost = { ...user, id: '99999999-9999-4999-8999-999999999999' };

    const result = await service.changePassword(
      ghost,
      'secret1',
      'brand-new-pass',
    );

    expect(result.message).toBe('Password updated successfully');
    expect(await users.findById(ghost.id)).toBeNull();
  });

  it('verifies the password of the request user', async () => {
    const user = await addUser();

    expect(await service.verifyPassword(user, 'secret1')).toEqual({
      verified: true,
    });
    const wrong = await failure(service.verifyPassword(user, 'nope'));

    expect(wrong).toBeInstanceOf(UnauthorizedException);
    expect(wrong?.message).toBe('Incorrect password');
  });
});
