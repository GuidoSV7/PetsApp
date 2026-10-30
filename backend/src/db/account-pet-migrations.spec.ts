import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import { allocateFixture, newRunContext, readTestUrl, startTestRun } from '../testing/postgres-lifecycle.js';

const source = join(import.meta.dirname, '../../drizzle');

describe('account pet migration prefixes', () => {
  it('appends ownership and ledger with local bounded locking and no data rewrites', async () => {
    const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8'));
    expect(journal.entries.slice(7).map((e: { tag: string }) => e.tag)).toEqual([
      '0007_user_pet_ownership', '0008_user_coin_ledger',
    ]);
    for (const entry of journal.entries.slice(7)) {
      const sql = await readFile(join(source, `${entry.tag}.sql`), 'utf8');
      expect(sql).toContain("SET LOCAL lock_timeout = '5s'");
      expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|TRIGGER)\b/i);
    }
  });

  it('preserves every complete legacy row at 0007, 0008, reapplication and full journal', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-ownership-upgrade-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    try {
      const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8'));
      await mkdir(join(folder, 'meta'));
      for (const entry of journal.entries) {
        await copyFile(join(source, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
      }
      const prefix = (n: number) => writeFile(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries: journal.entries.slice(0, n) }));
      await prefix(7);
      run = await startTestRun(readTestUrl(), newRunContext(), folder);
      fixture = await allocateFixture(readTestUrl(), run.context);
      const client = fixture.client;
      for (const coins of [0, 5, 37]) {
        await client.query(`INSERT INTO pet_states (guest_key,coins,name,rename_count,hunger,fun,energy,hygiene,status_key,coat_primary,coat_secondary,coat_accent,coat_pattern,created_at,updated_at)
          VALUES ($1,$2,'Legacy',2,10,23,45,67,'broke','#123456','#234567','#345678','tabby','2025-01-02T03:04:05Z','2025-06-07T08:09:10Z')`, [`legacy-${coins}`, coins]);
        const user = (await client.query(`INSERT INTO users (email,password,name,is_blocked,is_active,profile_image,country,is_verified,last_login,created_at,updated_at)
          VALUES ($1,$2,'Legacy',$3,$4,'image.png','CO',true,'2025-02-03T04:05:06Z','2025-01-02T03:04:05Z','2025-06-07T08:09:10Z') RETURNING id`, [`legacy-${coins}@example.com`, `unchanged-hash-${coins}`, coins === 5, coins !== 37])).rows[0];
        await client.query('INSERT INTO user_roles (user_id,role_id) SELECT $1,id FROM roles WHERE code=$2', [user.id, coins === 0 ? 'member' : coins === 5 ? 'admin' : 'super_admin']);
      }
      const snapshot = async () => ({
        users: (await client.query('SELECT * FROM users ORDER BY id')).rows,
        pets: (await client.query('SELECT * FROM pet_states ORDER BY id')).rows,
        roles: (await client.query('SELECT * FROM roles ORDER BY id')).rows,
        joins: (await client.query('SELECT * FROM user_roles ORDER BY user_id,role_id')).rows,
      });
      const before = await snapshot();
      expect(before.users).toHaveLength(3);
      expect(before.pets).toHaveLength(3);
      expect(before.joins).toHaveLength(3);
      const lock = (await client.query('SHOW lock_timeout')).rows;
      let history = (await client.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;
      for (const count of [8, 9, 9]) {
        await prefix(count);
        await migrate(fixture.db, { migrationsFolder: folder });
        expect(await snapshot()).toEqual(before);
        const applied = (await client.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;
        expect(applied).toHaveLength(count);
        expect(applied.slice(0, history.length)).toEqual(history);
        expect(Number(applied[count - 1].created_at)).toBe(journal.entries[count - 1].when);
        history = applied;
        expect((await client.query('SHOW lock_timeout')).rows).toEqual(lock);
      }
      await migrate(fixture.db, { migrationsFolder: source });
      expect(await snapshot()).toEqual(before);
      for (const table of ['user_pet_ownership', 'pet_claim_operations', 'user_coin_balances', 'user_coin_entries']) {
        expect((await client.query(`SELECT * FROM ${table}`)).rows).toEqual([]);
      }
      const [u1, u2] = before.users;
      const [p1, p2] = before.pets;
      await client.query("INSERT INTO user_pet_ownership (user_id,pet_id,status) VALUES ($1,$2,'current')", [u1.id, p1.id]);
      await expect(client.query("INSERT INTO user_pet_ownership (user_id,pet_id,status) VALUES ($1,$2,'current')", [u1.id, p2.id])).rejects.toMatchObject({ code: '23505' });
      await expect(client.query("INSERT INTO user_pet_ownership (user_id,pet_id,status) VALUES ($1,$2,'archived')", [u2.id, p1.id])).rejects.toMatchObject({ code: '23505' });
      await expect(client.query("INSERT INTO user_pet_ownership (user_id,pet_id,status) VALUES ($1,$2,'invalid')", [u2.id, p2.id])).rejects.toMatchObject({ code: '23514' });
      await expect(client.query("INSERT INTO user_pet_ownership (user_id,pet_id,status) VALUES ('99999999-9999-4999-8999-999999999999',$1,'current')", [p2.id])).rejects.toMatchObject({ code: '23503' });
      await client.query('INSERT INTO user_coin_balances (user_id,balance) VALUES ($1,37)', [u1.id]);
      await expect(client.query('INSERT INTO user_coin_balances (user_id,balance) VALUES ($1,-1)', [u2.id])).rejects.toMatchObject({ code: '23514' });
      await expect(client.query("INSERT INTO user_coin_balances (user_id,balance) VALUES ($1,'1.5')", [u2.id])).rejects.toMatchObject({ code: '22P02' });
      const op = (await client.query("INSERT INTO pet_claim_operations (user_id,guest_pet_id) VALUES ($1,$2) RETURNING id", [u1.id, p1.id])).rows[0];
      await client.query('INSERT INTO user_coin_entries (user_id,pet_id,operation_id,amount) VALUES ($1,$2,$3,0)', [u1.id, p1.id, op.id]);
      await expect(client.query('INSERT INTO user_coin_entries (user_id,pet_id,operation_id,amount) VALUES ($1,$2,$3,0)', [u1.id, p1.id, op.id])).rejects.toMatchObject({ code: '23505' });
      await expect(client.query('INSERT INTO user_coin_entries (user_id,pet_id,operation_id,amount) VALUES ($1,$2,$3,-1)', [u1.id, p2.id, op.id])).rejects.toMatchObject({ code: '23514' });
      await expect(client.query('INSERT INTO user_coin_entries (user_id,pet_id,operation_id,amount) VALUES ($1,$2,$3,5)', [u1.id, p2.id, op.id])).rejects.toMatchObject({ code: '23503' });
      await client.query("INSERT INTO user_pet_ownership (user_id,pet_id,status) VALUES ($1,$2,'archived')", [u1.id, p2.id]);
      const otherOp = (await client.query("INSERT INTO pet_claim_operations (user_id,guest_pet_id) VALUES ($1,$2) RETURNING id", [u2.id, p2.id])).rows[0];
      await expect(client.query('INSERT INTO user_coin_entries (user_id,pet_id,operation_id,amount) VALUES ($1,$2,$3,5)', [u1.id, p2.id, otherOp.id])).rejects.toMatchObject({ code: '23503' });
      expect(await snapshot()).toEqual(before);
    } finally {
      try { await fixture?.close(); } finally {
        try { await run?.close(); } finally { await rm(folder, { recursive: true, force: true }); }
      }
    }
  });

  it.each([7, 8])('rolls back migration %s and its journal when the reference lock times out', async (appliedCount) => {
    const folder = await mkdtemp(join(tmpdir(), 'petsapp-ownership-lock-'));
    let run: Awaited<ReturnType<typeof startTestRun>> | undefined;
    let fixture: Awaited<ReturnType<typeof allocateFixture>> | undefined;
    let connection: import('pg').PoolClient | undefined;
    try {
      const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8'));
      await mkdir(join(folder, 'meta'));
      for (const entry of journal.entries) {
        await copyFile(join(source, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
      }
      const prefix = (count: number) => writeFile(join(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries: journal.entries.slice(0, count) }));
      await prefix(appliedCount);
      run = await startTestRun(readTestUrl(), newRunContext(), folder);
      fixture = await allocateFixture(readTestUrl(), run.context);
      const before = (await fixture.client.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;
      await prefix(appliedCount + 1);
      connection = await fixture.client.connect();
      await connection.query('BEGIN');
      await connection.query('LOCK TABLE users IN ACCESS EXCLUSIVE MODE');
      const started = Date.now();
      await expect(migrate(fixture.db, { migrationsFolder: folder })).rejects.toMatchObject({ cause: { code: '55P03' } });
      expect(Date.now() - started).toBeLessThan(12_000);
      await connection.query('ROLLBACK');
      expect((await fixture.client.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows).toEqual(before);
      const table = appliedCount === 7 ? 'pet_claim_operations' : 'user_coin_balances';
      expect((await fixture.client.query('SELECT to_regclass($1) AS name', [table])).rows).toEqual([{ name: null }]);
      expect((await fixture.client.query('SHOW lock_timeout')).rows).toEqual([{ lock_timeout: '0' }]);
    } finally {
      try {
        if (connection) {
          try { await connection.query('ROLLBACK'); } finally { connection.release(); }
        }
      } finally {
        try { await fixture?.close(); } finally {
          try { await run?.close(); } finally { await rm(folder, { recursive: true, force: true }); }
        }
      }
    }
  }, 15_000);
});
