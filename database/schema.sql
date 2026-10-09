CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    roll_no VARCHAR(20) UNIQUE NOT NULL,
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

CREATE INDEX IF NOT EXISTS students_name_idx ON students (name);