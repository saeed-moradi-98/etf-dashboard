#!/bin/bash

set -e

echo "Stopping and removing containers, networks, and volumes..."
docker compose down -v

echo "Removing stopped containers..."
docker container prune -f

echo "Removing unused networks..."
docker network prune -f

echo "Removing unused volumes..."
docker volume prune -f

echo "Building and starting containers..."
docker compose up --build -d

echo "Waiting for backend container to become ready..."
sleep 10

echo "Running migrations..."
docker compose exec backend python scripts/migrate.py

echo "Done."