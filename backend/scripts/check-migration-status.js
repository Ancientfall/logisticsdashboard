#!/usr/bin/env node

/**
 * Check Migration Status Script
 * 
 * This script provides detailed statistics about the current state of VoyageEvent
 * records and identifies which records need migration.
 * 
 * Usage: node scripts/check-migration-status.js
 */

// Load environment variables
require('dotenv').config()

const { Sequelize, Op } = require('sequelize')

// Load models
const { sequelize } = require('../src/config/database')
const VoyageEvent = require('../src/models/VoyageEvent')
const CostAllocation = require('../src/models/CostAllocation')

// Check database statistics
const checkDatabaseStats = async () => {
	console.log('VoyageEvent Migration Status Check')
	console.log('==================================\n')
	
	try {
		// Test database connection
		await sequelize.authenticate()
		console.log('✓ Database connection established\n')
		
		// Total VoyageEvent records
		const totalRecords = await VoyageEvent.count()
		console.log(`Total VoyageEvent records: ${totalRecords.toLocaleString()}`)
		
		// Records with NULL department
		const nullDepartmentCount = await VoyageEvent.count({
			where: {
				department: { [Op.is]: null }
			}
		})
		console.log(`Records with NULL department: ${nullDepartmentCount.toLocaleString()}`)
		
		// Records with non-NULL department
		const nonNullDepartmentCount = totalRecords - nullDepartmentCount
		console.log(`Records with department assigned: ${nonNullDepartmentCount.toLocaleString()}`)
		
		// Percentage needing migration
		const migrationPercentage = ((nullDepartmentCount / totalRecords) * 100).toFixed(2)
		console.log(`Percentage needing migration: ${migrationPercentage}%\n`)
		
		// Department distribution for existing records
		if (nonNullDepartmentCount > 0) {
			console.log('Current Department Distribution:')
			console.log('--------------------------------')
			
			const departmentStats = await VoyageEvent.findAll({
				attributes: [
					'department',
					[sequelize.fn('COUNT', '*'), 'count']
				],
				where: {
					department: { [Op.not]: null }
				},
				group: ['department'],
				order: [[sequelize.literal('count'), 'DESC']],
				raw: true
			})
			
			departmentStats.forEach(stat => {
				const percentage = ((stat.count / nonNullDepartmentCount) * 100).toFixed(1)
				console.log(`  ${stat.department}: ${stat.count.toLocaleString()} (${percentage}%)`)
			})
			console.log('')
		}
		
		// Records with NULL finalHours
		const nullFinalHoursCount = await VoyageEvent.count({
			where: {
				finalHours: { [Op.is]: null }
			}
		})
		console.log(`Records with NULL finalHours: ${nullFinalHoursCount.toLocaleString()}`)
		
		// Records with NULL lcNumber
		const nullLcNumberCount = await VoyageEvent.count({
			where: {
				lcNumber: { [Op.is]: null }
			}
		})
		console.log(`Records with NULL lcNumber: ${nullLcNumberCount.toLocaleString()}`)
		
		// Records with NULL mappedLocation
		const nullMappedLocationCount = await VoyageEvent.count({
			where: {
				mappedLocation: { [Op.is]: null }
			}
		})
		console.log(`Records with NULL mappedLocation: ${nullMappedLocationCount.toLocaleString()}`)
		
		// Records with NULL mappingStatus
		const nullMappingStatusCount = await VoyageEvent.count({
			where: {
				mappingStatus: { [Op.is]: null }
			}
		})
		console.log(`Records with NULL mappingStatus: ${nullMappingStatusCount.toLocaleString()}`)
		
		// Records with NULL dataIntegrity
		const nullDataIntegrityCount = await VoyageEvent.count({
			where: {
				dataIntegrity: { [Op.is]: null }
			}
		})
		console.log(`Records with NULL dataIntegrity: ${nullDataIntegrityCount.toLocaleString()}\n`)
		
		// Cost Allocation statistics
		console.log('Cost Allocation Statistics:')
		console.log('---------------------------')
		
		const totalCostAllocations = await CostAllocation.count()
		console.log(`Total Cost Allocation records: ${totalCostAllocations.toLocaleString()}`)
		
		const costAllocationsWithDepartment = await CostAllocation.count({
			where: {
				department: { [Op.not]: null }
			}
		})
		console.log(`Cost Allocations with department: ${costAllocationsWithDepartment.toLocaleString()}`)
		
		const uniqueLcNumbers = await CostAllocation.count({
			distinct: true,
			col: 'lcNumber',
			where: {
				lcNumber: { [Op.not]: null }
			}
		})
		console.log(`Unique LC Numbers: ${uniqueLcNumbers.toLocaleString()}`)
		
		if (costAllocationsWithDepartment > 0) {
			console.log('\nCost Allocation Department Distribution:')
			
			const costDepartmentStats = await CostAllocation.findAll({
				attributes: [
					'department',
					[sequelize.fn('COUNT', '*'), 'count']
				],
				where: {
					department: { [Op.not]: null }
				},
				group: ['department'],
				order: [[sequelize.literal('count'), 'DESC']],
				raw: true
			})
			
			costDepartmentStats.forEach(stat => {
				const percentage = ((stat.count / costAllocationsWithDepartment) * 100).toFixed(1)
				console.log(`  ${stat.department}: ${stat.count.toLocaleString()} (${percentage}%)`)
			})
		}
		
		console.log('\n' + '='.repeat(50))
		
		// Migration readiness assessment
		if (nullDepartmentCount === 0) {
			console.log('✓ No migration needed - all records have department values')
		} else {
			console.log('⚠ Migration needed:')
			console.log(`  - ${nullDepartmentCount.toLocaleString()} records need department backfill`)
			console.log(`  - ${costAllocationsWithDepartment.toLocaleString()} LC mappings available for enhanced processing`)
			
			if (costAllocationsWithDepartment === 0) {
				console.log('  - WARNING: No Cost Allocation data available for LC mapping')
				console.log('  - Migration will rely entirely on location-based inference')
			}
		}
		
		console.log('')
		
	} catch (error) {
		console.error('Error checking database stats:', error.message)
		process.exit(1)
	}
}

// Sample records analysis
const analyzeSampleRecords = async () => {
	console.log('Sample Records Analysis:')
	console.log('========================\n')
	
	try {
		// Get sample records that need migration
		const sampleRecords = await VoyageEvent.findAll({
			where: {
				department: { [Op.is]: null }
			},
			limit: 10,
			attributes: [
				'id', 'mission', 'vessel', 'event', 'parentEvent', 'location', 
				'costDedicatedTo', 'portType', 'department'
			],
			raw: true
		})
		
		if (sampleRecords.length === 0) {
			console.log('No records found that need migration\n')
			return
		}
		
		console.log(`Sample of ${sampleRecords.length} records needing migration:\n`)
		
		sampleRecords.forEach((record, index) => {
			console.log(`${index + 1}. ID: ${record.id}`)
			console.log(`   Mission: ${record.mission}`)
			console.log(`   Vessel: ${record.vessel}`)
			console.log(`   Event: ${record.event}`)
			console.log(`   Parent Event: ${record.parentEvent || 'null'}`)
			console.log(`   Location: ${record.location || 'null'}`)
			console.log(`   Cost Dedicated To: ${record.costDedicatedTo || 'null'}`)
			console.log(`   Port Type: ${record.portType || 'null'}`)
			console.log(`   Current Department: ${record.department || 'null'}`)
			console.log('')
		})
		
		// Analyze patterns
		const locations = sampleRecords.map(r => r.location).filter(l => l)
		const parentEvents = sampleRecords.map(r => r.parentEvent).filter(p => p)
		const events = sampleRecords.map(r => r.event).filter(e => e)
		const costDedicatedTo = sampleRecords.map(r => r.costDedicatedTo).filter(c => c)
		
		console.log('Pattern Analysis:')
		console.log('-----------------')
		console.log(`Unique locations: ${new Set(locations).size}`)
		console.log(`Unique parent events: ${new Set(parentEvents).size}`)
		console.log(`Unique events: ${new Set(events).size}`)
		console.log(`Records with Cost Dedicated To: ${costDedicatedTo.length}`)
		console.log('')
		
	} catch (error) {
		console.error('Error analyzing sample records:', error.message)
	}
}

// Main function
const main = async () => {
	try {
		await checkDatabaseStats()
		await analyzeSampleRecords()
		
		console.log('Status check completed successfully!')
		
	} catch (error) {
		console.error('Status check failed:', error.message)
		process.exit(1)
	}
}

// Entry point
if (require.main === module) {
	main()
}

module.exports = {
	checkDatabaseStats,
	analyzeSampleRecords
}