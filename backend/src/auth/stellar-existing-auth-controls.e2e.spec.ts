import { afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../testing/postgres.js';
import { DrizzleUserRepository } from '../users/infrastructure/drizzle-user.repository.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { stellarHttpTestApp, stellarCookie, stellarCookies, STELLAR_TEST_ORIGIN as ORIGIN } from './testing/stellar-http-test-kit.js';

/** Copied unchanged into a baseline scratch by the worker, never reads git history. */
describe('existing authentication compatibility through registered AuthModule', () => {
  afterAll(() => vi.restoreAllMocks());
  it('preserves email/Google, profile, Bearer precedence, password check, logout, origin and admin authorization', async () => {
    const f = await createTestDb();
    const { app, jwt } = await stellarHttpTestApp(f, { STELLAR_AUTH_ENABLED: 'false' });
    const transcript: Record<string, unknown> = {};
    const labels = new Map<string, string>();
    const publicUser = (u: Record<string, unknown>) => ({ ...u, id: labels.get(String(u.id)) ?? 'unknown' });
    const cookiePolicy = (res: request.Response) => stellarCookies(res).map(cookie => ({
      name: cookie.split('=')[0], httpOnly: /; HttpOnly(?:;|$)/i.test(cookie), sameSiteLax: /; SameSite=Lax/i.test(cookie),
      secure: /; Secure(?:;|$)/i.test(cookie), hostOnly: !/; Domain=/i.test(cookie), pathRoot: /; Path=\/(?:;|$)/i.test(cookie),
      cleared: /; Expires=Thu, 01 Jan 1970/i.test(cookie), hasMaxAge: /; Max-Age=\d+/i.test(cookie),
    }));
    const post = (path: string, body: object) => request(app.getHttpServer()).post(path).set('Origin', ORIGIN).send(body);
    try {
      const created = await post('/auth/register', { email: 'member@example.com', password: 'password-at-least-eight', name: 'Member' }).expect(201);
      labels.set(String(created.body.user.id), 'member');
      expect(publicUser(created.body.user)).toEqual({ id: 'member', name: 'Member', email: 'member@example.com', role: 'member', roles: ['member'], country: null });
      expect(jwt.verify(created.body.token)).toMatchObject({ sub: created.body.user.id, email: 'member@example.com' });
      transcript.register = { status: created.status, user: publicUser(created.body.user), cookie: cookiePolicy(created), bodyKeys: Object.keys(created.body).sort() };
      const login = await post('/auth/login', { email: 'MEMBER@example.com', password: 'password-at-least-eight' }).expect(201);
      expect(login.body.user).toEqual(created.body.user);
      transcript.login = { status: login.status, user: publicUser(login.body.user), cookie: cookiePolicy(login), bodyKeys: Object.keys(login.body).sort() };
      const google = await post('/auth/google', { idToken: 'synthetic-google-proof' }).expect(201);
      labels.set(String(google.body.user.id), 'google');
      expect(publicUser(google.body.user)).toEqual({ id: 'google', name: 'Google', email: 'google@example.com', role: 'member', roles: ['member'], country: null });
      transcript.google = { status: google.status, user: publicUser(google.body.user), cookie: cookiePolicy(google), bodyKeys: Object.keys(google.body).sort() };
      const profile = await request(app.getHttpServer()).get('/auth/profile').set('Cookie', stellarCookie(login, 'petsapp_session')).expect(200);
      expect(profile.body).toEqual(login.body.user); transcript.profile = { status: profile.status, user: publicUser(profile.body) };
      const bearerWins = await request(app.getHttpServer()).get('/auth/profile').set('Cookie', stellarCookie(google, 'petsapp_session')).set('Authorization', `Bearer ${login.body.token}`).expect(200);
      expect(bearerWins.body).toEqual(login.body.user); transcript.bearerWins = { status: bearerWins.status, user: publicUser(bearerWins.body) };
      const invalid = await request(app.getHttpServer()).get('/auth/profile').set('Cookie', stellarCookie(login, 'petsapp_session')).set('Authorization', 'Bearer invalid').expect(401);
      transcript.badBearer = { status: invalid.status, body: invalid.body, cookie: cookiePolicy(invalid) };
      const checked = await post('/auth/verify-password', { password: 'password-at-least-eight' }).set('Authorization', `Bearer ${login.body.token}`).expect(201, { verified: true });
      transcript.password = { status: checked.status, body: checked.body };
      const csrf = await request(app.getHttpServer()).post('/auth/logout').set('Origin', 'https://foreign.example').set('Cookie', stellarCookie(login, 'petsapp_session')).expect(403);
      expect(csrf.body).toEqual({ statusCode: 403, message: 'Origin not allowed', error: 'Forbidden' });
      transcript.csrf = { status: csrf.status, body: csrf.body, cookie: cookiePolicy(csrf) };
      const denied = await request(app.getHttpServer()).get('/admin/users').set('Authorization', `Bearer ${login.body.token}`).expect(403);
      const admin = await new DrizzleUserRepository(f.db).create({ name: 'Admin', email: 'admin@example.com', password: 'synthetic-unused-hash', role: UserRole.ADMIN });
      const allowed = await request(app.getHttpServer()).get('/admin/users').set('Authorization', `Bearer ${jwt.sign({ sub: admin.id, email: admin.email })}`).expect(200);
      expect(Array.isArray(allowed.body)).toBe(true);
      transcript.admin = { memberStatus: denied.status, memberBody: denied.body, adminStatus: allowed.status, count: allowed.body.length };
      const logout = await post('/auth/logout', {}).set('Cookie', stellarCookie(login, 'petsapp_session')).expect(204);
      transcript.logout = { status: logout.status, body: logout.body, cookie: cookiePolicy(logout) };
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
      console.info('[auth-control-transcript]', JSON.stringify(transcript));
    } finally {
      await app.close(); await f.close();
    }
  });
});
