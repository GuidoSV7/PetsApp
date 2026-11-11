import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createValidationPipe } from '../config/validation-pipe.js';
import { GlobalAuthGuard } from '../auth/guards/global-auth.guard.js';
import {
  authTestModule,
  bearer,
  createTestEnv,
  signToken,
} from '../auth/testing/auth-test-kit.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { UsersService } from './users.service.js';
import { USER_REPOSITORY } from './ports/user-repository.port.js';
import { InMemoryUserRepository } from './testing/in-memory-user.repository.js';
import { userData } from './testing/user-repository.fixtures.js';
import { UserRole } from './enums/user-role.enum.js';

const RANK_MESSAGE =
  'Only a super admin can manage an account of equal or higher rank';
type UserRow = Awaited<ReturnType<InMemoryUserRepository['create']>>;

type Setup = {
  app: NestExpressApplication;
  users: InMemoryUserRepository;
  admin: UserRow;
};

async function createApp(
  seed: (users: InMemoryUserRepository) => Promise<UserRow>,
): Promise<Setup> {
  const users = new InMemoryUserRepository();
  const admin = await seed(users);
  const moduleRef = await Test.createTestingModule({
    imports: [authTestModule(createTestEnv())],
    controllers: [AdminUsersController],
    providers: [
      { provide: APP_GUARD, useClass: GlobalAuthGuard },
      JwtStrategy,
      UsersService,
      { provide: USER_REPOSITORY, useValue: users },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  return { app, users, admin };
}

async function close(setup?: Setup) {
  await setup?.app?.close();
}

describe('admin cannot touch equal or higher rank accounts (S2)', () => {
  let setup: Setup;
  let otherAdmin: UserRow;
  let superAdmin: UserRow;
  let member: UserRow;

  beforeAll(async () => {
    setup = await createApp(async (users) => {
      const admin = await users.create(
        userData({
          email: 'admin@example.com',
          password: 'h',
          role: UserRole.ADMIN,
        }),
      );
      otherAdmin = await users.create(
        userData({
          email: 'other-admin@example.com',
          password: 'h',
          role: UserRole.ADMIN,
        }),
      );
      superAdmin = await users.create(
        userData({
          email: 'super@example.com',
          password: 'h',
          role: UserRole.SUPER_ADMIN,
        }),
      );
      member = await users.create(
        userData({
          email: 'member@example.com',
          password: bcrypt.hashSync('secret1', 4),
        }),
      );
      return admin;
    });
  });

  afterAll(() => close(setup));

  const http = () => request(setup.app.getHttpServer());
  const asAdmin = () => bearer(signToken(setup.admin.id));
  const asSuperAdmin = () => bearer(signToken(superAdmin.id));
  const stored = async (id: string) => (await setup.users.findById(id))!;

  it('answers 403 when an admin edits another admin, leaving the row unchanged (S2)', async () => {
    const res = await http()
      .patch(`/admin/users/${otherAdmin.id}`)
      .set(asAdmin())
      .send({ name: 'Renamed' })
      .expect(403);

    expect(res.body.message).toBe(RANK_MESSAGE);
    expect((await stored(otherAdmin.id)).name).not.toBe('Renamed');
  });

  it('answers 403 when an admin blocks another admin (S2)', async () => {
    await http()
      .post(`/admin/users/${otherAdmin.id}/toggle-block`)
      .set(asAdmin())
      .expect(403);

    expect((await stored(otherAdmin.id)).isBlocked).toBe(false);
  });

  it('lets a super admin edit and block an admin (S2)', async () => {
    await http()
      .patch(`/admin/users/${otherAdmin.id}`)
      .set(asSuperAdmin())
      .send({ name: 'Super Renamed' })
      .expect(200);
    await http()
      .post(`/admin/users/${otherAdmin.id}/toggle-block`)
      .set(asSuperAdmin())
      .expect(201);

    expect(await stored(otherAdmin.id)).toMatchObject({
      name: 'Super Renamed',
      isBlocked: true,
    });
  });

  it('lets an admin edit and block a member (S2, unchanged behavior)', async () => {
    await http()
      .patch(`/admin/users/${member.id}`)
      .set(asAdmin())
      .send({ name: 'Member Renamed' })
      .expect(200);
    await http()
      .post(`/admin/users/${member.id}/toggle-block`)
      .set(asAdmin())
      .expect(201);

    expect(await stored(member.id)).toMatchObject({
      name: 'Member Renamed',
      isBlocked: true,
    });
  });

  it('answers 409 Email already registered on an admin update that takes another email (S4)', async () => {
    const res = await http()
      .patch(`/admin/users/${member.id}`)
      .set(asAdmin())
      .send({ email: 'OTHER-ADMIN@example.com' })
      .expect(409);

    expect(res.body.message).toBe('Email already registered');
    expect((await stored(member.id)).email).toBe('member@example.com');
  });

  it('normalizes the email of an admin update without asking for the target password (S3, S5 is self-service only)', async () => {
    const res = await http()
      .patch(`/admin/users/${member.id}`)
      .set(asAdmin())
      .send({ email: 'Member.Normal@Example.COM' })
      .expect(200);

    expect(res.body.email).toBe('member.normal@example.com');
    expect((await stored(member.id)).email).toBe('member.normal@example.com');
  });
  it('answers 400 when an admin blocks themselves (S2)', async () => {
    await http()
      .post(`/admin/users/${setup.admin.id}/toggle-block`)
      .set(asAdmin())
      .expect(400);

    expect((await stored(setup.admin.id)).isBlocked).toBe(false);
  });

});

describe('GET /admin/users paging and case-insensitive search (S11)', () => {
  const TOTAL = 12;
  let setup: Setup;

  beforeAll(async () => {
    setup = await createApp(async (users) => {
      const admin = await users.create(
        userData({ email: 'boss@example.com', password: 'h', role: UserRole.ADMIN }),
      );
      for (let i = 0; i < TOTAL; i += 1) {
        await users.create(
          userData({ email: `member-${i}@x.com`, password: 'h' }),
        );
      }
      await users.create(
        userData({ email: 'buscada@x.com', password: 'h', name: 'Buscada' }),
      );
      await users.create(
        userData({ email: 'upper@x.com', password: 'h', name: 'Lower' }),
      );
      return admin;
    });
  });

  afterAll(() => close(setup));

  const asAdmin = () => bearer(signToken(setup.admin.id));
  const get = async (query: string) =>
    await request(setup.app.getHttpServer())
      .get(`/admin/users${query}`)
      .set(asAdmin());
  const idsOf = (res: { body: { id: string }[] }) => res.body.map((u) => u.id);
  const totalRows = TOTAL + 3;

  it('pages with limit and offset on the id-DESC order (S11)', async () => {
    const all = await get('');
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(totalRows);
    const ids = idsOf(all);

    expect(idsOf(await get('?limit=1'))).toEqual([ids[0]]);
    expect(idsOf(await get('?limit=2&offset=3'))).toEqual([ids[3], ids[4]]);
    expect(idsOf(await get('?limit=5&offset=12'))).toEqual(
      ids.slice(12, 17),
    );
    expect(idsOf(await get('?limit=0'))).toEqual([]);
    expect(idsOf(await get('?offset=99'))).toEqual([]);
    expect(all.body[0]).toEqual(
      expect.not.objectContaining({ password: expect.anything() }),
    );
  });

  it('rejects a limit above 200 or a negative offset with 400 (S11)', async () => {
    expect((await get('?limit=201')).status).toBe(400);
    expect((await get('?offset=-5')).status).toBe(400);
  });

  it('rejects non-numeric paging params with 400 (S11)', async () => {
    expect((await get('?limit=abc')).status).toBe(400);
    expect((await get('?offset=xyz')).status).toBe(400);
  });

  it('matches search name and email case-insensitively (S11)', async () => {
    const byName = await get('?search=BUSCA');
    expect(byName.body.map((u: { userName: string }) => u.userName)).toEqual([
      'Buscada',
    ]);

    const byEmail = await get('?search=UPPER');
    expect(byEmail.body.map((u: { email: string }) => u.email)).toEqual([
      'upper@x.com',
    ]);

    const exact = await get('?search=member-3');
    expect(idsOf(exact)).toHaveLength(1);
  });
});
