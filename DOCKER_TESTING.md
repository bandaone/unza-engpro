# Docker Testing Guide

This guide explains how to test the entire UNZA EngPro stack using Docker.

## Prerequisites

1. Docker installed on your machine
2. Docker Compose installed on your machine
3. Git (to clone the repository)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd unza-engpro
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy the example .env file
   cp .env.example .env

   # Edit the .env file with your preferred values
   # Make sure to change the passwords!
   ```

3. **Build and Start the Stack**
   ```bash
   # Build all containers
   docker-compose build

   # Start the stack
   docker-compose up -d
   ```

4. **Initialize the Database**
   ```bash
   # Run database migrations
   docker-compose exec backend npx prisma migrate deploy
   ```

## Accessing the Application

- Frontend: http://localhost
- Backend API: http://localhost/api
- Database: localhost:3306 (for external tools)

## Testing the Stack

1. **Check Container Status**
   ```bash
   docker-compose ps
   ```

2. **View Container Logs**
   ```bash
   # All containers
   docker-compose logs

   # Specific container
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs db
   ```

3. **Test Database Connection**
   ```bash
   docker-compose exec db mysql -u engpro_user -p
   ```

## Common Tasks

1. **Rebuild a Specific Service**
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

2. **Restart Services**
   ```bash
   docker-compose restart
   ```

3. **View Backend Logs in Real-time**
   ```bash
   docker-compose logs -f backend
   ```

4. **Access Backend Container Shell**
   ```bash
   docker-compose exec backend sh
   ```

## Troubleshooting

1. **Database Connection Issues**
   - Check if the database container is running:
     ```bash
     docker-compose ps db
     ```
   - Verify environment variables in .env file
   - Check database logs:
     ```bash
     docker-compose logs db
     ```

2. **Frontend Not Loading**
   - Check nginx configuration
   - Verify frontend build process
   - Check frontend container logs:
     ```bash
     docker-compose logs frontend
     ```

3. **Backend API Issues**
   - Check backend logs:
     ```bash
     docker-compose logs backend
     ```
   - Verify database connectivity
   - Check environment variables

## Cleanup

1. **Stop the Stack**
   ```bash
   docker-compose down
   ```

2. **Remove All Data (including database)**
   ```bash
   docker-compose down -v
   ```

3. **Remove Built Images**
   ```bash
   docker-compose down --rmi all
   ```

## Development Workflow

1. **Live Frontend Development**
   ```bash
   # Stop the frontend container
   docker-compose stop frontend

   # Run frontend locally
   cd frontend
   npm install
   npm start
   ```

2. **Backend Development**
   ```bash
   # Use docker-compose.override.yml for development settings
   # Example: mounting source code as volume
   ```

## Performance Testing

1. **Load Testing**
   ```bash
   # Install k6
   docker run --rm -i grafana/k6 run - <script.js
   ```

2. **Monitor Resource Usage**
   ```bash
   docker stats
   ```

## Security Notes

1. Change all default passwords in .env file
2. Use secure values for JWT_SECRET
3. Don't expose database port in production
4. Use HTTPS in production environment

## Backup

1. **Database Backup**
   ```bash
   docker-compose exec db mysqldump -u root -p unza_engpro > backup.sql
   ```

2. **Restore Database**
   ```bash
   docker-compose exec -T db mysql -u root -p unza_engpro < backup.sql
   ```