# PRODUCT OVERVIEW: TERMINAL ZERO (T0)

## 1. MISSION & CORE VALUE
**Terminal Zero** is a high-frequency, risk-free crypto trading simulator designed for serious traders and prop firm aspirants. It mimics the "Midnight Terminal" experience of professional trading desks.
* **Goal:** Provide a 1:1 simulation of real exchange mechanics (Order execution, Latency, Slippage) without financial risk.
* **Target Audience:** Prop Firm candidates, Algorithmic traders, Trading schools.
* **Unique Selling Proposition:** "Ground Zero for Professional Trading."

## 2. TECHNICAL ARCHITECTURE (The Stack)

### Backend (The "Engine")
* **Language:** Python 3.11+
* **Framework:** FastAPI (Async)
* **Trading Core:** A custom Multi-Tenant fork of the **Jesse** trading framework.
* **Database:** PostgreSQL 15+ (with TimescaleDB extension for `MarketCandles`).
* **Caching/PubSub:** Redis (ElastiCache). Used for:
    * Live Price Streaming (Channel: `ticker:{symbol}`)
    * Order Queue (List: `orders_queue`)
    * User Session State
* **Workers:** Python scripts running in Docker containers (`worker/jesse_worker.py`) that consume the Order Queue and execute trades.
* **Data Source:** Live WebSocket feeds from Bybit/Bitget (Public API).

### Frontend (The "Cockpit")
* **Framework:** Next.js 14 (App Router, Server Components).
* **Language:** TypeScript (Strict Mode).
* **State Management:** Zustand (Client State), React Query (Server State).
* **Charts:** TradingView Lightweight Charts (Canvas-based).
* **Styling:** Tailwind CSS + ShadCN UI.
* **Theme:** "Midnight Terminal" (Dark Mode Default: `bg-slate-950`).

### Infrastructure & DevOps
* **Environment:** Docker Compose (Local), AWS ECS Fargate (Production).
* **Storage:** AWS S3 (Historical Parquet files, Screenshots).
* **CI/CD:** GitHub Actions -> AWS ECR -> AWS ECS.

## 3. CORE FEATURES & LOGIC

### A. The Trading Engine (Jesse Fork)
* **Multi-Tenancy:** The `Exchange` class must accept `user_id` to manage isolated portfolios.
* **Order Types:** Market, Limit, Stop-Loss.
* **Leverage:** 1x to 100x (Cross/Isolated logic).
* **Latency Guard (Anti-Cheat):** Reject orders where `client_timestamp` < `server_tick_timestamp - 500ms`.

### B. Real-Time Data (The "Firehose")
* **Flow:** Bybit WS -> `market_stream.py` -> Redis Pub/Sub -> FastAPI Websocket -> Frontend `useWebSocket` hook.
* **Throttling:** Client must throttle UI updates to 10 FPS (100ms) to prevent freezing.

### C. Prop Firm Mode (Gamification)
* **Logic:** Tracks `max_daily_drawdown` and `profit_target`.
* **Fail State:** If Equity < `watermark - 5%`, set `status = FAILED`.
* **Win State:** If Equity > `start_balance + 10%`, set `status = PASSED`.

### D. Automated Journal
* **Trigger:** On `order_close`, capture PnL, Entry, Exit, and Fee.
* **Storage:** Save metadata to Postgres `journal_entries`. Save chart screenshot to S3.

## 4. DATA SCHEMA (Critical Relationships)

* **Users:** `id` (UUID), `email`, `tier` (FREE/STARTER/PRO), `paystack_ref`.
* **Portfolios:** `user_id` (FK), `balance` (Decimal), `equity`, `is_liquidated`.
* **Orders:** `id`, `portfolio_id`, `symbol`, `side` (BUY/SELL), `qty`, `status` (OPEN/FILLED/CANCELED).
* **Positions:** `portfolio_id`, `symbol`, `entry_price`, `current_price`, `unrealized_pnl`.

## 5. UI/UX DESIGN SYSTEM

### Color Palette (Tailwind)
* **Background:** `bg-slate-950` (Void Black)
* **Panels:** `bg-slate-900` (Deep Navy)
* **Borders:** `border-slate-800`
* **Primary Action:** `text-blue-500` / `bg-blue-600` (Electric Blue)
* **Profit/Long:** `text-emerald-500` (Mint Green)
* **Loss/Short:** `text-red-500` (Crimson)
* **Typography:** `Inter` (UI), `JetBrains Mono` (Numbers).

### Key Components
* **Ticker Tape:** Scrolling price feed at top of dashboard.
* **Risk Calc:** Slider input that auto-calculates Position Size based on Risk %.
* **Order Book:** Visual depth chart (Red/Green walls).

## 6. SECURITY & PERFORMANCE PROTOCOLS

* **Zero-Crash:** All 500 errors must be caught by global exception handler and logged.
* **Type Safety:** No `any`. All Python code must use Pydantic. All TS code must use Interfaces.
* **Atomic Transactions:** Balance updates use `SELECT ... FOR UPDATE` in Postgres.
* **Rate Limiting:** 60 requests/min per IP on API routes.

## 7. THIRD-PARTY INTEGRATIONS
* **Payments:** Paystack (Nigeria/Global). Webhook verification required.
* **Auth:** JWT (Self-hosted) or NextAuth.
* **CMS:** Sanity.io (for /blog and /lessons content).