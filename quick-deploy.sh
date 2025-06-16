#!/bin/bash

# Quick Deployment Script for BP Logistics Dashboard
# Use this script when you already have PostgreSQL and database set up

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Your existing credentials
DB_NAME="bp_logistics"
DB_USER="bp_logistics_user"
JWT_SECRET="Ffz7WE9mfWJ03m3NYybХ+Bcsa9JUNeROhNT1QHEqALk=="

echo "========================================"
echo "BP Logistics Quick Deployment"
echo "========================================"
echo ""
echo "This script assumes you have:"
echo "- PostgreSQL already installed"
echo "- Database 'bp_logistics' created"
echo "- User 'bp_logistics_user' created"
echo ""

# Your domain
DOMAIN="bpsolutionsdashboard.com"

# Get database password
echo "Domain: ${DOMAIN}"
read -sp "Enter your database password: " DB_PASSWORD
echo ""

# Update and install dependencies
echo -e "${GREEN}Installing system dependencies...${NC}"
apt update
apt install -y nginx nodejs npm git build-essential

# Install PM2
npm install -g pm2

# Setup application
cd /var/www/bp-logistics

# Install dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
cd backend
npm install --production

# Create .env file
echo -e "${GREEN}Creating configuration...${NC}"
cat > .env <<EOF
NODE_ENV=production
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=30d
FRONTEND_URL=https://${DOMAIN}
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF

# Create directories
mkdir -p uploads logs
chmod 775 uploads logs

# Build frontend
echo -e "${GREEN}Building frontend...${NC}"
cd /var/www/bp-logistics
npm install
echo "REACT_APP_API_URL=https://${DOMAIN}/api" > .env.production
npm run build

# Configure PM2
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'bp-logistics-backend',
    script: './backend/src/server.js',
    cwd: '/var/www/bp-logistics',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Configure Nginx
echo -e "${GREEN}Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/bp-logistics <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        root /var/www/bp-logistics/build;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Set permissions
chown -R www-data:www-data /var/www/bp-logistics
chmod -R 755 /var/www/bp-logistics

# Start services
echo -e "${GREEN}Starting services...${NC}"
sudo -u www-data pm2 start ecosystem.config.js
sudo -u www-data pm2 save
pm2 startup systemd -u www-data --hp /home/www-data
systemctl restart nginx

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo "Your application is available at: http://${DOMAIN}"
echo ""
echo "To create an admin user:"
echo "cd /var/www/bp-logistics && sudo -u www-data node create-admin.js <email> <password>"