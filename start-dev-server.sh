#!/bin/bash

# Development server startup script for BP Logistics Dashboard
# This script starts the backend server for local development with Excel file loading

echo "🚀 Starting BP Logistics Development Server..."

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found. Please run this script from the project root."
    exit 1
fi

# Check if Excel files exist
if [ ! -d "excel-data/excel-files" ]; then
    echo "❌ Error: excel-data/excel-files directory not found."
    exit 1
fi

# Count Excel files
FILE_COUNT=$(find excel-data/excel-files -name "*.xlsx" -o -name "*.xls" | wc -l)
echo "📁 Found $FILE_COUNT Excel files in excel-data/excel-files/"

if [ $FILE_COUNT -lt 2 ]; then
    echo "⚠️  Warning: At least Voyage Events.xlsx and Cost Allocation.xlsx are required for the dashboard to work."
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Set environment variables for development
export NODE_ENV=development
export PORT=5001
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=bp_logistics_dev
export DB_USER=postgres
export DB_PASSWORD=password
export JWT_SECRET=dev-secret-key-change-in-production
export FRONTEND_URL=http://localhost:3000

echo "🔧 Starting backend server on port 5001..."
echo "📊 Excel files will be served from: $(pwd)/excel-data/excel-files/"
echo "🌐 API endpoint: http://localhost:5001/api/excel-files"
echo ""
echo "💡 In your React app, the useServerFileLoader hook will automatically"
echo "   detect and load Excel files from the local server."
echo ""
echo "📝 To stop the server, press Ctrl+C"
echo ""

# Start the server
cd backend
npm run dev || npm start

echo "🛑 Server stopped."