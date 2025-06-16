const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Vessel = sequelize.define('Vessel', {
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
	vessel: {
		type: DataTypes.STRING,
		allowNull: false
	},
	location: {
		type: DataTypes.STRING
	},
	cargo: {
		type: DataTypes.STRING
	},
	status: {
		type: DataTypes.STRING
	},
	eta: {
		type: DataTypes.DATE
	},
	capacity: {
		type: DataTypes.FLOAT
	},
	utilization: {
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
		{ fields: ['vessel'] },
		{ fields: ['location'] },
		{ fields: ['status'] }
	]
})

module.exports = Vessel