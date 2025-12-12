# AWS CONFIG  
  
This is the **AWS Backend Master Blueprint** for your Trading Simulator SaaS.  
It is designed for **High Availability (HA)**, **Real-Time Performance**, and **Security**. This architecture ensures your WebSocket connections remain stable (critical for trading charts) and your simulation engine can handle thousands of concurrent strategies.  
**1. The High-Level AWS Architecture**  
We will use a **Microservices-ready Monolith** pattern deployed on **AWS ECS (Elastic Container Service)**. This gives you the scalability of Docker without the complexity of Kubernetes (EKS).  
**The Core Stack**  
• **Compute:** AWS Fargate (Serverless Containers) for API; EC2 for heavy Simulation Workers.  
• **Database:** Amazon RDS (PostgreSQL) for user data/journals.  
• **Real-Time Layer:** Amazon ElastiCache (Redis) for Pub/Sub (live prices).  
• **Storage:** Amazon S3 for historical market data (parquet files) and chart screenshots.  
• **Traffic:** Application Load Balancer (ALB) with Sticky Sessions for WebSockets.  
**2. Detailed Infrastructure Components**  
**A. Networking (The Foundation)**  
• **VPC (Virtual Private Cloud):** Create a custom VPC with 3 Availability Zones (AZs) for redundancy.  
• **Subnets:**  
• **Public Subnets:** Only for the **Application Load Balancer (ALB)** and **NAT Gateways**.  
• **Private Subnets:** Where your **API Containers**, **Databases**, and **Redis** live. Zero direct internet access for backend services.  
• **Security Groups:**  
• ALB SG: Allow HTTPS (443) from everywhere (0.0.0.0/0).  
• App SG: Allow traffic ONLY from the ALB SG.  
• DB SG: Allow traffic ONLY from the App SG.  
**B. Compute Strategy (The Processing Power)**  
We split the application into two distinct services:  
1. **The API Service (FastAPI):**  
• **Deployment:** AWS ECS on **Fargate**.  
• **Role:** Handles User Auth, Rest API calls, and WebSocket connections.  
• **Scaling:** Auto-scale based on CPU usage or "Active Connection Count" (WebSockets).  
• **Configuration:** Enable "Sticky Sessions" on the ALB. This is critical for WebSockets to ensure a user stays connected to the same container instance during a session.  
2. **The Simulation Engine (Jesse Workers):**  
• **Deployment:** AWS ECS on **EC2 Spot Instances** (Cheaper) or Fargate.  
• **Role:** Runs the jesse_custom loop. It consumes market data from Redis, checks Stop Losses, and executes simulated orders.  
• **Why separate?** Simulation is CPU-intensive. If you run it on the API server, your API will lag. Separating them ensures your UI is always snappy.  
**C. Data & Real-Time Layer**  
1. **Amazon ElastiCache (Redis):**  
• **Role:** The "glues" of the system.  
• **Usage 1 (Pub/Sub):** The "Market Streamer" worker pushes price updates to a Redis Channel. The FastAPI API subscribes to it and forwards to Frontend via WebSocket.  
• **Usage 2 (Queue):** When a user places a trade, the API pushes a job to a Redis Queue. The Jesse Worker picks it up and processes it.  
2. **Amazon RDS (PostgreSQL):**  
• **Version:** PostgreSQL 15+.  
• **Optimization:** Use the TimescaleDB extension (if allowed on RDS) or simple table partitioning for the MarketCandles table, as this table will grow massive quickly.  
3. **Amazon S3 (Cold Storage):**  
• **Role:** Store historical candle data for the "Bar Replay" feature.  
• **Strategy:** Don't query the DB for 1 year of M1 candles. Download them to S3 as .parquet or .json files. The "Replay" engine fetches the file from S3, caching it in memory.  
**3. Development & DevOps Strategy**  
**A. The "12-Factor" App Config**  
• **Secrets Manager:** NEVER put passwords in your code or .env file. Store DB_PASSWORD, BYBIT_API_KEY, and JWT_SECRET in **AWS Secrets Manager**. Inject them into containers at runtime.  
• **Environment Variables:** Define ENVIRONMENT=production, DEBUG=False in the ECS Task Definition.  
**B. CI/CD Pipeline (GitHub Actions)**  
We need an automated pipeline. When you push code to main:  
1. **Test:** GitHub Action runs pytest suite.  
2. **Build:** Builds the Docker Image.  
3. **Push:** Uploads image to **Amazon ECR (Elastic Container Registry)**.  
4. **Deploy:** Updates the ECS Service to pull the new image (aws ecs update-service).  
**4. Step-by-Step Implementation Guide**  
Here is the exact order of operations for your developer:  
**Step 1: Local Docker Setup (The "Proof of Concept")**  
Before touching AWS, the app must run locally with docker-compose.  
• Container 1: FastAPI (API)  
• Container 2: Redis  
• Container 3: Postgres  
• Container 4: Celery/Worker (Jesse Engine)  
• Goal: Verify that when you "Buy" in FastAPI, the Worker sees the message in Redis.  
**Step 2: Infrastructure as Code (Terraform/CDK)**  
Do not click around the AWS Console manually. Use **Terraform** or **AWS CDK** to script the VPC, RDS, and ECS clusters. This makes the infrastructure "reproducible" if things break.  
**Step 3: The "Market Streamer" Service**  
Build a standalone Python script that:  
1. Connects to Bybit/Bitget WebSocket.  
2. Receives a tick.  
3. Normalizes it.  
4. Publishes it to Redis Channel ticker.{symbol}.  
• Validation: Connect a local WebSocket client to the API and ensure you see the price stream.  
**Step 4: The Historical Data Sync**  
Write a script (cron job) that runs every night at 00:05 UTC.  
1. Download yesterday's OHLCV data from Bybit.  
2. Save it to S3: s3://your-bucket/data/BTCUSDT/2025/12/10.parquet.  
3. Update the DB Index to know that this date is available.  
**5. Security Checklist (Fintech Standard)**  
Even though it's simulated money, treat it like a bank to build trust.  
• [ ] **WAF (Web Application Firewall):** Put this in front of your Load Balancer to block SQL Injection and DDoS attacks.  
• [ ] **HTTPS Enforcement:** Redirect all HTTP traffic to HTTPS at the Load Balancer level.  
• [ ] **Private Subnets:** Ensure the Database is NOT accessible from the public internet.  
• [ ] **Least Privilege:** The ECS Task Role should only have permission to read its specific S3 bucket and Secrets.  
