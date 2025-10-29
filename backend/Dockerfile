# =========================================================
# Backend Node.js API for unza-engpro
# =========================================================
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only dependency files for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy rest of source code
COPY . .

# Make entrypoint scripts executable
RUN chmod +x ./docker-entrypoint.sh ./wait-for-it.sh

# Expose backend port
EXPOSE 5000

# Use entrypoint to wait for DB before starting
ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
