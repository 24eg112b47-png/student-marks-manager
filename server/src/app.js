const path = require('node:path');
const express = require('express');
const { validateStudent } = require('./validation');

function createApp({ store, calculate, storageMode }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', async (_request, response) => {
    response.json({ status: 'ok', storage: storageMode });
  });

  app.get('/api/students', async (request, response, next) => {
    try {
      response.json(await store.list(String(request.query.search || '')));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/students/:id', async (request, response, next) => {
    try {
      const student = await store.get(request.params.id);
      if (!student) return response.status(404).json({ error: 'Student not found.' });
      response.json(student);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stats', async (_request, response, next) => {
    try {
      response.json(await store.stats());
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/students', async (request, response, next) => {
    try {
      const values = validateStudent(request.body);
      const calculated = await calculate(values);
      response.status(201).json(await store.create(values, calculated));
    } catch (error) {
      if (error instanceof Error && error.code === '23505') {
        return response.status(409).json({ error: 'A student with this roll number already exists.' });
      }
      if (error instanceof Error && !error.code) return response.status(400).json({ error: error.message });
      next(error);
    }
  });

  app.put('/api/students/:id', async (request, response, next) => {
    try {
      const values = validateStudent(request.body);
      const calculated = await calculate(values);
      const student = await store.update(request.params.id, values, calculated);
      if (!student) return response.status(404).json({ error: 'Student not found.' });
      response.json(student);
    } catch (error) {
      if (error instanceof Error && error.code === '23505') {
        return response.status(409).json({ error: 'A student with this roll number already exists.' });
      }
      if (error instanceof Error && !error.code) return response.status(400).json({ error: error.message });
      next(error);
    }
  });

  app.delete('/api/students/:id', async (request, response, next) => {
    try {
      if (!await store.remove(request.params.id)) return response.status(404).json({ error: 'Student not found.' });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  const clientBuild = path.resolve(__dirname, '../../client/dist');
  app.use('/assets', express.static(path.join(clientBuild, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientBuild));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/')) return next();
    response.sendFile(path.join(clientBuild, 'index.html'), (error) => {
      if (error) next();
    });
  });

  app.use((error, _request, response, _next) => {
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Request body must be valid JSON.' });
    }
    console.error(error);
    response.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

module.exports = { createApp };