#!/bin/bash
set -e

# Define the database path in the persistent data directory
export DATABASE_URL="sqlite:////data/lmeals.db"

# List files to verify deployment
echo "Current directory: $(pwd)"
ls -R

# Run migrations
echo "Running migrations..."
alembic upgrade head || { echo "Migrations failed!"; exit 1; }

# Start the application
echo "Starting application..."
uvicorn main:app --host 0.0.0.0 --port 8000 || { echo "Uvicorn failed!"; sleep 3600; }
