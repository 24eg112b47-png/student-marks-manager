const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const schema = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
const fields = ['roll_no', 'name', 'maths', 'java', 'dbms', 'attendance'];
const calculatedFields = ['total', 'percentage', 'grade', 'result', 'attendance_status'];

class MemoryStore {
  constructor() {
    this.students = [];
    this.teachers = [];
    this.sessions = new Map();
    this.nextId = 1;
    this.nextTeacherId = 1;
  }

  async createTeacher(values) {
    if (this.teachers.some((teacher) => teacher.email === values.email)) {
      const error = new Error('An account with this university email already exists.');
      error.code = '23505';
      throw error;
    }
    const teacher = { id: this.nextTeacherId++, ...values, created_at: new Date().toISOString() };
    this.teachers.push(teacher);
    return teacher;
  }

  async getTeacherByEmail(email) {
    return this.teachers.find((teacher) => teacher.email === email) || null;
  }

  async getTeacherById(id) {
    return this.teachers.find((teacher) => teacher.id === Number(id)) || null;
  }

  async createSession(tokenHash, teacherId, expiresAt) {
    this.sessions.set(tokenHash, { teacher_id: Number(teacherId), expires_at: expiresAt });
  }

  async getSessionTeacherId(tokenHash, teacherId) {
    const session = this.sessions.get(tokenHash);
    if (!session || session.teacher_id !== Number(teacherId) || session.expires_at <= new Date()) return null;
    return session.teacher_id;
  }

  async deleteSession(tokenHash) {
    this.sessions.delete(tokenHash);
  }

  async list(search = '', teacherId) {
    const term = search.trim().toLowerCase();
    return this.students
      .filter((student) => student.teacher_id === Number(teacherId))
      .filter((student) => !term || student.name.toLowerCase().includes(term) || student.roll_no.toLowerCase().includes(term))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async get(id, teacherId) {
    return this.students.find((student) => student.id === Number(id) && student.teacher_id === Number(teacherId)) || null;
  }

  async create(values, calculated, teacherId) {
    this.assertUniqueRoll(values.roll_no, teacherId);
    const student = { id: this.nextId++, ...values, ...calculated, teacher_id: Number(teacherId), created_at: new Date().toISOString() };
    this.students.push(student);
    return student;
  }

  async update(id, values, calculated, teacherId) {
    const index = this.students.findIndex((student) => student.id === Number(id) && student.teacher_id === Number(teacherId));
    if (index < 0) return null;
    this.assertUniqueRoll(values.roll_no, teacherId, Number(id));
    this.students[index] = { ...this.students[index], ...values, ...calculated };
    return this.students[index];
  }

  async remove(id, teacherId) {
    const index = this.students.findIndex((student) => student.id === Number(id) && student.teacher_id === Number(teacherId));
    if (index < 0) return false;
    this.students.splice(index, 1);
    return true;
  }

  async stats(teacherId) {
    const students = this.students.filter((student) => student.teacher_id === Number(teacherId));
    const count = students.length;
    const average = (key) => count
      ? students.reduce((sum, student) => sum + Number(student[key]), 0) / count
      : 0;
    return {
      student_count: count,
      average_percentage: Number(average('percentage').toFixed(2)),
      average_attendance: Number(average('attendance').toFixed(2)),
      pass_count: students.filter((student) => student.result === 'PASS').length,
      warning_count: students.filter((student) => student.attendance_status === 'WARNING').length,
      subject_averages: Object.fromEntries(['maths', 'java', 'dbms'].map((subject) => [subject, Number(average(subject).toFixed(2))])),
    };
  }

  assertUniqueRoll(rollNo, teacherId, exceptId) {
    if (this.students.some((student) => student.roll_no === rollNo
        && student.teacher_id === Number(teacherId) && student.id !== exceptId)) {
      const error = new Error('A student with this roll number already exists.');
      error.code = '23505';
      throw error;
    }
  }
}

class PostgresStore {
  constructor(databaseUrl) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
    });
  }

  async initialize() {
    await this.pool.query(schema);
  }

  async createTeacher(values) {
    const result = await this.pool.query(
      'INSERT INTO teachers (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [values.name, values.email, values.password_hash],
    );
    return result.rows[0];
  }

  async getTeacherByEmail(email) {
    const result = await this.pool.query('SELECT * FROM teachers WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async getTeacherById(id) {
    const result = await this.pool.query(
      'SELECT id, name, email, created_at FROM teachers WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async createSession(tokenHash, teacherId, expiresAt) {
    await this.pool.query(
      'INSERT INTO teacher_sessions (token_hash, teacher_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, teacherId, expiresAt],
    );
  }

  async getSessionTeacherId(tokenHash, teacherId) {
    const result = await this.pool.query(
      `SELECT teacher_id FROM teacher_sessions
       WHERE token_hash = $1 AND teacher_id = $2 AND expires_at > NOW()`,
      [tokenHash, teacherId],
    );
    return result.rows[0]?.teacher_id || null;
  }

  async deleteSession(tokenHash) {
    await this.pool.query('DELETE FROM teacher_sessions WHERE token_hash = $1', [tokenHash]);
  }

  async list(search = '', teacherId) {
    const result = await this.pool.query(
      `SELECT * FROM students
       WHERE teacher_id = $1
         AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR roll_no ILIKE '%' || $2 || '%')
       ORDER BY name ASC`,
      [teacherId, search.trim()],
    );
    return result.rows;
  }

  async get(id, teacherId) {
    const result = await this.pool.query('SELECT * FROM students WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
    return result.rows[0] || null;
  }

  async create(values, calculated, teacherId) {
    const columns = [...fields, ...calculatedFields, 'teacher_id'];
    const result = await this.pool.query(
      `INSERT INTO students (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      [...columns.slice(0, -1).map((column) => values[column] ?? calculated[column]), teacherId],
    );
    return result.rows[0];
  }

  async update(id, values, calculated, teacherId) {
    const columns = [...fields, ...calculatedFields];
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
    const result = await this.pool.query(
      `UPDATE students SET ${assignments} WHERE id = $${columns.length + 1} AND teacher_id = $${columns.length + 2} RETURNING *`,
      [...columns.map((column) => values[column] ?? calculated[column]), id, teacherId],
    );
    return result.rows[0] || null;
  }

  async remove(id, teacherId) {
    const result = await this.pool.query('DELETE FROM students WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
    return result.rowCount > 0;
  }

  async stats(teacherId) {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS student_count,
              COALESCE(ROUND(AVG(percentage), 2), 0) AS average_percentage,
              COALESCE(ROUND(AVG(attendance), 2), 0) AS average_attendance,
              COUNT(*) FILTER (WHERE result = 'PASS')::int AS pass_count,
              COUNT(*) FILTER (WHERE attendance_status = 'WARNING')::int AS warning_count,
              json_build_object(
                'maths', COALESCE(ROUND(AVG(maths), 2), 0),
                'java', COALESCE(ROUND(AVG(java), 2), 0),
                'dbms', COALESCE(ROUND(AVG(dbms), 2), 0)
              ) AS subject_averages
       FROM students
       WHERE teacher_id = $1`,
      [teacherId],
    );
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { MemoryStore, PostgresStore };