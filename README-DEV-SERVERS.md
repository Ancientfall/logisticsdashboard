# BP Logistics Dashboard - Development Servers

## Persistent Development Servers

The dev servers now have auto-restart functionality to prevent them from quitting unexpectedly.

## Available Commands

### Main Development Commands
```bash
# Start both React app and Excel server with auto-restart
npm run dev

# Alternative command for persistent servers
npm run dev-persistent
```

### Individual Server Commands
```bash
# Start only Excel server with auto-restart
npm run excel-persistent

# Start only React app with auto-restart
npm run react-persistent

# Kill all servers running on ports 3000 and 5001
npm run kill-servers
```

### Direct Script Usage
```bash
# Start both servers
./start-dev.sh

# Start Excel server only
./start-excel-server.sh

# Start React server only
./start-react-only.sh
```

## Features

✅ **Auto-restart**: Servers automatically restart if they crash
✅ **Clean startup**: Kills existing processes before starting
✅ **Graceful shutdown**: Ctrl+C stops all servers cleanly
✅ **Process monitoring**: Shows PID and status messages
✅ **Port management**: Handles port conflicts automatically

## Server Details

- **React Development Server**: http://localhost:3000
- **Excel Server**: http://localhost:5001
- **Excel API**: http://localhost:5001/api/excel-files

## Troubleshooting

If servers still quit unexpectedly:

1. **Check for port conflicts**:
   ```bash
   npm run kill-servers
   ```

2. **Start servers individually** to isolate issues:
   ```bash
   npm run excel-persistent
   # In another terminal:
   npm run react-persistent
   ```

3. **Check system resources** - ensure enough memory is available

4. **Restart Terminal** - sometimes shell sessions can cause issues

## Log Output

The persistent servers provide detailed logging:
- Server start/restart messages
- Process IDs for monitoring
- Error codes when crashes occur
- Timestamps for debugging

## Stopping Servers

- **Ctrl+C** in the terminal running the script
- **npm run kill-servers** from any terminal
- **Manual kill**: `kill -9 <PID>` using the displayed process IDs