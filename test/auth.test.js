const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { after, test } = require('node:test');
const { createApp } = require('../server/src/app');
const { verifyPassword } = require('../server/src/auth');
const { calculateMarks } = require('../server/src/javaRunner');
const { MemoryStore } = require('../server/src/store');

const inviteCode = 'only-for-authorized-teachers';
const sessionSecret = 'a-test-session-secret-that-is-long-enough';
const store = new MemoryStore();
const server = createApp({
  store,
  calculate: calculateMarks,
  storageMode: 'test-memory',
  inviteCode,
  sessionSecret,
}).listen(0);
const serverReady = once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function send(path, options = {}, cookie) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
}

async function register(name, email, code = inviteCode) {
  const response = await send('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password: 'a secure sample password',
      invite_code: code,
    }),
  });
  return response;
}

after(async () => {
  server.close();
  await once(server, 'close');
});

test('published demo password matches the scrypt hash in the database seed', async () => {
  const seed = fs.readFileSync(path.resolve(__dirname, '../database/seed.sql'), 'utf8');
  const match = seed.match(/'demo\.teacher@example\.com',\s*'([^']+)'/);
  assert.ok(match, 'seed script should define the documented demo account');
  assert.equal(await verifyPassword('ClassDemo!2026', match[1]), true);
});

test('teacher registration validates access and isolates each class', async () => {
  await serverReady;

  const publicHealth = await send('/api/health');
  assert.equal(publicHealth.status, 200);
  assert.equal((await send('/api/students')).status, 401);

  assert.equal((await register('Not Faculty', 'teacher@example.com')).status, 400);
  assert.equal((await register('Teacher One', 'one@anurag.edu.in', 'incorrect-code')).status, 403);
  assert.equal((await send('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Teacher One',
      email: 'one@anurag.edu.in',
      password: 'short',
      invite_code: inviteCode,
    }),
  })).status, 400);

  const firstRegistration = await register('Teacher One', 'one@anurag.edu.in');
  assert.equal(firstRegistration.status, 201);
  const firstBody = await firstRegistration.json();
  const firstCookie = firstRegistration.headers.get('set-cookie').split(';')[0];
  assert.equal(firstBody.teacher.email, 'one@anurag.edu.in');
  assert.equal('password_hash' in firstBody.teacher, false);
  assert.match(firstRegistration.headers.get('set-cookie'), /HttpOnly/);

  const studentPayload = {
    roll_no: 'SHARED-01',
    name: 'First Teacher Student',
    maths: 80,
    java: 90,
    dbms: 70,
    attendance: 88,
  };
  const createFirst = await send('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentPayload),
  }, firstCookie);
  assert.equal(createFirst.status, 201);
  const firstStudent = await createFirst.json();

  const secondRegistration = await register('Teacher Two', 'two@anurag.edu.in');
  assert.equal(secondRegistration.status, 201);
  const secondCookie = secondRegistration.headers.get('set-cookie').split(';')[0];
  assert.deepEqual(await (await send('/api/students', {}, secondCookie)).json(), []);
  assert.equal((await send(`/api/students/${firstStudent.id}`, {}, secondCookie)).status, 404);
  assert.equal((await send('/api/stats', {}, secondCookie).then((response) => response.json())).student_count, 0);

  const createSecond = await send('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...studentPayload, name: 'Second Teacher Student' }),
  }, secondCookie);
  assert.equal(createSecond.status, 201);
  assert.equal((await createSecond.json()).roll_no, 'SHARED-01');

  const login = await send('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ONE@ANURAG.EDU.IN', password: 'a secure sample password' }),
  });
  assert.equal(login.status, 200);
  const loggedInCookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await send('/api/auth/me', {}, loggedInCookie)).status, 200);
  assert.equal((await send('/api/auth/logout', { method: 'POST' }, loggedInCookie)).status, 204);
  assert.equal((await send('/api/students', {}, loggedInCookie)).status, 401);
});
