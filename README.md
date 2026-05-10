# ETF Dashboard — Production Scale

A production-grade single-page ETF analytics dashboard built with React,
FastAPI, TimescaleDB, Redis, Docker, and Kubernetes. Includes HTTPS, JWT
authentication, input validation, structured logging, rate limiting, retry
logic, automated tests, and a CI/CD pipeline.

---

## Table of Contents

1. [What's Been considered](#whats-been-considered)
2. [Architecture](#architecture)
3. [Setup](#setup)
3. [Tech Stack](#tech-stack)
4. [Security](#security)
5. [Assumptions](#assumptions)
6. [Project Structure](#project-structure)
7. [Prerequisites](#prerequisites)
8. [Option A — Docker Compose](#option-a--docker-compose-recommended)
9. [Option C — No Docker (dev only)](#option-c--no-docker-dev-only)
10. [Using the App](#using-the-app)
11. [Running Tests](#running-tests)
12. [API Reference](#api-reference)
13. [Switching Between Projects](#switching-between-projects)
14. [Troubleshooting](#troubleshooting)

---

## What's Been considered

| Gap | Solution |
|-----|----------|
| HTTPS | Nginx terminates TLS on port 443, redirects HTTP to HTTPS |
| Authentication | JWT tokens (30min expiry) replace shared API key |
| Input validation | CSV validated for columns, size, weight types, weight sum |
| Structured logging | JSON logs on every request, login, and cache hit/miss |
| Rate limiting | slowapi (30 req/min per IP) inside the backend |
| DB retry logic | tenacity retries DB connection up to 5x with exponential backoff |
| DB query timeout | 30-second command_timeout on all queries |
| Token persistence | JWT stored in sessionStorage, survives page refresh |
| CORS locked | Only allows configured origins, not wildcard |
| Tests | 10 pytest tests covering all CSV validation cases |
| CI/CD | GitHub Actions runs tests and Docker build on every push |


## Architecture

```
     Browser
        |
        v HTTPS (port 443)
      Nginx
      |-- GET /        -> React SPA (static files)
      +-- POST /api/*  -> FastAPI backend (Gunicorn x 4 workers)
                          |
                 +--------+--------+
                 v                 v
               Redis          TimescaleDB
            (1hr cache)    (time-series prices)
```

In Kubernetes, the backend runs as 3 replicas with a HorizontalPodAutoscaler
that scales up to 8 replicas when CPU exceeds 60%.

## Setup

Before reading this section, please read the following notes:

1. You may need Sudo privilege if you are running the project on Linux. if you don't have permission to run Docker daemon, consider switching to a user with Sudo access. To have root access, run:
```bash
sudo su
```
2. You may not have permission to execute the command. To run the script on Mac/Linux, please run:
```bash
sudo chmod +x deploy_script.sh
```
in the app's root directory.

3. (VERY IMPORTANT) The scripts described below effectively remove ALL unused docker volumes, networks and stopped containers GLOBALLY. This prevents potential port conflicts with other services. If you already have any of the services running on your local machine, either stop those containers or run this app on a Virtual Machine like Oracle VirtualBox.

I have automated the entire setup by creating two scripts for deploying the entire application. If you are using Windows, please open Windows Terminal in the app's root directory (PATH_TO_ROOT_DIRECTORY/etf-prod) and simply run
```bash
.\deploy_script.ps1
```
If you are using Mac/Linux, please run the following command in the app's root directory (PATH_TO_ROOT_DIRECTORY/etf-prod) and run:
```bash
./deploy_script.sh
```
Please note that you do NOT need to install anything manually as long as the following technologies are installed:
- Docker
- Node.js
- Python
- React
- Vite

## Tech Stack

| Layer         | Technology                     | Why                                            |
|---------------|--------------------------------|------------------------------------------------|
| Frontend      | React + Vite + Recharts        | Fast SPA, excellent charting library           |
| Backend       | FastAPI + Gunicorn (4 workers) | Async Python, multiple concurrent workers      |
| Database      | TimescaleDB (PostgreSQL)       | Optimised for time-series price queries        |
| Cache         | Redis                          | Avoids recomputing ETF prices on every request |
| Reverse proxy | Nginx                          | Serves frontend, proxies API, terminates TLS   |
| Containers    | Docker + Docker Compose        | Reproducible local environment                 |
| Orchestration | Kubernetes (minikube)          | Scaling, health checks, rolling deploys        |

## Security

- HTTPS enforced: HTTP requests are redirected to HTTPS via Nginx
- `/docs`, `/redoc`, and `/openapi.json` are disabled when `APP_ENV=production`
- All `/api/*` routes require a valid JWT token, missing or expired tokens return `401 Unauthorized`
- JWT tokens expire after 30 minutes and are stored in sessionStorage (cleared on tab close)
- CORS is locked to specific origins via the `ALLOWED_ORIGINS` environment variable
- Rate limiting via slowapi (30 requests/minute per IP)
- The backend is never directly exposed. Instead, all traffic goes through Nginx

## Assumptions

- ETF weights are constant over time (as stated in the task description).
- Constituents with missing or zero weights do NOT contribute to the ETF price sum.
- `prices.csv` is a one-time historical snapshot migrated to TimescaleDB once (it needs re-migration only when you delete the Docker volumes).
- In a real production environment, JWT secrets and DB credentials would be
  managed via a secrets manager such as AWS Secrets Manager or Kubernetes
  Sealed Secrets and never committed to Git (they are shared here to help with testing the app).

## Project Structure

```
etf-prod/
+-- .github/
|   +-- workflows/
|       +-- ci.yml               # CI/CD: runs tests and Docker build on every push
+-- backend/
|   +-- app/
|   |   +-- api/
|   |   |   +-- auth.py          # JWT token creation and verification
|   |   |   +-- routes.py        # All API endpoints with validation and logging
|   |   +-- cache/
|   |   |   +-- redis_client.py  # Redis get/set with graceful fallback
|   |   +-- db/
|   |   |   +-- connection.py    # asyncpg pool with retry and timeout
|   |   |   +-- queries.py       # All TimescaleDB queries
|   |   +-- logger.py            # Structured JSON logging
|   |   +-- main.py              # FastAPI app, middleware, rate limiting
|   +-- scripts/
|   |   +-- migrate.py           # One-time CSV to TimescaleDB migration
|   +-- tests/
|   |   +-- test_validation.py   # 10 pytest tests for CSV validation
|   +-- data/                    # Data samples for interacting with the app
|   |   +-- ETF1.csv
|   |   +-- ETF2.csv
|   |   +-- prices.csv
|   +-- Dockerfile
|   +-- requirements.txt          # Tools that need to be installed
+-- frontend/
|   +-- src/
|   |   +-- components/           # React component
|   |   |   +-- ETFPriceChart.jsx
|   |   |   +-- HoldingsTable.jsx
|   |   |   +-- Skeleton.jsx
|   |   |   +-- TopHoldingsBar.jsx
|   |   |   +-- UploadCSV.jsx
|   |   +-- App.jsx              # Login form, JWT handling, pagination
|   |   +-- index.css
|   |   +-- main.jsx
|   +-- index.html
|   +-- nginx.conf               # Nginx config: HTTPS, proxy, static files
|   +-- Dockerfile
|   +-- package.json
|   +-- vite.config.js
+-- nginx/
|   +-- nginx.conf               # Master Nginx config (mirrors frontend/nginx.conf)
|   +-- certs/
|       +-- self-signed.crt      # Pre-generated self-signed certificate
|       +-- self-signed.key
+-- k8s/
|   +-- namespace.yaml
|   +-- secrets.yaml
|   +-- timescaledb.yaml
|   +-- redis.yaml
|   +-- backend.yaml             # Includes HorizontalPodAutoscaler
|   +-- frontend.yaml            # Includes Ingress
+-- docker-compose.yml
+-- .gitignore
+-- README.md
```

## Prerequisites

### For Docker Compose (Recommended)

- `Docker Desktop`

### For local dev without Docker

- Python 3.11+
- Node.js 18+
- Docker Desktop (only for running TimescaleDB and Redis as standalone containers)

## Option A — Docker Compose (Recommended)

### Step 1 — Make sure Docker Desktop is running

```bash
docker info
```

If this prints system information, Docker is ready. If it errors, open Docker
Desktop and wait for the a few seconds and retry in the command above.

### Step 2 — Navigate to the project root

```bash
cd etf-prod
```

Make sure you are in the folder that contains `docker-compose.yml`. Run `ls`
(Mac/Linux) or `dir` (Windows) and confirm you can see `docker-compose.yml`,
`backend/`, `frontend/`, `nginx/`, and `k8s/`.

### Step 3 — SSL certificate

A self-signed certificate is already included in `nginx/certs/`. You do not
need to generate one. If the files are missing for any reason, regenerate them:

**Mac/Linux:**
```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/self-signed.key \
  -out nginx/certs/self-signed.crt \
  -subj "/C=CA/ST=Manitoba/L=Winnipeg/O=ETF/CN=localhost"
```

**Windows (PowerShell with OpenSSL installed):**
```powershell
mkdir nginx\certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout nginx\certs\self-signed.key `
  -out nginx\certs\self-signed.crt `
  -subj "/C=CA/ST=Manitoba/L=Winnipeg/O=ETF/CN=localhost"
```

### Step 4 — Start all services

```bash
docker compose up --build
```

This builds and starts four containers: `etf_db`, `etf_redis`, `etf_backend`,
`etf_frontend`. Verify all four are running in a new terminal:

```bash
docker ps
```

All four should show status `Up`. If any show `Exited`, see
[Troubleshooting](#troubleshooting) below.

### Step 5 — Run the database migration (one time only)

```bash
docker compose exec backend python scripts/migrate.py
```

Expected output:
```
Connecting to database...
Enabling TimescaleDB extension...
Creating prices table...
Creating hypertable...
Creating index...
Loading prices.csv...
Inserting X rows...
Migration complete! X rows inserted.
```

Note: You only need to run this ONCE. If you later run `docker compose down -v`
which deletes volumes, you will need to run it again.

### Step 6 — Open the app

Open **https://localhost** in your browser.

Your browser will show a certificate warning because the cert is self-signed.
This is expected for local development. Proceed past it:

- Chrome: "Advanced" then "Proceed to localhost (unsafe)"
- Firefox: "Advanced" then "Accept the Risk and Continue"
- Edge: "Advanced" then "Continue to localhost (unsafe)"

### Step 7 — Sign in and upload

Use the demo credentials:

| Username | Password      | Role   |
|----------|---------------|--------|
| trader1  | password123   | trader |
| admin    | adminpassword | admin  |

Then upload `ETF1.csv` or `ETF2.csv` from the `backend/data/` folder.

## Option C — No Docker (dev only)

### Backend

```bash
cd backend
python -m venv venv

# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

Start TimescaleDB and Redis as standalone Docker containers:

```bash
docker run -d -p 5433:5432 \
  -e POSTGRES_USER=etfuser \
  -e POSTGRES_PASSWORD=etfpassword \
  -e POSTGRES_DB=etfdb \
  timescale/timescaledb:latest-pg15

docker run -d -p 6380:6379 redis:7-alpine
```

Run the migration:

```bash
DATABASE_URL=postgresql://etfuser:etfpassword@localhost:5433/etfdb \
  python scripts/migrate.py
```

Start the backend:

```bash
DATABASE_URL=postgresql://etfuser:etfpassword@localhost:5433/etfdb \
REDIS_URL=redis://localhost:6380 \
JWT_SECRET_KEY=local-dev-secret \
APP_ENV=development \
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with `trader1` / `password123`.

## Using the App

1. Open https://localhost (Docker Compose) or http://localhost:5173 (dev mode)
2. Sign in using the demo credentials shown above
3. Your session persists across page refreshes via JWT stored in sessionStorage.
   It expires after 30 minutes and you will be returned to the login screen automatically
4. Upload `ETF1.csv` or `ETF2.csv` from `backend/data/`
5. The app shows three sections:
   - Holdings table: paginated at 10 per page, sortable by any column,
     filterable by name, with inline mini bar charts and CSV export
   - ETF price history: reconstructed weighted sum with a dual date range
     slider to zoom into any period
   - Top 5 holdings: bar chart sorted by holding size (weight x latest price)

## Running Tests

```bash
cd backend
python -m venv venv

# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
pytest tests/ -v
```

Expected output:
```
tests/test_validation.py::test_valid_csv_passes PASSED
tests/test_validation.py::test_weights_summing_to_one_passes PASSED
tests/test_validation.py::test_missing_weight_column_raises_400 PASSED
tests/test_validation.py::test_missing_name_column_raises_400 PASSED
tests/test_validation.py::test_weights_not_summing_to_one_raises_422 PASSED
tests/test_validation.py::test_null_weights_raise_422 PASSED
tests/test_validation.py::test_non_numeric_weights_raise_422 PASSED
tests/test_validation.py::test_empty_csv_raises_400 PASSED
tests/test_validation.py::test_file_too_large_raises_400 PASSED
tests/test_validation.py::test_weights_within_tolerance_passes PASSED

10 passed
```

## API Reference

All endpoints except `/health` require: `Authorization: Bearer <token>`

Get a token:
```bash
curl -X POST https://localhost/api/auth/token \
  -k \
  -d "username=trader1&password=password123"
```

Use it:
```bash
curl -X POST https://localhost/api/etf/top5 \
  -k \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@backend/data/ETF1.csv"
```

| Method | Endpoint | Query params | Description |
|--------|----------|--------------|-------------|
| POST | `/api/auth/token` | — | Get JWT token (form: username, password) |
| GET  | `/api/auth/me` | — | Get current user info |
| POST | `/api/etf/holdings` | `page`, `page_size` | Paginated holdings table |
| POST | `/api/etf/prices` | `date_from`, `date_to` | ETF price time series |
| POST | `/api/etf/top5` | — | Top 5 holdings by holding size |
| GET  | `/health` | — | Health check, no auth required |

API docs (development mode only): https://localhost/docs

## Switching Between Projects

### Stop this project cleanly
```bash
docker compose down
```

### Start again without rebuilding
```bash
docker compose up
```

### Full reset including database volumes
```bash
docker compose down -v
docker compose up --build
docker compose exec backend python scripts/migrate.py
```

## Troubleshooting

### Browser shows certificate warning
Click "Advanced" then "Proceed to localhost (unsafe)". In production however, you
would use a `Let's Encrypt` certificate via `Certbot` instead of a self-signed one.

### Docker Desktop is not running
Symptom:
```
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```
Fix: Open Docker Desktop from the Start Menu. After couple of seconds, run `docker info` (or simply `docker`) to confirm it is up and running.

### Port already allocated
If you have ever encounter this error, you need to terminate the processes that are using those ports. Most likely, it's from another app that uses the same tools that listen on the same ports.
```
Bind for 0.0.0.0:6379 failed: port is already allocated
```
`docker-compose.yml` maps Redis to host port `6380` and TimescaleDB to `5433`
to avoid the most common conflicts. If you still see this error:

```bash
# Find the PID using the conflicting port
netstat -ano | findstr :6379

# Kill it (Windows) replacing 1234 with the actual PID
taskkill /PID 1234 /F
```

Do not kill the Docker Desktop process itself — that stops Docker entirely.

### Containers not on the same network
Symptom:
```
socket.gaierror: [Errno -2] Name or service not known
```
`etf_db` or `etf_redis` crashed on startup and are not on the Docker network.
Check which containers are running:

```bash
docker ps -a
```

If any show `Exited`, do a full clean reset:

```bash
docker compose down -v
docker container prune -f
docker network prune -f
docker volume prune -f
docker compose up --build
```

Verify all four containers appear on the network:
```bash
docker network inspect etf-prod_etf-network
```

### Backend crashes on startup (Worker failed to boot)
Symptom:
```
gunicorn.errors.HaltServer: <HaltServer 'Worker failed to boot.' 3>
```
Check the full logs for the actual cause:
```bash
docker compose logs backend --tail=50
```

Common causes:

- bcrypt version conflict: make sure `requirements.txt` pins
  `passlib==1.7.4` and `bcrypt==4.0.1`
- Missing environment variables: confirm `DATABASE_URL`, `REDIS_URL`,
  and `JWT_SECRET_KEY` are all set under the backend service in `docker-compose.yml`
- Database not ready: run `docker compose down -v` and start again

### Table does not exist
Symptom:
```
asyncpg.exceptions.UndefinedTableError: relation "prices" does not exist
```
The migration has not been run. Run it:
```bash
docker compose exec backend python scripts/migrate.py
```

### 401 Unauthorized
Your JWT token has expired (30-minute TTL). The app will automatically return
you to the login screen. Sign in again with your credentials.

### Nothing shows up after upload
Open the browser developer tools (F12) then the Console tab. Common causes:

- 401: token expired, sign out and sign back in
- 422: CSV validation failed, check the error message shown in the UI
- 500: backend error, run `docker compose logs backend`
- Network error: backend not running, run `docker ps`

### TimescaleDB volume corruption on Windows
Symptom: `etf_db` exits immediately, logs show permission or data directory errors.

```bash
docker compose down -v
docker volume prune -f
docker compose up --build
```

If it still fails, go to Docker Desktop Settings and switch from Hyper-V to
WSL 2 backend.

### Full reset (when nothing else works)
```bash
docker compose down -v
docker container prune -f
docker network prune -f
docker volume prune -f
docker image prune -f
docker compose up --build
docker compose exec backend python scripts/migrate.py
```

### Checking logs
```bash
# All containers at once
docker compose logs

# Specific container, last 50 lines
docker compose logs backend --tail=50
docker compose logs db --tail=50
docker compose logs redis --tail=50

# Follow in real time
docker compose logs -f
```
