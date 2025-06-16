const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const WellOperation = sequelize.define('WellOperation', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	uploadId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	date: {
		type: DataTypes.DATEONLY,
		allowNull: false
	},
	well: {
		type: DataTypes.STRING,
		allowNull: false
	},
	production: {
		type: DataTypes.FLOAT,
		defaultValue: 0
	},
	consumption: {
		type: DataTypes.FLOAT,
		defaultValue: 0
	},
	location: {
		type: DataTypes.STRING
	},
	status: {
		type: DataTypes.STRING
	},
	efficiency: {
		type: DataTypes.FLOAT
	},
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['date'] },
		{ fields: ['well'] },
		{ fields: ['location'] }
	]
})

module.exports = WellOperation