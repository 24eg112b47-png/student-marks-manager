const assert = require('node:assert/strict');
const { once } = require('node:events');
const { after, test } = require('node:test');
const { createApp } = require('../server/src/app');
const { calculateMarks } = require('../server/src/javaRunner');
const { MemoryStore } = require('../server/src/store');

const store = new MemoryStore();
const server = createApp({
  store,
  calculate: calculateMarks,
  storageMode: 'test-memory',
  inviteCode: 'test-teacher-invite-code',
  sessionSecret: 'test-session-secret-with-at-least-32-characters',
}).listen(0);
const serverReady = once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}`;
let sessionCookie;

async function api(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
  });
}

after(async () => {
  server.close();
  await once(server, 'close');
});

test('student REST workflow validates, searches, updates, reports stats and deletes', async () => {
  await serverReady;
  const registerResponse = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Amina Teacher',
      email: 'amina@anurag.edu.in',
      password: 'correct horse battery staple',
      invite_code: 'test-teacher-invite-code',
    }),
  });
  assert.equal(registerResponse.status, 201);
  sessionCookie = registerResponse.headers.get('set-cookie').split(';')[0];

  const invalidResponse = await api('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Missing roll' }),
  });
  assert.equal(invalidResponse.status, 400);

  const payload = {
    roll_no: 'st-2042',
    name: 'Amina Rahman',
    maths: 96,
    java: 91,
    dbms: 94,
    attendance: 97,
  };
  const createdResponse = await api('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.roll_no, 'ST-2042');
  assert.equal(created.total, 281);
  assert.equal(created.result, 'PASS');

  const duplicateResponse = await api('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(duplicateResponse.status, 409);

  const searchResponse = await api('/api/students?search=amina');
  assert.equal((await searchResponse.json()).length, 1);
  const statsResponse = await api('/api/stats');
  const stats = await statsResponse.json();
  assert.equal(stats.student_count, 1);
  assert.equal(stats.pass_count, 1);
  assert.equal(Number(stats.subject_averages.maths), 96);

  const updatedResponse = await api(`/api/students/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, maths: 39 }),
  });
  assert.equal((await updatedResponse.json()).result, 'FAIL');

  const deletedResponse = await api(`/api/students/${created.id}`, { method: 'DELETE' });
  assert.equal(deletedResponse.status, 204);
  const missingResponse = await api(`/api/students/${created.id}`);
  assert.equal(missingResponse.status, 404);
});