#!/bin/bash

# Create ecosystem.config.js and start the application

echo "====================================="
echo "Creating PM2 Config and Starting App"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Create ecosystem.config.js
echo "1. Creating ecosystem.config.js..."
cd /var/www/bp-logistics

cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'bp-logistics-backend',
    script: './backend/src/server.js',
    cwd: '/var/www/bp-logistics',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './backend/logs/pm2-error.log',
    out_file: './backend/logs/pm2-out.log',
    log_file: './backend/logs/pm2-combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF

chown www-data:www-data ecosystem.config.js
echo -e "${GREEN}✓ ecosystem.config.js created${NC}"
echo ""

# 2. Ensure log directory exists
mkdir -p /var/www/bp-logistics/backend/logs
chown -R www-data:www-data /var/www/bp-logistics/backend/logs
chmod -R 775 /var/www/bp-logistics/backend/logs

# 3. Start the application with PM2
echo "2. Starting application with PM2..."
sudo -u www-data PM2_HOME=/var/www/.pm2 pm2 start ecosystem.config.js

# Save PM2 process list
sudo -u www-data PM2_HOME=/var/www/.pm2 pm2 save

echo ""
echo "3. Checking PM2 status..."
sudo -u www-data PM2_HOME=/var/www/.pm2 pm2 status

# Wait for app to start
sleep 5

# 4. Check if app is running
echo ""
echo "4. Testing API endpoint..."
if curl -s http://localhost:5001/health | grep -q "ok"; then
    echo -e "${GREEN}✓ API is responding on port 5001!${NC}"
    
    # Test through Nginx
    echo ""
    echo "5. Testing through Nginx..."
    if curl -s -L http://bpsolutionsdashboard.com/api/health 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✓ API is accessible through domain!${NC}"
    elif curl -s http://178.16.140.185/api/health 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✓ API is accessible through IP!${NC}"
    else
        echo -e "${YELLOW}! API not accessible through Nginx${NC}"
        echo "Checking Nginx configuration..."
        nginx -t
        systemctl restart nginx
    fi
else
    echo -e "${RED}✗ API not responding${NC}"
    echo ""
    echo "Checking logs for errors..."
    sudo -u www-data PM2_HOME=/var/www/.pm2 pm2 logs bp-logistics-backend --lines 50 --nostream
    
    echo ""
    echo "Checking if port 5001 is in use..."
    netstat -tlnp | grep 5001
fi

echo ""
echo "6. Application Details:"
sudo -u www-data PM2_HOME=/var/www/.pm2 pm2 describe bp-logistics-backend

echo ""
echo -e "${GREEN}===== Deployment Status =====${NC}"
echo ""

# Final status check
if sudo -u www-data PM2_HOME=/var/www/.pm2 pm2 list | grep -q "online.*bp-logistics-backend"; then
    echo -e "${GREEN}✓ Backend is running with PM2${NC}"
    echo ""
    echo "Your application should now be accessible at:"
    echo "- https://bpsolutionsdashboard.com"
    echo "- http://178.16.140.185"
    echo ""
    echo "Quick commands (using pm2-bp shortcut):"
    echo "- pm2-bp logs          # View logs"
    echo "- pm2-bp monit         # Monitor in real-time"
    echo "- pm2-bp restart all   # Restart application"
    echo ""
    echo "To follow logs in real-time:"
    echo "pm2-bp logs -f"
else
    echo -e "${RED}✗ Application is not running properly${NC}"
    echo ""
    echo "Try starting it manually:"
    echo "cd /var/www/bp-logistics/backend"
    echo "sudo -u www-data node src/server.js"
    echo ""
    echo "This will show any startup errors directly."
fi