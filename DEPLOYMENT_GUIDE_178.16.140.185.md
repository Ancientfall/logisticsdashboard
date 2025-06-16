# BP Logistics Dashboard - Deployment Guide for 178.16.140.185

## Quick Start Deployment

### Step 1: Prepare the deployment package on your local machine

```bash
cd /Users/nealasmothers/Downloads/logisticsdashboard
./prepare-deployment.sh
```

### Step 2: Upload to your VPS (178.16.140.185)

```bash
# Upload the deployment package
scp bp-logistics-deploy.tar.gz root@178.16.140.185:/root/

# Also upload the database utility and maintenance scripts
scp database-utils.sh root@178.16.140.185:/root/
scp server-maintenance.sh root@178.16.140.185:/root/
```

### Step 3: Connect to your VPS and deploy

```bash
# SSH into your server
ssh root@178.16.140.185

# Extract the deployment package
cd /root
tar -xzf bp-logistics-deploy.tar.gz

# Run the deployment script
cd bp-logistics-deploy
chmod +x deploy-to-vps.sh
sudo ./deploy-to-vps.sh
```

During deployment, you'll be asked for:
- Your domain name or IP: Enter `178.16.140.185` (or your domain if you have one)
- Deployment method: Choose option 2 (files are already uploaded)
- SSL setup: Choose 'n' for now (unless you have a domain name)

### Step 4: Create your first admin user

```bash
cd /var/www/bp-logistics
node create-admin.js admin@bp.com YourSecurePassword123! Admin User
```

### Step 5: Move utility scripts to application directory

```bash
mv /root/database-utils.sh /var/www/bp-logistics/
mv /root/server-maintenance.sh /var/www/bp-logistics/
chmod +x /var/www/bp-logistics/*.sh
chown www-data:www-data /var/www/bp-logistics/*.sh
```

## Access Your Application

After deployment:
- **Application URL**: http://178.16.140.185
- **Backend API**: http://178.16.140.185/api

## Important Security Steps

### 1. Update the frontend API URL (if needed)

If the frontend isn't connecting to the backend, update the production environment file:

```bash
cd /var/www/bp-logistics
echo "REACT_APP_API_URL=http://178.16.140.185/api" > .env.production
npm run build
```

### 2. Configure Email (for password resets)

Edit the backend .env file:
```bash
nano /var/www/bp-logistics/backend/.env
```

Update the SMTP settings:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM="BP Logistics" <noreply@bp-logistics.com>
```

### 3. Set up automatic backups

```bash
cd /var/www/bp-logistics
./database-utils.sh auto
```

## Monitoring and Maintenance

### Check application status
```bash
cd /var/www/bp-logistics
./server-maintenance.sh
# Then choose option 1
```

### View logs
```bash
pm2 logs bp-logistics-backend
```

### Restart application
```bash
pm2 restart bp-logistics-backend
```

### Backup database manually
```bash
cd /var/www/bp-logistics
./database-utils.sh backup
```

## Troubleshooting

### If the application won't start:

1. Check PM2 status:
```bash
pm2 status
pm2 logs bp-logistics-backend --err
```

2. Check database connection:
```bash
sudo -u postgres psql -c "\l"
```

3. Check Nginx configuration:
```bash
nginx -t
systemctl status nginx
```

### If you can't access the application:

1. Check firewall:
```bash
ufw status
```

2. Ensure services are running:
```bash
systemctl status nginx
systemctl status postgresql
pm2 status
```

3. Check Nginx error logs:
```bash
tail -f /var/log/nginx/error.log
```

## Default Credentials Saved

- **Database Name**: bp_logistics
- **Database User**: bp_logistics_user
- **Database Password**: bp_logistics_2024!
- **Backend Port**: 5001
- **JWT Secret**: (generated during deployment)

## Next Steps

1. **Add more users**: 
   - Login as admin
   - Go to Admin Dashboard
   - Create users with appropriate roles (viewer, manager, admin)

2. **Upload your data**:
   - Login with manager or admin account
   - Navigate to Upload Data
   - Upload your Excel files

3. **Configure domain** (optional):
   - Point your domain to 178.16.140.185
   - Update Nginx configuration
   - Set up SSL with Let's Encrypt

## Useful Commands Summary

```bash
# Application management
pm2 status                          # Check app status
pm2 restart bp-logistics-backend    # Restart app
pm2 logs bp-logistics-backend       # View logs

# Database
./database-utils.sh backup          # Backup database
./database-utils.sh list           # List backups
./database-utils.sh restore <file>  # Restore from backup

# Maintenance
./server-maintenance.sh            # Interactive maintenance menu

# Services
systemctl restart nginx            # Restart Nginx
systemctl restart postgresql       # Restart PostgreSQL
```

## Support Contacts

Server IP: 178.16.140.185
Application: BP Logistics Dashboard
Environment: Production
Max Users: 20-30

---
Generated: ${new Date().toISOString()}