#!/bin/bash

# Fix Git conflicts and update VPS

echo "======================================"
echo "Fixing Git Conflicts on VPS"
echo "======================================"

# Check current status
echo "Current git status:"
git status --short

# Stash any local changes
echo ""
echo "Stashing local changes..."
git stash save "Local changes before update $(date +%Y%m%d_%H%M%S)"

# Pull latest changes
echo ""
echo "Pulling latest changes..."
git pull origin main

# Check if pull was successful
if [ $? -eq 0 ]; then
    echo "✅ Successfully pulled latest changes"
else
    echo "❌ Failed to pull changes"
    exit 1
fi

# Show what was stashed (if anything)
echo ""
echo "Stashed changes (if any):"
git stash list | head -1

# Continue with the update process
echo ""
echo "Updating backend dependencies..."
cd backend
npm install --production

echo ""
echo "Updating frontend dependencies..."
cd ..
npm install

echo ""
echo "Building frontend..."
npm run build

echo ""
echo "Creating new database tables..."
cd backend
node src/update-models-for-voyage-data.js

echo ""
echo "Setting permissions..."
cd /var/www/bp-logistics
chown -R www-data:www-data .
chmod -R 755 .
chmod -R 775 backend/uploads backend/logs

echo ""
echo "Restarting application..."
pm2 restart bp-logistics-backend
pm2 save

echo ""
echo "======================================"
echo "✅ Update Complete!"
echo "======================================"
echo ""
echo "Status:"
pm2 status

echo ""
echo "Note: Your local changes were stashed. To see them:"
echo "  git stash list"
echo "To restore them (if needed):"
echo "  git stash pop"