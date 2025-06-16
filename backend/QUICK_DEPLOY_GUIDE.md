# Quick Deployment Guide

## First Time Setup on VPS

1. **Copy setup script to your VPS:**
```bash
scp setup-vps.sh root@178.16.140.185:/root/
```

2. **SSH into your VPS and run setup:**
```bash
ssh root@178.16.140.185
chmod +x setup-vps.sh
./setup-vps.sh
```

3. **Save the database password that's generated!**

## Deploy Backend

1. **Update the database password in `.env.production`:**
   - Edit the `DB_PASSWORD` field with the password from setup

2. **Run deployment from your local machine:**
```bash
cd backend
./deploy.sh root
```

## Verify Deployment

1. **Check if backend is running:**
```bash
curl http://178.16.140.185/health
```

2. **Check PM2 status on VPS:**
```bash
ssh root@178.16.140.185
pm2 status
pm2 logs bp-logistics-backend
```

## Frontend Deployment

1. **Update API URL in your React app:**
```javascript
// In src/services/api.ts or similar
const API_BASE_URL = 'http://178.16.140.185/api'
```

2. **Build and deploy frontend:**
```bash
cd .. # Go to main project directory
npm run build
scp -r build/* root@178.16.140.185:/var/www/bp-logistics-frontend/
```

## Important Notes

- The backend API is accessible at: `http://178.16.140.185/api`
- The frontend will be at: `http://178.16.140.185/`
- Database credentials are in `.env` file on the VPS
- PM2 will auto-restart the backend if it crashes
- Logs are in `/var/www/bp-logistics-backend/logs/`

## Security Checklist

- [ ] Change the database password to something secure
- [ ] Update JWT_SECRET in production
- [ ] Consider setting up SSL certificate
- [ ] Review firewall rules
- [ ] Set up regular backups