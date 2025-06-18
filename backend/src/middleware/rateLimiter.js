const rateLimit = require('express-rate-limit')

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // Limit each IP to 50 requests per windowMs (increased for development)
	message: 'Too many authentication attempts, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	// Skip successful requests from the count
	skipSuccessfulRequests: false,
	// Store in memory (fine for small internal use)
	store: undefined,
	// Properly handle trust proxy setting
	trustProxy: false
})

// More generous rate limiter for general API endpoints
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: 'Too many requests from this IP, please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	trustProxy: false
})

// Very strict limiter for password reset
const passwordResetLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Limit each IP to 3 password reset requests per hour
	message: 'Too many password reset attempts, please try again later.',
	skipSuccessfulRequests: true,
	trustProxy: false
})

module.exports = {
	authLimiter,
	apiLimiter,
	passwordResetLimiter
}