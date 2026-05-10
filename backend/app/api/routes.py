import hashlib
import io
import json

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from app.api.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES, Token, User, authenticate_user,
    create_access_token, get_current_user,
)
from app.cache.redis_client import cache_get, cache_set
from app.db.queries import get_etf_price_series, get_holdings, get_top5
from app.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api")


# ── Validation ────────────────────────────────────────────────────────────────

def validate_etf_csv(df: pd.DataFrame, content: bytes) -> pd.DataFrame:
    if len(content) > 1_000_000:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 1MB.")

    if not {"name", "weight"}.issubset(df.columns):
        raise HTTPException(
            status_code=400,
            detail="CSV must contain 'name' and 'weight' columns."
        )

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    if len(df) > 10_000:
        raise HTTPException(
            status_code=400,
            detail=f"Too many constituents ({len(df)}). Maximum is 10,000."
        )

    try:
        df["weight"] = df["weight"].astype(float)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Weight column must contain numeric values.")

    null_tickers = df[df["weight"].isnull()]["name"].tolist()
    if null_tickers:
        raise HTTPException(
            status_code=422,
            detail=f"Missing weights for: {null_tickers}. All constituents must have a weight."
        )

    weight_sum = df["weight"].sum()
    if not (0.95 <= weight_sum <= 1.05):
        raise HTTPException(
            status_code=422,
            detail=f"Weights sum to {weight_sum:.4f}. Expected a value close to 1.0."
        )

    return df


def parse_etf_csv(content: bytes):
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV. Make sure the file is valid UTF-8.")
    df = validate_etf_csv(df, content)
    tickers = df["name"].tolist()
    weights = df.set_index("name")["weight"].to_dict()
    return tickers, weights


def etf_key(content: bytes) -> str:
    return hashlib.md5(content).hexdigest()


# ── Auth routes ───────────────────────────────────────────────────────────────

@router.post("/auth/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning(json.dumps({"event": "login_failed", "username": form_data.username}))
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": user["username"], "role": user["role"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    logger.info(json.dumps({"event": "login_success", "username": user["username"]}))
    return Token(access_token=token, token_type="bearer", expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── ETF routes ────────────────────────────────────────────────────────────────

@router.post("/etf/holdings")
async def upload_etf_holdings(
    request: Request,
    file: UploadFile = File(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=50),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    tickers, weights = parse_etf_csv(content)
    key = f"holdings:{etf_key(content)}:page{page}:size{page_size}"

    cached = await cache_get(key)
    if cached:
        logger.info(json.dumps({"event": "cache_hit", "endpoint": "holdings", "user": current_user.username}))
        return {**cached, "cached": True}

    result = await get_holdings(tickers, weights, page, page_size)
    await cache_set(key, result, ttl=3600)

    logger.info(json.dumps({
        "event": "etf_holdings",
        "user": current_user.username,
        "constituents": len(tickers),
        "page": page,
        "cached": False
    }))
    return {**result, "cached": False}


@router.post("/etf/prices")
async def upload_etf_prices(
    request: Request,
    file: UploadFile = File(...),
    date_from: str = Query(None),
    date_to: str = Query(None),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    tickers, weights = parse_etf_csv(content)
    key = f"prices:{etf_key(content)}:{date_from}:{date_to}"

    cached = await cache_get(key)
    if cached:
        logger.info(json.dumps({"event": "cache_hit", "endpoint": "prices", "user": current_user.username}))
        return {"data": cached, "cached": True}

    series = await get_etf_price_series(tickers, weights, date_from, date_to)
    await cache_set(key, series, ttl=3600)

    logger.info(json.dumps({
        "event": "etf_prices",
        "user": current_user.username,
        "data_points": len(series),
        "cached": False
    }))
    return {"data": series, "cached": False}


@router.post("/etf/top5")
async def upload_etf_top5(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    tickers, weights = parse_etf_csv(content)
    key = f"top5:{etf_key(content)}"

    cached = await cache_get(key)
    if cached:
        logger.info(json.dumps({"event": "cache_hit", "endpoint": "top5", "user": current_user.username}))
        return {"data": cached, "cached": True}

    top5 = await get_top5(tickers, weights)
    await cache_set(key, top5, ttl=3600)

    logger.info(json.dumps({"event": "etf_top5", "user": current_user.username, "cached": False}))
    return {"data": top5, "cached": False}
