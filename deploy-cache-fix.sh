#!/bin/bash

# Deploy with cache-busting for Hostinger VPS
# Usage: ./deploy-cache-fix.sh

echo "🚀 Deploying cache-busting fix to Hostinger VPS..."

# Build the updated version
echo "📦 Building updated version..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy files to server
SERVER="root@178.16.140.185"
REMOTE_PATH="/var/www/logisticsdashboard"

echo "🌐 Deploying to server..."

# Transfer updated files
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.env' \
    ./ $SERVER:$REMOTE_PATH/

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Files deployed successfully"

# Restart server to apply changes
echo "🔄 Restarting server..."
ssh $SERVER "cd $REMOTE_PATH && pkill -f 'node vps-server.js' && nohup node vps-server.js > /dev/null 2>&1 & disown"

if [ $? -ne 0 ]; then
    echo "❌ Server restart failed"
    exit 1
fi

echo "✅ Server restarted successfully"

# Wait a moment for server to start
sleep 3

# Test the deployment
echo "🧪 Testing deployment..."
VERSION_RESPONSE=$(ssh $SERVER "curl -s http://localhost:5001/version")
echo "Server version response: $VERSION_RESPONSE"

CACHE_BUSTER_RESPONSE=$(ssh $SERVER "curl -s http://localhost:5001/cache-buster")
echo "Cache buster response: $CACHE_BUSTER_RESPONSE"

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps to clear Cloudflare cache:"
echo "1. Go to your Cloudflare dashboard"
echo "2. Select your domain (bpsolutionsdashboard.com)"
echo "3. Go to Caching > Configuration"
echo "4. Click 'Purge Everything' to clear all cached content"
echo "5. Wait 2-3 minutes, then refresh your browser"
echo ""
echo "🔗 Test URLs:"
echo "- https://bpsolutionsdashboard.com/version"
echo "- https://bpsolutionsdashboard.com/cache-buster"
echo ""
echo "🔧 If still seeing old version, try:"
echo "- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "- Clear browser cache"
echo "- Try incognito/private browsing mode"