// Migration script to backfill department and enhanced fields for existing VoyageEvent records
// This addresses the root cause where 198,975 records have NULL department values

const { sequelize } = require('../config/database')
const { VoyageEvent, CostAllocation } = require('../models')
const logger = require('../utils/logger')

// Enhanced department inference logic from uploadController.js
const inferDepartmentFromLocation = (location, parentEvent, event, remarks, portType) => {
	// Priority 1: Direct keyword matching in location
	const locationLower = (location || '').toLowerCase()
	
	// Drilling operations patterns
	if (locationLower.includes('drill') || 
		locationLower.includes('rig') || 
		locationLower.includes('spud') ||
		locationLower.includes('bop') ||
		locationLower.includes('casing') ||
		locationLower.includes('cementing')) {
		return 'Drilling'
	}
	
	// Production operations patterns
	if (locationLower.includes('production') || 
		locationLower.includes('processing') || 
		locationLower.includes('manifold') ||
		locationLower.includes('flowline') ||
		locationLower.includes('separator') ||
		locationLower.includes('christmas tree') ||
		locationLower.includes('xmas tree')) {
		return 'Production'
	}
	
	// Logistics operations patterns
	if (locationLower.includes('supply') || 
		locationLower.includes('transport') || 
		locationLower.includes('cargo') ||
		locationLower.includes('personnel') ||
		locationLower.includes('crew change') ||
		locationLower.includes('helicopter') ||
		locationLower.includes('helideck')) {
		return 'Logistics'
	}
	
	// Priority 2: Event-based classification
	const eventLower = (event || '').toLowerCase()
	const parentEventLower = (parentEvent || '').toLowerCase()
	
	if (eventLower.includes('drill') || parentEventLower.includes('drill') ||
		eventLower.includes('rig') || parentEventLower.includes('rig')) {
		return 'Drilling'
	}
	
	if (eventLower.includes('production') || parentEventLower.includes('production') ||
		eventLower.includes('process') || parentEventLower.includes('process')) {
		return 'Production'
	}
	
	if (eventLower.includes('supply') || parentEventLower.includes('supply') ||
		eventLower.includes('transport') || parentEventLower.includes('transport') ||
		eventLower.includes('crew') || parentEventLower.includes('crew')) {
		return 'Logistics'
	}
	
	// Priority 3: Port type classification
	if (portType) {
		const portTypeLower = portType.toLowerCase()
		if (portTypeLower.includes('drill')) return 'Drilling'
		if (portTypeLower.includes('production')) return 'Production'
		if (portTypeLower.includes('supply') || portTypeLower.includes('logistics')) return 'Logistics'
	}
	
	// Priority 4: Remarks analysis
	if (remarks) {
		const remarksLower = remarks.toLowerCase()
		if (remarksLower.includes('drill') || remarksLower.includes('rig')) return 'Drilling'
		if (remarksLower.includes('production') || remarksLower.includes('process')) return 'Production'
		if (remarksLower.includes('supply') || remarksLower.includes('transport') || remarksLower.includes('logistics')) return 'Logistics'
	}
	
	// Default classification
	return 'Operations'
}

// Enhanced LC allocation logic from uploadController.js
const processLCAllocations = (costDedicatedTo, location, parentEvent, event, remarks, portType, costAllocationMap) => {
	const allocations = []
	
	// Parse LC numbers from Cost Dedicated to field
	const lcNumbers = []
	if (costDedicatedTo) {
		// Handle multiple LC formats: "7777, 8888" or "7777/8888" or "7777;8888"
		const lcMatches = costDedicatedTo.toString().split(/[,\/;]/).map(lc => lc.trim()).filter(lc => lc)
		lcNumbers.push(...lcMatches)
	}
	
	if (lcNumbers.length === 0) {
		// No LC numbers found - use location-based fallback
		const department = inferDepartmentFromLocation(location, parentEvent, event, remarks, portType)
		allocations.push({
			lcNumber: null,
			department,
			percentage: 100,
			mappedLocation: location,
			originalLocation: location,
			isSpecialCase: false
		})
	} else {
		// Distribute evenly across LC numbers
		const percentagePerLC = 100 / lcNumbers.length
		
		lcNumbers.forEach(lcNumber => {
			const costAllocation = costAllocationMap.get(lcNumber)
			const department = costAllocation ? costAllocation.department : 
				inferDepartmentFromLocation(location, parentEvent, event, remarks, portType)
			
			allocations.push({
				lcNumber,
				department,
				percentage: percentagePerLC,
				mappedLocation: costAllocation ? costAllocation.rigReference || location : location,
				originalLocation: location,
				isSpecialCase: !!costAllocation
			})
		})
	}
	
	return allocations
}

// Create Cost Allocation lookup map
const createCostAllocationMap = (costAllocationData) => {
	const map = new Map()
	costAllocationData.forEach(cost => {
		if (cost.lcNumber) {
			map.set(cost.lcNumber.toString(), cost)
		}
	})
	return map
}

// Main migration function
async function migrateDepartmentFields() {
	let transaction
	
	try {
		logger.info('🚀 Starting department fields migration...')
		
		// Start transaction
		transaction = await sequelize.transaction()
		
		// Load Cost Allocation data for lookup
		logger.info('📋 Loading Cost Allocation data...')
		const costAllocationData = await CostAllocation.findAll({ transaction })
		const costAllocationMap = createCostAllocationMap(costAllocationData)
		logger.info(`✅ Loaded ${costAllocationData.length} Cost Allocation records`)
		
		// Get all VoyageEvent records that need migration (NULL department)
		logger.info('🔍 Finding records that need migration...')
		const recordsToMigrate = await VoyageEvent.findAll({
			where: {
				department: null
			},
			attributes: [
				'id', 'costDedicatedTo', 'location', 'parentEvent', 
				'event', 'remarks', 'portType', 'hours', 'from', 'to'
			],
			transaction
		})
		
		logger.info(`📊 Found ${recordsToMigrate.length} records that need department classification`)
		
		if (recordsToMigrate.length === 0) {
			logger.info('✅ No records need migration. All records already have department values.')
			await transaction.commit()
			return
		}
		
		// Process records in batches
		const BATCH_SIZE = 1000
		let processedCount = 0
		let updatedCount = 0
		
		const departmentStats = {
			'Drilling': 0,
			'Production': 0,
			'Logistics': 0,
			'Operations': 0
		}
		
		for (let i = 0; i < recordsToMigrate.length; i += BATCH_SIZE) {
			const batch = recordsToMigrate.slice(i, i + BATCH_SIZE)
			logger.info(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(recordsToMigrate.length/BATCH_SIZE)} (${batch.length} records)`)
			
			// Process each record in the batch
			for (const record of batch) {
				try {
					// Use the enhanced LC allocation processing
					const allocations = processLCAllocations(
						record.costDedicatedTo,
						record.location,
						record.parentEvent,
						record.event,
						record.remarks,
						record.portType,
						costAllocationMap
					)
					
					// For migration, we'll use the primary allocation (first one)
					const primaryAllocation = allocations[0]
					
					// Calculate final hours (same as original hours for migration)
					const finalHours = record.hours || 0
					
					// Parse event date from 'from' field if available
					let eventDate = null
					if (record.from) {
						try {
							eventDate = new Date(record.from)
						} catch (e) {
							// Keep null if parsing fails
						}
					}
					
					// Update the record with enhanced fields
					await VoyageEvent.update({
						department: primaryAllocation.department,
						mappedLocation: primaryAllocation.mappedLocation,
						finalHours: finalHours,
						eventDate: eventDate,
						lcNumber: primaryAllocation.lcNumber,
						lcPercentage: primaryAllocation.percentage,
						mappingStatus: primaryAllocation.isSpecialCase ? 'cost_allocation_mapped' : 'location_inferred',
						dataIntegrity: 'migration_processed'
					}, {
						where: { id: record.id },
						transaction
					})
					
					// Update statistics
					departmentStats[primaryAllocation.department]++
					updatedCount++
					
				} catch (error) {
					logger.error(`❌ Error processing record ${record.id}:`, error.message)
				}
				
				processedCount++
			}
			
			// Log progress
			const progressPercent = ((processedCount / recordsToMigrate.length) * 100).toFixed(1)
			logger.info(`📈 Progress: ${processedCount}/${recordsToMigrate.length} (${progressPercent}%) - Updated: ${updatedCount}`)
		}
		
		// Commit transaction
		await transaction.commit()
		
		// Final statistics
		logger.info('🎉 Migration completed successfully!')
		logger.info('📊 Final Statistics:')
		logger.info(`   Total Records Processed: ${processedCount}`)
		logger.info(`   Total Records Updated: ${updatedCount}`)
		logger.info(`   Department Distribution:`)
		logger.info(`     - Drilling: ${departmentStats.Drilling} (${((departmentStats.Drilling/updatedCount)*100).toFixed(1)}%)`)
		logger.info(`     - Production: ${departmentStats.Production} (${((departmentStats.Production/updatedCount)*100).toFixed(1)}%)`)
		logger.info(`     - Logistics: ${departmentStats.Logistics} (${((departmentStats.Logistics/updatedCount)*100).toFixed(1)}%)`)
		logger.info(`     - Operations: ${departmentStats.Operations} (${((departmentStats.Operations/updatedCount)*100).toFixed(1)}%)`)
		
		// Verify migration results
		const verificationQuery = await VoyageEvent.findAll({
			attributes: [
				'department',
				[sequelize.fn('COUNT', sequelize.col('id')), 'count']
			],
			group: ['department'],
			raw: true
		})
		
		logger.info('✅ Verification - Current department distribution:')
		verificationQuery.forEach(row => {
			logger.info(`     ${row.department || 'NULL'}: ${row.count} records`)
		})
		
	} catch (error) {
		logger.error('💥 Migration failed:', error)
		if (transaction) {
			await transaction.rollback()
			logger.info('🔄 Transaction rolled back')
		}
		throw error
	}
}

// Execute migration if run directly
if (require.main === module) {
	migrateDepartmentFields()
		.then(() => {
			logger.info('✅ Migration script completed')
			process.exit(0)
		})
		.catch(error => {
			logger.error('❌ Migration script failed:', error)
			process.exit(1)
		})
}

module.exports = { migrateDepartmentFields }