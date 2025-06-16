const logger = require('../utils/logger')

module.exports = (err, req, res, next) => {
	logger.error('Error occurred:', {
		error: err.message,
		stack: err.stack,
		method: req.method,
		url: req.url,
		ip: req.ip,
		user: req.user?.id
	})

	// Mongoose validation error
	if (err.name === 'ValidationError') {
		const errors = Object.values(err.errors).map(e => e.message)
		return res.status(400).json({
			error: 'Validation failed',
			details: errors
		})
	}

	// JWT errors
	if (err.name === 'JsonWebTokenError') {
		return res.status(401).json({ error: 'Invalid token' })
	}

	if (err.name === 'TokenExpiredError') {
		return res.status(401).json({ error: 'Token expired' })
	}

	// Sequelize errors
	if (err.name === 'SequelizeValidationError') {
		const errors = err.errors.map(e => ({
			field: e.path,
			message: e.message
		}))
		return res.status(400).json({
			error: 'Validation failed',
			details: errors
		})
	}

	if (err.name === 'SequelizeUniqueConstraintError') {
		return res.status(400).json({
			error: 'Duplicate entry',
			details: err.errors.map(e => e.message)
		})
	}

	// Multer errors
	if (err.code === 'LIMIT_FILE_SIZE') {
		return res.status(400).json({ error: 'File too large' })
	}

	if (err.message === 'Only Excel and CSV files are allowed') {
		return res.status(400).json({ error: err.message })
	}

	// Default error
	const statusCode = err.statusCode || 500
	const message = err.message || 'Internal server error'

	res.status(statusCode).json({
		error: message,
		...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
	})
}