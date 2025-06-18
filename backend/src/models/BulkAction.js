const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const BulkAction = sequelize.define('BulkAction', {
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
		type: DataTypes.STRING
	},
	voyageNumber: {
		type: DataTypes.STRING
	},
	manifestNumber: {
		type: DataTypes.STRING
	},
	manifestDate: {
		type: DataTypes.DATEONLY
	},
	from: {
		type: DataTypes.STRING
	},
	to: {
		type: DataTypes.STRING
	},
	cargoType: {
		type: DataTypes.STRING
	},
	cargoDescription: {
		type: DataTypes.TEXT
	},
	quantity: {
		type: DataTypes.FLOAT
	},
	unit: {
		type: DataTypes.STRING
	},
	weight: {
		type: DataTypes.FLOAT
	},
	volume: {
		type: DataTypes.FLOAT
	},
	costCode: {
		type: DataTypes.STRING
	},
	projectCode: {
		type: DataTypes.STRING
	},
	department: {
		type: DataTypes.STRING
	},
	status: {
		type: DataTypes.STRING,
		defaultValue: 'pending'
	},
	actionType: {
		type: DataTypes.STRING
	},
	completedDate: {
		type: DataTypes.DATE
	},
	remarks: {
		type: DataTypes.TEXT
	},

	// Enhanced fields matching IndexedDB processing
	portType: {
		type: DataTypes.STRING
	},
	startDate: {
		type: DataTypes.DATE
	},
	action: {
		type: DataTypes.STRING
	},
	qty: {
		type: DataTypes.FLOAT
	},
	ppg: {
		type: DataTypes.FLOAT
	},
	bulkType: {
		type: DataTypes.STRING
	},
	bulkDescription: {
		type: DataTypes.TEXT
	},
	fluidClassification: {
		type: DataTypes.STRING
	},
	fluidCategory: {
		type: DataTypes.STRING
	},
	fluidSpecificType: {
		type: DataTypes.STRING
	},
	isDrillingFluid: {
		type: DataTypes.BOOLEAN
	},
	isCompletionFluid: {
		type: DataTypes.BOOLEAN
	},
	productionChemicalType: {
		type: DataTypes.STRING
	},
	atPort: {
		type: DataTypes.STRING
	},
	standardizedOrigin: {
		type: DataTypes.STRING
	},
	destinationPort: {
		type: DataTypes.STRING
	},
	standardizedDestination: {
		type: DataTypes.STRING
	},
	productionPlatform: {
		type: DataTypes.STRING
	},
	volumeBbls: {
		type: DataTypes.FLOAT
	},
	volumeGals: {
		type: DataTypes.FLOAT
	},
	isReturn: {
		type: DataTypes.BOOLEAN
	},
	monthNumber: {
		type: DataTypes.INTEGER
	},
	year: {
		type: DataTypes.INTEGER
	},
	monthName: {
		type: DataTypes.STRING
	},
	monthYear: {
		type: DataTypes.STRING
	},
	tank: {
		type: DataTypes.STRING
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
	},
	fluidType: {
		type: DataTypes.STRING
	},
	description: {
		type: DataTypes.TEXT
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['vesselName'] },
		{ fields: ['voyageNumber'] },
		{ fields: ['manifestNumber'] }
	]
})

module.exports = BulkAction