# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Terminal Zero** — a multi-user crypto trading simulator with real-time Bybit price streaming. Event-driven modular monolith architecture. FastAPI backend + Next.js 14 frontend + PostgreSQL + Redis.

## Architecture & Data Flow

```
Bybit WS → MarketStreamService → asyncio.Queue → PortfolioManager → WS → Next.js Frontend
                                                        ↓
                                               PaperExchange → UserPortfolio → UserPosition
```

`jesse_custom/` is a **forked Jesse Trading Engine** modified for multi-user web environments. Standard Jesse is single-user CLI; this fork accepts `user_id` parameters everywhere. Never modify the standard Jesse package — only edit `jesse_custom/`.

## Development Commands

```bash
# Full stack (recommended)
docker-compose up

# Full stack with dev tools (pgAdmin on :5050, Redis Commander on :8081)
docker-compose --profile tools up

# Backend only (requires local Postgres + Redis)
cd backend && uvicorn main:app --reload --port 8000

# Frontend only
cd frontend && npm run dev

# Database migrations
cd backend && alembic upgrade head

# Backend tests
cd backend && pytest tests/ -v

# Run single test file
cd backend && pytest tests/test_order_execution.py -v

# Backend lint
cd backend && ruff check .

# Frontend lint + type check
cd frontend && npm run lint
cd frontend && npx tsc --noEmit

# Frontend build
cd frontend && npm run build

# Install frontend deps (legacy-peer-deps required)
cd frontend && npm ci --legacy-peer-deps
```

**Local URLs:** Frontend `:3000` | API `:8000` | API Docs `:8000/docs` | Health `:8000/health`

## Code Boundaries

| Layer | Location | Responsibility |
|-------|----------|----------------|
| API Routes | `backend/app/api/` | FastAPI endpoints (trading, auth, journal, payments, admin, challenges, competitions) |
| In-Memory Engine | `backend/jesse_custom/engine/` | Real-time portfolio state, PnL calculation |
| Paper Exchange | `backend/jesse_custom/exchange/paper_exchange.py` | Order execution simulation |
| DB Models | `backend/app/models/` | SQLAlchemy async models (PostgreSQL) |
| Core Config | `backend/app/core/config.py` | Enums, constants, trading parameters |
| Security | `backend/app/core/security.py` | JWT (HS256), bcrypt, Redis token blacklisting, account lockout |
| Market Data | `backend/services/market_stream.py` | Bybit WebSocket + reconnection with exponential backoff |
| Frontend State | `frontend/stores/authStore.ts` | Zustand with localStorage persistence |
| Frontend Charts | `frontend/components/StreamingChart.tsx` | TradingView Lightweight Charts |

## Critical Patterns

### Dual Model Pattern
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

### Symbol Format Convention
- **Internal format**: `BTC-USDT` (with hyphen) — used in PortfolioManager, config
- **Bybit format**: `BTCUSDT` (no hyphen) — used in API calls, WebSocket subscriptions
- Convert via `convert_bybit_symbol()` in `main.py`

### Decimal Precision for Financial Values
```python
qty = Decimal("0.15")  # ✓ Always use string constructor
qty = 0.15             # ✗ Never use float
```
Database columns use `Numeric(precision=18, scale=8)`. All IDs are UUIDs.

### Singleton Services
```python
from jesse_custom.engine import get_portfolio_manager
from jesse_custom.exchange import get_paper_exchange
portfolio_manager = get_portfolio_manager()  # Returns singleton
```

### Async Queue Pattern for Price Distribution
```python
client_queue = asyncio.Queue(maxsize=100)
await market_stream.subscribe("BTCUSDT", client_queue, interval)
data = await client_queue.get()
```

## Configuration Constants (`backend/app/core/config.py`)

- `SUPPORTED_SYMBOLS`: `["BTC-USDT", "ETH-USDT", "SOL-USDT", "BNB-USDT", "XRP-USDT", "DOGE-USDT"]`
- `SUPPORTED_LEVERAGE`: `[2, 5, 10, 15, 20, 25]`
- `FEE_RATE`: `Decimal("0.0006")` (0.06%, matches Bybit)
- `DEFAULT_STARTING_BALANCE`: `Decimal("10000.00")`
- `MAINTENANCE_MARGIN_RATE`: `0.005`
- `MARGIN_CALL_THRESHOLD`: `0.80`
- User tiers: `FREE`, `PRO`, `PROP_CHALLENGE`

## API Conventions

- REST: `/api/trading/*`, `/api/auth/*`, `/api/journal/*`, `/api/payments/*`
- WebSocket: `/ws/ticker/{symbol}?interval=1`, `/ws/portfolio?user_id=`
- Demo user UUID: `00000000-0000-0000-0000-000000000001`
- Auth: `POST /api/auth/login` → `{access_token, refresh_token}` (access 15min, refresh 7 days)
- Protected routes use `Depends(require_auth)`

## Database

- PostgreSQL 15 with async SQLAlchemy 2.0 + asyncpg
- Migrations via Alembic (`backend/alembic/versions/`)
- Schema: `User` (1:1) → `Portfolio` (1:N) → `{Position, Order}`; `User` (1:N) → `JournalEntry`, `Payment`, `Challenge`

## Frontend Stack

- **Next.js 14** (App Router) with `output: 'export'` (static export)
- **Zustand** for state (auth, onboarding) with persist middleware
- **TanStack React Query** for server state
- **TradingView Lightweight Charts** for real-time charting
- **Tailwind CSS** with custom "Midnight Trader" dark theme (`t0.void`, `t0.abyss`, `t0.surface`, `t0.elevated`)
- **Framer Motion** for animations
- **Radix UI** primitives for accessible components
- **Zod + React Hook Form** for validation
- **socket.io-client** for WebSocket
- Fonts: Inter (UI), JetBrains Mono (code/numbers)
- Path alias: `@/*` maps to project root
- API URL via `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000`)

## Adding New Features

**New Trading Pair:**
1. Add to `SUPPORTED_SYMBOLS` in `config.py`
2. Subscribe in `market_stream.py` `_connect()` method
3. Add queue processor in `main.py` `price_update_forwarder()`

**New API Endpoint:**
1. Create `backend/app/api/your_feature.py` with `router = APIRouter(prefix="/api/feature", tags=["feature"])`
2. Register in `main.py` with `app.include_router(your_feature_router)`

## Common Pitfalls

- Don't use sync DB calls in WebSocket handlers — use `async_session_maker`
- Don't call `asyncio.Queue.get()` without handling `WebSocketDisconnect`
- Use `loguru.logger` for logging (not stdlib `logging`)
- Validate UUIDs: `uuid.UUID(user_id)` can raise `ValueError`
- Middleware: `LatencyGuardMiddleware` rejects stale requests >500ms; `InputSanitizationMiddleware` blocks XSS/SQLi patterns

## CI/CD

- PRs trigger `ci.yml`: backend lint (`ruff`) + tests (`pytest`), frontend lint + type-check + build
- `develop` branch → staging deployment; `main` branch → production deployment
- Production: AWS ECS Fargate, RDS PostgreSQL, ElastiCache Redis, S3 + CloudFront
- Infrastructure managed via Terraform in `infrastructure/terraform/`
