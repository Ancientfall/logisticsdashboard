# BP Logistics Dashboard - VPS Deployment Instructions

## Latest Build Ready for Deployment
- **Build Date**: June 19, 2025 - 8:59 PM
- **Version**: Latest with fuel exclusion fix (Commit: 8e4da76)
- **Package**: `bp-dashboard-deployment-20250619_205927.tar.gz` (2.8MB)

## What's New in This Deployment
✅ **Fixed Production Chemical Volume Calculations**
- Excludes diesel, fuel, gas oil, marine gas oil, and MGO from production chemical volume
- Should significantly reduce the inflated 2.8+ million gallon Chemical Volume KPI
- Enhanced debug logging for troubleshooting
- Proper filtering for production-only operations

## Manual Deployment Steps

### Option 1: Direct File Upload (Recommended)

1. **Upload the deployment package to your VPS:**
   ```bash
   scp bp-dashboard-deployment-20250619_205927.tar.gz root@178.16.140.185:/tmp/
   ```

2. **SSH into your VPS:**
   ```bash
   ssh root@178.16.140.185
   ```

3. **Create backup and deploy:**
   ```bash
   # Create backup of current deployment
   sudo cp -r /var/www/html /var/www/html_backup_$(date +%Y%m%d_%H%M%S)
   
   # Extract new deployment
   cd /var/www/html
   sudo rm -rf * .*
   sudo tar -xzf /tmp/bp-dashboard-deployment-20250619_205927.tar.gz -C .
   
   # Set proper permissions
   sudo chown -R www-data:www-data /var/www/html
   sudo chmod -R 755 /var/www/html
   sudo find /var/www/html -type f -exec chmod 644 {} \;
   
   # Restart Nginx
   sudo systemctl reload nginx
   sudo systemctl status nginx
   ```

### Option 2: Using SCP with Build Directory

If you prefer to upload files directly:

```bash
# Upload all build files
scp -r build/* root@178.16.140.185:/var/www/html/

# Then SSH and set permissions
ssh root@178.16.140.185
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo systemctl reload nginx
```

## Post-Deployment Verification

1. **Test the site:**
   - Visit: https://bpsolutionsdashboard.com
   - Or: http://178.16.140.185

2. **Verify the fuel exclusion fix:**
   - Navigate to Production Dashboard
   - Check Chemical Volume KPI - should show much lower values than 2.8M gallons
   - Test filter updates on Hero Cards
   - Check browser console for debug logs

3. **Performance check:**
   - Ensure landing page loads properly
   - Verify "View Analytics" button loads server data
   - Test file upload functionality as fallback

## Rollback Instructions (if needed)

If issues occur, you can quickly rollback:

```bash
ssh root@178.16.140.185
sudo rm -rf /var/www/html
sudo mv /var/www/html_backup_YYYYMMDD_HHMMSS /var/www/html
sudo systemctl reload nginx
```

## Expected Results After Deployment

- ✅ Chemical Volume KPI shows realistic values (not 2.8M+ gallons)
- ✅ Hero Cards update properly when filters change
- ✅ Production Dashboard excludes fuel from chemical calculations
- ✅ Debug logging available in browser console for troubleshooting
- ✅ All existing functionality preserved

## Troubleshooting

If you encounter issues:

1. **Check Nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify file permissions:**
   ```bash
   ls -la /var/www/html
   ```

3. **Test direct IP access:**
   ```bash
   curl -I http://178.16.140.185
   ```

4. **Browser console for app errors:**
   - Open Developer Tools > Console
   - Look for "🧪 PRODUCTION CHEMICAL VOLUME DEBUG" logs

## Need Help?

If you need assistance with the deployment, please provide:
- SSH access details or
- Any error messages encountered during deployment
- Browser console logs if the site loads but has issues

The deployment package is ready and includes all the latest fixes for accurate production chemical volume calculations.