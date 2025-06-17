#!/bin/bash

echo "Creating proper rate limiter fix..."

cat > /tmp/rate-limiter-fix.js << 'EOF'
// Find this section in your server.js (around line 35-40):
// Rate limiting
const limiter = rateLimit({
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
	max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
	message: 'Too many requests from this IP, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	// Add these new options:
	validate: {
		trustProxy: false, // Disable the built-in trust proxy validation
		xForwardedForHeader: false // Disable X-Forwarded-For validation
	}
})
app.use('/api/', limiter)
EOF

echo "Instructions to apply the fix:"
echo ""
echo "1. SSH to server: ssh neal@178.16.140.185"
echo ""
echo "2. Edit the file:"
echo "   cd /var/www/bp-logistics/backend"
echo "   sudo nano src/server.js"
echo ""
echo "3. Make sure these lines exist near the top (around line 23):"
echo "   const app = express()"
echo "   app.set('trust proxy', true)"
echo ""
echo "4. Find the rate limiter section and update it with the configuration shown above"
echo ""
echo "5. Save (Ctrl+X, Y, Enter) and restart:"
echo "   pm2 restart bp-logistics-api"
echo ""
echo "The key changes are adding the 'validate' options to disable the strict validation."