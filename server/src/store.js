const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const schema = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
const fields = ['roll_no', 'name', 'maths', 'java', 'dbms', 'attendance'];
const calculatedFields = ['total', 'percentage', 'grade', 'result', 'attendance_status'];

class MemoryStore {
  constructor() {
    this.students = [];
    this.nextId = 1;
  }

  async list(search = '') {
    const term = search.trim().toLowerCase();
    return this.students
      .filter((student) => !term || student.name.toLowerCase().includes(term) || student.roll_no.toLowerCase().includes(term))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async get(id) {
    return this.students.find((student) => student.id === Number(id)) || null;
  }

  async create(values, calculated) {
    this.assertUniqueRoll(values.roll_no);
    const student = { id: this.nextId++, ...values, ...calculated, created_at: new Date().toISOString() };
    this.students.push(student);
    return student;
  }

  async update(id, values, calculated) {
    const index = this.students.findIndex((student) => student.id === Number(id));
    if (index < 0) return null;
    this.assertUniqueRoll(values.roll_no, Number(id));
    this.students[index] = { ...this.students[index], ...values, ...calculated };
    return this.students[index];
  }

  async remove(id) {
    const index = this.students.findIndex((student) => student.id === Number(id));
    if (index < 0) return false;
    this.students.splice(index, 1);
    return true;
  }

  async stats() {
    const count = this.students.length;
    const average = (key) => count
      ? this.students.reduce((sum, student) => sum + Number(student[key]), 0) / count
      : 0;
    return {
      student_count: count,
      average_percentage: Number(average('percentage').toFixed(2)),
      average_attendance: Number(average('attendance').toFixed(2)),
      pass_count: this.students.filter((student) => student.result === 'PASS').length,
      subject_averages: Object.fromEntries(['maths', 'java', 'dbms'].map((subject) => [subject, Number(average(subject).toFixed(2))])),
    };
  }

  assertUniqueRoll(rollNo, exceptId) {
    if (this.students.some((student) => student.roll_no === rollNo && student.id !== exceptId)) {
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

  async list(search = '') {
    const result = await this.pool.query(
      `SELECT * FROM students
       WHERE $1 = '' OR name ILIKE '%' || $1 || '%' OR roll_no ILIKE '%' || $1 || '%'
       ORDER BY name ASC`,
      [search.trim()],
    );
    return result.rows;
  }

  async get(id) {
    const result = await this.pool.query('SELECT * FROM students WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(values, calculated) {
    const columns = [...fields, ...calculatedFields];
    const result = await this.pool.query(
      `INSERT INTO students (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
      columns.map((column) => values[column] ?? calculated[column]),
    );
    return result.rows[0];
  }

  async update(id, values, calculated) {
    const columns = [...fields, ...calculatedFields];
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
    const result = await this.pool.query(
      `UPDATE students SET ${assignments} WHERE id = $${columns.length + 1} RETURNING *`,
      [...columns.map((column) => values[column] ?? calculated[column]), id],
    );
    return result.rows[0] || null;
  }

  async remove(id) {
    const result = await this.pool.query('DELETE FROM students WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async stats() {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS student_count,
              COALESCE(ROUND(AVG(percentage), 2), 0) AS average_percentage,
              COALESCE(ROUND(AVG(attendance), 2), 0) AS average_attendance,
              COUNT(*) FILTER (WHERE result = 'PASS')::int AS pass_count,
              json_build_object(
                'maths', COALESCE(ROUND(AVG(maths), 2), 0),
                'java', COALESCE(ROUND(AVG(java), 2), 0),
                'dbms', COALESCE(ROUND(AVG(dbms), 2), 0)
              ) AS subject_averages
       FROM students`,
    );
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { MemoryStore, PostgresStore };