#!/bin/bash
# Railway initialization script - creates demo user

# Wait for database to be ready
echo "Waiting for database..."
for i in {1..30}; do
  if nc -z localhost 3306 2>/dev/null; then
    echo "Database ready!"
    break
  fi
  echo "Attempt $i - database not ready, waiting..."
  sleep 2
done

# Run migrations
echo "Running database setup..."
node dist/index.js --setup-db

# Create demo user if it doesn't exist
# This will be done by the application startup

echo "Railway setup complete!"
