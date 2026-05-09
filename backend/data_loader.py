import pandas as pd

prices_df = None

def get_prices() -> pd.DataFrame:
    # Loading prices.csv once and cache it in memory (We can do this because the data is static and small)
    global prices_df
    
    if prices_df is None:
        prices_df = pd.read_csv("data/prices.csv", parse_dates=["DATE"])
    return prices_df

def get_latest_prices() -> pd.Series:
    # Returning the most recent row of prices
    return get_prices().iloc[-1]

def compute_etf_price_series(etf_df: pd.DataFrame) -> list:
    # returning a list of {date, price} dict Given an ETF dataframe

    prices = get_prices()
    weights = etf_df.set_index("name")["weight"].to_dict()
    constituents = list(weights.keys())

    result = []
    for _, row in prices.iterrows():
        etf_price = sum(weights.get(c, 0) * row[c] for c in constituents if c in row)
        result.append({
            "date": row["DATE"].strftime("%Y-%m-%d"),
            "price": round(etf_price, 4)
        })
    return result

def compute_holdings(etf_df: pd.DataFrame) -> list:
    # Returning holdings table with name, weight, latest_price, and holding_size
    latest = get_latest_prices()
    holdings = []
    for _, row in etf_df.iterrows():
        name = row["name"]
        weight = row["weight"]
        price = float(latest[name]) if name in latest else 0.0
        holdings.append({
            "name": name,
            "weight": weight,
            "latest_price": round(price, 2),
            "holding_size": round(weight * price, 2)
        })
    return holdings
