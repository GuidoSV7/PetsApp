import { beforeEach, describe } from 'vitest';
import type { UserRepository } from '../ports/user-repository.port.js';
import { userReadsContract } from './user-repository.contract.reads.js';
import { userWritesContract } from './user-repository.contract.writes.js';

/**
 * Behavior every `UserRepository` adapter must honor. Run by the in-memory
 * adapter spec and by the Drizzle integration spec, so the fake cannot drift
 * from the real adapter.
 */
export function userRepositoryContract(
  name: string,
  setup: () => Promise<UserRepository> | UserRepository,
): void {
  describe(`${name} satisfies the UserRepository contract`, () => {
    let repo: UserRepository;

    beforeEach(async () => {
      repo = await setup();
    });

    userReadsContract(() => repo);
    userWritesContract(() => repo);
  });
}
