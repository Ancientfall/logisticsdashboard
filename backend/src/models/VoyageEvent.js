const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const VoyageEvent = sequelize.define('VoyageEvent', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	uploadId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	mission: {
		type: DataTypes.STRING,
		allowNull: false
	},
	event: {
		type: DataTypes.STRING,
		allowNull: false
	},
	parentEvent: {
		type: DataTypes.STRING
	},
	location: {
		type: DataTypes.STRING
	},
	quay: {
		type: DataTypes.STRING
	},
	remarks: {
		type: DataTypes.TEXT
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	},
	from: {
		type: DataTypes.STRING
	},
	to: {
		type: DataTypes.STRING
	},
	hours: {
		type: DataTypes.FLOAT
	},
	portType: {
		type: DataTypes.STRING
	},
	eventCategory: {
		type: DataTypes.STRING
	},
	year: {
		type: DataTypes.INTEGER
	},
	ins500m: {
		type: DataTypes.BOOLEAN
	},
	costDedicatedTo: {
		type: DataTypes.STRING
	},
	vessel: {
		type: DataTypes.STRING
	},
	voyageNumber: {
		type: DataTypes.STRING
	},
	// Enhanced fields from IndexedDB processors
	mappedLocation: {
		type: DataTypes.STRING
	},
	finalHours: {
		type: DataTypes.FLOAT
	},
	eventDate: {
		type: DataTypes.DATE
	},
	department: {
		type: DataTypes.STRING
	},
	lcNumber: {
		type: DataTypes.STRING
	},
	lcPercentage: {
		type: DataTypes.FLOAT
	},
	mappingStatus: {
		type: DataTypes.STRING
	},
	dataIntegrity: {
		type: DataTypes.STRING
	},
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	},
	
	// Additional computed fields to match IndexedDB processors
	eventYear: {
		type: DataTypes.INTEGER
	},
	quarter: {
		type: DataTypes.STRING
	},
	monthNumber: {
		type: DataTypes.INTEGER
	},
	monthName: {
		type: DataTypes.STRING
	},
	weekOfYear: {
		type: DataTypes.INTEGER
	},
	dayOfWeek: {
		type: DataTypes.STRING
	},
	dayOfMonth: {
		type: DataTypes.INTEGER
	},
	locationType: {
		type: DataTypes.STRING
	},
	activityCategory: {
		type: DataTypes.STRING
	},
	company: {
		type: DataTypes.STRING
	},
	vesselCostTotal: {
		type: DataTypes.FLOAT
	},
	vesselDailyRate: {
		type: DataTypes.FLOAT
	},
	vesselHourlyRate: {
		type: DataTypes.FLOAT
	},
	standardizedVoyageNumber: {
		type: DataTypes.STRING
	},
	
	// Additional enhanced fields from utility analysis
	projectType: {
		type: DataTypes.STRING
	},
	enhancedDepartment: {
		type: DataTypes.STRING
	},
	rigLocation: {
		type: DataTypes.STRING
	},
	dataQualityScore: {
		type: DataTypes.INTEGER
	},
	dataQualityIssues: {
		type: DataTypes.TEXT
	},
	fluidCategory: {
		type: DataTypes.STRING
	},
	vesselType: {
		type: DataTypes.STRING
	},
	
	// Voyage processing fields
	uniqueVoyageId: {
		type: DataTypes.STRING
	},
	standardizedVoyageId: {
		type: DataTypes.STRING
	},
	locationList: {
		type: DataTypes.ARRAY(DataTypes.STRING)
	},
	stopCount: {
		type: DataTypes.INTEGER
	},
	durationHours: {
		type: DataTypes.DECIMAL(10, 2)
	},
	voyagePurpose: {
		type: DataTypes.STRING
	},
	voyagePattern: {
		type: DataTypes.STRING
	},
	isStandardPattern: {
		type: DataTypes.BOOLEAN
	},
	includesProduction: {
		type: DataTypes.BOOLEAN
	},
	includesDrilling: {
		type: DataTypes.BOOLEAN
	},
	includesThunderHorse: {
		type: DataTypes.BOOLEAN
	},
	includesMadDog: {
		type: DataTypes.BOOLEAN
	},
	originPort: {
		type: DataTypes.STRING
	},
	mainDestination: {
		type: DataTypes.STRING
	},
	standardizedLocation: {
		type: DataTypes.STRING
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['mission'] },
		{ fields: ['vessel'] },
		{ fields: ['voyageNumber'] }
		// Unique constraint removed temporarily due to existing duplicates
		// Use cleanVoyageEventDuplicates.js script to clean data and re-add constraint:
		// node src/scripts/cleanVoyageEventDuplicates.js --dry-run (to preview)
		// node src/scripts/cleanVoyageEventDuplicates.js (to execute)
	]
})

module.exports = VoyageEvent