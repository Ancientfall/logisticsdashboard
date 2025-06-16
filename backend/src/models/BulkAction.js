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
		{ fields: ['manifestNumber'] }
	]
})

module.exports = BulkAction