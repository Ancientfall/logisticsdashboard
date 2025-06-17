#!/bin/bash

# BP Logistics Dashboard - Quick Update Script
# For servers that are already set up and just need code updates

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/bp-logistics"
BACKEND_PORT="5001"

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

clear
echo "============================================"
echo "BP Logistics Dashboard - Quick Update"
echo "============================================"
echo ""

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "Application directory $APP_DIR does not exist"
    print_info "This script is for updating existing installations only"
    exit 1
fi

cd $APP_DIR

# Check if it's a git repository
if [ ! -d ".git" ]; then
    print_error "This is not a git repository"
    print_info "Cannot perform git pull. Please use manual file upload method."
    exit 1
fi

print_status "Updating application code..."

# Backup current state (optional but recommended)
read -p "Do you want to create a backup before updating? (y/n): " CREATE_BACKUP
if [[ "$CREATE_BACKUP" =~ ^[Yy]$ ]]; then
    BACKUP_DIR="/var/backups/bp-logistics-$(date +%Y%m%d_%H%M%S)"
    print_info "Creating backup at $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r $APP_DIR/* "$BACKUP_DIR/" 2>/dev/null || true
    print_status "Backup created"
fi

# Git pull latest changes
print_status "Pulling latest changes from git..."
git fetch origin
git reset --hard origin/main || git reset --hard origin/master

# Update backend dependencies if package.json changed
if git diff --name-only HEAD~1 | grep -q "backend/package.json"; then
    print_status "Backend package.json changed, updating dependencies..."
    cd $APP_DIR/backend
    npm install --production
    cd $APP_DIR
else
    print_info "Backend dependencies unchanged"
fi

# Update frontend dependencies if package.json changed
if git diff --name-only HEAD~1 | grep -q "package.json"; then
    print_status "Frontend package.json changed, updating dependencies..."
    npm install
else
    print_info "Frontend dependencies unchanged"
fi

# Always rebuild frontend (in case source code changed)
print_status "Rebuilding frontend..."
npm run build

# Check if environment files need updating
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file missing!"
    print_info "Please create backend/.env with your database and other settings"
    exit 1
fi

# Create required directories if they don't exist
print_status "Ensuring required directories exist..."
mkdir -p backend/uploads backend/logs
chmod -R 775 backend/uploads backend/logs

# Update file permissions
print_status "Updating file permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 775 $APP_DIR/backend/uploads
chmod -R 775 $APP_DIR/backend/logs

# Restart backend service
print_status "Restarting backend service..."
if sudo -u www-data pm2 list | grep -q "bp-logistics-backend"; then
    sudo -u www-data pm2 restart bp-logistics-backend
    print_status "Backend restarted"
else
    print_warning "PM2 process not found, starting fresh..."
    sudo -u www-data pm2 start ecosystem.config.js
    sudo -u www-data pm2 save
    print_status "Backend started"
fi

# Wait a moment for the service to start
sleep 3

# Test if backend is responding
print_status "Testing backend health..."
if curl -s http://localhost:$BACKEND_PORT/health | grep -q "ok"; then
    print_status "Backend is responding correctly!"
else
    print_error "Backend is not responding"
    print_info "Check logs with: sudo -u www-data pm2 logs bp-logistics-backend"
    exit 1
fi

# Reload nginx (in case of config changes)
print_status "Reloading nginx..."
nginx -t && systemctl reload nginx

# Clean up old logs (optional)
read -p "Do you want to clean up old log files? (y/n): " CLEAN_LOGS
if [[ "$CLEAN_LOGS" =~ ^[Yy]$ ]]; then
    print_status "Cleaning up old logs..."
    find $APP_DIR/backend/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    sudo -u www-data pm2 flush
    print_status "Logs cleaned"
fi

# Final status check
echo ""
echo "======================================"
echo "Update Complete!"
echo "======================================"
echo ""

# Show current status
print_info "Current Status:"
echo "  Backend: $(sudo -u www-data pm2 list | grep bp-logistics-backend | awk '{print $10}')"
echo "  Nginx: $(systemctl is-active nginx)"
echo "  Last commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
echo ""

print_status "Application updated successfully!"
print_info "Your application should now be running with the latest code"
echo ""
print_info "Useful commands:"
echo "  View logs: sudo -u www-data pm2 logs bp-logistics-backend"
echo "  Monitor: sudo -u www-data pm2 monit"
echo "  Restart: sudo -u www-data pm2 restart bp-logistics-backend"
echo ""

# Test the application URL (if accessible)
DOMAIN=$(grep FRONTEND_URL $APP_DIR/backend/.env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||')
if [ ! -z "$DOMAIN" ]; then
    print_info "Application URL: https://$DOMAIN"
    print_info "Test the application to ensure everything is working correctly"
fi