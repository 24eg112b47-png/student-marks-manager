const { createApp } = require('./src/app');
const { calculateMarks } = require('./src/javaRunner');
const { MemoryStore, PostgresStore } = require('./src/store');

async function createStore() {
  if (process.env.DATABASE_URL) {
    const store = new PostgresStore(process.env.DATABASE_URL);
    await store.initialize();
    return { store, storageMode: 'neon-postgres' };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production.');
  }

  return { store: new MemoryStore(), storageMode: 'demo-memory' };
}

async function start() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.TEACHER_INVITE_CODE) {
      throw new Error('TEACHER_INVITE_CODE is required in production.');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
    }
  }
  const { store, storageMode } = await createStore();
  const app = createApp({
    store,
    calculate: calculateMarks,
    storageMode,
    inviteCode: process.env.TEACHER_INVITE_CODE || 'local-demo-teacher-code',
    sessionSecret: process.env.SESSION_SECRET || 'local-development-session-secret-change-me',
  });
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => {
    console.log(`Student Marks Manager listening on port ${port} (${storageMode})`);
  });

  const shutdown = async () => {
    server.close();
    if (store instanceof PostgresStore) await store.close();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});