#!/bin/bash

# BP Logistics Dashboard - VPS Pull & Update Script
# Place this script on your VPS and run it to update from git

set -e

echo "======================================"
echo "Updating BP Logistics Dashboard"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "Error: Not in the application directory"
    echo "Please run from /var/www/bp-logistics"
    exit 1
fi

# Create backup
echo "Creating backup..."
BACKUP_FILE="/var/backups/bp-logistics-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" \
    --exclude=node_modules \
    --exclude=build \
    --exclude=.env \
    --exclude=backend/.env \
    --exclude=uploads \
    --exclude=logs \
    .
echo "Backup created: $BACKUP_FILE"

# Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main

# Update backend
echo "Updating backend dependencies..."
cd backend
npm install --production

# Update frontend
echo "Updating frontend dependencies..."
cd ..
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Update database schema
echo "Updating database schema..."
cd backend
node -e "
const { sequelize } = require('./src/models');
console.log('Connecting to database...');
sequelize.sync({ alter: true }).then(() => {
  console.log('Database schema updated successfully');
  process.exit(0);
}).catch(err => {
  console.error('Error updating database:', err);
  process.exit(1);
});
"

# Set permissions
echo "Setting file permissions..."
cd /var/www/bp-logistics
chown -R www-data:www-data .
chmod -R 755 .
chmod -R 775 backend/uploads backend/logs

# Restart application
echo "Restarting application..."
pm2 restart bp-logistics-backend
pm2 save

# Show status
echo ""
echo "Update complete! Current status:"
pm2 status

echo ""
echo "To view logs: pm2 logs bp-logistics-backend"
echo "To create admin: node create-admin.js email@example.com password FirstName LastName"