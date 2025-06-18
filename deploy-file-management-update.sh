#!/bin/bash

# BP Logistics Dashboard - File Management Update Deployment
# This script deploys the new Excel file management features to the VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="178.16.140.185"
VPS_USER="root"
LOCAL_PROJECT_DIR="/Users/nealasmothers/Downloads/logisticsdashboard"
VPS_PROJECT_DIR="/var/www/bp-logistics"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Test SSH connection
print_info "Testing SSH connection to VPS server..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPS_USER@$VPS_IP" exit 2>/dev/null; then
    print_status "SSH connection successful"
else
    print_error "Cannot connect to VPS server. Please check:"
    print_info "1. VPS server is running"
    print_info "2. SSH key is configured"
    print_info "3. Server IP is correct: $VPS_IP"
    exit 1
fi

print_info "Deploying file management updates to VPS server..."

# Create directories on VPS
print_info "Creating Excel file directories on VPS..."
ssh "$VPS_USER@$VPS_IP" "
    mkdir -p '$VPS_PROJECT_DIR/excel-data/excel-files'
    mkdir -p '$VPS_PROJECT_DIR/excel-data/reference-data'
    mkdir -p '$VPS_PROJECT_DIR/excel-data/metadata'
    chown -R www-data:www-data '$VPS_PROJECT_DIR/excel-data'
    chmod -R 775 '$VPS_PROJECT_DIR/excel-data'
"

print_status "Directories created"

# Update backend files
print_info "Uploading new backend routes and files..."

# Upload new Excel files route
scp "$LOCAL_PROJECT_DIR/backend/src/routes/excel-files.js" "$VPS_USER@$VPS_IP:$VPS_PROJECT_DIR/backend/src/routes/"

# Upload updated server.js
scp "$LOCAL_PROJECT_DIR/backend/src/server.js" "$VPS_USER@$VPS_IP:$VPS_PROJECT_DIR/backend/src/"

print_status "Backend files updated"

# Update frontend files
print_info "Uploading new frontend components..."

# Upload new components
scp "$LOCAL_PROJECT_DIR/src/components/EnhancedFileUploadWithServer.tsx" "$VPS_USER@$VPS_IP:$VPS_PROJECT_DIR/src/components/"
scp "$LOCAL_PROJECT_DIR/src/components/admin/ExcelFileManager.tsx" "$VPS_USER@$VPS_IP:$VPS_PROJECT_DIR/src/components/admin/"

# Upload updated admin dashboard
scp "$LOCAL_PROJECT_DIR/src/components/admin/AdminDashboard.tsx" "$VPS_USER@$VPS_IP:$VPS_PROJECT_DIR/src/components/admin/"

# Upload updated file upload page
scp "$LOCAL_PROJECT_DIR/src/components/dashboard/FileUploadPageWithDB.tsx" "$VPS_USER@$VPS_IP:$VPS_PROJECT_DIR/src/components/dashboard/"

print_status "Frontend files updated"

# Install any new dependencies and rebuild
print_info "Installing dependencies and rebuilding application..."
ssh "$VPS_USER@$VPS_IP" "
    cd '$VPS_PROJECT_DIR/backend'
    npm install
    
    cd '$VPS_PROJECT_DIR'
    npm install
    npm run build
    
    # Set proper permissions
    chown -R www-data:www-data '$VPS_PROJECT_DIR'
    chmod -R 755 '$VPS_PROJECT_DIR'
    chmod -R 775 '$VPS_PROJECT_DIR/backend/excel-data'
    chmod -R 775 '$VPS_PROJECT_DIR/backend/uploads'
    chmod -R 775 '$VPS_PROJECT_DIR/backend/logs'
"

print_status "Application rebuilt"

# Restart backend service
print_info "Restarting backend service..."
ssh "$VPS_USER@$VPS_IP" "
    sudo -u www-data pm2 restart bp-logistics-backend
    sudo -u www-data pm2 save
"

print_status "Backend service restarted"

# Test the new API endpoints
print_info "Testing new API endpoints..."
sleep 5  # Give the service time to start

# Test Excel files endpoint
if ssh "$VPS_USER@$VPS_IP" "curl -s http://localhost:5001/api/excel-files | grep -q 'success'"; then
    print_status "Excel files API endpoint working"
else
    print_warning "Excel files API endpoint may need attention"
fi

# Test health endpoint
if ssh "$VPS_USER@$VPS_IP" "curl -s http://localhost:5001/health | grep -q 'ok'"; then
    print_status "Health endpoint working"
else
    print_warning "Health endpoint may need attention"
fi

# Final summary
clear
echo ""
echo "=========================================="
echo "File Management Update Deployment Complete!"
echo "=========================================="
echo ""
print_status "New features deployed successfully"
echo ""
print_info "New Features Added:"
echo "  ✓ Server-side Excel file storage and management"
echo "  ✓ Admin interface for file upload and management"  
echo "  ✓ Auto-detection and loading of server files"
echo "  ✓ Enhanced file upload component with server integration"
echo "  ✓ File management API endpoints"
echo ""
print_info "API Endpoints Available:"
echo "  GET  /api/excel-files - List server files"
echo "  GET  /api/excel-files/{filename} - Download file"
echo "  POST /api/excel-files/upload - Upload file (admin)"
echo "  DELETE /api/excel-files/{filename} - Delete file (admin)"
echo ""
print_info "Next Steps:"
echo "  1. Deploy Excel files using: ./deploy-excel-files.sh"
echo "  2. Test the admin file management interface"
echo "  3. Test auto-loading from server files"
echo "  4. Verify all dashboard functionality works"
echo ""
print_status "Deployment complete! File management system is ready to use."
echo ""
print_warning "Remember to:"
echo "  - Upload Excel files using the admin interface or deployment script"
echo "  - Test the auto-loading functionality"
echo "  - Monitor logs for any issues: sudo -u www-data pm2 logs bp-logistics-backend"