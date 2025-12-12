# Terminal Zero - AI Coding Agent Instructions

## Project Overview
Multi-user crypto trading simulator with real-time Bybit price streaming. **Event-Driven Modular Monolith** architecture.

## Architecture & Data Flow
```
Bybit WS → MarketStreamService → asyncio.Queue → PortfolioManager → WS → Next.js Frontend
                                                        ↓
                                               PaperExchange → UserPortfolio → UserPosition
```

**Key insight**: `jesse_custom/` is a **forked Jesse Trading Engine** modified for multi-user web environments. Standard Jesse is single-user CLI; this fork accepts `user_id` parameters everywhere.

## Critical Code Boundaries
| Layer | Location | Responsibility |
|-------|----------|----------------|
| API Routes | `backend/app/api/` | FastAPI endpoints (`trading.py`, `auth.py`) |
| In-Memory Engine | `backend/jesse_custom/engine/` | Real-time portfolio state, PnL calculation |
| Paper Exchange | `backend/jesse_custom/exchange/paper_exchange.py` | Order execution simulation |
| DB Models | `backend/app/models/` | SQLAlchemy async models (PostgreSQL) |
| Market Data | `backend/services/market_stream.py` | Bybit WebSocket + REST client |
| Frontend State | `frontend/stores/authStore.ts` | Zustand with persistence |
| Frontend Charts | `frontend/components/StreamingChart.tsx` | Real-time Lightweight Charts |

## Development Commands
```bash
# Full stack (recommended)
docker-compose up

# Backend only (requires local Postgres + Redis)
cd backend && uvicorn main:app --reload --port 8000

# Frontend only
cd frontend && npm run dev

# Database migrations
cd backend && alembic upgrade head

# Run Backend Tests
cd backend && pytest
```

## Essential Patterns

### 1. Dual Model Pattern (CRITICAL)
In-memory models must mirror database models. **Update both when adding fields:**
```python
# In-memory: backend/jesse_custom/engine/user_portfolio.py
@dataclass
class UserPortfolio:
    balance: Decimal = DEFAULT_STARTING_BALANCE
    
# Database: backend/app/models/portfolio.py
class Portfolio(Base):
    balance: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=8))
```

### 2. Symbol Format Convention
- **Internal format**: `BTC-USDT` (with hyphen) - used in PortfolioManager, config
- **Bybit format**: `BTCUSDT` (no hyphen) - used in API calls, frontend
- Convert: `convert_bybit_symbol()` in `main.py`

### 3. Decimal Precision (Financial Values)
```python
from decimal import Decimal
qty = Decimal("0.15")  # ✓ Always use string constructor
qty = 0.15             # ✗ Never use float
```

### 4. Async Queue Pattern for Price Distribution
```python
# Subscribe pattern (market_stream.py)
client_queue = asyncio.Queue(maxsize=100)
await market_stream.subscribe("BTCUSDT", client_queue, interval)
data = await client_queue.get()  # Non-blocking price updates
```

### 5. Singleton Services
```python
# Access global instances via getters
from jesse_custom.engine import get_portfolio_manager
from jesse_custom.exchange import get_paper_exchange
portfolio_manager = get_portfolio_manager()  # Returns singleton
```

## Configuration Constants (`backend/app/core/config.py`)
- `SUPPORTED_SYMBOLS`: `["BTC-USDT", "ETH-USDT"]`
- `SUPPORTED_LEVERAGE`: `[2, 5, 10, 15, 20, 25]`
- `FEE_RATE`: `Decimal("0.0006")` (0.06%)
- `DEFAULT_STARTING_BALANCE`: `Decimal("10000.00")`

## API Conventions
- REST: `/api/trading/*`, `/api/auth/*`, `/api/market/*`
- WebSocket: `/ws/ticker/{symbol}?interval=1`, `/ws/portfolio?user_id=`
- Demo user UUID: `00000000-0000-0000-0000-000000000001`

## Adding New Features

**New Trading Pair:**
1. Add to `SUPPORTED_SYMBOLS` in `config.py`
2. Subscribe in `market_stream.py` `_connect()` method
3. Add queue processor in `main.py` `price_update_forwarder()`

**New API Endpoint:**
```python
# backend/app/api/your_feature.py
router = APIRouter(prefix="/api/feature", tags=["feature"])

# Register in main.py
app.include_router(your_feature_router)
```
 - handles direct WS connection
## Frontend Stack
- **Framework**: Next.js 14 (App Router) - pages in `frontend/app/`
- **Charts**: TradingView Lightweight Charts (`StreamingChart.tsx`)
- **State**: Zustand with persist middleware (`stores/authStore.ts`)
- **API URL**: `NEXT_PUBLIC_API_URL` env var, defaults to `http://localhost:8000`

## Testing Strategy
- **Backend**: `pytest` in `backend/tests/`
  - `test_order_execution.py`: Critical trading math (margin, PnL)
  - `test_pnl_calculations.py`: Profit/Loss verification
- **Frontend**: Manual verification via `npm run dev` (currently)

## Future Phases
- `worker/`: Reserved for Phase 4 (Jesse Trading Engine integration for backtesting)

## Common Pitfalls
- **Don't** modify standard Jesse package - only edit `jesse_custom/`
- **Don't** use sync DB calls in WebSocket handlers - use `async_session_maker`
- **Don't** call `asyncio.Queue.get()` without handling `WebSocketDisconnect`
- **Do** use `loguru.logger` for logging (not stdlib `logging`)
- **Do** validate UUIDs: `uuid.UUID(user_id)` can raise `ValueError`

## Database Schema (PostgreSQL)
- **User** (`users`): Core identity. `tier` enum determines features (FREE, PRO).
- **Portfolio** (`portfolios`): 1:1 with User. Stores `balance`, `leverage`.
- **Position** (`positions`): 1:N with Portfolio. Active trades. `side` (LONG/SHORT).
- **Order** (`orders`): 1:N with Portfolio. History & active orders.
- **Relationships**: `User` -> `Portfolio` -> `Position` / `Order`
- **Note**: All IDs are UUIDs. Financials use `Numeric(18, 8)`.

## Authentication Flow
- **Method**: JWT (HS256) via `HTTPBearer`.
- **Routes**:
  - `POST /api/auth/login` -> Returns `access_token`
  - `POST /api/auth/demo` -> Returns token for demo UUID
- **Security**: `backend/app/core/security.py` handles hashing (bcrypt) & validation.
- **Frontend**: `authStore.ts` persists token in localStorage.
- **Protected Routes**: Use `Depends(require_auth)` in FastAPI.

## Reference Docs
- `Simulator.md` - Product requirements
- `PART 2 TECHNICAL ARCHITECTURE*.md` - Architecture decisions  
- `PART 3 UIUX DESIGN*.md` - UI specs & "Midnight Trader" dark theme
