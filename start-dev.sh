#!/bin/bash

# BP Logistics Dashboard - Persistent Development Servers
# This script starts both the React app and Excel server with auto-restart

echo "🚀 Starting BP Logistics Dashboard Development Environment..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down development servers..."
    kill $EXCEL_PID $REACT_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 2

# Start Excel Server with auto-restart
echo "📊 Starting Excel Server on port 5001..."
while true; do
    node simple-excel-server.js &
    EXCEL_PID=$!
    echo "Excel Server PID: $EXCEL_PID"
    wait $EXCEL_PID
    echo "⚠️  Excel Server crashed, restarting in 3 seconds..."
    sleep 3
done &

# Give Excel server time to start
sleep 5

# Start React Development Server with auto-restart
echo "⚛️  Starting React Development Server on port 3000..."
while true; do
    NODE_NO_WARNINGS=1 npm start &
    REACT_PID=$!
    echo "React Server PID: $REACT_PID"
    wait $REACT_PID
    echo "⚠️  React Server crashed, restarting in 3 seconds..."
    sleep 3
done &

echo "✅ Development servers started!"
echo "📊 Excel Server: http://localhost:5001"
echo "⚛️  React App: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Keep script running
wait