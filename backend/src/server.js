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

// Import models to ensure associations are loaded
require('./models')

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:3000',
	credentials: true,
	optionsSuccessStatus: 200
}))

// Rate limiting
const limiter = rateLimit({
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
	max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
	message: 'Too many requests from this IP, please try again later.'
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