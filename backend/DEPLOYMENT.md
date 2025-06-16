# Deployment Guide for Hostinger VPS

## Prerequisites on VPS

1. **Install Node.js (v16+)**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PostgreSQL**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

3. **Install PM2 (Process Manager)**
```bash
sudo npm install -g pm2
```

4. **Install Nginx (Reverse Proxy)**
```bash
sudo apt install nginx
```

## Database Setup

1. **Create PostgreSQL Database**
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE bp_logistics;
CREATE USER bp_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bp_logistics TO bp_user;
\q
```

## Backend Deployment

1. **Upload Files to VPS**
```bash
# From your local machine
scp -r backend/ your-user@your-vps-ip:/home/your-user/
```

2. **SSH into VPS and Setup Backend**
```bash
ssh your-user@your-vps-ip
cd /home/your-user/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Edit with your configuration
```

3. **Configure .env File**
```env
NODE_ENV=production
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bp_logistics
DB_USER=bp_user
DB_PASSWORD=your_secure_password

JWT_SECRET=generate-a-long-random-string-here
JWT_EXPIRE=30d

FRONTEND_URL=https://your-domain.com

MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads
```

4. **Start Backend with PM2**
```bash
pm2 start src/server.js --name bp-backend
pm2 save
pm2 startup  # Follow the instructions to auto-start on boot
```

## Nginx Configuration

1. **Create Nginx Config**
```bash
sudo nano /etc/nginx/sites-available/bp-logistics
```

2. **Add Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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
    }

    # Frontend (React)
    location / {
        root /var/www/bp-logistics;
        try_files $uri $uri/ /index.html;
    }
}
```

3. **Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/bp-logistics /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Frontend Deployment

1. **Build Frontend Locally**
```bash
# Update API URL in your frontend code
# In src/config/api.js or similar:
export const API_URL = 'https://your-domain.com/api'

# Build
npm run build
```

2. **Upload Build to VPS**
```bash
scp -r build/* your-user@your-vps-ip:/var/www/bp-logistics/
```

## SSL Certificate (HTTPS)

1. **Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
```

2. **Get SSL Certificate**
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Security Considerations

1. **Firewall Setup**
```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

2. **Create First Admin User**
```bash
# SSH into VPS and run
cd /home/your-user/backend
node scripts/create-admin.js
```

## Monitoring

1. **Check PM2 Status**
```bash
pm2 status
pm2 logs bp-backend
```

2. **Check Nginx Logs**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Backup Strategy

1. **Database Backup Script**
```bash
#!/bin/bash
pg_dump -U bp_user bp_logistics > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Schedule with Cron**
```bash
crontab -e
# Add: 0 2 * * * /home/your-user/backup.sh
```