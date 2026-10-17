import { Global, Module, type DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy.js';
import { USER_REPOSITORY } from '../../users/ports/user-repository.port.js';
import { UserRole } from '../../users/enums/user-role.enum.js';
import { DRIZZLE } from '../../database/database.tokens.js';

export const TEST_JWT_SECRET = 'test-jwt-secret-at-least-32-characters';
export const TEST_CLIENT_SECRET = 'test-client-secret';

export const ADMIN_ID = '00000000-0000-4000-8000-00000000000a';
export const MEMBER_ID = '00000000-0000-4000-8000-00000000000b';
export const BLOCKED_ID = '00000000-0000-4000-8000-00000000000c';
export const SUPER_ADMIN_ID = '00000000-0000-4000-8000-00000000000d';

/** Mutable env read by the fake ConfigService at request time. */
export type TestEnv = Record<string, string | undefined>;

export function createTestEnv(overrides: TestEnv = {}): TestEnv {
  return { JWT_SECRET: TEST_JWT_SECRET, NODE_ENV: 'test', ...overrides };
}

const users = new Map([
  [ADMIN_ID, { role: UserRole.ADMIN, isBlocked: false }],
  [MEMBER_ID, { role: UserRole.MEMBER, isBlocked: false }],
  [BLOCKED_ID, { role: UserRole.MEMBER, isBlocked: true }],
  [SUPER_ADMIN_ID, { role: UserRole.SUPER_ADMIN, isBlocked: false }],
]);

/** In-memory USER_REPOSITORY: only `findById` is needed by JwtStrategy. */
export const testUserRepository = {
  findById: (id: string) => {
    const user = users.get(id);
    return Promise.resolve(
      user
        ? {
            id,
            email: `${id}@test.local`,
            isActive: true,
            roles: [user.role],
            ...user,
          }
        : null,
    );
  },
};

/**
 * Global module with the real JwtStrategy (passport 'jwt'), a fake
 * ConfigService backed by `env`, and an inert DRIZZLE so feature modules
 * compile without a database.
 */
export function authTestModule(env: TestEnv): DynamicModule {
  @Global()
  @Module({})
  class AuthTestModule {}
  return {
    module: AuthTestModule,
    imports: [PassportModule],
    providers: [
      { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      { provide: USER_REPOSITORY, useValue: testUserRepository },
      { provide: DRIZZLE, useValue: {} },
      JwtStrategy,
    ],
    exports: [ConfigService, USER_REPOSITORY, DRIZZLE],
  };
}

const jwt = new JwtService({ secret: TEST_JWT_SECRET });

export function signToken(
  sub: string,
  options: { secret?: string; expiresIn?: number } = {},
): string {
  return jwt.sign(
    { sub, email: `${sub}@test.local` },
    { secret: options.secret, expiresIn: options.expiresIn ?? 3600 },
  );
}

export function expiredToken(sub: string): string {
  const past = Math.floor(Date.now() / 1000) - 120;
  return jwt.sign({
    sub,
    email: `${sub}@test.local`,
    iat: past - 60,
    exp: past,
  });
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
