import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService, sessionUser } from './auth.service.js';
import { StellarAuthConfig } from '../config/stellar-auth.config.js';
import { STELLAR_AUTH_REPOSITORY, type StellarAuthRepository, type StellarBinding, type StellarPurpose } from './ports/stellar-auth-repository.port.js';
import { STELLAR_WEBAUTH, type StellarWebAuth } from './ports/stellar-webauth.port.js';
import { USER_REPOSITORY, type UserRepository, type UserRow } from '../users/ports/user-repository.port.js';
import { assertRecentSession, assertStellarMember, type StellarSessionBinding } from './stellar-session.js';
import { stellarHash } from './stellar-flow-cookie.js';
import { logInfo, logWarn } from '../logging/service-log.js';

export interface StellarRequestContext {
  flow: string;
  ip: string;
  user?: UserRow & { authSession?: StellarSessionBinding };
}
export interface StellarVerifyInput { challengeId: string; signedTxXdr: string; signerAddress: string }

@Injectable()
export class StellarAuthService {
  private readonly logger = new Logger(StellarAuthService.name);
  constructor(
    private readonly config: StellarAuthConfig,
    @Inject(STELLAR_AUTH_REPOSITORY) private readonly repository: StellarAuthRepository,
    @Inject(STELLAR_WEBAUTH) private readonly webAuth: StellarWebAuth,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  async challenge(purpose: StellarPurpose, address: string, context: StellarRequestContext, password?: string) {
    try {
      const c = this.config.settings();
      const binding = this.binding(purpose, context, c.hmacSecret);
      if (purpose === 'link') {
        const user = await this.linkUser(context);
        // Reuse the existing credential checker and its NULL/password semantics.
        if (user.email !== null) await this.auth.verifyPassword(user, password ?? '');
        // Password verification can cross the recency boundary; it does not refresh iat.
        assertRecentSession(context.user?.authSession);
      }
      const challenge = this.webAuth.build(address);
      const row = await this.repository.issue({ purpose, network: c.network, address,
        transactionHash: challenge.transactionHash, flowHash: binding.flowHash,
        userId: binding.userId, sessionHash: binding.sessionHash,
        expiresAt: challenge.expiresAt,
      }, { addressKey: `address:${stellarHash(c.hmacSecret, 'address:testnet', address)}`, ipKey: `ip:${stellarHash(c.hmacSecret, 'ip', context.ip)}` });
      logInfo(this.logger, 'stellar_challenge_issued', 'Stellar challenge issued', { purpose });
      return { challengeId: row.id, transaction: challenge.transaction, network_passphrase: c.passphrase, expiresAt: row.expiresAt.toISOString() };
    } catch (error) {
      logWarn(this.logger, 'stellar_challenge_rejected', 'Stellar challenge rejected', { purpose });
      throw error;
    }
  }

  async verify(purpose: StellarPurpose, dto: StellarVerifyInput, context: StellarRequestContext) {
    try {
      const c = this.config.settings();
      const binding = this.binding(purpose, context, c.hmacSecret);
      if (purpose === 'link') await this.linkUser(context);
      const user = await this.repository.confirm(dto.challengeId, binding, async challenge => {
        if (dto.signerAddress !== challenge.address) throw new UnauthorizedException('Invalid Stellar proof');
        await this.webAuth.verify({ signedTxXdr: dto.signedTxXdr, address: challenge.address, transactionHash: challenge.transactionHash, expiresAt: challenge.expiresAt });
      });
      // confirm() has returned from its OUTER commit. No token/cookie on rollback.
      const token = purpose === 'login' ? this.jwt.sign({ sub: user.id, email: user.email, method: 'stellar' }) : undefined;
      logInfo(this.logger, 'stellar_verified', 'Stellar authentication verified', { purpose, userId: user.id });
      return { user: sessionUser(user), token };
    } catch (error) {
      logWarn(this.logger, 'stellar_verify_rejected', 'Stellar authentication rejected', { purpose });
      throw error;
    }
  }

  async identity(userId: string) {
    this.config.settings();
    return { identity: await this.repository.identity(userId) };
  }

  private binding(purpose: StellarPurpose, context: StellarRequestContext, secret: string): StellarBinding {
    if (!/^[A-Za-z0-9_-]{43}$/.test(context.flow)) throw new UnauthorizedException('Invalid Stellar flow');
    if (purpose === 'login') return { purpose, flowHash: stellarHash(secret, 'flow:login', context.flow), userId: null, sessionHash: null };
    if (!context.user) throw new UnauthorizedException('Authentication required');
    assertRecentSession(context.user.authSession);
    return { purpose, flowHash: stellarHash(secret, 'flow:link', context.flow), userId: context.user.id,
      sessionHash: stellarHash(secret, 'session', context.user.authSession.fingerprint), recentUntil: context.user.authSession.issuedAt * 1000 + 300_000 };
  }

  private async linkUser(context: StellarRequestContext): Promise<UserRow> {
    const user = context.user && await this.users.findById(context.user.id);
    if (!user) throw new UnauthorizedException('Invalid Stellar user');
    assertStellarMember(user);
    return user;
  }
}
