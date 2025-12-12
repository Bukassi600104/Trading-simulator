**MASTER ONBOARDING BLUEPRINT**  
  
# 1. The "Universal Entry" (Seconds 0-60)  
Goal: Frictionless registration and immediate segmentation.  
**Step 1: The Hook & Sign-Up**  
• **Landing Page CTA:** "Start Trading Risk-Free" (No Credit Card Required).  
• **Auth Modal:**  
• "Continue with Google" (Preferred - 1 click).  
• "Continue with Email" (Magic Link - no passwords to remember).  
• **Username Generation:** System auto-suggests a "Trader Tag" (e.g., BearWhale99) to reduce friction. User can edit later.  
**Step 2: The "Sorting Hat" (Segmentation)**  
• Screen: A beautiful, centered modal with three large cards.  
• Question: **"What is your trading experience?"**  
1. **"I'm a Beginner"** -> Triggers **Flow A (The Academy)**.  
2. **"I'm an Experienced Trader"** -> Triggers **Flow B (The Cockpit)**.  
3. **"I'm an Instructor/School"** -> Triggers **Flow C (The Command Center)**.  
# 2. Flow A: The "Rookie" Journey (Hand-Holding)  
Persona: Nervous, overwhelmed by charts, afraid of losing money (even fake money).  
Goal: Get them to execute ONE successful trade immediately.  
1. **The Welcome Gift:**  
• Popup: "Welcome to the floor! We've loaded your account with $10,000 (Simulated). Let's make your first profit."  
2. **The "Focus Mode" Tutorial (Overlay):**  
• The interface dims. Only the **Chart** and the **Buy Button** are highlighted.  
• Tooltip 1: "This is Bitcoin's live price."  
• Tooltip 2: "We think it's going up. Click **BUY** to open a position." (Force them to click).  
3. **The "First Win":**  
• System auto-executes the trade.  
• Tooltip 3: "Look here! This is your PnL (Profit & Loss). It moves in real-time."  
• Action: Wait for the price to tick up slightly (or fake a tiny green tick for the demo).  
• Tooltip 4: "You're in profit! Click **CLOSE** to bank the money."  
4. **The Reward:**  
• **Confetti Animation.**  
• Badge Unlocked: "First Blood".  
• Call to Action: "Now, try using the **Risk Calculator** to protect your next trade."  
# 3. Flow B: The "Pro" & "Prop Aspirant" Journey (Speed)  
Persona: Knows what a candlestick is. Hates popups. Wants to configure settings and test strategies.  
Goal: Show them the "Power Features" (Replay, Risk Calc, Journal).  
1. **The Setup Wizard (3 Steps):**  
• Step 1 (Asset Class): "What do you trade?" [Crypto Spot] [Crypto Futures].  
• Step 2 (Layout): "Choose your layout." [Clean Chart] [Data Heavy] [Multi-Chart].  
• Step 3 (Indicators): "Pre-load indicators?" (Checkboxes for RSI, MACD, EMA).  
2. **The "Prop Mode" Check (Critical):**  
• Question: "Are you training for a Prop Firm Challenge?"  
• If YES: Open the **"Rules Configurator"**.  
• "Set your Max Daily Drawdown (e.g., 5%)."  
• "Set your Profit Target (e.g., 10%)."  
• Result: Dashboard loads with the **"Challenge Gauge"** widget front-and-center.  
3. **Feature Spotlight (Non-Intrusive):**  
• Instead of a tutorial, use "Pulsing Beacons" (small glowing dots) on key differentiators:  
• Beacon on Replay Icon: "Click to practice on weekends."  
• Beacon on Order Panel: "Try our Risk Calculator."  
• Beacon on Journal Tab: "Your trades are auto-logged here."  
# 4. Flow C: The "Instructor" Journey (B2B)  
Persona: Wants to manage others. Needs administrative power.  
Goal: Create a "Classroom" and invite a student.  
1. **Organization Setup:**  
• Input: "School/Community Name."  
• Input: "Upload Logo" (White-labeling starts immediately).  
2. **The "Student Invite" Loop:**  
• Screen: Empty Class List.  
• Action: "Generate Invite Link."  
• Simulation: System creates a "Demo Student" bot so the instructor can see how the monitoring works.  
3. **The "God View" Demo:**  
• Instructor clicks "Spectate" on the Demo Student.  
• They see the student's screen in real-time.  
• Aha Moment: "I can watch my students trade live without looking over their shoulder."  
# 5. The "Day 1" Retention Strategy (Email/Notification)  
Onboarding doesn't end when they log out.  
• **1 Hour After Sign-up:**  
• Trigger: If they haven't joined a Clan.  
• Email: "Trading is lonely. Join 'The Bitcoin Bulls' clan to compete on the leaderboard."  
• **24 Hours After Sign-up:**  
• Trigger: If they used the Simulator.  
• Email: "Here is your **Daily Trading Report**. You made 5 trades. Your win rate was 40%. View your Automated Journal here." (This hook is incredibly sticky).  
# 6. Technical Implementation for Developers  
Directives to add to your AI Assistant Context.  
• **Frontend Library:** Use driver.js or react-joyride for the interactive tours.  
• **State Management:** Store onboarding_stage in the User Database (Postgres).  
• 0: Just Registered.  
• 1: Segmentation Complete.  
• 2: Tutorial Complete.  
• **"Fake" Data:** For Flow A (Rookie), the first "trade" should perhaps use a specialized "Demo Ticker" ensuring a small positive movement to guarantee a positive first psychological experience.  
