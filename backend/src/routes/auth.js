const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')

// Register new user
router.post('/register', [
	body('email').isEmail().normalizeEmail(),
	body('password').isLength({ min: 6 }),
	body('firstName').notEmpty().trim(),
	body('lastName').notEmpty().trim()
], authController.register)

// Login
router.post('/login', [
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
	body('newPassword').isLength({ min: 6 })
], authController.updatePassword)

module.exports = router