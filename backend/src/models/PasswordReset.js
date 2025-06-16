const { DataTypes } = require('sequelize')
const crypto = require('crypto')
const { sequelize } = require('../config/database')

const PasswordReset = sequelize.define('PasswordReset', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	userId: {
		type: DataTypes.UUID,
		allowNull: false,
		references: {
			model: 'Users',
			key: 'id'
		}
	},
	token: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true
	},
	expiresAt: {
		type: DataTypes.DATE,
		allowNull: false
	},
	used: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	}
}, {
	tableName: 'password_resets',
	timestamps: true,
	indexes: [
		{
			fields: ['token']
		},
		{
			fields: ['userId']
		}
	]
})

// Generate a secure random token
PasswordReset.generateToken = () => {
	return crypto.randomBytes(32).toString('hex')
}

// Instance method to check if token is expired
PasswordReset.prototype.isExpired = function() {
	return new Date() > this.expiresAt
}

// Instance method to check if token is valid
PasswordReset.prototype.isValid = function() {
	return !this.used && !this.isExpired()
}

module.exports = PasswordReset