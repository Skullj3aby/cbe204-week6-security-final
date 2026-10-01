const jwt = require("jsonwebtoken");
const { users } = require("../store");

const JWT_SECRET = process.env.JWT_SECRET;
const ISSUER = "cbe204-week06";
const revokedTokens = new Map();

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET must contain at least 32 bytes. Set it in your local .env file.");
}

function authenticate(req, res, next) {
  const header = req.get("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER
    });

    for (const [tokenId, expiresAt] of revokedTokens) {
      if (expiresAt <= Date.now()) revokedTokens.delete(tokenId);
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.jti !== "string" ||
      !Number.isInteger(payload.exp) ||
      revokedTokens.has(payload.jti)
    ) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = users.find(candidate => candidate.id === Number(payload.sub));
    if (!user) return res.status(401).json({ error: "Invalid or expired token" });

    req.user = { id: user.id, username: user.username, role: user.role };
    req.token = { id: payload.jti, expiresAt: payload.exp * 1000 };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function revokeToken(token) {
  revokedTokens.set(token.id, token.expiresAt);
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, revokeToken };
