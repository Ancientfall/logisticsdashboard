# VoyageEvent Department Migration Scripts

This directory contains scripts to fix the root cause of dashboard data population issues by backfilling missing department values and other enhanced fields for existing VoyageEvent records.

## Background

The issue stems from 198,975 out of 198,977 VoyageEvent records having NULL department values because they were uploaded before the enhanced processing logic was implemented. The dashboards filter by department field ('Drilling', 'Production', etc.) but these records are missing this critical field.

## Scripts Overview

### 1. check-migration-status.js
**Purpose**: Analyzes the current state of the database and provides detailed statistics about records that need migration.

**Usage**:
```bash
node scripts/check-migration-status.js
```

**What it does**:
- Counts total VoyageEvent records
- Identifies records with NULL department values
- Shows current department distribution
- Analyzes Cost Allocation data availability
- Provides sample records for review
- Assesses migration readiness

### 2. test-migration-logic.js
**Purpose**: Tests the migration logic on sample data to ensure it works correctly before running the full migration.

**Usage**:
```bash
node scripts/test-migration-logic.js
```

**What it does**:
- Tests department inference logic with predefined test cases
- Tests LC allocation processing with sample data
- Validates logic against actual database records
- Provides confidence that the migration will work correctly

### 3. migrate-voyage-event-departments.js
**Purpose**: The main migration script that backfills missing department values and other enhanced fields.

**Usage**:
```bash
node scripts/migrate-voyage-event-departments.js
```

**What it does**:
- Creates a backup of all VoyageEvent data before making changes
- Loads Cost Allocation data to create department lookup map
- Processes records in batches to avoid memory issues
- Applies enhanced department inference logic from uploadController.js
- Backfills missing fields:
  - `department` (using Cost Allocation lookup and location-based inference)
  - `finalHours` (calculated from hours field)
  - `lcNumber` and `lcPercentage` (from Cost Dedicated to field parsing)
  - `mappedLocation` (enhanced location mapping)
  - `mappingStatus` and `dataIntegrity` (processing metadata)
- Provides comprehensive progress logging and error handling
- Includes interactive confirmation before making changes

## Migration Process

### Recommended Workflow

1. **Check Current Status**:
   ```bash
   node scripts/check-migration-status.js
   ```
   Review the output to understand the scope of the migration.

2. **Test Migration Logic**:
   ```bash
   node scripts/test-migration-logic.js
   ```
   Ensure all tests pass before proceeding.

3. **Run Migration**:
   ```bash
   node scripts/migrate-voyage-event-departments.js
   ```
   Follow the interactive prompts and monitor progress.

4. **Verify Results**:
   ```bash
   node scripts/check-migration-status.js
   ```
   Confirm that the migration was successful.

### Safety Features

- **Automatic Backup**: Full backup of VoyageEvent data before migration
- **Batch Processing**: Processes records in batches of 1,000 to avoid memory issues
- **Interactive Confirmation**: Requires user confirmation before making changes
- **Comprehensive Logging**: Detailed logs saved to `scripts/migration.log`
- **Error Handling**: Graceful error handling with fallback values
- **Progress Tracking**: Real-time progress updates during migration
- **Transaction Safety**: Updates are wrapped in database transactions

### Enhanced Logic

The migration uses the same sophisticated logic from `uploadController.js` (lines 135-341):

1. **Cost Allocation Lookup**: Maps LC numbers to departments using existing Cost Allocation data
2. **Location-Based Inference**: Applies business rules for department assignment:
   - Thunder Horse and Mad Dog: Special handling for drilling vs production
   - Rig locations: Typically drilling operations
   - Base locations: Logistics operations
   - Activity-based classification: Based on event and parent event names
3. **LC Number Parsing**: Handles multiple LC formats (comma, slash, semicolon separated)
4. **Percentage Allocation**: Distributes hours across multiple LC numbers
5. **Enhanced Mapping**: Improves location mapping using Cost Allocation rig references

### Output Files

- **Backup**: `scripts/backups/voyage_events_backup_YYYY-MM-DD.json`
- **Logs**: `scripts/migration.log`

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Ensure PostgreSQL is running
   - Check database credentials in `src/config/database.js`

2. **Out of Memory**:
   - Reduce `BATCH_SIZE` in the migration script
   - Ensure sufficient system memory

3. **Migration Fails**:
   - Check `scripts/migration.log` for detailed error information
   - Restore from backup if needed
   - Contact support with log file

### Recovery

If migration fails, you can restore from the backup:

1. Stop the application
2. Use the backup file created in `scripts/backups/`
3. Restore data using standard PostgreSQL tools
4. Restart the application

## Technical Details

### Database Schema Changes
The migration populates these existing fields in the VoyageEvent model:
- `department` (STRING)
- `finalHours` (FLOAT)
- `eventDate` (DATE)
- `lcNumber` (STRING)
- `lcPercentage` (FLOAT)
- `mappedLocation` (STRING)
- `mappingStatus` (STRING)
- `dataIntegrity` (STRING)
- `metadata` (JSONB)

### Performance Considerations
- Batch size: 1,000 records per batch
- Brief pauses between batches to prevent database overload
- Memory-efficient processing
- Transaction-based updates for data consistency

### Dependencies
- Sequelize ORM
- PostgreSQL database
- Node.js 16+
- Existing Cost Allocation data for enhanced mapping

## Post-Migration

After successful migration:
1. Dashboards should show proper data distribution across departments
2. Drilling/Production filters should work correctly
3. Data integrity reports should show improved quality
4. Performance should be maintained or improved due to better indexing

## Support

For issues or questions:
1. Check the log file: `scripts/migration.log`
2. Review the backup files in `scripts/backups/`
3. Run the status check script to verify current state
4. Contact the development team with specific error messages