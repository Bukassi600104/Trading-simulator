# Terminal Zero — Complete Production Delivery Roadmap
**Role: Senior Engineer | Target: Fully Production-Ready SaaS**

---

> This is your full execution blueprint. Work through each Phase sequentially.
> Complete ALL tasks in a phase before moving to the next.
> Total estimated timeline: **16 weeks** to full production-ready SaaS.

---

## PHASE 1 — FOUNDATION & SECURITY
### Weeks 1–3 | Goal: Lock down auth, billing infra, and security before touching features

---

### 1.1 Authentication & Session Management
- [ ] Install and configure NextAuth.js v5 or Clerk (pick one, don't roll your own)
- [ ] Add OAuth providers: Google, GitHub, email magic link
- [ ] Add phone number authentication via Twilio (critical for African market)
- [ ] Build email verification flow with tokenized links (15-minute expiry)
- [ ] Build password reset flow (secure time-limited tokens, invalidate on use)
- [ ] Create `users` table: id, email, phone, name, country, hashed_password, verified_at, created_at
- [ ] Add rate limiting on all auth endpoints: max 5 attempts per IP per 15 minutes
- [ ] Implement session persistence: JWT + refresh tokens, stored server-side
- [ ] Test: signup → email verify → login → refresh token → session survives reload

---

### 1.2 Database Foundation
- [ ] Provision PostgreSQL (Supabase or Neon — do not use SQLite in production)
- [ ] Create `portfolios` table: id, user_id, name, starting_balance, current_balance, is_default, created_at
- [ ] Create `trades` table (ledger-style):
  - trade_id, portfolio_id, asset_pair, side (buy/sell), quantity, execution_price
  - total_value, fee_amount, slippage_amount, status, created_at
- [ ] Create `ledger_entries` table: id, portfolio_id, trade_id, asset, amount, direction (debit/credit), timestamp
- [ ] Create `price_history` table: asset, timestamp, open, high, low, close, volume, timeframe
- [ ] Add indexes on: portfolio_id, user_id, asset_pair, timestamp columns
- [ ] Set up database migrations with version control (use Knex or Prisma)
- [ ] Seed free plan with $100,000 virtual balance per new user
- [ ] Test: insert user → create portfolio → execute mock trade → verify ledger entries balance

---

### 1.3 Billing & Subscription Infrastructure
- [ ] Integrate Stripe SDK (international payments)
- [ ] Integrate Paystack SDK (Nigeria/Africa payments)
- [ ] Create `subscription_plans` table with the following tiers:

| Plan  | Price USD   | Price NGN    | Key Features                          |
|-------|-------------|--------------|---------------------------------------|
| Free  | $0          | ₦0           | 15-min delayed data, 1 portfolio      |
| Pro   | $9.99/mo    | ₦5,400/mo    | Real-time data, AI analysis, backtesting |
| Elite | $24.99/mo   | ₦13,500/mo   | DeFi sim, copy trading, strategy builder |

- [ ] Create `customer_subscriptions` table: user_id, plan_id, stripe_customer_id, paystack_customer_id, status, period_start, period_end, trial_end
- [ ] Build Stripe webhook handler for events:
  - `invoice.payment_succeeded` → activate plan
  - `invoice.payment_failed` → send retry email
  - `customer.subscription.deleted` → downgrade to Free
- [ ] Build Paystack webhook handler for events:
  - `charge.success` → activate plan
  - `charge.failed` → notify user
- [ ] Build feature gate middleware: checks user plan before serving any paid route
- [ ] Test: create free user → upgrade via Stripe → webhook fires → Pro features unlock → cancel → reverts to Free

---

### 1.4 Security Hardening
- [ ] Run git history audit: `git log --all --full-history -- '*.env'` — remove any exposed secrets
- [ ] Run `git secrets --scan` across entire repo
- [ ] Move ALL secrets to environment variables — nothing hardcoded, nothing committed
- [ ] Install and configure `helmet.js` on backend (sets security HTTP headers)
- [ ] Implement strict CORS policy: only allow requests from your own frontend domain
- [ ] Add HTTPS enforcement: redirect all HTTP traffic to HTTPS
- [ ] Add input sanitization on every API endpoint (validate types, lengths, formats)
- [ ] Implement CSRF protection on all state-changing operations
- [ ] Add `express-rate-limit` on all endpoints (general: 100 req/min; trading: 10 orders/min per user)
- [ ] Server-side validation of ALL trade calculations — never trust the client for balance or price math
- [ ] Write and publish Privacy Policy and Terms of Service pages
- [ ] Test: attempt SQL injection on trade endpoint → blocked; attempt negative balance trade → blocked

---

### 1.5 Monitoring & Observability
- [ ] Integrate Sentry on frontend (uncaught errors, performance)
- [ ] Integrate Sentry on backend (API errors, unhandled rejections)
- [ ] Set up structured logging with `pino` or `winston` on all services
- [ ] Configure Axiom or Betterstack for log aggregation
- [ ] Set up UptimeRobot: ping frontend and API every 5 minutes
- [ ] Create alert rules: API error rate >5%, DB pool >80%, WebSocket disconnects
- [ ] Set up Slack webhook to post to `#incidents` channel
- [ ] Test: intentionally throw error → Sentry captures → Slack alert fires within 60 seconds

---

## PHASE 2 — CORE TRADING ENGINE
### Weeks 4–6 | Goal: Working paper trading with real data, order execution, and live P&L

---

### 2.1 Real-Time Price Feed Architecture
- [ ] Design fan-out architecture: one Binance WebSocket per pair on the server → Redis pub/sub → all clients
- [ ] Build Python worker service: connects to Binance WebSocket for top 20 pairs
- [ ] Normalize price data to internal format: `{ symbol, timestamp, bid, ask, last, volume_24h }`
- [ ] Publish normalized prices to Redis channels with 1-second TTL
- [ ] Backend subscribes to Redis and pushes updates to connected frontend clients via WebSocket
- [ ] Build 15-minute delayed price cache (CoinGecko free tier REST API) for free-plan users
- [ ] Add circuit breaker: reject prices that move >50% from the last known price
- [ ] Add reconnection logic to Binance WebSocket with exponential backoff (1s → 2s → 4s → max 30s)
- [ ] Build OHLCV archival job: runs every minute, persists candle data to price_history table
- [ ] Test: connect to Binance → verify 5 pairs update in real-time → disconnect → verify auto-reconnect → verify free-tier sees 15-min delayed prices

---

### 2.2 Order Execution Engine
- [ ] Build order validation layer:
  - User has sufficient balance for the trade
  - Quantity is above minimum (0.001 BTC, 0.01 ETH, etc.)
  - Price is not stale (within last 5 seconds)
  - User has not exceeded rate limit (10 orders/min)
- [ ] Implement Market Order: execute immediately at current bid/ask price
- [ ] Implement Limit Order: hold in pending status, fill when price crosses threshold (check every 1 min)
- [ ] Implement Stop-Loss and Take-Profit: monitor open positions, auto-execute when price threshold is hit
- [ ] Build settlement logic (runs on fill):
  - Debit asset sold from portfolio
  - Credit asset bought to portfolio
  - Write double-entry ledger entries
  - Deduct 0.1% trading fee
  - Calculate and record slippage (execution price vs. intended price)
  - Mark trade as `filled`, record fill_price and fill_timestamp
- [ ] Add virtual order book simulation: add realistic bid/ask spread based on asset liquidity
- [ ] Build GET /api/portfolios/:id/trades endpoint: paginated, filterable by date/asset/status
- [ ] Test: place 10 market orders → verify balance math is exact → verify ledger entries balance → verify fees deducted correctly

---

### 2.3 Portfolio Dashboard API
- [ ] Build GET /api/portfolios/:id endpoint returning:
  - Total portfolio value in USDT at current prices
  - Holdings breakdown: asset, quantity, avg_entry_price, current_price, unrealized_pnl, pnl_percent
  - Realized P&L (from closed trades)
  - Daily P&L (today only)
  - All-time P&L
  - Equity curve: array of `{ timestamp, balance }` for chart rendering
- [ ] Build GET /api/portfolios/:id/stats endpoint returning:
  - Total trades, win rate, avg win, avg loss
  - Best trade, worst trade
  - Max drawdown
  - Sharpe ratio (risk-adjusted return)
  - Most traded pair
- [ ] Cache all portfolio endpoints in Redis with 5-second TTL
- [ ] Handle timezone: store all timestamps in UTC, convert to user's local timezone on response
- [ ] Test: execute 20 trades → call stats endpoint → verify Sharpe ratio is mathematically correct → verify unrealized P&L matches manual calculation

---

### 2.4 Charting & Trading UI
- [ ] Integrate TradingView Lightweight Charts (open-source, MIT license, free to use)
- [ ] Build candlestick chart with timeframe selector: 1m, 5m, 15m, 1h, 4h, 1d
- [ ] Add indicators: SMA (20, 50, 200), EMA (12, 26), RSI (14)
- [ ] Add real-time chart updates: new candle appended every minute via WebSocket
- [ ] Build order form: buy/sell toggle, quantity input, price input (market/limit switch), fee preview, estimated total
- [ ] Build portfolio holdings table: asset, qty, avg cost, current price, P&L, P&L %, actions
- [ ] Build trade history table: date, pair, side, qty, price, total, fee, status
- [ ] Test: load chart → execute buy order → holding appears in portfolio → execute sell → P&L shows correctly

---

### 2.5 Free vs Pro Data Gating
- [ ] Free users: fetch prices from Redis delayed cache (15-min delayed CoinGecko data)
- [ ] Pro users: receive real-time WebSocket price stream
- [ ] Add visual indicator on chart: "Prices delayed 15 minutes — Upgrade to Pro for real-time data"
- [ ] Add paywall intercept when free user tries to open advanced chart indicators
- [ ] Test: log in as free user → chart shows delayed prices → upgrade → real-time data streams immediately

---

## PHASE 3 — GAMIFICATION & RETENTION
### Weeks 7–9 | Goal: Streak system, achievements, leaderboards, referrals — drive Day-7+ retention

---

### 3.1 Streak & Achievement System
- [ ] Create `streaks` table: user_id, current_streak, longest_streak, last_activity_date
- [ ] Create `achievements` table: id, user_id, type, unlocked_at, xp_awarded
- [ ] Build streak logic:
  - Streak increments when user executes at least 1 trade per calendar day (UTC)
  - Streak resets to 0 if a full calendar day passes with no trade
  - Cron job runs at 00:05 UTC daily to evaluate and update streaks
- [ ] Launch with these 5 achievements:
  - "First Trade" — executes first simulated trade
  - "3-Day Streak" — trades 3 days in a row
  - "First Profit" — portfolio P&L goes positive for first time
  - "High Roller" — executes a trade worth >$10,000 virtual
  - "Diversified" — holds 5 different assets simultaneously
- [ ] Build XP system: 10 XP per trade, 50 XP per achievement, 100 XP for weekly top-10 finish
- [ ] Create `xp_ledger` table: user_id, amount, reason, created_at
- [ ] Build achievements display UI: locked/unlocked states, progress bars where applicable
- [ ] Test: new user → execute first trade → achievement unlocks → XP awarded → streak shows day 1

---

### 3.2 Global Leaderboards
- [ ] Create `leaderboard_snapshots` table: user_id, period (weekly/alltime), metric_type, metric_value, rank, captured_at
- [ ] Implement weekly reset: every Sunday 00:00 UTC, archive current leaderboard and reset
- [ ] Rank users by Sharpe ratio (not raw return %) — rewards smart risk management, not gambling
- [ ] Minimum qualification: 5 trades in the period (prevents single lucky trade from topping the board)
- [ ] Build GET /api/leaderboards?period=weekly endpoint: returns top 100 with rank, username, sharpe, return%, trade_count, streak
- [ ] Build user profile page: show top trades, most traded pairs, win rate, streak (public)
- [ ] Build leaderboard UI: scrollable top 100, highlight current user's position, trend arrows (↑↓)
- [ ] Add daily challenge leaderboard (resets 00:00 UTC): "Best 24h Return" — visible to all, wins XP
- [ ] Test: 10 test users trade → compute Sharpe ratio for each → verify rankings are correct → verify weekly reset works

---

### 3.3 Push Notifications & Alerts
- [ ] Integrate Firebase Cloud Messaging (FCM) for web push notifications
- [ ] Create `notification_preferences` table: user_id, streak_reminders, price_alerts, challenge_updates, enabled
- [ ] Build streak reminder: fires at 8 AM in user's local timezone if they haven't traded yet that day
- [ ] Build price alert system: user sets a price threshold on any asset → notification when crossed
- [ ] Create `price_alerts` table: user_id, asset, threshold_price, direction (above/below), triggered_at
- [ ] Price alert checker: runs every 60 seconds via worker cron job
- [ ] Add in-app notification bell with unread count
- [ ] Build notification preferences page: on/off toggles for each notification type
- [ ] Test: set price alert for BTC above $100,000 → simulate price crossing → notification fires within 60 seconds

---

### 3.4 Referral Program
- [ ] Generate unique 6-character alphanumeric referral code per user on signup
- [ ] Create `referrals` table: referrer_id, referred_user_id, referral_code, reward_granted_at
- [ ] Reward logic: when referred user completes signup AND executes first trade → both get 30 days Pro free
- [ ] Create `referral_credits` table: user_id, days_credited, reason, created_at
- [ ] Apply referral credit to subscription: extend Pro trial by N days before charging
- [ ] Build referral dashboard: your referral link, copy button, count of successful referrals, rewards earned
- [ ] Generate shareable performance card: auto-generated PNG with username, portfolio return %, streak, "Join me on Terminal Zero"
- [ ] Build referral leaderboard: top referrers this month, winner gets 3 months Elite free
- [ ] Test: generate link → sign up via link → execute first trade → both accounts get 30-day Pro credited

---

## PHASE 4 — MONETIZATION ACTIVATION
### Weeks 10–11 | Goal: Paid tiers live, trials running, payments collecting

---

### 4.1 Feature Gating
- [ ] Create `feature_flags` table: feature_name, plan_required (free/pro/elite)
- [ ] Define feature gate map:

| Feature                       | Free | Pro | Elite |
|-------------------------------|------|-----|-------|
| Paper trading (top 20 pairs)  | ✅   | ✅  | ✅    |
| Real-time price data          | ❌   | ✅  | ✅    |
| Backtesting                   | ❌   | ✅  | ✅    |
| Advanced analytics (Sharpe)   | ❌   | ✅  | ✅    |
| AI trade coaching             | ❌   | ✅  | ✅    |
| Multiple portfolios           | ❌   | ✅  | ✅    |
| DeFi simulation               | ❌   | ❌  | ✅    |
| Copy trading                  | ❌   | ❌  | ✅    |
| Strategy builder              | ❌   | ❌  | ✅    |
| Private leaderboards          | ❌   | ❌  | ✅    |

- [ ] Build feature gate middleware: attach to every paid route, check plan, return 402 if gated
- [ ] Build upgrade modal: shown when free user hits a gated feature — clear CTA, pricing display
- [ ] Build plan comparison page: Free vs Pro vs Elite side-by-side
- [ ] Test: free user accesses backtesting → blocked → upgrade modal appears → upgrade → access granted

---

### 4.2 Free Trial & Onboarding
- [ ] All new users automatically start a 14-day Pro trial (no credit card required)
- [ ] Add `trial_end_date` to `customer_subscriptions` table
- [ ] Build trial countdown banner: "Your Pro trial ends in X days — Upgrade to keep access"
- [ ] Send email sequence during trial:
  - Day 1: Welcome + how to execute first trade
  - Day 7: "You're halfway through — here's what Pro unlocks"
  - Day 12: "2 days left on your trial — upgrade now"
  - Day 14: "Trial ended — upgrade to keep Pro features"
- [ ] Build 3-step onboarding flow (shown to every new user):
  1. Pick your starting portfolio ($50K, $100K, or $250K virtual)
  2. Execute your first trade (guided step-by-step)
  3. See your P&L move in real-time
- [ ] Goal: user reaches "aha moment" (first trade executed) within 60 seconds of signup
- [ ] Test: sign up → onboarding flow → first trade within 60s → trial countdown visible

---

### 4.3 Stripe Subscription Management
- [ ] Build Stripe Checkout flow: user clicks upgrade → Stripe-hosted checkout → return to success page
- [ ] Build Stripe Customer Portal: self-service billing management (change card, download invoices, cancel)
- [ ] Handle failed payment: retry after 3 days → email reminder → suspend after 3 failures → cancel after 7 days
- [ ] Build invoice history page: list of past invoices with download links
- [ ] Implement annual billing option (20% discount): $59.99/yr Pro, $149.99/yr Elite
- [ ] Test: upgrade to Pro → Stripe charge succeeds → Pro unlocked → test failed payment → email fires → suspend after 3 failures

---

### 4.4 Paystack Integration (Africa)
- [ ] Build Paystack initialization endpoint: create customer + subscription
- [ ] Implement Paystack authorization flow: redirect to Paystack checkout → webhook on success
- [ ] Support payment methods: card, bank transfer, USDT
- [ ] Handle plan switching on Paystack: cancel existing sub, create new sub at new tier
- [ ] Apply PPP pricing: Pro at ₦5,400/mo, Elite at ₦13,500/mo — auto-detect Nigerian users by IP/phone
- [ ] Add weekly billing option for Africa: ₦1,400/week Pro, ₦3,500/week Elite (matches local budgeting)
- [ ] Test: Nigerian user signs up → sees NGN pricing → pays via bank transfer → Paystack webhook fires → Pro unlocked

---

## PHASE 5 — PREMIUM FEATURES
### Weeks 12–14 | Goal: Build the features users actually pay for — backtesting, AI coaching, DeFi

---

### 5.1 Backtesting Engine (Pro Feature)
- [ ] Build backtesting service in Python worker (uses pandas + numpy)
- [ ] Load historical OHLCV data from price_history table
- [ ] Accept user-defined strategy parameters:
  - Entry condition: e.g., "Buy when RSI < 30"
  - Exit condition: e.g., "Sell when RSI > 70 or stop-loss at -5%"
  - Starting capital, date range, asset pair
- [ ] Run simulation: replay historical prices, execute trades based on strategy rules
- [ ] Return results: equity curve, total return %, Sharpe ratio, max drawdown, win rate, trade list
- [ ] Build 30-day historical replay mode: user watches their strategy play out in speed-accelerated time
- [ ] Build backtesting UI: strategy input form, results dashboard, equity curve chart
- [ ] Test: run strategy on BTC/USDT for 2023 → verify results match expected outcomes manually

---

### 5.2 AI Trade Coaching (Pro Feature)
- [ ] After every trade executes, call Claude API (claude-sonnet-4-6) with trade context
- [ ] Provide context in prompt: trade details, entry/exit price, market conditions at time of trade, historical performance of similar setups
- [ ] Return a 2–3 sentence coaching note: what the trade did well, what could be improved, pattern recognition
- [ ] Examples:
  - "You sold BTC after a 3% dip, but historically this asset recovered 80% of the time within 48 hours. Consider a wider stop-loss next time."
  - "Your entry timing here was excellent — you bought near the RSI 30 oversold level which is a statistically strong entry point."
- [ ] Store AI coaching notes in `trade_insights` table: trade_id, insight_text, created_at
- [ ] Build coaching feed UI: scrollable list of your recent trades with AI notes attached
- [ ] Add weekly performance summary email generated by AI: top 3 pattern observations from the week
- [ ] Test: execute 5 trades → coaching notes appear within 5 seconds → notes are contextually relevant

---

### 5.3 DeFi Simulation (Elite Feature)
- [ ] Build DeFi simulation module with 3 core scenarios:
  1. **Liquidity provision**: deposit token pair into simulated AMM pool, earn simulated fees, track impermanent loss
  2. **Yield farming**: stake LP tokens, earn simulated APY, compound rewards
  3. **DEX trading**: execute swaps on simulated Uniswap-style AMM with price impact and slippage
- [ ] Build impermanent loss calculator: show real-time IL as pool price ratio shifts
- [ ] Add DeFi dashboard: active positions, earned fees, current APY, IL exposure
- [ ] Build DeFi education overlays: explain what's happening at each step (critical for beginners)
- [ ] Test: add liquidity to BTC/USDT pool → price moves 20% → verify impermanent loss calculation is correct

---

### 5.4 Copy Trading (Elite Feature)
- [ ] Allow Elite users to "follow" any top-10 leaderboard user
- [ ] When followed user executes a trade, replicate it proportionally in follower's portfolio
- [ ] Proportional sizing: if followed user uses 10% of portfolio, follower uses 10% of their portfolio
- [ ] Build follow/unfollow UI on leaderboard profile pages
- [ ] Create `copy_trading_relationships` table: follower_id, followed_user_id, active, started_at
- [ ] Show copied trades in trade history with "Copied from [username]" label
- [ ] Add leaderboard filter: "Copy traders only" — shows users who have opted into being copied
- [ ] Build notification: alert follower when a copied trade executes
- [ ] Test: user A trades → user B (follower) automatically gets same trade proportionally → appears in B's history

---

### 5.5 Strategy Builder (Elite Feature)
- [ ] Build visual strategy builder: drag-and-drop rule creation (no code required)
- [ ] Support conditions: price above/below SMA, RSI above/below threshold, volume spike, price % change
- [ ] Support actions: buy/sell specific % of portfolio, set stop-loss, set take-profit
- [ ] Save strategies to `strategies` table: user_id, name, rules_json, created_at
- [ ] Allow one-click backtesting of a saved strategy (calls Phase 5.1 backtesting engine)
- [ ] Allow strategy activation on live paper trading: automatically executes trades when conditions are met
- [ ] Build strategy marketplace: users can publish their strategy → others can browse and copy
- [ ] Test: build RSI-based strategy → activate on paper portfolio → price triggers RSI < 30 → trade auto-executes

---

## PHASE 6 — AFRICAN MARKET & GROWTH
### Weeks 14–15 | Goal: African market localization, viral growth mechanics, distribution channels

---

### 6.1 African Market Localization
- [ ] Add local currency pairs to simulator: BTC/NGN, USDT/NGN, BTC/KES, BTC/ZAR, BTC/GHS
- [ ] Source NGN/USD, KES/USD, ZAR/USD exchange rates (Wise API or ExchangeRate.host)
- [ ] Build "Naira Devaluation Simulator": show how USDT/stablecoin holding preserved value vs holding NGN
- [ ] Build "P2P Trading Simulator": simulate buying/selling on a P2P exchange with spread management and counterparty scenarios
- [ ] Build low-data mode: compressed WebSocket payloads, aggressive image compression, PWA offline support, target <15MB bundle
- [ ] Add Paystack + bank transfer + USDT payment support (Phase 4.4 — confirm complete)
- [ ] Add WhatsApp share button to performance card (primary sharing channel in Nigeria)
- [ ] Add Telegram share button to performance card
- [ ] Translate key UI strings to Hausa, Yoruba, Igbo (at minimum: navigation, error messages, onboarding)
- [ ] Test: load app on 3G connection → time to interactive < 4 seconds

---

### 6.2 PWA (Progressive Web App)
- [ ] Add `manifest.json` with app name, icons (192x192, 512x512), theme color, display: standalone
- [ ] Add service worker: cache static assets, offline fallback page
- [ ] Add "Add to Home Screen" prompt after user's 3rd session
- [ ] Optimize JS bundle: code splitting, lazy loading non-critical routes, tree shaking
- [ ] Target Lighthouse PWA score > 90, Performance score > 80
- [ ] Test: open on Android Chrome → install prompt appears → app works offline with cached data

---

### 6.3 Viral Growth Mechanics
- [ ] Build auto-generated performance card (shareable image):
  - Username, portfolio return %, streak days, top-performing asset
  - "Beat me on Terminal Zero" CTA with referral link embedded
  - Generate as PNG via server-side Canvas or Sharp.js
- [ ] Add 1-click sharing to Twitter/X, WhatsApp, Telegram
- [ ] Build "Challenge a Friend" feature: send a 7-day trading competition to any email/link
  - Each challenger gets a fresh portfolio, winner is highest return % after 7 days
  - Auto-generates spectator view so others can watch
- [ ] Build weekly email digest (automated):
  - Your portfolio return this week vs last week
  - Your leaderboard rank and trend
  - One AI coaching insight from your trades
  - CTA to log in and trade
- [ ] Test: generate performance card → share to Twitter → link resolves to app with referral code tracked

---

### 6.4 SEO & Content Engine
- [ ] Build programmatic SEO pages:
  - `/paper-trade/[coin]` — e.g., `/paper-trade/bitcoin` — "How to Paper Trade Bitcoin"
  - `/compare/terminal-zero-vs-tradingview` — comparison pages
  - `/learn/[topic]` — education articles (DCA, RSI, support & resistance)
- [ ] Add Open Graph tags to all pages (for Twitter/Facebook preview cards)
- [ ] Add JSON-LD structured data (SoftwareApplication schema for Google rich results)
- [ ] Submit sitemap.xml to Google Search Console
- [ ] Set up Ahrefs or Ubersuggest for keyword tracking
- [ ] Target primary keywords: "crypto paper trading," "crypto trading simulator," "practice trading Bitcoin"
- [ ] Test: Google Search Console shows pages indexed within 2 weeks of launch

---

## PHASE 7 — PRODUCTION HARDENING & LAUNCH
### Week 16 | Goal: Everything is production-grade, tested, monitored, and ready for real users

---

### 7.1 Performance & Scalability
- [ ] Move trading execution path entirely to Railway containers (not Vercel serverless — avoid cold starts)
- [ ] Implement PgBouncer connection pooling for PostgreSQL
- [ ] Set up Redis Cluster for production (not single Redis instance)
- [ ] Add HTTP caching headers: Cache-Control, ETag, Last-Modified on static assets
- [ ] Implement CDN for static assets (Vercel handles this automatically — verify it's configured)
- [ ] Load test: simulate 1,000 concurrent users placing trades → ensure no degradation
- [ ] Set WebSocket connection limits and horizontal scaling plan for when >1,000 concurrent connections

---

### 7.2 Comprehensive Testing Suite
- [ ] Write unit tests for: order validation, settlement math, P&L calculations, Sharpe ratio, streak logic
- [ ] Write integration tests for: trade execution end-to-end, billing webhook flows, auth flows
- [ ] Write E2E tests (Playwright or Cypress): signup → trade → upgrade → billing → cancel
- [ ] Set up CI/CD pipeline (GitHub Actions):
  - On every push to main: run tests → lint → build
  - Only deploy if all tests pass
- [ ] Set up staging environment: separate Vercel preview + separate Railway service + separate database
- [ ] Test billing in Stripe test mode: all webhook events, all plan transitions

---

### 7.3 Legal & Compliance
- [ ] Write and publish Privacy Policy (cover data collection, storage, deletion, third parties)
- [ ] Write and publish Terms of Service (cover virtual currency is not real, no financial advice, refund policy)
- [ ] Add disclaimer on all trading pages: "This is a simulated environment. No real money or cryptocurrency is involved. This is not financial advice."
- [ ] Add cookie consent banner (GDPR compliance for European users)
- [ ] Implement user data export: users can download all their data (GDPR right to portability)
- [ ] Implement account deletion: users can delete their account and all associated data
- [ ] Confirm Nigerian regulatory status: trading simulator with no real money handling is NOT a VASP — document this clearly

---

### 7.4 Final Pre-Launch Checklist
- [ ] All environment variables set correctly in production (Vercel + Railway)
- [ ] Stripe production keys (not test keys) configured
- [ ] Paystack production keys configured
- [ ] Database backups configured: automated daily backup, 30-day retention
- [ ] All admin email addresses verified and receiving notifications
- [ ] Error rates in Sentry: zero P0/P1 bugs before launch
- [ ] Lighthouse scores: Performance >80, Accessibility >90, SEO >90, PWA >90
- [ ] Manual smoke test: sign up → trade → upgrade → share performance card → receive notification
- [ ] Announce on: Product Hunt, Indie Hackers, Reddit r/cryptocurrency, Twitter/X, Nigerian crypto Telegram groups

---

## PHASE SUMMARY TABLE

| Phase | Name                        | Weeks  | Output                                           |
|-------|-----------------------------|--------|--------------------------------------------------|
| 1     | Foundation & Security       | 1–3    | Auth, DB, billing infra, security, monitoring    |
| 2     | Core Trading Engine         | 4–6    | Real-time data, order execution, portfolio API   |
| 3     | Gamification & Retention    | 7–9    | Streaks, leaderboards, notifications, referrals  |
| 4     | Monetization Activation     | 10–11  | Feature gating, trials, Stripe + Paystack live   |
| 5     | Premium Features            | 12–14  | Backtesting, AI coaching, DeFi, copy trading     |
| 6     | African Market & Growth     | 14–15  | Localization, PWA, viral mechanics, SEO          |
| 7     | Production Hardening        | 16     | Load testing, CI/CD, legal, launch checklist     |

---

**Next action:** Start Phase 1, Task 1.1 — Authentication. Don't move to Phase 2 until all Phase 1 tasks are checked off.
