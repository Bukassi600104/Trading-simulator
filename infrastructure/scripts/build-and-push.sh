#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL ZERO - Build and Push Docker Images to ECR
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: ./build-and-push.sh [api|worker|streamer|all] [tag]
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
NC='\033[0m' # No Color

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Parse arguments
SERVICE=${1:-all}
TAG=${2:-latest}

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Terminal Zero - Docker Build & Push to ECR               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "AWS Account: ${AWS_ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"
echo "Service: ${SERVICE}"
echo "Tag: ${TAG}"
echo ""

# Login to ECR
echo -e "${YELLOW}🔐 Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
echo -e "${GREEN}✓ ECR login successful${NC}"
echo ""

# Function to build and push a service
build_and_push() {
    local service=$1
    local dockerfile=$2
    local context=$3
    
    local repository="${PROJECT_NAME}/${service}"
    local full_tag="${ECR_REGISTRY}/${repository}:${TAG}"
    local latest_tag="${ECR_REGISTRY}/${repository}:latest"
    
    echo -e "${YELLOW}🏗️  Building ${service}...${NC}"
    
    # Build with buildkit for better caching
    DOCKER_BUILDKIT=1 docker build \
        -f ${dockerfile} \
        -t ${full_tag} \
        -t ${latest_tag} \
        --build-arg ENVIRONMENT=${ENVIRONMENT} \
        ${context}
    
    echo -e "${GREEN}✓ Build complete${NC}"
    
    echo -e "${YELLOW}📤 Pushing ${service} to ECR...${NC}"
    docker push ${full_tag}
    docker push ${latest_tag}
    echo -e "${GREEN}✓ Push complete: ${full_tag}${NC}"
    echo ""
}

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd ${PROJECT_ROOT}

# Build and push based on service argument
case ${SERVICE} in
    api)
        build_and_push "api" "infrastructure/docker/api.Dockerfile" "backend"
        ;;
    worker)
        build_and_push "worker" "infrastructure/docker/worker.Dockerfile" "backend"
        ;;
    streamer)
        build_and_push "market-streamer" "infrastructure/docker/streamer.Dockerfile" "backend"
        ;;
    all)
        build_and_push "api" "infrastructure/docker/api.Dockerfile" "backend"
        build_and_push "worker" "infrastructure/docker/worker.Dockerfile" "backend"
        build_and_push "market-streamer" "infrastructure/docker/streamer.Dockerfile" "backend"
        ;;
    *)
        echo -e "${RED}Unknown service: ${SERVICE}${NC}"
        echo "Usage: $0 [api|worker|streamer|all] [tag]"
        exit 1
        ;;
esac

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Build & Push Complete! ✓                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Images pushed to ECR:"
echo "  ${ECR_REGISTRY}/${PROJECT_NAME}/api:${TAG}"
echo "  ${ECR_REGISTRY}/${PROJECT_NAME}/worker:${TAG}"
echo "  ${ECR_REGISTRY}/${PROJECT_NAME}/market-streamer:${TAG}"
