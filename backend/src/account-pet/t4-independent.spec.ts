import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import { schema } from '../db/schema.js';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { databaseUrl, readTestUrl } from '../testing/postgres-lifecycle.js';
import { DrizzlePetRepository } from '../pet/infrastructure/drizzle-pet.repository.js';
import { initialSnapshot } from '../pet/pet-rules.js';
import { accountPetApp, accountPetSnapshot, ORIGIN } from './testing/account-pet-http-test-kit.js';

// S1/S3/S10: independent HTTP proofs of the frozen T3 integration, not repository mocks.
describe('T4 independent public HTTP persistence and security probes', () => {
 let db: TestDb, a: Awaited<ReturnType<typeof accountPetApp>>, b: typeof a, pool: pg.Pool;
 let owner: Awaited<ReturnType<typeof a.owner>>;
 beforeAll(async () => {
  db = await createTestDb();
  const name = (await db.client.query('select current_database() as name')).rows[0].name;
  pool = new pg.Pool({ connectionString: databaseUrl(readTestUrl(), name), max: 2, statement_timeout: 5000 });
  a = await accountPetApp(db);
  b = await accountPetApp({ ...db, db: drizzle(pool, {schema}), client: pool });
 });
 afterAll(async () => { try { await a?.app.close(); await b?.app.close(); await pool?.end(); } finally { await db?.close(); } });
 beforeEach(async () => { await db.client.query('TRUNCATE users,pet_states CASCADE'); owner = await a.owner(); });
 const err = (statusCode: number, error: string, message: string) => ({statusCode,error,message});
 function post(kit: typeof a, path: string, body: object) { return request(kit.app.getHttpServer()).post(path).set('Cookie',owner.cookie).set('Origin',ORIGIN).send(body); }
 const claim = (kit: typeof a, body: object) => post(kit,'/account/pet/claim-guest',body);
 async function digest() { return createHash('sha256').update(JSON.stringify(await accountPetSnapshot(db))).digest('hex'); }
 async function setup(conflict: boolean) {
  const pets = new DrizzlePetRepository(db.db);
  if (conflict) {
   const old = await pets.create(randomUUID(), {...initialSnapshot(), coins:37});
   expect((await claim(a,{guestKey:old.guestKey})).status).toBe(200);
  }
  const guest = await pets.create(randomUUID(), {...initialSnapshot(), coins:5, name:'ProbeGuest'});
  const pending = conflict ? await claim(a,{guestKey:guest.guestKey}) : undefined;
  if (pending) expect(pending.status).toBe(409);
  return {guest, body: pending ? {operationId:pending.body.operationId,choice:'keep_guest'} : {guestKey:guest.guestKey}};
 }
 it.each([false,true])('late SQL failure rolls back complete HTTP %s claim, including credited balance',async conflict => {
  const {body} = await setup(conflict);
  await db.client.query(`CREATE FUNCTION verifier_fail_confirm() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='confirmed' THEN RAISE EXCEPTION 'synthetic late confirm failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER verifier_late_failure BEFORE UPDATE ON pet_claim_operations FOR EACH ROW EXECUTE FUNCTION verifier_fail_confirm()`);
  const before = await digest();
  try {
   const response = await claim(b,body);
   expect({status:response.status,body:response.body}).toEqual({status:500,body:{statusCode:500,message:'Internal server error'}});
   expect(response.headers['set-cookie']).toBeUndefined();
   expect(await digest()).toBe(before);
  } finally { await db.client.query('DROP TRIGGER verifier_late_failure ON pet_claim_operations; DROP FUNCTION verifier_fail_confirm()'); }
  expect((await claim(a,body)).body).toEqual({status:'confirmed',operationId:expect.any(String),petId:expect.any(String),coins:conflict?42:5});
 });
 it.each([false,true])('HTTP %s adoption serializes a different-app guest write behind its real transaction',async conflict => {
  const {guest,body} = await setup(conflict);
  if (!conflict) await db.client.query('INSERT INTO user_coin_balances(user_id,balance) VALUES ($1,0)',[owner.user.id]);
  const before = await accountPetSnapshot(db);
  const c = await pool.connect(); let adopt: Promise<request.Response>|undefined, write: Promise<request.Response>|undefined;
  async function blocked(fragment: string) {
   for (let n=0;n<150;n++) {
    await c.query('SELECT pg_stat_clear_snapshot()');
    const rows = await c.query("SELECT query FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE $1",[`%${fragment}%`]);
    if (rows.rowCount) return;
    await delay(10);
   }
   throw Error(`No independent blocked query: ${fragment}`);
  }
  try {
   await c.query('BEGIN');
   await c.query('SELECT * FROM user_coin_balances WHERE user_id=$1 FOR UPDATE',[owner.user.id]);
   adopt = claim(a,body).then(x=>x);
   await blocked('update "user_coin_balances"');
   write = request(b.app.getHttpServer()).post('/pet/name').set('X-Pet-Guest-Key',guest.guestKey).send({name:'RaceName'}).then(x=>x);
   await blocked('from "pet_states"');
   await c.query('COMMIT');
   const confirmed = await adopt;
   expect(confirmed.status).toBe(200);
   const denied = await write;
   expect({status:denied.status,body:denied.body}).toEqual({status:403,body:err(403,'Forbidden','GUEST_PET_UNAVAILABLE')});
   expect(denied.headers['set-cookie']).toBeUndefined();
   const after = await accountPetSnapshot(db);
   expect(after.pet_states).toEqual(before.pet_states);
   expect(after.user_coin_balances).toEqual([expect.objectContaining({balance:conflict?42:5})]);
   expect(after.user_coin_entries).toHaveLength(conflict?2:1);
   expect(after.user_pet_ownership.filter(x=>x.status==='current')).toHaveLength(1);
   const stored = await digest();
   if (conflict) expect((await claim(b,body)).body).toEqual(confirmed.body);
   expect(await digest()).toBe(stored);
  } finally { await c.query('ROLLBACK'); c.release(); await adopt?.catch(()=>undefined); await write?.catch(()=>undefined); }
 });
 it('confirmed lost-response status remains the stored result after another adoption and a rename',async () => {
  const {body} = await setup(true);
  const confirmed = await claim(a,body);
  const another = await new DrizzlePetRepository(db.db).create(randomUUID(), {...initialSnapshot(),coins:5});
  const next = await claim(a,{guestKey:another.guestKey});
  expect(next.status).toBe(409);
  const later = {body:{operationId:next.body.operationId,choice:'keep_account'}};
  expect((await claim(b,later.body)).status).toBe(200);
  expect((await post(b,'/account/pet/name',{name:'LaterName'})).status).toBe(201);
  const before = await digest();
  expect((await claim(b,body)).body).toEqual(confirmed.body);
  const status = await request(a.app.getHttpServer()).get(`/account/pet/claims/${confirmed.body.operationId}`).set('Cookie',owner.cookie);
  expect({status:status.status,body:status.body}).toEqual({status:200,body:confirmed.body});
  expect(await digest()).toBe(before);
 });
 it('literal flag and nullable choice are enforced over actual HTTP with no Stellar settings',async () => {
  const before = await digest();
  for (const value of [undefined,'TRUE','1','false',' true ']) {
   a.values.ACCOUNT_PET_ENABLED=value;
   const result = await claim(a,{});
   expect({status:result.status,body:result.body}).toEqual({status:503,body:err(503,'Service Unavailable','ACCOUNT_PET_DISABLED')});
   expect(await digest()).toBe(before);
  }
  a.values.ACCOUNT_PET_ENABLED='true';
  const invalid = await claim(a,{choice:null,operationId:randomUUID()});
  expect({status:invalid.status,body:invalid.body}).toEqual({status:400,body:{statusCode:400,error:'Bad Request',message:['choice must be one of the following values: keep_account, keep_guest']}});
  expect(await digest()).toBe(before);
  expect((await claim(a,{})).body).toEqual({status:'confirmed',petId:expect.any(String),coins:0});
 });
 // S1/S3: client authority never changes the authenticated owner; independent negative HTTP boundaries.
 it('rejects internal-secret-only and foreign-operation authority with exact bodies and storage hashes',async () => {
  const other = await a.owner('Foreign');
  const {body} = await setup(true);
  const before = await digest();
  const secret = await request(b.app.getHttpServer()).post('/account/pet/claim-guest').set('X-Client-Secret','synthetic-account-pet-internal-secret').send({});
  expect({status:secret.status,body:secret.body}).toEqual({status:401,body:{statusCode:401,message:'Unauthorized'}});
  expect(await digest()).toBe(before);
  const foreign = await request(b.app.getHttpServer()).post('/account/pet/claim-guest').set('Cookie',other.cookie).set('Origin',ORIGIN).send(body);
  expect({status:foreign.status,body:foreign.body}).toEqual({status:403,body:err(403,'Forbidden','PET_OPERATION_UNAVAILABLE')});
  expect(await digest()).toBe(before);
  for (const field of ['owner','petId','balance','snapshot']) {
   const response = await claim(b,{[field]:owner.user.id});
   expect({status:response.status,body:response.body}).toEqual({status:400,body:{statusCode:400,error:'Bad Request',message:[`property ${field} should not exist`]}});
   expect(response.headers['set-cookie']).toBeUndefined();
   expect(await digest()).toBe(before);
  }
 });

});
