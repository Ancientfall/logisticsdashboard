#!/bin/bash

# Fix Nginx Configuration Script

echo "=== Fixing Nginx Configuration ==="
echo ""
echo "Run these commands on your VPS:"
echo ""

echo "1. List all nginx site configurations:"
echo "   ls -la /etc/nginx/sites-enabled/"
echo ""

echo "2. Check for duplicate configurations:"
echo "   grep -r '178.16.140.185' /etc/nginx/sites-enabled/"
echo ""

echo "3. Remove the default nginx config if it exists:"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo ""

echo "4. Check your bp-logistics config:"
echo "   cat /etc/nginx/sites-available/bp-logistics"
echo ""

echo "5. Make sure only bp-logistics is enabled:"
echo "   sudo rm -f /etc/nginx/sites-enabled/*"
echo "   sudo ln -sf /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-enabled/"
echo ""

echo "6. Update bp-logistics config for both IP and domain:"
cat << 'EOF'
   sudo nano /etc/nginx/sites-available/bp-logistics

   # Add this configuration:
   server {
       listen 80;
       server_name bpsolutionsdashboard.com www.bpsolutionsdashboard.com 178.16.140.185;

       # Redirect HTTP to HTTPS if SSL is set up
       # return 301 https://$server_name$request_uri;

       # Backend API
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
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
           try_files $uri $uri/ /index.html;
           
           # Disable caching for index.html
           location = /index.html {
               add_header Cache-Control "no-cache, no-store, must-revalidate";
               add_header Pragma "no-cache";
               add_header Expires "0";
           }
       }
   }
EOF

echo ""
echo "7. Test nginx configuration:"
echo "   sudo nginx -t"
echo ""

echo "8. Reload nginx:"
echo "   sudo systemctl reload nginx"
echo ""

echo "9. Verify deployment:"
echo "   curl -I http://178.16.140.185/"
echo "   curl -I http://bpsolutionsdashboard.com/"