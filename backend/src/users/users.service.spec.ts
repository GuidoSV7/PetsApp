import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from './enums/user-role.enum.js';
import { USER_REPOSITORY } from './ports/user-repository.port.js';
import { InMemoryUserRepository } from './testing/in-memory-user.repository.js';
import { MISSING_ID, userData } from './testing/user-repository.fixtures.js';
import { UsersService } from './users.service.js';

describe('UsersService (in-memory repository)', () => {
  let service: UsersService;
  let repo: InMemoryUserRepository;

  beforeEach(async () => {
    repo = new InMemoryUserRepository();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();
    service = module.get(UsersService);
  });

  const notFound = (id: string) =>
    new NotFoundException(`User with id ${id} not found`);

  it('rejects password-gated deletion without bcrypt or mutation when password is absent', async () => {
    const stored = await repo.create(userData({ email: null, password: null }));
    const compare = vi.spyOn(bcrypt, 'compare');
    const update = vi.spyOn(repo, 'update');
    try {
      await expect(service.delete(stored.id, 'secret')).rejects.toMatchObject({
        message: 'PASSWORD_NOT_CONFIGURED',
        status: 409,
      });
      expect(compare).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    } finally {
      compare.mockRestore();
      update.mockRestore();
    }
    expect(await repo.findById(stored.id)).toEqual(stored);
  });

  it.each([null, '', '   '])(
    'rejects explicit email erasure (%j) without any profile mutation',
    async (email) => {
      const user = await repo.create(userData());
      const update = vi.spyOn(repo, 'update');
      try {
        await expect(service.update(user.id, {
          name: 'No change', email,
        })).rejects.toMatchObject({ status: 400, message: 'Email cannot be removed' });
        expect(update).not.toHaveBeenCalled();
        expect(await repo.findById(user.id)).toEqual(user);
      } finally {
        update.mockRestore();
      }
    },
  );

  it.each([
    { email: null, status: 400, message: 'Email cannot be removed' },
    { email: '', status: 400, message: 'Email cannot be removed' },
    { email: '   ', status: 400, message: 'Email cannot be removed' },
    { email: 'new@example.com', status: 409, message: 'Credential conversion is not supported' },
  ])('rejects incomplete wallet credential PATCH ($email) without mutation', async ({ email, status, message }) => {
    const wallet = await repo.create(userData({ email: null, password: null }));
    const update = vi.spyOn(repo, 'update');
    try {
      await expect(service.update(wallet.id, {
        email, name: 'No change',
      })).rejects.toMatchObject({ status, message });
      expect(update).not.toHaveBeenCalled();
      expect(await repo.findById(wallet.id)).toEqual(wallet);
      expect(await repo.findMany()).toHaveLength(1);
    } finally {
      update.mockRestore();
    }
  });

  it('keeps nullable public profiles and allows wallet name/country edits with omitted email', async () => {
    const wallet = await repo.create(userData({ email: null, password: null }));
    const profile = await service.getUserProfile(wallet.id);
    const complete = await service.findOneComplete(wallet.id);
    const listed = await service.findAllComplete('Ada');
    expect(profile).toMatchObject({ id: wallet.id, email: null });
    expect(complete).toMatchObject({ id: wallet.id, email: null });
    expect(listed).toEqual([complete]);
    for (const result of [profile, complete, ...listed]) {
      expect(result).not.toHaveProperty('password');
    }
    const updated = await service.update(wallet.id, { name: 'Wallet', country: 'CO' });
    expect(updated).toMatchObject({ email: null, name: 'Wallet', country: 'CO' });
    expect(updated).not.toHaveProperty('password');
    expect(await repo.findById(wallet.id)).toEqual({ ...wallet, name: 'Wallet', country: 'CO' });
  });

  it('preserves existing nonempty email replacement and nullable non-credential patch semantics', async () => {
    const user = await repo.create(userData({ country: 'CO', profileImage: 'old.png' }));
    await service.update(user.id, {
      email: 'other@example.com', country: null, profileImage: '', name: undefined,
    });
    expect(await repo.findById(user.id)).toEqual({
      ...user, email: 'other@example.com', country: null, profileImage: '',
    });
  });

  describe('profile', () => {
    it('maps the profile with userName, without credentials', async () => {
      const user = await repo.create(userData());
      const findById = vi.spyOn(repo, 'findById');

      const profile = await service.getUserProfile(user.id);

      expect(profile).toEqual({
        id: user.id,
        email: 'ada@example.com',
        userName: 'Ada',
        role: 'member',
        roles: ['member'],
        isBlocked: false,
        isVerified: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(findById).not.toHaveBeenCalled();
    });

    it('maps a missing id to NotFoundException on every read', async () => {
      await expect(service.getUserProfile(MISSING_ID)).rejects.toEqual(
        notFound(MISSING_ID),
      );
      await expect(service.findOneComplete(MISSING_ID)).rejects.toEqual(
        notFound(MISSING_ID),
      );
    });
  });

  describe('admin reads', () => {
    it('maps the complete dto with null country and last login', async () => {
      const user = await repo.create(userData({ role: UserRole.ADMIN }));

      const complete = await service.findOneComplete(user.id);

      expect(complete).toEqual({
        id: user.id,
        email: 'ada@example.com',
        userName: 'Ada',
        role: 'admin',
        roles: ['admin'],
        isBlocked: false,
        isVerified: false,
        country: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: null,
      });
      expect(complete).not.toHaveProperty('password');
    });

    it('forwards search and includeInactive to the repository and treats an empty search as none', async () => {
      await repo.create(userData());
      const findMany = vi.spyOn(repo, 'findMany');

      await service.findAllComplete('Ad', false);
      await service.findAllComplete('');
      await service.findAllComplete();

      expect(findMany.mock.calls).toEqual([
        [{ search: 'Ad', includeInactive: false }],
        [{ search: undefined, includeInactive: true }],
        [{ search: undefined, includeInactive: true }],
      ]);
    });

    it('lists mapped rows by id DESC without credentials', async () => {
      const a = await repo.create(userData({ email: 'a@x.com' }));
      const b = await repo.create(userData({ email: 'b@x.com' }));

      const listed = await service.findAllComplete();

      expect(listed.map((u) => u.id)).toEqual(
        [a.id, b.id].sort((x, y) => (x < y ? 1 : -1)),
      );
      expect(listed.map((u) => u.userName)).toEqual(['Ada', 'Ada']);
      for (const row of listed) {
        expect(row).not.toHaveProperty('password');
      }
    });
  });

  describe('update', () => {
    it('maps only name, email, profileImage and country to the repository', async () => {
      const user = await repo.create(userData());
      const update = vi.spyOn(repo, 'update');

      await service.update(user.id, {
        name: 'Grace',
        role: UserRole.ADMIN,
        isBlocked: true,
        password: 'forged',
        id: MISSING_ID,
      } as never);

      const [id, patch] = update.mock.calls[0];
      expect(id).toBe(user.id);
      expect(Object.keys(patch).sort()).toEqual([
        'country',
        'email',
        'name',
        'profileImage',
      ]);
      expect(patch).toEqual({ name: 'Grace' });
      expect(await repo.findById(user.id)).toMatchObject({
        name: 'Grace',
        role: 'member',
        roles: ['member'],
        isBlocked: false,
        password: 'hashed-password',
      });
    });

    it('answers the row without the password and keeps updatedAt', async () => {
      const user = await repo.create(userData());

      const updated = await service.update(user.id, { name: 'Grace' });

      expect(updated).not.toHaveProperty('password');
      expect(updated).toEqual({
        id: user.id,
        email: 'ada@example.com',
        name: 'Grace',
        role: 'member',
        roles: ['member'],
        isBlocked: false,
        isActive: true,
        profileImage: null,
        country: null,
        isVerified: false,
        lastLogin: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('maps a missing id to NotFoundException and lets repository errors through', async () => {
      await repo.create(userData({ email: 'taken@x.com' }));
      const other = await repo.create(userData({ email: 'other@x.com' }));

      await expect(service.update(MISSING_ID, { name: 'x' })).rejects.toEqual(
        notFound(MISSING_ID),
      );
      await expect(
        service.update(other.id, { email: 'taken@x.com' }),
      ).rejects.toThrow(/duplicate key/);
    });
  });

  describe('toggleBlock', () => {
    it('flips isBlocked both ways without exposing the password', async () => {
      const user = await repo.create(userData());

      const blocked = await service.toggleBlock(user.id);
      const unblocked = await service.toggleBlock(user.id);

      expect(blocked).toMatchObject({ id: user.id, isBlocked: true });
      expect(blocked).not.toHaveProperty('password');
      expect(unblocked).toMatchObject({ isBlocked: false });
    });

    it('maps a missing id to NotFoundException', async () => {
      await expect(service.toggleBlock(MISSING_ID)).rejects.toEqual(
        notFound(MISSING_ID),
      );
    });
  });

  describe('delete', () => {
    it('deactivates the account when the password matches', async () => {
      const user = await repo.create(
        userData({ password: await bcrypt.hash('secret', 4) }),
      );

      expect(await service.delete(user.id, 'secret')).toEqual({
        message: 'Account deactivated successfully',
      });
      expect(await repo.findById(user.id)).toMatchObject({ isActive: false });
    });

    it('rejects a wrong password and a missing user', async () => {
      const user = await repo.create(
        userData({ password: await bcrypt.hash('secret', 4) }),
      );

      await expect(service.delete(user.id, 'wrong')).rejects.toEqual(
        new UnauthorizedException('Incorrect password'),
      );
      await expect(service.delete(MISSING_ID, 'secret')).rejects.toEqual(
        notFound(MISSING_ID),
      );
      expect(await repo.findById(user.id)).toMatchObject({ isActive: true });
    });
  });
});
