# BP Logistics Dashboard - Deployment Scripts Guide

## Essential Scripts

### 1. **deploy-to-vps.sh**
Complete automated deployment script for fresh VPS setup.
- Installs all dependencies (Node.js, PostgreSQL, Nginx)
- Sets up database and creates tables
- Configures PM2 process management
- Sets up Nginx reverse proxy
- Optional SSL configuration

**Usage:**
```bash
sudo ./deploy-to-vps.sh
```

### 2. **prepare-deployment.sh**
Creates a deployment package for uploading to VPS.
- Copies necessary files
- Excludes node_modules and logs
- Creates compressed archive

**Usage:**
```bash
./prepare-deployment.sh
# Then: scp bp-logistics-deploy.tar.gz root@your-vps-ip:/root/
```

### 3. **vps-pull-update.sh**
Updates existing deployment from Git repository.
- Creates backup before updating
- Pulls latest changes from Git
- Updates dependencies
- Rebuilds frontend
- Updates database schema
- Restarts application

**Usage on VPS:**
```bash
cd /var/www/bp-logistics
./vps-pull-update.sh
```

### 4. **database-utils.sh**
Database management utilities.
- Backup database
- Restore from backup
- Export data to CSV
- Set up automatic backups
- List available backups

**Usage:**
```bash
./database-utils.sh backup
./database-utils.sh restore backup.sql.gz
./database-utils.sh list
./database-utils.sh export
./database-utils.sh auto
```

### 5. **server-maintenance.sh**
Interactive server monitoring and maintenance menu.
- Check system status
- View logs
- Restart services
- Update application
- Clean old logs
- Security checks
- Database information

**Usage:**
```bash
./server-maintenance.sh
```

### 6. **pre-deployment-checklist.sh**
Verifies everything is ready before deployment.
- Checks directory structure
- Verifies deployment scripts exist
- Tests SSH connection to VPS
- Checks local dependencies

**Usage:**
```bash
./pre-deployment-checklist.sh
```

### 7. **update-vps-directly.sh**
Creates update package without using Git.
- Useful when Git isn't available
- Creates minimal update package
- Preserves .env and data

**Usage:**
```bash
./update-vps-directly.sh
# Then: scp vps-update.tar.gz root@your-vps-ip:/tmp/
```

## Quick Reference

### First-time deployment:
```bash
./prepare-deployment.sh
scp bp-logistics-deploy.tar.gz root@your-vps-ip:/root/
ssh root@your-vps-ip
tar -xzf bp-logistics-deploy.tar.gz
cd bp-logistics-deploy
./deploy-to-vps.sh
```

### Update from Git:
```bash
ssh root@your-vps-ip
cd /var/www/bp-logistics
./vps-pull-update.sh
```

### Database backup:
```bash
ssh root@your-vps-ip
cd /var/www/bp-logistics
./database-utils.sh backup
```

### Server monitoring:
```bash
ssh root@your-vps-ip
cd /var/www/bp-logistics
./server-maintenance.sh
```