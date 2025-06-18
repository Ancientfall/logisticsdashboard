#!/bin/bash

# BP Logistics Dashboard - Excel Files Deployment Script
# This script copies Excel files from local OneDrive to VPS server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="178.16.140.185"
VPS_USER="root"
LOCAL_EXCEL_DIR="/Users/nealasmothers/Library/CloudStorage/OneDrive-BP/PowerBI/PowerBI Data/Drill_Prod Dashboard"
VPS_EXCEL_DIR="/var/www/bp-logistics/excel-data/excel-files"
VPS_REFERENCE_DIR="/var/www/bp-logistics/excel-data/reference-data"

# Required Excel files
EXCEL_FILES=(
    "Bulk Actions.xlsx"
    "Cost Allocation.xlsx"
    "Vessel Manifests.xlsx"
    "Voyage Events.xlsx"
    "Voyage List.xlsx"
)

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

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if local Excel directory exists
if [ ! -d "$LOCAL_EXCEL_DIR" ]; then
    print_error "Local Excel directory not found: $LOCAL_EXCEL_DIR"
    print_info "Please ensure OneDrive is synced and the directory path is correct"
    exit 1
fi

print_info "Local Excel directory found: $LOCAL_EXCEL_DIR"

# Check if required Excel files exist locally
print_info "Checking for required Excel files..."
missing_files=()

for file in "${EXCEL_FILES[@]}"; do
    if [ -f "$LOCAL_EXCEL_DIR/$file" ]; then
        print_status "Found: $file"
    else
        print_error "Missing: $file"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Missing required Excel files. Please ensure all files are available."
    exit 1
fi

# Test SSH connection
print_info "Testing SSH connection to VPS server..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPS_USER@$VPS_IP" exit 2>/dev/null; then
    print_status "SSH connection successful"
else
    print_error "Cannot connect to VPS server. Please check:"
    print_info "1. VPS server is running"
    print_info "2. SSH key is configured"
    print_info "3. Server IP is correct: $VPS_IP"
    exit 1
fi

# Create directories on VPS
print_info "Creating directories on VPS server..."
ssh "$VPS_USER@$VPS_IP" "
    mkdir -p '$VPS_EXCEL_DIR'
    mkdir -p '$VPS_REFERENCE_DIR'
    mkdir -p '/var/www/bp-logistics/excel-data/metadata'
    chown -R www-data:www-data '/var/www/bp-logistics/excel-data'
    chmod -R 775 '/var/www/bp-logistics/excel-data'
"

print_status "Directories created on VPS"

# Copy Excel files to VPS
print_info "Copying Excel files to VPS server..."

for file in "${EXCEL_FILES[@]}"; do
    print_info "Copying: $file"
    
    # Use scp to copy file
    if scp "$LOCAL_EXCEL_DIR/$file" "$VPS_USER@$VPS_IP:$VPS_EXCEL_DIR/"; then
        print_status "Copied: $file"
    else
        print_error "Failed to copy: $file"
        exit 1
    fi
done

# Set proper permissions on VPS
print_info "Setting file permissions on VPS..."
ssh "$VPS_USER@$VPS_IP" "
    chown -R www-data:www-data '$VPS_EXCEL_DIR'
    chmod -R 644 '$VPS_EXCEL_DIR'/*.xlsx
    chmod -R 755 '$VPS_EXCEL_DIR'
"

print_status "File permissions set"

# Create initial metadata file
print_info "Creating metadata file..."
ssh "$VPS_USER@$VPS_IP" "
cat > '/var/www/bp-logistics/excel-data/metadata/files-metadata.json' << 'EOF'
{
  \"lastUpdated\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"files\": {},
  \"version\": \"1.0.0\",
  \"deployedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"source\": \"local-deployment\"
}
EOF

chown www-data:www-data '/var/www/bp-logistics/excel-data/metadata/files-metadata.json'
chmod 644 '/var/www/bp-logistics/excel-data/metadata/files-metadata.json'
"

print_status "Metadata file created"

# Test file accessibility
print_info "Testing file accessibility on VPS..."
ssh "$VPS_USER@$VPS_IP" "
    cd '$VPS_EXCEL_DIR'
    echo 'Files in excel-data directory:'
    ls -la
    echo ''
    echo 'File sizes:'
    du -h *.xlsx
"

print_status "File accessibility test completed"

# Create file verification script on VPS
print_info "Creating file verification script on VPS..."
ssh "$VPS_USER@$VPS_IP" "
cat > '/usr/local/bin/verify-excel-files.sh' << 'EOF'
#!/bin/bash

# Excel Files Verification Script
EXCEL_DIR='/var/www/bp-logistics/excel-data/excel-files'
REQUIRED_FILES=(
    'Bulk Actions.xlsx'
    'Cost Allocation.xlsx'
    'Vessel Manifests.xlsx'
    'Voyage Events.xlsx'
    'Voyage List.xlsx'
)

echo 'Excel Files Verification'
echo '======================='

cd \"\$EXCEL_DIR\" || exit 1

all_present=true
for file in \"\${REQUIRED_FILES[@]}\"; do
    if [ -f \"\$file\" ]; then
        size=\$(stat -c%s \"\$file\")
        echo \"✓ \$file (\$size bytes)\"
    else
        echo \"✗ \$file (missing)\"
        all_present=false
    fi
done

if \$all_present; then
    echo \"\"
    echo \"✓ All required Excel files are present\"
    echo \"Files are ready for dashboard loading\"
else
    echo \"\"
    echo \"✗ Some Excel files are missing\"
    echo \"Please run deployment script again\"
fi
EOF

chmod +x '/usr/local/bin/verify-excel-files.sh'
"

print_status "File verification script created"

# Run verification
print_info "Running file verification..."
ssh "$VPS_USER@$VPS_IP" "/usr/local/bin/verify-excel-files.sh"

# Final summary
clear
echo ""
echo "=========================================="
echo "Excel Files Deployment Complete!"
echo "=========================================="
echo ""
print_status "All Excel files successfully deployed to VPS"
echo ""
print_info "Deployed Files:"
for file in "${EXCEL_FILES[@]}"; do
    echo "  - $file"
done
echo ""
print_info "VPS Locations:"
echo "  Excel Files: $VPS_EXCEL_DIR"
echo "  Reference Data: $VPS_REFERENCE_DIR"
echo "  Metadata: /var/www/bp-logistics/excel-data/metadata/"
echo ""
print_info "API Endpoints:"
echo "  List files: https://bpsolutionsdashboard.com/api/excel-files"
echo "  Download file: https://bpsolutionsdashboard.com/api/excel-files/{filename}"
echo ""
print_info "Verification Commands:"
echo "  SSH: ssh $VPS_USER@$VPS_IP"
echo "  Verify files: /usr/local/bin/verify-excel-files.sh"
echo "  Check API: curl https://bpsolutionsdashboard.com/api/excel-files"
echo ""
print_status "Excel files are ready for auto-loading in the dashboard!"
echo ""
print_warning "Next Steps:"
echo "  1. Deploy updated frontend with auto-loading feature"
echo "  2. Test dashboard auto-loading functionality"
echo "  3. Verify data processing works correctly"
echo "  4. Set up file update automation (optional)"