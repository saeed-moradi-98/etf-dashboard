import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api.routes import router
from app.logger import get_logger

logger = get_logger("main")

APP_ENV = os.getenv("APP_ENV", "development")
IS_PROD = APP_ENV == "production"

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost,https://localhost,http://localhost:5173"
).split(",")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ETF Dashboard API",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"status": "ETF Dashboard API running", "env": APP_ENV}


@app.get("/health")
def health():
    logger.info(json.dumps({"event": "health_check", "status": "ok"}))
    return {"status": "ok"}
