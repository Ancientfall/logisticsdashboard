#!/bin/bash

# BP Logistics Dashboard - VPS Deployment Script
# Deploys the latest build to the VPS server

echo "🚀 BP Logistics Dashboard - VPS Deployment Script"
echo "================================================="

# Configuration
VPS_USER="root"
VPS_HOST="178.16.140.185"
VPS_PATH="/var/www/html"
LOCAL_BUILD_PATH="./build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if build directory exists
if [ ! -d "$LOCAL_BUILD_PATH" ]; then
    print_error "Build directory not found. Please run 'npm run build' first."
    exit 1
fi

print_status "Build directory found. Proceeding with deployment..."

# Create backup on VPS
print_status "Creating backup of current deployment..."
ssh ${VPS_USER}@${VPS_HOST} "
    if [ -d ${VPS_PATH} ]; then
        sudo cp -r ${VPS_PATH} ${VPS_PATH}_backup_$(date +%Y%m%d_%H%M%S)
        echo 'Backup created successfully'
    else
        echo 'No existing deployment found, skipping backup'
    fi
"

# Upload new build
print_status "Uploading new build to VPS..."
rsync -avz --delete ${LOCAL_BUILD_PATH}/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

if [ $? -eq 0 ]; then
    print_success "Files uploaded successfully"
else
    print_error "Failed to upload files"
    exit 1
fi

# Set proper permissions
print_status "Setting proper file permissions..."
ssh ${VPS_USER}@${VPS_HOST} "
    sudo chown -R www-data:www-data ${VPS_PATH}
    sudo chmod -R 755 ${VPS_PATH}
    sudo find ${VPS_PATH} -type f -exec chmod 644 {} \;
"

# Restart Nginx (if needed)
print_status "Restarting Nginx to ensure fresh cache..."
ssh ${VPS_USER}@${VPS_HOST} "
    sudo systemctl reload nginx
    sudo systemctl status nginx --no-pager -l
"

# Test deployment
print_status "Testing deployment..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_HOST})

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_success "Deployment successful! Site is responding with HTTP 200"
    print_success "🌐 Site available at: http://${VPS_HOST} and https://bpsolutionsdashboard.com"
else
    print_warning "Site responded with HTTP status: $HTTP_STATUS"
    print_warning "Please check the deployment manually"
fi

# Clean up old backups (keep last 5)
print_status "Cleaning up old backups..."
ssh ${VPS_USER}@${VPS_HOST} "
    cd /var/www/
    ls -t html_backup_* 2>/dev/null | tail -n +6 | xargs -r sudo rm -rf
    echo 'Backup cleanup completed'
"

echo ""
print_success "🎉 Deployment completed!"
echo "================================================="
print_status "Next steps:"
echo "1. Visit https://bpsolutionsdashboard.com to verify the deployment"
echo "2. Test the fuel exclusion fix in the Production Dashboard"
echo "3. Check Chemical Volume KPI for corrected values"
echo "4. Verify Hero Cards update properly with filters"
echo ""