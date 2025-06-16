const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const CostAllocation = sequelize.define('CostAllocation', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	uploadId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	lcNumber: {
		type: DataTypes.STRING,
		allowNull: false
	},
	rigReference: {
		type: DataTypes.STRING
	},
	description: {
		type: DataTypes.TEXT
	},
	costElement: {
		type: DataTypes.STRING
	},
	monthYear: {
		type: DataTypes.STRING
	},
	mission: {
		type: DataTypes.STRING
	},
	projectType: {
		type: DataTypes.STRING
	},
	allocatedDays: {
		type: DataTypes.FLOAT
	},
	avgVesselCostPerDay: {
		type: DataTypes.DECIMAL(10, 2)
	},
	totalCost: {
		type: DataTypes.DECIMAL(10, 2)
	},
	rigLocation: {
		type: DataTypes.STRING
	},
	rigType: {
		type: DataTypes.STRING
	},
	waterDepth: {
		type: DataTypes.STRING
	},
	department: {
		type: DataTypes.ENUM('Drilling', 'Production', 'Logistics', 'Maintenance', 'Operations'),
		allowNull: true
	},
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['lcNumber'] },
		{ fields: ['department'] }
	]
})

module.exports = CostAllocation