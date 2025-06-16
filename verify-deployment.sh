#!/bin/bash

# BP Logistics Dashboard - Deployment Verification Script
# Run this after deployment to ensure everything is working correctly

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${1:-http://localhost:5001}"
FRONTEND_URL="${2:-http://localhost}"

echo "=========================================="
echo "BP Logistics Deployment Verification"
echo "=========================================="
echo ""

# Function to check service
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✓${NC} $service is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service is not running"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port ($service) is listening"
        return 0
    else
        echo -e "${RED}✗${NC} Port $port ($service) is not listening"
        return 1
    fi
}

# Function to check API endpoint
check_api() {
    local endpoint=$1
    local description=$2
    if curl -s -f "${API_URL}${endpoint}" > /dev/null; then
        echo -e "${GREEN}✓${NC} API endpoint ${endpoint} - ${description}"
        return 0
    else
        echo -e "${RED}✗${NC} API endpoint ${endpoint} - ${description}"
        return 1
    fi
}

# Function to check database
check_database() {
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw bp_logistics; then
        echo -e "${GREEN}✓${NC} Database 'bp_logistics' exists"
        
        # Check tables
        TABLE_COUNT=$(sudo -u postgres psql -d bp_logistics -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        echo -e "${GREEN}✓${NC} Database has $TABLE_COUNT tables"
        return 0
    else
        echo -e "${RED}✗${NC} Database 'bp_logistics' not found"
        return 1
    fi
}

# 1. System Services
echo -e "${BLUE}Checking System Services...${NC}"
check_service "postgresql"
check_service "nginx"
echo ""

# 2. Network Ports
echo -e "${BLUE}Checking Network Ports...${NC}"
check_port 5432 "PostgreSQL"
check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 5001 "Backend API"
echo ""

# 3. Database
echo -e "${BLUE}Checking Database...${NC}"
check_database

# Check if all required tables exist
echo -e "${BLUE}Checking Database Tables...${NC}"
EXPECTED_TABLES=(
    "Users"
    "Uploads"
    "WellOperations"
    "Vessels"
    "FluidAnalyses"
    "VoyageEvents"
    "VesselManifests"
    "CostAllocations"
    "BulkActions"
    "VoyageLists"
    "PasswordResets"
)

for table in "${EXPECTED_TABLES[@]}"; do
    if sudo -u postgres psql -d bp_logistics -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'; then
        echo -e "${GREEN}✓${NC} Table '$table' exists"
    else
        echo -e "${YELLOW}!${NC} Table '$table' might be missing (check for case sensitivity)"
    fi
done
echo ""

# 4. PM2 Processes
echo -e "${BLUE}Checking PM2 Processes...${NC}"
if sudo -u www-data pm2 list | grep -q "bp-logistics-backend"; then
    echo -e "${GREEN}✓${NC} Backend application is running in PM2"
    
    # Get PM2 status details
    INSTANCES=$(sudo -u www-data pm2 list | grep "bp-logistics-backend" | awk '{print $19}')
    echo -e "${GREEN}✓${NC} Running with $INSTANCES instances"
else
    echo -e "${RED}✗${NC} Backend application not found in PM2"
fi
echo ""

# 5. File Permissions
echo -e "${BLUE}Checking File Permissions...${NC}"
DIRS_TO_CHECK=(
    "/var/www/bp-logistics/backend/uploads"
    "/var/www/bp-logistics/backend/logs"
)

for dir in "${DIRS_TO_CHECK[@]}"; do
    if [ -d "$dir" ]; then
        PERMS=$(stat -c "%a" "$dir")
        OWNER=$(stat -c "%U:%G" "$dir")
        if [ "$PERMS" = "775" ] && [ "$OWNER" = "www-data:www-data" ]; then
            echo -e "${GREEN}✓${NC} $dir - Correct permissions ($PERMS) and ownership ($OWNER)"
        else
            echo -e "${YELLOW}!${NC} $dir - Permissions: $PERMS, Owner: $OWNER (should be 775 and www-data:www-data)"
        fi
    else
        echo -e "${RED}✗${NC} Directory $dir does not exist"
    fi
done
echo ""

# 6. API Endpoints
echo -e "${BLUE}Checking API Endpoints...${NC}"
check_api "/health" "Health check"

# Test authentication endpoint
AUTH_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>/dev/null)

if echo "$AUTH_RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✓${NC} Authentication endpoint is responding"
else
    echo -e "${RED}✗${NC} Authentication endpoint not responding correctly"
fi
echo ""

# 7. Frontend Check
echo -e "${BLUE}Checking Frontend...${NC}"
if curl -s -f "${FRONTEND_URL}" | grep -q "BP Logistics"; then
    echo -e "${GREEN}✓${NC} Frontend is accessible"
else
    echo -e "${RED}✗${NC} Frontend is not accessible"
fi
echo ""

# 8. SSL Certificate (if HTTPS)
echo -e "${BLUE}Checking SSL Certificate...${NC}"
if [ -f /etc/letsencrypt/live/*/fullchain.pem ]; then
    DOMAIN=$(ls /etc/letsencrypt/live/ | head -1)
    EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
    echo -e "${GREEN}✓${NC} SSL certificate found for $DOMAIN"
    echo -e "${GREEN}✓${NC} Certificate expires: $EXPIRY"
else
    echo -e "${YELLOW}!${NC} No SSL certificate found (OK if using HTTP only)"
fi
echo ""

# 9. Backup Configuration
echo -e "${BLUE}Checking Backup Configuration...${NC}"
if [ -f /usr/local/bin/backup-bp-logistics.sh ]; then
    echo -e "${GREEN}✓${NC} Backup script exists"
    
    if crontab -l 2>/dev/null | grep -q "backup-bp-logistics.sh"; then
        echo -e "${GREEN}✓${NC} Backup cron job is configured"
    else
        echo -e "${YELLOW}!${NC} Backup cron job not found"
    fi
else
    echo -e "${RED}✗${NC} Backup script not found"
fi
echo ""

# 10. Resource Usage
echo -e "${BLUE}Current Resource Usage...${NC}"
echo -e "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo -e "Memory: $(free -h | awk 'NR==2{printf "Used: %s/%s (%.2f%%)", $3,$2,$3*100/$2 }')"
echo -e "Disk: $(df -h / | awk 'NR==2{printf "Used: %s/%s (%s)", $3,$2,$5}')"
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Verification Summary${NC}"
echo "=========================================="

# Count successes and failures
SUCCESS_COUNT=$(grep -c "✓" /tmp/verify_output 2>/dev/null || echo "0")
FAILURE_COUNT=$(grep -c "✗" /tmp/verify_output 2>/dev/null || echo "0")
WARNING_COUNT=$(grep -c "!" /tmp/verify_output 2>/dev/null || echo "0")

if [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Your deployment appears to be working correctly.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create an admin user if not already done"
    echo "2. Configure SMTP settings for emails"
    echo "3. Test file uploads for each Excel type"
    echo "4. Set up monitoring and alerts"
else
    echo -e "${RED}Some checks failed. Please review the output above and fix any issues.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Restart services: systemctl restart nginx postgresql"
    echo "- Check logs: pm2 logs, /var/log/nginx/error.log"
    echo "- Fix permissions: chown -R www-data:www-data /var/www/bp-logistics"
fi

echo ""
echo "For detailed logs, run:"
echo "- PM2 logs: sudo -u www-data pm2 logs"
echo "- Nginx logs: tail -f /var/log/nginx/error.log"
echo "- PostgreSQL logs: tail -f /var/log/postgresql/*.log"