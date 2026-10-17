import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { allowedOrigins } from '../../config/cors-origins.util.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { isSameOriginWrite } from '../csrf-origin.js';
import { isProductionEnv, sessionCookieName } from '../session-cookie.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

export const CLIENT_SECRET_HEADER = 'x-client-secret';

const UNAUTHENTICATED =
  'Authentication required: a JWT or a valid X-Client-Secret header';

/**
 * Global authentication guard (APP_GUARD), secure by default:
 * - `@Public()` routes are open.
 * - Whenever the session cookie is present, unsafe methods must come from an
 *   allowed `Origin` (403 otherwise, before passport runs), even if the
 *   request also carries an `Authorization` header.
 * - A request with an `Authorization` header must carry a JWT that the
 *   passport `jwt` strategy verifies (signature, expiry, active user). It
 *   never falls back to the cookie or the client secret. Without a cookie
 *   there is nothing ambient to forge, so the CSRF check does not apply.
 * - A request with only the session cookie is verified by the same strategy.
 * - Otherwise `X-Client-Secret` must match `CLIENT_SECRET` (internal
 *   services). Without `CLIENT_SECRET` the secret path fails closed, except
 *   in explicit local development (`NODE_ENV=development` and not
 *   `PROD=production`), which keeps an open mode for local tooling.
 * Role checks stay with `RolesGuard` on each route.
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  private readonly jwtGuard: JwtAuthGuard;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.jwtGuard = new JwtAuthGuard(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // CSRF first: the session cookie is the only ambient credential a browser
    // attaches on its own, so the Origin check runs whenever it is present,
    // whatever the Authorization header says (a bad header must not skip it).
    if (this.hasSessionCookie(request)) {
      this.assertSameOriginWrite(request);
    }
    if (
      request.headers.authorization !== undefined ||
      this.hasSessionCookie(request)
    ) {
      return (await this.jwtGuard.canActivate(context)) as boolean;
    }
    return this.checkClientSecret(request.headers[CLIENT_SECRET_HEADER]);
  }

  private hasSessionCookie(request: Request): boolean {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value =
      cookies?.[
        sessionCookieName(
          isProductionEnv({
            NODE_ENV: this.configService.get<string>('NODE_ENV'),
            PROD: this.configService.get<string>('PROD'),
          }),
        )
      ];
    return typeof value === 'string' && value !== '';
  }

  private assertSameOriginWrite(request: Request): void {
    const allowed = allowedOrigins(
      this.configService.get<string>('CORS_ORIGIN'),
    );
    if (!isSameOriginWrite(request, allowed)) {
      throw new ForbiddenException('Origin not allowed');
    }
  }

  private checkClientSecret(provided: string | string[] | undefined): boolean {
    const expected = this.configService.get<string>('CLIENT_SECRET');
    if (!expected) {
      if (this.isLocalDevelopment()) {
        return true;
      }
      throw new UnauthorizedException(UNAUTHENTICATED);
    }
    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
      throw new UnauthorizedException(UNAUTHENTICATED);
    }
    return true;
  }

  private isLocalDevelopment(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') === 'development' &&
      this.configService.get<string>('PROD') !== 'production'
    );
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
