const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { after, before, test } = require("node:test");
const { once } = require("node:events");

process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "TestAdminPass123!";

const app = require("../src/server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

async function request(method, path, { token, body, rawBody } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || rawBody !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: rawBody === undefined ? (body === undefined ? undefined : JSON.stringify(body)) : rawBody
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test("authentication, task CRUD, ownership, roles, and logout", async () => {
  const noToken = await request("GET", "/api/protected");
  assert.equal(noToken.status, 401);

  const malformedJson = await request("POST", "/auth/register", { rawBody: "{" });
  assert.equal(malformedJson.status, 400);
  assert.deepEqual(malformedJson.body, { error: "Invalid JSON body" });

  const invalidRegistration = await request("POST", "/auth/register", {
    body: { username: "ab", password: "short", role: "admin" }
  });
  assert.equal(invalidRegistration.status, 400);

  const registration = await request("POST", "/auth/register", {
    body: {
      username: "Week6Student",
      password: "StudentPass123!",
      role: "admin"
    }
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.username, "week6student");
  assert.equal(registration.body.user.role, "student");
  assert.equal(JSON.stringify(registration.body).includes("passwordHash"), false);
  assert.equal(JSON.stringify(registration.body).includes("StudentPass123!"), false);

  const duplicate = await request("POST", "/auth/register", {
    body: { username: "WEEK6STUDENT", password: "StudentPass123!" }
  });
  assert.equal(duplicate.status, 409);

  const wrongPassword = await request("POST", "/auth/login", {
    body: { username: "week6student", password: "wrong-password" }
  });
  const unknownUser = await request("POST", "/auth/login", {
    body: { username: "not-a-user", password: "wrong-password" }
  });
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(wrongPassword.body, unknownUser.body);

  const login = await request("POST", "/auth/login", {
    body: { username: "week6student", password: "StudentPass123!" }
  });
  assert.equal(login.status, 200);
  const studentToken = login.body.token;
  const studentId = login.body.user.id;
  assert.equal(login.body.user.role, "student");
  assert.equal(JSON.stringify(login.body).includes("passwordHash"), false);

  const currentUser = await request("GET", "/auth/me", { token: studentToken });
  assert.deepEqual(currentUser.body.user, login.body.user);
  const profile = await request("GET", "/api/profile", { token: studentToken });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.displayName, login.body.user.username);
  const protectedResource = await request("GET", "/api/protected", { token: studentToken });
  assert.equal(protectedResource.status, 200);

  const invalidTask = await request("POST", "/api/tasks", {
    token: studentToken,
    body: { title: " ", ownerId: 101 }
  });
  assert.equal(invalidTask.status, 400);

  const created = await request("POST", "/api/tasks", {
    token: studentToken,
    body: { title: "  Week 5 CRUD task  ", completed: false }
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.task.title, "Week 5 CRUD task");
  assert.equal(created.body.task.ownerId, studentId);
  const taskId = created.body.task.id;

  const listed = await request("GET", "/api/tasks", { token: studentToken });
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.tasks.map(task => task.id), [taskId]);
  const read = await request("GET", `/api/task/${taskId}`, { token: studentToken });
  assert.equal(read.body.task.title, "Week 5 CRUD task");

  const updated = await request("PUT", `/api/tasks/${taskId}`, {
    token: studentToken,
    body: { completed: true }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.task.completed, true);

  const adminLogin = await request("POST", "/auth/login", {
    body: { username: "test-admin", password: "TestAdminPass123!" }
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.token;
  assert.equal(adminLogin.body.user.role, "admin");
  assert.equal((await request("GET", "/api/admin", { token: studentToken })).status, 403);
  assert.equal((await request("GET", "/api/admin", { token: adminToken })).status, 200);

  const adminUserRead = await request("GET", `/api/users/${studentId}`, { token: adminToken });
  assert.equal(adminUserRead.status, 200);
  assert.equal(JSON.stringify(adminUserRead.body).includes("passwordHash"), false);
  const studentOtherUserRead = await request("GET", "/api/users/101", { token: studentToken });
  assert.equal(studentOtherUserRead.status, 403);

  const hiddenTask = await request("GET", `/api/tasks/${taskId}`, { token: adminToken });
  assert.equal(hiddenTask.status, 200);
  const adminTaskList = await request("GET", "/api/tasks", { token: adminToken });
  assert.equal(adminTaskList.body.tasks.some(task => task.id === taskId), true);

  const studentDeleteDenied = await request("DELETE", "/api/users/101", { token: studentToken });
  assert.equal(studentDeleteDenied.status, 403);
  const adminDeleteTask = await request("DELETE", `/api/tasks/${taskId}`, { token: adminToken });
  assert.equal(adminDeleteTask.status, 200);
  assert.equal((await request("GET", `/api/task/${taskId}`, { token: studentToken })).status, 404);

  const logout = await request("POST", "/auth/logout", { token: studentToken });
  assert.equal(logout.status, 200);
  assert.equal((await request("GET", "/api/protected", { token: studentToken })).status, 401);
  assert.equal((await request("GET", "/auth/me", { token: studentToken })).status, 401);

  const expiredToken = jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: String(studentId),
    jwtid: "expired-test-token",
    expiresIn: "1ms",
    issuer: "cbe204-week06"
  });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal((await request("GET", "/api/protected", { token: expiredToken })).status, 401);

  const modifiedToken = `${adminToken}x`;
  assert.equal((await request("GET", "/api/protected", { token: modifiedToken })).status, 401);

  const temporaryRegistration = await request("POST", "/auth/register", {
    body: { username: "temporary", password: "TemporaryPass123!" }
  });
  const temporaryLogin = await request("POST", "/auth/login", {
    body: { username: "temporary", password: "TemporaryPass123!" }
  });
  const temporaryId = temporaryRegistration.body.user.id;
  assert.equal((await request("DELETE", `/api/users/${temporaryId}`, { token: adminToken })).status, 200);

  const replacementRegistration = await request("POST", "/auth/register", {
    body: { username: "replacement", password: "ReplacementPass123!" }
  });
  assert.notEqual(replacementRegistration.body.user.id, temporaryId);
  assert.equal((await request("GET", "/api/protected", { token: temporaryLogin.body.token })).status, 401);
});
