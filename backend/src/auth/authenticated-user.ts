import type { UserPublicRow } from '../users/ports/user-repository.port.js';

/**
 * The user `JwtStrategy.validate` attaches to `request.user` and
 * `@CurrentUser()` hands to controllers. The runtime object is the users row;
 * the type hides the password hash so no controller can depend on it.
 */
export type AuthenticatedUser = UserPublicRow;
