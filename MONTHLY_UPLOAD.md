# Monthly Data Upload - Data Appending System

## Overview

The Monthly Data Upload feature allows you to easily append new monthly data from Kabal exports to the existing Excel files that feed the dashboard. This accumulates data over time rather than replacing it.

## How to Use

1. **Access the Upload Page**
   - Go to `/monthly-upload` in your dashboard
   - Or click "Monthly Upload" in the navigation

2. **Upload Your Files**
   - Drag and drop your Kabal Excel exports
   - Or click "Choose Files" to select them
   - The system automatically identifies which server file to replace

3. **Data Appending Happens Automatically**
   - New data is appended to existing files in `excel-data/excel-files/` directory
   - Existing files are backed up before modification
   - Duplicate detection prevents the same data from being added twice
   - Upload progress is shown in real-time

4. **Dashboard Updates**
   - Refresh your dashboard page
   - All existing processors (LC integration, vessel classification, etc.) automatically work with the combined data
   - Historical data is preserved and new data is added

## Supported Files

The system recognizes these Kabal export patterns:

| File Pattern | Target File | Description |
|-------------|-------------|-------------|
| `voyage*event*` | `Voyage Events.xlsx` | Event-level vessel activity data |
| `manifest` or `cargo` | `Vessel Manifests.xlsx` | Cargo manifest and tonnage data |
| `bulk*action` or `bulk*transfer` | `Bulk Actions.xlsx` | Bulk fluid transfer operations |
| `cost*allocation` | `Cost Allocation.xlsx` | Cost allocation and LC mapping |
| `voyage*list` | `Voyage List.xlsx` | Voyage summaries and routes |

## Key Features

- **Data Appending**: New data is added to existing files, preserving historical records
- **Duplicate Prevention**: Intelligent duplicate detection prevents adding the same data twice
- **Automatic Backup**: Existing files are backed up before modification
- **Upload Logging**: All uploads are logged with timestamps and append statistics
- **Progress Tracking**: Real-time upload progress for each file
- **Error Handling**: Clear error messages if uploads fail
- **File Validation**: Only Excel files are accepted

## Server Setup

The upload functionality is built into the existing Excel server (`simple-excel-server.js`):

```bash
# Start the server (includes upload capability)
npm run excel-server

# Or start both React and Excel server
npm run dev
```

**API Endpoints:**
- `POST /api/upload-monthly-data` - Upload files
- `GET /api/upload-logs` - View upload history
- `GET /api/excel-files-status` - Check current files

## File Structure

```
excel-data/
├── excel-files/           # Main files used by dashboard
│   ├── Voyage Events.xlsx
│   ├── Vessel Manifests.xlsx
│   ├── Bulk Actions.xlsx
│   ├── Cost Allocation.xlsx
│   └── Voyage List.xlsx
├── backups/              # Automatic backups
│   ├── Voyage Events.xlsx.2024-01-15T10-30-00.backup
│   └── ...
└── upload-log.json       # Upload activity log
```

## Workflow

1. **Monthly Process**: Export data from Kabal
2. **Upload**: Use monthly upload page to append new data
3. **Automatic Merging**: New data is added to existing files with duplicate prevention
4. **Processing**: Dashboard uses all existing processors on the combined data
5. **View Results**: Refresh dashboard to see updated data with historical context

## Benefits

- **Cumulative**: Builds up historical data over time
- **Safe**: Automatic backups prevent data loss
- **Intelligent**: Duplicate detection prevents data corruption
- **Integrated**: Works with all existing dashboard features
- **Tracked**: Full audit trail of uploads with append statistics
- **Fast**: No need to process or validate data during upload

## Troubleshooting

- **Upload Fails**: Check file format (must be .xlsx or .xls)
- **Wrong Target**: Ensure filename matches expected patterns
- **Server Issues**: Restart Excel server if uploads fail
- **Large Files**: 50MB limit per file

The key advantage is cumulative data building - you just append new monthly data to existing files, building up historical trends while preventing duplicates, and let the existing dashboard processors handle everything else automatically.