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
const legacyEntries = [
  {
    idx: 0,
    version: '7',
    when: 1792278107107,
    tag: '0000_init',
    breakpoints: true,
  },
  {
    idx: 1,
    version: '7',
    when: 1792282800000,
    tag: '0001_pet_states',
    breakpoints: true,
  },
  {
    idx: 2,
    version: '7',
    when: 1792290000000,
    tag: '0002_pet_name',
    breakpoints: true,
  },
  {
    idx: 3,
    version: '7',
    when: 1792291000000,
    tag: '0003_starting_coins_5',
    breakpoints: true,
  },
];
const newEntry = {
  idx: 4,
  version: '7',
  when: 1792291000001,
  tag: '0004_coat_pattern',
  breakpoints: true,
};

describe('coat pattern migration', () => {
  it('appends a strictly later journal entry without changing the legacy prefix', async () => {
    const journal = JSON.parse(
      await readFile(join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
    );
    expect(journal.entries.slice(0, 4)).toEqual(legacyEntries);
    expect(journal.entries[4]).toEqual(newEntry);
    expect(journal.entries[4].when).toBeGreaterThan(journal.entries[3].when);
  });

  it('starts 0004 with the exact local five-second timeout and statement breakpoint', async () => {
    const sql = await readFile(
      join(migrationsFolder, '0004_coat_pattern.sql'),
      'utf8',
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    expect(sql.trim()).toBe(
      "SET LOCAL lock_timeout = '5s';\n--> statement-breakpoint\n" +
        'ALTER TABLE "pet_states" ADD COLUMN "coat_pattern" varchar(16) NOT NULL DEFAULT \'solid\';',
    );
  });

  it('upgrades real 0000–0003 rows without changing existing values and defaults new rows to solid', async () => {
    const url = readTestUrl();
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-coat-upgrade-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    try {
      await mkdir(join(folder, 'meta'));
      await writeFile(
        join(folder, 'meta/_journal.json'),
        JSON.stringify({
          version: '7',
          dialect: 'postgresql',
          entries: legacyEntries,
        }),
      );
      for (const entry of legacyEntries) {
        await copyFile(
          join(migrationsFolder, entry.tag + '.sql'),
          join(folder, entry.tag + '.sql'),
        );
      }
      run = await startTestRun(url, newRunContext(), folder);
      const tracePath = process.env.PET_COAT_UPGRADE_TRACE;
      if (tracePath)
        await writeFile(
          tracePath,
          JSON.stringify({ namespace: run.context.prefix }),
        );
      fixture = await allocateFixture(url, run.context);
      const client = fixture.client;
      const oldLast = await client.query(
        'SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1',
      );
      expect(Number(oldLast.rows[0].created_at)).toBe(1792291000000);
      const absent = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name='pet_states' AND column_name='coat_pattern'",
      );
      expect(absent.rows).toEqual([]);
      const inserted = await client.query(
        "INSERT INTO pet_states (guest_key, coins, name, rename_count, coat_primary, coat_secondary, coat_accent, status_key) VALUES ($1, 37, 'Legacy', 2, '#112233', '#445566', '#778899', 'coated') RETURNING *",
        ['55555555-5555-4555-8555-555555555555'],
      );
      const before = inserted.rows[0];
      const lockBefore = (await client.query('SHOW lock_timeout')).rows[0];
      await migrate(fixture.db, { migrationsFolder });
      const column = await client.query(
        "SELECT data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name='pet_states' AND column_name='coat_pattern'",
      );
      expect(column.rows).toEqual([
        {
          data_type: 'character varying',
          character_maximum_length: 16,
          is_nullable: 'NO',
          column_default: "'solid'::character varying",
        },
      ]);
      const after = (
        await client.query('SELECT * FROM pet_states WHERE guest_key=$1', [
          before.guest_key,
        ])
      ).rows[0];
      expect(after).toEqual({ ...before, coat_pattern: 'solid' });
      const fresh = (
        await client.query(
          'INSERT INTO pet_states (guest_key) VALUES ($1) RETURNING *',
          ['66666666-6666-4666-8666-666666666666'],
        )
      ).rows[0];
      expect(fresh.coat_pattern).toBe('solid');
      expect(fresh.coins).toBe(5);
      const last = (
        await client.query(
          'SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1',
        )
      ).rows[0];
      expect(Number(last.created_at)).toBe(newEntry.when);
      expect((await client.query('SHOW lock_timeout')).rows[0]).toEqual(
        lockBefore,
      );
      const proof = {
        postgres: (await client.query('SHOW server_version')).rows[0],
        oldMigration: Number(oldLast.rows[0].created_at),
        newMigration: Number(last.created_at),
        column: column.rows[0],
        before,
        after,
        freshPattern: fresh.coat_pattern,
        freshCoins: fresh.coins,
        lockTimeoutAfter: lockBefore,
        namespace: run.context.prefix,
      };
      if (tracePath)
        await writeFile(tracePath, JSON.stringify(proof, null, 2) + '\n');
      console.info('[coat-upgrade] ' + JSON.stringify(proof));
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
