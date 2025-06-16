#!/bin/bash

# Deployment script for BP Logistics Backend
# Usage: ./deploy.sh [username]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="178.16.140.185"
VPS_USER="${1:-root}"
REMOTE_PATH="/var/www/bp-logistics-backend"
LOCAL_PATH="."

echo -e "${GREEN}Starting deployment to VPS at ${VPS_IP}${NC}"

# Step 1: Create remote directory if it doesn't exist
echo -e "${YELLOW}Creating remote directory...${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${REMOTE_PATH}"

# Step 2: Copy files to VPS (excluding node_modules and other unnecessary files)
echo -e "${YELLOW}Copying files to VPS...${NC}"
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'logs/*' \
           --exclude 'uploads/*' \
           --exclude '.env' \
           --exclude '.env.local' \
           --exclude 'deploy.sh' \
           ${LOCAL_PATH}/ ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/

# Step 3: Copy production environment file
echo -e "${YELLOW}Copying production environment file...${NC}"
scp .env.production ${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/.env

# Step 4: Install dependencies and restart application on VPS
echo -e "${YELLOW}Installing dependencies and restarting application...${NC}"
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /var/www/bp-logistics-backend

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create necessary directories
mkdir -p logs uploads

# Set proper permissions
chmod 755 logs uploads

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop existing process if running
pm2 stop bp-logistics-backend || true
pm2 delete bp-logistics-backend || true

# Start application with PM2 using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup systemd -u $USER --hp /home/$USER

echo "Deployment completed!"
echo "Checking application status..."
pm2 status
ENDSSH

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Your backend should now be running at http://${VPS_IP}:5000${NC}"
echo -e "${YELLOW}Remember to:${NC}"
echo -e "  1. Set up your PostgreSQL database password in .env on the VPS"
echo -e "  2. Configure Nginx for reverse proxy (if needed)"
echo -e "  3. Set up SSL certificate for HTTPS"
echo -e "  4. Configure firewall rules"