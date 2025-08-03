#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set working directory
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

echo -e "${BLUE}🚀 Starting BP Logistics Dashboard Development Servers${NC}"
echo -e "${BLUE}Project Directory: ${PROJECT_DIR}${NC}"
echo -e "${BLUE}====================================================${NC}"

# Create log directory
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    
    # Kill processes more thoroughly
    pkill -f "simple-excel-server.js" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null
    pkill -f "webpack" 2>/dev/null
    pkill -f "scripts/start.js" 2>/dev/null
    
    # Kill by port if processes still running
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti:5001 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM EXIT

# Function to start Excel server with better error handling
start_excel_server() {
    echo -e "${BLUE}📊 Starting Excel Server...${NC}"
    
    # Kill any existing Excel server
    pkill -f "simple-excel-server.js" 2>/dev/null
    lsof -ti:5001 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    sleep 2
    
    # Start with nohup for persistence and proper logging
    nohup NODE_NO_WARNINGS=1 node simple-excel-server.js > logs/excel-server.log 2>&1 &
    EXCEL_PID=$!
    
    echo -e "${YELLOW}⏳ Waiting for Excel server to start (PID: $EXCEL_PID)...${NC}"
    
    # Wait up to 15 seconds for server to start
    for i in {1..15}; do
        if curl -s http://localhost:5001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Excel Server running on http://localhost:5001${NC}"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    echo -e "\n${RED}❌ Excel Server failed to start after 15 seconds${NC}"
    echo -e "${YELLOW}📋 Check logs/excel-server.log for details${NC}"
    return 1
}

# Function to start React server with better error handling
start_react_server() {
    echo -e "${BLUE}⚛️  Starting React Development Server...${NC}"
    
    # Kill any existing React server
    pkill -f "react-scripts start" 2>/dev/null
    pkill -f "scripts/start.js" 2>/dev/null
    lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
    
    sleep 3
    
    # Start with nohup for persistence and proper logging
    nohup NODE_NO_WARNINGS=1 NODE_OPTIONS="--max-old-space-size=4096" node scripts/start.js > logs/react-server.log 2>&1 &
    REACT_PID=$!
    
    echo -e "${YELLOW}⏳ Waiting for React server to start (PID: $REACT_PID)...${NC}"
    
    # Wait up to 90 seconds for React server to start
    for i in {1..90}; do
        if curl -s -I http://localhost:3000 2>/dev/null | head -1 | grep -q "200\|301\|302"; then
            echo -e "\n${GREEN}✅ React Server running on http://localhost:3000${NC}"
            return 0
        fi
        sleep 2
        if [ $((i % 5)) -eq 0 ]; then
            echo -n " [${i}s]"
        else
            echo -n "."
        fi
    done
    
    echo -e "\n${RED}❌ React Server failed to start after 180 seconds${NC}"
    echo -e "${YELLOW}📋 Check logs/react-server.log for details${NC}"
    return 1
}

# Function to check if server is running
is_server_running() {
    local port=$1
    local url=$2
    
    if [ "$port" = "5001" ]; then
        curl -s "$url" > /dev/null 2>&1
    else
        curl -s -I "$url" 2>/dev/null | head -1 | grep -q "200\|301\|302"
    fi
}

# Function to monitor and restart servers
monitor_servers() {
    echo -e "${BLUE}👀 Monitoring servers for crashes (checking every 15 seconds)...${NC}"
    
    local excel_restarts=0
    local react_restarts=0
    local max_restarts=3
    
    while true; do
        # Check Excel server
        if ! is_server_running 5001 "http://localhost:5001/health"; then
            excel_restarts=$((excel_restarts + 1))
            if [ $excel_restarts -le $max_restarts ]; then
                echo -e "${RED}⚠️  Excel Server down (restart #$excel_restarts), restarting...${NC}"
                start_excel_server
            else
                echo -e "${RED}💥 Excel Server failed $max_restarts times. Check logs/excel-server.log${NC}"
            fi
        fi
        
        # Check React server
        if ! is_server_running 3000 "http://localhost:3000"; then
            react_restarts=$((react_restarts + 1))
            if [ $react_restarts -le $max_restarts ]; then
                echo -e "${RED}⚠️  React Server down (restart #$react_restarts), restarting...${NC}"
                start_react_server
            else
                echo -e "${RED}💥 React Server failed $max_restarts times. Check logs/react-server.log${NC}"
            fi
        else
            # Reset restart counter if server is healthy
            if [ $react_restarts -gt 0 ]; then
                echo -e "${GREEN}✅ React Server recovered${NC}"
                react_restarts=0
            fi
        fi
        
        # Reset Excel restart counter if server is healthy
        if is_server_running 5001 "http://localhost:5001/health" && [ $excel_restarts -gt 0 ]; then
            echo -e "${GREEN}✅ Excel Server recovered${NC}"
            excel_restarts=0
        fi
        
        sleep 15  # Check every 15 seconds
    done
}

# Main execution
echo -e "${YELLOW}🧹 Cleaning up any existing server processes...${NC}"
cleanup 2>/dev/null || true
sleep 3

# Start Excel server first
if start_excel_server; then
    echo -e "${GREEN}📊 Excel Server is ready!${NC}"
else
    echo -e "${RED}❌ Failed to start Excel Server. Check logs/excel-server.log${NC}"
    exit 1
fi

# Start React server
if start_react_server; then
    echo -e "${GREEN}⚛️  React Server is ready!${NC}"
else
    echo -e "${RED}❌ Failed to start React Server. Check logs/react-server.log${NC}"
    cleanup
    exit 1
fi

echo -e "${GREEN}🎉 All servers are running successfully!${NC}"
echo -e "${BLUE}📊 Excel Server: ${GREEN}http://localhost:5001${NC}"
echo -e "${BLUE}⚛️  React App:    ${GREEN}http://localhost:3000${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop all servers${NC}"
echo -e "${YELLOW}📋 Logs available in logs/ directory${NC}"
echo -e "${BLUE}====================================================${NC}"

# Start monitoring
monitor_servers