# CBE204 Week 6 — Authentication & Web Security Demo Repository

A local, intentionally educational repository for **CBE204 Web Technology Laboratory, Week 6**.

Theme: **From a working REST API to a secure REST API**

The repository supports the Week 6 lecture demonstrations, lab exercises, Postman security testing, and Secure Login Prototype assignment.

## Safety

Run and test this repository **locally only**.

The vulnerable application is intentionally insecure for classroom demonstration. Do not deploy it to the Internet or test it against systems you do not own or have explicit authorization to test.

## Repository structure

```text
cbe204-week06-security-demo/
├── secure-api/                 # Reference implementation for demonstrations
├── vulnerable-api/             # Intentionally vulnerable local demo
├── session-api/                # Secure session + cookie reference implementation
├── postman/
│   └── CBE204-Week06-Security.postman_collection.json
├── docs/
│   ├── DEMO-GUIDE.md           # Instructor run-of-show
│   └── CHALLENGES.md           # Student challenge sequence
├── .gitignore
└── README.md
```

## Requirements

- Node.js 20+ recommended
- npm
- Postman

No external database is required. The demo uses an in-memory data store so that students can focus on authentication and authorization. Restarting a server resets the demo data.

## Quick start

### Secure API

```bash
cd secure-api
npm install
npm start
```

Runs at:

```text
http://localhost:3000
```

### Session + Cookie API

Open another terminal:

```bash
cd session-api
npm install
npm start
```

Runs at:

```text
http://localhost:3002
```

The session API demonstrates `HttpOnly`, `SameSite`, session creation, protected routes, and logout. It uses an in-memory session store suitable only for classroom demonstration.

### Vulnerable API

Open a second terminal:

```bash
cd vulnerable-api
npm install
npm start
```

Runs at:

```text
http://localhost:3001
```

## Demo users

Both applications initialize:

| Username | Password | Role |
|---|---|---|
| alice | alice123 | student |
| bob | admin123 | admin |
| john | john123 | student |

These credentials are classroom-only demo credentials.

## Core endpoints

```text
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout

GET    /api/protected
GET    /api/profile
GET    /api/users/:id
DELETE /api/users/:id
```

The secure application uses JWT authentication for the reference implementation.

## Postman

Import:

```text
postman/CBE204-Week06-Security.postman_collection.json
```

The collection includes:

- Registration
- Login
- Current user
- Protected endpoint
- Profile
- Other-user access
- Admin operation
- Invalid password
- Missing authentication
- Modified JWT
- Malformed JWT
- Logout

Set the collection variable:

```text
baseUrl = http://localhost:3000
```

For the vulnerable demo, change it to:

```text
http://localhost:3001
```

## Suggested teaching sequence

1. Start `vulnerable-api`.
2. Demonstrate plaintext passwords.
3. Demonstrate missing authorization.
4. Demonstrate IDOR/Broken Access Control.
5. Demonstrate raw SQL-style injection concept in the vulnerable code.
6. Demonstrate verbose error leakage.
7. Demonstrate hardcoded JWT secret.
8. Start `secure-api`.
9. Compare password hashing.
10. Demonstrate authentication middleware.
11. Demonstrate authorization middleware.
12. Test JWT manipulation in Postman.
13. Run the student challenges.
14. Use the secure implementation as a reference, not something to copy blindly.

See `docs/DEMO-GUIDE.md` and `docs/CHALLENGES.md`.

## Mapping to Week 6 Lab

| Lab | Repository support |
|---|---|
| Part A | AuthN/AuthZ examples and middleware |
| Part B | Password hashing and verification |
| Part C | Conceptual session/cookie discussion; secure app focuses on JWT |
| Part D | JWT login, verification, expiry, malformed/modified token tests |
| Part E | Student/admin authorization |
| Part F | `/api/users/:id` other-user access challenge |
| Part G | Secure coding checklist |
| Part H | Vulnerable API case study |
| Part I | Postman security collection |
| Part J | Endpoint security questions |
| Part K | Secure Login Prototype reference |
| Part L | Evidence targets |
| Part M | Reflection report prompts |

## Important learning point

A successful login does **not** mean the user can perform every operation.

Think:

```text
HTTP Request
     ↓
Validate Input
     ↓
Authenticate
     ↓
Authorize
     ↓
Process
     ↓
Safe Response
```
