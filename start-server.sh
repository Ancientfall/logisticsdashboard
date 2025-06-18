#!/bin/bash

# Start VPS Server Script
# This script properly starts the server on the VPS without SSH timeout issues

VPS_IP="178.16.140.185"
VPS_USER="root"
SERVER_DIR="/var/www/logisticsdashboard"
SERVER_FILE="vps-server.js"

echo "🚀 Starting BP Logistics Dashboard Server..."

# Connect to VPS and start server properly
ssh "$VPS_USER@$VPS_IP" "
    cd '$SERVER_DIR'
    
    # Kill any existing server processes
    pkill -f '$SERVER_FILE' || true
    
    # Start server detached from SSH session
    nohup node '$SERVER_FILE' > vps-server.log 2>&1 & disown
    
    echo '✓ Server started successfully'
    echo 'Waiting 3 seconds for startup...'
    sleep 3
    
    # Test health endpoint
    if curl -s http://localhost:5001/health > /dev/null; then
        echo '✓ Health check passed'
        echo '✓ Server is running on port 5001'
    else
        echo '✗ Health check failed'
        echo 'Check server log: tail -f vps-server.log'
    fi
"

echo "🎉 Server startup complete!"
echo ""
echo "Access your dashboard at:"
echo "  http://178.16.140.185:5001"
echo "  https://bpsolutionsdashboard.com (if DNS configured)"
echo ""
echo "To check server status:"
echo "  ssh root@178.16.140.185 'curl -s http://localhost:5001/health'"