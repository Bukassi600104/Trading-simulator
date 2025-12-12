# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - AWS SECRETS MANAGER
# ═══════════════════════════════════════════════════════════════════════════════
# Centralized secrets management for database, Redis, and application
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# Database Secrets
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "database" {
  name                    = "${local.name_prefix}/database"
  description             = "PostgreSQL database credentials"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-database-secret"
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id

  secret_string = jsonencode({
    username     = var.db_username
    password     = random_password.db_password.result
    host         = aws_db_instance.postgres.address
    port         = aws_db_instance.postgres.port
    database     = var.db_name
    DATABASE_URL = "postgresql+asyncpg://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}"
  })

  depends_on = [aws_db_instance.postgres]
}

# ─────────────────────────────────────────────────────────────────────────────
# Redis Secrets
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "redis" {
  name                    = "${local.name_prefix}/redis"
  description             = "Redis connection details"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-redis-secret"
  }
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id

  secret_string = jsonencode({
    host       = aws_elasticache_replication_group.redis.primary_endpoint_address
    port       = 6379
    REDIS_URL  = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
    REDIS_HOST = aws_elasticache_replication_group.redis.primary_endpoint_address
    REDIS_PORT = "6379"
  })

  depends_on = [aws_elasticache_replication_group.redis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Application Secrets
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}/app"
  description             = "Application secrets (JWT, API keys)"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-app-secret"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    JWT_SECRET     = random_password.jwt_secret.result
    JWT_ALGORITHM  = "HS256"
    JWT_EXPIRY     = "3600"  # 1 hour in seconds
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# Bybit API Secrets (to be populated manually)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "bybit" {
  name                    = "${local.name_prefix}/bybit"
  description             = "Bybit API credentials (populate manually)"
  recovery_window_in_days = var.environment == "production" ? 30 : 0

  tags = {
    Name = "${local.name_prefix}-bybit-secret"
  }
}

# Note: BYBIT_API_KEY and BYBIT_API_SECRET should be manually added
# via AWS Console or CLI for security reasons
resource "aws_secretsmanager_secret_version" "bybit" {
  secret_id = aws_secretsmanager_secret.bybit.id

  secret_string = jsonencode({
    BYBIT_API_KEY    = "REPLACE_ME"
    BYBIT_API_SECRET = "REPLACE_ME"
    BYBIT_TESTNET    = var.environment == "production" ? "false" : "true"
  })

  lifecycle {
    ignore_changes = [secret_string]  # Don't overwrite manual updates
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Outputs for Reference
# ─────────────────────────────────────────────────────────────────────────────
# These are referenced in ECS task definitions
