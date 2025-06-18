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
const referenceRoutes = require('./routes/reference')

// Import models to ensure associations are loaded
require('./models')

const app = express()
const PORT = process.env.PORT || 5000

// Trust proxy for nginx - disabled for development
app.set('trust proxy', false)

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
	origin: [
		'http://localhost:3000',
		'http://127.0.0.1:3000',
		process.env.FRONTEND_URL
	].filter(Boolean),
	credentials: true,
	optionsSuccessStatus: 200,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Rate limiting - DISABLED FOR DEVELOPMENT
// Commenting out rate limiting to troubleshoot upload issues
/*
const generalLimiter = rateLimit({
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
	max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000,
	message: 'Too many requests from this IP, please try again later.'
})

const uploadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 500, // 500 uploads per 15 minutes
	message: 'Too many upload requests, please try again later.'
})

app.use('/api/upload', uploadLimiter)
app.use('/api/', generalLimiter)
*/
console.log('⚠️ Rate limiting DISABLED for development')

// Body parsing middleware
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(compression())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/reference', referenceRoutes)

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
		})
	} catch (error) {
		logger.error('Unable to start server:', error)
		process.exit(1)
	}
}

startServer()

module.exports = app