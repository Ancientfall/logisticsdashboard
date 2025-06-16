#!/bin/bash

# VPS Setup Script for BP Logistics Backend
# Run this on your VPS to set up the environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}BP Logistics Backend - VPS Setup Script${NC}"
echo -e "${YELLOW}This script will install all necessary dependencies${NC}"

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo -e "${YELLOW}Installing Node.js 18.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo -e "${YELLOW}Installing PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install PM2 globally
echo -e "${YELLOW}Installing PM2...${NC}"
sudo npm install -g pm2

# Install Nginx
echo -e "${YELLOW}Installing Nginx...${NC}"
sudo apt install -y nginx

# Install additional utilities
echo -e "${YELLOW}Installing additional utilities...${NC}"
sudo apt install -y git curl wget build-essential

# Create application directory
echo -e "${YELLOW}Creating application directory...${NC}"
sudo mkdir -p /var/www/bp-logistics-backend
sudo chown $USER:$USER /var/www/bp-logistics-backend

# Setup PostgreSQL
echo -e "${YELLOW}Setting up PostgreSQL database...${NC}"
echo -e "${RED}You will be prompted to enter the postgres user password${NC}"

# Generate a random password for database
DB_PASSWORD=$(openssl rand -base64 16)

sudo -u postgres psql << EOF
CREATE DATABASE bp_logistics;
CREATE USER bp_user WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE bp_logistics TO bp_user;
\q
EOF

echo -e "${GREEN}Database created successfully!${NC}"
echo -e "${YELLOW}Database credentials:${NC}"
echo -e "  Database: bp_logistics"
echo -e "  User: bp_user"
echo -e "  Password: ${DB_PASSWORD}"
echo -e "${RED}IMPORTANT: Save this password and update it in your .env file!${NC}"

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow 5000/tcp # Backend API (temporary, will be proxied through Nginx)
sudo ufw --force enable

# Create Nginx configuration
echo -e "${YELLOW}Creating Nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/bp-logistics > /dev/null << 'EOF'
server {
    listen 80;
    server_name 178.16.140.185;

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for large file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
    }

    # Frontend (when deployed)
    location / {
        root /var/www/bp-logistics-frontend;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Deploy your backend using: ./deploy.sh"
echo -e "  2. Update the database password in your .env file"
echo -e "  3. Test your API at: http://178.16.140.185/api"
echo -e "  4. Consider setting up a domain name and SSL certificate"

echo -e "\n${YELLOW}Database Password: ${DB_PASSWORD}${NC}"
echo -e "${RED}Make sure to save this password!${NC}"