# Instructor Demo Guide — Week 6

## Before class

Open two terminals.

### Terminal 1 — vulnerable

```bash
cd vulnerable-api
npm install
npm start
```

### Terminal 2 — secure

```bash
cd secure-api
npm install
cp .env.example .env
# Edit .env and set JWT_SECRET to a local random value.
npm start
```

Use Postman with two collection variables:

```text
vulnerableBaseUrl = http://localhost:3001
secureBaseUrl = http://localhost:3000
```

---

## Demo 1 — Authentication vs Authorization

Use Alice:

```text
alice / alice123
```

Login and show that Alice can obtain a token.

Ask:

> Does possession of a valid token mean Alice should be allowed to delete Bob?

Then compare:

```text
Authentication: Who is Alice?
Authorization: What is Alice allowed to do?
```

---

## Demo 2 — Plaintext Passwords

Open:

```text
vulnerable-api/src/store.js
```

Show:

```javascript
password: "alice123"
```

Then open:

```text
secure-api/src/store.js
```

Show:

```javascript
passwordHash: ...
```

Explain that the secure version hashes passwords during registration and verifies them during login.

Do not present SHA-256 as a password-storage solution. The demo uses bcryptjs.

---

## Demo 3 — Broken Access Control / IDOR

Login as Alice.

Request:

```http
GET http://localhost:3001/api/users/102
Authorization: Bearer <Alice token>
```

The vulnerable API returns Bob.

Then perform the same request against:

```http
GET http://localhost:3000/api/users/102
Authorization: Bearer <Alice token>
```

The secure API denies Alice.

Ask:

> What changed? Authentication did not change. Authorization did.

---

## Demo 4 — Admin Authorization

Alice attempts:

```http
DELETE /api/users/103
```

### Vulnerable API

The request is accepted because the endpoint only checks authentication.

### Secure API

The request returns:

```text
403 Forbidden
```

Bob, the admin, can perform the operation.

---

## Demo 5 — JWT Inspection

Login and copy the JWT.

Show:

```text
HEADER.PAYLOAD.SIGNATURE
```

Decode the header and payload.

Ask:

> Is the payload secret?

Expected learning point:

- It is encoded, not normally encrypted.
- Do not put passwords or unnecessary sensitive data in the payload.
- The signature is used to detect unauthorized modification.

---

## Demo 6 — Modified JWT

Take a valid token and alter a character.

Send it to:

```http
GET /api/protected
```

Secure API:

```text
401 Unauthorized
```

Explain:

```text
Token
 ↓
Signature verification
 ↓
Invalid
 ↓
Reject
```

---

## Demo 7 — Expired JWT

The secure application uses a short token lifetime.

For a classroom demonstration, temporarily change:

```javascript
expiresIn: "15m"
```

to a very short lifetime such as:

```javascript
expiresIn: "5s"
```

Restart, login, wait, and call `/api/protected`.

Expected:

```text
401 Unauthorized
```

Restore the normal value after the demo.

---

## Demo 8 — Hardcoded Secret

Open the vulnerable server:

```javascript
const JWT_SECRET = "demo-secret-123";
```

Ask:

1. Where is the secret?
2. Who can read the source?
3. What happens if source code is committed to Git?
4. How should the secure implementation obtain the secret?

Then show:

```javascript
process.env.JWT_SECRET
```

---

## Demo 9 — Verbose Errors

Send a malformed token to the vulnerable API.

Show the response containing implementation details/stack information.

Then compare the secure response:

```json
{
  "error": "Invalid or expired token"
}
```

Teaching point:

> Client errors should be useful without unnecessarily exposing internal implementation details.

---

## Demo 10 — Postman Security Mindset

For every protected endpoint ask:

1. Who is allowed to call this?
2. What are they allowed to do?
3. What happens without authentication?
4. What happens without authorization?
5. What happens with malformed input?
6. What sensitive information could the response reveal?
7. How can we test each assumption?

---

## Demo-to-Lab Mapping

| Demo | Lab |
|---|---|
| AuthN/AuthZ | A, E |
| Plaintext vs hash | B |
| JWT | D |
| Broken access control | F |
| Secure coding | G |
| Vulnerable case study | H |
| Postman | I |
| Security mindset | J |
| Secure Login Prototype | K–M |


---

## Demo 11 — Sessions & Cookies

Start:

```bash
cd session-api
npm install
npm start
```

Server:

```text
http://localhost:3002
```

Login as Alice using Postman.

Open Postman's cookie manager and inspect:

```text
cbe204.sid
```

Discuss:

- `HttpOnly`
- `SameSite=Lax`
- `Secure=false` for this local HTTP-only classroom demo

Then call:

```http
GET /auth/me
GET /api/protected
```

without manually adding an Authorization header.

Postman sends the session cookie.

### Logout

Call:

```http
POST /auth/logout
```

Then:

```http
GET /api/protected
```

Expected:

```text
401 Unauthorized
```

Explain the difference from the JWT demo:

```text
Session:
server stores authenticated state

JWT:
token carries claims and server verifies the signature
```

Do not imply that one mechanism is automatically more secure.
