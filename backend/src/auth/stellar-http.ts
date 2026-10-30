import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { isProductionEnv } from './session-cookie.js';
import { StellarRateLimitException } from './stellar-rate-limit.js';
import { prepareStellarFlow, readStellarFlow } from './stellar-flow-cookie.js';
import type { StellarPurpose } from './ports/stellar-auth-repository.port.js';
import type { StellarRequestContext } from './stellar-auth.service.js';

export function stellarSecureCookies(config: ConfigService): boolean {
  return isProductionEnv({ NODE_ENV: config.get<string>('NODE_ENV'), PROD: config.get<string>('PROD') });
}
export function stellarRequestContext(req: Request, purpose: StellarPurpose, secure: boolean, preparing = false): StellarRequestContext {
  return {
    flow: preparing ? prepareStellarFlow(req.cookies, purpose, secure) : readStellarFlow(req.cookies, purpose, secure),
    ip: req.ip ?? 'unresolved',
    user: req.user as StellarRequestContext['user'],
  };
}
export async function stellarHttpResult<T>(res: Response, work: () => Promise<T>): Promise<T> {
  // Public and private challenge routes share this mapping; never serialize a token.
  try { return await work(); }
  catch (error) {
    if (error instanceof StellarRateLimitException) res.setHeader('Retry-After', String(error.retryAfter));
    throw error;
  }
}
