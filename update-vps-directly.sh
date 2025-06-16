#!/bin/bash

# Direct VPS Update Script
# Updates files on VPS without using Git

VPS_IP="178.16.140.185"
VPS_USER="root"
REMOTE_DIR="/var/www/bp-logistics"

echo "======================================"
echo "Direct VPS Update for BP Logistics"
echo "======================================"
echo ""

# Create a minimal update package (excluding node_modules, build, etc.)
echo "Creating update package..."
rm -rf update-package
mkdir -p update-package

# Copy only source files and configs
cp -r backend update-package/ 2>/dev/null
cp -r src update-package/ 2>/dev/null
cp -r public update-package/ 2>/dev/null
cp package*.json update-package/ 2>/dev/null
cp tsconfig.json update-package/ 2>/dev/null
cp tailwind.config.js update-package/ 2>/dev/null
cp postcss.config.js update-package/ 2>/dev/null

# Copy new scripts
cp database-utils.sh update-package/ 2>/dev/null
cp server-maintenance.sh update-package/ 2>/dev/null

# Clean up
rm -rf update-package/backend/node_modules
rm -rf update-package/backend/.env
rm -rf update-package/backend/logs/*
rm -rf update-package/backend/uploads/*

# Create update script for the server
cat > update-package/apply-update.sh << 'EOF'
#!/bin/bash

echo "Applying updates to BP Logistics Dashboard..."

# Backup current version
echo "Creating backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
cd /var/www/bp-logistics
tar -czf "/var/backups/bp-logistics-pre-update-$timestamp.tar.gz" \
    --exclude=node_modules \
    --exclude=build \
    --exclude=logs \
    --exclude=uploads \
    --exclude=.env \
    .

# Copy new files (preserving .env and uploads)
echo "Copying updated files..."
cp -r /tmp/update-package/backend/* /var/www/bp-logistics/backend/
cp -r /tmp/update-package/src/* /var/www/bp-logistics/src/
cp -r /tmp/update-package/public/* /var/www/bp-logistics/public/
cp /tmp/update-package/package*.json /var/www/bp-logistics/
cp /tmp/update-package/*.config.js /var/www/bp-logistics/
cp /tmp/update-package/*.json /var/www/bp-logistics/

# Copy utility scripts
cp /tmp/update-package/database-utils.sh /var/www/bp-logistics/
cp /tmp/update-package/server-maintenance.sh /var/www/bp-logistics/
chmod +x /var/www/bp-logistics/*.sh

# Install dependencies
echo "Installing backend dependencies..."
cd /var/www/bp-logistics/backend
npm install --production

echo "Installing frontend dependencies..."
cd /var/www/bp-logistics
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Update database schema if needed
echo "Updating database schema..."
cd /var/www/bp-logistics/backend
node -e "
const { sequelize } = require('./src/models');
sequelize.sync({ alter: true }).then(() => {
  console.log('Database schema updated');
  process.exit(0);
}).catch(err => {
  console.error('Error updating schema:', err);
  process.exit(1);
});
"

# Set permissions
chown -R www-data:www-data /var/www/bp-logistics
chmod -R 755 /var/www/bp-logistics
chmod -R 775 /var/www/bp-logistics/backend/uploads
chmod -R 775 /var/www/bp-logistics/backend/logs

# Restart application
echo "Restarting application..."
pm2 restart bp-logistics-backend

echo "Update completed!"
pm2 status
EOF

chmod +x update-package/apply-update.sh

# Create archive
echo "Creating update archive..."
tar -czf vps-update.tar.gz update-package

echo ""
echo "Update package created!"
echo ""
echo "To update your VPS:"
echo "1. Upload the update package:"
echo "   scp vps-update.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/"
echo ""
echo "2. SSH to your server and apply update:"
echo "   ssh ${VPS_USER}@${VPS_IP}"
echo "   cd /tmp"
echo "   tar -xzf vps-update.tar.gz"
echo "   cd update-package"
echo "   ./apply-update.sh"
echo ""
echo "This will preserve your .env file and uploaded data while updating the code."