#!/bin/bash

# BP Logistics Dashboard - Enhanced VPS Deployment Script
# This script sets up the entire application on a fresh Ubuntu/Debian VPS
# Updated to handle all Excel upload types and ensure proper database setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
DB_NAME="bp_logistics"
DB_USER="bp_logistics_user"
DB_PASSWORD=""  # Will be set by user
JWT_SECRET="Ffz7WE9mfWJ03m3NYybХ+Bcsa9JUNeROhNT1QHEqALk=="  # Your existing JWT secret
BACKEND_PORT="5001"
DOMAIN="bpsolutionsdashboard.com" # Your domain
VPS_IP="178.16.140.185" # Your VPS IP
NODE_VERSION="20"
USE_EXISTING_DB="false"

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to test PostgreSQL connection
test_db_connection() {
    PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" >/dev/null 2>&1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

clear
echo "============================================"
echo "BP Logistics Dashboard Enhanced VPS Setup"
echo "============================================"
echo ""
print_info "This script will install and configure:"
echo "  - PostgreSQL with all required permissions"
echo "  - Node.js ${NODE_VERSION}.x and PM2"
echo "  - Nginx as reverse proxy"
echo "  - SSL certificate (optional)"
echo "  - All application dependencies"
echo ""

# Confirm domain/IP
print_info "Domain: ${DOMAIN}"
print_info "VPS IP: ${VPS_IP}"
echo ""
read -p "Is this correct? (y/n): " CONFIRM_DOMAIN
if [[ ! "$CONFIRM_DOMAIN" =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name: " CUSTOM_DOMAIN
    if [ ! -z "$CUSTOM_DOMAIN" ]; then
        DOMAIN="$CUSTOM_DOMAIN"
    fi
fi

# Check if using existing database
echo ""
print_info "Database: ${DB_NAME}"
print_info "Database User: ${DB_USER}"
echo ""
read -p "Do you have an existing database with these credentials? (y/n): " HAS_EXISTING_DB
if [[ "$HAS_EXISTING_DB" =~ ^[Yy]$ ]]; then
    USE_EXISTING_DB="true"
    read -sp "Enter your existing database password: " DB_PASSWORD
    echo ""
    print_info "Using existing database credentials"
else
    # Ask for custom database password or generate
    read -p "Enter new database password (press Enter to auto-generate): " CUSTOM_DB_PASS
    if [ ! -z "$CUSTOM_DB_PASS" ]; then
        DB_PASSWORD="$CUSTOM_DB_PASS"
        print_info "Using custom database password"
    else
        DB_PASSWORD=$(openssl rand -base64 32)
        print_info "Generated secure database password"
    fi
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required system packages..."
PACKAGES=(curl wget git build-essential nginx postgresql postgresql-contrib postgresql-client certbot python3-certbot-nginx ufw htop fail2ban)
for pkg in "${PACKAGES[@]}"; do
    if ! dpkg -l | grep -q "^ii  $pkg "; then
        print_info "Installing $pkg..."
        apt install -y "$pkg"
    else
        print_info "$pkg already installed"
    fi
done

# Install Node.js
if ! command_exists node || [ "$(node --version | cut -d'v' -f2 | cut -d'.' -f1)" -lt "$NODE_VERSION" ]; then
    print_status "Installing Node.js ${NODE_VERSION}.x..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
else
    print_info "Node.js $(node --version) already installed"
fi

# Verify installations
print_status "Verifying installations..."
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  PostgreSQL: $(psql --version)"

# Setup PostgreSQL
print_status "Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL for better performance
print_status "Optimizing PostgreSQL configuration..."
PG_VERSION=$(ls /etc/postgresql/ | head -1)
PG_CONFIG="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"

# Check if already optimized
if ! grep -q "BP Logistics Dashboard Optimizations" ${PG_CONFIG} 2>/dev/null; then
    # Backup original config
    cp ${PG_CONFIG} ${PG_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update PostgreSQL settings for production
    cat >> ${PG_CONFIG} <<EOF

# BP Logistics Dashboard Optimizations
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_connections = 200
EOF
    print_info "PostgreSQL configuration optimized"
else
    print_info "PostgreSQL already optimized"
fi

# Create database and user with proper error handling
print_status "Setting up database and user..."

if [[ "$USE_EXISTING_DB" == "true" ]]; then
    print_info "Using existing database setup"
    # Just verify connection works
    if ! test_db_connection; then
        print_error "Cannot connect to existing database with provided credentials"
        print_info "Please verify:"
        print_info "1. PostgreSQL is running"
        print_info "2. Database '${DB_NAME}' exists"
        print_info "3. User '${DB_USER}' exists"
        print_info "4. Password is correct"
        exit 1
    else
        print_status "Successfully connected to existing database"
    fi
else
    # Check if database exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw ${DB_NAME}; then
        print_warning "Database ${DB_NAME} already exists"
        read -p "Do you want to drop and recreate it? (y/n): " RECREATE_DB
        if [[ "$RECREATE_DB" =~ ^[Yy]$ ]]; then
            sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS ${DB_USER};
EOF
        else
            print_info "Keeping existing database"
            # Just update the user password
            sudo -u postgres psql <<EOF
ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
EOF
        fi
    fi

    # Create user and database if they don't exist
    sudo -u postgres psql <<EOF || true
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    ELSE
        ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    END IF;
END
\$\$;

DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
        CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
    END IF;
END
\$\$;

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} SET timezone TO 'UTC';
\q
EOF
fi

# Grant schema permissions (important for PostgreSQL 15+)
print_status "Granting schema permissions..."
sudo -u postgres psql -d ${DB_NAME} <<EOF
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT CREATE ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
\q
EOF

# Restart PostgreSQL to apply changes
systemctl restart postgresql

# Test database connection
print_status "Testing database connection..."
if test_db_connection; then
    print_status "Database connection successful!"
else
    print_error "Database connection failed!"
    print_info "Attempting to fix..."
    
    # Update pg_hba.conf for local connections
    echo "local   all   ${DB_USER}   md5" >> /etc/postgresql/${PG_VERSION}/main/pg_hba.conf
    systemctl restart postgresql
    
    if test_db_connection; then
        print_status "Database connection fixed!"
    else
        print_error "Could not establish database connection. Please check PostgreSQL logs."
        exit 1
    fi
fi

# Create application directory
if [ ! -d /var/www/bp-logistics ]; then
    print_status "Creating application directory..."
    mkdir -p /var/www/bp-logistics
else
    print_info "Application directory already exists"
fi
cd /var/www/bp-logistics

# Check if application files already exist
if [ -f "package.json" ] && [ -d "backend" ]; then
    print_warning "Application files already exist"
    read -p "Do you want to update the application files? (y/n): " UPDATE_FILES
    if [[ ! "$UPDATE_FILES" =~ ^[Yy]$ ]]; then
        print_info "Keeping existing application files"
    else
        # Backup existing files
        BACKUP_DIR="/var/backups/bp-logistics-$(date +%Y%m%d_%H%M%S)"
        print_info "Backing up existing files to $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        cp -r /var/www/bp-logistics/* "$BACKUP_DIR/" 2>/dev/null || true
        
        # Update files
        echo ""
        echo "Choose update method:"
        echo "1) Pull from Git repository"
        echo "2) Upload new files manually"
        echo "3) Use scp/rsync from local machine"
        read -p "Select option (1-3): " UPDATE_METHOD
        
        case $UPDATE_METHOD in
            1)
                if [ -d ".git" ]; then
                    print_info "Pulling latest changes..."
                    git pull
                else
                    read -p "Enter Git repository URL: " GIT_REPO
                    if [ ! -z "$GIT_REPO" ]; then
                        rm -rf .git
                        git init
                        git remote add origin "$GIT_REPO"
                        git fetch
                        git checkout -f main || git checkout -f master
                    fi
                fi
                ;;
            2|3)
                print_info "Please upload the updated files"
                read -p "Press Enter when files are uploaded..."
                ;;
        esac
    fi
else
    # Fresh installation
    print_status "Setting up application files..."
    echo ""
    echo "Choose deployment method:"
    echo "1) Clone from Git repository"
    echo "2) Upload files manually (I'll wait)"
    echo "3) Use scp/rsync from local machine"
    read -p "Select option (1-3): " DEPLOY_METHOD
    
    case $DEPLOY_METHOD in
        1)
            read -p "Enter Git repository URL: " GIT_REPO
            if [ ! -z "$GIT_REPO" ]; then
                git clone $GIT_REPO .
            else
                print_error "Git URL cannot be empty"
                exit 1
            fi
            ;;
        2)
            print_warning "Please upload your application files to /var/www/bp-logistics"
            print_info "You can use SFTP, SCP, or any file transfer method"
            print_info "Example: scp -r /path/to/local/files/* root@${DOMAIN}:/var/www/bp-logistics/"
            read -p "Press Enter when files are uploaded..."
            ;;
        3)
            print_info "From your local machine, run:"
            echo "rsync -avz --exclude 'node_modules' --exclude '.git' /path/to/logisticsdashboard/ root@${DOMAIN}:/var/www/bp-logistics/"
            read -p "Press Enter when files are uploaded..."
            ;;
    esac
fi

# Verify files exist
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Application files not found. Please ensure files are uploaded correctly."
    exit 1
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd /var/www/bp-logistics/backend
npm install --production

# Create required directories
print_status "Creating required directories..."
mkdir -p uploads logs
chmod -R 775 uploads logs

# Create or update .env file for backend
if [ -f ".env" ]; then
    print_warning "Backend .env file already exists"
    read -p "Do you want to update it? (y/n): " UPDATE_ENV
    if [[ "$UPDATE_ENV" =~ ^[Yy]$ ]]; then
        # Backup existing .env
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        print_status "Creating new backend .env file..."
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
    else
        print_info "Keeping existing .env file"
        # Just ensure critical variables are set
        source .env
        if [ -z "$DB_PASSWORD" ]; then
            print_warning "DB_PASSWORD not found in existing .env, updating..."
            echo "DB_PASSWORD=${DB_PASSWORD}" >> .env
        fi
    fi
else
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
fi

# Test backend connection
print_status "Testing backend database connection..."
cd /var/www/bp-logistics/backend
cat > test-db.js <<'EOF'
const { sequelize } = require('./src/config/database');

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connection successful!');
        const result = await sequelize.query('SELECT current_database(), current_user, version()');
        console.log('✓ Database:', result[0][0].current_database);
        console.log('✓ User:', result[0][0].current_user);
        console.log('✓ PostgreSQL:', result[0][0].version.split(',')[0]);
        process.exit(0);
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

if node test-db.js; then
    print_status "Backend database connection successful!"
    rm test-db.js
else
    print_error "Backend database connection failed!"
    print_info "Check the .env file and PostgreSQL configuration"
    exit 1
fi

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
print_status "Building frontend (this may take a few minutes)..."
npm run build

# Install PM2 globally
if ! command_exists pm2; then
    print_status "Installing PM2 process manager..."
    npm install -g pm2
else
    print_info "PM2 already installed ($(pm2 --version))"
fi

# Create PM2 ecosystem file with proper error handling
print_status "Creating PM2 configuration..."
cat > /var/www/bp-logistics/ecosystem.config.js <<EOF
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
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Configure Nginx
if [ -f "/etc/nginx/sites-available/bp-logistics" ]; then
    print_warning "Nginx configuration already exists"
    read -p "Do you want to update it? (y/n): " UPDATE_NGINX
    if [[ "$UPDATE_NGINX" =~ ^[Yy]$ ]]; then
        # Backup existing config
        cp /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-available/bp-logistics.backup.$(date +%Y%m%d_%H%M%S)
        print_status "Updating Nginx configuration..."
        cat > /etc/nginx/sites-available/bp-logistics <<EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL will be configured by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Frontend
    location / {
        root /var/www/bp-logistics/build;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
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
        
        # Timeouts for file uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        client_max_body_size 50M;
        
        # Disable buffering for SSE
        proxy_buffering off;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:${BACKEND_PORT}/health;
        access_log off;
    }
}
EOF
    else
        print_info "Keeping existing Nginx configuration"
    fi
else
    print_status "Creating Nginx configuration..."
    cat > /etc/nginx/sites-available/bp-logistics <<EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL will be configured by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Frontend
    location / {
        root /var/www/bp-logistics/build;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
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
        
        # Timeouts for file uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        client_max_body_size 50M;
        
        # Disable buffering for SSE
        proxy_buffering off;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:${BACKEND_PORT}/health;
        access_log off;
    }
}
EOF
fi

# Enable the site
ln -sf /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure firewall
print_status "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow ${BACKEND_PORT}/tcp
ufw --force enable

# Configure fail2ban for additional security
print_status "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Set proper permissions
print_status "Setting file permissions..."
chown -R www-data:www-data /var/www/bp-logistics
chmod -R 755 /var/www/bp-logistics
chmod -R 775 /var/www/bp-logistics/backend/uploads
chmod -R 775 /var/www/bp-logistics/backend/logs

# Start services
print_status "Starting services..."

# Start backend with PM2
cd /var/www/bp-logistics

# Check if process already exists
if sudo -u www-data pm2 list | grep -q "bp-logistics-backend"; then
    print_warning "PM2 process already exists"
    read -p "Do you want to restart it? (y/n): " RESTART_PM2
    if [[ "$RESTART_PM2" =~ ^[Yy]$ ]]; then
        sudo -u www-data pm2 reload bp-logistics-backend
        print_status "Backend reloaded"
    else
        print_info "Keeping existing PM2 process"
    fi
else
    sudo -u www-data pm2 start ecosystem.config.js
    print_status "Backend started"
fi

sudo -u www-data pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u www-data --hp /home/www-data
systemctl enable pm2-www-data

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Set up SSL with Let's Encrypt (optional)
echo ""
read -p "Do you want to set up SSL with Let's Encrypt? (y/n): " SETUP_SSL
if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    print_status "Setting up SSL..."
    read -p "Enter email for SSL notifications: " SSL_EMAIL
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${SSL_EMAIL}
    
    # Set up auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    # Update frontend URL to use HTTPS
    sed -i "s|FRONTEND_URL=https://${DOMAIN}|FRONTEND_URL=https://${DOMAIN}|g" /var/www/bp-logistics/backend/.env
    
    # Restart backend to apply changes
    sudo -u www-data pm2 restart bp-logistics-backend
fi

# Create database backup script
print_status "Creating database backup script..."
cat > /usr/local/bin/backup-bp-logistics.sh <<EOF
#!/bin/bash
# BP Logistics Database Backup Script

BACKUP_DIR="/var/backups/bp-logistics"
mkdir -p \$BACKUP_DIR

# Database backup
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U ${DB_USER} ${DB_NAME} | gzip > \$BACKUP_DIR/db_backup_\$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

# Upload backup (optional)
tar -czf \$BACKUP_DIR/uploads_backup_\$TIMESTAMP.tar.gz -C /var/www/bp-logistics/backend uploads/

echo "Backup completed: \$TIMESTAMP"
EOF

chmod +x /usr/local/bin/backup-bp-logistics.sh

# Set up daily backup cron
echo "0 2 * * * /usr/local/bin/backup-bp-logistics.sh >> /var/log/bp-logistics-backup.log 2>&1" | crontab -

# Create admin user creation script
print_status "Creating admin user creation script..."
cat > /var/www/bp-logistics/create-admin.js <<'EOF'
const bcrypt = require('bcryptjs');
const { User } = require('./backend/src/models');
const { sequelize } = require('./backend/src/config/database');

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

    // Test database connection
    await sequelize.authenticate();
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin'
    });

    console.log('✓ Admin user created successfully:', user.email);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdmin();
EOF

chown www-data:www-data /var/www/bp-logistics/create-admin.js

# Create health check script
print_status "Creating health check script..."
cat > /usr/local/bin/check-bp-logistics.sh <<'EOF'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "BP Logistics Dashboard Health Check"
echo "==================================="

# Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓${NC} PostgreSQL: Running"
else
    echo -e "${RED}✗${NC} PostgreSQL: Not running"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx: Running"
else
    echo -e "${RED}✗${NC} Nginx: Not running"
fi

# Check PM2
if pm2 list | grep -q "bp-logistics-backend"; then
    echo -e "${GREEN}✓${NC} Backend: Running"
else
    echo -e "${RED}✗${NC} Backend: Not running"
fi

# Check API endpoint
if curl -s http://localhost:5001/health > /dev/null; then
    echo -e "${GREEN}✓${NC} API: Responding"
else
    echo -e "${RED}✗${NC} API: Not responding"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo -e "${GREEN}✓${NC} Disk Space: ${DISK_USAGE}% used"
else
    echo -e "${YELLOW}!${NC} Disk Space: ${DISK_USAGE}% used (warning)"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
echo -e "${GREEN}✓${NC} Memory: ${MEM_USAGE}% used"

echo ""
EOF

chmod +x /usr/local/bin/check-bp-logistics.sh

# Final setup summary
clear
echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
print_status "Application URL: http://${DOMAIN}"
if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    print_status "Secure URL: https://${DOMAIN}"
fi
echo ""
print_info "Database Credentials:"
echo "  Database: ${DB_NAME}"
echo "  Username: ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo ""
print_info "Application Credentials:"
echo "  JWT Secret: ${JWT_SECRET}"
echo ""
print_warning "SAVE THESE CREDENTIALS SECURELY!"
echo ""
print_info "Useful Commands:"
echo "  Create admin user: cd /var/www/bp-logistics && sudo -u www-data node create-admin.js <email> <password>"
echo "  View logs: sudo -u www-data pm2 logs bp-logistics-backend"
echo "  Restart app: sudo -u www-data pm2 restart bp-logistics-backend"
echo "  Health check: /usr/local/bin/check-bp-logistics.sh"
echo "  Database backup: /usr/local/bin/backup-bp-logistics.sh"
echo ""
print_info "Next Steps:"
echo "  1. Create an admin user (command above)"
echo "  2. Update SMTP settings in /var/www/bp-logistics/backend/.env"
echo "  3. Test file uploads"
echo "  4. Monitor logs for any issues"
echo ""
print_status "Setup complete! Your BP Logistics Dashboard is ready to use."