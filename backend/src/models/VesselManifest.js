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