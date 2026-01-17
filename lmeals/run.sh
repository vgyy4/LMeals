#!/bin/bash
set -e

# Define the database path in the persistent data directory
export DATABASE_URL="sqlite:////data/lmeals.db"

# Run migrations
echo "Running migrations..."
alembic upgrade head

# Start the application
echo "Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
