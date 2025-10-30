# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/ .

# Build the static files
RUN npm run build

# Stage 2: Build the backend and serve the frontend
FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY backend/ .

# Copy the HODs csv file for user seeding
COPY hods.csv .

# Copy the built frontend from the builder stage
COPY --from=frontend-builder /app/frontend/dist /app/static

# Expose the port the app runs on
EXPOSE 8000

# Run the application
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
