const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const FluidAnalysis = sequelize.define('FluidAnalysis', {
	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},
	uploadId: {
		type: DataTypes.UUID,
		allowNull: false
	},
	date: {
		type: DataTypes.DATEONLY,
		allowNull: false
	},
	well: {
		type: DataTypes.STRING,
		allowNull: false
	},
	sample: {
		type: DataTypes.STRING,
		allowNull: false
	},
	oilContent: {
		type: DataTypes.FLOAT
	},
	waterContent: {
		type: DataTypes.FLOAT
	},
	gasContent: {
		type: DataTypes.FLOAT
	},
	pressure: {
		type: DataTypes.FLOAT
	},
	temperature: {
		type: DataTypes.FLOAT
	},
	metadata: {
		type: DataTypes.JSONB,
		defaultValue: {}
	}
}, {
	timestamps: true,
	indexes: [
		{ fields: ['uploadId'] },
		{ fields: ['date'] },
		{ fields: ['well'] },
		{ fields: ['sample'] }
	]
})

module.exports = FluidAnalysis