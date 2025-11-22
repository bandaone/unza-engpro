# =========================================================
# Backend Node.js API for unza-engpro
# =========================================================
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install system dependencies (curl for healthchecks)
RUN apk add --no-cache curl

# Install app dependencies
RUN npm ci --only=production

# Install nodemon globally
RUN npm install -g nodemon

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy rest of source code
COPY . .

# Make entrypoint scripts executable
RUN chmod +x ./docker-entrypoint.sh ./wait-for-it.sh

# Expose backend port
EXPOSE 3000

# Use entrypoint to wait for DB before starting
ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
