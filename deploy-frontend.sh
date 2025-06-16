#!/bin/bash

# Frontend Deployment Script for BP Logistics Dashboard
# Usage: ./deploy-frontend.sh [username]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="178.16.140.185"
VPS_USER="${1:-root}"
REMOTE_PATH="/var/www/bp-logistics-frontend"

echo -e "${GREEN}Starting frontend deployment to VPS at ${VPS_IP}${NC}"

# Step 1: Build the frontend
echo -e "${YELLOW}Building frontend for production...${NC}"
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}Build failed! Make sure you're in the project root directory.${NC}"
    exit 1
fi

# Step 2: Create remote directory
echo -e "${YELLOW}Creating remote directory...${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${REMOTE_PATH}"

# Step 3: Deploy build files
echo -e "${YELLOW}Deploying build files to VPS...${NC}"
rsync -avz --delete build/ ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/

# Step 4: Set proper permissions
echo -e "${YELLOW}Setting permissions...${NC}"
ssh ${VPS_USER}@${VPS_IP} "chown -R www-data:www-data ${REMOTE_PATH}"

echo -e "${GREEN}Frontend deployment completed successfully!${NC}"
echo -e "${GREEN}Your application should now be accessible at:${NC}"
echo -e "  http://${VPS_IP}/"
echo -e "\n${YELLOW}Note: Make sure Nginx is configured to serve from ${REMOTE_PATH}${NC}"