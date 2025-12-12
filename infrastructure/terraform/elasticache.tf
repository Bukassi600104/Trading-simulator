# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - ELASTICACHE REDIS CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
# Used for: Pub/Sub (Live Prices), Order Queue, Session State
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# ElastiCache Subnet Group
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet-group"
  description = "ElastiCache subnet group for Terminal Zero"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${local.name_prefix}-redis-subnet-group"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# ElastiCache Parameter Group
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_elasticache_parameter_group" "main" {
  name   = "${local.name_prefix}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex" # Enable keyspace notifications for Pub/Sub
  }

  tags = {
    Name = "${local.name_prefix}-redis-params"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# ElastiCache Replication Group (Multi-AZ)
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${local.name_prefix}-redis"
  description                = "Terminal Zero Redis Cluster"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_nodes
  port                       = 6379
  
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]

  # Multi-AZ with automatic failover
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_retention_limit   = 7
  snapshot_window            = "03:00-04:00"

  # Engine version
  engine_version             = "7.0"

  tags = {
    Name = "${local.name_prefix}-redis"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Redis Auth Token
# ─────────────────────────────────────────────────────────────────────────────
resource "random_password" "redis_auth_token" {
  length           = 32
  special          = false # Redis auth token doesn't support all special characters
}
