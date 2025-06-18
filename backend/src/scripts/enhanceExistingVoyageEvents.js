const { sequelize } = require('../config/database')
const { Op } = require('sequelize')
const { VoyageEvent } = require('../models')
const logger = require('../utils/logger')

// Enhanced processing functions (extracted from frontend utils)

// Activity classification (fixed version)
const classifyActivity = (parentEvent, event) => {
	const combined = `${parentEvent || ''} ${event || ''}`.toLowerCase()
	
	// Non-Productive Time (NPT) - Critical for drilling dashboard
	if (combined.includes('waiting') || combined.includes('wait') || 
		combined.includes('delay') || combined.includes('downtime') ||
		combined.includes('breakdown') || combined.includes('weather') ||
		combined.includes('standby') || combined.includes('hold') ||
		combined.includes('suspended') || combined.includes('rig repair') ||
		combined.includes('equipment failure') || combined.includes('maintenance delay')) {
		return 'Non-Productive'
	}
	
	// All other activities are considered Productive
	return 'Productive'
}

// Company inference from vessel name
const inferCompanyFromVessel = (vesselName) => {
	const name = vesselName.toLowerCase()
	if (name.includes('hos')) return 'Hornbeck Offshore'
	if (name.includes('chouest')) return 'Edison Chouest'
	if (name.includes('harvey')) return 'Harvey Gulf'
	if (name.includes('seacor')) return 'Seacor Marine'
	if (name.includes('tidewater')) return 'Tidewater'
	if (name.includes('thunder horse')) return 'BP Marine'
	if (name.includes('olympic')) return 'Olympic Shipping'
	if (name.includes('island')) return 'Island Offshore'
	if (name.includes('gulf')) return 'Gulf Offshore'
	if (name.includes('storm')) return 'Storm Marine'
	if (name.includes('versatile')) return 'Versatile Marine'
	return 'Unknown'
}

// Vessel type inference
const getVesselTypeFromName = (vesselName) => {
	const name = vesselName.toLowerCase()
	if (name.includes('fsv') || name.includes('fast')) return 'FSV'
	if (name.includes('osv')) return 'OSV'
	if (name.includes('ahts')) return 'AHTS'
	if (name.includes('psv')) return 'PSV'
	if (name.includes('msv')) return 'MSV'
	return 'OSV' // Default to OSV
}

// Vessel size inference (rough estimates based on common vessel patterns)
const getVesselSizeFromName = (vesselName) => {
	const name = vesselName.toLowerCase()
	// Large vessels
	if (name.includes('thunder horse') || name.includes('island') || name.includes('olympic')) return 320
	if (name.includes('highland') || name.includes('storm')) return 280
	if (name.includes('versatile')) return 260
	// Medium vessels  
	if (name.includes('hos iron') || name.includes('hos achiever')) return 245
	if (name.includes('seacor')) return 220
	// Small vessels
	if (name.includes('gulf')) return 190
	
	// Default based on type
	const vesselType = getVesselTypeFromName(vesselName)
	if (vesselType === 'FSV') return 300
	if (vesselType === 'AHTS') return 280
	if (vesselType === 'PSV') return 260
	return 240 // Default OSV size
}

// Enhanced vessel cost calculation using vessel size and type
const calculateVesselCosts = (vesselName, eventDate, hours) => {
	const vesselSize = getVesselSizeFromName(vesselName)
	const vesselType = getVesselTypeFromName(vesselName)
	
	// Calculate base hourly rate based on size
	const baseHourlyRate = vesselSize > 300 ? 1500 : 
	                     vesselSize > 250 ? 1200 : 
	                     vesselSize > 200 ? 1000 : 800
	
	// Adjust for vessel type (FSVs typically cost less)
	const vesselHourlyRate = vesselType === 'FSV' ? baseHourlyRate * 0.8 : baseHourlyRate
	const vesselDailyRate = vesselHourlyRate * 24
	const vesselCostTotal = hours * vesselHourlyRate
	
	return {
		vesselHourlyRate: Math.round(vesselHourlyRate * 100) / 100,
		vesselDailyRate: Math.round(vesselDailyRate * 100) / 100,
		vesselCostTotal: Math.round(vesselCostTotal * 100) / 100
	}
}

// Enhanced date calculations
const calculateDateFields = (eventDate) => {
	if (!eventDate || isNaN(eventDate.getTime())) {
		return {
			eventYear: null,
			quarter: null,
			monthNumber: null,
			monthName: null,
			weekOfYear: null,
			dayOfWeek: null,
			dayOfMonth: null
		}
	}
	
	const year = eventDate.getFullYear()
	const month = eventDate.getMonth() + 1 // 1-based
	const quarter = `Q${Math.ceil(month / 3)}`
	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
	                   'July', 'August', 'September', 'October', 'November', 'December']
	const monthName = monthNames[eventDate.getMonth()]
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	const dayOfWeek = dayNames[eventDate.getDay()]
	
	// Calculate week of year
	const startOfYear = new Date(year, 0, 1)
	const weekOfYear = Math.ceil(((eventDate - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
	
	return {
		eventYear: year,
		quarter,
		monthNumber: month,
		monthName,
		weekOfYear,
		dayOfWeek,
		dayOfMonth: eventDate.getDate()
	}
}

// Location type inference
const inferLocationType = (portType) => {
	if (portType === 'rig') return 'Offshore'
	if (portType === 'base') return 'Onshore'
	return 'Other'
}

// Standardized voyage number creation
const createStandardizedVoyageNumber = (voyageNumber) => {
	if (!voyageNumber) return null
	return voyageNumber.toString().trim()
}

const enhanceExistingVoyageEvents = async () => {
	try {
		logger.info('🔄 Starting comprehensive voyage event enhancement migration...')
		
		// Get all voyage events that need enhancement
		const events = await VoyageEvent.findAll({
			where: {
				// Find events missing any enhanced fields
				[Op.or]: [
					{ company: null },
					{ vesselCostTotal: null },
					{ activityCategory: null },
					{ eventYear: null },
					{ standardizedVoyageNumber: null }
				]
			},
			order: [['createdAt', 'ASC']]
		})
		
		logger.info(`📊 Found ${events.length} voyage events to enhance`)
		
		if (events.length === 0) {
			logger.info('✅ No records need enhancement - all fields are populated')
			return true
		}
		
		// Process in batches to avoid memory issues
		const batchSize = 1000
		let processed = 0
		let updated = 0
		
		for (let i = 0; i < events.length; i += batchSize) {
			const batch = events.slice(i, i + batchSize)
			
			// Use a transaction for each batch
			await sequelize.transaction(async (transaction) => {
				const updatePromises = batch.map(async (event) => {
					// Calculate enhanced fields
					const activityCategory = classifyActivity(event.parentEvent, event.event)
					const company = inferCompanyFromVessel(event.vessel || '')
					const vesselType = getVesselTypeFromName(event.vessel || '')
					const vesselSize = getVesselSizeFromName(event.vessel || '')
					const locationType = inferLocationType(event.portType)
					const standardizedVoyageNumber = createStandardizedVoyageNumber(event.voyageNumber)
					
					// Calculate vessel costs
					const vesselCosts = calculateVesselCosts(
						event.vessel || '', 
						event.eventDate, 
						event.finalHours || event.hours || 0
					)
					
					// Calculate date fields
					const dateFields = calculateDateFields(event.eventDate)
					
					// Prepare update data
					const updateData = {
						activityCategory,
						company,
						vesselType,
						locationType,
						standardizedVoyageNumber,
						...vesselCosts,
						...dateFields
					}
					
					// Log some examples for verification
					if (updated < 10) {
						logger.info(`📋 Example enhancement: ${event.vessel} -> Company: ${company}, Type: ${vesselType}, Activity: ${activityCategory}, Cost: $${vesselCosts.vesselCostTotal}`)
					}
					
					await event.update(updateData, { transaction })
					return true
				})
				
				await Promise.all(updatePromises)
				updated += batch.length
				processed += batch.length
				
				logger.info(`✅ Enhanced batch ${Math.ceil((i + batchSize) / batchSize)} - ${processed}/${events.length} records`)
			})
		}
		
		// Verify the enhancement
		const productiveCount = await VoyageEvent.count({
			where: { activityCategory: 'Productive' }
		})
		
		const nonProductiveCount = await VoyageEvent.count({
			where: { activityCategory: 'Non-Productive' }
		})
		
		const companiesPopulated = await VoyageEvent.count({
			where: { company: { [Op.ne]: null } }
		})
		
		const costsPopulated = await VoyageEvent.count({
			where: { vesselCostTotal: { [Op.ne]: null } }
		})
		
		logger.info('📊 Enhancement Results:', {
			totalProcessed: updated,
			productive: productiveCount,
			nonProductive: nonProductiveCount,
			companiesPopulated,
			costsPopulated
		})
		
		logger.info('✅ Comprehensive voyage event enhancement completed successfully!')
		return true
		
	} catch (error) {
		logger.error('❌ Voyage event enhancement failed:', error)
		throw error
	}
}

// Run migration if called directly
if (require.main === module) {
	enhanceExistingVoyageEvents()
		.then((success) => {
			if (success) {
				logger.info('✅ Enhancement script completed successfully')
				process.exit(0)
			} else {
				logger.error('❌ Enhancement script completed with warnings')
				process.exit(1)
			}
		})
		.catch((error) => {
			logger.error('❌ Enhancement script failed:', error)
			process.exit(1)
		})
}

module.exports = { enhanceExistingVoyageEvents }