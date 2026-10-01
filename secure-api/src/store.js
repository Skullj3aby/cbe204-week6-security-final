const bcrypt = require("bcryptjs");

const users = [
  { id: 101, username: "alice", role: "student", passwordHash: bcrypt.hashSync("alice123", 10) },
  { id: 102, username: "bob",   role: "admin",   passwordHash: bcrypt.hashSync("admin123", 10) },
  { id: 103, username: "john",  role: "student", passwordHash: bcrypt.hashSync("john123", 10) }
];

const profiles = [
  { id: 101, ownerId: 101, displayName: "Alice Student", email: "alice@example.local" },
  { id: 102, ownerId: 102, displayName: "Bob Admin",     email: "bob@example.local" },
  { id: 103, ownerId: 103, displayName: "John Student",  email: "john@example.local" }
];

module.exports = { users, profiles };
