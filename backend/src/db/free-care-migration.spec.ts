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
  idx: 5,
  version: '7',
  when: 1792291000002,
  tag: '0005_free_pet_care',
  breakpoints: true,
};
const coinsDefaultQuery =
  "SELECT column_default FROM information_schema.columns WHERE table_name='pet_states' AND column_name='coins'";
const rowsQuery = 'SELECT * FROM pet_states ORDER BY guest_key';
const journalQuery = 'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id';

describe('free care migration', () => {
  it('contains only a local five-second timeout and default alteration', async () => {
    const sql = await readFile(
      join(migrationsFolder, entry.tag + '.sql'),
      'utf8',
    );
    expect(sql.trim()).toBe(
      "SET LOCAL lock_timeout = '5s';\n--> statement-breakpoint\n" +
        'ALTER TABLE "pet_states" ALTER COLUMN "coins" SET DEFAULT 0;',
    );
    const journal = JSON.parse(
      await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
    );
    expect(journal.entries[5]).toEqual(entry);
    expect(journal.entries).toHaveLength(6);
    expect(entry.when).toBeGreaterThan(journal.entries[4].when);
  });

  it('preserves whole 0/5/37 rows, defaults raw inserts to zero and safely reapplies', async () => {
    const url = readTestUrl();
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-free-care-upgrade-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    try {
      const journal = JSON.parse(
        await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
      );
      const legacy = journal.entries.slice(0, 5);
      expect(legacy.map((e: { tag: string }) => e.tag)).toEqual([
        '0000_init',
        '0001_pet_states',
        '0002_pet_name',
        '0003_starting_coins_5',
        '0004_coat_pattern',
      ]);
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
      expect((await client.query(coinsDefaultQuery)).rows).toEqual([
        { column_default: '5' },
      ]);
      for (const coins of [0, 5, 37]) {
        await client.query(
          "INSERT INTO pet_states (guest_key, coins, name, rename_count, hunger, fun, energy, hygiene, status_key, coat_pattern) VALUES ($1,$2,'Legacy',2,10,23,45,67,'broke','tabby')",
          [`legacy-${coins}`, coins],
        );
      }
      const before = (await client.query(rowsQuery)).rows;
      const migrationsBefore = (await client.query(journalQuery)).rows;
      const lockBefore = (await client.query('SHOW lock_timeout')).rows;
      await migrate(fixture.db, { migrationsFolder });
      expect((await client.query(rowsQuery)).rows).toEqual(before);
      expect((await client.query(coinsDefaultQuery)).rows).toEqual([
        { column_default: '0' },
      ]);
      const inserted = (
        await client.query(
          "INSERT INTO pet_states (guest_key) VALUES ('fresh') RETURNING *",
        )
      ).rows[0];
      expect(inserted.coins).toBe(0);
      const after = (await client.query(rowsQuery)).rows;
      const migrationsAfter = (await client.query(journalQuery)).rows;
      expect(migrationsAfter.slice(0, 5)).toEqual(migrationsBefore);
      expect(migrationsAfter).toHaveLength(6);
      expect(Number(migrationsAfter[5].created_at)).toBe(entry.when);
      expect((await client.query('SHOW lock_timeout')).rows).toEqual(
        lockBefore,
      );
      await migrate(fixture.db, { migrationsFolder });
      expect((await client.query(rowsQuery)).rows).toEqual(after);
      expect((await client.query(journalQuery)).rows).toEqual(migrationsAfter);
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
