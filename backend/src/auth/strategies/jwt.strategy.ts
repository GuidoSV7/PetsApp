import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import passportJwt from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '../jwt-secret.js';
import { createHash } from 'node:crypto';
import { assertStellarMember } from '../stellar-session.js';
import { isProductionEnv, sessionCookieName } from '../session-cookie.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../users/ports/user-repository.port.js';

const { ExtractJwt, Strategy } = passportJwt;

export type JwtPayload = { sub: string; email: string | null; method?: 'stellar'; iat?: number; exp?: number };

/**
 * Bearer when the request carries an Authorization header, otherwise the
 * session cookie. This is the same decision `GlobalAuthGuard` makes (an
 * Authorization header is the credential and never falls back to the cookie),
 * so the guard and the strategy can never verify different credentials. The
 * guard runs the Origin check whenever the cookie is present, whichever
 * credential wins.
 */
function extractToken(
  cookieName: () => string,
): (req: Request) => string | null {
  const fromBearer = ExtractJwt.fromAuthHeaderAsBearerToken();
  return (req) => {
    if (req.headers?.authorization !== undefined) return fromBearer(req);
    const value = (req.cookies as Record<string, unknown> | undefined)?.[
      cookieName()
    ];
    return typeof value === 'string' && value !== '' ? value : null;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    super({
      jwtFromRequest: extractToken(() =>
        sessionCookieName(
          isProductionEnv({
            NODE_ENV: configService.get<string>('NODE_ENV'),
            PROD: configService.get<string>('PROD'),
          }),
        ),
      ),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException(
        'This account has been deactivated. Contact an administrator to reactivate it.',
      );
    }
    if (user.isBlocked) {
      throw new UnauthorizedException(
        'This account is blocked. Contact an administrator.',
      );
    }
    if (payload.method === 'stellar') assertStellarMember(user);
    // Non-enumerable metadata must not change existing profile/user responses.
    return Object.defineProperty({ ...user }, 'authSession', {
      value: {
        issuedAt: payload.iat,
        fingerprint: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
        method: payload.method === 'stellar' ? 'stellar' : 'existing',
      },
      enumerable: false,
    }) as typeof user & { authSession: import('../stellar-session.js').StellarSessionBinding };
  }
}
