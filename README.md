# Student Marks Manager

A small full-stack student results and attendance register. The React dashboard is served by the Express API; Java calculates grades and results, and PostgreSQL stores production records.

## Run locally

Requirements: Node.js 22 or newer and Java 17 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Without `DATABASE_URL`, the API starts in demo-memory mode. Data in this mode is temporary and disappears when the server restarts. The local teacher invite code is `local-demo-teacher-code`; change it in `.env` before sharing a demo.

To use PostgreSQL locally, copy `.env.example` to `.env`, set `DATABASE_URL`, `TEACHER_INVITE_CODE`, and a private `SESSION_SECRET` of at least 32 characters, then start the app. The server creates or migrates the tables from `database/schema.sql` on startup. Existing student rows are left unassigned and are not visible to teacher accounts; each teacher sees only records created in their own account.

Production build and tests:

```powershell
npm run build
npm test
npm start
```

## API

- `GET /api/health` reports server and storage status.
- `GET /api/auth/me` returns the signed-in teacher, or `null`.
- `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/logout` manage teacher sessions.
- `GET /api/students?search=` lists records, optionally matching name or roll number.
- `GET /api/students/:id` returns one record.
- `POST /api/students` creates a record.
- `PUT /api/students/:id` replaces a record's editable fields.
- `DELETE /api/students/:id` removes a record.
- `GET /api/stats` returns class counts and averages.

The request fields are `roll_no`, `name`, `maths`, `java`, `dbms`, and `attendance`. Marks are whole numbers from 0 through 100; attendance supports up to two decimal places. Roll numbers are normalized to uppercase and must be unique within each teacher's class.

Teacher accounts can register using an `@anurag.edu.in` email address and the private invite code. This domain-and-code check is a demo gate, not university verification; don't publish or reuse the invite code. Passwords are stored as scrypt hashes, and signed HTTP-only cookies are used for login sessions. Student APIs and dashboard statistics require a signed-in teacher and are scoped to that teacher. The selected academic term is a dashboard label only; records are not yet stored or separated by semester.

The Java process accepts a numeric JSON object on stdin and writes calculated JSON to stdout. Percentage is `total / 3`, rounded to two decimal places. Grades are A at 90+, B at 80+, C at 70+, D at 60+, otherwise F. A student passes only when every subject is at least 40 and the overall percentage is at least 40. Attendance below 75% is flagged for review.

## Deploy

This app needs a regular Node process that can launch Java, so deploy the whole container to Render rather than Vercel's serverless functions.

1. Push this project to a GitHub repository and create a free PostgreSQL project on Neon.
2. In Neon, copy the pooled connection string and keep its password private.
3. In Render, create a Docker web service from the repository and select the Free plan.
4. Set `DATABASE_URL` on the Render service to the Neon connection string, set a private `TEACHER_INVITE_CODE`, and set `SESSION_SECRET` to a randomly generated value with at least 32 characters. Never commit these values. The app creates or migrates the schema on startup.

Render builds the React files and Java class into the image; Express serves the UI and `/api` from the same service. The production server refuses to start without `DATABASE_URL`, so a deployment cannot silently use temporary in-memory records.

## Docker

```powershell
docker build -t student-marks-manager .
docker run --rm -p 3000:3000 -e DATABASE_URL="your-neon-connection-string" student-marks-manager
```

Open `http://localhost:3000` to use the built application.