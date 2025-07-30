# BP Logistics Dashboard Deployment

This directory contains all deployment scripts and server configurations for the BP Logistics Analytics Dashboard.

## 🚀 Deployment Files

### Primary Deployment Script
- **[deploy-with-sshpass.sh](./deploy-with-sshpass.sh)** - Main deployment script using sshpass for automated deployment to VPS

### Server Files
- **[vps-server.js](./vps-server.js)** - Production Express.js server for VPS deployment
- **[simple-vps-server.js](./simple-vps-server.js)** - Simplified VPS server configuration

### Maintenance & Verification
- **[server-maintenance.sh](./server-maintenance.sh)** - Server maintenance and management scripts
- **[verify-deployment.sh](./verify-deployment.sh)** - Deployment verification and health checks

## 📋 Production Environment

**Current Deployment:**
- **URL**: https://bpsolutionsdashboard.com
- **Server Path**: `/var/www/logisticsdashboard`
- **Process**: `bp-logistics-dashboard` (PM2 managed)
- **Port**: 5001 (Nginx proxy to HTTPS)

## 🛠️ Quick Deployment Commands

### Full Deployment Procedure
```bash
# 1. Build application
npm run build

# 2. Create deployment package
tar -czf bp-dashboard-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C build .

# 3. Deploy frontend
./deployment/deploy-with-sshpass.sh

# 4. Deploy server and restart
source .env && sshpass -p "$VPS_SSH_PASSWORD" scp deployment/vps-server.js $VPS_SSH_USER@$VPS_SERVER_IP:$VPS_SERVER_PATH/
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "cd $VPS_SERVER_PATH && pm2 restart bp-logistics-dashboard"
```

### Server Management
```bash
# Check PM2 status
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 list"

# View logs
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 logs bp-logistics-dashboard --lines 20"

# Test API health
curl -s "https://bpsolutionsdashboard.com/api/excel-files"
```

### Excel Files Management
```bash
# Upload Excel files to VPS
source .env && sshpass -p "$VPS_SSH_PASSWORD" scp "excel-data/excel-files/"*.xlsx $VPS_SSH_USER@$VPS_SERVER_IP:$VPS_SERVER_PATH/excel-data/excel-files/
```

## 🔧 Environment Setup

**Required Environment Variables:**
```bash
VPS_SSH_USER=your_username
VPS_SSH_PASSWORD=your_password
VPS_SERVER_IP=your_server_ip
VPS_SERVER_PATH=/var/www/logisticsdashboard
```

## 📊 Current Status (July 30, 2025)

✅ **Production Environment Health:**
- Site online and fully operational
- PM2 process stable
- Excel Files API serving 6 files correctly
- Express.js 4.18.2 compatibility verified
- All 8 dashboard modules operational

## 🆘 Troubleshooting

If deployment issues occur:
1. Check PM2 status: `pm2 list`
2. Verify Express.js version: `npm list express`
3. Ensure Excel files in correct directory structure
4. Restart PM2 process: `pm2 restart bp-logistics-dashboard`
5. Test API endpoints: `curl https://bpsolutionsdashboard.com/api/excel-files`

## 📖 Additional Documentation

See [../docs/DEPLOYMENT_INSTRUCTIONS.md](../docs/DEPLOYMENT_INSTRUCTIONS.md) and [../docs/DEPLOYMENT_COMMANDS.md](../docs/DEPLOYMENT_COMMANDS.md) for comprehensive deployment guides.