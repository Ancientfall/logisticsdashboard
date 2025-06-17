# Rsync Commands for BP Logistics Dashboard

## Quick Rsync (One Command)

```bash
# From your local machine (in project directory):
rsync -avz --progress --exclude 'node_modules' --exclude '.git' --exclude '.env' --exclude 'build' --exclude '*.log' --exclude 'uploads/*' --delete /Users/nealasmothers/Downloads/logisticsdashboard/ root@178.16.140.185:/var/www/bp-logistics/
```

## Rsync Script

Run the automated script:
```bash
./rsync-to-server.sh
```

## Manual Steps After Rsync

After syncing files, SSH into the server and run:

```bash
# Connect to server
ssh root@178.16.140.185

# Go to application directory
cd /var/www/bp-logistics

# Install/update backend dependencies
cd backend
npm install --production

# Go back and install/update frontend dependencies
cd ..
npm install

# Build the frontend
npm run build

# Fix permissions
chown -R www-data:www-data /var/www/bp-logistics
chmod -R 775 backend/uploads backend/logs

# Restart the backend
sudo -u www-data pm2 restart bp-logistics-backend

# Check status
sudo -u www-data pm2 status
```

## Exclude Patterns Explained

- `node_modules` - Dependencies (will be installed on server)
- `.git` - Git repository data
- `.env` - Local environment files
- `build` - Built frontend (will be rebuilt on server)
- `*.log` - Log files
- `uploads/*` - Uploaded files (preserve server uploads)

## Alternative: Specific Files Only

If you only want to sync specific changed files:

```bash
# Sync only backend changes
rsync -avz --progress backend/src/ root@178.16.140.185:/var/www/bp-logistics/backend/src/

# Sync only frontend source
rsync -avz --progress src/ root@178.16.140.185:/var/www/bp-logistics/src/

# Sync only models
rsync -avz --progress backend/src/models/ root@178.16.140.185:/var/www/bp-logistics/backend/src/models/

# Sync only deployment scripts
rsync -avz deploy-to-vps-enhanced.sh verify-deployment.sh root@178.16.140.185:/root/
```

## Dry Run (Test First)

To see what would be synced without actually doing it:

```bash
rsync -avzn --progress --exclude 'node_modules' --exclude '.git' --exclude '.env' --exclude 'build' --exclude '*.log' --delete /Users/nealasmothers/Downloads/logisticsdashboard/ root@178.16.140.185:/var/www/bp-logistics/
```

Note the `-n` flag for dry-run mode.

## Troubleshooting

### If Permission Denied
```bash
# On server, ensure directory exists and has correct ownership
ssh root@178.16.140.185
mkdir -p /var/www/bp-logistics
chown -R www-data:www-data /var/www/bp-logistics
```

### If Backend Won't Start
```bash
# Check logs
sudo -u www-data pm2 logs bp-logistics-backend --lines 100

# Check environment file
cat /var/www/bp-logistics/backend/.env

# Test database connection
cd /var/www/bp-logistics/backend
node -e "require('./src/config/database').sequelize.authenticate().then(() => console.log('DB Connected')).catch(err => console.error('DB Error:', err.message))"
```

### Quick Restart Everything
```bash
# On server
cd /var/www/bp-logistics
sudo -u www-data pm2 restart all
systemctl restart nginx
```