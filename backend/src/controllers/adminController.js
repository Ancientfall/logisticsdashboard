const { validationResult } = require('express-validator')
const { Op } = require('sequelize')
const User = require('../models/User')
const Upload = require('../models/Upload')
const logger = require('../utils/logger')

exports.getUsers = async (req, res) => {
	try {
		const { page = 1, limit = 20, search = '', role = '', isActive } = req.query
		const offset = (page - 1) * limit

		// Build where clause
		const where = {}
		
		if (search) {
			where[Op.or] = [
				{ firstName: { [Op.iLike]: `%${search}%` } },
				{ lastName: { [Op.iLike]: `%${search}%` } },
				{ email: { [Op.iLike]: `%${search}%` } }
			]
		}
		
		if (role) {
			where.role = role
		}
		
		if (isActive !== undefined) {
			where.isActive = isActive === 'true'
		}

		const { count, rows: users } = await User.findAndCountAll({
			where,
			limit: parseInt(limit),
			offset,
			order: [['createdAt', 'DESC']],
			attributes: { exclude: ['password'] }
		})

		res.json({
			success: true,
			data: users,
			pagination: {
				page: parseInt(page),
				limit: parseInt(limit),
				total: count,
				pages: Math.ceil(count / limit)
			}
		})
	} catch (error) {
		logger.error('Get users error:', error)
		res.status(500).json({ error: 'Failed to fetch users' })
	}
}

exports.getUser = async (req, res) => {
	try {
		const { id } = req.params
		
		const user = await User.findByPk(id, {
			attributes: { exclude: ['password'] },
			include: [
				{
					model: Upload,
					as: 'uploads',
					attributes: ['id', 'filename', 'type', 'recordCount', 'createdAt']
				}
			]
		})

		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		res.json({
			success: true,
			data: user
		})
	} catch (error) {
		logger.error('Get user error:', error)
		res.status(500).json({ error: 'Failed to fetch user' })
	}
}

exports.updateUser = async (req, res) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		const { id } = req.params
		const { role, isActive } = req.body

		// Prevent admin from deactivating themselves
		if (id === req.user.id && isActive === false) {
			return res.status(400).json({ error: 'Cannot deactivate your own account' })
		}

		const user = await User.findByPk(id)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		// Update fields if provided
		if (role !== undefined) {
			user.role = role
		}
		if (isActive !== undefined) {
			user.isActive = isActive
		}

		await user.save()

		logger.info(`User updated by admin: ${user.email}, changes by: ${req.user.email}`)

		res.json({
			success: true,
			data: user.toJSON()
		})
	} catch (error) {
		logger.error('Update user error:', error)
		res.status(500).json({ error: 'Failed to update user' })
	}
}

exports.deleteUser = async (req, res) => {
	try {
		const { id } = req.params

		// Prevent admin from deleting themselves
		if (id === req.user.id) {
			return res.status(400).json({ error: 'Cannot delete your own account' })
		}

		const user = await User.findByPk(id)
		if (!user) {
			return res.status(404).json({ error: 'User not found' })
		}

		// Soft delete - just deactivate
		user.isActive = false
		await user.save()

		logger.info(`User deactivated by admin: ${user.email}, by: ${req.user.email}`)

		res.json({
			success: true,
			message: 'User deactivated successfully'
		})
	} catch (error) {
		logger.error('Delete user error:', error)
		res.status(500).json({ error: 'Failed to delete user' })
	}
}

exports.getSystemStats = async (req, res) => {
	try {
		// Get user statistics
		const totalUsers = await User.count()
		const activeUsers = await User.count({ where: { isActive: true } })
		const usersByRole = await User.findAll({
			attributes: [
				'role',
				[User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
			],
			group: ['role']
		})

		// Get upload statistics
		const totalUploads = await Upload.count()
		const recentUploads = await Upload.count({
			where: {
				createdAt: {
					[Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
				}
			}
		})

		// Get recent user activity
		const recentUsers = await User.findAll({
			where: {
				createdAt: {
					[Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
				}
			},
			attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
			order: [['createdAt', 'DESC']],
			limit: 5
		})

		res.json({
			success: true,
			data: {
				users: {
					total: totalUsers,
					active: activeUsers,
					inactive: totalUsers - activeUsers,
					byRole: usersByRole.reduce((acc, item) => {
						acc[item.role] = parseInt(item.get('count'))
						return acc
					}, {})
				},
				uploads: {
					total: totalUploads,
					recent: recentUploads
				},
				recentUsers
			}
		})
	} catch (error) {
		logger.error('Get system stats error:', error)
		res.status(500).json({ error: 'Failed to fetch system statistics' })
	}
}

exports.getActivityLogs = async (req, res) => {
	try {
		const { page = 1, limit = 50 } = req.query
		const offset = (page - 1) * limit

		// Get recent logins
		const recentActivity = await User.findAll({
			where: {
				lastLogin: {
					[Op.not]: null
				}
			},
			attributes: ['id', 'email', 'firstName', 'lastName', 'lastLogin', 'role'],
			order: [['lastLogin', 'DESC']],
			limit: parseInt(limit),
			offset
		})

		// Get recent uploads
		const recentUploads = await Upload.findAll({
			include: [{
				model: User,
				as: 'user',
				attributes: ['email', 'firstName', 'lastName']
			}],
			order: [['createdAt', 'DESC']],
			limit: parseInt(limit),
			offset
		})

		res.json({
			success: true,
			data: {
				logins: recentActivity,
				uploads: recentUploads
			}
		})
	} catch (error) {
		logger.error('Get activity logs error:', error)
		res.status(500).json({ error: 'Failed to fetch activity logs' })
	}
}