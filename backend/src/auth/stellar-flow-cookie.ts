import { randomBytes, createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import type { StellarPurpose } from './ports/stellar-auth-repository.port.js';

export function stellarFlowCookieName(purpose: StellarPurpose, secure: boolean): string {
  return `${secure ? '__Host-' : ''}petsapp_stellar_${purpose}`;
}
export function readStellarFlow(cookies: Record<string, unknown> | undefined, purpose: StellarPurpose, secure: boolean): string {
  const value = cookies?.[stellarFlowCookieName(purpose, secure)];
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new UnauthorizedException('Invalid Stellar flow');
  return value;
}
export function prepareStellarFlow(cookies: Record<string, unknown> | undefined, purpose: StellarPurpose, secure: boolean): string {
  try { return readStellarFlow(cookies, purpose, secure); }
  catch { return randomBytes(32).toString('base64url'); }
}
export function setStellarFlowCookie(res: Pick<Response, 'cookie'>, purpose: StellarPurpose, secure: boolean, flow: string): void {
  res.cookie(stellarFlowCookieName(purpose, secure), flow, { path: '/', maxAge: 300_000, httpOnly: true, sameSite: 'lax', secure });
}
export function stellarHash(secret: string, scope: string, value: string): string {
  return createHmac('sha256', secret).update(`${scope}\0${value}`).digest('hex');
}
