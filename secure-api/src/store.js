const bcrypt = require("bcryptjs");

const users = [];
const profiles = [];
const tasks = [];

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

if (adminUsername || adminPassword) {
  if (
    typeof adminUsername !== "string" ||
    !/^[a-zA-Z0-9_.-]{3,50}$/.test(adminUsername) ||
    typeof adminPassword !== "string" ||
    adminPassword.length < 8 ||
    Buffer.byteLength(adminPassword, "utf8") > 72
  ) {
    throw new Error("Set a valid ADMIN_USERNAME and ADMIN_PASSWORD together.");
  }

  users.push({
    id: 101,
    username: adminUsername.toLowerCase(),
    role: "admin",
    passwordHash: bcrypt.hashSync(adminPassword, 12)
  });
}

let nextUserId = Math.max(...users.map(user => user.id), 100) + 1;

function allocateUserId() {
  return nextUserId++;
}

module.exports = { users, profiles, tasks, allocateUserId };
