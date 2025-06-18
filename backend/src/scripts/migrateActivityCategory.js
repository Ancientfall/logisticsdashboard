const { sequelize } = require('../config/database')
const { VoyageEvent } = require('../models')
const logger = require('../utils/logger')

// Enhanced activity category classification (matching upload controller logic)
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
	
	// All other activities are considered Productive (matching dashboard expectations)
	// This includes drilling, production, logistics, maintenance, cargo ops, etc.
	return 'Productive'
}

const migrateActivityCategory = async () => {
	try {
		logger.info('🔄 Starting activityCategory migration for existing voyage events...')
		
		// Get all voyage events that need activityCategory populated
		const events = await VoyageEvent.findAll({
			where: {
				activityCategory: null
			},
			order: [['createdAt', 'ASC']]
		})
		
		logger.info(`📊 Found ${events.length} voyage events to migrate`)
		
		if (events.length === 0) {
			logger.info('✅ No records need migration - all activityCategory fields are populated')
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
					const activityCategory = classifyActivity(event.parentEvent, event.event)
					
					// Log some examples for verification
					if (updated < 10) {
						logger.info(`📋 Example: "${event.parentEvent}" + "${event.event}" -> "${activityCategory}"`)
					}
					
					await event.update(
						{ activityCategory },
						{ transaction }
					)
					
					return activityCategory
				})
				
				await Promise.all(updatePromises)
				updated += batch.length
				processed += batch.length
				
				logger.info(`✅ Processed batch ${Math.ceil((i + batchSize) / batchSize)} - ${processed}/${events.length} records`)
			})
		}
		
		// Verify the migration
		const productiveCount = await VoyageEvent.count({
			where: { activityCategory: 'Productive' }
		})
		
		const nonProductiveCount = await VoyageEvent.count({
			where: { activityCategory: 'Non-Productive' }
		})
		
		const nullCount = await VoyageEvent.count({
			where: { activityCategory: null }
		})
		
		logger.info('📊 Migration Results:', {
			totalProcessed: updated,
			productive: productiveCount,
			nonProductive: nonProductiveCount,
			stillNull: nullCount
		})
		
		if (nullCount === 0) {
			logger.info('✅ activityCategory migration completed successfully!')
			return true
		} else {
			logger.warn(`⚠️ Migration completed but ${nullCount} records still have null activityCategory`)
			return false
		}
		
	} catch (error) {
		logger.error('❌ activityCategory migration failed:', error)
		throw error
	}
}

// Run migration if called directly
if (require.main === module) {
	migrateActivityCategory()
		.then((success) => {
			if (success) {
				logger.info('✅ Migration script completed successfully')
				process.exit(0)
			} else {
				logger.error('❌ Migration script completed with warnings')
				process.exit(1)
			}
		})
		.catch((error) => {
			logger.error('❌ Migration script failed:', error)
			process.exit(1)
		})
}

module.exports = { migrateActivityCategory, classifyActivity }