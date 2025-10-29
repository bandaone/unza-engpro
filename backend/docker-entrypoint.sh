#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Applying migrations (if any)..."
npx prisma migrate deploy

echo "Starting backend..."
exec "$@"
