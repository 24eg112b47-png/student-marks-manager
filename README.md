# Student Marks Manager

A small full-stack application for managing a class register, recording marks and attendance, and calculating results. Built with React, Node.js/Express, Java, PostgreSQL (Neon), and Docker.

## Live demonstration

- **Application:** [https://student-marks-manager-48k8.onrender.com](https://student-marks-manager-48k8.onrender.com)
- **Source code:** [https://github.com/24eg112b47-png/student-marks-manager](https://github.com/24eg112b47-png/student-marks-manager)
- **Health check:** [https://student-marks-manager-48k8.onrender.com/api/health](https://student-marks-manager-48k8.onrender.com/api/health)

### Professor demo account

Create this regular teacher account through the app's invite-code registration before using it. The username is the project owner's university address:

| Login | Value |
|---|---|
| Username / email | `24eg112b47@anurag.edu.in` |
| Demo-only password | `ProfessorDemo-2026!` |

The password is intentionally public and must be used only for this demo account—not for university email, GitHub, or any personal account. Anyone with these credentials can see, add, edit, export, or delete this account's sample records. Do not store real student or confidential data in it. Do not add the teacher invite code to this README or share it publicly.

### Load the sample account and students

The teacher account must be registered through the live application first. Its records are then loaded into Neon using a separate sample-data script.

1. Open the [live app](https://student-marks-manager-48k8.onrender.com) and choose **Register with invite code**.
2. Register using `24eg112b47@anurag.edu.in`, the demo-only password above, and the private `TEACHER_INVITE_CODE` configured in Render. The email must match exactly so the sample rows are attached to this account.
3. Sign in to [Neon Console](https://console.neon.tech/) and open the database used by the Render service.
4. Open Neon's **SQL Editor**, copy all of [`database/seed.sql`](./database/seed.sql) from this repository into it, then run it.
5. Return to the live app and sign in with the demo credentials above.

The script requires the teacher account to exist and affects only its four `DEMO-` roll numbers. It does not create an account, change the account password, or assign, delete, or modify any other teacher's student records. If rerun, it restores the four sample rows to the documented example values.

### Sample students

| Roll number | Name | Maths | Java | DBMS | Attendance | Expected result |
|---|---|---:|---:|---:|---:|---|
| DEMO-1001 | Taylor Green | 80 | 90 | 70 | 88% | 240 total, 80.00%, B, PASS, OK |
| DEMO-1002 | Jordan Lee | 39 | 80 | 90 | 90% | 209 total, 69.67%, D, FAIL, OK |
| DEMO-1003 | Morgan Chen | 90 | 90 | 90 | 74% | 270 total, 90.00%, A, PASS, WARNING |
| DEMO-1004 | Alex Rivera | 66 | 72 | 70 | 68% | 208 total, 69.33%, D, PASS, WARNING |

### Create a separate teacher account

Choose **Register with invite code** on the application. Registration requires an `@anurag.edu.in` email, a password with at least 12 characters, and the private teacher invite code. The code is configured as `TEACHER_INVITE_CODE` in Render and must be obtained from the project owner; it is deliberately **not published in this repository**. The email-domain check plus invite code is a demonstration gate, not official verification that a person is faculty.

Each registered teacher has an isolated class. Student records are saved in the Neon PostgreSQL database, not in GitHub. Teacher accounts see only students added to their own account. The old, unassigned sample rows (if any) are not shown in anyone's class.

> Render's free web service sleeps after inactivity; the first visit may take about a minute to wake up. Neon and Render free-tier limits and retention policies can change. This is a classroom showcase, not a production service for real student information.

## Features

- Teacher registration (university email plus private invite code), sign-in, and sign-out.
- Teacher-specific student records protected by server-side ownership checks.
- Add, view calculated result, search, edit, and delete student records.
- Filter by pass/review status, paginate the register, and export the visible results to CSV.
- Dashboard class and subject averages, pass rate, and attendance warnings.
- Java result calculator, Express REST API, Neon/PostgreSQL persistence, and one-container Render deployment.

The term selector changes the displayed dashboard label only; records are not currently separated by semester.

## Calculation rules

- Total is the sum of Maths, Java, and DBMS marks; each subject is an integer from 0 to 100.
- Percentage is `total / 3`, rounded to two decimal places.
- Grade: A at 90+, B at 80+, C at 70+, D at 60+, otherwise F.
- PASS requires every subject to be at least 40 and the overall percentage to be at least 40.
- Attendance below 75% is marked WARNING; 75% and above is OK.

## Local development

Requirements: Node.js 22 or newer and Java 17 or newer.

```powershell
npm install
Copy-Item .env.example .env
```

For local account registration, set `TEACHER_INVITE_CODE` in `.env` to a private value. To use Neon locally, also set `DATABASE_URL` and a random `SESSION_SECRET` of at least 32 characters. Keep `.env` private; it is ignored by Git.

```powershell
npm run dev
```

Open `http://localhost:5173`. Without `DATABASE_URL`, the app uses temporary in-memory data which disappears when the server restarts.

Run checks and build:

```powershell
npm test
npm run build
```

## Deployment notes

The live service is deployed on Render because the Node server launches Java and serves the built React frontend from one Docker container. Production requires `DATABASE_URL`, `TEACHER_INVITE_CODE`, and `SESSION_SECRET`, all set as private Render environment variables. `database/schema.sql` creates/migrates the tables at startup. The service is configured for Render's Free plan in [`render.yaml`](./render.yaml).

Never commit real database URLs, invite codes, session secrets, or private student data. Use fictional records for this public demonstration.

## API overview

- `GET /api/health` — service and storage health.
- `GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` — teacher sessions.
- `GET /api/students?search=` and `GET /api/students/:id` — list/search or retrieve a student's record.
- `POST /api/students`, `PUT /api/students/:id`, `DELETE /api/students/:id` — create, update, and remove records.
- `GET /api/stats` — signed-in teacher's class statistics.

The Java calculation program accepts JSON on stdin and writes calculated JSON on stdout. It is launched internally by Node; the browser communicates only with the Node API.