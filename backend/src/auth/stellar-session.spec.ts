import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { userData } from '../users/testing/user-repository.fixtures.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('Stellar signed session method', () => {
  it('does not grant a Stellar session administrative access after later promotion', async () => {
    const users = new InMemoryUserRepository();
    const user = await users.create(userData());
    const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'synthetic-session-test-secret-32-characters' }), users);
    const payload = { sub: user.id, email: user.email, method: 'stellar' as const, iat: Math.floor(Date.now()/1000) };
    await expect(strategy.validate(payload)).resolves.toMatchObject({ id: user.id });
    await users.update(user.id, { role: UserRole.ADMIN });
    await expect(strategy.validate(payload)).rejects.toMatchObject({ status: 403 });
    // Existing email tokens still use the current roles and retain their contract.
    await expect(strategy.validate({ sub: user.id, email: user.email })).resolves.toMatchObject({ role: 'admin' });
  });
});
