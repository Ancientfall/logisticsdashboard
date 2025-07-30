# Database Maintenance Scripts

This directory contains scripts for database maintenance and data cleanup operations.

## Available Scripts

### cleanVoyageEventDuplicates.js

Cleans duplicate VoyageEvent records and re-adds unique constraint.

**Purpose**: 
- Removes duplicate voyage events based on key identifying fields
- Re-adds unique constraint to prevent future duplicates
- Maintains data integrity while preserving the most recent/complete records

**Usage**:
```bash
# Preview changes without making modifications
node src/scripts/cleanVoyageEventDuplicates.js --dry-run

# Execute the cleanup (removes duplicates and adds constraint)
node src/scripts/cleanVoyageEventDuplicates.js
```

**Duplicate Detection Criteria**:
Records are considered duplicates if they match on:
- vessel
- voyageNumber  
- eventDate
- eventType
- location

**Safety Features**:
- Dry-run mode for safe preview
- Batch processing for large datasets
- Comprehensive logging and validation
- Keeps the record with the lowest ID (typically the first inserted)

**Expected Output**:
```
🚀 Starting VoyageEvent duplicate cleanup...
⚙️  Mode: DRY RUN

🔍 Identifying duplicate voyage events...
📊 Found 15 groups of duplicates
   📍 Group: VESSEL_001 | V12345 | Thunder Horse (3 records)
   📍 Group: VESSEL_002 | V12346 | Mad Dog (2 records)
   
📊 Summary: 20 duplicate records to remove

🔥 DRY RUN: Would remove 20 duplicate records
🔒 DRY RUN: Would add unique constraint on [vessel, voyageNumber, eventDate, eventType, location]

🎉 VoyageEvent cleanup completed successfully!
```

## Running Scripts

1. Ensure database connection is configured in your environment
2. Run scripts from the backend root directory
3. Always test with `--dry-run` first
4. Monitor logs for any errors or warnings

## Post-Cleanup

After running the cleanup script:
1. The unique constraint will be active
2. Future duplicate insertions will fail with SequelizeUniqueConstraintError
3. Application error handling will catch and handle constraint violations
4. Data integrity is maintained going forward