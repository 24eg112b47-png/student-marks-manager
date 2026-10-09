# Student Marks Manager

A small full-stack student results and attendance register. The React dashboard is served by the Express API; Java calculates grades and results, and PostgreSQL stores production records.

## Run locally

Requirements: Node.js 22 or newer and Java 17 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Without `DATABASE_URL`, the API starts with four sample students in demo-memory mode. Changes in this mode are temporary and disappear when the server restarts.

To use PostgreSQL locally, copy `.env.example` to `.env`, set `DATABASE_URL`, then start the app. The server creates the table from `database/schema.sql` on startup. To add the sample records to a connected database, run `database/seed.sql` once.

Production build and tests:

```powershell
npm run build
npm test
npm start
```

## API

- `GET /api/health` reports server and storage status.
- `GET /api/students?search=` lists records, optionally matching name or roll number.
- `GET /api/students/:id` returns one record.
- `POST /api/students` creates a record.
- `PUT /api/students/:id` replaces a record's editable fields.
- `DELETE /api/students/:id` removes a record.
- `GET /api/stats` returns class counts and averages.

The request fields are `roll_no`, `name`, `maths`, `java`, `dbms`, and `attendance`. Marks are whole numbers from 0 through 100; attendance supports up to two decimal places. Roll numbers are normalized to uppercase and must be unique.

The Java process accepts a numeric JSON object on stdin and writes calculated JSON to stdout. Percentage is `total / 3`, rounded to two decimal places. Grades are A at 90+, B at 80+, C at 70+, D at 60+, otherwise F. A student passes only when every subject is at least 40 and the overall percentage is at least 40. Attendance below 75% is flagged for review.

## Deploy

This app needs a regular Node process that can launch Java, so deploy the whole container to Render rather than Vercel's serverless functions.

1. Push this project to a GitHub repository and create a free PostgreSQL project on Neon.
2. In Neon, copy the pooled connection string and keep its password private.
3. In Render, create a Blueprint from the repository. `render.yaml` configures the Docker web service and health check.
4. Set `DATABASE_URL` on the Render service to the Neon connection string and deploy. The app creates the schema on startup.
5. Optionally execute `database/seed.sql` in the Neon SQL editor to add the example class.

Render builds the React files and Java class into the image; Express serves the UI and `/api` from the same service. The production server refuses to start without `DATABASE_URL`, so a deployment cannot silently use temporary in-memory records.

## Docker

```powershell
docker build -t student-marks-manager .
docker run --rm -p 3000:3000 -e DATABASE_URL="your-neon-connection-string" student-marks-manager
```

Open `http://localhost:3000` to use the built application.