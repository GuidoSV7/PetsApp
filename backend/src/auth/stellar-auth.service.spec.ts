import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Keypair } from '@stellar/stellar-sdk';
import bcrypt from 'bcrypt';
import { StellarAuthService, type StellarRequestContext } from './stellar-auth.service.js';
import { StellarAuthConfig } from '../config/stellar-auth.config.js';
import { StellarWebAuthAdapter } from './infrastructure/stellar-webauth.adapter.js';
import type { StellarChallenge, NewStellarChallenge, StellarBinding } from './ports/stellar-auth-repository.port.js';
import { InMemoryUserRepository } from '../users/testing/in-memory-user.repository.js';
import { userData } from '../users/testing/user-repository.fixtures.js';
import { AuthService } from './auth.service.js';
import { stellarHash } from './stellar-flow-cookie.js';
import { UserRole } from '../users/enums/user-role.enum.js';

const client = Keypair.random();
const hmac = 'synthetic-integration-hmac-secret-32-characters';
const settings = { STELLAR_AUTH_ENABLED: 'true', STELLAR_AUTH_SIGNING_SECRET: Keypair.random().secret(), STELLAR_AUTH_HMAC_SECRET: hmac, STELLAR_HOME_DOMAIN: 'pets.example', STELLAR_WEB_AUTH_DOMAIN: 'auth.pets.example' };
const context = (): StellarRequestContext => ({ flow: 'f'.repeat(43), ip: '127.0.0.1' });
const dto = { challengeId: '00000000-0000-4000-8000-000000000010', signedTxXdr: 'synthetic-proof', signerAddress: client.publicKey() };

describe('Stellar auth orchestration through domain ports', () => {
  const setup = async () => {
    const users = new InMemoryUserRepository();
    const user = await users.create(userData({ password: await bcrypt.hash('integration-password', 4) }));
    const c = new ConfigService({ ...settings });
    const config = new StellarAuthConfig(c);
    const jwt = new JwtService({ secret: 'synthetic-integration-jwt-secret-32-characters', signOptions: { expiresIn: '1h' } });
    const auth = new AuthService(users, jwt, { verify: vi.fn() });
    const checker = vi.spyOn(auth, 'verifyPassword');
    const row = (data: NewStellarChallenge): StellarChallenge => ({ ...data, id: dto.challengeId, createdAt: new Date(), failedAttempts: 0, consumedAt: null });
    const challenge = row({ purpose: 'login', network: 'testnet', address: client.publicKey(), transactionHash: 'a'.repeat(64), flowHash: 'b'.repeat(64), userId: null, sessionHash: null, expiresAt: new Date(Date.now() + 300_000) });
    const repository = {
      issue: vi.fn(async (data: NewStellarChallenge) => row(data)),
      confirm: vi.fn(async (_id: string, _binding: StellarBinding, proof: (c: StellarChallenge) => Promise<void>) => { await proof(challenge); return user; }),
      identity: vi.fn(async () => null),
    };
    const webAuth = new StellarWebAuthAdapter(config);
    vi.spyOn(webAuth, 'verify').mockResolvedValue();
    const sign = vi.spyOn(jwt, 'sign');
    const service = new StellarAuthService(config, repository, webAuth, users, auth, jwt);
    const linkContext = (): StellarRequestContext => ({ ...context(), user: { ...user, authSession: { issuedAt: Math.floor(Date.now() / 1000), fingerprint: 'session-fingerprint', method: 'existing' } } });
    return { service, users, user, config: c, repository, webAuth, checker, sign, jwt, linkContext };
  };
  beforeEach(() => vi.restoreAllMocks());

  it('persists only scoped HMAC identifiers and trusted context IP, with testnet metadata and no XDR/secrets in stored inputs', async () => {
    const s = await setup(); const result = await s.service.challenge('login', client.publicKey(), context());
    expect.soft(s.repository.issue).toHaveBeenCalledWith(expect.objectContaining({ flowHash: stellarHash(hmac, 'flow:login', context().flow), userId: null, sessionHash: null, address: client.publicKey() }), {
      addressKey: `address:${stellarHash(hmac, 'address:testnet', client.publicKey())}`,
      ipKey: `ip:${stellarHash(hmac, 'ip', context().ip)}`,
    });
    const stored = JSON.stringify(s.repository.issue.mock.calls[0]);
    expect.soft(stored).not.toContain(context().flow); expect.soft(stored).not.toContain(context().ip);
    expect.soft(stored).not.toContain(result.transaction); expect.soft(stored).not.toContain(settings.STELLAR_AUTH_SIGNING_SECRET);
    expect.soft(result).toMatchObject({ challengeId: dto.challengeId, network_passphrase: 'Test SDF Network ; September 2015', transaction: expect.any(String), expiresAt: expect.any(String) });
  });

  it('requires the existing password checker for email linking; wrong or missing password causes no challenge/counter/user mutation', async () => {
    const s = await setup(); const before = await s.users.findById(s.user.id);
    for (const password of [undefined, '', 'wrong']) {
      await expect.soft(s.service.challenge('link', client.publicKey(), s.linkContext(), password)).rejects.toMatchObject({ status: 401 });
      expect.soft(s.repository.issue).not.toHaveBeenCalled(); expect.soft(await s.users.findById(s.user.id)).toEqual(before);
    }
    await s.service.challenge('link', client.publicKey(), s.linkContext(), 'integration-password');
    expect.soft(s.checker).toHaveBeenLastCalledWith(expect.objectContaining({ id: s.user.id }), 'integration-password');
    expect.soft(s.repository.issue).toHaveBeenCalledTimes(1);
    expect.soft(s.repository.issue).toHaveBeenLastCalledWith(expect.objectContaining({ purpose: 'link', userId: s.user.id, sessionHash: stellarHash(hmac, 'session', 'session-fingerprint') }), expect.any(Object));
  });

  it('requires a valid user and strictly less than five-minute signed recent authentication, rejecting future/missing/boundary timestamps before persistence', async () => {
    const s = await setup(); const now = Date.now();
    for (const issuedAt of [undefined, Math.floor(now / 1000) - 300, Math.ceil(now / 1000) + 1]) {
      const ctx = s.linkContext(); ctx.user!.authSession!.issuedAt = issuedAt as number;
      await expect.soft(s.service.challenge('link', client.publicKey(), ctx, 'integration-password')).rejects.toMatchObject({ status: 401 });
      await expect.soft(s.service.verify('link', dto, ctx)).rejects.toMatchObject({ status: 401 });
    }
    await expect.soft(s.service.challenge('link', client.publicKey(), context(), 'integration-password')).rejects.toMatchObject({ status: 401 });
    await expect.soft(s.service.verify('link', dto, context())).rejects.toMatchObject({ status: 401 });
    expect.soft(s.repository.issue).not.toHaveBeenCalled(); expect.soft(s.repository.confirm).not.toHaveBeenCalled();
  });

  it('rechecks the five-minute boundary after password verification before issuing a link challenge', async () => {
    const s = await setup(); const ctx = s.linkContext(); const issuedAt = ctx.user!.authSession!.issuedAt;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(issuedAt * 1000 + 299_999);
    s.checker.mockImplementationOnce(async () => { clock.mockReturnValue(issuedAt * 1000 + 300_000); return { verified: true }; });
    const before = await s.users.findById(s.user.id);
    await expect.soft(s.service.challenge('link', client.publicKey(), ctx, 'integration-password')).rejects.toMatchObject({ status: 401 });
    expect.soft(s.repository.issue).not.toHaveBeenCalled(); expect.soft(await s.users.findById(s.user.id)).toEqual(before);
  });

  it('reloads the member before preparing link and never trusts request-cached state or roles', async () => {
    const s = await setup();
    for (const patch of [{ isBlocked: true }, { isActive: false }, { role: UserRole.ADMIN }]) {
      await s.users.update(s.user.id, patch); const before = await s.users.findById(s.user.id);
      await expect.soft(s.service.challenge('link', client.publicKey(), s.linkContext(), 'integration-password')).rejects.toMatchObject({ status: patch.role ? 403 : 401 });
      expect.soft(s.repository.issue).not.toHaveBeenCalled(); expect.soft(await s.users.findById(s.user.id)).toEqual(before);
      await s.users.update(s.user.id, { isActive: true, isBlocked: false, role: UserRole.MEMBER });
    }
  });

  it('binds verification to browser/purpose/user/session and checks signer metadata against the stored account, never a client-selected owner', async () => {
    const s = await setup();
    await s.service.verify('link', dto, s.linkContext());
    expect.soft(s.repository.confirm).toHaveBeenCalledWith(dto.challengeId, expect.objectContaining({ purpose: 'link', userId: s.user.id,
      flowHash: stellarHash(hmac, 'flow:link', context().flow), sessionHash: stellarHash(hmac, 'session', 'session-fingerprint'), recentUntil: expect.any(Number) }), expect.any(Function));
    const before = s.sign.mock.calls.length;
    await expect.soft(s.service.verify('login', { ...dto, signerAddress: Keypair.random().publicKey() }, context())).rejects.toMatchObject({ status: 401 });
    expect.soft(s.sign.mock.calls).toHaveLength(before);
  });

  it('signs a Stellar-method JWT only after successful atomic confirmation; failures and linking never issue a session', async () => {
    const s = await setup();
    let commit!: () => void;
    const committed = new Promise<void>(resolve => { commit = resolve; });
    s.repository.confirm.mockImplementationOnce(async () => { await committed; return s.user; });
    const pending = s.service.verify('login', dto, context());
    expect.soft(s.sign).not.toHaveBeenCalled(); commit();
    const result = await pending;
    expect.soft(s.jwt.verify(result.token!)).toMatchObject({ sub: s.user.id, method: 'stellar' });
    s.sign.mockClear();
    await s.service.verify('link', dto, s.linkContext()); expect.soft(s.sign).not.toHaveBeenCalled();
    s.repository.confirm.mockRejectedValueOnce(new Error('late rollback'));
    await expect(s.service.verify('login', dto, context())).rejects.toThrow('late rollback');
    expect.soft(s.sign).not.toHaveBeenCalled();
  });

  it('keeps all entrypoints disabled by default without reading/writing auth state', async () => {
    const s = await setup(); s.config.set('STELLAR_AUTH_ENABLED', 'false');
    await expect(s.service.challenge('login', client.publicKey(), context())).rejects.toMatchObject({ status: 503 });
    await expect(s.service.verify('login', dto, context())).rejects.toMatchObject({ status: 503 });
    await expect(s.service.identity(s.user.id)).rejects.toMatchObject({ status: 503 });
    expect(s.repository.issue).not.toHaveBeenCalled(); expect(s.repository.confirm).not.toHaveBeenCalled(); expect(s.repository.identity).not.toHaveBeenCalled();
  });
});
