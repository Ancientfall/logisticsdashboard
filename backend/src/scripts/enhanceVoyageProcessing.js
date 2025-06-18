const { sequelize } = require('../config/database')
const { Op } = require('sequelize')
const { VoyageEvent, VesselManifest, VoyageList } = require('../models')
const logger = require('../utils/logger')

// Location standardization mapping (based on frontend utils)
const locationStandardization = {
	'fourchon': 'Fourchon',
	'port fourchon': 'Fourchon',
	'thunder horse': 'Thunder Horse',
	'thunder horse pdq': 'Thunder Horse',
	'mad dog': 'Mad Dog',
	'mad dog spar': 'Mad Dog',
	'mad dog 2': 'Mad Dog 2',
	'na kika': 'Na Kika',
	'atlantis': 'Atlantis',
	'argos': 'Argos',
	'venice': 'Venice',
	'morgan city': 'Morgan City'
}

// Facility classification
const facilityClassification = {
	'Thunder Horse': { type: 'Production', department: 'Production', isIntegrated: true },
	'Mad Dog': { type: 'Production', department: 'Production', isIntegrated: false },
	'Mad Dog 2': { type: 'Production', department: 'Production', isIntegrated: false },
	'Na Kika': { type: 'Production', department: 'Production', isIntegrated: false },
	'Atlantis': { type: 'Production', department: 'Production', isIntegrated: false },
	'Argos': { type: 'Production', department: 'Production', isIntegrated: false },
	'Fourchon': { type: 'Logistics', department: 'Logistics', isIntegrated: false },
	'Venice': { type: 'Logistics', department: 'Logistics', isIntegrated: false },
	'Morgan City': { type: 'Logistics', department: 'Logistics', isIntegrated: false }
}

// Generate unique voyage ID in format: Year_Month_Vessel_VoyageNumber
const generateUniqueVoyageId = (eventDate, vessel, voyageNumber) => {
	if (!eventDate || !vessel || !voyageNumber) return null
	
	const date = new Date(eventDate)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const cleanVessel = vessel.replace(/\s+/g, '_')
	const cleanVoyageNumber = String(voyageNumber).trim()
	
	return `${year}_${month}_${cleanVessel}_${cleanVoyageNumber}`
}

// Generate standardized voyage ID in format: YYYY-MM-Vessel-VVV
const generateStandardizedVoyageId = (eventDate, vessel, voyageNumber) => {
	if (!eventDate || !vessel || !voyageNumber) return null
	
	const date = new Date(eventDate)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const cleanVessel = vessel.replace(/\s+/g, '-')
	const paddedVoyageNumber = String(voyageNumber).trim().padStart(3, '0')
	
	return `${year}-${month}-${cleanVessel}-${paddedVoyageNumber}`
}

// Standardize location names
const standardizeLocation = (location) => {
	if (!location) return null
	
	const normalized = location.toLowerCase().trim()
	return locationStandardization[normalized] || location
}

// Parse location list (handles arrow-separated strings like "Fourchon -> Thunder Horse -> Mad Dog")
const parseLocationList = (locationString) => {
	if (!locationString) return []
	
	// Handle various separators
	const separators = ['->', '→', '>', ',', ';']
	let locations = [locationString]
	
	for (const separator of separators) {
		if (locationString.includes(separator)) {
			locations = locationString.split(separator)
			break
		}
	}
	
	return locations
		.map(loc => standardizeLocation(loc.trim()))
		.filter(loc => loc && loc.length > 0)
}

// Determine voyage purpose based on destinations
const determineVoyagePurpose = (locationList) => {
	if (!locationList || locationList.length === 0) return 'Other'
	
	let hasProduction = false
	let hasDrilling = false
	
	for (const location of locationList) {
		const facility = facilityClassification[location]
		if (facility) {
			if (facility.department === 'Production') hasProduction = true
			if (facility.department === 'Drilling') hasDrilling = true
		}
	}
	
	if (hasProduction && hasDrilling) return 'Mixed'
	if (hasProduction) return 'Production'
	if (hasDrilling) return 'Drilling'
	return 'Other'
}

// Calculate voyage duration from voyage events
const calculateVoyageDuration = async (uniqueVoyageId) => {
	try {
		const events = await VoyageEvent.findAll({
			where: { uniqueVoyageId },
			order: [['eventDate', 'ASC']]
		})
		
		if (events.length === 0) return 0
		
		// Sum all final hours for the voyage
		const totalHours = events.reduce((sum, event) => {
			return sum + (event.finalHours || event.hours || 0)
		}, 0)
		
		return Math.round(totalHours * 100) / 100 // 2 decimal places
	} catch (error) {
		logger.error('Error calculating voyage duration:', error)
		return 0
	}
}

// Determine voyage pattern
const determineVoyagePattern = (locationList) => {
	if (!locationList || locationList.length < 2) return 'Unknown'
	
	const origin = locationList[0]
	const destination = locationList[locationList.length - 1]
	
	// Check if it's a round trip (starts and ends at same location)
	if (origin === destination && locationList.length > 2) {
		return 'Round Trip'
	}
	
	// Check for standard patterns
	if (origin === 'Fourchon') {
		return 'Outbound'
	}
	
	if (destination === 'Fourchon') {
		return 'Return'
	}
	
	// If no Fourchon involved, it's likely offshore transfer
	const hasLogisticsBase = locationList.some(loc => 
		['Fourchon', 'Venice', 'Morgan City'].includes(loc)
	)
	
	if (!hasLogisticsBase) {
		return 'Offshore Transfer'
	}
	
	return 'Other'
}

// Determine if voyage follows standard patterns
const isStandardPattern = (locationList, voyagePattern) => {
	if (!locationList || locationList.length < 2) return false
	
	// Standard patterns:
	// 1. Fourchon -> Offshore facility (Outbound)
	// 2. Offshore facility -> Fourchon (Return)
	// 3. Fourchon -> Offshore -> Fourchon (Round Trip)
	
	switch (voyagePattern) {
		case 'Outbound':
			return locationList[0] === 'Fourchon' && locationList.length === 2
		case 'Return':
			return locationList[locationList.length - 1] === 'Fourchon' && locationList.length === 2
		case 'Round Trip':
			return locationList[0] === 'Fourchon' && 
			       locationList[locationList.length - 1] === 'Fourchon' &&
			       locationList.length === 3
		default:
			return false
	}
}

const enhanceVoyageProcessing = async () => {
	try {
		logger.info('🚢 Starting voyage processing enhancement...')
		
		// Step 1: Enhance VoyageEvent records with voyage-specific processing
		logger.info('📊 Processing VoyageEvent records...')
		
		const voyageEvents = await VoyageEvent.findAll({
			where: {
				[Op.or]: [
					{ uniqueVoyageId: null },
					{ standardizedVoyageId: null },
					{ voyagePurpose: null }
				]
			},
			order: [['createdAt', 'ASC']]
		})
		
		logger.info(`Found ${voyageEvents.length} voyage events to enhance`)
		
		if (voyageEvents.length > 0) {
			const batchSize = 1000
			for (let i = 0; i < voyageEvents.length; i += batchSize) {
				const batch = voyageEvents.slice(i, i + batchSize)
				
				await sequelize.transaction(async (transaction) => {
					const updatePromises = batch.map(async (event) => {
						// Generate voyage IDs
						const uniqueVoyageId = generateUniqueVoyageId(
							event.eventDate,
							event.vessel,
							event.voyageNumber
						)
						
						const standardizedVoyageId = generateStandardizedVoyageId(
							event.eventDate,
							event.vessel,
							event.voyageNumber
						)
						
						// Parse location information
						const locationList = parseLocationList(event.location)
						const standardizedLocation = standardizeLocation(event.location)
						
						// Determine voyage characteristics
						const voyagePurpose = determineVoyagePurpose(locationList)
						const voyagePattern = determineVoyagePattern(locationList)
						const isStandardVoyage = isStandardPattern(locationList, voyagePattern)
						
						// Extract origin and destination
						const originPort = locationList.length > 0 ? locationList[0] : standardizedLocation
						const mainDestination = locationList.length > 1 ? 
							locationList[locationList.length - 1] : standardizedLocation
						
						// Facility-specific flags
						const includesProduction = locationList.some(loc => {
							const facility = facilityClassification[loc]
							return facility?.department === 'Production'
						})
						
						const includesDrilling = locationList.some(loc => {
							const facility = facilityClassification[loc]
							return facility?.department === 'Drilling'
						})
						
						const includesThunderHorse = locationList.includes('Thunder Horse')
						const includesMadDog = locationList.some(loc => 
							loc.includes('Mad Dog')
						)
						
						// Update the record
						await event.update({
							uniqueVoyageId,
							standardizedVoyageId,
							locationList: locationList,
							stopCount: locationList.length,
							voyagePurpose,
							voyagePattern,
							isStandardPattern: isStandardVoyage,
							includesProduction,
							includesDrilling,
							includesThunderHorse,
							includesMadDog,
							originPort,
							mainDestination,
							standardizedLocation
						}, { transaction })
						
						return true
					})
					
					await Promise.all(updatePromises)
					logger.info(`✅ Enhanced batch ${Math.ceil((i + batchSize) / batchSize)} - ${Math.min(i + batchSize, voyageEvents.length)}/${voyageEvents.length} voyage events`)
				})
			}
		}
		
		// Step 2: Calculate voyage durations for unique voyages
		logger.info('⏱️ Calculating voyage durations...')
		
		const uniqueVoyages = await VoyageEvent.findAll({
			attributes: [
				[sequelize.fn('DISTINCT', sequelize.col('uniqueVoyageId')), 'uniqueVoyageId']
			],
			where: {
				uniqueVoyageId: { [Op.ne]: null },
				durationHours: null
			},
			raw: true
		})
		
		logger.info(`Calculating durations for ${uniqueVoyages.length} unique voyages`)
		
		for (const voyage of uniqueVoyages) {
			const duration = await calculateVoyageDuration(voyage.uniqueVoyageId)
			
			// Update all events in this voyage with the calculated duration
			await VoyageEvent.update(
				{ durationHours: duration },
				{ where: { uniqueVoyageId: voyage.uniqueVoyageId } }
			)
		}
		
		// Step 3: Generate voyage analytics summary
		logger.info('📈 Generating voyage analytics...')
		
		const analytics = await sequelize.query(`
			SELECT 
				"voyagePurpose",
				"voyagePattern",
				COUNT(DISTINCT "uniqueVoyageId") as voyage_count,
				COUNT(*) as event_count,
				AVG("durationHours") as avg_duration,
				SUM(CASE WHEN "isStandardPattern" THEN 1 ELSE 0 END) as standard_pattern_count
			FROM "VoyageEvents" 
			WHERE "uniqueVoyageId" IS NOT NULL
			GROUP BY "voyagePurpose", "voyagePattern"
			ORDER BY voyage_count DESC
		`, { type: sequelize.QueryTypes.SELECT })
		
		// Step 4: Final verification
		const totalEnhanced = await VoyageEvent.count({
			where: { uniqueVoyageId: { [Op.ne]: null } }
		})
		
		const totalUniqueVoyages = await VoyageEvent.count({
			distinct: true,
			col: 'uniqueVoyageId',
			where: { uniqueVoyageId: { [Op.ne]: null } }
		})
		
		const voyagePurposeStats = await VoyageEvent.findAll({
			attributes: [
				'voyagePurpose',
				[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('uniqueVoyageId'))), 'count']
			],
			where: { uniqueVoyageId: { [Op.ne]: null } },
			group: ['voyagePurpose'],
			raw: true
		})
		
		logger.info('🚢 Voyage Processing Enhancement Results:', {
			totalVoyageEventsEnhanced: totalEnhanced,
			totalUniqueVoyages,
			voyagePurposeDistribution: voyagePurposeStats,
			analyticsSample: analytics.slice(0, 5)
		})
		
		logger.info('✅ Voyage processing enhancement completed successfully!')
		return true
		
	} catch (error) {
		logger.error('❌ Voyage processing enhancement failed:', error)
		throw error
	}
}

// Run migration if called directly
if (require.main === module) {
	enhanceVoyageProcessing()
		.then((success) => {
			if (success) {
				logger.info('✅ Voyage processing enhancement script completed successfully')
				process.exit(0)
			} else {
				logger.error('❌ Voyage processing enhancement script completed with warnings')
				process.exit(1)
			}
		})
		.catch((error) => {
			logger.error('❌ Voyage processing enhancement script failed:', error)
			process.exit(1)
		})
}

module.exports = { enhanceVoyageProcessing }