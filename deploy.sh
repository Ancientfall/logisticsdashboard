#!/bin/bash

# BP Logistics Analytics Dashboard Deployment Script
# For deployment to Hostinger VPS (Ubuntu with nginx)

# Configuration
SERVER_IP="178.16.140.185"
SERVER_USER="root"
REMOTE_PATH="/var/www/logistics-dashboard"
BUILD_DIR="build"
LOCAL_PROJECT_DIR="$(pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 BP Logistics Analytics Dashboard Deployment${NC}"
echo "======================================"

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Make sure you're in the project root directory.${NC}"
    exit 1
fi

# Step 2: Install dependencies and build
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${YELLOW}🔨 Building production bundle...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
fi

# Step 3: Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Error: Build directory not found${NC}"
    exit 1
fi

# Step 4: Deploy to server
echo -e "${YELLOW}📤 Deploying to server...${NC}"
echo "Server: $SERVER_USER@$SERVER_IP"
echo "Remote path: $REMOTE_PATH"

# Create remote directory if it doesn't exist
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"

# Copy build files to server
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '.env.development' \
    $BUILD_DIR/ $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to deploy files${NC}"
    exit 1
fi

# Step 5: Set proper permissions on server
echo -e "${YELLOW}🔧 Setting permissions...${NC}"
ssh $SERVER_USER@$SERVER_IP "chown -R www-data:www-data $REMOTE_PATH && chmod -R 755 $REMOTE_PATH"

# Step 6: Restart nginx
echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
ssh $SERVER_USER@$SERVER_IP "systemctl restart nginx"

if [ $? -ne 0 ]; then
    echo -e "${RED}⚠️  Warning: Failed to restart nginx. You may need to restart it manually.${NC}"
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "Dashboard available at: http://$SERVER_IP"
echo ""
echo "Post-deployment checklist:"
echo "  - Test the application at http://$SERVER_IP"
echo "  - Check browser console for any errors"
echo "  - Verify all features are working correctly"
echo "  - Monitor server logs: ssh $SERVER_USER@$SERVER_IP 'tail -f /var/log/nginx/error.log'"