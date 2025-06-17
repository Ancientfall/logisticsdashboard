#!/bin/bash

echo "Creating comprehensive server fix..."

cat > /tmp/server-fix-complete.js << 'EOF'
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const { sequelize } = require('./config/database')
const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')
const authRoutes = require('./routes/auth')
const dataRoutes = require('./routes/data')
const uploadRoutes = require('./routes/upload')
const adminRoutes = require('./routes/admin')

// Import models to ensure associations are loaded
require('./models')

const app = express()
const PORT = process.env.PORT || 5000

// IMPORTANT: Set trust proxy before any middleware
app.set('trust proxy', true)

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:3000',
	credentials: true,
	optionsSuccessStatus: 200
}))

// Rate limiting with trust proxy support
const limiter = rateLimit({
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
	max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
	message: 'Too many requests from this IP, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	// Trust proxy headers
	skip: (req, res) => {
		// Skip rate limiting for health checks
		return req.path === '/health'
	}
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(compression())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use(errorHandler)

// Database connection and server startup
async function startServer() {
	try {
		await sequelize.authenticate()
		logger.info('Database connection established successfully')
		
		// Sync database models
		await sequelize.sync({ alter: true })
		logger.info('Database models synchronized')
		
		app.listen(PORT, () => {
			logger.info(`Server is running on port ${PORT}`)
			logger.info(`Trust proxy is enabled`)
			logger.info(`Environment: ${process.env.NODE_ENV}`)
		})
	} catch (error) {
		logger.error('Failed to start server:', error)
		process.exit(1)
	}
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
	logger.info('SIGTERM received, shutting down gracefully...')
	await sequelize.close()
	process.exit(0)
})

process.on('SIGINT', async () => {
	logger.info('SIGINT received, shutting down gracefully...')
	await sequelize.close()
	process.exit(0)
})

startServer()
EOF

echo "Fixed server.js created at /tmp/server-fix-complete.js"
echo ""
echo "To apply this fix, run on the VPS:"
echo ""
echo "scp /tmp/server-fix-complete.js neal@178.16.140.185:/tmp/"
echo "ssh neal@178.16.140.185"
echo "sudo cp /tmp/server-fix-complete.js /var/www/bp-logistics/backend/src/server.js"
echo "cd /var/www/bp-logistics/backend"
echo "pm2 restart bp-logistics-api"