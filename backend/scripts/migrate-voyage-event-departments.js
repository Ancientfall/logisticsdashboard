#!/usr/bin/env node

/**
 * Migration Script: Backfill VoyageEvent Department Fields
 * 
 * This script fixes the root cause of dashboard data population issues by backfilling
 * missing department values and other enhanced fields for existing VoyageEvent records.
 * 
 * Background:
 * - 198,975 out of 198,977 VoyageEvent records have NULL department values
 * - These records were uploaded before enhanced processing was implemented
 * - Dashboards filter by department field but these records are missing this critical field
 * 
 * The script:
 * 1. Creates backup of current data
 * 2. Reads Cost Allocation data to create department lookup map
 * 3. Processes records in batches to avoid memory issues
 * 4. Applies enhanced department inference logic from uploadController.js
 * 5. Backfills missing fields: department, finalHours, lcNumber, lcPercentage, 
 *    mappedLocation, mappingStatus, dataIntegrity
 * 6. Provides comprehensive progress logging and error handling
 * 
 * Usage: node scripts/migrate-voyage-event-departments.js
 */

// Load environment variables
require('dotenv').config()

const { Sequelize, Op } = require('sequelize')
const path = require('path')
const fs = require('fs').promises
const readline = require('readline')

// Load models
const { sequelize } = require('../src/config/database')
const VoyageEvent = require('../src/models/VoyageEvent')
const CostAllocation = require('../src/models/CostAllocation')

// Configuration
const BATCH_SIZE = 1000 // Process records in batches
const BACKUP_DIR = path.join(__dirname, 'backups')
const LOG_FILE = path.join(__dirname, 'migration.log')

// Logging utility
const log = async (message, level = 'INFO') => {
	const timestamp = new Date().toISOString()
	const logEntry = `[${timestamp}] [${level}] ${message}\n`
	
	console.log(`[${level}] ${message}`)
	
	try {
		await fs.appendFile(LOG_FILE, logEntry)
	} catch (error) {
		console.error('Failed to write to log file:', error.message)
	}
}

// Enhanced LC allocation logic from uploadController.js (lines 136-179)
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

// Enhanced department inference from uploadController.js (lines 182-220)
const inferDepartmentFromLocation = (location, parentEvent, event, remarks, portType) => {
	const locationLower = (location || '').toLowerCase()
	const parentEventLower = (parentEvent || '').toLowerCase()
	const eventLower = (event || '').toLowerCase()
	const remarksLower = (remarks || '').toLowerCase()
	
	// Thunder Horse and Mad Dog special handling
	if (locationLower.includes('thunder') || locationLower.includes('mad dog')) {
		if (parentEventLower.includes('drill') || eventLower.includes('drill') || remarksLower.includes('drill')) {
			return 'Drilling'
		}
		return 'Production'
	}
	
	// Rig locations are typically drilling
	if (portType === 'rig' || locationLower.includes('rig')) {
		return 'Drilling'
	}
	
	// Base locations for supply operations
	if (portType === 'base' || locationLower.includes('fourchon') || locationLower.includes('base')) {
		if (parentEventLower.includes('cargo') || eventLower.includes('cargo') || parentEventLower.includes('supply')) {
			return 'Logistics'
		}
	}
	
	// Activity-based classification
	if (parentEventLower.includes('drill') || eventLower.includes('drill')) {
		return 'Drilling'
	}
	if (parentEventLower.includes('production') || eventLower.includes('production')) {
		return 'Production'
	}
	if (parentEventLower.includes('cargo') || parentEventLower.includes('supply') || parentEventLower.includes('transport')) {
		return 'Logistics'
	}
	
	return 'Operations'
}

// Create backup of current VoyageEvent data
const createBackup = async () => {
	await log('Creating backup of current VoyageEvent data...')
	
	try {
		// Ensure backup directory exists
		await fs.mkdir(BACKUP_DIR, { recursive: true })
		
		// Get current timestamp for backup filename
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
		const backupFile = path.join(BACKUP_DIR, `voyage_events_backup_${timestamp}.json`)
		
		// Count total records to backup
		const totalCount = await VoyageEvent.count()
		await log(`Backing up ${totalCount} VoyageEvent records...`)
		
		// Stream data to backup file in batches
		const backupData = []
		let offset = 0
		
		while (offset < totalCount) {
			const batch = await VoyageEvent.findAll({
				limit: BATCH_SIZE,
				offset: offset,
				raw: true
			})
			
			backupData.push(...batch)
			offset += BATCH_SIZE
			
			await log(`Backed up ${Math.min(offset, totalCount)} / ${totalCount} records...`)
		}
		
		// Write backup file
		await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2))
		await log(`Backup created successfully: ${backupFile}`)
		
		return backupFile
	} catch (error) {
		await log(`Failed to create backup: ${error.message}`, 'ERROR')
		throw error
	}
}

// Load Cost Allocation data into lookup map
const loadCostAllocationMap = async () => {
	await log('Loading Cost Allocation data for department mapping...')
	
	try {
		const costAllocations = await CostAllocation.findAll({
			attributes: ['lcNumber', 'department', 'rigReference'],
			where: {
				lcNumber: { [Op.not]: null },
				department: { [Op.not]: null }
			},
			raw: true
		})
		
		const costAllocationMap = new Map()
		
		costAllocations.forEach(allocation => {
			if (allocation.lcNumber && allocation.department) {
				costAllocationMap.set(allocation.lcNumber, {
					department: allocation.department,
					rigReference: allocation.rigReference
				})
			}
		})
		
		await log(`Loaded ${costAllocationMap.size} Cost Allocation mappings`)
		return costAllocationMap
	} catch (error) {
		await log(`Failed to load Cost Allocation data: ${error.message}`, 'ERROR')
		throw error
	}
}

// Process a batch of VoyageEvent records
const processBatch = async (records, costAllocationMap, batchNumber) => {
	const updates = []
	let processedCount = 0
	let errorCount = 0
	
	for (const record of records) {
		try {
			// Parse dates safely for eventDate and finalHours calculation
			const parseDate = (dateStr) => {
				if (!dateStr) return null
				const date = new Date(dateStr)
				return isNaN(date.getTime()) ? null : date
			}
			
			const fromDate = parseDate(record.from)
			const toDate = parseDate(record.to)
			
			// Calculate eventDate (prefer fromDate, fallback to current date)
			const eventDate = fromDate || new Date()
			
			// Calculate finalHours (use existing hours or calculate from date range)
			let finalHours = parseFloat(record.hours || 0)
			if ((finalHours === 0 || !finalHours) && fromDate && toDate) {
				finalHours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60)
			}
			finalHours = Number(isNaN(finalHours) ? 0 : finalHours.toFixed(2))
			
			// Process LC allocations using enhanced logic
			const lcAllocations = processLCAllocations(
				record.costDedicatedTo,
				record.location,
				record.parentEvent,
				record.event,
				record.remarks,
				record.portType,
				costAllocationMap
			)
			
			// Use first allocation (most records will have only one)
			const primaryAllocation = lcAllocations[0] || {
				lcNumber: null,
				department: 'Operations',
				percentage: 100,
				mappedLocation: record.location,
				isSpecialCase: false
			}
			
			// Calculate final hours based on allocation percentage
			const allocationFinalHours = finalHours * (primaryAllocation.percentage / 100)
			
			// Prepare update data
			const updateData = {
				department: primaryAllocation.department,
				finalHours: Number(isNaN(allocationFinalHours) ? 0 : allocationFinalHours.toFixed(2)),
				eventDate: eventDate,
				lcNumber: primaryAllocation.lcNumber,
				lcPercentage: primaryAllocation.percentage,
				mappedLocation: primaryAllocation.mappedLocation || record.location,
				mappingStatus: primaryAllocation.isSpecialCase ? "LC Mapped" : "Location Inferred",
				dataIntegrity: primaryAllocation.isSpecialCase ? "Valid" : "Inferred",
				metadata: {
					...record.metadata,
					migrationDate: new Date().toISOString(),
					migrationVersion: '1.0',
					allocationCount: lcAllocations.length
				}
			}
			
			updates.push({
				id: record.id,
				...updateData
			})
			
			processedCount++
		} catch (error) {
			await log(`Error processing record ${record.id}: ${error.message}`, 'ERROR')
			errorCount++
			
			// Add basic fallback data
			updates.push({
				id: record.id,
				department: 'Operations',
				finalHours: parseFloat(record.hours || 0),
				eventDate: new Date(),
				lcNumber: null,
				lcPercentage: 100,
				mappedLocation: record.location,
				mappingStatus: "Error - Default Values",
				dataIntegrity: "Invalid",
				metadata: {
					...record.metadata,
					migrationDate: new Date().toISOString(),
					migrationVersion: '1.0',
					migrationError: error.message
				}
			})
		}
	}
	
	// Perform bulk update
	try {
		await sequelize.transaction(async (transaction) => {
			for (const update of updates) {
				await VoyageEvent.update(
					{
						department: update.department,
						finalHours: update.finalHours,
						eventDate: update.eventDate,
						lcNumber: update.lcNumber,
						lcPercentage: update.lcPercentage,
						mappedLocation: update.mappedLocation,
						mappingStatus: update.mappingStatus,
						dataIntegrity: update.dataIntegrity,
						metadata: update.metadata
					},
					{
						where: { id: update.id },
						transaction
					}
				)
			}
		})
		
		await log(`Batch ${batchNumber}: Updated ${processedCount} records (${errorCount} errors)`)
		return { processedCount, errorCount }
	} catch (error) {
		await log(`Failed to update batch ${batchNumber}: ${error.message}`, 'ERROR')
		throw error
	}
}

// Main migration function
const runMigration = async () => {
	const startTime = Date.now()
	await log('Starting VoyageEvent department migration...')
	
	try {
		// Test database connection
		await sequelize.authenticate()
		await log('Database connection established')
		
		// Check for records that need migration
		const recordsToMigrate = await VoyageEvent.count({
			where: {
				department: { [Op.is]: null }
			}
		})
		
		if (recordsToMigrate === 0) {
			await log('No records found that need migration. Exiting.')
			return
		}
		
		await log(`Found ${recordsToMigrate} records that need department backfill`)
		
		// Create backup
		const backupFile = await createBackup()
		
		// Load Cost Allocation mapping
		const costAllocationMap = await loadCostAllocationMap()
		
		// Process records in batches
		let offset = 0
		let totalProcessed = 0
		let totalErrors = 0
		let batchNumber = 1
		
		while (offset < recordsToMigrate) {
			await log(`Processing batch ${batchNumber} (records ${offset + 1} to ${Math.min(offset + BATCH_SIZE, recordsToMigrate)})...`)
			
			// Fetch batch of records that need migration
			const batch = await VoyageEvent.findAll({
				where: {
					department: { [Op.is]: null }
				},
				limit: BATCH_SIZE,
				offset: offset,
				raw: true
			})
			
			if (batch.length === 0) {
				break
			}
			
			// Process batch
			const { processedCount, errorCount } = await processBatch(batch, costAllocationMap, batchNumber)
			
			totalProcessed += processedCount
			totalErrors += errorCount
			offset += batch.length
			batchNumber++
			
			// Progress update
			const progress = ((offset / recordsToMigrate) * 100).toFixed(1)
			await log(`Progress: ${progress}% (${totalProcessed} processed, ${totalErrors} errors)`)
			
			// Brief pause to prevent overwhelming the database
			await new Promise(resolve => setTimeout(resolve, 100))
		}
		
		// Final verification
		const remainingNullDepartments = await VoyageEvent.count({
			where: {
				department: { [Op.is]: null }
			}
		})
		
		const migrationTime = ((Date.now() - startTime) / 1000).toFixed(2)
		
		await log('='.repeat(80))
		await log('MIGRATION COMPLETE')
		await log('='.repeat(80))
		await log(`Total records processed: ${totalProcessed}`)
		await log(`Total errors: ${totalErrors}`)
		await log(`Records still missing department: ${remainingNullDepartments}`)
		await log(`Migration time: ${migrationTime} seconds`)
		await log(`Backup file: ${backupFile}`)
		await log('='.repeat(80))
		
		if (remainingNullDepartments > 0) {
			await log(`WARNING: ${remainingNullDepartments} records still have NULL department values`, 'WARN')
		}
		
	} catch (error) {
		await log(`Migration failed: ${error.message}`, 'ERROR')
		await log(error.stack, 'ERROR')
		throw error
	}
}

// Interactive confirmation
const confirmMigration = async () => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})
	
	return new Promise((resolve) => {
		rl.question('\nThis will modify existing VoyageEvent records. Do you want to continue? (yes/no): ', (answer) => {
			rl.close()
			resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
		})
	})
}

// Entry point
const main = async () => {
	try {
		console.log('VoyageEvent Department Migration Script')
		console.log('=====================================')
		console.log('')
		console.log('This script will:')
		console.log('1. Create a backup of current VoyageEvent data')
		console.log('2. Load Cost Allocation data for department mapping')
		console.log('3. Process records in batches to backfill missing fields:')
		console.log('   - department (using Cost Allocation lookup and location-based inference)')
		console.log('   - finalHours (calculated from hours field)')
		console.log('   - lcNumber and lcPercentage (from Cost Dedicated to field parsing)')
		console.log('   - mappedLocation (enhanced location mapping)')
		console.log('   - mappingStatus and dataIntegrity (processing metadata)')
		console.log('4. Provide comprehensive progress logging')
		console.log('')
		console.log(`Batch size: ${BATCH_SIZE} records`)
		console.log(`Log file: ${LOG_FILE}`)
		console.log(`Backup directory: ${BACKUP_DIR}`)
		console.log('')
		
		const confirmed = await confirmMigration()
		
		if (!confirmed) {
			console.log('Migration cancelled by user.')
			process.exit(0)
		}
		
		await runMigration()
		console.log('\nMigration completed successfully!')
		
	} catch (error) {
		console.error('\nMigration failed:', error.message)
		console.error('Check the log file for detailed error information.')
		process.exit(1)
	}
}

// Handle script execution
if (require.main === module) {
	main()
}

module.exports = {
	runMigration,
	processLCAllocations,
	inferDepartmentFromLocation,
	loadCostAllocationMap
}