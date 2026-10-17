import { InMemoryRoleRepository } from './in-memory-role.repository.js';
import { roleRepositoryContract } from '../testing/role-repository.contract.js';

roleRepositoryContract(
  'InMemoryRoleRepository',
  () => new InMemoryRoleRepository(),
);
