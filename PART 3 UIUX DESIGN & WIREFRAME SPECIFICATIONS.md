**PART 3: UI/UX DESIGN & WIREFRAME SPECIFICATIONS**  
  
## 1. Global Design System  
This sets the "vibe" of the platform. It must feel professional, trusted, and fast—like a Bloomberg Terminal but modernized for the web.  
• **Theme:** "Midnight Trader" (Dark Mode Default).  
• **Backgrounds:**  
• Primary: #0F172A (Deep Navy - Slate 900)  
• Secondary (Cards/Panels): #1E293B (Slate 800)  
• **Accents:**  
• Call to Action (Primary): #3B82F6 (Electric Blue)  
• Profit/Long: #10B981 (Mint Green)  
• Loss/Short: #EF4444 (Crimson Red)  
• Warning/Risk: #F59E0B (Amber Gold)  
• **Typography:** Inter (Google Font). Clean, legible numbers are critical for trading.  
• Numbers: Monospaced font (e.g., JetBrains Mono or Roboto Mono) for prices/PnL to prevent jitter when digits change.  
## 2. Screen-by-Screen Wireframes  
**Screen A: The Main Dashboard (Home)**  
Goal: Snapshot of health. The user lands here after login.  
• **Layout:** 3-Column Grid.  
• **Top Bar:** Global Nav (Trade, Journal, Strategies, Clans) + User Profile + "Go Pro" Button.  
• **Left Column (Portfolio Health):**  
• **Equity Curve Chart:** Line graph showing account balance over the last 30 days.  
• **Key Stats:** Balance ($), Unrealized PnL, Win Rate %.  
• **Middle Column (Active Status):**  
• **Prop Challenge Widget:** (Critical) A gauge chart showing progress toward the Profit Target. Below it, a "Danger Zone" bar showing distance to Max Daily Drawdown.  
• **Open Positions:** Summary list of currently active trades.  
• **Right Column (Social/News):**  
• **Clan Rank:** "Your Clan is #4 today."  
• **Affiliate Teaser:** "Ready to trade real money? [Claim Bybit Bonus]."  
**Screen B: The Trading Terminal (The "Cockpit")**  
Goal: Execution and Analysis. This is where users spend 90% of their time.  
• **Layout:** "Holy Grail" Layout (Header, Left Sidebar, Center Chart, Right Order Panel, Bottom Panel).  
• **Center: The Chart (TradingView)**  
• **Top Overlay:** Symbol Search (e.g., BTC/USDT), Timeframe Selector (1m, 15m, 4h).  
• **Replay Controls:** A subtle floating bar at the bottom center: [ << ] [ Play ] [ >> ] [ Speed: 1x ].  
• **Visual Trading:** Drag-and-drop lines for Stop Loss and Take Profit directly on the chart.  
• **Right Sidebar: Order Panel**  
• **Tabs:** Limit | Market | Stop.  
• **Risk Calculator (The "Magic" Feature):**  
• Input: Risk: [ 1% ] (User selects percentage).  
• Input: Stop Price: [ 65000 ].  
• Output: System auto-fills Quantity: 0.15 BTC to match the risk.  
• **Big Buttons:** [ BUY / LONG (Green) ] | [ SELL / SHORT (Red) ].  
• **Bottom Panel: Data Table**  
• **Tabs:** Open Positions | Pending Orders | Trade History | Journal.  
• **Quick Actions:** "Close All" button, "Edit TP/SL" pencil icon.  
**Screen C: The Automated Journal**  
Goal: Reflection and improvement.  
• **Layout:** Calendar View + List View split.  
• **Left Panel (Calendar):** A monthly calendar where days are colored Green (Profitable), Red (Loss), or Grey (No Trade).  
• **Right Panel (Details):**  
• Clicking a day on the calendar loads the trade list for that day.  
• **Trade Card:** Shows Symbol, PnL, and Tags.  
• **"Edit" Mode:** Clicking a trade opens the **Journal Modal**.  
• **Journal Modal (Popup):**  
• Left: The Chart Snapshot (auto-captured at entry).  
• Right:  
• Text Area: "What was your thesis?"  
• Emotion Selector: [😱 Fear] [😎 Confident] [😡 Revenge].  
• Tags: [Breakout] [Trend Follow].  
**Screen D: Prop Firm "Challenge" Dashboard**  
Goal: Anxiety management and rule tracking.  
• **Layout:** Single Page, "Command Center" style.  
• **Header:** "Phase 1 Evaluation: 4 Days Remaining".  
• **Main Visuals (The "Gauges"):**  
1. **Profit Target:** Circular progress bar (0% -> 10%). Green fill.  
2. **Max Daily Loss:** Linear bar (0% -> 5%). Fills Red. If it hits 100%, account locks.  
3. **Max Total Loss:** Linear bar (0% -> 10%). Fills Red.  
• **Rules Checklist:**  
• [✅] Minimum Trading Days (3/5).  
• [❌] Profit Target Reached.  
• [✅] No Weekend Holding.  
**Screen E: Strategy Builder (No-Code)**  
Goal: Create algo strategies without Python knowledge.  
• **Layout:** Drag-and-Drop Canvas (Left) + Properties (Right).  
• **Canvas:** Users drag blocks like "RSI", "Moving Average", "Crosses Over".  
• Example Connection: [ RSI < 30 ] --connects to--> [ BUY Signal ].  
• **Bottom Bar:** "Backtest" Button.  
• **Results View:** Once "Backtest" is clicked, a timeline appears showing Equity Growth vs. Buy & Hold.  
## 3. User Experience (UX) "Micro-Interactions"  
These small details make the app feel "premium."  
1. **The "Fill" Sound:** When an order is filled, play a subtle, satisfying "ching" or "click" sound (customizable).  
2. **PnL Color Pulse:** When a trade is open, the PnL number flashes slightly brighter Green or Red when the price ticks, drawing the eye.  
3. **Confetti:** When a user passes a Prop Challenge or hits a new All-Time High balance, trigger a confetti animation.  
4. **Toast Notifications:** Non-intrusive popups in the bottom-right: "Order Filled: Long BTC @ 65,000".  
## 4. Mobile Responsiveness Strategy  
While trading is best on desktop, checking positions is mobile-first.  
• **Desktop:** Full functionality (Strategy building, Replay, etc.).  
• **Mobile Web:**  
• Hidden: Strategy Builder, Replay Mode.  
• Optimized: The "Portfolio Overview" and "Close Position" buttons are larger and thumb-friendly.  
• Navigation: Bottom Tab Bar (Home | Trade | Journal | Settings).  
