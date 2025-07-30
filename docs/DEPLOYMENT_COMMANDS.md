# BP Logistics Dashboard - Deployment Commands

## Your Server Details
- **Domain**: bpsolutionsdashboard.com
- **VPS IP**: 178.16.140.185
- **Database**: bp_logistics
- **DB User**: bp_logistics_user
- **JWT Secret**: Already configured

## Step 1: Upload Files to Your VPS

### Option A: Using Git (Recommended)
First, push your code to a Git repository, then:

```bash
# SSH into your server
ssh root@178.16.140.185

# Clone your repository
cd /var/www
git clone https://github.com/yourusername/logisticsdashboard.git bp-logistics
```

### Option B: Using SCP from Local Machine
From your local machine (in the project directory):

```bash
# Upload all files except node_modules
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '*.log' \
  /Users/nealasmothers/Downloads/logisticsdashboard/ \
  root@178.16.140.185:/var/www/bp-logistics/

# Upload the deployment scripts
scp deploy-to-vps-enhanced.sh root@178.16.140.185:/root/
scp verify-deployment.sh root@178.16.140.185:/root/
```

## Step 2: Run the Deployment Script

```bash
# SSH into your server
ssh root@178.16.140.185

# Make scripts executable
chmod +x /root/deploy-to-vps-enhanced.sh
chmod +x /root/verify-deployment.sh

# Run the deployment
cd /root
./deploy-to-vps-enhanced.sh
```

### During Script Execution:
1. When asked about domain, press **y** (it's already set to bpsolutionsdashboard.com)
2. When asked about existing database, press **y**
3. Enter your database password when prompted
4. Choose file upload method if needed
5. For SSL setup, press **y** and enter an email for notifications

## Step 3: Create Admin User

After deployment completes:

```bash
cd /var/www/bp-logistics
sudo -u www-data node create-admin.js admin@bpsolutionsdashboard.com YourSecurePassword Admin User
```

## Step 4: Verify Deployment

```bash
# Run verification script
/root/verify-deployment.sh

# Check services manually
sudo -u www-data pm2 status
systemctl status nginx
systemctl status postgresql
```

## Step 5: Update DNS (if not done already)

Add these DNS records at your domain registrar:

```
Type: A
Name: @
Value: 178.16.140.185
TTL: 300

Type: A  
Name: www
Value: 178.16.140.185
TTL: 300
```

## Quick Commands Reference

### View Application Logs
```bash
# PM2 logs
sudo -u www-data pm2 logs bp-logistics-backend

# Follow logs
sudo -u www-data pm2 logs bp-logistics-backend --lines 100 -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
sudo -u www-data pm2 restart bp-logistics-backend

# Restart all services
sudo -u www-data pm2 restart all
systemctl restart nginx
```

### Database Access
```bash
# Connect to database
PGPASSWORD=your-password psql -h localhost -U bp_logistics_user -d bp_logistics

# Quick database check
PGPASSWORD=your-password psql -h localhost -U bp_logistics_user -d bp_logistics -c "\dt"
```

### Update Application
```bash
cd /var/www/bp-logistics

# If using Git
git pull origin main

# Rebuild frontend
npm install
npm run build

# Update backend
cd backend
npm install

# Restart
sudo -u www-data pm2 restart bp-logistics-backend
```

### Backup Database
```bash
# Manual backup
PGPASSWORD=your-password pg_dump -h localhost -U bp_logistics_user bp_logistics > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### If Site Not Loading:
```bash
# Check if services are running
systemctl status nginx
sudo -u www-data pm2 status

# Check if ports are open
netstat -tlnp | grep -E "80|443|5001"

# Test backend directly
curl http://localhost:5001/health
```

### If Database Connection Fails:
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
PGPASSWORD=your-password psql -h localhost -U bp_logistics_user -d bp_logistics -c "SELECT 1;"

# Check PostgreSQL logs
tail -f /var/log/postgresql/*.log
```

### If File Uploads Fail:
```bash
# Check permissions
ls -la /var/www/bp-logistics/backend/uploads/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/bp-logistics/backend/uploads
sudo chmod -R 775 /var/www/bp-logistics/backend/uploads
```

## Access URLs

After successful deployment:
- **Main Site**: https://bpsolutionsdashboard.com
- **API Health Check**: https://bpsolutionsdashboard.com/api/health
- **Direct Backend** (for testing): http://178.16.140.185:5001/health

## Security Reminders

1. **Change default passwords** after first login
2. **Enable firewall** (the script does this automatically)
3. **Set up regular backups** (cron job is created by script)
4. **Monitor logs** regularly for suspicious activity
5. **Keep system updated**: `apt update && apt upgrade`

---

**Note**: Save your database password securely. You'll need it for maintenance and backups.