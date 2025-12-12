# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - TERRAFORM OUTPUTS
# ═══════════════════════════════════════════════════════════════════════════════
# Exported values for use in deployment scripts and CI/CD
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# VPC & Networking
# ─────────────────────────────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# ─────────────────────────────────────────────────────────────────────────────
# Load Balancer
# ─────────────────────────────────────────────────────────────────────────────
output "alb_dns_name" {
  description = "ALB DNS name (use for CNAME records)"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (for Route53 alias)"
  value       = aws_lb.main.zone_id
}

output "api_url" {
  description = "API endpoint URL"
  value       = "https://${aws_lb.main.dns_name}"
}

# ─────────────────────────────────────────────────────────────────────────────
# ECR Repositories
# ─────────────────────────────────────────────────────────────────────────────
output "ecr_api_repository_url" {
  description = "ECR repository URL for API"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_worker_repository_url" {
  description = "ECR repository URL for Worker"
  value       = aws_ecr_repository.worker.repository_url
}

output "ecr_streamer_repository_url" {
  description = "ECR repository URL for Market Streamer"
  value       = aws_ecr_repository.streamer.repository_url
}

# ─────────────────────────────────────────────────────────────────────────────
# ECS
# ─────────────────────────────────────────────────────────────────────────────
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_api_service_name" {
  description = "ECS API service name"
  value       = aws_ecs_service.api.name
}

output "ecs_worker_service_name" {
  description = "ECS Worker service name"
  value       = aws_ecs_service.worker.name
}

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgres.db_name
}

# ─────────────────────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────────────────────
output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

# ─────────────────────────────────────────────────────────────────────────────
# S3 Buckets
# ─────────────────────────────────────────────────────────────────────────────
output "s3_market_data_bucket" {
  description = "S3 bucket for market data"
  value       = aws_s3_bucket.market_data.id
}

output "s3_assets_bucket" {
  description = "S3 bucket for static assets"
  value       = aws_s3_bucket.assets.id
}

output "s3_logs_bucket" {
  description = "S3 bucket for logs"
  value       = aws_s3_bucket.logs.id
}

# ─────────────────────────────────────────────────────────────────────────────
# Secrets Manager
# ─────────────────────────────────────────────────────────────────────────────
output "secrets_database_arn" {
  description = "Secrets Manager ARN for database credentials"
  value       = aws_secretsmanager_secret.database.arn
}

output "secrets_redis_arn" {
  description = "Secrets Manager ARN for Redis credentials"
  value       = aws_secretsmanager_secret.redis.arn
}

output "secrets_app_arn" {
  description = "Secrets Manager ARN for application secrets"
  value       = aws_secretsmanager_secret.app.arn
}

output "secrets_bybit_arn" {
  description = "Secrets Manager ARN for Bybit API credentials"
  value       = aws_secretsmanager_secret.bybit.arn
}

# ─────────────────────────────────────────────────────────────────────────────
# CloudWatch
# ─────────────────────────────────────────────────────────────────────────────
output "cloudwatch_log_group_api" {
  description = "CloudWatch log group for API"
  value       = aws_cloudwatch_log_group.api.name
}

output "cloudwatch_log_group_worker" {
  description = "CloudWatch log group for Worker"
  value       = aws_cloudwatch_log_group.worker.name
}

output "cloudwatch_log_group_streamer" {
  description = "CloudWatch log group for Streamer"
  value       = aws_cloudwatch_log_group.streamer.name
}

# ─────────────────────────────────────────────────────────────────────────────
# Security Groups
# ─────────────────────────────────────────────────────────────────────────────
output "security_group_alb_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "security_group_app_id" {
  description = "Application security group ID"
  value       = aws_security_group.app.id
}

output "security_group_db_id" {
  description = "Database security group ID"
  value       = aws_security_group.db.id
}

output "security_group_redis_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}

# ─────────────────────────────────────────────────────────────────────────────
# Deployment Info
# ─────────────────────────────────────────────────────────────────────────────
output "deployment_region" {
  description = "AWS region for deployment"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "deployment_summary" {
  description = "Summary of deployment endpoints"
  value = {
    api_url        = "https://${aws_lb.main.dns_name}"
    health_check   = "https://${aws_lb.main.dns_name}/health"
    api_docs       = "https://${aws_lb.main.dns_name}/docs"
    websocket_url  = "wss://${aws_lb.main.dns_name}/ws"
    ecs_cluster    = aws_ecs_cluster.main.name
    ecr_api        = aws_ecr_repository.api.repository_url
    ecr_worker     = aws_ecr_repository.worker.repository_url
    ecr_streamer   = aws_ecr_repository.streamer.repository_url
  }
}
