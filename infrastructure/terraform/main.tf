# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - TERRAFORM MAIN CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Configure backend for state storage (uncomment for production)
  # backend "s3" {
  #   bucket         = "terminal-zero-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

# ─────────────────────────────────────────────────────────────────────────────
# AWS Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Data Sources
# ─────────────────────────────────────────────────────────────────────────────
data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# ─────────────────────────────────────────────────────────────────────────────
# Random Password for RDS
# ─────────────────────────────────────────────────────────────────────────────
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# ─────────────────────────────────────────────────────────────────────────────
# Local Values
# ─────────────────────────────────────────────────────────────────────────────
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = merge(var.tags, {
    Environment = var.environment
    Project     = var.project_name
  })
}
