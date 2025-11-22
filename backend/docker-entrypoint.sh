#!/bin/sh
set -e

# Ensure correct Node.js environment
export NODE_ENV=${NODE_ENV:-production}

echo "Node.js version:"
node --version

echo "NPM version:"
npm --version

echo "Generating Prisma client..."
npx prisma generate

echo "Applying migrations (if any)..."
npx prisma migrate deploy

echo "Checking if coordinator exists..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndSeed() {
  try {
    const count = await prisma.user.count({ where: { role: 'coordinator' } });
    if (count === 0) {
      console.log('No coordinator found. Running seed...');
      await prisma.\$disconnect();
      const { execSync } = require('child_process');
      execSync('node src/scripts/seed.js', { stdio: 'inherit' });
    } else {
      console.log('Coordinator already exists. Skipping seed.');
      await prisma.\$disconnect();
    }
  } catch (error) {
    console.error('Error checking coordinator:', error);
    await prisma.\$disconnect();
    throw error;
  }
}

checkAndSeed().catch((error) => {
  console.error('Failed to ensure coordinator user at startup:', error);
  process.exit(1);
});
"

echo "Starting backend..."
echo "All arguments: $@"

# Check if arguments contain 'npm run'
case "$1" in
  npm)
    # Arguments are already formatted as "npm run dev"
    echo "Running: $@"
    exec "$@"
    ;;
  *)
    # Argument is just the script name like "dev"
    if [ -n "$1" ]; then
      echo "Running: npm run $1"
      exec npm run "$1"
    else
      echo "No argument provided, defaulting to dev"
      exec npm run dev
    fi
    ;;
esac
