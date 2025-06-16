const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const adminController = require('../controllers/adminController')
const auth = require('../middleware/auth')
const authorize = require('../middleware/authorize')

// All admin routes require authentication and admin role
router.use(auth)
router.use(authorize(['admin']))

// Get all users with pagination
router.get('/users', adminController.getUsers)

// Get single user
router.get('/users/:id', adminController.getUser)

// Update user (role, active status)
router.put('/users/:id', [
	body('role').optional().isIn(['admin', 'manager', 'viewer']),
	body('isActive').optional().isBoolean()
], adminController.updateUser)

// Delete user
router.delete('/users/:id', adminController.deleteUser)

// Get system stats
router.get('/stats', adminController.getSystemStats)

// Get activity logs
router.get('/activity', adminController.getActivityLogs)

module.exports = router