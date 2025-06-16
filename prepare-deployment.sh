#!/bin/bash

# BP Logistics Dashboard - Deployment Preparation Script
# This script prepares your application for deployment to VPS

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "Preparing BP Logistics Dashboard for Deployment"
echo "======================================"
echo ""

# Create deployment directory
DEPLOY_DIR="bp-logistics-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo -e "${GREEN}[✓]${NC} Copying application files..."

# Copy necessary files
cp -r backend $DEPLOY_DIR/
cp -r src $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp tsconfig.json $DEPLOY_DIR/
cp tailwind.config.js $DEPLOY_DIR/
cp postcss.config.js $DEPLOY_DIR/
cp deploy-to-vps.sh $DEPLOY_DIR/
cp CLAUDE.md $DEPLOY_DIR/
cp POSTGRESQL_SETUP_GUIDE.md $DEPLOY_DIR/

# Clean up unnecessary files
echo -e "${GREEN}[✓]${NC} Cleaning up unnecessary files..."
rm -rf $DEPLOY_DIR/backend/node_modules
rm -rf $DEPLOY_DIR/backend/.env
rm -rf $DEPLOY_DIR/backend/logs/*
rm -rf $DEPLOY_DIR/backend/uploads/*

# Create .gitignore for deployment
cat > $DEPLOY_DIR/.gitignore <<EOF
node_modules/
.env
.env.local
.env.production.local
*.log
logs/
uploads/
build/
.DS_Store
*.swp
*.swo
EOF

# Create deployment README
cat > $DEPLOY_DIR/DEPLOYMENT_README.md <<EOF
# BP Logistics Dashboard - Deployment Instructions

## Quick Deployment

1. Upload this entire directory to your VPS server
2. SSH into your VPS as root
3. Navigate to the uploaded directory
4. Make the deployment script executable:
   \`\`\`bash
   chmod +x deploy-to-vps.sh
   \`\`\`
5. Run the deployment script:
   \`\`\`bash
   sudo ./deploy-to-vps.sh
   \`\`\`

## Manual Deployment Steps

If you prefer to deploy manually or need to customize:

### 1. System Requirements
- Ubuntu 20.04+ or Debian 10+
- At least 2GB RAM
- 20GB disk space
- Root or sudo access

### 2. Required Ports
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 5432 (PostgreSQL - local only)

### 3. Environment Variables to Configure

Create \`/backend/.env\` with:
- Database credentials
- JWT secret
- SMTP settings (for password reset emails)
- Frontend URL

### 4. Post-Deployment

After deployment, create an admin user:
\`\`\`bash
cd /var/www/bp-logistics
node create-admin.js admin@example.com yourpassword Admin User
\`\`\`

### 5. Monitoring

View application logs:
\`\`\`bash
pm2 logs bp-logistics-backend
\`\`\`

Check application status:
\`\`\`bash
pm2 status
\`\`\`

### 6. Backup

Database backup:
\`\`\`bash
pg_dump -U bp_logistics_user bp_logistics > backup.sql
\`\`\`

## Security Notes

1. Change default database password in production
2. Use strong JWT secret
3. Configure firewall rules
4. Keep system updated
5. Use SSL certificate (script will set up Let's Encrypt)

## Support

For issues, check:
- PM2 logs: \`pm2 logs\`
- Nginx logs: \`/var/log/nginx/error.log\`
- PostgreSQL logs: \`/var/log/postgresql/\`
EOF

# Create a compressed archive
echo -e "${GREEN}[✓]${NC} Creating deployment archive..."
# Use --no-xattrs to exclude macOS extended attributes
tar --no-mac-metadata -czf bp-logistics-deploy.tar.gz $DEPLOY_DIR 2>/dev/null || tar -czf bp-logistics-deploy.tar.gz $DEPLOY_DIR

echo ""
echo "======================================"
echo -e "${GREEN}Deployment package created successfully!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}Files created:${NC}"
echo "1. bp-logistics-deploy/ - Directory with all files"
echo "2. bp-logistics-deploy.tar.gz - Compressed archive"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Upload bp-logistics-deploy.tar.gz to your VPS"
echo "2. Extract: tar -xzf bp-logistics-deploy.tar.gz"
echo "3. Run: sudo ./bp-logistics-deploy/deploy-to-vps.sh"
echo ""
echo -e "${YELLOW}Upload methods:${NC}"
echo "- SCP: scp bp-logistics-deploy.tar.gz root@your-vps-ip:/root/"
echo "- SFTP: Use FileZilla or similar"
echo "- rsync: rsync -avz bp-logistics-deploy.tar.gz root@your-vps-ip:/root/"
echo ""