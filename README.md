# ETF Dashboard

A single-page web application for viewing historical prices and top holdings of ETFs.

## Tech Stack

- **Frontend**: React + Vite, Recharts for charts
- **Backend**: Python, FastAPI, Pandas

## Assumptions

- ETF weights are constant over time (as stated in the brief)
- `prices.csv` covers all constituents in both ETF1 and ETF2
- Holding size = weight × latest close price
- ETF reconstructed price = weighted sum of constituent prices per date
- No database needed — all data is static CSV files loaded into memory at startup
- In production, price data would be stored in a time-series DB (e.g. TimescaleDB) and cached with Redis

## Project Structure

```
etf-dashboard/
├── backend/
│   ├── data/
│   │   ├── ETF1.csv
│   │   ├── ETF2.csv
│   │   └── prices.csv
│   ├── main.py
│   ├── data_loader.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── UploadCSV.jsx
    │   │   ├── HoldingsTable.jsx
    │   │   ├── ETFPriceChart.jsx
    │   │   └── TopHoldingsBar.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## How to Run
After moving to the app root directory, please run the following commands in order.
### Backend

```bash
cd backend
python -m venv venv (or python3 -m venv venv)

# Mac/Linux
source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at http://localhost:8000
API docs available at http://localhost:8000/docs

### Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Upload ETF1.csv or ETF2.csv using the drag-and-drop area
3. View the holdings table, ETF price history chart, and top 5 holdings bar chart
