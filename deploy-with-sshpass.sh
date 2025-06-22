#!/bin/bash

# BP Logistics Dashboard - VPS Deployment Script with sshpass
# Deploys the latest build to the VPS server

echo "🚀 BP Logistics Dashboard - VPS Deployment Script"
echo "================================================="

# Configuration
VPS_USER="root"
VPS_HOST="178.16.140.185"
VPS_PATH="/var/www/logisticsdashboard"
VPS_PASSWORD="@dmiralThr@wn1"
LOCAL_BUILD_PATH="./build"

# Find the latest deployment package
DEPLOYMENT_PACKAGE=$(ls -t bp-dashboard-deployment-*.tar.gz 2>/dev/null | head -1)

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

# Check if deployment package exists
if [ -z "$DEPLOYMENT_PACKAGE" ]; then
    print_error "No deployment package found. Creating one now..."
    tar -czf bp-dashboard-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C build .
    DEPLOYMENT_PACKAGE=$(ls -t bp-dashboard-deployment-*.tar.gz 2>/dev/null | head -1)
fi

if [ ! -f "$DEPLOYMENT_PACKAGE" ]; then
    print_error "Failed to create deployment package. Please check build directory."
    exit 1
fi

print_status "Using deployment package: $DEPLOYMENT_PACKAGE"

# Upload deployment package to VPS
print_status "Uploading deployment package to VPS..."
sshpass -p "$VPS_PASSWORD" scp "$DEPLOYMENT_PACKAGE" ${VPS_USER}@${VPS_HOST}:/tmp/

if [ $? -eq 0 ]; then
    print_success "Deployment package uploaded successfully"
else
    print_error "Failed to upload deployment package"
    exit 1
fi

# Deploy on VPS
print_status "Deploying on VPS..."
sshpass -p "$VPS_PASSWORD" ssh ${VPS_USER}@${VPS_HOST} "
    # Create backup of current deployment
    if [ -d ${VPS_PATH} ]; then
        sudo cp -r ${VPS_PATH} ${VPS_PATH}_backup_\$(date +%Y%m%d_%H%M%S)
        echo 'Backup created successfully'
    fi
    
    # Extract new deployment
    cd ${VPS_PATH}
    sudo rm -rf *
    sudo tar -xzf /tmp/$DEPLOYMENT_PACKAGE -C .
    
    # Set proper permissions
    sudo chown -R www-data:www-data ${VPS_PATH}
    sudo chmod -R 755 ${VPS_PATH}
    sudo find ${VPS_PATH} -type f -exec chmod 644 {} \;
    
    # Clean up uploaded package
    rm -f /tmp/$DEPLOYMENT_PACKAGE
    
    echo 'Deployment completed on VPS'
"

if [ $? -eq 0 ]; then
    print_success "Deployment completed successfully on VPS"
else
    print_error "Failed to deploy on VPS"
    exit 1
fi

# Restart Nginx
print_status "Restarting Nginx..."
sshpass -p "$VPS_PASSWORD" ssh ${VPS_USER}@${VPS_HOST} "
    sudo systemctl reload nginx
    sudo systemctl status nginx --no-pager -l
"

# Test deployment
print_status "Testing deployment..."
sleep 3  # Give nginx a moment to reload
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://bpsolutionsdashboard.com)

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_success "Deployment successful! Site is responding with HTTP 200"
    print_success "🌐 Site available at: https://bpsolutionsdashboard.com"
else
    print_warning "Site responded with HTTP status: $HTTP_STATUS"
    # Try HTTP as fallback
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${VPS_HOST})
    if [ "$HTTP_STATUS" -eq 200 ]; then
        print_success "Site available at: http://${VPS_HOST}"
    else
        print_warning "Please check the deployment manually"
    fi
fi

# Clean up old backups (keep last 5)
print_status "Cleaning up old backups..."
sshpass -p "$VPS_PASSWORD" ssh ${VPS_USER}@${VPS_HOST} "
    cd /var/www/
    ls -t html_backup_* 2>/dev/null | tail -n +6 | xargs -r sudo rm -rf
    echo 'Backup cleanup completed'
"

echo ""
print_success "🎉 Deployment completed!"
echo "================================================="
print_status "Latest features deployed:"
echo "✅ TV Kiosk Display with rotating KPI analytics"
echo "✅ Production Support Variance Analysis"
echo "✅ Enhanced currency formatting"
echo "✅ Fixed Logistics Cost KPI filtering"
echo "✅ Smart currency formatting for KPI cards"
echo ""
print_status "Next steps:"
echo "1. Visit https://bpsolutionsdashboard.com to verify the deployment"
echo "2. Test the TV Kiosk Display functionality"
echo "3. Check Production Support metrics"
echo "4. Verify enhanced currency formatting"
echo ""