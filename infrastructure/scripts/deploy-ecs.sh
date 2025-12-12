#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - Deploy to ECS
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: ./deploy-ecs.sh [api|worker|all] [tag]
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-terminal-zero}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
SERVICE=${1:-all}
TAG=${2:-latest}

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Terminal Zero - ECS Deployment                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Environment: ${ENVIRONMENT}"
echo "Cluster: ${CLUSTER_NAME}"
echo "Service: ${SERVICE}"
echo "Image Tag: ${TAG}"
echo ""

# Function to deploy a service
deploy_service() {
    local ecs_service=$1
    local task_family=$2
    
    local full_service_name="${PROJECT_NAME}-${ENVIRONMENT}-${ecs_service}-service"
    local full_task_family="${PROJECT_NAME}-${ENVIRONMENT}-${task_family}"
    
    echo -e "${YELLOW}🚀 Deploying ${ecs_service}...${NC}"
    
    # Get the latest task definition
    echo -e "${CYAN}   Getting latest task definition...${NC}"
    TASK_DEF_ARN=$(aws ecs describe-task-definition \
        --task-definition ${full_task_family} \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text \
        --region ${AWS_REGION})
    
    echo -e "${CYAN}   Task Definition: ${TASK_DEF_ARN}${NC}"
    
    # Force new deployment
    echo -e "${CYAN}   Triggering deployment...${NC}"
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${full_service_name} \
        --task-definition ${TASK_DEF_ARN} \
        --force-new-deployment \
        --region ${AWS_REGION} \
        --output text > /dev/null
    
    echo -e "${GREEN}✓ Deployment triggered for ${ecs_service}${NC}"
    echo ""
}

# Function to wait for deployment
wait_for_deployment() {
    local ecs_service=$1
    local full_service_name="${PROJECT_NAME}-${ENVIRONMENT}-${ecs_service}-service"
    
    echo -e "${YELLOW}⏳ Waiting for ${ecs_service} deployment to stabilize...${NC}"
    
    aws ecs wait services-stable \
        --cluster ${CLUSTER_NAME} \
        --services ${full_service_name} \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}✓ ${ecs_service} deployment complete and stable${NC}"
    echo ""
}

# Deploy based on service argument
case ${SERVICE} in
    api)
        deploy_service "api" "api"
        wait_for_deployment "api"
        ;;
    worker)
        deploy_service "worker" "worker"
        wait_for_deployment "worker"
        ;;
    all)
        deploy_service "api" "api"
        deploy_service "worker" "worker"
        
        # Wait for all services in parallel
        echo -e "${YELLOW}⏳ Waiting for all deployments to stabilize...${NC}"
        wait_for_deployment "api" &
        wait_for_deployment "worker" &
        wait
        ;;
    *)
        echo -e "${RED}Unknown service: ${SERVICE}${NC}"
        echo "Usage: $0 [api|worker|all] [tag]"
        exit 1
        ;;
esac

# Get ALB URL
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names "${PROJECT_NAME}-${ENVIRONMENT}-alb" \
    --query 'LoadBalancers[0].DNSName' \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "N/A")

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Deployment Complete! ✓                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Application URL: https://${ALB_DNS}"
echo "Health Check: https://${ALB_DNS}/health"
echo "API Docs: https://${ALB_DNS}/docs"
echo ""
echo -e "${CYAN}View logs:${NC}"
echo "  aws logs tail /ecs/${PROJECT_NAME}-${ENVIRONMENT}-api --follow --region ${AWS_REGION}"
echo ""
