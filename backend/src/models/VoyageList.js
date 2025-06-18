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

	// Enhanced fields matching IndexedDB processing
	standardizedVesselName: {
		type: DataTypes.STRING
	},
	month: {
		type: DataTypes.STRING
	},
	year: {
		type: DataTypes.INTEGER
	},
	startDate: {
		type: DataTypes.DATE
	},
	endDate: {
		type: DataTypes.DATE
	},
	type: {
		type: DataTypes.STRING
	},
	mission: {
		type: DataTypes.STRING
	},
	routeType: {
		type: DataTypes.STRING
	},
	locations: {
		type: DataTypes.TEXT
	},
	locationList: {
		type: DataTypes.JSONB
	},
	locationCount: {
		type: DataTypes.INTEGER
	},
	hasProduction: {
		type: DataTypes.BOOLEAN
	},
	hasDrilling: {
		type: DataTypes.BOOLEAN
	},
	isSupplyRun: {
		type: DataTypes.BOOLEAN
	},
	isDrillingSupport: {
		type: DataTypes.BOOLEAN
	},
	isProductionSupport: {
		type: DataTypes.BOOLEAN
	},
	locationType: {
		type: DataTypes.STRING
	},
	voyageClassification: {
		type: DataTypes.STRING
	},
	department: {
		type: DataTypes.STRING
	},
	durationDays: {
		type: DataTypes.FLOAT
	},
	durationHours: {
		type: DataTypes.FLOAT
	},
	distanceCalculated: {
		type: DataTypes.FLOAT
	},
	fuelEfficiency: {
		type: DataTypes.FLOAT
	},
	speedAverage: {
		type: DataTypes.FLOAT
	},
	utilizationPercentage: {
		type: DataTypes.FLOAT
	},
	costPerDay: {
		type: DataTypes.FLOAT
	},
	costPerNauticalMile: {
		type: DataTypes.FLOAT
	},
	efficiencyScore: {
		type: DataTypes.FLOAT
	},
	company: {
		type: DataTypes.STRING
	},
	monthNumber: {
		type: DataTypes.INTEGER
	},
	monthName: {
		type: DataTypes.STRING
	},
	monthYear: {
		type: DataTypes.STRING
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