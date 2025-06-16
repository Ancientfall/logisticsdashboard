const { validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const PasswordReset = require('../models/PasswordReset')
const emailService = require('../services/emailService')
const logger = require('../utils/logger')

const generateToken = (userId) => {
	return jwt.sign(
		{ id: userId },
		process.env.JWT_SECRET,
		{ expiresIn: process.env.JWT_EXPIRE || '30d' }
	)
}

exports.register = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		const { email, password, firstName, lastName, role } = req.body

		// Check if user already exists
		const existingUser = await User.findOne({ where: { email } })
		if (existingUser) {
			return res.status(400).json({ error: 'User already exists with this email' })
		}

		// Create new user
		const user = await User.create({
			email,
			password,
			firstName,
			lastName,
			role: role || 'viewer'
		})

		const token = generateToken(user.id)

		logger.info(`New user registered: ${email}`)

		res.status(201).json({
			success: true,
			token,
			user: user.toJSON()
		})
	} catch (error) {
		logger.error('Registration error:', error)
		res.status(500).json({ error: 'Failed to register user' })
	}
}

exports.login = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		const { email, password } = req.body

		// Find user
		const user = await User.findOne({ where: { email } })
		if (!user) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		// Check password
		const isValidPassword = await user.comparePassword(password)
		if (!isValidPassword) {
			return res.status(401).json({ error: 'Invalid credentials' })
		}

		// Check if user is active
		if (!user.isActive) {
			return res.status(401).json({ error: 'Account is deactivated' })
		}

		// Update last login
		user.lastLogin = new Date()
		await user.save()

		const token = generateToken(user.id)

		logger.info(`User logged in: ${email}`)

		res.json({
			success: true,
			token,
			user: user.toJSON()
		})
	} catch (error) {
		logger.error('Login error:', error)
		res.status(500).json({ error: 'Failed to login' })
	}
}

exports.getCurrentUser = async (req, res) => {
	try {
		const user = await User.findByPk(req.user.id)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		res.json({
			success: true,
			user: user.toJSON()
		})
	} catch (error) {
		logger.error('Get current user error:', error)
		res.status(500).json({ error: 'Failed to get user data' })
	}
}

exports.refreshToken = async (req, res) => {
	try {
		const { token } = req.body

		if (!token) {
			return res.status(400).json({ error: 'Token is required' })
		}

		// Verify old token
		const decoded = jwt.verify(token, process.env.JWT_SECRET)
		const user = await User.findByPk(decoded.id)

		if (!user || !user.isActive) {
			return res.status(401).json({ error: 'Invalid token' })
		}

		// Generate new token
		const newToken = generateToken(user.id)

		res.json({
			success: true,
			token: newToken,
			user: user.toJSON()
		})
	} catch (error) {
		logger.error('Token refresh error:', error)
		res.status(401).json({ error: 'Invalid or expired token' })
	}
}

exports.logout = async (req, res) => {
	try {
		// In a production app, you might want to blacklist the token here
		logger.info(`User logged out: ${req.user.email}`)
		res.json({ success: true, message: 'Logged out successfully' })
	} catch (error) {
		logger.error('Logout error:', error)
		res.status(500).json({ error: 'Failed to logout' })
	}
}

exports.updatePassword = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		const { currentPassword, newPassword } = req.body
		const user = await User.findByPk(req.user.id)

		// Verify current password
		const isValidPassword = await user.comparePassword(currentPassword)
		if (!isValidPassword) {
			return res.status(401).json({ error: 'Current password is incorrect' })
		}

		// Update password
		user.password = newPassword
		await user.save()

		logger.info(`Password updated for user: ${user.email}`)

		res.json({ success: true, message: 'Password updated successfully' })
	} catch (error) {
		logger.error('Password update error:', error)
		res.status(500).json({ error: 'Failed to update password' })
	}
}

exports.requestPasswordReset = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		const { email } = req.body
		const user = await User.findOne({ where: { email } })

		// Always return success to prevent email enumeration
		if (!user) {
			logger.warn(`Password reset requested for non-existent email: ${email}`)
			return res.json({ 
				success: true, 
				message: 'If an account exists with this email, a password reset link has been sent.' 
			})
		}

		// Generate reset token
		const token = PasswordReset.generateToken()
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

		// Delete any existing tokens for this user
		await PasswordReset.destroy({ where: { userId: user.id, used: false } })

		// Create new reset token
		await PasswordReset.create({
			userId: user.id,
			token,
			expiresAt
		})

		// Send reset email
		const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`
		await emailService.sendPasswordResetEmail(user.email, resetUrl)

		logger.info(`Password reset requested for: ${email}`)

		res.json({ 
			success: true, 
			message: 'If an account exists with this email, a password reset link has been sent.' 
		})
	} catch (error) {
		logger.error('Password reset request error:', error)
		res.status(500).json({ error: 'Failed to process password reset request' })
	}
}

exports.resetPassword = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		const { token, newPassword } = req.body

		// Find valid reset token
		const resetToken = await PasswordReset.findOne({
			where: { token },
			include: [{ model: User, as: 'user' }]
		})

		if (!resetToken || !resetToken.isValid()) {
			return res.status(400).json({ error: 'Invalid or expired reset token' })
		}

		// Update user password
		const user = resetToken.user
		user.password = newPassword
		await user.save()

		// Mark token as used
		resetToken.used = true
		await resetToken.save()

		logger.info(`Password reset completed for: ${user.email}`)

		res.json({ 
			success: true, 
			message: 'Password has been reset successfully' 
		})
	} catch (error) {
		logger.error('Password reset error:', error)
		res.status(500).json({ error: 'Failed to reset password' })
	}
}

exports.validateResetToken = async (req, res) => {
	try {
		const { token } = req.params

		const resetToken = await PasswordReset.findOne({
			where: { token },
			include: [{ model: User, as: 'user' }]
		})

		if (!resetToken || !resetToken.isValid()) {
			return res.status(400).json({ 
				valid: false, 
				error: 'Invalid or expired reset token' 
			})
		}

		res.json({ 
			valid: true, 
			email: resetToken.user.email 
		})
	} catch (error) {
		logger.error('Token validation error:', error)
		res.status(500).json({ error: 'Failed to validate token' })
	}
}