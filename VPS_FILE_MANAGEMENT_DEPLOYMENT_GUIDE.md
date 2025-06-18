# VPS File Management Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the enhanced BP Logistics Dashboard with server-based Excel file management to your Hostinger VPS server.

## What's New
The system now includes:
- **Server-side Excel file storage** and management
- **Admin interface** for file upload and management  
- **Auto-detection and loading** of server files
- **Enhanced file upload component** with server integration
- **File management API endpoints**

## Pre-Deployment Requirements

### Local Files Required
- All 5 Excel files located at: `/Users/nealasmothers/Library/CloudStorage/OneDrive-BP/PowerBI/PowerBI Data/Drill_Prod Dashboard`
  - `Bulk Actions.xlsx`
  - `Cost Allocation.xlsx`
  - `Vessel Manifests.xlsx`
  - `Voyage Events.xlsx`
  - `Voyage List.xlsx`

### VPS Server Details
- **Server IP**: 178.16.140.185
- **User**: root
- **Domain**: bpsolutionsdashboard.com
- **Backend Port**: 5001

## Deployment Steps

### Step 1: Deploy File Management System Updates
```bash
cd /Users/nealasmothers/Downloads/logisticsdashboard
./deploy-file-management-update.sh
```

This script will:
- Upload new backend routes and components
- Update frontend components with server file support
- Create necessary directories on VPS
- Rebuild and restart the application

### Step 2: Deploy Excel Files to Server
```bash
./deploy-excel-files.sh
```

This script will:
- Copy all 5 required Excel files from your OneDrive to the VPS
- Set proper permissions
- Create metadata files
- Verify file accessibility

### Step 3: Verify Deployment
After deployment, verify the system is working:

#### Check API Endpoints
```bash
# SSH into the VPS
ssh root@178.16.140.185

# Test Excel files API
curl http://localhost:5001/api/excel-files

# Check health endpoint
curl http://localhost:5001/health
```

#### Check Application Status
```bash
# View application logs
sudo -u www-data pm2 logs bp-logistics-backend

# Check file verification
/usr/local/bin/verify-excel-files.sh

# Check system health
/usr/local/bin/check-bp-logistics.sh
```

## New Features

### 1. Auto-Loading Server Files
- Users will see a "🚀 Load Latest Data from Server" button when server files are available
- The system automatically detects and loads all 5 Excel files from the server
- No need for users to have local Excel files

### 2. Admin File Management
- Access via Admin Dashboard → Excel Files tab
- Upload new Excel files directly through the web interface
- View, download, and delete server files
- Real-time file metadata and statistics

### 3. Enhanced File Upload Page
- Smart detection of server files
- Automatic background loading when files are available
- Fallback to local file upload if server files unavailable
- Real-time progress indicators

## API Endpoints

### Excel File Management
- `GET /api/excel-files` - List available server files
- `GET /api/excel-files/{filename}` - Download specific file
- `POST /api/excel-files/upload` - Upload file (admin only)
- `DELETE /api/excel-files/{filename}` - Delete file (admin only)
- `GET /api/excel-files/metadata/info` - Get detailed metadata

### Authentication Required
All admin file management operations require valid JWT token in Authorization header.

## File Structure on VPS
```
/var/www/bp-logistics/
├── excel-data/
│   ├── excel-files/          # Main Excel data files
│   │   ├── Bulk Actions.xlsx
│   │   ├── Cost Allocation.xlsx
│   │   ├── Vessel Manifests.xlsx
│   │   ├── Voyage Events.xlsx
│   │   └── Voyage List.xlsx
│   ├── reference-data/       # Reference data files
│   └── metadata/            # File metadata and tracking
│       └── files-metadata.json
├── backend/
│   └── src/
│       └── routes/
│           └── excel-files.js  # New API routes
└── src/
    └── components/
        ├── EnhancedFileUploadWithServer.tsx
        └── admin/
            └── ExcelFileManager.tsx
```

## User Experience Flow

### For Regular Users
1. Navigate to Upload page (`/upload`)
2. System automatically checks for server files
3. If available, shows "Load Latest Data from Server" button
4. One-click loading of all data
5. Automatic processing and dashboard navigation

### For Administrators
1. Navigate to Admin Dashboard (`/admin`)
2. Click "Excel Files" tab
3. View current server files and metadata
4. Upload new files via drag-and-drop interface
5. Manage existing files (download/delete)

## Troubleshooting

### Common Issues

#### Server Files Not Detected
```bash
# Check if files exist
ssh root@178.16.140.185 "ls -la /var/www/bp-logistics/excel-data/excel-files/"

# Check API endpoint
curl https://bpsolutionsdashboard.com/api/excel-files
```

#### Upload Failures
```bash
# Check permissions
ssh root@178.16.140.185 "ls -la /var/www/bp-logistics/excel-data/"

# Check disk space
ssh root@178.16.140.185 "df -h"

# View upload logs
ssh root@178.16.140.185 "sudo -u www-data pm2 logs bp-logistics-backend"
```

#### Auto-Loading Not Working
- Verify all 5 required files are present on server
- Check browser network tab for API call failures
- Ensure user has proper authentication

### Useful Commands

#### VPS Server Management
```bash
# Restart backend service
sudo -u www-data pm2 restart bp-logistics-backend

# View application logs
sudo -u www-data pm2 logs bp-logistics-backend

# Check system health
/usr/local/bin/check-bp-logistics.sh

# Verify Excel files
/usr/local/bin/verify-excel-files.sh
```

#### File Management
```bash
# Update Excel files
./deploy-excel-files.sh

# Check file sizes
ssh root@178.16.140.185 "du -h /var/www/bp-logistics/excel-data/excel-files/*"

# Manual permission fix
ssh root@178.16.140.185 "chown -R www-data:www-data /var/www/bp-logistics/excel-data && chmod -R 775 /var/www/bp-logistics/excel-data"
```

## Benefits

### For Users
- **No Local Files Needed**: Users don't need Excel files on their computers
- **Instant Access**: One-click data loading
- **Always Current**: Everyone sees the same latest dataset
- **Reliability**: Robust fallback to local uploads if needed

### For Administrators
- **Centralized Control**: Manage all data files from one interface
- **Easy Updates**: Upload new data files through web interface
- **Version Control**: Track file versions and upload history
- **Monitoring**: Real-time file status and metadata

### For Operations
- **Consistency**: All users work with the same data
- **Efficiency**: Eliminate file distribution challenges
- **Scalability**: Easy to add new file types or users
- **Backup**: Centralized backup and recovery

## Next Steps

1. **Monitor Usage**: Check logs and user feedback for first few days
2. **File Updates**: Establish process for regular data file updates
3. **Backup Strategy**: Implement automated backup of Excel files
4. **User Training**: Document new features for end users

## Support

For technical issues:
1. Check application logs: `sudo -u www-data pm2 logs bp-logistics-backend`
2. Verify system health: `/usr/local/bin/check-bp-logistics.sh`
3. Review this guide's troubleshooting section
4. Contact system administrator with specific error messages

---

**Deployment Complete**: Your BP Logistics Dashboard now features advanced server-based file management with automatic data loading and comprehensive admin controls.