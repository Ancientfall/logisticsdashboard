const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const VesselClassification = sequelize.define('VesselClassification', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	vesselName: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true
	},
	standardizedVesselName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	company: {
		type: DataTypes.STRING,
		allowNull: false
	},
	size: {
		type: DataTypes.INTEGER,
		allowNull: false,
		comment: 'Length in feet'
	},
	vesselType: {
		type: DataTypes.ENUM('OSV', 'FSV', 'Specialty', 'Support', 'AHTS', 'MSV', 'PSV'),
		allowNull: false
	},
	category: {
		type: DataTypes.ENUM('Supply', 'Support', 'Specialized', 'Multi-Purpose'),
		allowNull: false
	},
	vesselCategory: {
		type: DataTypes.STRING,
		allowNull: false
	},
	sizeCategory: {
		type: DataTypes.ENUM('Small', 'Medium', 'Large'),
		allowNull: false
	},
	// Capacity information
	deckSpace: {
		type: DataTypes.FLOAT,
		comment: 'Deck space in m²'
	},
	fuelCapacity: {
		type: DataTypes.FLOAT,
		comment: 'Fuel capacity in m³'
	},
	waterCapacity: {
		type: DataTypes.FLOAT,
		comment: 'Water capacity in m³'
	},
	mudCapacity: {
		type: DataTypes.FLOAT,
		comment: 'Mud capacity in m³'
	},
	// Specifications
	length: {
		type: DataTypes.FLOAT,
		comment: 'Length in meters'
	},
	beam: {
		type: DataTypes.FLOAT,
		comment: 'Beam in meters'
	},
	draft: {
		type: DataTypes.FLOAT,
		comment: 'Draft in meters'
	},
	bollardPull: {
		type: DataTypes.FLOAT,
		comment: 'Bollard pull in tonnes (for AHTS)'
	},
	// Additional information
	yearBuilt: {
		type: DataTypes.INTEGER
	},
	flag: {
		type: DataTypes.STRING
	},
	operationalArea: {
		type: DataTypes.TEXT, // Store as JSON array
		get() {
			const value = this.getDataValue('operationalArea')
			try {
				return value ? JSON.parse(value) : []
			} catch {
				return []
			}
		},
		set(value) {
			if (Array.isArray(value)) {
				this.setDataValue('operationalArea', JSON.stringify(value))
			} else {
				this.setDataValue('operationalArea', value)
			}
		}
	},
	status: {
		type: DataTypes.ENUM('Active', 'Standby', 'Maintenance', 'Retired'),
		defaultValue: 'Active'
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	}
}, {
	tableName: 'vessel_classifications',
	timestamps: true,
	indexes: [
		{
			fields: ['vesselName']
		},
		{
			fields: ['standardizedVesselName']
		},
		{
			fields: ['company']
		},
		{
			fields: ['vesselType']
		},
		{
			fields: ['category']
		},
		{
			fields: ['sizeCategory']
		},
		{
			fields: ['isActive']
		},
		{
			fields: ['status']
		}
	]
})

module.exports = VesselClassification