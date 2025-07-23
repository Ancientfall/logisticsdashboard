#!/bin/bash

# Manual deployment script for aviation dashboard
# Run this when SSH connectivity is restored

echo "🚀 Manual Aviation Dashboard Deployment"
echo "======================================"

# Load environment variables
source .env

DEPLOYMENT_PACKAGE="bp-dashboard-aviation-deployment-20250722_075558.tar.gz"

echo "📦 Using deployment package: $DEPLOYMENT_PACKAGE"

# Try to upload deployment package
echo "📤 Uploading to VPS server..."
scp -o ConnectTimeout=30 -o ServerAliveInterval=60 "$DEPLOYMENT_PACKAGE" root@178.16.140.185:/tmp/

if [ $? -eq 0 ]; then
    echo "✅ Upload successful! Deploying..."
    
    # Deploy on VPS
    ssh -o ConnectTimeout=30 root@178.16.140.185 "
        # Backup current deployment
        cp -r /var/www/logisticsdashboard /var/www/logisticsdashboard_backup_$(date +%Y%m%d_%H%M%S)
        
        # Extract new deployment
        cd /var/www/logisticsdashboard
        rm -rf *
        tar -xzf /tmp/$DEPLOYMENT_PACKAGE
        
        # Set permissions
        chown -R www-data:www-data /var/www/logisticsdashboard
        chmod -R 755 /var/www/logisticsdashboard
        
        # Restart services
        systemctl reload nginx
        systemctl status nginx --no-pager -l
        
        # Clean up
        rm -f /tmp/$DEPLOYMENT_PACKAGE
        
        echo 'Aviation dashboard deployment complete!'
    "
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "🌐 Aviation dashboard available at: https://bpsolutionsdashboard.com/aviation"
    else
        echo "❌ Deployment failed during server setup"
    fi
else
    echo "❌ Upload failed - check network connectivity"
    echo ""
    echo "Manual Steps:"
    echo "1. Copy $DEPLOYMENT_PACKAGE to your server"
    echo "2. Extract to /var/www/logisticsdashboard/"
    echo "3. Set permissions: chown -R www-data:www-data /var/www/logisticsdashboard"
    echo "4. Restart nginx: systemctl reload nginx"
fi