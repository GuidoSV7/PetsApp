import { InMemoryUserRepository } from './in-memory-user.repository.js';
import { userRepositoryContract } from './user-repository.contract.js';

userRepositoryContract(
  'InMemoryUserRepository',
  () => new InMemoryUserRepository(),
);
