#!/bin/bash

# Pre-deployment checklist for BP Logistics Dashboard

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "BP Logistics Pre-Deployment Checklist"
echo "======================================"
echo ""

READY=true

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}[✗]${NC} Not in the logisticsdashboard directory"
    READY=false
else
    echo -e "${GREEN}[✓]${NC} In correct directory"
fi

# Check if deployment scripts exist
if [ -f "deploy-to-vps.sh" ] && [ -f "prepare-deployment.sh" ]; then
    echo -e "${GREEN}[✓]${NC} Deployment scripts found"
else
    echo -e "${RED}[✗]${NC} Deployment scripts missing"
    READY=false
fi

# Check if backend .env exists
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}[✓]${NC} Backend .env file exists"
else
    echo -e "${YELLOW}[!]${NC} Backend .env file missing (will be created during deployment)"
fi

# Check if node_modules exist (for building)
if [ -d "node_modules" ] && [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}[✓]${NC} Dependencies installed locally"
else
    echo -e "${YELLOW}[!]${NC} Dependencies not installed (will be installed during deployment)"
fi

# Test database connection locally
if command -v psql &> /dev/null; then
    if psql -U bp_logistics_user -d bp_logistics -h localhost -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}[✓]${NC} Local database connection successful"
    else
        echo -e "${YELLOW}[!]${NC} Local database not accessible (normal if deploying to VPS only)"
    fi
else
    echo -e "${YELLOW}[!]${NC} PostgreSQL not installed locally"
fi

# Check SSH access to VPS
echo ""
echo "Testing connection to VPS (178.16.140.185)..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes root@178.16.140.185 echo "Connected" &> /dev/null; then
    echo -e "${GREEN}[✓]${NC} SSH connection to 178.16.140.185 successful"
else
    echo -e "${RED}[✗]${NC} Cannot connect to 178.16.140.185 via SSH"
    echo "   Make sure you have SSH access configured"
    READY=false
fi

echo ""
echo "======================================"

if [ "$READY" = true ]; then
    echo -e "${GREEN}Ready for deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./prepare-deployment.sh"
    echo "2. Run: scp bp-logistics-deploy.tar.gz root@178.16.140.185:/root/"
    echo "3. SSH to server and run deployment script"
else
    echo -e "${RED}Some issues need to be resolved before deployment${NC}"
fi

echo ""
echo "VPS Server Details:"
echo "- IP: 178.16.140.185"
echo "- User: root"
echo "- App will be at: http://178.16.140.185"
echo ""