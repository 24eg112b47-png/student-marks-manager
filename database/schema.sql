CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    roll_no VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    maths INTEGER NOT NULL CHECK (maths BETWEEN 0 AND 100),
    java INTEGER NOT NULL CHECK (java BETWEEN 0 AND 100),
    dbms INTEGER NOT NULL CHECK (dbms BETWEEN 0 AND 100),
    attendance NUMERIC(5, 2) NOT NULL CHECK (attendance BETWEEN 0 AND 100),
    total INTEGER NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(2) NOT NULL,
    result VARCHAR(10) NOT NULL,
    attendance_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS teacher_sessions_expiry_idx ON teacher_sessions (expires_at);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE students
    DROP CONSTRAINT IF EXISTS students_roll_no_key;

CREATE UNIQUE INDEX IF NOT EXISTS students_teacher_roll_no_idx
    ON students (teacher_id, roll_no);

CREATE INDEX IF NOT EXISTS students_teacher_name_idx
    ON students (teacher_id, name);