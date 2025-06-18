const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const VesselManifest = sequelize.define('VesselManifest', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	uploadId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	voyageId: {
		type: DataTypes.STRING,
		allowNull: false
	},
	manifestNumber: {
		type: DataTypes.STRING
	},
	transporter: {
		type: DataTypes.STRING
	},
	type: {
		type: DataTypes.STRING
	},
	manifestDate: {
		type: DataTypes.DATEONLY
	},
	costCode: {
		type: DataTypes.STRING
	},
	from: {
		type: DataTypes.STRING
	},
	offshoreLocation: {
		type: DataTypes.STRING
	},
	deckLbs: {
		type: DataTypes.FLOAT
	},
	deckTons: {
		type: DataTypes.FLOAT
	},
	rtTons: {
		type: DataTypes.FLOAT
	},
	lifts: {
		type: DataTypes.INTEGER
	},
	wetBulkBbls: {
		type: DataTypes.FLOAT
	},
	wetBulkGals: {
		type: DataTypes.FLOAT
	},
	deckSqft: {
		type: DataTypes.FLOAT
	},
	remarks: {
		type: DataTypes.TEXT
	},
	year: {
		type: DataTypes.INTEGER
	},

	// Enhanced fields matching IndexedDB processing
	standardizedTransporter: {
		type: DataTypes.STRING
	},
	standardizedFrom: {
		type: DataTypes.STRING
	},
	standardizedOffshoreLocation: {
		type: DataTypes.STRING
	},
	company: {
		type: DataTypes.STRING
	},
	facilityName: {
		type: DataTypes.STRING
	},
	facilityType: {
		type: DataTypes.STRING
	},
	department: {
		type: DataTypes.STRING
	},
	lcNumber: {
		type: DataTypes.STRING
	},
	costAllocationData: {
		type: DataTypes.JSONB
	},
	month: {
		type: DataTypes.INTEGER
	},
	monthName: {
		type: DataTypes.STRING
	},
	monthYear: {
		type: DataTypes.STRING
	},
	totalWeight: {
		type: DataTypes.FLOAT
	},
	totalVolume: {
		type: DataTypes.FLOAT
	},
	cargoEfficiency: {
		type: DataTypes.FLOAT
	},
	liftsPerTon: {
		type: DataTypes.FLOAT
	},
	utilizationPercentage: {
		type: DataTypes.FLOAT
	},
	voyageSegmentId: {
		type: DataTypes.STRING
	},
	voyageSegmentInfo: {
		type: DataTypes.JSONB
	},
	processedAt: {
		type: DataTypes.DATE
	},

	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['voyageId'] },
		{ fields: ['manifestNumber'] }
	]
})

module.exports = VesselManifest