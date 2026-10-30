import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Keypair, Networks, Transaction, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createTestDb, type TestDb } from '../testing/postgres.js';
import { DrizzleUserRepository } from '../users/infrastructure/drizzle-user.repository.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { stellarHttpTestApp, stellarSigned, stellarCookie, stellarCookies, stellarSnapshot, STELLAR_TEST_SERVER, STELLAR_TEST_ORIGIN as ORIGIN, STELLAR_TEST_PASSWORD as PASSWORD } from './testing/stellar-http-test-kit.js';

// Independently derived from plan sections 5,6,11 and S2/S3/S14. No live keys/network.
let f: TestDb;
let a: NestExpressApplication, b: NestExpressApplication, jwt: JwtService;
let users: DrizzleUserRepository;
beforeAll(async () => { f = await createTestDb(); users = new DrizzleUserRepository(f.db); });
afterAll(async () => { await f.close(); });
beforeEach(async () => {
  await f.client.query('TRUNCATE users,stellar_auth_challenges,stellar_auth_attempts,pet_states CASCADE');
  ({app:a,jwt} = await stellarHttpTestApp(f)); ({app:b} = await stellarHttpTestApp(f));
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, {status:404})));
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await a.close(); await b.close(); });
const post = (app: NestExpressApplication, path: string, body: object, cookies: string[] = [], token?: string) => {
  const r = request(app.getHttpServer()).post(path).set('Origin', ORIGIN).send(body);
  if (cookies.length) r.set('Cookie', cookies); if(token) r.set('Authorization', `Bearer ${token}`); return r;
};
const issue = async (key: Keypair, app = a, purpose = 'login', token?: string, cookies: string[] = []) => {
  const path = purpose === 'login' ? '/auth/stellar' : '/account/stellar';
  const r = await post(app, path+'/challenge', {address:key.publicKey(), ...(purpose==='link'?{password:PASSWORD}:{})}, cookies, token).expect(200);
  return {r, path, flow:stellarCookie(r, `petsapp_stellar_${purpose}`), input:{challengeId:r.body.challengeId as string, signerAddress:key.publicKey(), signedTxXdr:stellarSigned(r.body.transaction as string,[key])}};
};
const digest = async () => createHash('sha256').update(JSON.stringify(await stellarSnapshot(f))).digest('hex');
const reject = async (run: () => PromiseLike<request.Response>, status:number, message:string, expected?: string) => {
  const before=await digest(); const r=await run(); expect(r.status).toBe(status);
  expect(r.body).toEqual({message, statusCode:status, ...(status===429?{}:{error:({400:'Bad Request',401:'Unauthorized',403:'Forbidden',409:'Conflict',503:'Service Unavailable'} as Record<number,string>)[status]})});
  expect(stellarCookies(r)).toEqual([]); expect(r.body.token).toBeUndefined(); expect(await digest()).toBe(expected??before);
  return r;
};
const member = async () => {
  const user=await users.create({email:'probe@example.com',password:await bcrypt.hash(PASSWORD,4),name:'Probe'});
  return {user, token:jwt.sign({sub:user.id,email:user.email})};
};

it('S2/S3: deferred OUTER-COMMIT failure rolls back every row and never signs a token; retry succeeds',async()=>{
  const key=Keypair.random(), c=await issue(key); const before=await digest();
  await f.client.query(`CREATE FUNCTION probe_commit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'probe deferred commit failure'; RETURN NEW; END $$;
    CREATE CONSTRAINT TRIGGER probe_commit_failure AFTER INSERT ON user_coin_balances DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION probe_commit_failure()`);
  const sign=vi.spyOn(jwt,'sign');
  try {
    const r=await post(a,c.path+'/verify',c.input,[c.flow]); expect(r.status).toBe(500);
    expect(r.body).toEqual({statusCode:500,message:'Internal server error'}); expect(stellarCookies(r)).toEqual([]);
    expect(sign).not.toHaveBeenCalled(); expect(await digest()).toBe(before);
  } finally { await f.client.query('DROP TRIGGER probe_commit_failure ON user_coin_balances; DROP FUNCTION probe_commit_failure()'); }
  const r=await post(b,c.path+'/verify',c.input,[c.flow]).expect(200);
  await request(a.getHttpServer()).get('/auth/profile').set('Cookie',stellarCookie(r,'petsapp_session')).expect(200,r.body.user);
});

it('S3: simultaneous cross-instance confirmations yield one usable cookie and immutable replay',async()=>{
  const c=await issue(Keypair.random());
  const rs=await Promise.all([post(a,c.path+'/verify',c.input,[c.flow]),post(b,c.path+'/verify',c.input,[c.flow])]);
  expect(rs.map(r=>r.status).sort()).toEqual([200,409]);
  const ok=rs.find(r=>r.status===200)!; const bad=rs.find(r=>r.status===409)!;
  expect(stellarCookies(bad)).toEqual([]); expect(ok.body.token).toBeUndefined();
  await request(b.getHttpServer()).get('/users/me').set('Cookie',stellarCookie(ok,'petsapp_session')).expect(200);
  await reject(()=>post(a,c.path+'/verify',c.input,[c.flow]),409,'Stellar challenge consumed');
  const state=await stellarSnapshot(f); for(const table of ['users','user_stellar_identities','user_roles','user_coin_balances']) expect(state[table]).toHaveLength(1);
});

it('S3: HTTP full-body/signature/network failures spend only legitimate attempts; infra and malformed do not',async()=>{
  const key=Keypair.random(), c=await issue(key);
  await reject(()=>post(b,c.path+'/verify',c.input,['petsapp_stellar_login='+ 'z'.repeat(43)]),401,'Invalid Stellar flow');
  await reject(()=>post(a,c.path+'/verify',{...c.input,signedTxXdr:'YQ=='},[c.flow]),400,'Unsupported Stellar XDR');
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({}, {status:503})));
  await reject(()=>post(a,c.path+'/verify',c.input,[c.flow]),503,'Stellar verification temporarily unavailable');
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({}, {status:404})));
  const envelope=(TransactionBuilder.fromXDR(c.r.body.transaction as string,Networks.TESTNET) as Transaction).toEnvelope().toXdrObject();
  if(envelope.type!==2) throw Error('v1 expected'); envelope.v1.tx.fee+=1; envelope.v1.signatures=[];
  const altered=new Transaction(xdr.TransactionEnvelope.fromXdrObject(envelope),Networks.TESTNET); altered.sign(STELLAR_TEST_SERVER,key);
  const wrongNetwork=TransactionBuilder.fromXDR(c.r.body.transaction as string,Networks.PUBLIC); wrongNetwork.sign(key);
  for(const proof of [altered.toXDR(),wrongNetwork.toXDR(),c.r.body.transaction as string]) {
    const expected=await stellarSnapshot(f); expected.stellar_auth_challenges[0].failed_attempts=Number(expected.stellar_auth_challenges[0].failed_attempts)+1;
    await reject(()=>post(a,c.path+'/verify',{...c.input,signedTxXdr:proof},[c.flow]),401,'Invalid Stellar proof',createHash('sha256').update(JSON.stringify(expected)).digest('hex'));
  }
  await reject(()=>post(a,c.path+'/verify',c.input,[c.flow]),401,'Invalid or expired Stellar challenge');
});

it('S3: server signer weight cannot rescue a zero-weight master or insufficient client contribution',async()=>{
  const key=Keypair.random(), co=Keypair.random(), c=await issue(key);
  const authority=(weight:number)=>vi.stubGlobal('fetch',vi.fn(async()=>Response.json({thresholds:{high_threshold:3},signers:[{key:key.publicKey(),weight,type:'ed25519_public_key'},{key:co.publicKey(),weight:2,type:'ed25519_public_key'},{key:STELLAR_TEST_SERVER.publicKey(),weight:255,type:'ed25519_public_key'}]})));
  authority(0); const fail=await post(a,c.path+'/verify',c.input,[c.flow]); expect(fail.status).toBe(401); expect(stellarCookies(fail)).toEqual([]);
  authority(1); const fail2=await post(b,c.path+'/verify',c.input,[c.flow]); expect(fail2.status).toBe(401);
  const ok=await post(b,c.path+'/verify',{...c.input,signedTxXdr:stellarSigned(c.r.body.transaction as string,[key,co])},[c.flow]).expect(200);
  expect(ok.body.user.email).toBeNull(); expect((await stellarSnapshot(f)).stellar_auth_challenges[0].failed_attempts).toBe(2);
});

it('S3/S14: concurrent mixed-purpose address issuance and cross-instance IP issuance share atomic quotas',async()=>{
  const e=await member(), key=Keypair.random();
  const rs=await Promise.all(Array.from({length:6},(_,i)=>post(i%2?a:b,i%2?'/account/stellar/challenge':'/auth/stellar/challenge',{address:key.publicKey(),...(i%2?{password:PASSWORD}:{})},[],i%2?e.token:undefined)));
  expect(rs.map(r=>r.status).sort()).toEqual([200,200,200,200,200,429]);
  const err=rs.find(r=>r.status===429)!; expect(err.body).toEqual({statusCode:429,message:'Stellar challenge limit reached'}); expect(stellarCookies(err)).toEqual([]); expect(Number(err.headers['retry-after'])).toBeGreaterThan(0);
  await reject(()=>post(b,'/auth/stellar/challenge',{address:key.publicKey()}),429,'Stellar challenge limit reached');
  for(let i=0;i<25;i++) await issue(Keypair.random(),i%2?a:b);
  const r=await reject(()=>post(a,'/auth/stellar/challenge',{address:Keypair.random().publicKey()}),429,'Stellar challenge limit reached');
  expect(Number(r.headers['retry-after'])).toBeLessThanOrEqual(300);
  const state=await stellarSnapshot(f); expect(state.stellar_auth_challenges).toHaveLength(30);
  expect(state.stellar_auth_attempts.every(r=>/^(address|ip):[a-f0-9]{64}$/.test(String(r.key)))).toBe(true);
});

it('S14: fresh link proof checks current roles and exact signed-session recency without consuming it',async()=>{
  const e=await member(), c=await issue(Keypair.random(),a,'link',e.token);
  await users.update(e.user.id,{role:UserRole.ADMIN});
  await reject(()=>post(b,c.path+'/verify',c.input,[c.flow],e.token),403,'Stellar authentication does not permit administrative access');
  await users.update(e.user.id,{role:UserRole.MEMBER});
  const issuedAt=jwt.verify(e.token).iat as number;
  const clock=vi.spyOn(Date,'now').mockReturnValue(issuedAt*1000+300000);
  await reject(()=>post(b,c.path+'/verify',c.input,[c.flow],e.token),401,'Recent authentication required'); clock.mockRestore();
  await post(b,c.path+'/verify',c.input,[c.flow],e.token).expect(200);
});

it('S3/S10: bounded transient cleanup preserves a populated user, identity, pet, ownership, balance and ledger byte-for-byte',async()=>{
  const c=await issue(Keypair.random()); const r=await post(a,c.path+'/verify',c.input,[c.flow]).expect(200); const id=r.body.user.id as string;
  const pet=(await f.client.query("INSERT INTO pet_states(guest_key,coins) VALUES ('probe-preserved',37) RETURNING id")).rows[0].id;
  await f.client.query("INSERT INTO user_pet_ownership(pet_id,user_id,status) VALUES ($1,$2,'current')",[pet,id]);
  const op=(await f.client.query("INSERT INTO pet_claim_operations(user_id,guest_pet_id,status) VALUES ($1,$2,'confirmed') RETURNING id",[id,pet])).rows[0].id;
  await f.client.query('INSERT INTO user_coin_entries(user_id,pet_id,operation_id,amount) VALUES ($1,$2,$3,37)',[id,pet,op]);
  await f.client.query('UPDATE user_coin_balances SET balance=37 WHERE user_id=$1',[id]);
  const durable=async()=>{
    const s=await stellarSnapshot(f); delete s.stellar_auth_challenges; delete s.stellar_auth_attempts;
    for(const t of ['user_pet_ownership','pet_claim_operations']) s[t]=(await f.client.query(`SELECT * FROM ${t} ORDER BY 1`)).rows;
    return createHash('sha256').update(JSON.stringify(s)).digest('hex');
  };
  const before=await durable();
  await f.client.query("INSERT INTO stellar_auth_attempts(key,window_started_at,expires_at,count) SELECT 'old:'||i,now()-interval '1 hour',now()-interval '1 hour',1 FROM generate_series(1,101) i");
  await f.client.query("INSERT INTO stellar_auth_challenges(purpose,network,address,transaction_hash,flow_hash,expires_at) SELECT 'login','testnet','old','old','old',now()-interval '1 hour' FROM generate_series(1,101)");
  await issue(Keypair.random(),b);
  expect((await f.client.query("SELECT count(*)::int n FROM stellar_auth_attempts WHERE key LIKE 'old:%'")).rows[0].n).toBe(1);
  expect((await f.client.query("SELECT count(*)::int n FROM stellar_auth_challenges WHERE address='old'")).rows[0].n).toBe(1);
  expect(await durable()).toBe(before);
});
