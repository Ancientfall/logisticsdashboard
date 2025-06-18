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

	// Enhanced fields matching IndexedDB processing
	costAllocationDate: {
		type: DataTypes.DATE
	},
	month: {
		type: DataTypes.INTEGER
	},
	year: {
		type: DataTypes.INTEGER
	},
	monthName: {
		type: DataTypes.STRING
	},
	standardizedLCNumber: {
		type: DataTypes.STRING
	},
	standardizedRigReference: {
		type: DataTypes.STRING
	},
	projectCategory: {
		type: DataTypes.STRING
	},
	waterDepthCategory: {
		type: DataTypes.STRING
	},
	waterDepthMeters: {
		type: DataTypes.FLOAT
	},
	location: {
		type: DataTypes.STRING
	},
	costPerHour: {
		type: DataTypes.FLOAT
	},
	costEfficiency: {
		type: DataTypes.FLOAT
	},
	utilizationPercentage: {
		type: DataTypes.FLOAT
	},
	productivityScore: {
		type: DataTypes.FLOAT
	},
	costVariance: {
		type: DataTypes.FLOAT
	},
	budgetUtilization: {
		type: DataTypes.FLOAT
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	},

	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	},
	
	// Additional enhanced fields
	dataQualityScore: {
		type: DataTypes.INTEGER
	},
	dataQualityIssues: {
		type: DataTypes.TEXT
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