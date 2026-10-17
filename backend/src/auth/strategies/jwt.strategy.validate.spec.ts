import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { InMemoryUserRepository } from '../../users/testing/in-memory-user.repository.js';
import { userData } from '../../users/testing/user-repository.fixtures.js';
import { JwtStrategy } from './jwt.strategy.js';

const config = {
  get: (key: string) =>
    key === 'JWT_SECRET' ? 'validate-secret-of-at-least-32-chars' : undefined,
} as unknown as ConfigService;

describe('JwtStrategy.validate', () => {
  const setup = () => {
    const users = new InMemoryUserRepository();
    return { users, strategy: new JwtStrategy(config, users) };
  };

  it('answers the full user row for an active, unblocked user', async () => {
    const { users, strategy } = setup();
    const user = await users.create(userData());

    const result = await strategy.validate({ sub: user.id, email: user.email });

    expect(result).toEqual(user);
  });

  it('rejects an unknown, inactive or blocked user with 401', async () => {
    const { users, strategy } = setup();
    const inactive = await users.create(
      userData({ email: 'off@example.com', isActive: false }),
    );
    const blocked = await users.create(
      userData({ email: 'blocked@example.com', isBlocked: true }),
    );
    const attempt = (sub: string) =>
      strategy.validate({ sub, email: 'x@example.com' });

    await expect(
      attempt('99999999-9999-4999-8999-999999999999'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(attempt(inactive.id)).rejects.toThrow(/deactivated/);
    await expect(attempt(blocked.id)).rejects.toThrow(/blocked/);
  });
});
