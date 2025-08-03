#!/bin/bash

# BP Logistics Dashboard - Persistent React Server Only
# This script starts just the React dev server with auto-restart

echo "⚛️  Starting React Development Server with auto-restart..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down React server..."
    kill $REACT_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Kill any existing processes on port 3000
echo "🧹 Cleaning up existing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Start React Development Server with auto-restart
echo "⚛️  Starting React Development Server on port 3000..."
while true; do
    echo "$(date): Starting React Development Server..."
    NODE_NO_WARNINGS=1 npm start &
    REACT_PID=$!
    echo "React Server PID: $REACT_PID"
    
    # Wait for the process to finish
    wait $REACT_PID
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "React Server exited cleanly"
        break
    else
        echo "⚠️  React Server crashed with exit code $EXIT_CODE, restarting in 3 seconds..."
        sleep 3
    fi
done

echo "React Server stopped."