#!/usr/bin/env bash
set -e
echo "Installing CBE204 Week 6 demo dependencies..."
(cd secure-api && npm install)
(cd vulnerable-api && npm install)
(cd session-api && npm install)
if [ ! -f secure-api/.env ]; then
  SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
  printf 'JWT_SECRET=%s\nPORT=3000\n' "$SECRET" > secure-api/.env
  echo "Created secure-api/.env with a random JWT_SECRET"
fi
echo
echo "Start the APIs in separate terminals:"
echo "  cd secure-api     && npm start   # http://localhost:3000"
echo "  cd vulnerable-api && npm start   # http://localhost:3001"
echo "  cd session-api    && npm start   # http://localhost:3002"
