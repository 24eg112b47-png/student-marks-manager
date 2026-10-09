const { createApp } = require('./src/app');
const { calculateMarks } = require('./src/javaRunner');
const { MemoryStore, PostgresStore } = require('./src/store');
const { validateStudent } = require('./src/validation');

const sampleStudents = [
  { roll_no: 'ST-1042', name: 'Amina Rahman', maths: 96, java: 91, dbms: 94, attendance: 97 },
  { roll_no: 'ST-1038', name: 'Ravi Menon', maths: 78, java: 84, dbms: 80, attendance: 82 },
  { roll_no: 'ST-1029', name: 'Maya Patel', maths: 66, java: 72, dbms: 70, attendance: 68 },
  { roll_no: 'ST-1014', name: 'Omar Hassan', maths: 39, java: 55, dbms: 48, attendance: 91 },
];

async function createStore() {
  if (process.env.DATABASE_URL) {
    const store = new PostgresStore(process.env.DATABASE_URL);
    await store.initialize();
    return { store, storageMode: 'neon-postgres' };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production.');
  }

  const store = new MemoryStore();
  for (const sample of sampleStudents) {
    const values = validateStudent(sample);
    await store.create(values, await calculateMarks(values));
  }
  return { store, storageMode: 'demo-memory' };
}

async function start() {
  const { store, storageMode } = await createStore();
  const app = createApp({ store, calculate: calculateMarks, storageMode });
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