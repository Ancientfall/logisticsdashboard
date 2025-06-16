#!/bin/bash

# BP Logistics Dashboard - VPS Deployment Script
# This script sets up the entire application on a fresh Ubuntu/Debian VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
DB_NAME="bp_logistics"
DB_USER="bp_logistics_user"
DB_PASSWORD="bp_logistics_2024!"
JWT_SECRET=$(openssl rand -base64 32)
BACKEND_PORT="5001"
DOMAIN="" # Will be set by user input

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

echo "======================================"
echo "BP Logistics Dashboard VPS Setup"
echo "======================================"
echo ""

# Get domain/IP from user
read -p "Enter your domain name or VPS IP address: " DOMAIN
if [ -z "$DOMAIN" ]; then
    print_error "Domain/IP is required"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y \
    curl \
    git \
    build-essential \
    nginx \
    postgresql \
    postgresql-contrib \
    certbot \
    python3-certbot-nginx \
    ufw

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
print_status "Verifying installations..."
node --version
npm --version
psql --version

# Setup PostgreSQL
print_status "Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
print_status "Creating database and user..."
sudo -u postgres psql <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF

# Grant schema permissions
sudo -u postgres psql -d ${DB_NAME} <<EOF
GRANT ALL ON SCHEMA public TO ${DB_USER};
\q
EOF

# Create application directory
print_status "Creating application directory..."
mkdir -p /var/www/bp-logistics
cd /var/www/bp-logistics

# Clone or copy application files
print_status "Setting up application files..."
echo "Choose deployment method:"
echo "1) Clone from Git repository"
echo "2) I will manually upload files"
read -p "Select option (1 or 2): " DEPLOY_METHOD

if [ "$DEPLOY_METHOD" == "1" ]; then
    read -p "Enter Git repository URL: " GIT_REPO
    git clone $GIT_REPO .
else
    print_warning "Please upload your application files to /var/www/bp-logistics"
    print_warning "Press Enter when files are uploaded..."
    read
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd /var/www/bp-logistics/backend
npm install

# Create .env file for backend
print_status "Creating backend .env file..."
cat > .env <<EOF
# Server Configuration
NODE_ENV=production
PORT=${BACKEND_PORT}

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=30d

# CORS Configuration
FRONTEND_URL=https://${DOMAIN}

# File Upload Configuration
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Email Configuration (update these with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM="BP Logistics Dashboard" <noreply@${DOMAIN}>
EOF

# Create necessary directories
mkdir -p uploads logs

# Install frontend dependencies and build
print_status "Installing frontend dependencies..."
cd /var/www/bp-logistics
npm install

# Update frontend API URL
print_status "Updating frontend configuration..."
cat > .env.production <<EOF
REACT_APP_API_URL=https://${DOMAIN}/api
EOF

# Build frontend
print_status "Building frontend..."
npm run build

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > /var/www/bp-logistics/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'bp-logistics-backend',
    script: './backend/src/server.js',
    cwd: '/var/www/bp-logistics',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './backend/logs/pm2-error.log',
    out_file: './backend/logs/pm2-out.log',
    log_file: './backend/logs/pm2-combined.log',
    time: true
  }]
};
EOF

# Start backend with PM2
print_status "Starting backend with PM2..."
cd /var/www/bp-logistics
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/bp-logistics <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend
    location / {
        root /var/www/bp-logistics/build;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Increase timeout for file uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        client_max_body_size 50M;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Set up SSL with Let's Encrypt (optional)
echo ""
read -p "Do you want to set up SSL with Let's Encrypt? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" == "y" ]; then
    print_status "Setting up SSL..."
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN}
    
    # Set up auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
fi

# Create initial admin user script
print_status "Creating admin user creation script..."
cat > /var/www/bp-logistics/create-admin.js <<EOF
const bcrypt = require('bcryptjs');
const { User } = require('./backend/src/models');

async function createAdmin() {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    const firstName = process.argv[4] || 'Admin';
    const lastName = process.argv[5] || 'User';

    if (!email || !password) {
      console.log('Usage: node create-admin.js <email> <password> [firstName] [lastName]');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin'
    });

    console.log('Admin user created successfully:', user.email);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdmin();
EOF

# Set proper permissions
print_status "Setting file permissions..."
chown -R www-data:www-data /var/www/bp-logistics
chmod -R 755 /var/www/bp-logistics
chmod -R 775 /var/www/bp-logistics/backend/uploads
chmod -R 775 /var/www/bp-logistics/backend/logs

# Create systemd service for PM2
print_status "Creating systemd service..."
pm2 save
pm2 startup systemd -u www-data --hp /var/www

echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
print_status "Database Name: ${DB_NAME}"
print_status "Database User: ${DB_USER}"
print_status "Backend Port: ${BACKEND_PORT}"
print_status "Application URL: http://${DOMAIN}"
if [ "$SETUP_SSL" == "y" ]; then
    print_status "SSL Enabled: https://${DOMAIN}"
fi
echo ""
print_warning "To create an admin user, run:"
echo "cd /var/www/bp-logistics && node create-admin.js <email> <password> <firstName> <lastName>"
echo ""
print_warning "To view logs:"
echo "pm2 logs bp-logistics-backend"
echo ""
print_warning "To restart the application:"
echo "pm2 restart bp-logistics-backend"
echo ""
print_warning "IMPORTANT: Save these credentials securely!"
echo "JWT Secret: ${JWT_SECRET}"
echo "Database Password: ${DB_PASSWORD}"
echo ""