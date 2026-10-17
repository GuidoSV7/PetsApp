import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { allowedOrigins } from '../../config/cors-origins.util.js';
import { isTrustedAuthPost } from '../csrf-origin.js';
import { isProductionEnv, sessionCookieName } from '../session-cookie.js';

/**
 * Origin / Sec-Fetch-Site check for the `@Public()` session endpoints
 * (`POST /auth/login`, `POST /auth/logout`). They carry no credential, so
 * `GlobalAuthGuard` skips them; this guard stops login CSRF and forced
 * logout. Rules live in `isTrustedAuthPost`.
 */
@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowed = allowedOrigins(
      this.configService.get<string>('CORS_ORIGIN'),
    );
    if (!isTrustedAuthPost(request, allowed, this.hasSessionCookie(request))) {
      throw new ForbiddenException('Origin not allowed');
    }
    return true;
  }

  private hasSessionCookie(request: Request): boolean {
    const name = sessionCookieName(
      isProductionEnv({
        NODE_ENV: this.configService.get<string>('NODE_ENV'),
        PROD: this.configService.get<string>('PROD'),
      }),
    );
    const value = (request.cookies as Record<string, unknown> | undefined)?.[
      name
    ];
    return typeof value === 'string' && value !== '';
  }
}
