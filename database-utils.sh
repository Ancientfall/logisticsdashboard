#!/bin/bash

# BP Logistics Dashboard - Database Utilities
# Backup and restore database operations

set -e

# Configuration
DB_NAME="bp_logistics"
DB_USER="bp_logistics_user"
BACKUP_DIR="/var/backups/bp-logistics"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Backup function
backup_database() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/bp_logistics_backup_$TIMESTAMP.sql"
    
    print_status "Starting database backup..."
    
    if pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_FILE; then
        # Compress the backup
        gzip $BACKUP_FILE
        print_status "Database backed up to: ${BACKUP_FILE}.gz"
        
        # Keep only last 7 days of backups
        find $BACKUP_DIR -name "bp_logistics_backup_*.sql.gz" -mtime +7 -delete
        print_status "Old backups cleaned up (kept last 7 days)"
    else
        print_error "Database backup failed!"
        exit 1
    fi
}

# Restore function
restore_database() {
    if [ -z "$1" ]; then
        print_error "Please provide backup file path"
        echo "Usage: $0 restore /path/to/backup.sql.gz"
        exit 1
    fi
    
    BACKUP_FILE=$1
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    print_warning "This will overwrite the current database. Are you sure? (yes/no)"
    read -r CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_warning "Restore cancelled"
        exit 0
    fi
    
    print_status "Stopping application..."
    pm2 stop bp-logistics-backend || true
    
    print_status "Restoring database from: $BACKUP_FILE"
    
    # Drop and recreate database
    sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF
    
    # Restore from backup
    if [[ $BACKUP_FILE == *.gz ]]; then
        gunzip -c $BACKUP_FILE | psql -U $DB_USER -h localhost $DB_NAME
    else
        psql -U $DB_USER -h localhost $DB_NAME < $BACKUP_FILE
    fi
    
    # Grant schema permissions
    sudo -u postgres psql -d ${DB_NAME} <<EOF
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOF
    
    print_status "Database restored successfully"
    
    print_status "Starting application..."
    pm2 start bp-logistics-backend
}

# List backups function
list_backups() {
    print_status "Available backups:"
    ls -lh $BACKUP_DIR/bp_logistics_backup_*.sql.gz 2>/dev/null || print_warning "No backups found"
}

# Export data function
export_data() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    EXPORT_DIR="$BACKUP_DIR/export_$TIMESTAMP"
    mkdir -p $EXPORT_DIR
    
    print_status "Exporting data to CSV format..."
    
    # Export each table to CSV
    tables=("Users" "Uploads" "WellOperations" "Vessels" "FluidAnalyses")
    
    for table in "${tables[@]}"; do
        psql -U $DB_USER -h localhost $DB_NAME -c "\COPY \"$table\" TO '$EXPORT_DIR/$table.csv' WITH CSV HEADER"
        print_status "Exported $table"
    done
    
    # Create zip archive
    cd $BACKUP_DIR
    zip -r "export_$TIMESTAMP.zip" "export_$TIMESTAMP"
    rm -rf "export_$TIMESTAMP"
    
    print_status "Data exported to: $BACKUP_DIR/export_$TIMESTAMP.zip"
}

# Show usage
show_usage() {
    echo "BP Logistics Database Utilities"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  backup    - Create a database backup"
    echo "  restore   - Restore from a backup file"
    echo "  list      - List available backups"
    echo "  export    - Export data to CSV format"
    echo "  auto      - Set up automatic daily backups"
    echo ""
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 restore /var/backups/bp-logistics/backup.sql.gz"
    echo "  $0 list"
}

# Set up automatic backups
setup_auto_backup() {
    print_status "Setting up automatic daily backups..."
    
    # Create cron job
    CRON_FILE="/etc/cron.d/bp-logistics-backup"
    cat > $CRON_FILE <<EOF
# BP Logistics Database Backup
# Run daily at 2:00 AM
0 2 * * * root /var/www/bp-logistics/database-utils.sh backup >> /var/log/bp-logistics-backup.log 2>&1
EOF
    
    chmod 644 $CRON_FILE
    print_status "Automatic backups configured (daily at 2:00 AM)"
    print_status "Backup logs will be in: /var/log/bp-logistics-backup.log"
}

# Main script logic
case "$1" in
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    export)
        export_data
        ;;
    auto)
        setup_auto_backup
        ;;
    *)
        show_usage
        ;;
esac