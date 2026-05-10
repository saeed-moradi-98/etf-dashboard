"""
One-time migration: imports prices.csv into TimescaleDB.
Run ONCE after the database is up:
  docker compose exec backend python scripts/migrate.py
"""
import asyncio
import asyncpg
import pandas as pd
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://etfuser:etfpassword@db:5432/etfdb"
)


async def migrate():
    print("Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)

    print("Enabling TimescaleDB extension...")
    await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

    print("Creating prices table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS prices (
            date        TIMESTAMPTZ NOT NULL,
            ticker      TEXT        NOT NULL,
            close_price NUMERIC     NOT NULL
        );
    """)

    print("Creating hypertable...")
    await conn.execute("""
        SELECT create_hypertable('prices', 'date', if_not_exists => TRUE);
    """)

    print("Creating index...")
    await conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_prices_ticker_date ON prices (ticker, date DESC);
    """)

    existing = await conn.fetchval("SELECT COUNT(*) FROM prices")
    if existing > 0:
        print(f"Table already has {existing} rows. Skipping insert.")
        print("To re-migrate, run: DELETE FROM prices;")
        await conn.close()
        return

    print("Loading prices.csv...")
    df = pd.read_csv("data/prices.csv", parse_dates=["DATE"])
    df_long = df.melt(id_vars=["DATE"], var_name="ticker", value_name="close_price")
    df_long = df_long.dropna(subset=["close_price"])
    df_long["DATE"] = df_long["DATE"].dt.to_pydatetime()

    print(f"Inserting {len(df_long)} rows...")
    records = list(df_long.itertuples(index=False, name=None))
    await conn.copy_records_to_table(
        "prices",
        records=records,
        columns=["date", "ticker", "close_price"]
    )

    count = await conn.fetchval("SELECT COUNT(*) FROM prices")
    print(f"Migration complete! {count} rows inserted.")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
