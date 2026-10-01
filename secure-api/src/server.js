require("dotenv").config();
const crypto = require("node:crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { users, profiles, tasks, allocateUserId } = require("./store");
const { authenticate, requireRole, revokeToken } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ISSUER = "cbe204-week06";
const dummyPasswordHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 12);

app.use(express.json({ limit: "16kb" }));

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve().then(() => handler(req, res, next)).catch(next);
}

function validCredentials(username, password) {
  return typeof username === "string" &&
    /^[a-zA-Z0-9_.-]{3,50}$/.test(username) &&
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72;
}

function parseId(rawId) {
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function canAccessTask(user, task) {
  return user.role === "admin" || task.ownerId === user.id;
}

function findAccessibleTask(req, res) {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Task ID must be a positive integer" });
    return null;
  }

  const task = tasks.find(candidate => candidate.id === id);
  if (!task || !canAccessTask(req.user, task)) {
    res.status(404).json({ error: "Task not found" });
    return null;
  }
  return task;
}

function validTaskInput(body) {
  if (!isRecord(body)) return false;
  const fields = Object.keys(body);
  if (fields.length === 0) return false;
  if (fields.some(field => !["title", "completed"].includes(field))) return false;
  if (
    body.title !== undefined &&
    (typeof body.title !== "string" || body.title.trim().length === 0 || body.title.trim().length > 200)
  ) {
    return false;
  }
  if (body.completed !== undefined && typeof body.completed !== "boolean") return false;
  return true;
}

app.get("/", (req, res) => {
  res.json({
    name: "CBE204 Week 6 Secure API",
    auth: "JWT",
    message: "Authentication, authorization, and owner-scoped task CRUD"
  });
});

app.post("/auth/register", asyncRoute(async (req, res) => {
  const body = isRecord(req.body) ? req.body : {};
  const { username, password } = body;

  if (!validCredentials(username, password)) {
    return res.status(400).json({
      error: "Username must be 3-50 letters, numbers, dots, underscores or hyphens; password must be 8-72 UTF-8 bytes"
    });
  }

  const normalizedUsername = username.toLowerCase();
  if (users.some(user => user.username === normalizedUsername)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (users.some(user => user.username === normalizedUsername)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const user = {
    id: allocateUserId(),
    username: normalizedUsername,
    role: "student",
    passwordHash
  };
  users.push(user);
  profiles.push({
    id: user.id,
    ownerId: user.id,
    displayName: user.username,
    email: null
  });
  res.status(201).json({ user: publicUser(user) });
}));

app.post("/auth/login", asyncRoute(async (req, res) => {
  const body = isRecord(req.body) ? req.body : {};
  const username = typeof body.username === "string" ? body.username.toLowerCase() : "";
  const password = typeof body.password === "string" && Buffer.byteLength(body.password, "utf8") <= 72
    ? body.password
    : "";
  const user = users.find(candidate => candidate.username === username);
  const valid = await bcrypt.compare(password, user ? user.passwordHash : dummyPasswordHash);

  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {},
    JWT_SECRET,
    {
      algorithm: "HS256",
      subject: String(user.id),
      jwtid: crypto.randomUUID(),
      expiresIn: "15m",
      issuer: ISSUER
    }
  );
  res.json({ message: "Login successful", token, user: publicUser(user) });
}));

app.get("/auth/me", authenticate, (req, res) => {
  const user = users.find(candidate => candidate.id === req.user.id);
  if (!user) return res.status(401).json({ error: "User no longer exists" });
  res.json({ user: publicUser(user) });
});

app.post("/auth/logout", authenticate, (req, res) => {
  revokeToken(req.token);
  res.json({ message: "Logout successful; this token has been revoked" });
});

app.get("/api/protected", authenticate, (req, res) => {
  res.json({
    message: "You reached a protected endpoint",
    authenticatedUser: publicUser(req.user)
  });
});

app.get("/api/profile", authenticate, (req, res) => {
  const profile = profiles.find(candidate => candidate.ownerId === req.user.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ id: profile.id, displayName: profile.displayName, email: profile.email });
});

app.get("/api/users/:id", authenticate, (req, res) => {
  const requestedId = parseId(req.params.id);
  if (requestedId === null) return res.status(400).json({ error: "User ID must be a positive integer" });
  if (req.user.role !== "admin" && req.user.id !== requestedId) {
    return res.status(403).json({ error: "You cannot access another user's resource" });
  }

  const user = users.find(candidate => candidate.id === requestedId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

app.delete("/api/users/:id", authenticate, requireRole("admin"), (req, res) => {
  const requestedId = parseId(req.params.id);
  if (requestedId === null) return res.status(400).json({ error: "User ID must be a positive integer" });
  const index = users.findIndex(candidate => candidate.id === requestedId);
  if (index === -1) return res.status(404).json({ error: "User not found" });

  users.splice(index, 1);
  for (let taskIndex = tasks.length - 1; taskIndex >= 0; taskIndex -= 1) {
    if (tasks[taskIndex].ownerId === requestedId) tasks.splice(taskIndex, 1);
  }
  for (let profileIndex = profiles.length - 1; profileIndex >= 0; profileIndex -= 1) {
    if (profiles[profileIndex].ownerId === requestedId) profiles.splice(profileIndex, 1);
  }
  res.json({ message: "User deleted" });
});

app.get("/api/tasks", authenticate, (req, res) => {
  const visibleTasks = req.user.role === "admin"
    ? tasks
    : tasks.filter(task => task.ownerId === req.user.id);
  res.json({ tasks: visibleTasks });
});

function getTask(req, res) {
  const task = findAccessibleTask(req, res);
  if (task) res.json({ task });
}

app.get("/api/task/:id", authenticate, getTask);
app.get("/api/tasks/:id", authenticate, getTask);

app.post("/api/tasks", authenticate, (req, res) => {
  const body = isRecord(req.body) ? req.body : {};
  if (!validTaskInput(body) || body.title === undefined) {
    return res.status(400).json({ error: "Provide a title (up to 200 characters) and optional boolean completed value" });
  }

  const task = {
    id: Math.max(...tasks.map(candidate => candidate.id), 0) + 1,
    title: body.title.trim(),
    completed: body.completed === undefined ? false : body.completed,
    ownerId: req.user.id
  };
  tasks.push(task);
  res.status(201).json({ task: { ...task } });
});

app.put("/api/tasks/:id", authenticate, (req, res) => {
  const task = findAccessibleTask(req, res);
  if (!task) return;
  const body = isRecord(req.body) ? req.body : {};
  if (!validTaskInput(body)) {
    return res.status(400).json({ error: "Only a non-empty title and/or boolean completed value may be updated" });
  }

  if (body.title !== undefined) task.title = body.title.trim();
  if (body.completed !== undefined) task.completed = body.completed;
  res.json({ task: { ...task } });
});

app.delete("/api/tasks/:id", authenticate, (req, res) => {
  const task = findAccessibleTask(req, res);
  if (!task) return;
  tasks.splice(tasks.indexOf(task), 1);
  res.json({ message: "Task deleted" });
});

app.get("/api/admin", authenticate, requireRole("admin"), (req, res) => {
  res.json({ message: "Welcome administrator" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Secure API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
