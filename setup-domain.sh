#!/bin/bash

# Domain Setup Script for BP Logistics Dashboard
# This script configures Nginx for your domain and sets up SSL

DOMAIN="bpsolutionsdashboard.com"
WWW_DOMAIN="www.bpsolutionsdashboard.com"
VPS_IP="178.16.140.185"

echo "Setting up domain: $DOMAIN"

# Update Nginx configuration
cat > /etc/nginx/sites-available/bp-logistics << EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Increase timeout for large file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
    }

    # Frontend
    location / {
        root /var/www/bp-logistics-frontend;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "Nginx configured for $DOMAIN"
echo ""
echo "Now installing SSL certificate with Certbot..."

# Install SSL certificate
certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo "Domain setup complete!"
echo "Your site should now be accessible at:"
echo "  https://$DOMAIN"
echo "  https://$WWW_DOMAIN"