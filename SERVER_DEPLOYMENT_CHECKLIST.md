# BP Logistics Dashboard - Server Deployment Checklist

## Pre-Deployment Requirements

### VPS Requirements
- [ ] **Operating System**: Ubuntu 20.04 LTS or newer (Debian 10+ also supported)
- [ ] **RAM**: Minimum 2GB (4GB recommended)
- [ ] **Storage**: Minimum 20GB free space
- [ ] **CPU**: 2 cores minimum
- [ ] **Network**: Public IP address or domain name
- [ ] **Access**: Root or sudo access via SSH

### Local Prerequisites
- [ ] Application files ready for deployment
- [ ] Domain name (optional but recommended for SSL)
- [ ] SMTP credentials for email functionality

## Deployment Steps

### 1. Initial Server Setup
```bash
# Connect to your VPS
ssh root@your-server-ip

# Update the system
apt update && apt upgrade -y

# Set timezone (optional)
timedatectl set-timezone UTC
```

### 2. Run Enhanced Deployment Script
```bash
# Download the deployment script
wget https://raw.githubusercontent.com/your-repo/deploy-to-vps-enhanced.sh
# OR copy it manually to the server

# Make it executable
chmod +x deploy-to-vps-enhanced.sh

# Run the script
./deploy-to-vps-enhanced.sh
```

### 3. Post-Deployment Configuration

#### Create Admin User
```bash
cd /var/www/bp-logistics
sudo -u www-data node create-admin.js admin@example.com your-secure-password AdminFirst AdminLast
```

#### Update Email Settings
```bash
# Edit the backend .env file
nano /var/www/bp-logistics/backend/.env

# Update these lines with your SMTP settings:
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM="BP Logistics" <noreply@yourdomain.com>
```

#### Restart the Backend
```bash
sudo -u www-data pm2 restart bp-logistics-backend
```

### 4. Verification Steps

#### Run Health Check
```bash
/usr/local/bin/check-bp-logistics.sh
```

Expected output:
```
✓ PostgreSQL: Running
✓ Nginx: Running
✓ Backend: Running
✓ API: Responding
✓ Disk Space: XX% used
✓ Memory: XX% used
```

#### Test Database Connection
```bash
# Test as postgres user
sudo -u postgres psql -d bp_logistics -c "SELECT current_database();"

# Test as application user
PGPASSWORD=your-db-password psql -h localhost -U bp_logistics_user -d bp_logistics -c "SELECT 1;"
```

#### Check Application Logs
```bash
# PM2 logs
sudo -u www-data pm2 logs bp-logistics-backend

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

#### Test API Endpoints
```bash
# Health check
curl http://localhost:5001/health

# From external machine
curl https://your-domain.com/api/health
```

### 5. Test Core Functionality

#### Via Web Browser
1. Navigate to https://your-domain.com
2. Login with admin credentials
3. Test each Excel upload type:
   - Well Operations
   - Vessels
   - Fluid Analysis
   - Voyage Events
   - Vessel Manifests
   - Cost Allocations
   - Bulk Actions
   - Voyage Lists

#### File Upload Test
```bash
# Check upload directory permissions
ls -la /var/www/bp-logistics/backend/uploads/

# Monitor uploads
watch -n 1 'ls -la /var/www/bp-logistics/backend/uploads/'
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log

# Test connection manually
sudo -u postgres psql

# Check pg_hba.conf
cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#"
```

### Application Not Starting
```bash
# Check PM2 status
sudo -u www-data pm2 status

# Check detailed PM2 logs
sudo -u www-data pm2 logs bp-logistics-backend --lines 100

# Check Node.js errors
cd /var/www/bp-logistics/backend
node src/server.js
```

### Nginx Issues
```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### Permission Issues
```bash
# Fix ownership
chown -R www-data:www-data /var/www/bp-logistics

# Fix upload directory
chmod -R 775 /var/www/bp-logistics/backend/uploads
chmod -R 775 /var/www/bp-logistics/backend/logs
```

## Security Hardening

### 1. Configure Firewall
```bash
# Check current rules
ufw status

# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. Secure SSH
```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
systemctl restart sshd
```

### 3. Set Up Automatic Updates
```bash
# Install unattended-upgrades
apt install unattended-upgrades

# Enable automatic updates
dpkg-reconfigure --priority=low unattended-upgrades
```

### 4. Monitor System
```bash
# Install monitoring tools
apt install htop iotop nethogs

# Set up log rotation
nano /etc/logrotate.d/bp-logistics
```

Add:
```
/var/www/bp-logistics/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        /usr/bin/sudo -u www-data /usr/bin/pm2 reloadLogs
    endscript
}
```

## Backup and Recovery

### Manual Backup
```bash
# Run backup script
/usr/local/bin/backup-bp-logistics.sh

# Check backups
ls -la /var/backups/bp-logistics/
```

### Restore from Backup
```bash
# Database restore
gunzip < /var/backups/bp-logistics/db_backup_TIMESTAMP.sql.gz | PGPASSWORD=your-password psql -h localhost -U bp_logistics_user bp_logistics

# Files restore
tar -xzf /var/backups/bp-logistics/uploads_backup_TIMESTAMP.tar.gz -C /var/www/bp-logistics/backend/
```

## Monitoring and Maintenance

### Daily Tasks
- [ ] Check application health: `/usr/local/bin/check-bp-logistics.sh`
- [ ] Review error logs for issues
- [ ] Monitor disk space usage

### Weekly Tasks
- [ ] Review and analyze application logs
- [ ] Check for security updates
- [ ] Test backup restoration
- [ ] Review resource usage trends

### Monthly Tasks
- [ ] Update application dependencies
- [ ] Review and rotate logs
- [ ] Performance analysis
- [ ] Security audit

## Performance Optimization

### Database Optimization
```bash
# Analyze database
sudo -u postgres psql -d bp_logistics -c "ANALYZE;"

# Check table sizes
sudo -u postgres psql -d bp_logistics -c "
SELECT schemaname,tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Application Optimization
```bash
# Increase PM2 instances for better performance
sudo -u www-data pm2 scale bp-logistics-backend 4

# Monitor memory usage
sudo -u www-data pm2 monit
```

## Support Commands Reference

```bash
# Application Management
sudo -u www-data pm2 status              # Check app status
sudo -u www-data pm2 restart all         # Restart all apps
sudo -u www-data pm2 logs                # View all logs
sudo -u www-data pm2 flush               # Clear logs

# Database Management
sudo -u postgres psql                    # PostgreSQL console
pg_dump -U bp_logistics_user bp_logistics > backup.sql  # Backup
psql -U bp_logistics_user bp_logistics < backup.sql     # Restore

# Service Management
systemctl status nginx|postgresql|pm2-www-data
systemctl restart nginx|postgresql
systemctl enable nginx|postgresql

# Monitoring
htop                                     # System resources
iotop                                    # Disk I/O
nethogs                                  # Network usage
df -h                                    # Disk space
free -h                                  # Memory usage
```

## Emergency Contacts

Document your important information:
- VPS Provider Support: _______________
- Domain Registrar: _______________
- SSL Certificate Provider: Let's Encrypt (automatic)
- Application Developer: _______________

---

**Note**: Keep this checklist updated with any customizations or changes made to your deployment.