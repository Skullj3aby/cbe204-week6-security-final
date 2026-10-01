# CBE204 Week 6 — Secure Login and Task API

This submission combines the Week 5 task-manager CRUD workflow with the Week 6 demo's JWT authentication and authorization concepts. The API is for local lab use; it is not production-ready.

## Requirements and setup

- Node.js 20 or newer and npm
- Postman (optional, for the security collection)

From PowerShell:

```powershell
Set-Location secure-api
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `.env` as `JWT_SECRET`. Keep `.env` private; it is ignored by Git. To enable the admin-only routes, also set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to a unique lab account. Both values must be provided together. Without these optional values, public registration creates student accounts only.

Then run:

```powershell
npm install
npm start
```

The server listens at `http://localhost:3000`. Run the automated integration checks with `npm test`.

## Database and account lifecycle

This lab prototype uses an in-memory store in `secure-api/src/store.js`; it requires no external database. Users, profiles, tasks, and revoked token IDs are lost when the process restarts. Registration hashes passwords with bcrypt (12 rounds) and creates a default profile; stored password hashes and JWT secrets are never included in API responses. Configure the optional administrator through environment variables rather than source-code credentials.

JWTs use HS256, a 15-minute expiry, a subject, a unique token ID, and a fixed issuer. Logout revokes the presented token in the running server until it expires. This in-memory revocation list is suitable only for a single-process classroom demonstration.

## API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a student; username 3–50 allowed characters and password 8–72 UTF-8 bytes |
| `POST` | `/auth/login` | Public | Verify credentials and issue a JWT |
| `GET` | `/auth/me` | Authenticated | Return the current public user |
| `POST` | `/auth/logout` | Authenticated | Revoke the current JWT |
| `GET` | `/api/protected` | Authenticated | Example protected resource |
| `GET` | `/api/tasks` | Authenticated | List own tasks; administrators can list all tasks |
| `GET` | `/api/task/:id` | Owner or administrator | Read one task (also available at `/api/tasks/:id`) |
| `POST` | `/api/tasks` | Authenticated | Create a task owned by the current user |
| `PUT` | `/api/tasks/:id` | Owner or administrator | Update `title` and/or `completed` |
| `DELETE` | `/api/tasks/:id` | Owner or administrator | Delete a task |
| `GET` | `/api/profile` | Authenticated | Read the current user's profile |
| `GET` | `/api/users/:id` | Owner or administrator | Read a public user record |
| `DELETE` | `/api/users/:id` | Administrator | Delete a user and their tasks/profile |
| `GET` | `/api/admin` | Administrator | Example role-restricted route |

Use `Authorization: Bearer <token>` for authenticated requests. Students only see or change their own tasks; another user's task is returned as `404`. The server assigns task ownership and user roles; clients cannot choose either. Malformed input receives a safe 4xx response, and unexpected errors do not return stack traces.

## Postman security evidence

Import `postman/CBE204-Week06-Security.postman_collection.json` and set `baseUrl` to `http://localhost:3000`. Run the requests in order: registration stores a generated lab username, login stores the token and user ID, task requests exercise CRUD, and logout verifies that the revoked token can no longer access protected routes.

The collection also checks invalid credentials, validation, missing authentication, modified tokens, task ownership, and non-admin role denial. To test administrator access, configure the optional admin account in `.env`, set the Postman `adminUsername` and `adminPassword` variables locally, and run the admin login and role-restricted requests. Never export a Postman environment containing real passwords or tokens.

Capture your own Postman results for the lab submission; this repository does not claim screenshots or personal reflection answers. Complete the reflection from your own observations.

## Security notes and limitations

- Do not deploy this sample or use real credentials.
- In-memory accounts and tasks disappear on restart. A production database must use parameterized queries, durable storage, migrations, and transaction-safe uniqueness constraints.
- The in-memory JWT revocation list is not shared across multiple server processes; production logout needs shared revocation/session storage or a different authentication design.
- Production deployment also needs HTTPS, rate limiting, secure secret management, monitoring, and a persistent session/token strategy.
- `vulnerable-api/` is intentionally insecure classroom material. Do not alter or expose it outside localhost.
