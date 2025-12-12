# Features  
  
# PART 1: KEY FEATURES & FUNCTIONAL ARCHITECTURE  
# 1. Core Simulation Engine (The "Heart" of the Platform)  
This is the differentiator. Unlike generic paper trading, this engine replicates the exact friction and mechanics of a real exchange.  
**A. Multi-Market Simulation (Spot & Futures)**  
• **Feature Description:** Users can select between "Spot" (buying actual assets) and "Futures" (contracts with leverage).  
• **Functional Detail:**  
• **Leverage Logic:** Adjustable leverage slider (1x to 100x) for Futures.  
• **Margin Modes:** Support for both "Cross" and "Isolated" margin logic.  
• **Liquidation Engine:** The system must calculate a liquidation price based on the user’s leverage and maintenance margin. If price hits this level, the trade is auto-closed (simulating a "bust").  
• **Wireframe Implementation:**  
• **Top Bar:** A toggle switch [ SPOT | FUTURES ].  
• **Order Panel:** When "Futures" is active, a "Leverage" slider appears (1x to 100x) along with a "Margin Mode" dropdown.  
**B. "Bar Replay" Mode (The Practice Accelerator)**  
• **Feature Description:** Allows users to travel back in time to any specific date and replay the market candle-by-candle.  
• **Functional Detail:**  
• **Data buffering:** Pre-loads historical data around the selected timestamp to prevent lag.  
• **Controls:** Play, Pause, Forward (1 candle), Rewind (1 candle), Speed (0.5x, 1x, 5x, 10x).  
• **"Blinders" Logic:** Crucial feature—market data after the current replay timestamp is strictly hidden from the simulation engine to prevent "cheating."  
• **Wireframe Implementation:**  
• **Chart Header:** A "Replay" icon button. Clicking it opens a calendar modal to pick a start date.  
• **Floating Control Bar:** Once active, a floating player appears at the bottom center of the chart with << | > | >> controls.  
**C. Prop Firm "Challenge" Mode (Monetization Engine)**  
• **Feature Description:** A gamified mode where users attempt to pass a simulated "evaluation" to earn a certificate.  
• **Functional Detail:**  
• **Rules Engine:** The backend tracks specific failure conditions in real-time:  
• Max Daily Drawdown: e.g., equity cannot drop 5% in a single 24h period.  
• Max Total Drawdown: e.g., equity cannot drop 10% from starting balance.  
• Profit Target: e.g., reach +10% profit.  
• **Auto-Fail/Pass:** If a rule is broken, the account is instantly locked (Fail). If target is hit, a "Certificate" is generated (Pass).  
• **Wireframe Implementation:**  
• **Dashboard Widget:** A "Challenge Status" card showing progress bars for "Daily Loss Limit" and "Profit Target."  
• **Visual Cues:** If drawdown nears the limit, the UI borders flash red warning signals.  
# 2. Advanced Trading Interface (The "Cockpit")  
**D. Risk Calculator & Execution Widget**  
• **Feature Description:** Solves the #1 problem for beginners—calculating position size.  
• **Functional Detail:**  
• **Input Fields:** "Entry Price," "Stop Loss Price," "Account Risk %" (e.g., 1%).  
• **Auto-Calculation:** The system automatically calculates the exact quantity (lots) needed so that if the Stop Loss is hit, the user loses exactly the % risked.  
• **One-Click Entry:** A "Place Order" button that submits this pre-calculated order immediately.  
• **Wireframe Implementation:**  
• **Right Sidebar:** An "Advanced Order" tab.  
• **Visual Helper:** When typing "Stop Loss," a horizontal line appears on the chart that the user can drag up/down to set the price visually.  
**E. Automated Trading Journal**  
• **Feature Description:** Automatically logs every trade with rich context, removing the need for Excel sheets.  
• **Functional Detail:**  
• **Auto-Capture:** Records Entry Date, Exit Date, Duration, Commission, PnL, Asset, and Direction (Long/Short).  
• **User Enrichment:** Post-trade popup asks: "How did you feel?" (Emotion tags: Fear, Greed, Calm) and "What was your setup?" (Strategy tags: Breakout, Reversal).  
• **Screenshot:** The chart view at the moment of entry/exit is auto-saved as an image attachment.  
• **Wireframe Implementation:**  
• **Bottom Panel:** A "Journal" tab below the chart. Clicking a trade row expands a detailed modal showing the chart snapshot and notes.  
# 3. Social & Educational Ecosystem (Retention)  
**F. Clans & Trading Desks**  
• **Feature Description:** Multiplayer functionality where users join teams.  
• **Functional Detail:**  
• **Aggregated Metrics:** The "Clan Score" is the average PnL of its top 5 members.  
• **Chat/Shoutbox:** A private chat room for Clan members to discuss setups.  
• **Wireframe Implementation:**  
• **Sidebar Nav:** "Community" icon.  
• **Clan Page:** Shows a roster of members, total AUM (simulated), and a "Battle" history against other clans.  
**G. Instructor/School "God Mode"**  
• **Feature Description:** For B2B white-label clients (trading schools).  
• **Functional Detail:**  
• **Student Oversight:** Instructor can view a list of all students and click "Spectate" to see their live screen/portfolio.  
• **Assignment System:** Instructor sets a task (e.g., "Place 5 trades on BTC/USDT"). System tracks completion.  
• **Wireframe Implementation:**  
• **Admin Dashboard:** A "Classroom" tab. Table view of students with columns for "Current PnL," "Active Trades," and "Last Login."  
# 4. Technical Feasibility & Data Handling  
**H. The Data Pipeline (BYBIT/Bitget)**  
• **Real-Time:** WebSockets connect to BYBIT public channels to push price updates to the UI every 100ms.  
• **Historical:** A background worker ("The Scraper") runs nightly to download yesterday's M1 (1-minute) candles, sanitize them (remove gaps), and store them in PostgreSQL for the "Replay" mode.  
**I. Affiliate "Off-Ramp" Integration**  
• **Smart Triggers:** If a user hits +20% profit in simulation, a modal appears: "You're crushing it! Ready for the real thing? Get a $30 bonus on BYBIT."  
• **Tracking:** Clicks are tracked via unique affiliate IDs to attribute revenue.  
