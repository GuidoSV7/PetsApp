import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import {
  allocateFixture,
  newRunContext,
  readTestUrl,
  startTestRun,
  listRunDatabases,
} from '../testing/postgres-lifecycle.js';

const migrationsFolder = join(import.meta.dirname, '../../drizzle');
const entry = {
  idx: 6,
  version: '7',
  when: 1792291000003,
  tag: '0006_stellar_user_identity',
  breakpoints: true,
};
const journalQuery = 'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id';

describe('Stellar identity migration foundation (not wallet signup)', () => {
  it('extends the journal and installs no credential trigger or data backfill', async () => {
    const journal = JSON.parse(
      await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
    );
    expect(journal.entries[6]).toEqual(entry);
    expect(entry.when).toBeGreaterThan(journal.entries[5].when);
    const sql = await readFile(
      join(migrationsFolder, `${entry.tag}.sql`),
      'utf8',
    );
    expect(sql).toContain("SET LOCAL lock_timeout = '5s'");
    expect(sql).not.toMatch(/\b(?:TRIGGER|CHECK|UPDATE|DELETE)\b/i);
  });

  it('preserves complete legacy rows and roles, permits multiple NULLs, enforces identity uniqueness and reapplies safely', async () => {
    const url = readTestUrl();
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-stellar-upgrade-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    try {
      const journal = JSON.parse(
        await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
      );
      const legacy = journal.entries.slice(0, 6);
      expect(legacy.map((e: { tag: string }) => e.tag)).toEqual([
        '0000_init',
        '0001_pet_states',
        '0002_pet_name',
        '0003_starting_coins_5',
        '0004_coat_pattern',
        '0005_free_pet_care',
      ]);
      await mkdir(join(folder, 'meta'));
      await writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({ ...journal, entries: legacy }),
      );
      for (const old of legacy) {
        await copyFile(
          join(migrationsFolder, `${old.tag}.sql`),
          join(folder, `${old.tag}.sql`),
        );
      }
      run = await startTestRun(url, newRunContext(), folder);
      fixture = await allocateFixture(url, run.context);
      const client = fixture.client;
      for (const coins of [0, 5, 37]) {
        await client.query(
          `INSERT INTO pet_states (
            guest_key,coins,name,rename_count,hunger,fun,energy,hygiene,
            status_key,coat_primary,coat_secondary,coat_accent,coat_pattern,
            created_at,updated_at
          ) VALUES (
            $1,$2,'Legacy',2,10,23,45,67,'broke','#123456','#234567','#345678',
            'tabby','2025-01-02T03:04:05Z','2025-06-07T08:09:10Z'
          )`,
          [`legacy-${coins}`, coins],
        );
        const { rows } = await client.query(
          `INSERT INTO users (
            email,password,name,is_blocked,is_active,profile_image,country,
            is_verified,last_login,created_at,updated_at
          ) VALUES (
            $1,$2,'Legacy',$3,$4,'image.png','CO',true,
            '2025-02-03T04:05:06Z','2025-01-02T03:04:05Z','2025-06-07T08:09:10Z'
          ) RETURNING id`,
          [
            `legacy-${coins}@example.com`,
            `unchanged-hash-${coins}`,
            coins === 5,
            coins !== 37,
          ],
        );
        await client.query(
          'INSERT INTO user_roles (user_id,role_id) SELECT $1,id FROM roles WHERE code=$2',
          [rows[0].id, coins === 0 ? 'member' : coins === 5 ? 'admin' : 'super_admin'],
        );
      }
      const snapshot = async () => ({
        users: (await client.query('SELECT * FROM users ORDER BY id')).rows,
        pets: (await client.query('SELECT * FROM pet_states ORDER BY id')).rows,
        roles: (await client.query('SELECT * FROM roles ORDER BY id')).rows,
        userRoles: (
          await client.query('SELECT * FROM user_roles ORDER BY user_id,role_id')
        ).rows,
      });
      const before = await snapshot();
      expect(before.users).toHaveLength(3);
      expect(before.pets).toHaveLength(3);
      expect(before.userRoles).toHaveLength(3);
      const history = (await client.query(journalQuery)).rows;
      const lock = (await client.query('SHOW lock_timeout')).rows;
      // Freeze this upgrade proof at 0006 when later migrations are added.
      await copyFile(
        join(migrationsFolder, `${entry.tag}.sql`),
        join(folder, `${entry.tag}.sql`),
      );
      await writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({ ...journal, entries: journal.entries.slice(0, 7) }),
      );
      await migrate(fixture.db, { migrationsFolder: folder });
      expect(await snapshot()).toEqual(before);
      const applied = (await client.query(journalQuery)).rows;
      expect(applied.slice(0, 6)).toEqual(history);
      expect(Number(applied[6].created_at)).toBe(entry.when);
      expect(applied).toHaveLength(7);
      expect((await client.query('SHOW lock_timeout')).rows).toEqual(lock);

      // SQL schema semantics, NOT application signup or a cross-table invariant.
      // T3 supplies the complete user + identity + member + zero-balance transaction.
      const first = (await client.query(
        "INSERT INTO users (email,password,name) VALUES (NULL,NULL,'Wallet one') RETURNING *",
      )).rows[0];
      const second = (await client.query(
        "INSERT INTO users (email,password,name) VALUES (NULL,NULL,'Wallet two') RETURNING *",
      )).rows[0];
      expect(first.email).toBeNull();
      expect(first.password).toBeNull();
      expect(second.email).toBeNull();
      expect(second.password).toBeNull();
      const address = 'G'.repeat(56);
      const insertIdentity = (userId: string, value: string) => client.query(
        'INSERT INTO user_stellar_identities (user_id,network,address) VALUES ($1,$2,$3)',
        [userId, 'testnet', value],
      );
      await insertIdentity(first.id, address);
      const identities = (await client.query('SELECT * FROM user_stellar_identities')).rows;
      const beforeRejections = await snapshot();
      await expect(insertIdentity(second.id, address)).rejects.toMatchObject({ code: '23505' });
      await expect(insertIdentity(first.id, 'A'.repeat(56))).rejects.toMatchObject({ code: '23505' });
      await expect(insertIdentity(
        '99999999-9999-4999-8999-999999999999',
        'B'.repeat(56),
      )).rejects.toMatchObject({ code: '23503' });
      await expect(client.query(
        "INSERT INTO users (email,password,name) VALUES ('legacy-0@example.com','x','duplicate')",
      )).rejects.toMatchObject({ code: '23505' });
      expect(await snapshot()).toEqual(beforeRejections);
      expect((await client.query('SELECT * FROM user_stellar_identities')).rows).toEqual(identities);
      for (const table of ['stellar_auth_challenges', 'stellar_auth_attempts']) {
        expect((await client.query(`SELECT * FROM ${table}`)).rows).toEqual([]);
      }
      const after = await snapshot();
      await migrate(fixture.db, { migrationsFolder: folder });
      expect(await snapshot()).toEqual(after);
      expect((await client.query(journalQuery)).rows).toEqual(applied);
      expect((await client.query('SELECT * FROM user_stellar_identities')).rows).toEqual(identities);
    } finally {
      try {
        await fixture?.close();
      } finally {
        try {
          await run?.close();
        } finally {
          await rm(folder, { recursive: true, force: true });
        }
      }
    }
  });

  it('rolls back schema and journal when the migration lock times out', async () => {
    const url = readTestUrl();
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-stellar-lock-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    let lock: import('pg').PoolClient | undefined;
    try {
      const journal = JSON.parse(
        await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
      );
      await mkdir(join(folder, 'meta'));
      for (const migration of journal.entries.slice(0, 7)) {
        await copyFile(
          join(migrationsFolder, `${migration.tag}.sql`),
          join(folder, `${migration.tag}.sql`),
        );
      }
      const writeJournal = (count: number) => writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({ ...journal, entries: journal.entries.slice(0, count) }),
      );
      await writeJournal(6);
      run = await startTestRun(url, newRunContext(), folder);
      fixture = await allocateFixture(url, run.context);
      const history = (await fixture.client.query(journalQuery)).rows;
      await writeJournal(7);
      lock = await fixture.client.connect();
      await lock.query('BEGIN');
      await lock.query('LOCK TABLE users IN ACCESS SHARE MODE');
      const started = Date.now();
      await expect(migrate(fixture.db, { migrationsFolder: folder }))
        .rejects.toMatchObject({ cause: { code: '55P03' } });
      expect(Date.now() - started).toBeLessThan(15_000);
      await lock.query('ROLLBACK');
      expect((await fixture.client.query(journalQuery)).rows).toEqual(history);
      expect((await fixture.client.query(
        "SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('email','password') ORDER BY column_name",
      )).rows).toEqual([{ is_nullable: 'NO' }, { is_nullable: 'NO' }]);
      expect((await fixture.client.query(
        "SELECT to_regclass('user_stellar_identities') AS name",
      )).rows).toEqual([{ name: null }]);
    } finally {
      try {
        if (lock) {
          try { await lock.query('ROLLBACK'); } finally { lock.release(); }
        }
      } finally {
        try { await fixture?.close(); } finally {
          try {
            await run?.close();
            if (run) expect(await listRunDatabases(url, run.context)).toEqual([]);
          } finally { await rm(folder, { recursive: true, force: true }); }
        }
      }
    }
  });
});
