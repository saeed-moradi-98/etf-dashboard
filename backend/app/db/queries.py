from app.db.connection import get_pool
from collections import defaultdict


async def get_holdings(tickers: list, weights: dict, page: int, page_size: int):
    pool = await get_pool()
    offset = (page - 1) * page_size

    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT DISTINCT ON (ticker) ticker, close_price
            FROM prices
            WHERE ticker = ANY($1::text[])
            ORDER BY ticker, date DESC
        """, tickers)

    latest_prices = {r["ticker"]: float(r["close_price"]) for r in rows}

    holdings = []
    for ticker in tickers:
        weight = weights.get(ticker, 0)
        price = latest_prices.get(ticker, 0.0)
        holdings.append({
            "name": ticker,
            "weight": weight,
            "latest_price": round(price, 2),
            "holding_size": round(weight * price, 2)
        })

    holdings.sort(key=lambda x: x["holding_size"], reverse=True)
    total = len(holdings)
    paginated = holdings[offset: offset + page_size]

    return {"items": paginated, "total": total, "page": page, "page_size": page_size}


async def get_etf_price_series(tickers: list, weights: dict, date_from: str = None, date_to: str = None):
    pool = await get_pool()

    date_filter = ""
    params = [tickers]
    if date_from:
        params.append(date_from)
        date_filter += f" AND date >= ${len(params)}"
    if date_to:
        params.append(date_to)
        date_filter += f" AND date <= ${len(params)}"

    async with pool.acquire() as conn:
        rows = await conn.fetch(f"""
            SELECT date, ticker, close_price
            FROM prices
            WHERE ticker = ANY($1::text[])
            {date_filter}
            ORDER BY date ASC
        """, *params)

    by_date = defaultdict(dict)
    for r in rows:
        by_date[r["date"].strftime("%Y-%m-%d")][r["ticker"]] = float(r["close_price"])

    series = []
    for date_str in sorted(by_date.keys()):
        prices = by_date[date_str]
        etf_price = sum(weights.get(t, 0) * prices.get(t, 0) for t in tickers)
        series.append({"date": date_str, "price": round(etf_price, 4)})

    return series


async def get_top5(tickers: list, weights: dict):
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT DISTINCT ON (ticker) ticker, close_price
            FROM prices
            WHERE ticker = ANY($1::text[])
            ORDER BY ticker, date DESC
        """, tickers)

    latest = {r["ticker"]: float(r["close_price"]) for r in rows}
    holdings = [
        {
            "name": t,
            "weight": weights[t],
            "latest_price": round(latest.get(t, 0), 2),
            "holding_size": round(weights[t] * latest.get(t, 0), 2)
        }
        for t in tickers
    ]
    return sorted(holdings, key=lambda x: x["holding_size"], reverse=True)[:5]
