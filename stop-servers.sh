#!/bin/bash

echo "🛑 Stopping BP Logistics Dashboard Servers"
echo "==========================================="

# Kill processes by name
echo "🔧 Stopping Excel Server..."
pkill -f "excel-server" 2>/dev/null && echo "✅ Excel Server stopped" || echo "ℹ️ Excel Server was not running"

echo "🔧 Stopping Development Server..."
pkill -f "start\.js" 2>/dev/null && echo "✅ Development Server stopped" || echo "ℹ️ Development Server was not running"
pkill -f "npm.*start" 2>/dev/null

# Kill processes on specific ports
echo "🔧 Clearing ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✅ Port 3000 cleared" || echo "ℹ️ Port 3000 was free"
lsof -ti:5001 | xargs kill -9 2>/dev/null && echo "✅ Port 5001 cleared" || echo "ℹ️ Port 5001 was free"

echo "✅ All servers stopped successfully"