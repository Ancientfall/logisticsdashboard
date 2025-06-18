# Vessel Classifications Update Guide

## Overview
This guide explains how to update vessel classification data using Excel files instead of the PostgreSQL database.

## Method 1: Direct Excel Processing Script (Recommended)

### Step 1: Prepare Your Excel File
Your Excel file should have these columns (column names can vary):

| Required Columns | Alternative Names | Example Value |
|------------------|-------------------|---------------|
| Vessel Name | VesselName, Name | "HOS Commander" |
| Company | Owner, Operator | "Hornbeck Offshore" |
| Size | Length, LOA | 320 |
| Type | Vessel Type, VesselType | "OSV" |

| Optional Columns | Alternative Names | Example Value |
|------------------|-------------------|---------------|
| Year Built | YearBuilt, Built | 2015 |
| Flag | Registry | "USA" |
| Status | | "Active" |
| Deck Space | DeckSpace | 1200 |
| Fuel Capacity | FuelCapacity | 500 |
| Water Capacity | WaterCapacity | 300 |
| Mud Capacity | MudCapacity | 200 |
| Beam | Width | 18.5 |
| Draft | | 5.2 |
| Bollard Pull | BollardPull | 150 |
| Operational Area | OperationalArea, Region | "Gulf of Mexico, West Africa" |

### Step 2: Run the Update Script

```bash
# Navigate to project root
cd /Users/nealasmothers/Downloads/logisticsdashboard

# Run the update script with your Excel file
node scripts/updateVesselClassifications.js path/to/your/vessel-data.xlsx

# Example:
node scripts/updateVesselClassifications.js ~/Downloads/vessel-classifications.xlsx
```

### Step 3: Review and Commit Changes

The script will:
1. 📄 Backup the existing `vesselClassification.ts` file
2. 📊 Process your Excel data
3. ✅ Generate a new TypeScript file
4. 📈 Show a summary of processed vessels

Then commit the changes:
```bash
git add src/data/vesselClassification.ts
git commit -m "Update vessel classifications from Excel data"
```

## Method 2: Manual Excel Template (Alternative)

If you prefer to work with a standardized template:

### Step 1: Generate Template
```bash
node scripts/createVesselTemplate.js
```

This creates `vessel-template.xlsx` with:
- Pre-formatted columns
- Example data
- Data validation rules

### Step 2: Fill Template
- Open `vessel-template.xlsx`
- Replace example data with your actual vessels
- Save the file

### Step 3: Process Template
```bash
node scripts/updateVesselClassifications.js vessel-template.xlsx
```

## Method 3: Admin Panel (If Database Available)

If you restore PostgreSQL in the future, the admin panel at `/admin` provides:
- ✅ Web interface for vessel management
- ✅ Bulk import/export
- ✅ Real-time validation
- ✅ Search and filtering

## Data Validation

The script automatically:
- ✅ Maps vessel types (OSV, FSV, AHTS, PSV, MSV, Support, Specialty)
- ✅ Categorizes vessels (Supply, Support, Specialized, Multi-Purpose)
- ✅ Validates status values (Active, Standby, Maintenance, Retired)
- ✅ Handles missing data gracefully
- ✅ Provides detailed error reporting

## Supported Vessel Types

| Type | Description | Auto-detected Keywords |
|------|-------------|----------------------|
| OSV | Offshore Supply Vessel | "osv", "offshore supply" |
| FSV | Fast Supply Vessel | "fsv", "fast supply" |
| AHTS | Anchor Handling Tug Supply | "ahts", "anchor handling" |
| PSV | Platform Supply Vessel | "psv", "platform supply" |
| MSV | Multi-Service Vessel | "msv", "multi", "service" |
| Support | Support Vessel | "support" |
| Specialty | Specialty Vessel | "specialty", "special" |

## Example Excel Structure

```
| Vessel Name    | Company           | Size | Type | Year Built | Status |
|----------------|-------------------|------|------|------------|--------|
| HOS Commander  | Hornbeck Offshore | 320  | OSV  | 2015       | Active |
| Fast Tiger     | Edison Chouest    | 196  | FSV  | 2012       | Active |
| Harvey Power   | Harvey Gulf       | 310  | OSV  | 2018       | Active |
```

## Troubleshooting

### Common Issues:

1. **"File not found"**
   - Check file path is correct
   - Use absolute paths or ensure you're in the right directory

2. **"No vessels processed"**
   - Check column names match expected format
   - Ensure data is in the first worksheet

3. **"Invalid vessel type"**
   - Check Type column values
   - Script will default to "OSV" if unrecognized

4. **TypeScript compilation errors**
   - Review generated file for syntax issues
   - Restore from backup if needed

### Getting Help:

Check the script output for detailed error messages:
```bash
node scripts/updateVesselClassifications.js your-file.xlsx 2>&1 | tee update.log
```

## Advantages of This Approach

✅ **No Database Required** - Works with static TypeScript files
✅ **Version Controlled** - All changes tracked in Git
✅ **Type Safe** - Full TypeScript validation
✅ **Fast Performance** - No database queries needed
✅ **Simple Deployment** - Static files deploy easily
✅ **Backup Safe** - Automatic backups before updates

This approach is perfect for your current setup without PostgreSQL while maintaining all the benefits of structured vessel data management.