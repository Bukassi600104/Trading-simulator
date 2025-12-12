# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - TERRAFORM VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "terminal-zero"
}

# ─────────────────────────────────────────────────────────────────────────────
# VPC Configuration
# ─────────────────────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

# ─────────────────────────────────────────────────────────────────────────────
# RDS Configuration
# ─────────────────────────────────────────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS (GB)"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "terminal_zero"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "t0_admin"
  sensitive   = true
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

# ─────────────────────────────────────────────────────────────────────────────
# ElastiCache Configuration
# ─────────────────────────────────────────────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

# ─────────────────────────────────────────────────────────────────────────────
# ECS Configuration
# ─────────────────────────────────────────────────────────────────────────────
variable "api_cpu" {
  description = "CPU units for API task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for API task (MB)"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired count of API tasks"
  type        = number
  default     = 2
}

variable "worker_cpu" {
  description = "CPU units for Worker task"
  type        = number
  default     = 1024
}

variable "worker_memory" {
  description = "Memory for Worker task (MB)"
  type        = number
  default     = 2048
}

variable "worker_desired_count" {
  description = "Desired count of Worker tasks"
  type        = number
  default     = 2
}

# ─────────────────────────────────────────────────────────────────────────────
# Domain Configuration
# ─────────────────────────────────────────────────────────────────────────────
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "create_dns_records" {
  description = "Whether to create Route53 DNS records"
  type        = bool
  default     = false
}

# ─────────────────────────────────────────────────────────────────────────────
# Tags
# ─────────────────────────────────────────────────────────────────────────────
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "TerminalZero"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}
