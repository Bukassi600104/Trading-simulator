# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - AWS DEPLOYMENT PLAN
# ═══════════════════════════════════════════════════════════════════════════════
# Following the AWS CONFIG.md Blueprint for High Availability & Real-Time Performance
# ═══════════════════════════════════════════════════════════════════════════════════

## 📋 PRE-DEPLOYMENT CHECKLIST

### AWS Account Setup
- [ ] AWS Account created with billing alerts configured
- [ ] IAM Admin User created (avoid using root)
- [ ] AWS CLI installed and configured locally
- [ ] MFA enabled on all accounts

### Required AWS Services
- [ ] VPC (Virtual Private Cloud)
- [ ] ECS (Elastic Container Service) with Fargate
- [ ] ECR (Elastic Container Registry)
- [ ] RDS (PostgreSQL 15+)
- [ ] ElastiCache (Redis)
- [ ] S3 (Storage)
- [ ] ALB (Application Load Balancer)
- [ ] Secrets Manager
- [ ] CloudWatch (Logging/Monitoring)
- [ ] WAF (Web Application Firewall)
- [ ] Route 53 (Optional - DNS)
- [ ] ACM (Certificate Manager - for HTTPS)

---

## 🏗️ PHASE 1: NETWORKING (VPC SETUP)

### 1.1 Create VPC
```
VPC Name: terminal-zero-vpc
CIDR Block: 10.0.0.0/16
Enable DNS hostnames: Yes
Enable DNS resolution: Yes
```

### 1.2 Create Subnets (3 Availability Zones)

#### Public Subnets (For ALB & NAT Gateway)
| Name | CIDR | AZ |
|------|------|-----|
| public-subnet-1a | 10.0.1.0/24 | us-east-1a |
| public-subnet-1b | 10.0.2.0/24 | us-east-1b |
| public-subnet-1c | 10.0.3.0/24 | us-east-1c |

#### Private Subnets (For ECS, RDS, Redis)
| Name | CIDR | AZ |
|------|------|-----|
| private-subnet-1a | 10.0.11.0/24 | us-east-1a |
| private-subnet-1b | 10.0.12.0/24 | us-east-1b |
| private-subnet-1c | 10.0.13.0/24 | us-east-1c |

### 1.3 Create Internet Gateway
- Attach to VPC

### 1.4 Create NAT Gateways
- One per AZ for high availability
- Place in public subnets

### 1.5 Route Tables
- Public RT: Route 0.0.0.0/0 → Internet Gateway
- Private RT: Route 0.0.0.0/0 → NAT Gateway

### 1.6 Security Groups

#### ALB Security Group (alb-sg)
| Type | Port | Source |
|------|------|--------|
| HTTPS | 443 | 0.0.0.0/0 |
| HTTP | 80 | 0.0.0.0/0 (redirect to HTTPS) |

#### App Security Group (app-sg)
| Type | Port | Source |
|------|------|--------|
| Custom TCP | 8000 | alb-sg |
| Custom TCP | 8001 | alb-sg (WebSocket) |

#### Database Security Group (db-sg)
| Type | Port | Source |
|------|------|--------|
| PostgreSQL | 5432 | app-sg |

#### Redis Security Group (redis-sg)
| Type | Port | Source |
|------|------|--------|
| Custom TCP | 6379 | app-sg |

---

## 🗄️ PHASE 2: DATA LAYER

### 2.1 Amazon RDS (PostgreSQL)
```
Engine: PostgreSQL 15.4
Instance Class: db.t3.medium (start small, scale later)
Storage: 100GB gp3 (with autoscaling enabled)
Multi-AZ: Yes (for production)
DB Name: terminal_zero
Master Username: t0_admin
Subnet Group: Private subnets only
Security Group: db-sg
Backup Retention: 7 days
Encryption: Yes (AES-256)
```

### 2.2 Amazon ElastiCache (Redis)
```
Engine: Redis 7.x
Node Type: cache.t3.medium
Number of Replicas: 2 (Multi-AZ)
Cluster Mode: Disabled (for simplicity)
Subnet Group: Private subnets only
Security Group: redis-sg
Encryption at-rest: Yes
Encryption in-transit: Yes
```

### 2.3 Amazon S3 Buckets
```
Bucket 1: terminal-zero-market-data
  - Purpose: Historical candle data (Parquet files)
  - Lifecycle: Move to Glacier after 90 days

Bucket 2: terminal-zero-assets
  - Purpose: Chart screenshots, user uploads
  - CloudFront distribution for fast access

Bucket 3: terminal-zero-logs
  - Purpose: Application logs backup
```

---

## 📦 PHASE 3: CONTAINER REGISTRY (ECR)

### 3.1 Create Repositories
```bash
aws ecr create-repository --repository-name terminal-zero/api
aws ecr create-repository --repository-name terminal-zero/worker
aws ecr create-repository --repository-name terminal-zero/market-streamer
```

### 3.2 Lifecycle Policy
- Keep only last 10 images per repository
- Auto-delete untagged images after 7 days

---

## 🚀 PHASE 4: COMPUTE (ECS FARGATE)

### 4.1 ECS Cluster
```
Cluster Name: terminal-zero-cluster
Capacity Provider: FARGATE, FARGATE_SPOT
Container Insights: Enabled
```

### 4.2 Task Definitions

#### API Service Task
```json
{
  "family": "t0-api-task",
  "cpu": "512",
  "memory": "1024",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/t0-api-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/terminal-zero/api:latest",
      "portMappings": [
        {"containerPort": 8000, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "DEBUG", "value": "false"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/t0-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      }
    }
  ]
}
```

#### Worker Task (Jesse Engine)
```json
{
  "family": "t0-worker-task",
  "cpu": "1024",
  "memory": "2048",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/terminal-zero/worker:latest"
    }
  ]
}
```

#### Market Streamer Task
```json
{
  "family": "t0-streamer-task",
  "cpu": "256",
  "memory": "512",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "containerDefinitions": [
    {
      "name": "streamer",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/terminal-zero/market-streamer:latest"
    }
  ]
}
```

### 4.3 ECS Services

#### API Service
```
Service Name: t0-api-service
Task Definition: t0-api-task
Desired Count: 2 (minimum for HA)
Launch Type: FARGATE
Load Balancer: terminal-zero-alb
Health Check Grace Period: 60s
Auto Scaling: 
  - Min: 2, Max: 10
  - Scale on CPU > 70%
  - Scale on Active WebSocket Connections > 1000
```

#### Worker Service
```
Service Name: t0-worker-service
Task Definition: t0-worker-task
Desired Count: 2
Launch Type: FARGATE_SPOT (cost savings)
Auto Scaling:
  - Min: 1, Max: 5
  - Scale on SQS Queue Depth
```

---

## ⚖️ PHASE 5: LOAD BALANCER

### 5.1 Application Load Balancer
```
Name: terminal-zero-alb
Scheme: internet-facing
IP address type: ipv4
Subnets: All public subnets
Security Group: alb-sg
```

### 5.2 Target Groups

#### API Target Group
```
Name: t0-api-tg
Target Type: IP
Protocol: HTTP
Port: 8000
Health Check: /health
Stickiness: Enabled (1 hour) - CRITICAL for WebSocket
```

### 5.3 Listeners

#### HTTPS Listener (443)
```
Protocol: HTTPS
Certificate: ACM Certificate (*.yourdomain.com)
Default Action: Forward to t0-api-tg
```

#### HTTP Listener (80)
```
Protocol: HTTP
Default Action: Redirect to HTTPS
```

### 5.4 Listener Rules
```
Rule 1: Path /ws/* → t0-api-tg (WebSocket)
Rule 2: Path /api/* → t0-api-tg (REST API)
Rule 3: Default → t0-api-tg
```

---

## 🔐 PHASE 6: SECRETS & SECURITY

### 6.1 AWS Secrets Manager
Create secrets for:
```
terminal-zero/database
  - DB_HOST
  - DB_PORT
  - DB_NAME
  - DB_USER
  - DB_PASSWORD

terminal-zero/redis
  - REDIS_HOST
  - REDIS_PORT
  - REDIS_PASSWORD

terminal-zero/app
  - JWT_SECRET
  - JWT_ALGORITHM
  - BYBIT_API_KEY (if needed)
  - BYBIT_API_SECRET (if needed)

terminal-zero/external
  - PAYSTACK_SECRET_KEY
  - SENTRY_DSN
```

### 6.2 IAM Roles

#### ECS Task Execution Role
```
Permissions:
- AmazonECSTaskExecutionRolePolicy
- secretsmanager:GetSecretValue (for specific secrets)
- ecr:GetAuthorizationToken
- ecr:BatchGetImage
- logs:CreateLogStream
- logs:PutLogEvents
```

#### ECS Task Role (for application)
```
Permissions:
- s3:GetObject (terminal-zero-market-data/*)
- s3:PutObject (terminal-zero-assets/*)
- secretsmanager:GetSecretValue
```

### 6.3 WAF (Web Application Firewall)
```
Web ACL: terminal-zero-waf
Rules:
- AWS-AWSManagedRulesCommonRuleSet
- AWS-AWSManagedRulesSQLiRuleSet
- Rate Limit: 2000 requests per 5 minutes per IP
```

---

## 📊 PHASE 7: MONITORING & LOGGING

### 7.1 CloudWatch Log Groups
```
/ecs/t0-api
/ecs/t0-worker
/ecs/t0-streamer
/rds/terminal-zero
```

### 7.2 CloudWatch Alarms
```
- API CPU > 80% for 5 minutes
- API Memory > 80% for 5 minutes
- RDS CPU > 80% for 10 minutes
- RDS Storage < 20% remaining
- Redis Memory > 80%
- ALB 5xx errors > 10 per minute
- ALB latency > 500ms average
```

### 7.3 CloudWatch Dashboard
Create dashboard with:
- API request count
- API latency percentiles
- WebSocket connection count
- RDS connections
- Redis memory usage
- Error rates

---

## 🔄 PHASE 8: CI/CD PIPELINE

### 8.1 GitHub Actions Workflow
See `.github/workflows/deploy.yml`

### 8.2 Deployment Strategy
- Blue/Green deployment for zero-downtime
- Automatic rollback on health check failure

---

## 💰 ESTIMATED MONTHLY COSTS (US-EAST-1)

| Service | Configuration | Est. Monthly Cost |
|---------|--------------|-------------------|
| ECS Fargate (API) | 2 tasks, 0.5 vCPU, 1GB | ~$30 |
| ECS Fargate (Worker) | 2 tasks, 1 vCPU, 2GB | ~$60 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ | ~$70 |
| ElastiCache Redis | cache.t3.medium, 2 nodes | ~$50 |
| ALB | 1 ALB + data transfer | ~$25 |
| S3 | ~50GB storage | ~$5 |
| NAT Gateway | 2 gateways | ~$70 |
| Secrets Manager | 10 secrets | ~$5 |
| CloudWatch | Logs + Metrics | ~$20 |
| **TOTAL** | | **~$335/month** |

*Note: Costs will increase with traffic. Consider Reserved Instances for 40% savings.*

---

## 🚀 DEPLOYMENT COMMANDS

### Initial Setup (One-time)
```bash
# 1. Configure AWS CLI
aws configure

# 2. Create ECR repositories
./scripts/create-ecr-repos.sh

# 3. Apply Terraform infrastructure
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# 4. Create secrets in Secrets Manager
./scripts/create-secrets.sh
```

### Deploy Application
```bash
# Build and push Docker images
./scripts/build-and-push.sh

# Deploy to ECS
./scripts/deploy-ecs.sh
```

---

## 📁 FILE STRUCTURE FOR AWS SETUP

```
infrastructure/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── vpc.tf
│   ├── ecs.tf
│   ├── rds.tf
│   ├── elasticache.tf
│   ├── alb.tf
│   ├── s3.tf
│   └── secrets.tf
├── docker/
│   ├── api.Dockerfile
│   ├── worker.Dockerfile
│   └── streamer.Dockerfile
└── scripts/
    ├── create-ecr-repos.sh
    ├── build-and-push.sh
    ├── deploy-ecs.sh
    └── create-secrets.sh
```
