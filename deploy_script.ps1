Write-Host "Stopping and removing containers, networks, and volumes..."
docker compose down -v

Write-Host "Removing stopped containers..."
docker container prune -f

Write-Host "Removing unused networks..."
docker network prune -f

Write-Host "Removing unused volumes..."
docker volume prune -f

Write-Host "Building and starting containers..."
docker compose up --build -d

Write-Host "Running migrations..."
docker compose exec backend python scripts/migrate.py

Write-Host "Done."