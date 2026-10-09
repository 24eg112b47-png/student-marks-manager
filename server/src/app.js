const path = require('node:path');
const express = require('express');
const {
  clearSessionCookie,
  createSessionToken,
  getCookie,
  hashPassword,
  hashSessionToken,
  isUniversityEmail,
  readSessionTeacherId,
  safeEqual,
  sessionCookie,
  sessionCookieName,
  sessionExpiryDate,
  verifyPassword,
} = require('./auth');
const { validateStudent } = require('./validation');

function createApp({ store, calculate, storageMode, inviteCode, sessionSecret }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  const secureCookies = process.env.NODE_ENV === 'production';
  app.use('/api/auth', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.post('/api/auth/register', async (request, response, next) => {
    try {
      if (!inviteCode) {
        return response.status(503).json({ error: 'Teacher registration is not configured yet.' });
      }
      const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
      const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
      const password = request.body?.password;
      const submittedInviteCode = request.body?.invite_code;
      if (!name || name.length > 100) {
        return response.status(400).json({ error: 'Name is required and must be 100 characters or fewer.' });
      }
      if (!isUniversityEmail(email)) {
        return response.status(400).json({ error: 'Use your @anurag.edu.in university email address.' });
      }
      if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
        return response.status(400).json({ error: 'Password must be between 12 and 128 characters.' });
      }
      if (typeof submittedInviteCode !== 'string' || !safeEqual(submittedInviteCode, inviteCode)) {
        return response.status(403).json({ error: 'The teacher invite code is invalid.' });
      }

      const teacher = await store.createTeacher({ name, email, password_hash: await hashPassword(password) });
      const token = createSessionToken(teacher.id, sessionSecret);
      await store.createSession(hashSessionToken(token), teacher.id, sessionExpiryDate());
      response.setHeader('Set-Cookie', sessionCookie(token, secureCookies));
      response.status(201).json({ teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
    } catch (error) {
      if (error instanceof Error && error.code === '23505') {
        return response.status(409).json({ error: 'An account with this university email already exists.' });
      }
      next(error);
    }
  });

  app.post('/api/auth/login', async (request, response, next) => {
    try {
      const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
      const password = request.body?.password;
      const teacher = await store.getTeacherByEmail(email);
      if (!teacher || typeof password !== 'string' || !await verifyPassword(password, teacher.password_hash)) {
        return response.status(401).json({ error: 'Email or password is incorrect.' });
      }
      const token = createSessionToken(teacher.id, sessionSecret);
      await store.createSession(hashSessionToken(token), teacher.id, sessionExpiryDate());
      response.setHeader('Set-Cookie', sessionCookie(token, secureCookies));
      response.json({ teacher: { id: teacher.id, name: teacher.name, email: teacher.email } });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/logout', async (request, response, next) => {
    try {
      const token = getCookie(request, sessionCookieName);
      const teacherId = readSessionTeacherId(token, sessionSecret);
      if (teacherId && token) await store.deleteSession(hashSessionToken(token));
    } catch (error) {
      return next(error);
    }
    response.setHeader('Set-Cookie', clearSessionCookie(secureCookies));
    response.status(204).end();
  });

  app.get('/api/auth/me', async (request, response, next) => {
    try {
      const token = getCookie(request, sessionCookieName);
      const teacherId = readSessionTeacherId(token, sessionSecret);
      const sessionTeacherId = teacherId && token
        ? await store.getSessionTeacherId(hashSessionToken(token), teacherId)
        : null;
      const teacher = sessionTeacherId ? await store.getTeacherById(sessionTeacherId) : null;
      response.setHeader('Cache-Control', 'no-store');
      response.json({ teacher: teacher ? { id: teacher.id, name: teacher.name, email: teacher.email } : null });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/health', async (_request, response) => {
    response.json({ status: 'ok', storage: storageMode });
  });

  app.use('/api', async (request, response, next) => {
    try {
      const token = getCookie(request, sessionCookieName);
      const teacherId = readSessionTeacherId(token, sessionSecret);
      const sessionTeacherId = teacherId && token
        ? await store.getSessionTeacherId(hashSessionToken(token), teacherId)
        : null;
      const teacher = sessionTeacherId ? await store.getTeacherById(sessionTeacherId) : null;
      if (!teacher) return response.status(401).json({ error: 'Please sign in to access student records.' });
      request.teacher = teacher;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/students', async (request, response, next) => {
    try {
      response.json(await store.list(String(request.query.search || ''), request.teacher.id));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/students/:id', async (request, response, next) => {
    try {
      const student = await store.get(request.params.id, request.teacher.id);
      if (!student) return response.status(404).json({ error: 'Student not found.' });
      response.json(student);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/stats', async (request, response, next) => {
    try {
      response.json(await store.stats(request.teacher.id));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/students', async (request, response, next) => {
    try {
      const values = validateStudent(request.body);
      const calculated = await calculate(values);
      response.status(201).json(await store.create(values, calculated, request.teacher.id));
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
      const student = await store.update(request.params.id, values, calculated, request.teacher.id);
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
      if (!await store.remove(request.params.id, request.teacher.id)) return response.status(404).json({ error: 'Student not found.' });
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