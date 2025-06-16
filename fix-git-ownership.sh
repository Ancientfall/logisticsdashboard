#!/bin/bash

# Fix Git ownership issue on VPS

echo "Fixing Git ownership issue..."

# Option 1: Add safe directory exception (recommended)
git config --global --add safe.directory /var/www/bp-logistics

# Option 2: Fix ownership (alternative)
# chown -R $(whoami):$(whoami) /var/www/bp-logistics/.git

echo "Git ownership issue fixed!"
echo "You can now run git commands in /var/www/bp-logistics"