import { describe, expect, it } from 'vitest';
import type { UserRepository } from '../ports/user-repository.port.js';
import { MISSING_ID, userData } from './user-repository.fixtures.js';

export function userReadsContract(repo: () => UserRepository): void {
  describe('reads', () => {
    it('findById returns the full row, password hash included', async () => {
      const created = await repo().create(
        userData({ password: 'the-hash', country: 'CO' }),
      );

      const found = await repo().findById(created.id);

      expect(found).toEqual(created);
      expect(found).toMatchObject({ password: 'the-hash', country: 'CO' });
    });

    it('findById answers null for a missing id and rejects a malformed one', async () => {
      await repo().create(userData());

      expect(await repo().findById(MISSING_ID)).toBeNull();
      await expect(repo().findById('nope')).rejects.toThrow();
    });

    it('findPublicById is the same row without the password key', async () => {
      const created = await repo().create(userData({ country: 'AR' }));
      const { password: _password, ...expected } = created;

      const found = await repo().findPublicById(created.id);

      expect(found).toEqual(expected);
      expect(found).not.toHaveProperty('password');
      expect(await repo().findPublicById(MISSING_ID)).toBeNull();
      await expect(repo().findPublicById('nope')).rejects.toThrow();
    });

    it('findByEmail matches the exact, case-sensitive email', async () => {
      const created = await repo().create(userData());

      expect(await repo().findByEmail('ada@example.com')).toEqual(created);
      expect(await repo().findByEmail('ADA@example.com')).toBeNull();
      expect(await repo().findByEmail('other@example.com')).toBeNull();
    });

    describe('findMany', () => {
      const seed = async () => {
        const make = (email: string, name: string, extra = {}) =>
          repo().create(userData({ email, name, ...extra }));
        const alice = await make('alice@x.com', 'Alice');
        const bob = await make('bob@x.com', 'Bob');
        const carol = await make('ALICE.WORK@y.com', 'carol', {
          isActive: false,
        });
        const under = await make('under@y.com', 'a_c');
        const pct = await make('pct@y.com', '50% off', { isActive: false });
        return { alice, bob, carol, under, pct };
      };
      const ids = async (filter?: {
        search?: string;
        includeInactive?: boolean;
      }) => (await repo().findMany(filter)).map((u) => u.id);
      const descending = (rows: { id: string }[]) =>
        rows.map((r) => r.id).sort((a, b) => (a < b ? 1 : -1));

      it('answers an empty list on an empty table', async () => {
        expect(await repo().findMany()).toEqual([]);
        await repo().create(userData());
        expect(await repo().findMany({ search: 'zzz' })).toEqual([]);
      });

      it('lists every user, inactive included, by id DESC, without passwords', async () => {
        const all = Object.values(await seed());

        const listed = await repo().findMany();

        expect(listed.map((u) => u.id)).toEqual(descending(all));
        expect(listed).toHaveLength(5);
        for (const row of listed) {
          expect(row).not.toHaveProperty('password');
        }
      });

      it('searches name and email with a case-sensitive LIKE', async () => {
        const { alice, bob, carol } = await seed();

        expect(await ids({ search: 'lic' })).toEqual([alice.id]);
        expect(await ids({ search: 'ALICE' })).toEqual([carol.id]);
        expect(await ids({ search: 'bob' })).toEqual([bob.id]);
        expect(await ids({ search: 'zzz' })).toEqual([]);
      });

      it('does not escape LIKE wildcards', async () => {
        const { alice, carol, under, pct } = await seed();

        expect(await ids({ search: '%' })).toHaveLength(5);
        expect(await ids({ search: 'a_c' })).toEqual([under.id]);
        expect(await ids({ search: 'a_' })).toEqual(
          descending([alice, carol, under]),
        );
        expect(await ids({ search: '50%' })).toEqual([pct.id]);
      });

      it('treats an empty search as no filter', async () => {
        await seed();

        expect(await ids({ search: '' })).toHaveLength(5);
        expect(await ids({ search: undefined })).toHaveLength(5);
      });

      it('hides inactive users only when includeInactive is false', async () => {
        const { alice, bob, under } = await seed();

        expect(await ids({ includeInactive: false })).toEqual(
          descending([alice, bob, under]),
        );
        expect(await ids({ includeInactive: true })).toHaveLength(5);
        expect(await ids({ search: 'lic', includeInactive: false })).toEqual([
          alice.id,
        ]);
        expect(await ids({ search: 'ALICE', includeInactive: false })).toEqual(
          [],
        );
      });
    });
  });
}
