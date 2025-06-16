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
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['mission'] },
		{ fields: ['vessel'] },
		{ fields: ['voyageNumber'] }
	]
})

module.exports = VoyageEvent