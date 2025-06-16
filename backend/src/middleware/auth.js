const jwt = require('jsonwebtoken')
const User = require('../models/User')

module.exports = async (req, res, next) => {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '')
		
		if (!token) {
			throw new Error()
		}
		
		const decoded = jwt.verify(token, process.env.JWT_SECRET)
		const user = await User.findByPk(decoded.id)
		
		if (!user || !user.isActive) {
			throw new Error()
		}
		
		req.user = user
		req.token = token
		next()
	} catch (error) {
		res.status(401).json({ error: 'Please authenticate' })
	}
}