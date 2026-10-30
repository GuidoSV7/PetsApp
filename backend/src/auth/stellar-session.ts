import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { UserRow } from '../users/ports/user-repository.port.js';
import { UserRole } from '../users/enums/user-role.enum.js';

export interface StellarSessionBinding {
  issuedAt: number;
  fingerprint: string;
  method: 'stellar' | 'existing';
}
export function assertStellarMember(user: UserRow): void {
  if (!user.isActive || user.isBlocked) throw new UnauthorizedException('Invalid Stellar authentication');
  const roles = user.roles?.length ? user.roles : [user.role];
  if (!roles.includes(UserRole.MEMBER) || roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN)) {
    throw new ForbiddenException('Stellar authentication does not permit administrative access');
  }
}
export function assertRecentSession(session: StellarSessionBinding | undefined, now = Date.now()): asserts session is StellarSessionBinding {
  if (!session || !Number.isFinite(session.issuedAt) || session.issuedAt * 1000 > now || now - session.issuedAt * 1000 >= 300_000) {
    throw new UnauthorizedException('Recent authentication required');
  }
}
