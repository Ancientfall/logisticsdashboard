#\!/bin/bash
# Optimized development startup script
echo "🚀 Starting optimized development environment..."

# Kill existing processes
echo "⚡ Cleaning up existing processes..."
pkill -f "simple-excel-server.js" 2>/dev/null || true
pkill -f "node scripts/start.js" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

sleep 1

echo "📊 Starting Excel server..."
NODE_NO_WARNINGS=1 nohup node simple-excel-server.js > /dev/null 2>&1 &

sleep 2

echo "🌐 Starting React development server..."
NODE_NO_WARNINGS=1 npm start

echo "✅ Development environment ready\!"
EOF < /dev/null