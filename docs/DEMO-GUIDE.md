# Week 6 Secure API Demo Guide

This guide uses the final submission API. Start with the setup and database notes in the repository `README.md`; keep the server bound to localhost and use a disposable lab password.

## Run

From `secure-api`, configure a random `JWT_SECRET` of at least 32 bytes in `.env` and start the application:

```powershell
npm start
```

To demonstrate role-based access, configure a unique `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` before starting the server. Registration always creates a student; it cannot assign an administrator role.

## Suggested Postman sequence

Import `postman/CBE204-Week06-Security.postman_collection.json` and set `baseUrl` to `http://localhost:3000`.

1. Run the authentication and CRUD requests in order. Registration chooses a unique student name, login stores its JWT, and the task requests demonstrate Week 5 create/list/read/update/delete behavior.
2. In Security checks, run the missing-token, invalid-registration, invalid-password, modified-token, and malformed-token requests. Observe the expected 4xx responses and generic login error.
3. Register and log in a second student. Use the second token to request the first student's task; the API returns `404` without revealing whether another user's task exists.
4. Try the admin route using the student token (`403`). If an admin account was configured, set `adminUsername` and `adminPassword` in the collection and run the optional admin login and admin-route requests.
5. Run logout, then call the protected endpoint with the same token. Logout revokes the token, so the later request returns `401`.

The collection assertions verify response codes, public user fields, task ownership, and token revocation. The automated equivalent is `npm test` from `secure-api`.

## Submission evidence

Capture your own Postman screenshots or exports after running the checks. Ensure screenshots do not expose reusable passwords or tokens. Write the reflection from your own test results; this repository does not supply fabricated evidence or personal answers.

## Limitations to explain

The data store and logout revocation list are in memory and reset when the server restarts. The example is single-process and local-only; production use needs persistent storage and shared revocation/session handling, HTTPS, rate limits, and managed secrets.
