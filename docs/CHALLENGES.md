# Week 6 Student Challenges

All challenges must be performed against the local lab applications in this repository.

## Challenge 1 — Authentication Boundary

Without changing the server:

1. Call `GET /api/protected` without a token.
2. Record the status code.
3. Register and log in as a student using the collection, or use an existing registered account.
4. Call it again with that account's token.
5. Explain what changed.

Expected:

```text
No token → 401
Valid token → 200
```

---

## Challenge 2 — Invalid Credentials

Try:

```json
{
  "username": "your-student-username",
  "password": "wrong-password"
}
```

Record:

- HTTP status
- response
- whether the response reveals whether the account exists

Compare vulnerable vs secure API.

---

## Challenge 3 — Other User

Register and log in as one student. Create a task and save its ID. Register and log in as a second student, then try to read the first student's task:

```http
GET /api/tasks/:other-student-task-id
```

Questions:

1. Which account owns this task?
2. Should the second student see it?
3. Does the secure API enforce ownership?
4. Why does it return `404` rather than disclosing the task?
5. What security risk does this demonstrate?

---

## Challenge 4 — Unauthorized Role

Log in as a student.

Try:

```http
GET /api/admin
```

Expected secure result:

```text
403 Forbidden
```

Explain why a valid login is not enough.

---

## Challenge 5 — Modified Token

Log in as a student.

Modify one character in the JWT.

Call:

```http
GET /api/protected
```

Expected secure result:

```text
401 Unauthorized
```

Explain why the modified token fails.

---

## Challenge 6 — Malformed Token

Send:

```http
Authorization: Bearer not-a-jwt
```

Expected secure result:

```text
401 Unauthorized
```

---

## Challenge 7 — Sensitive Data

Inspect the login response from the vulnerable API.

Identify information that should not be returned.

Then inspect the secure API.

Write down the differences.

---

## Challenge 8 — Input Validation

Try registration with:

```json
{
  "username": "ab",
  "password": "short"
}
```

The secure application should reject it with a 4xx response.

Try missing fields and incorrect JSON types as well.

---

## Challenge 9 — Error Handling

Send malformed authentication to both APIs.

Compare the error responses.

Identify:

- useful information
- unnecessary implementation details
- possible security impact

---

## Challenge 10 — Secure Coding Review

Review `secure-api/src/server.js`.

Find examples of:

- server-side validation
- password hashing
- password verification
- authentication middleware
- authorization middleware
- safe errors
- secret configuration
- minimized user responses

---

## Challenge 11 — Build Your Own Authorization Rule

The final API includes an admin-only operation. Verify its server-side authorization rule. Configure `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the local `.env` before starting the server to provision an administrator; public registration cannot set a role.

Example:

```http
GET /api/admin
```

Only admins should receive:

```json
{
  "message": "Welcome administrator"
}
```

Students should receive:

```text
403 Forbidden
```

Without an optional admin account configured, verify that a student receives `403`; do not put admin credentials in source code.

---

## Challenge 12 — Security Test Matrix

Complete:

| # | Test | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| 1 | Protected endpoint without login | 401 | | |
| 2 | Incorrect password | Authentication failure | | |
| 3 | Valid login | Success | | |
| 4 | Valid protected request | 200 | | |
| 5 | Other user's resource | Denied | | |
| 6 | Student admin operation | 403/denied | | |
| 7 | Modified JWT | 401 | | |
| 8 | Expired JWT | 401 | | |
| 9 | Logout then protected request | 401 / token invalidation behavior | | |
| 10 | Invalid input | 4xx | | |

---

# Optional Instructor Challenge — Find the Bugs

Open:

```text
vulnerable-api/src/server.js
```

Without running against anything except localhost, identify at least five security weaknesses.

For each:

```text
Problem
↓
Security risk
↓
Potential impact
↓
OWASP category
↓
Mitigation
↓
How would you test the fix?
```

Compare your findings with the Week 6 Lab Sheet Part H case study.

---

# Extension — Secure Login Prototype

Use the secure API as a reference for concepts, but implement your own authentication system as required by the lab.

Minimum:

```text
POST /auth/register
POST /auth/login
GET  /auth/me
GET  /api/protected
POST /auth/logout
```

Your implementation must demonstrate:

- no plaintext passwords
- password hashing
- secure verification
- authentication
- server-side authorization
- no password/hash leakage
- no hardcoded secrets
- input validation
- safe errors
- Postman security testing

See the official Week 6 Lab Sheet for submission evidence and reflection requirements.


---

# Session Challenge — Inspect the Cookie

Use:

```text
http://localhost:3002
```

1. Login as Alice.
2. Inspect the session cookie in Postman.
3. Record its name.
4. Identify the `HttpOnly` and `SameSite` attributes.
5. Explain why the server can recognize Alice on `/auth/me`.
6. Logout.
7. Call `/api/protected` again.

Question:

> What information is held by the browser, and what authentication state is held by the server?
