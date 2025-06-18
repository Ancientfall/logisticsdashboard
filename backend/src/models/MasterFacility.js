const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const MasterFacility = sequelize.define('MasterFacility', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	locationID: {
		type: DataTypes.INTEGER,
		allowNull: false,
		unique: true
	},
	locationName: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true
	},
	displayName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	facilityType: {
		type: DataTypes.ENUM('Production', 'Drilling', 'Integrated'),
		allowNull: false
	},
	parentFacility: {
		type: DataTypes.STRING
	},
	region: {
		type: DataTypes.STRING,
		allowNull: false
	},
	isActive: {
		type: DataTypes.BOOLEAN,
		defaultValue: true
	},
	sortOrder: {
		type: DataTypes.INTEGER,
		defaultValue: 0
	},
	productionLCs: {
		type: DataTypes.TEXT, // Store as comma-separated string
		get() {
			const value = this.getDataValue('productionLCs')
			return value ? value.split(',').map(lc => lc.trim()) : []
		},
		set(value) {
			if (Array.isArray(value)) {
				this.setDataValue('productionLCs', value.join(','))
			} else {
				this.setDataValue('productionLCs', value)
			}
		}
	},
	drillingLCs: {
		type: DataTypes.TEXT, // Store as comma-separated string
		get() {
			const value = this.getDataValue('drillingLCs')
			return value ? value.split(',').map(lc => lc.trim()) : []
		},
		set(value) {
			if (Array.isArray(value)) {
				this.setDataValue('drillingLCs', value.join(','))
			} else {
				this.setDataValue('drillingLCs', value)
			}
		}
	},
	isProductionCapable: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	isDrillingCapable: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	category: {
		type: DataTypes.ENUM('Production Facilities', 'Drilling Rigs', 'Integrated Facilities'),
		allowNull: false
	},
	isIntegrated: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	notes: {
		type: DataTypes.TEXT
	}
}, {
	tableName: 'master_facilities',
	timestamps: true,
	indexes: [
		{
			fields: ['locationName']
		},
		{
			fields: ['facilityType']
		},
		{
			fields: ['isActive']
		},
		{
			fields: ['isProductionCapable']
		},
		{
			fields: ['isDrillingCapable']
		}
	]
})

module.exports = MasterFacility