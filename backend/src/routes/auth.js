const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter')

// Password validation helper
const passwordValidation = body('password')
	.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
	.matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
	.matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
	.matches(/[0-9]/).withMessage('Password must contain at least one number')
	.matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)')

// Register new user
router.post('/register', authLimiter, [
	body('email').isEmail().normalizeEmail(),
	passwordValidation,
	body('firstName').notEmpty().trim(),
	body('lastName').notEmpty().trim()
], authController.register)

// Login
router.post('/login', authLimiter, [
	body('email').isEmail().normalizeEmail(),
	body('password').notEmpty()
], authController.login)

// Get current user
router.get('/me', auth, authController.getCurrentUser)

// Refresh token
router.post('/refresh', authController.refreshToken)

// Logout
router.post('/logout', auth, authController.logout)

// Update password
router.put('/password', auth, [
	body('currentPassword').notEmpty(),
	body('newPassword')
		.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
		.matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
		.matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
		.matches(/[0-9]/).withMessage('Password must contain at least one number')
		.matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)')
], authController.updatePassword)

// Request password reset
router.post('/password-reset', passwordResetLimiter, [
	body('email').isEmail().normalizeEmail()
], authController.requestPasswordReset)

// Reset password with token
router.post('/password-reset/confirm', [
	body('token').notEmpty(),
	body('newPassword')
		.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
		.matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
		.matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
		.matches(/[0-9]/).withMessage('Password must contain at least one number')
		.matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)')
], authController.resetPassword)

// Validate reset token
router.get('/password-reset/:token', authController.validateResetToken)

module.exports = router