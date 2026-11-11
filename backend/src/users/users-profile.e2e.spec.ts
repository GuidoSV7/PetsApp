import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { UserProfileController } from './controllers/user-profile.controller.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { UsersService } from './users.service.js';
import { USER_REPOSITORY } from './ports/user-repository.port.js';
import { InMemoryUserRepository } from './testing/in-memory-user.repository.js';
import { userData } from './testing/user-repository.fixtures.js';

const hash = (plain: string) => bcrypt.hashSync(plain, 4);
const EMAIL_TAKEN_BODY = {
  statusCode: 409,
  message: 'Email already registered',
  error: 'Conflict',
};
const INCORRECT_PASSWORD_BODY = {
  statusCode: 401,
  message: 'Incorrect password',
  error: 'Unauthorized',
};

describe('PATCH /users/me profile updates', () => {
  let app: NestExpressApplication;
  let users: InMemoryUserRepository;

  beforeAll(async () => {
    users = new InMemoryUserRepository();
    const moduleRef = await Test.createTestingModule({
      imports: [authTestModule(createTestEnv())],
      controllers: [UserProfileController],
      providers: [
        { provide: APP_GUARD, useClass: GlobalAuthGuard },
        JwtStrategy,
        UsersService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const me = (userId: string) =>
    request(app.getHttpServer())
      .patch('/users/me')
      .set(bearer(signToken(userId)));

  const stored = async (userId: string) => (await users.findById(userId))!;

  it('normalizes the email of a profile update (S3)', async () => {
    const ada = await users.create(
      userData({ email: 'sector3@example.com', password: hash('secret1') }),
    );

    const res = await me(ada.id)
      .send({ email: 'Mixed@Example.COM', currentPassword: 'secret1' })
      .expect(200);

    expect(res.body.email).toBe('mixed@example.com');
    expect((await stored(ada.id)).email).toBe('mixed@example.com');
  });

  it('accepts re-submitting your own email in any case (S4)', async () => {
    const bianca = await users.create(
      userData({ email: 'bianca@example.com', password: hash('secret1') }),
    );

    const res = await me(bianca.id)
      .send({ email: 'BIANCA@Example.com' })
      .expect(200);

    expect(res.body.email).toBe('bianca@example.com');
  });

  it('answers 409 Email already registered when the new email is taken (S4)', async () => {
    await users.create(
      userData({ email: 'taken@example.com', password: hash('secret1') }),
    );
    const ana = await users.create(
      userData({ email: 'ana@example.com', password: hash('secret1') }),
    );

    const res = await me(ana.id)
      .send({ email: 'TAKEN@EXAMPLE.COM', currentPassword: 'secret1' })
      .expect(409);

    expect(res.body).toEqual(EMAIL_TAKEN_BODY);
    expect((await stored(ana.id)).email).toBe('ana@example.com');
  });

  it('asks for the current password when the email changes (S5)', async () => {
    const vera = await users.create(
      userData({
        email: 'vera@example.com',
        password: hash('secret1'),
        isVerified: true,
      }),
    );

    const missing = await me(vera.id)
      .send({ email: 'vera.new@example.com' })
      .expect(400);
    expect(missing.body.message).toMatch(/current password/i);

    const wrong = await me(vera.id)
      .send({ email: 'vera.new@example.com', currentPassword: 'wrong-pass' })
      .expect(401);
    expect(wrong.body).toEqual(INCORRECT_PASSWORD_BODY);

    expect(await stored(vera.id)).toMatchObject({
      email: 'vera@example.com',
      isVerified: true,
    });
  });

  it('resets verification once the confirmed email change lands (S5)', async () => {
    const vera = await users.create(
      userData({
        email: 'verados@example.com',
        password: hash('secret1'),
        isVerified: true,
      }),
    );

    await me(vera.id)
      .send({ email: 'verados.new@example.com', currentPassword: 'secret1' })
      .expect(200);

    expect(await stored(vera.id)).toMatchObject({
      email: 'verados.new@example.com',
      isVerified: false,
    });
  });

  it('keeps a name-only update free of any password (S5)', async () => {
    const nina = await users.create(
      userData({
        email: 'nina@example.com',
        password: hash('secret1'),
        isVerified: true,
      }),
    );

    const res = await me(nina.id).send({ name: 'Nina G' }).expect(200);

    expect(res.body.name).toBe('Nina G');
    expect(await stored(nina.id)).toMatchObject({ name: 'Nina G', isVerified: true });
  });

  it('accepts only https profile image URLs or null (S10)', async () => {
    const oscar = await users.create(
      userData({ email: 'oscar@example.com', password: hash('secret1') }),
    );

    await me(oscar.id)
      .send({ profileImage: 'http://insecure.example/x.png' })
      .expect(400);
    await me(oscar.id)
      .send({ profileImage: 'javascript:alert(1)' })
      .expect(400);
    await me(oscar.id)
      .send({ profileImage: 'https://cdn.example/x.png' })
      .expect(200);
    await me(oscar.id).send({ profileImage: null }).expect(200);

    expect(await stored(oscar.id)).toMatchObject({ profileImage: null });
  });
});

describe('DELETE /users/me rate limit (S7)', () => {
  let app: NestExpressApplication;
  let users: InMemoryUserRepository;
  let member: Awaited<ReturnType<InMemoryUserRepository['create']>>;

  beforeAll(async () => {
    users = new InMemoryUserRepository();
    member = await users.create(
      userData({ email: 'del@example.com', password: hash('secret1') }),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
        authTestModule(createTestEnv()),
      ],
      controllers: [UserProfileController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: GlobalAuthGuard },
        UsersService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const deleteMe = () =>
    request(app.getHttpServer())
      .delete('/users/me')
      .set(bearer(signToken(member.id)))
      .send({ password: 'definitely-wrong' });

  it('throttles account deletion to 5 attempts per minute per IP (S7)', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await deleteMe().expect(401);
    }
    await deleteMe().expect(429);
    // Rejected attempts never deactivate the account.
    expect((await users.findById(member.id))!.isActive).toBe(true);
  });
});
