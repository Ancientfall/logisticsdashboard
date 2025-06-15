# BP Logistics Analytics Dashboard - Deployment Guide

## Quick Deployment

To deploy the application to the Hostinger VPS, simply run:

```bash
./deploy.sh
```

This script will:
1. Install dependencies
2. Build the production bundle
3. Deploy to the server via rsync
4. Set proper permissions
5. Restart nginx

## Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot:

### 1. Build the Application

```bash
npm install
npm run build
```

### 2. Copy Files to Server

```bash
rsync -avz --delete build/ root@178.16.140.185:/var/www/logistics-dashboard/
```

### 3. Set Permissions on Server

```bash
ssh root@178.16.140.185
chown -R www-data:www-data /var/www/logistics-dashboard
chmod -R 755 /var/www/logistics-dashboard
```

### 4. Restart nginx

```bash
systemctl restart nginx
```

## Server Configuration

The nginx configuration is located at `/etc/nginx/sites-available/logistics-dashboard` on the server.

## Troubleshooting

### Check nginx Error Logs
```bash
ssh root@178.16.140.185 'tail -f /var/log/nginx/error.log'
```

### Check nginx Access Logs
```bash
ssh root@178.16.140.185 'tail -f /var/log/nginx/access.log'
```

### Test nginx Configuration
```bash
ssh root@178.16.140.185 'nginx -t'
```

### Common Issues

1. **404 Errors on Routes**: Make sure the nginx config includes the try_files directive for React Router
2. **Permission Denied**: Ensure www-data owns the files
3. **Build Errors**: Check that all dependencies are installed locally

## Environment Variables

Production environment variables are set in the build process. To update them:

1. Modify `.env.production` locally
2. Rebuild and redeploy using `./deploy.sh`

## SSL/HTTPS

To enable HTTPS with Let's Encrypt:

```bash
ssh root@178.16.140.185
apt-get update
apt-get install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## Monitoring

The application includes error boundaries and logging. Check the browser console for client-side errors.

For server monitoring:
- nginx logs: `/var/log/nginx/`
- System logs: `journalctl -xe`

## Rollback

To rollback to a previous version:
1. Keep previous builds in dated folders
2. Update the nginx root to point to the previous build
3. Restart nginx