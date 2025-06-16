const { Sequelize } = require('sequelize')
const logger = require('../utils/logger')

const sequelize = new Sequelize({
	dialect: 'postgres',
	host: process.env.DB_HOST || 'localhost',
	port: process.env.DB_PORT || 5432,
	database: process.env.DB_NAME || 'bp_logistics',
	username: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
	logging: (msg) => logger.debug(msg),
	pool: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000
	},
	dialectOptions: {
		ssl: process.env.NODE_ENV === 'production' ? {
			require: true,
			rejectUnauthorized: false
		} : false
	}
})

module.exports = { sequelize, Sequelize }