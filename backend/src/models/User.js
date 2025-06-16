const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')
const bcrypt = require('bcryptjs')

const User = sequelize.define('User', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	email: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true,
		validate: {
			isEmail: true
		}
	},
	password: {
		type: DataTypes.STRING,
		allowNull: false
	},
	firstName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	lastName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	role: {
		type: DataTypes.ENUM('admin', 'manager', 'viewer'),
		defaultValue: 'viewer'
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	},
	lastLogin: {
		type: DataTypes.DATE
	}
}, {
	timestamps: true,
	hooks: {
		beforeCreate: async (user) => {
			if (user.password) {
				user.password = await bcrypt.hash(user.password, 10)
			}
		},
		beforeUpdate: async (user) => {
			if (user.changed('password')) {
				user.password = await bcrypt.hash(user.password, 10)
			}
		}
	}
})

User.prototype.comparePassword = async function(password) {
	return bcrypt.compare(password, this.password)
}

User.prototype.toJSON = function() {
	const values = { ...this.get() }
	delete values.password
	return values
}

module.exports = User