const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const VoyageList = sequelize.define('VoyageList', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	uploadId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	vesselName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	voyageNumber: {
		type: DataTypes.STRING,
		allowNull: false
	},
	voyageType: {
		type: DataTypes.STRING
	},
	departurePort: {
		type: DataTypes.STRING
	},
	departureDate: {
		type: DataTypes.DATEONLY
	},
	arrivalPort: {
		type: DataTypes.STRING
	},
	arrivalDate: {
		type: DataTypes.DATEONLY
	},
	voyageDuration: {
		type: DataTypes.FLOAT,
		comment: 'Duration in days'
	},
	totalDistance: {
		type: DataTypes.FLOAT,
		comment: 'Distance in nautical miles'
	},
	fuelConsumption: {
		type: DataTypes.FLOAT,
		comment: 'Fuel in metric tons'
	},
	cargoCapacity: {
		type: DataTypes.FLOAT
	},
	cargoUtilization: {
		type: DataTypes.FLOAT,
		comment: 'Percentage of capacity used'
	},
	voyageStatus: {
		type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled'),
		defaultValue: 'planned'
	},
	charterer: {
		type: DataTypes.STRING
	},
	operator: {
		type: DataTypes.STRING
	},
	masterName: {
		type: DataTypes.STRING
	},
	totalCrew: {
		type: DataTypes.INTEGER
	},
	voyagePurpose: {
		type: DataTypes.STRING
	},
	totalRevenue: {
		type: DataTypes.DECIMAL(10, 2)
	},
	totalCost: {
		type: DataTypes.DECIMAL(10, 2)
	},
	profit: {
		type: DataTypes.DECIMAL(10, 2)
	},
	remarks: {
		type: DataTypes.TEXT
	},
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['vesselName'] },
		{ fields: ['voyageNumber'] },
		{ fields: ['voyageStatus'] }
	]
})

module.exports = VoyageList