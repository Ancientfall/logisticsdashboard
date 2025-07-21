#!/bin/bash

# Simple server upload script
echo "🔧 Uploading updated vps-server.js..."

# Create a simple netcat approach or use curl to upload
cat vps-server.js | sshpass -p "9jZ4A0Oyw7VRKDOW" ssh root@178.16.140.185 "cat > /var/www/logisticsdashboard/vps-server.js"

if [ $? -eq 0 ]; then
    echo "✅ Server file uploaded successfully"
    
    # Restart PM2
    echo "🔄 Restarting PM2..."
    sshpass -p "9jZ4A0Oyw7VRKDOW" ssh root@178.16.140.185 "cd /var/www/logisticsdashboard && pm2 restart bp-logistics-dashboard"
    
    if [ $? -eq 0 ]; then
        echo "✅ PM2 restarted successfully"
        echo "🌐 Testing server..."
        sleep 3
        curl -s "https://bpsolutionsdashboard.com/version" | jq '.version'
    else
        echo "❌ PM2 restart failed"
    fi
else
    echo "❌ Server file upload failed"
fi