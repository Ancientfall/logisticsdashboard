#!/bin/bash

# BP Logistics Dashboard - Persistent Excel Server Only
# This script starts just the Excel server with auto-restart

echo "📊 Starting Excel Server with auto-restart..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down Excel server..."
    kill $EXCEL_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Kill any existing processes on port 5001
echo "🧹 Cleaning up existing processes on port 5001..."
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 2

# Start Excel Server with auto-restart
echo "📊 Starting Excel Server on port 5001..."
while true; do
    echo "$(date): Starting Excel Server..."
    node simple-excel-server.js &
    EXCEL_PID=$!
    echo "Excel Server PID: $EXCEL_PID"
    
    # Wait for the process to finish
    wait $EXCEL_PID
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "Excel Server exited cleanly"
        break
    else
        echo "⚠️  Excel Server crashed with exit code $EXIT_CODE, restarting in 3 seconds..."
        sleep 3
    fi
done

echo "Excel Server stopped."