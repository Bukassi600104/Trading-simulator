"""
Test configuration and fixtures for pytest.
"""
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture
def mock_bybit_response():
    """Mock Bybit API response for price data."""
    return {
        "symbol": "BTCUSDT",
        "lastPrice": "105000.50",
        "bid1Price": "105000.00",
        "ask1Price": "105001.00",
        "volume24h": "50000.00"
    }


@pytest.fixture
def sample_user_portfolio():
    """Sample user portfolio for testing."""
    return {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "balance": Decimal("10000.00"),
        "equity": Decimal("10000.00"),
        "margin_used": Decimal("0.00"),
        "unrealized_pnl": Decimal("0.00"),
    }


@pytest.fixture
def sample_order():
    """Sample order data for testing."""
    return {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "symbol": "BTC-USDT",
        "side": "buy",
        "qty": Decimal("0.1"),
        "leverage": 10,
        "order_type": "market",
    }


@pytest.fixture
def mock_market_stream():
    """Mock MarketStreamService for testing without external API calls."""
    mock = MagicMock()
    mock.get_current_price = AsyncMock(return_value=Decimal("105000.00"))
    mock.subscribe = AsyncMock()
    mock.unsubscribe = AsyncMock()
    return mock
