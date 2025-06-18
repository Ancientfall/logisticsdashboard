const { sequelize } = require('../config/database')
const { Op } = require('sequelize')
const { VoyageEvent, CostAllocation, BulkAction, VoyageList, VesselManifest } = require('../models')
const logger = require('../utils/logger')

// Project Type Classification based on description/cost element text
const classifyProjectType = (description, costElement, lcNumber, remarks) => {
	const combined = `${description || ''} ${costElement || ''} ${lcNumber || ''} ${remarks || ''}`.toLowerCase()
	
	// P&A Projects
	if (combined.includes('p&a') || combined.includes('abandon') || combined.includes('plug')) {
		return 'P&A'
	}
	
	// Completions Projects
	if (combined.includes('completion') || combined.includes('fracturing') || 
		combined.includes('perforation') || combined.includes('workover') ||
		combined.includes('stimulation') || combined.includes('acidizing')) {
		return 'Completions'
	}
	
	// Drilling Projects
	if (combined.includes('drill') || combined.includes('spud') || 
		combined.includes('cementing') || combined.includes('casing') ||
		combined.includes('mud') || combined.includes('logging') ||
		combined.includes('wireline') || combined.includes('bha')) {
		return 'Drilling'
	}
	
	// Production Projects
	if (combined.includes('production') || combined.includes('facility') ||
		combined.includes('platform') || combined.includes('processing') ||
		combined.includes('separation') || combined.includes('export')) {
		return 'Production'
	}
	
	// Maintenance Projects
	if (combined.includes('maintenance') || combined.includes('repair') ||
		combined.includes('inspection') || combined.includes('overhaul') ||
		combined.includes('upgrade')) {
		return 'Maintenance'
	}
	
	// Operator Sharing
	if (combined.includes('operator') || combined.includes('sharing') ||
		combined.includes('joint') || combined.includes('partner') ||
		combined.includes('alliance')) {
		return 'Operator Sharing'
	}
	
	// Default based on mission type
	if (combined.includes('supply')) return 'Supply'
	if (combined.includes('cargo')) return 'Cargo'
	if (combined.includes('crew')) return 'Personnel'
	
	return 'Unclassified'
}

// Enhanced Department Inference with multiple sources
const enhancedDepartmentInference = (lcNumber, description, event, parentEvent, location, remarks, costElement) => {
	const combined = `${description || ''} ${event || ''} ${parentEvent || ''} ${location || ''} ${remarks || ''} ${costElement || ''}`.toLowerCase()
	
	// Special Fourchon Logistics LCs
	if (lcNumber && ['999', '333', '7777', '8888'].includes(lcNumber.toString().trim())) {
		return 'Logistics'
	}
	
	// LC Number-based mapping (Production facilities)
	const lcNum = lcNumber?.toString().trim()
	if (lcNum) {
		// Thunder Horse Production LCs
		if (['LC001', 'LC002', 'LC003'].includes(lcNum)) return 'Production'
		// Thunder Horse Drilling LCs  
		if (['LC004', 'LC005'].includes(lcNum)) return 'Drilling'
		// Mad Dog LCs
		if (['LC006', 'LC007', 'LC008', 'LC009'].includes(lcNum)) return 'Production'
		// Other facility LCs
		if (['LC010', 'LC011', 'LC012', 'LC013', 'LC014', 'LC015'].includes(lcNum)) return 'Production'
	}
	
	// Keyword-based department inference
	if (combined.includes('drilling') || combined.includes('mud') || combined.includes('cement') ||
		combined.includes('casing') || combined.includes('logging') || combined.includes('wireline')) {
		return 'Drilling'
	}
	
	if (combined.includes('production') || combined.includes('facility') || combined.includes('processing') ||
		combined.includes('separation') || combined.includes('export') || combined.includes('platform')) {
		return 'Production'
	}
	
	if (combined.includes('completion') || combined.includes('workover') || combined.includes('stimulation') ||
		combined.includes('fracturing') || combined.includes('perforation')) {
		return 'Completions'
	}
	
	if (combined.includes('maintenance') || combined.includes('repair') || combined.includes('inspection') ||
		combined.includes('overhaul') || combined.includes('upgrade')) {
		return 'Maintenance'
	}
	
	if (combined.includes('supply') || combined.includes('cargo') || combined.includes('logistics') ||
		combined.includes('fourchon') || combined.includes('venice') || combined.includes('morgan')) {
		return 'Logistics'
	}
	
	if (combined.includes('crew') || combined.includes('personnel') || combined.includes('training') ||
		combined.includes('evacuation') || combined.includes('medical')) {
		return 'Personnel'
	}
	
	return 'Logistics' // Default fallback
}

// Rig Location Standardization
const standardizeRigLocation = (location, remarks, description) => {
	const combined = `${location || ''} ${remarks || ''} ${description || ''}`.toLowerCase()
	
	// Standard rig name mappings
	const rigMappings = {
		'thunder horse': 'Thunder Horse',
		'stena icemax': 'Stena IceMAX',
		'stena ice max': 'Stena IceMAX',
		'mad dog': 'Mad Dog',
		'na kika': 'Na Kika',
		'atlantis': 'Atlantis',
		'argos': 'Argos'
	}
	
	for (const [pattern, standardName] of Object.entries(rigMappings)) {
		if (combined.includes(pattern)) {
			return standardName
		}
	}
	
	return location // Return original if no match
}

// Data Quality Scoring
const calculateDataQualityScore = (record) => {
	let score = 100
	const issues = []
	
	// Critical field checks
	if (!record.eventDate) {
		score -= 20
		issues.push('Missing event date')
	}
	
	if (!record.vessel) {
		score -= 15
		issues.push('Missing vessel name')
	}
	
	if (!record.location) {
		score -= 10
		issues.push('Missing location')
	}
	
	// Data validation checks
	if (record.finalHours && record.finalHours > 24) {
		score -= 5
		issues.push('Excessive hours (>24)')
	}
	
	if (record.vesselCostTotal && record.vesselCostTotal < 0) {
		score -= 10
		issues.push('Negative cost value')
	}
	
	if (record.vesselDailyRate && (record.vesselDailyRate < 1000 || record.vesselDailyRate > 100000)) {
		score -= 5
		issues.push('Suspicious daily rate')
	}
	
	// Date validation
	if (record.eventDate) {
		const year = new Date(record.eventDate).getFullYear()
		if (year < 2020 || year > 2030) {
			score -= 10
			issues.push('Date out of expected range')
		}
	}
	
	return {
		score: Math.max(0, score),
		issues: issues.join(', ') || null
	}
}

// Bulk Fluid Classification
const classifyBulkFluid = (fluidType, description, remarks) => {
	const combined = `${fluidType || ''} ${description || ''} ${remarks || ''}`.toLowerCase()
	
	// Drilling fluids
	if (combined.includes('wbm') || combined.includes('water based') || 
		combined.includes('sbm') || combined.includes('synthetic') ||
		combined.includes('obm') || combined.includes('oil based') ||
		combined.includes('premix') || combined.includes('baseoil')) {
		return 'Drilling'
	}
	
	// Completion fluids
	if (combined.includes('calcium bromide') || combined.includes('calcium chloride') ||
		combined.includes('kcl') || combined.includes('potassium chloride') ||
		combined.includes('brine') || combined.includes('completion fluid')) {
		return 'Completion/Intervention'
	}
	
	// Production chemicals
	if (combined.includes('asphaltene inhibitor') || combined.includes('methanol') ||
		combined.includes('xylene') || combined.includes('corrosion inhibitor') ||
		combined.includes('biocide') || combined.includes('scale inhibitor')) {
		return 'Production Chemical'
	}
	
	return 'Other'
}

const addMissingEnhancedFields = async () => {
	try {
		logger.info('🔄 Starting additional enhanced fields migration...')
		
		// Process Voyage Events
		logger.info('📊 Processing Voyage Events...')
		const voyageEvents = await VoyageEvent.findAll({
			where: {
				[Op.or]: [
					{ projectType: null },
					{ dataQualityScore: null },
					{ rigLocation: null }
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
						// Calculate additional enhanced fields
						const projectType = classifyProjectType(
							event.event, 
							event.costDedicatedTo, 
							event.lcNumber, 
							event.remarks
						)
						
						const enhancedDepartment = enhancedDepartmentInference(
							event.lcNumber,
							event.event,
							event.event,
							event.parentEvent,
							event.location,
							event.remarks,
							event.costDedicatedTo
						)
						
						const rigLocation = standardizeRigLocation(
							event.location,
							event.remarks,
							event.event
						)
						
						const qualityMetrics = calculateDataQualityScore(event)
						
						const fluidCategory = classifyBulkFluid(
							event.eventCategory,
							event.event,
							event.remarks
						)
						
						// Update with new fields
						await event.update({
							projectType,
							enhancedDepartment,
							rigLocation,
							dataQualityScore: qualityMetrics.score,
							dataQualityIssues: qualityMetrics.issues,
							fluidCategory
						}, { transaction })
						
						return true
					})
					
					await Promise.all(updatePromises)
					logger.info(`✅ Enhanced batch ${Math.ceil((i + batchSize) / batchSize)} - ${Math.min(i + batchSize, voyageEvents.length)}/${voyageEvents.length} voyage events`)
				})
			}
		}
		
		// Process Cost Allocation records
		logger.info('💰 Processing Cost Allocation records...')
		const costAllocations = await CostAllocation.findAll({
			where: {
				[Op.or]: [
					{ projectType: null },
					{ dataQualityScore: null }
				]
			}
		})
		
		if (costAllocations.length > 0) {
			for (const record of costAllocations) {
				const projectType = classifyProjectType(
					record.description,
					record.costElement,
					record.lcNumber,
					record.remarks
				)
				
				const qualityMetrics = calculateDataQualityScore(record)
				
				await record.update({
					projectType,
					dataQualityScore: qualityMetrics.score,
					dataQualityIssues: qualityMetrics.issues
				})
			}
			logger.info(`✅ Enhanced ${costAllocations.length} cost allocation records`)
		}
		
		// Process Bulk Actions
		logger.info('🛢️ Processing Bulk Actions...')
		const bulkActions = await BulkAction.findAll({
			where: {
				[Op.or]: [
					{ fluidCategory: null },
					{ dataQualityScore: null }
				]
			}
		})
		
		if (bulkActions.length > 0) {
			for (const record of bulkActions) {
				const fluidCategory = classifyBulkFluid(
					record.fluidType,
					record.description,
					record.remarks
				)
				
				const qualityMetrics = calculateDataQualityScore(record)
				
				await record.update({
					fluidCategory,
					dataQualityScore: qualityMetrics.score,
					dataQualityIssues: qualityMetrics.issues
				})
			}
			logger.info(`✅ Enhanced ${bulkActions.length} bulk action records`)
		}
		
		// Final verification
		const enhancedVoyageEvents = await VoyageEvent.count({
			where: { projectType: { [Op.ne]: null } }
		})
		
		const qualityScored = await VoyageEvent.count({
			where: { dataQualityScore: { [Op.ne]: null } }
		})
		
		logger.info('📊 Additional Enhancement Results:', {
			enhancedVoyageEvents,
			qualityScored,
			costAllocationsEnhanced: costAllocations.length,
			bulkActionsEnhanced: bulkActions.length
		})
		
		logger.info('✅ Additional enhanced fields migration completed successfully!')
		return true
		
	} catch (error) {
		logger.error('❌ Additional enhanced fields migration failed:', error)
		throw error
	}
}

// Run migration if called directly
if (require.main === module) {
	addMissingEnhancedFields()
		.then((success) => {
			if (success) {
				logger.info('✅ Additional enhancement script completed successfully')
				process.exit(0)
			} else {
				logger.error('❌ Additional enhancement script completed with warnings')
				process.exit(1)
			}
		})
		.catch((error) => {
			logger.error('❌ Additional enhancement script failed:', error)
			process.exit(1)
		})
}

module.exports = { addMissingEnhancedFields }