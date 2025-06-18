const { sequelize } = require('../config/database')
const { VoyageEvent } = require('../models')
const logger = require('../utils/logger')

const getVoyageStatistics = async () => {
	try {
		logger.info('📊 Gathering comprehensive voyage statistics...')
		
		// Total records
		const totalRecords = await VoyageEvent.count()
		logger.info(`Total voyage events: ${totalRecords}`)
		
		// Total unique voyages
		const uniqueVoyages = await VoyageEvent.count({
			distinct: true,
			col: 'uniqueVoyageId',
			where: { uniqueVoyageId: { [require('sequelize').Op.ne]: null } }
		})
		logger.info(`Total unique voyages: ${uniqueVoyages}`)
		
		// Unique voyage numbers
		const uniqueVoyageNumbers = await VoyageEvent.count({
			distinct: true,
			col: 'voyageNumber',
			where: { voyageNumber: { [require('sequelize').Op.ne]: null } }
		})
		logger.info(`Total unique voyage numbers: ${uniqueVoyageNumbers}`)
		
		// Unique vessels
		const uniqueVessels = await VoyageEvent.count({
			distinct: true,
			col: 'vessel',
			where: { vessel: { [require('sequelize').Op.ne]: null } }
		})
		logger.info(`Total unique vessels: ${uniqueVessels}`)
		
		// Date range
		const dateRange = await sequelize.query(`
			SELECT 
				MIN("eventDate") as earliest_date,
				MAX("eventDate") as latest_date,
				EXTRACT(YEAR FROM MAX("eventDate")) - EXTRACT(YEAR FROM MIN("eventDate")) + 1 as year_span
			FROM "VoyageEvents"
			WHERE "eventDate" IS NOT NULL
		`, { type: sequelize.QueryTypes.SELECT })
		
		logger.info('Date range:', dateRange[0])
		
		// Monthly voyage distribution
		const monthlyStats = await sequelize.query(`
			SELECT 
				EXTRACT(YEAR FROM "eventDate") as year,
				EXTRACT(MONTH FROM "eventDate") as month,
				COUNT(DISTINCT "uniqueVoyageId") as unique_voyages,
				COUNT(*) as total_events
			FROM "VoyageEvents"
			WHERE "eventDate" IS NOT NULL AND "uniqueVoyageId" IS NOT NULL
			GROUP BY EXTRACT(YEAR FROM "eventDate"), EXTRACT(MONTH FROM "eventDate")
			ORDER BY year, month
		`, { type: sequelize.QueryTypes.SELECT })
		
		logger.info(`Monthly distribution (first 10):`, monthlyStats.slice(0, 10))
		
		// Voyage purpose distribution
		const purposeStats = await sequelize.query(`
			SELECT 
				"voyagePurpose",
				COUNT(DISTINCT "uniqueVoyageId") as unique_voyages,
				COUNT(*) as total_events
			FROM "VoyageEvents"
			WHERE "uniqueVoyageId" IS NOT NULL
			GROUP BY "voyagePurpose"
			ORDER BY unique_voyages DESC
		`, { type: sequelize.QueryTypes.SELECT })
		
		logger.info('Voyage purpose distribution:', purposeStats)
		
		// Top vessels by voyage count
		const vesselStats = await sequelize.query(`
			SELECT 
				"vessel",
				COUNT(DISTINCT "uniqueVoyageId") as unique_voyages,
				COUNT(*) as total_events
			FROM "VoyageEvents"
			WHERE "uniqueVoyageId" IS NOT NULL
			GROUP BY "vessel"
			ORDER BY unique_voyages DESC
			LIMIT 10
		`, { type: sequelize.QueryTypes.SELECT })
		
		logger.info('Top 10 vessels by voyage count:', vesselStats)
		
		// Records with missing voyage processing
		const missingVoyageProcessing = await VoyageEvent.count({
			where: { uniqueVoyageId: null }
		})
		
		logger.info(`Records missing voyage processing: ${missingVoyageProcessing}`)
		
		// Summary statistics
		const summary = {
			totalRecords,
			uniqueVoyages,
			uniqueVoyageNumbers,
			uniqueVessels,
			missingVoyageProcessing,
			dateRange: dateRange[0],
			monthlyAverage: Math.round(uniqueVoyages / monthlyStats.length),
			totalMonths: monthlyStats.length
		}
		
		logger.info('📈 Summary Statistics:', summary)
		
		return summary
		
	} catch (error) {
		logger.error('❌ Error gathering voyage statistics:', error)
		throw error
	}
}

// Run if called directly
if (require.main === module) {
	getVoyageStatistics()
		.then((stats) => {
			logger.info('✅ Voyage statistics completed')
			process.exit(0)
		})
		.catch((error) => {
			logger.error('❌ Voyage statistics failed:', error)
			process.exit(1)
		})
}

module.exports = { getVoyageStatistics }