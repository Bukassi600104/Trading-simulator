# DEVELOPMENT MASTER PLAN: TERMINAL ZERO

## PHASE 1: THE "HEARTBEAT" (Infrastructure & Data)
**Goal:** A running local environment where a Chart visualizes live Bitcoin prices.
* [ ] **1.1. Scaffolding:** Initialize `backend/` (FastAPI), `frontend/` (Next.js), and `worker/`.
* [ ] **1.2. Docker Environment:** Create `docker-compose.yml` with services: `api`, `web`, `db` (Postgres+Timescale), `redis`.
* [ ] **1.3. Market Stream Service:** Create `services/stream.py` to connect to Bybit WebSocket and push data to Redis Pub/Sub (`ticker:BTCUSDT`).
* [ ] **1.4. Frontend WebSocket Hook:** Implement `useTicker` hook in Next.js to consume Redis data via FastAPI.
* [ ] **1.5. Live Chart Component:** Build `StreamingChart.tsx` using Lightweight Charts. Verify it updates in real-time.

## PHASE 2: THE "ENGINE" (Backend Core)
**Goal:** The ability to execute a simulated trade in the backend.
* [ ] **2.1. Jesse Integration:** Clone `jesse` into `backend/jesse_custom/`. Modify `Exchange.py` to accept `user_id` and query Postgres.
* [ ] **2.2. Database Models:** Define SQLAlchemy models for `User`, `Portfolio`, `Order`, `Position`, `Trade`, `JournalEntry`.
* [ ] **2.3. Migration System:** Initialize Alembic and run initial migrations.
* [ ] **2.4. Order Queue:** Create the Redis List `orders_queue` and the Worker script `worker/processor.py` to consume it.
* [ ] **2.5. Trade Logic:** Implement `execute_market_order` function in the Worker. Ensure it calculates fees and updates `Portfolio.balance` atomically.

## PHASE 3: THE "GATEWAY" (User & Security)
**Goal:** Multi-tenancy, Authentication, and Anti-Cheat.
* [ ] **3.1. Auth System:** Implement JWT Authentication (Login/Register) in FastAPI. Store sessions in Redis.
* [ ] **3.2. Middleware:** Add `SentryMiddleware` (Error tracking) and `RateLimitMiddleware` (60 req/min).
* [ ] **3.3. Anti-Cheat Logic:** Implement "Latency Guard" middleware that rejects orders with timestamps > 500ms old.
* [ ] **3.4. User State API:** Create endpoints for `GET /portfolio`, `GET /orders/open`, `GET /orders/history`.

## PHASE 4: THE "COCKPIT" (Frontend UI)
**Goal:** A fully functional "Midnight Terminal" dashboard.
* [ ] **4.1. Design System:** Install Tailwind/ShadCN. Configure "Midnight" theme variables (Slate-950 bg).
* [ ] **4.2. Trading Terminal Layout:** Build the 3-column grid (Assets, Chart, Order Form).
* [ ] **4.3. Order Form Component:** Build the "Smart Risk" calculator and Buy/Sell buttons. Wire up to API.
* [ ] **4.4. Position Widget:** Build the bottom panel to show active trades with a live PnL ticker.
* [ ] **4.5. Toast Notifications:** Implement system feedback ("Order Filled", "Error").

## PHASE 5: THE "GAMIFICATION" (Prop & Journal)
**Goal:** Retention features that keep users addicted.
* [ ] **5.1. Automated Journal:** Create a trigger that saves a trade snapshot (metadata) to the DB on exit.
* [ ] **5.2. Heatmap UI:** Build the `JournalHeatmap` component (Calendar view of PnL).
* [ ] **5.3. Prop Engine:** Implement the daily check logic: `if equity < watermark * 0.95: status = FAILED`.
* [ ] **5.4. Leaderboard Job:** Create a scheduled task (Celery Beat) that ranks users by "24h PnL" and caches the top 100 in Redis.

## PHASE 6: OPERATIONS (Production Ready)
**Goal:** Taking money and going live.
* [ ] **6.1. Paystack Integration:** Implement `/api/pay/initialize` and the Webhook handler to verify payments and upgrade User Tier.
* [ ] **6.2. Admin Dashboard:** Build the `/admin` route (User Ban, System Status, CMS).
* [ ] **6.3. SEO & Sitemaps:** Generate `sitemap.ts` and `robots.ts` to index public pages.
* [ ] **6.4. Deployment Config:** Create `Dockerfile.prod` and AWS ECS Task Definitions.