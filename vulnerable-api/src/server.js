const express = require("express");
const jwt = require("jsonwebtoken");
const { users } = require("./store");

const app = express();
const PORT = 3001;

// INTENTIONALLY VULNERABLE — FOR LOCAL CLASSROOM DEMONSTRATION ONLY.
const JWT_SECRET = "demo-secret-123";

app.use(express.json());

function findUser(username) {
  return users.find(u => u.username === username);
}

app.get("/", (req, res) => {
  res.json({
    name: "CBE204 Week 6 Vulnerable API",
    warning: "Intentionally vulnerable. LOCAL LAB ONLY."
  });
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  const user = {
    id: Math.max(...users.map(u => u.id)) + 1,
    username,
    password,
    role: "student"
  };

  users.push(user);
  res.status(201).json({ user });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = findUser(username);

  // VULNERABILITY: plaintext password comparison + user enumeration.
  if (!user || user.password !== password) {
    return res.status(401).json({
      error: user ? "Wrong password" : "User does not exist"
    });
  }

  // VULNERABILITY: hardcoded secret and overly trusted claims.
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // VULNERABILITY: exposes password.
  res.json({ token, user });
});

function vulnerableAuth(req, res, next) {
  const header = req.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    // VULNERABILITY: detailed implementation error leakage.
    res.status(401).json({ error: err.message, stack: err.stack });
  }
}

app.get("/auth/me", vulnerableAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/protected", vulnerableAuth, (req, res) => {
  res.json({ message: "Protected endpoint", user: req.user });
});

// VULNERABILITY: no ownership check. Any authenticated user can request any ID.
app.get("/api/users/:id", vulnerableAuth, (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// VULNERABILITY: any authenticated user can delete users.
app.delete("/api/users/:id", vulnerableAuth, (req, res) => {
  const index = users.findIndex(u => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "User not found" });

  const [deleted] = users.splice(index, 1); // fixed: capture the removed user first
  res.json({ message: "User deleted", deleted });
});

// Demonstration-only "query" endpoint.
// VULNERABILITY: raw input is concatenated into a pseudo SQL statement.
// No real database is used; the endpoint exists to make the coding flaw visible.
app.get("/api/search", vulnerableAuth, (req, res) => {
  const q = String(req.query.q || "");
  const pseudoQuery = `SELECT * FROM users WHERE username = '${q}'`;

  if (q.includes("'") || /--|\/\*|\bOR\b/i.test(q)) {
    return res.status(500).json({ error: "Database error", query: pseudoQuery });
  }

  const matches = users.filter(u => u.username.includes(q));
  res.json({ query: pseudoQuery, results: matches });
});

app.listen(PORT, () => {
  console.log(`Vulnerable API listening on http://localhost:${PORT}`);
  console.log("WARNING: local classroom demonstration only.");
});
