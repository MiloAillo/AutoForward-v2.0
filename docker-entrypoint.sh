#!/bin/sh
set -e

echo "[Docker] Generating Prisma Client..."
npx prisma generate

echo "[Docker] Running Prisma migrations..."
npx prisma migrate deploy

echo "[Docker] Starting AutoForward application..."
exec npx tsx index.ts
