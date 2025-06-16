#!/bin/bash

# Fix Frontend Permissions Script

echo "Fixing frontend permissions and configuration..."

# Set proper ownership
sudo chown -R www-data:www-data /var/www/bp-logistics-frontend

# Set proper permissions
sudo chmod -R 755 /var/www/bp-logistics-frontend

# Ensure index.html exists
if [ ! -f /var/www/bp-logistics-frontend/index.html ]; then
    echo "ERROR: index.html not found in /var/www/bp-logistics-frontend"
    echo "Contents of directory:"
    ls -la /var/www/bp-logistics-frontend/
else
    echo "index.html found successfully"
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx

echo "Done! Testing frontend access..."
curl -I http://localhost/