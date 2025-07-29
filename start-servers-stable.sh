#!/bin/bash

# Stable server startup script
echo "🚀 Starting BP Logistics Dashboard Servers (Stable Mode)"
echo "========================================================"

# Kill any existing processes
echo "🔧 Cleaning up existing processes..."
pkill -f "excel-server" 2>/dev/null || true
pkill -f "start\.js" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true

# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

echo "⏱️ Waiting for ports to clear..."
sleep 3

# Start Excel server in background with error handling
echo "📊 Starting Excel Server (Port 5001)..."
NODE_NO_WARNINGS=1 nohup node simple-excel-server.js > excel-server.log 2>&1 &
EXCEL_PID=$!

# Wait and check if Excel server started
sleep 2
if kill -0 $EXCEL_PID 2>/dev/null; then
    echo "✅ Excel Server started successfully (PID: $EXCEL_PID)"
else
    echo "❌ Excel Server failed to start"
    exit 1
fi

# Test Excel server
for i in {1..10}; do
    if curl -s http://localhost:5001/health > /dev/null; then
        echo "✅ Excel Server is responding"
        break
    else
        echo "⏳ Waiting for Excel Server to respond... ($i/10)"
        sleep 1
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Excel Server not responding after 10 seconds"
        exit 1
    fi
done

# Start Development server with optimizations
echo "🖥️ Starting Development Server (Port 3000)..."
export FAST_REFRESH=false
export GENERATE_SOURCEMAP=false
export ESLINT_NO_DEV_ERRORS=true

NODE_NO_WARNINGS=1 nohup npm start > dev-server.log 2>&1 &
DEV_PID=$!

# Wait and check if Dev server started
sleep 5
if kill -0 $DEV_PID 2>/dev/null; then
    echo "✅ Development Server started successfully (PID: $DEV_PID)"
else
    echo "❌ Development Server failed to start"
    exit 1
fi

# Test Development server
echo "⏳ Waiting for Development Server to compile..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Development Server is responding"
        break
    else
        if [ $((i % 5)) -eq 0 ]; then
            echo "⏳ Still waiting for compilation... ($i/30)"
        fi
        sleep 1
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Development Server not responding after 30 seconds"
        echo "📋 Checking dev server logs..."
        tail -10 dev-server.log
        exit 1
    fi
done

echo ""
echo "🎉 SERVERS STARTED SUCCESSFULLY!"
echo "================================="
echo "📊 Excel Server:      http://localhost:5001"
echo "🖥️ Development Server: http://localhost:3000"
echo ""
echo "📋 Process IDs:"
echo "   Excel Server PID: $EXCEL_PID"
echo "   Dev Server PID: $DEV_PID"
echo ""
echo "📄 Log Files:"
echo "   Excel Server: excel-server.log"
echo "   Dev Server: dev-server.log"
echo ""
echo "🔧 To stop servers: ./stop-servers.sh"
echo "📊 To view logs: tail -f excel-server.log OR tail -f dev-server.log"