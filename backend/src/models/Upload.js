const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Upload = sequelize.define('Upload', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	userId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	fileName: {
		type: DataTypes.STRING,
		allowNull: false
	},
	fileSize: {
		type: DataTypes.INTEGER,
		allowNull: false
	},
	dataType: {
		type: DataTypes.ENUM(
			'wells', 
			'vessels', 
			'fluid-analyses',
			'voyage-events',
			'vessel-manifests',
			'cost-allocations',
			'bulk-actions',
			'voyage-lists'
		),
		allowNull: false
	},
	status: {
		type: DataTypes.ENUM('processing', 'completed', 'failed'),
		defaultValue: 'processing'
	},
	recordsProcessed: {
		type: DataTypes.INTEGER,
		defaultValue: 0
	},
	recordsFailed: {
		type: DataTypes.INTEGER,
		defaultValue: 0
	},
	errorMessage: {
		type: DataTypes.TEXT
	},
	processingTime: {
		type: DataTypes.INTEGER // milliseconds
	},
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true
})

module.exports = Upload