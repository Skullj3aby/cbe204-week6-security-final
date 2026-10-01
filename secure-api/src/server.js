require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { users, profiles } = require("./store");
const { authenticate, requireRole } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function validCredentials(username, password) {
  return typeof username === "string" &&
    typeof password === "string" &&
    username.length >= 3 &&
    username.length <= 50 &&
    password.length >= 8 &&
    password.length <= 128;
}

app.get("/", (req, res) => {
  res.json({
    name: "CBE204 Week 6 Secure API",
    auth: "JWT",
    message: "Authentication and authorization demonstration"
  });
});

app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body || {};

  if (!validCredentials(username, password)) {
    return res.status(400).json({
      error: "Username must be 3-50 characters and password must be 8-128 characters"
    });
  }

  if (users.some(u => u.username === username)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: Math.max(...users.map(u => u.id), 100) + 1,
    username,
    role: "student",
    passwordHash
  };

  users.push(user);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = typeof username === "string" ? users.find(u => u.username === username) : undefined;

  // Deliberately generic response: do not reveal whether the username exists.
  if (!user || typeof password !== "string") {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { subject: String(user.id), expiresIn: "15m", issuer: "cbe204-week06" }
  );

  res.json({ message: "Login successful", token, user: publicUser(user) });
});

app.get("/auth/me", authenticate, (req, res) => {
  const user = users.find(u => u.id === Number(req.user.id));
  if (!user) return res.status(401).json({ error: "User no longer exists" });
  res.json({ user: publicUser(user) });
});

app.post("/auth/logout", authenticate, (req, res) => {
  // JWTs are stateless in this demo. Client should discard the token.
  res.json({ message: "Logout acknowledged; discard the token on the client" });
});

app.get("/api/protected", authenticate, (req, res) => {
  res.json({ message: "You reached a protected endpoint", authenticatedUser: req.user });
});

app.get("/api/profile", authenticate, (req, res) => {
  const profile = profiles.find(p => p.ownerId === Number(req.user.id));
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ id: profile.id, displayName: profile.displayName, email: profile.email });
});

app.get("/api/users/:id", authenticate, (req, res) => {
  const requestedId = Number(req.params.id);

  // Students may only see their own resource. Admins may access any user.
  if (req.user.role !== "admin" && Number(req.user.id) !== requestedId) {
    return res.status(403).json({ error: "You cannot access another user's resource" });
  }

  const user = users.find(u => u.id === requestedId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

app.delete("/api/users/:id", authenticate, requireRole("admin"), (req, res) => {
  const requestedId = Number(req.params.id);
  const index = users.findIndex(u => u.id === requestedId);
  if (index === -1) return res.status(404).json({ error: "User not found" });

  users.splice(index, 1);
  res.json({ message: "User deleted" });
});

// Challenge 11 (solution): admin-only endpoint
app.get("/api/admin", authenticate, requireRole("admin"), (req, res) => {
  res.json({ message: "Welcome administrator" });
});

// Malformed JSON bodies and other errors: safe response, no stack traces.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Secure API listening on http://localhost:${PORT}`);
});
