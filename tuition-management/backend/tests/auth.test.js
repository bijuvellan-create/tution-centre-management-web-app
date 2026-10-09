import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/User.js';
import { startMemoryDB, stopMemoryDB, clearDB } from './helpers/db.js';

before(startMemoryDB);
after(stopMemoryDB);
beforeEach(clearDB);

async function createAdmin() {
  const admin = new User({
    name: 'Test Admin',
    email: 'admin@example.com',
    role: 'admin',
  });
  await admin.setPassword('Password123');
  await admin.save();
  return admin;
}

test('login succeeds with correct credentials and returns a token', async () => {
  await createAdmin();

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Password123' })
    .expect(200);

  assert.equal(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.user.role, 'admin');
  assert.equal(res.body.data.user.passwordHash, undefined, 'hash must never be returned');
});

test('login fails with a generic message for a wrong password', async () => {
  await createAdmin();

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'WrongPassword1' })
    .expect(401);

  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Invalid email or password/);
});

test('login fails with 422 when the body is invalid', async () => {
  await request(app).post('/api/auth/login').send({ email: 'not-an-email' }).expect(422);
});

test('GET /api/auth/me requires a valid token', async () => {
  await request(app).get('/api/auth/me').expect(401);
});

test('change-password requires the current password and invalidates old tokens', async () => {
  await createAdmin();

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Password123' })
    .expect(200);
  const oldToken = login.body.data.token;

  const res = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${oldToken}`)
    .send({ currentPassword: 'Password123', newPassword: 'NewPassword456' })
    .expect(200);

  const newToken = res.body.data.token;

  // Old token must no longer work.
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${oldToken}`)
    .expect(401);

  // New token works.
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${newToken}`)
    .expect(200);

  // Old password no longer logs in; new one does.
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Password123' })
    .expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'NewPassword456' })
    .expect(200);
});
