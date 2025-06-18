#!/bin/bash

# BP Logistics Dashboard VPS Deployment Script
echo "🚀 Starting BP Logistics Dashboard VPS Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version $(node -v) detected${NC}"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Build the React application
echo -e "${YELLOW}🏗️ Building React application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build React application${NC}"
    exit 1
fi

# Check if build directory exists
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build directory not found after build${NC}"
    exit 1
fi

# Create shared-data directory
echo -e "${YELLOW}📁 Creating shared data directory...${NC}"
mkdir -p shared-data/uploads

# Make sure the VPS server has required dependencies
echo -e "${YELLOW}📦 Checking VPS server dependencies...${NC}"
if ! npm list express &> /dev/null; then
    echo -e "${YELLOW}Installing express...${NC}"
    npm install express
fi

if ! npm list cors &> /dev/null; then
    echo -e "${YELLOW}Installing cors...${NC}"
    npm install cors
fi

if ! npm list multer &> /dev/null; then
    echo -e "${YELLOW}Installing multer...${NC}"
    npm install multer
fi

# Set environment variables for production
export NODE_ENV=production
export PORT=${PORT:-3001}

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${GREEN}📊 Build statistics:${NC}"
du -sh build/
echo ""

# Start the VPS server
echo -e "${YELLOW}🚀 Starting VPS server on port $PORT...${NC}"
echo -e "${GREEN}🌐 Dashboard will be available at: http://localhost:$PORT${NC}"
echo -e "${GREEN}📡 API endpoints:${NC}"
echo -e "   POST /api/data/store - Store processed data"
echo -e "   GET  /api/data/retrieve - Get processed data"
echo -e "   GET  /api/data/status - Check data availability"
echo -e "   POST /api/data/clear - Clear all data"
echo -e "   POST /api/upload/excel - Upload Excel files"
echo ""
echo -e "${YELLOW}💡 Usage Instructions:${NC}"
echo -e "1. Admin uploads Excel files using the dashboard"
echo -e "2. Data is processed and stored on the VPS"
echo -e "3. Multiple users can access dashboards without file uploads"
echo -e "4. All users see the same processed data"
echo ""
echo -e "${GREEN}🎯 Perfect for bpsolutionsdashboard.com deployment!${NC}"
echo ""

# Start the server
node simple-vps-server.js