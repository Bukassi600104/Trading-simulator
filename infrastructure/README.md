# Terminal Zero - AWS Infrastructure

This directory contains all infrastructure-as-code (IaC) and deployment configurations for the Terminal Zero trading simulator.

## 📁 Directory Structure

```
infrastructure/
├── docker/                    # Production Docker images
│   ├── api.Dockerfile         # FastAPI backend
│   ├── worker.Dockerfile      # Jesse engine worker
│   └── streamer.Dockerfile    # Market data streamer
├── terraform/                 # AWS infrastructure
│   ├── main.tf               # Provider and random resources
│   ├── variables.tf          # Input variables
│   ├── vpc.tf                # VPC, subnets, security groups
│   ├── rds.tf                # PostgreSQL database
│   ├── elasticache.tf        # Redis cluster
│   ├── ecs.tf                # ECS cluster and services
│   ├── alb.tf                # Application Load Balancer
│   ├── s3.tf                 # S3 buckets
│   ├── secrets.tf            # Secrets Manager
│   ├── outputs.tf            # Terraform outputs
│   └── terraform.tfvars.example
├── scripts/                   # Deployment scripts
│   ├── build-and-push.sh     # Build and push to ECR
│   ├── deploy-ecs.sh         # Deploy to ECS
│   └── init-secrets.sh       # Initialize secrets
└── AWS_DEPLOYMENT_PLAN.md    # Detailed deployment guide
```

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **Docker** with BuildKit support
4. **ACM Certificate** for your domain (HTTPS)

### Step 1: Configure Variables

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### Step 2: Initialize and Apply Terraform

```bash
terraform init
terraform plan
terraform apply
```

### Step 3: Build and Push Docker Images

```bash
cd ../scripts
chmod +x *.sh
./build-and-push.sh all
```

### Step 4: Initialize Secrets

```bash
./init-secrets.sh
```

### Step 5: Deploy to ECS

```bash
./deploy-ecs.sh all
```

## 🔧 Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `project_name` | Project identifier | `terminal-zero` |
| `environment` | Deployment environment | `staging` or `production` |
| `aws_region` | AWS region | `us-east-1` |
| `acm_certificate_arn` | SSL certificate ARN | `arn:aws:acm:...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `api_cpu` | 512 | API task CPU units |
| `api_memory` | 1024 | API task memory (MB) |
| `api_desired_count` | 2 | API task count |
| `enable_waf` | true | Enable AWS WAF |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     VPC (10.0.0.0/16)                      │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Public Subnets (3 AZs)                  │  │  │
│  │  │    ┌─────────┐    ┌─────────┐    ┌─────────┐        │  │  │
│  │  │    │   ALB   │    │   NAT   │    │   NAT   │        │  │  │
│  │  │    └────┬────┘    └────┬────┘    └────┬────┘        │  │  │
│  │  └─────────┼──────────────┼──────────────┼─────────────┘  │  │
│  │            │              │              │                 │  │
│  │  ┌─────────▼──────────────▼──────────────▼─────────────┐  │  │
│  │  │              Private Subnets (3 AZs)                 │  │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │  │  │
│  │  │  │ ECS API │  │ ECS API │  │ Worker  │  │Streamer│  │  │  │
│  │  │  │ Fargate │  │ Fargate │  │  SPOT   │  │ Fargate│  │  │  │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘  │  │  │
│  │  └───────┼────────────┼────────────┼──────────┼────────┘  │  │
│  │          │            │            │          │           │  │
│  │  ┌───────▼────────────▼────────────▼──────────▼────────┐  │  │
│  │  │                    Data Layer                        │  │  │
│  │  │    ┌────────────┐         ┌────────────┐            │  │  │
│  │  │    │    RDS     │         │   Redis    │            │  │  │
│  │  │    │ PostgreSQL │         │ ElastiCache│            │  │  │
│  │  │    │ Multi-AZ   │         │ Multi-AZ   │            │  │  │
│  │  │    └────────────┘         └────────────┘            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 💰 Estimated Costs

| Service | Monthly Cost (Staging) |
|---------|----------------------|
| ECS Fargate (API) | ~$40 |
| ECS Fargate (Worker/Spot) | ~$10 |
| RDS PostgreSQL (db.t3.medium) | ~$60 |
| ElastiCache Redis | ~$50 |
| ALB | ~$20 |
| NAT Gateway (3x) | ~$100 |
| S3 | ~$5 |
| Secrets Manager | ~$3 |
| CloudWatch | ~$10 |
| **Total** | **~$300/month** |

For production with more capacity, expect ~$500-800/month.

## 🔐 Security Features

- **VPC Isolation**: Private subnets for all compute resources
- **Security Groups**: Least-privilege network access
- **Encryption at Rest**: RDS, ElastiCache, S3
- **Encryption in Transit**: TLS 1.3 everywhere
- **Secrets Manager**: No credentials in code
- **WAF**: Rate limiting and SQL injection protection
- **IAM Roles**: Minimal permissions per service

## 📊 Monitoring

### CloudWatch Dashboards

After deployment, access monitoring at:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards
```

### Log Groups

- `/ecs/terminal-zero-staging-api` - API logs
- `/ecs/terminal-zero-staging-worker` - Worker logs
- `/ecs/terminal-zero-staging-streamer` - Streamer logs

### Useful Commands

```bash
# Tail API logs
aws logs tail /ecs/terminal-zero-staging-api --follow

# Check service status
aws ecs describe-services \
  --cluster terminal-zero-staging-cluster \
  --services terminal-zero-staging-api-service

# Scale API service
aws ecs update-service \
  --cluster terminal-zero-staging-cluster \
  --service terminal-zero-staging-api-service \
  --desired-count 4
```

## 🔄 CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. Runs tests on all PRs
2. Builds Docker images on push to `main`/`staging`
3. Pushes to ECR
4. Deploys to ECS
5. Waits for deployment to stabilize

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

## 🆘 Troubleshooting

### ECS Tasks Not Starting

1. Check CloudWatch logs for errors
2. Verify secrets are populated correctly
3. Check security group rules

### Database Connection Issues

```bash
# Test connectivity from bastion
psql -h <rds-endpoint> -U tzadmin -d terminal_zero
```

### Redis Connection Issues

```bash
# Test from inside VPC
redis-cli -h <redis-endpoint> ping
```

## 📚 Documentation

- [AWS_DEPLOYMENT_PLAN.md](./AWS_DEPLOYMENT_PLAN.md) - Detailed deployment guide
- [Simulator.md](../Simulator.md) - Product requirements
- [PART 2 TECHNICAL ARCHITECTURE*.md](../PART%202%20TECHNICAL%20ARCHITECTURE*.md) - Architecture decisions
