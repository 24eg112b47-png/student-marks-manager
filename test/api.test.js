const assert = require('node:assert/strict');
const { once } = require('node:events');
const { after, test } = require('node:test');
const { createApp } = require('../server/src/app');
const { calculateMarks } = require('../server/src/javaRunner');
const { MemoryStore } = require('../server/src/store');

const store = new MemoryStore();
const server = createApp({ store, calculate: calculateMarks, storageMode: 'test-memory' }).listen(0);
const serverReady = once(server, 'listening');
const baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  server.close();
  await once(server, 'close');
});

test('student REST workflow validates, searches, updates, reports stats and deletes', async () => {
  await serverReady;

  const invalidResponse = await fetch(`${baseUrl}/api/students`, {
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
  const createdResponse = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.roll_no, 'ST-2042');
  assert.equal(created.total, 281);
  assert.equal(created.result, 'PASS');

  const duplicateResponse = await fetch(`${baseUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(duplicateResponse.status, 409);

  const searchResponse = await fetch(`${baseUrl}/api/students?search=amina`);
  assert.equal((await searchResponse.json()).length, 1);
  const statsResponse = await fetch(`${baseUrl}/api/stats`);
  const stats = await statsResponse.json();
  assert.equal(stats.student_count, 1);
  assert.equal(stats.pass_count, 1);
  assert.equal(Number(stats.subject_averages.maths), 96);

  const updatedResponse = await fetch(`${baseUrl}/api/students/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, maths: 39 }),
  });
  assert.equal((await updatedResponse.json()).result, 'FAIL');

  const deletedResponse = await fetch(`${baseUrl}/api/students/${created.id}`, { method: 'DELETE' });
  assert.equal(deletedResponse.status, 204);
  const missingResponse = await fetch(`${baseUrl}/api/students/${created.id}`);
  assert.equal(missingResponse.status, 404);
});