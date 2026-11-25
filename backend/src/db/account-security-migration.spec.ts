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
} from '../testing/postgres-lifecycle.js';

const migrationsFolder = join(import.meta.dirname, '../../drizzle');
const entry = {
  idx: 6,
  version: '7',
  when: 1794369777673,
  tag: '0006_account_security',
  breakpoints: true,
};
const usersQuery = 'SELECT email, token_version FROM users ORDER BY email';
const legacyUsersQuery = 'SELECT email FROM users ORDER BY email';
const indexesQuery =
  "SELECT indexname FROM pg_indexes WHERE tablename IN ('users','user_roles') ORDER BY indexname";
const journalQuery = 'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id';

describe('account security migration (S3, S6, S13)', () => {
  it('adds only token_version, the role_id index and the lower(email) unique index', async () => {
    const sql = await readFile(
      join(migrationsFolder, entry.tag + '.sql'),
      'utf8',
    );
    expect(sql).toBe(
      'ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;' +
        '--> statement-breakpoint\n' +
        'CREATE INDEX "ix_user_roles_role_id" ON "user_roles" USING btree ("role_id");' +
        '--> statement-breakpoint\n' +
        '-- S3: a case-insensitive duplicate refuses to index (this statement fails\n' +
        '-- loudly instead of silently merging). Requires no lower-case duplicates.\n' +
        'CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" USING btree (lower("email"));\n',
    );
    const journal = JSON.parse(
      await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
    );
    expect(journal.entries[6]).toEqual(entry);
    expect(journal.entries).toHaveLength(7);
    expect(entry.when).toBeGreaterThan(journal.entries[5].when);
  });

  it('preserves distinct rows, defaults token_version to 0, adds the indexes and rejects duplicates (S3, S13)', async () => {
    const url = readTestUrl();
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-account-security-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    try {
      const journal = JSON.parse(
        await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
      );
      const legacy = journal.entries.slice(0, 6);
      await mkdir(join(folder, 'meta'));
      await writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({ ...journal, entries: legacy }),
      );
      for (const old of legacy) {
        await copyFile(
          join(migrationsFolder, old.tag + '.sql'),
          join(folder, old.tag + '.sql'),
        );
      }
      run = await startTestRun(url, newRunContext(), folder);
      fixture = await allocateFixture(url, run.context);
      const client = fixture.client;
      // Two distinct emails that differ only by suffix, stored mixed-case.
      await client.query(
        "INSERT INTO users (email, password, name) VALUES ('Ana@Example.com','h','Ana'), ('ana.alternate@Example.COM','h','Ana 2')",
      );
      const before = (await client.query(legacyUsersQuery)).rows;

      await migrate(fixture.db, { migrationsFolder });

      // Existing distinct rows preserved; token_version defaulted.
      expect((await client.query(usersQuery)).rows).toEqual([
        { email: 'Ana@Example.com', token_version: 0 },
        { email: 'ana.alternate@Example.COM', token_version: 0 },
      ]);
      expect((await client.query(indexesQuery)).rows).toEqual([
        { indexname: 'ix_user_roles_role_id' },
        { indexname: 'pk_user_roles' },
        { indexname: 'pk_users' },
        { indexname: 'uq_users_email' },
        { indexname: 'uq_users_email_lower' },
      ]);
      // A case-insensitive duplicate is rejected by the new index.
      await expect(
        client.query(
          "INSERT INTO users (email, password, name) VALUES ('ANA@example.com','h','Ana 3')",
        ),
      ).rejects.toMatchObject({ code: '23505' });
      // The journal records the new entry and re-running is a no-op.
      const migrations = (await client.query(journalQuery)).rows;
      expect(migrations).toHaveLength(7);
      expect(Number(migrations[6].created_at)).toBe(entry.when);
      await migrate(fixture.db, { migrationsFolder });
      expect((await client.query(usersQuery)).rows).toEqual(
        before.map((row) => ({ email: row.email, token_version: 0 })),
      );
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

  it('fails loudly when case-insensitive email duplicates already exist (S3)', async () => {
    const url = readTestUrl();
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-account-security-dup-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    try {
      const journal = JSON.parse(
        await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
      );
      const legacy = journal.entries.slice(0, 6);
      await mkdir(join(folder, 'meta'));
      await writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({ ...journal, entries: legacy }),
      );
      for (const old of legacy) {
        await copyFile(
          join(migrationsFolder, old.tag + '.sql'),
          join(folder, old.tag + '.sql'),
        );
      }
      run = await startTestRun(url, newRunContext(), folder);
      fixture = await allocateFixture(url, run.context);
      const client = fixture.client;
      await client.query(
        "INSERT INTO users (email, password, name) VALUES ('dup@x.com','h','One'), ('DUP@x.com','h','Two')",
      );

      await expect(migrate(fixture.db, { migrationsFolder })).rejects.toThrow(
        /uq_users_email_lower/,
      );
      // Nothing was silently merged: both rows are still there.
      expect(await client.query(legacyUsersQuery)).toMatchObject({
        rows: [{ email: 'DUP@x.com' }, { email: 'dup@x.com' }],
      });
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
});
