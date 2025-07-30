#!/bin/bash

# BP Logistics Dashboard - Server Maintenance Script
# For monitoring and maintaining the application on VPS

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/bp-logistics"
NGINX_SITE="/etc/nginx/sites-available/bp-logistics"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

check_status() {
    print_header "System Status Check"
    
    # Check Node.js app
    echo -e "\n${YELLOW}Application Status:${NC}"
    pm2 status
    
    # Check Nginx
    echo -e "\n${YELLOW}Nginx Status:${NC}"
    systemctl status nginx --no-pager | head -n 10
    
    # Check PostgreSQL
    echo -e "\n${YELLOW}PostgreSQL Status:${NC}"
    systemctl status postgresql --no-pager | head -n 10
    
    # Check disk space
    echo -e "\n${YELLOW}Disk Space:${NC}"
    df -h | grep -E '^/dev/' | grep -v tmpfs
    
    # Check memory
    echo -e "\n${YELLOW}Memory Usage:${NC}"
    free -h
    
    # Check system load
    echo -e "\n${YELLOW}System Load:${NC}"
    uptime
}

view_logs() {
    print_header "Application Logs"
    
    echo "Select log to view:"
    echo "1) PM2 Application logs"
    echo "2) PM2 Error logs"
    echo "3) Nginx Access logs"
    echo "4) Nginx Error logs"
    echo "5) PostgreSQL logs"
    echo "6) All recent logs"
    
    read -p "Enter choice (1-6): " choice
    
    case $choice in
        1) pm2 logs bp-logistics-backend --lines 50 ;;
        2) pm2 logs bp-logistics-backend --err --lines 50 ;;
        3) tail -n 50 /var/log/nginx/access.log ;;
        4) tail -n 50 /var/log/nginx/error.log ;;
        5) sudo journalctl -u postgresql -n 50 ;;
        6) 
            echo -e "\n${YELLOW}=== PM2 Logs ===${NC}"
            pm2 logs bp-logistics-backend --lines 20 --nostream
            echo -e "\n${YELLOW}=== Nginx Error Logs ===${NC}"
            tail -n 20 /var/log/nginx/error.log
            ;;
        *) echo "Invalid choice" ;;
    esac
}

restart_services() {
    print_header "Restarting Services"
    
    echo "Select service to restart:"
    echo "1) Application (PM2)"
    echo "2) Nginx"
    echo "3) PostgreSQL"
    echo "4) All services"
    
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1) 
            echo -e "${YELLOW}Restarting application...${NC}"
            pm2 restart bp-logistics-backend
            pm2 status
            ;;
        2) 
            echo -e "${YELLOW}Restarting Nginx...${NC}"
            nginx -t && systemctl restart nginx
            systemctl status nginx --no-pager | head -n 5
            ;;
        3) 
            echo -e "${YELLOW}Restarting PostgreSQL...${NC}"
            systemctl restart postgresql
            systemctl status postgresql --no-pager | head -n 5
            ;;
        4) 
            echo -e "${YELLOW}Restarting all services...${NC}"
            pm2 restart bp-logistics-backend
            nginx -t && systemctl restart nginx
            systemctl restart postgresql
            echo -e "${GREEN}All services restarted${NC}"
            ;;
        *) echo "Invalid choice" ;;
    esac
}

update_app() {
    print_header "Update Application"
    
    echo -e "${YELLOW}This will pull latest changes and restart the application.${NC}"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        echo "Update cancelled"
        return
    fi
    
    cd $APP_DIR
    
    # Backup current version
    echo -e "${YELLOW}Creating backup...${NC}"
    timestamp=$(date +%Y%m%d_%H%M%S)
    tar -czf "/var/backups/bp-logistics-app-$timestamp.tar.gz" --exclude=node_modules --exclude=logs --exclude=uploads .
    
    # Pull changes (if using git)
    if [ -d .git ]; then
        echo -e "${YELLOW}Pulling latest changes...${NC}"
        git pull
    fi
    
    # Install dependencies
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    npm install --production
    
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd ..
    npm install
    
    # Build frontend
    echo -e "${YELLOW}Building frontend...${NC}"
    npm run build
    
    # Restart application
    echo -e "${YELLOW}Restarting application...${NC}"
    pm2 restart bp-logistics-backend
    
    echo -e "${GREEN}Update completed!${NC}"
}

clean_logs() {
    print_header "Clean Old Logs"
    
    echo -e "${YELLOW}Cleaning old logs...${NC}"
    
    # Clean PM2 logs older than 7 days
    find $APP_DIR/backend/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Rotate nginx logs
    nginx -s reopen
    
    # Clean old backups (keep last 7)
    find /var/backups -name "bp-logistics*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    
    echo -e "${GREEN}Logs cleaned${NC}"
}

check_security() {
    print_header "Security Check"
    
    # Check firewall
    echo -e "${YELLOW}Firewall Status:${NC}"
    ufw status
    
    # Check fail2ban if installed
    if command -v fail2ban-client &> /dev/null; then
        echo -e "\n${YELLOW}Fail2ban Status:${NC}"
        fail2ban-client status
    fi
    
    # Check SSL certificate
    echo -e "\n${YELLOW}SSL Certificate:${NC}"
    if [ -f /etc/letsencrypt/live/*/cert.pem ]; then
        openssl x509 -in /etc/letsencrypt/live/*/cert.pem -noout -dates
    else
        echo "No SSL certificate found"
    fi
    
    # Check for security updates
    echo -e "\n${YELLOW}Security Updates:${NC}"
    apt list --upgradable 2>/dev/null | grep -i security | head -10
}

database_info() {
    print_header "Database Information"
    
    # Connect to database and show stats
    sudo -u postgres psql -d bp_logistics <<EOF
SELECT 'Users' as table_name, COUNT(*) as count FROM "Users"
UNION ALL
SELECT 'Uploads', COUNT(*) FROM "Uploads"
UNION ALL
SELECT 'WellOperations', COUNT(*) FROM "WellOperations"
UNION ALL
SELECT 'Vessels', COUNT(*) FROM "Vessels"
UNION ALL
SELECT 'FluidAnalyses', COUNT(*) FROM "FluidAnalyses";

SELECT 
    pg_size_pretty(pg_database_size('bp_logistics')) as database_size;
EOF
}

show_menu() {
    print_header "BP Logistics Dashboard - Maintenance Menu"
    
    echo "1) Check system status"
    echo "2) View logs"
    echo "3) Restart services"
    echo "4) Update application"
    echo "5) Clean old logs"
    echo "6) Security check"
    echo "7) Database information"
    echo "8) Backup database"
    echo "9) Exit"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (1-9): " choice
    
    case $choice in
        1) check_status ;;
        2) view_logs ;;
        3) restart_services ;;
        4) update_app ;;
        5) clean_logs ;;
        6) check_security ;;
        7) database_info ;;
        8) 
            if [ -f "$APP_DIR/database-utils.sh" ]; then
                $APP_DIR/database-utils.sh backup
            else
                echo -e "${RED}Database backup script not found${NC}"
            fi
            ;;
        9) 
            echo -e "${GREEN}Exiting...${NC}"
            exit 0
            ;;
        *) 
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done