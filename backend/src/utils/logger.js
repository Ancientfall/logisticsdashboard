const winston = require('winston')
const path = require('path')

const logLevel = process.env.LOG_LEVEL || 'info'

const logger = winston.createLogger({
	level: logLevel,
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.splat(),
		winston.format.json()
	),
	defaultMeta: { service: 'bp-logistics-api' },
	transports: [
		// Write all logs with level 'error' and below to error.log
		new winston.transports.File({ 
			filename: path.join('logs', 'error.log'), 
			level: 'error' 
		}),
		// Write all logs with level 'info' and below to combined.log
		new winston.transports.File({ 
			filename: path.join('logs', 'combined.log') 
		})
	]
})

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.combine(
			winston.format.colorize(),
			winston.format.simple()
		)
	}))
}

module.exports = logger