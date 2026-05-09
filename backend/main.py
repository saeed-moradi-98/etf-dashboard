from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from data_loader import compute_holdings, compute_etf_price_series

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root(): # A simple health check endpoint
    return {"message": "ETF Dashboard API is running!"}

@app.post("/api/etf") # Endpoint to upload ETF CSV and return holdings, price series, and top 5 holdings
async def upload_etf(file: UploadFile = File(...)):
    content = await file.read() # This is a small file, so we can read it all at once.
    etf_df = pd.read_csv(io.StringIO(content.decode("utf-8")))

    holdings = compute_holdings(etf_df)
    etf_prices = compute_etf_price_series(etf_df)
    top5 = sorted(holdings, key=lambda x: x["holding_size"], reverse=True)[:5]

    return {
        "holdings": holdings,
        "etf_prices": etf_prices,
        "top5": top5
    }
