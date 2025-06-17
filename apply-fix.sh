#!/bin/bash

echo "Apply the fix by running this command on the VPS:"
echo ""
echo "ssh bp-vps"
echo "sudo cp /tmp/server-fixed.js /var/www/bp-logistics/backend/src/server.js"
echo "pm2 restart bp-logistics-api"
echo ""
echo "Or as a one-liner:"
echo "ssh bp-vps 'sudo cp /tmp/server-fixed.js /var/www/bp-logistics/backend/src/server.js && pm2 restart bp-logistics-api'"