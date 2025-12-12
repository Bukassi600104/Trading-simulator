**PART 2: TECHNICAL ARCHITECTURE & DEVELOPMENT STACK**  
  
# 1. High-Level Architecture  
The system follows a **Event-Driven Architecture** to handle real-time market data without lagging.  
• **Frontend (Client):** Next.js (React) application. It does no calculations; it simply displays data and captures user intent (clicks).  
• **API Gateway (Backend):** FastAPI (Python). It handles user auth, saves journal entries, and routes trading commands.  
• **The "Engine" (Worker):** A customized fork of **Jesse**. It runs in the background, maintaining the state of every user's simulated portfolio and checking for stop-losses/liquidations on every price tick.  
• **The Message Broker:** **Redis**. It acts as the glue. Live market data flows into Redis, and the Engine reads from it.  
• **Database:** PostgreSQL. Stores persistent data (Users, History, Journal).  
# 2. Backend Folder Structure (Python/FastAPI)  
We are organizing this as a **Modular Monolith**. It keeps the "Web API" separate from the "Trading Logic" so you can scale them independently later.  
  
  
backend/  
├── app/  
│   ├── api/                 # API Routes (The "Front Door")  
│   │   ├── auth.py          # Login/Register (JWT)  
│   │   ├── trading.py       # Place Order, Cancel Order  
│   │   ├── market.py        # Historical data & Tickers  
│   │   ├── journal.py       # Journaling & Notes endpoints  
│   │   └── clans.py         # Social features  
│   ├── core/  
│   │   ├── config.py        # Env variables (DB_URL, BYBIT_KEYS)  
│   │   ├── security.py      # Password hashing & Token generation  
│   │   └── database.py      # DB connection session  
│   ├── models/              # SQLAlchemy Database Tables  
│   │   ├── user.py  
│   │   ├── trade.py  
│   │   └── social.py  
│   ├── services/            # Business Logic  
│   │   ├── order_manager.py # Validates margin, calculates liquidation  
│   │   ├── market_stream.py # Connects to Bybit WebSocket  
│   │   └── stats.py         # Calculates Win Rate, Drawdown for "Prop Mode"  
│   └── main.py              # App Entry Point  
├── jesse_custom/            # YOUR FORK of the Jesse Engine  
│   ├── strategies/          # User-defined strategies  
│   ├── routes.py            # Custom routing for multi-user simulation  
│   └── exchange/            # The "Paper Exchange" logic  
├── alembic/                 # Database Migrations  
├── requirements.txt  
└── Dockerfile  
  
  
**Critical Development Note:**  
• **jesse_custom/**: You cannot use the standard Jesse pip package because it's designed for single-user CLI use. You must **fork** the library and modify the Exchange class to accept a user_id parameter. This allows one engine to manage 1,000 separate portfolios simultaneously.  
# 3. Database Schema (PostgreSQL)  
This is the "Brain" of the operation. We need robust relationships to link Users -> Clans -> Trades -> Journal Entries.  
**A. Core Tables**  
**1. Users**  
• id (UUID, PK)  
• email (String, Unique)  
• tier (Enum: FREE, PRO, PROP_CHALLENGE)  
• clan_id (FK -> Clans)  
**2. Portfolios (The "Wallet")**  
• id (UUID, PK)  
• user_id (FK)  
• balance (Decimal) - Simulated Cash  
• equity (Decimal) - Balance + Unrealized PnL  
• max_drawdown_watermark (Decimal) - Tracks highest equity peak for Prop Mode  
• is_liquidated (Boolean)  
**B. Trading Data**  
**3. Orders**  
• id (UUID, PK)  
• portfolio_id (FK)  
• symbol (String) - e.g., "BTC-USDT"  
• side (Enum: BUY, SELL)  
• type (Enum: LIMIT, MARKET, STOP)  
• qty (Decimal)  
• price (Decimal)  
• status (Enum: OPEN, FILLED, CANCELED)  
**4. Trades (Completed History)**  
• id (UUID, PK)  
• order_id (FK)  
• entry_price  
• exit_price  
• pnl (Decimal)  
• pnl_percent  
• closed_at (Timestamp)  
**C. Value-Add Tables (The "Stickiness")**  
**5. Journal_Entries**  
• id (UUID, PK)  
• trade_id (FK)  
• note (Text) - User's written analysis  
• emotion (Enum: FOMO, REVENGE, DISCIPLINED, FEAR)  
• tags (Array) - e.g., ["Trendline Break", "Support Bounce"]  
• screenshot_url (String) - S3 link to chart image  
**6. Prop_Challenges**  
• id (UUID, PK)  
• user_id (FK)  
• start_date  
• status (ACTIVE, PASSED, FAILED)  
• failure_reason (String) - e.g., "Hit Daily Max Loss"  
# 4. Frontend Folder Structure (Next.js 14+)  
We use the **App Router** for modern navigation and server components.  
  
  
frontend/  
├── public/                  # Static assets (Images, Icons)  
├── src/  
│   ├── app/                 # Pages (App Router)  
│   │   ├── (auth)/          # Group: Login/Register pages  
│   │   ├── (dashboard)/     # Group: Authenticated pages  
│   │   │   ├── trade/       # The Main Trading Terminal  
│   │   │   ├── journal/     # Journal View  
│   │   │   ├── prop/        # Prop Firm Challenge Dashboard  
│   │   │   └── settings/  
│   │   ├── layout.tsx       # Main wrappers (Navbar, Sidebar)  
│   │   └── page.tsx         # Landing Page  
│   ├── components/  
│   │   ├── charts/          # TradingView Lightweight Charts wrapper  
│   │   ├── trade-panel/     # Buy/Sell forms, Leverage slider  
│   │   ├── journal/         # Calendar view, Note editor  
│   │   └── ui/              # Reusable atoms (Buttons, Inputs - ShadCN UI)  
│   ├── hooks/  
│   │   ├── useSocket.ts     # Handles WebSocket connection  
│   │   └── useStore.ts      # Global state (Zustand) for Portfolio data  
│   ├── lib/  
│   │   ├── api.ts           # Axios instance for REST calls  
│   │   └── utils.ts         # Format currency, Calculate PnL  
│   └── styles/  
│       └── globals.css      # Tailwind directives  
├── tailwind.config.ts  
└── package.json  
  
  
# 5. The Real-Time Data Pipeline (Crucial)  
This is the hardest part to get right. Here is the exact flow to ensure users see prices moving instantly:  
1. **Ingestion:** A Python script (services/market_stream.py) opens a WebSocket connection to **Bybit**.  
2. **Broadcasting:** Every time Bybit sends a price update, the Python script pushes it to **Redis Pub/Sub**.  
3. **Distribution:** The FastAPI backend subscribes to Redis.  
4. **Delivery:** FastAPI forwards the update to the frontend via a **WebSocket Endpoint** (/ws/ticker/{symbol}).  
5. **Visualization:** The React frontend receives the message and updates the TradingView chart candle without reloading the page.  
**Why this stack?**  
• **FastAPI:** It is asynchronous by default, making it perfect for handling thousands of open WebSocket connections for live trading.  
• **Next.js:** Great SEO for your landing pages (marketing) and fast rendering for the dashboard (app).  
• **PostgreSQL:** Relational data is strict. You cannot afford "data loss" or "eventual consistency" when dealing with (simulated) financial balances.  
