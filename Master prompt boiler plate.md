# Master prompt boiler plate  
  
# PHASE 1: SKELETON & DATA STREAMING  
  
## 1. CONTEXT  
Refer to the "Master Context" I provided earlier. We are starting development now.  
We will adopt an iterative approach. Do not hallucinate features from Phase 4 yet. Focus ONLY on Phase 1.  
  
## 2. OBJECTIVE  
Initialize the project repository and establish a live WebSocket connection to Bybit that broadcasts prices to a Next.js frontend.  
  
## 3. TASKS  
### A. Project Scaffolding  
- Create the folder structure as defined in the Architecture Blueprint.  
- Initialize `backend/` (FastAPI) and `frontend/` (Next.js).  
- Create `docker-compose.yml` with:  
    - `api`: FastAPI (Port 8000)  
    - `web`: Next.js (Port 3000)  
    - `redis`: Alpine image (Port 6379)  
    - `db`: Postgres 15 (Port 5432)  
  
### B. Backend Implementation (FastAPI)  
- Install `ccxt`, `redis`, `websockets`.  
- Create a service `services/market_stream.py`:  
    - Connect to Bybit USDT Perpetual WebSocket.  
    - Subscribe to `BTCUSDT`.  
    - Push price updates to Redis Pub/Sub channel `ticker:BTCUSDT`.  
- Create a WebSocket Endpoint `ws://localhost:8000/ws/ticker/{symbol}`:  
    - Subscribe to Redis channel.  
    - Forward messages to the connected client.  
  
### C. Frontend Implementation (Next.js)  
- Install `lightweight-charts`.  
- Create a component `StreamingChart.tsx`:  
    - Connect to the Backend WebSocket.  
    - Render a simple Candle chart.  
    - Update the last candle in real-time when a message arrives.  
  
## 4. ACCEPTANCE CRITERIA  
1.  I can run `docker-compose up`.  
2.  I can open `localhost:3000` and see a Chart.  
3.  The Chart candles move in real-time without refreshing the page.  
  
  
  
  
  
# MASTER CONTEXT: TERMINAL ZERO (TRADING SIMULATOR)  
  
## PROJECT GOAL  
Building a high-frequency crypto trading simulator (SaaS) that mimics real exchanges (Bybit/Bitget) using simulated funds.  
Stack: Next.js 14 (Frontend), FastAPI (Backend), PostgreSQL (DB), Redis (Cache/PubSub), Jesse (Trading Engine).  
Infrastructure: Docker, AWS ECS.  
  
## ARCHITECTURE RULES  
1. **Real-Time First:** Prices stream via Redis Pub/Sub -> WebSockets -> Frontend.  
2. **Anti-Cheat:** Server validates all order timestamps against server ticks. Atomic DB locks for balances.  
3. **Strict Typing:** Pydantic for Backend, TypeScript Interfaces for Frontend. No 'any'.  
4. **Zero-Crash:** All 500 errors must be caught and logged via Loguru/Sentry.  
  
## DIRECTORY STRUCTURE PREFERENCE  
- /backend (Python/FastAPI)  
- /frontend (Next.js App Router)  
- /worker (Jesse Engine)  
