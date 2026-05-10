'''
Potential test cases for ETF CSV validation logic. Focuses on column presence, weight summation, file size, and tolerance checks.
'''

import io
import pytest
import pandas as pd
from fastapi import HTTPException
from app.api.routes import validate_etf_csv


def make_csv_bytes(data: dict) -> bytes:
    return pd.DataFrame(data).to_csv(index=False).encode()


def read_df(content: bytes) -> pd.DataFrame:
    return pd.read_csv(io.StringIO(content.decode("utf-8")))


# Valid cases

def test_valid_csv_passes():
    content = make_csv_bytes({"name": ["A", "B"], "weight": [0.5, 0.5]})
    df = read_df(content)
    result = validate_etf_csv(df, content)
    assert len(result) == 2


def test_weights_summing_to_one_passes():
    content = make_csv_bytes({"name": ["A", "B", "C"], "weight": [0.4, 0.3, 0.3]})
    df = read_df(content)
    result = validate_etf_csv(df, content)
    assert len(result) == 3


# Column validation

def test_missing_weight_column_raises_400():
    content = make_csv_bytes({"name": ["A", "B"], "price": [10, 20]})
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, content)
    assert exc.value.status_code == 400
    assert "weight" in exc.value.detail.lower()


def test_missing_name_column_raises_400():
    content = make_csv_bytes({"ticker": ["A", "B"], "weight": [0.5, 0.5]})
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, content)
    assert exc.value.status_code == 400


# Weight validation

def test_weights_not_summing_to_one_raises_422():
    content = make_csv_bytes({"name": ["A", "B"], "weight": [0.1, 0.1]})
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, content)
    assert exc.value.status_code == 422
    assert "sum" in exc.value.detail.lower()


def test_null_weights_raise_422():
    content = make_csv_bytes({"name": ["A", "B"], "weight": [1.0, None]})
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, content)
    assert exc.value.status_code == 422
    assert "missing" in exc.value.detail.lower()


def test_non_numeric_weights_raise_422():
    content = make_csv_bytes({"name": ["A", "B"], "weight": ["heavy", "light"]})
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, content)
    assert exc.value.status_code == 422


# Size validation

def test_empty_csv_raises_400():
    content = b"name,weight\n"
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, content)
    assert exc.value.status_code == 400
    assert "empty" in exc.value.detail.lower()


def test_file_too_large_raises_400():
    content = make_csv_bytes({"name": ["A"], "weight": [1.0]})
    large_content = content + b"x" * 1_100_000
    df = read_df(content)
    with pytest.raises(HTTPException) as exc:
        validate_etf_csv(df, large_content)
    assert exc.value.status_code == 400
    assert "large" in exc.value.detail.lower()


# Weight tolerance

def test_weights_within_tolerance_passes():
    # 0.99 is within the 0.95–1.05 tolerance band
    content = make_csv_bytes({"name": ["A", "B"], "weight": [0.50, 0.49]})
    df = read_df(content)
    result = validate_etf_csv(df, content)
    assert result is not None
