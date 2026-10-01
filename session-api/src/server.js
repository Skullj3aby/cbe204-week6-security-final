const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { users, profiles } = require("./store");

const app = express();
const PORT = process.env.PORT || 3002;

// Secret comes from the environment; a random per-start value is used for the
// classroom demo if none is set (the in-memory sessions are lost on restart anyway).
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

app.use(express.json());
app.use(
  session({
    name: "cbe204.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,   // JavaScript in the browser cannot read the cookie
      sameSite: "lax",  // limits cross-site sending (CSRF mitigation)
      secure: false,    // local HTTP classroom demo only; use true behind HTTPS
      maxAge: 15 * 60 * 1000
    }
  })
);

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function requireLogin(req, res, next) {
  const user = req.session && users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

app.get("/", (req, res) => {
  res.json({
    name: "CBE204 Week 6 Session API",
    auth: "Session + HttpOnly cookie",
    message: "Server-side session demonstration"
  });
});

app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" ||
      username.length < 3 || username.length > 50 ||
      password.length < 8 || password.length > 128) {
    return res.status(400).json({
      error: "Username must be 3-50 characters and password must be 8-128 characters"
    });
  }
  if (users.some(u => u.username === username)) {
    return res.status(409).json({ error: "Username already exists" });
  }
  const user = {
    id: Math.max(...users.map(u => u.id), 100) + 1,
    username,
    role: "student",
    passwordHash: await bcrypt.hash(password, 12)
  };
  users.push(user);
  res.status(201).json({ user: publicUser(user) });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = typeof username === "string" ? users.find(u => u.username === username) : undefined;

  if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Regenerate the session ID on login to prevent session fixation.
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Internal server error" });
    req.session.userId = user.id;
    res.json({ message: "Login successful", user: publicUser(user) });
  });
});

app.get("/auth/me", requireLogin, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post("/auth/logout", requireLogin, (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Internal server error" });
    res.clearCookie("cbe204.sid");
    res.json({ message: "Logged out; server-side session destroyed" });
  });
});

app.get("/api/protected", requireLogin, (req, res) => {
  res.json({ message: "You reached a protected endpoint", authenticatedUser: publicUser(req.user) });
});

app.get("/api/profile", requireLogin, (req, res) => {
  const profile = profiles.find(p => p.ownerId === req.user.id);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json({ id: profile.id, displayName: profile.displayName, email: profile.email });
});

app.get("/api/users/:id", requireLogin, (req, res) => {
  const id = Number(req.params.id);
  if (req.user.role !== "admin" && req.user.id !== id) {
    return res.status(403).json({ error: "You cannot access another user's resource" });
  }
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

app.delete("/api/users/:id", requireLogin, requireRole("admin"), (req, res) => {
  const index = users.findIndex(u => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "User not found" });
  users.splice(index, 1);
  res.json({ message: "User deleted" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Session API listening on http://localhost:${PORT}`);
});
