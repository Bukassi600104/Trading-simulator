#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - Initialize Secrets in AWS Secrets Manager
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: ./init-secrets.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-terminal-zero}"
ENVIRONMENT="${ENVIRONMENT:-staging}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Terminal Zero - Initialize AWS Secrets                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to update a secret
update_secret() {
    local secret_name=$1
    local key=$2
    local value=$3
    local full_secret_name="${PROJECT_NAME}-${ENVIRONMENT}/${secret_name}"
    
    echo -e "${YELLOW}Updating ${key} in ${secret_name}...${NC}"
    
    # Get current secret value
    CURRENT_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id ${full_secret_name} \
        --query SecretString \
        --output text \
        --region ${AWS_REGION} 2>/dev/null || echo "{}")
    
    # Update the specific key
    UPDATED_SECRET=$(echo ${CURRENT_SECRET} | jq --arg key "${key}" --arg value "${value}" '.[$key] = $value')
    
    # Put the updated secret
    aws secretsmanager put-secret-value \
        --secret-id ${full_secret_name} \
        --secret-string "${UPDATED_SECRET}" \
        --region ${AWS_REGION} > /dev/null
    
    echo -e "${GREEN}✓ Updated ${key}${NC}"
}

# Interactive prompts for Bybit credentials
echo -e "${CYAN}This script will update your Bybit API credentials in AWS Secrets Manager.${NC}"
echo -e "${CYAN}The secrets will be stored encrypted and only accessible to your ECS tasks.${NC}"
echo ""

read -p "Enter Bybit API Key: " BYBIT_API_KEY
read -sp "Enter Bybit API Secret: " BYBIT_API_SECRET
echo ""
read -p "Use Testnet? (y/n): " USE_TESTNET

BYBIT_TESTNET="false"
if [[ "${USE_TESTNET}" == "y" || "${USE_TESTNET}" == "Y" ]]; then
    BYBIT_TESTNET="true"
fi

# Update Bybit secrets
echo ""
update_secret "bybit" "BYBIT_API_KEY" "${BYBIT_API_KEY}"
update_secret "bybit" "BYBIT_API_SECRET" "${BYBIT_API_SECRET}"
update_secret "bybit" "BYBIT_TESTNET" "${BYBIT_TESTNET}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Secrets Updated! ✓                            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Bybit API credentials have been securely stored in AWS Secrets Manager."
echo ""
echo -e "${CYAN}To view secrets (not recommended in production):${NC}"
echo "  aws secretsmanager get-secret-value --secret-id ${PROJECT_NAME}-${ENVIRONMENT}/bybit --region ${AWS_REGION}"
echo ""
