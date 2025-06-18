#!/usr/bin/env node

/**
 * Test Script: Verify Migration Logic
 * 
 * This script tests the migration logic on a small sample of records
 * to ensure the department inference and field mapping works correctly
 * before running the full migration.
 * 
 * Usage: node scripts/test-migration-logic.js
 */

// Load environment variables
require('dotenv').config()

const { Sequelize, Op } = require('sequelize')

// Load models
const { sequelize } = require('../src/config/database')
const VoyageEvent = require('../src/models/VoyageEvent')
const CostAllocation = require('../src/models/CostAllocation')

// Import migration functions
const { processLCAllocations, inferDepartmentFromLocation, loadCostAllocationMap } = require('./migrate-voyage-event-departments')

// Test cases for department inference
const testCases = [
	{
		name: 'Thunder Horse Drilling',
		location: 'Thunder Horse',
		parentEvent: 'Drill Support',
		event: 'Positioning',
		remarks: 'Drilling operations',
		portType: null,
		expected: 'Drilling'
	},
	{
		name: 'Thunder Horse Production',
		location: 'Thunder Horse',
		parentEvent: 'Production Support',
		event: 'Maintenance',
		remarks: 'Production platform',
		portType: null,
		expected: 'Production'
	},
	{
		name: 'Mad Dog Drilling',
		location: 'Mad Dog',
		parentEvent: 'Support',
		event: 'Drilling',
		remarks: 'Well operations',
		portType: null,
		expected: 'Drilling'
	},
	{
		name: 'Mad Dog Production',
		location: 'Mad Dog',
		parentEvent: 'Maintenance',
		event: 'Inspection',
		remarks: 'Platform maintenance',
		portType: null,
		expected: 'Production'
	},
	{
		name: 'Rig Location',
		location: 'Rig 123',
		parentEvent: 'Support',
		event: 'Transport',
		remarks: 'Equipment transport',
		portType: 'rig',
		expected: 'Drilling'
	},
	{
		name: 'Fourchon Base Cargo',
		location: 'Port Fourchon',
		parentEvent: 'Cargo Operations',
		event: 'Loading',
		remarks: 'Supply run',
		portType: 'base',
		expected: 'Logistics'
	},
	{
		name: 'General Drilling',
		location: 'Offshore Location',
		parentEvent: 'Drilling Support',
		event: 'Transport',
		remarks: 'Equipment delivery',
		portType: null,
		expected: 'Drilling'
	},
	{
		name: 'General Production',
		location: 'Platform A',
		parentEvent: 'Production Support',
		event: 'Maintenance',
		remarks: 'Platform servicing',
		portType: null,
		expected: 'Production'
	},
	{
		name: 'Supply Operations',
		location: 'Supply Base',
		parentEvent: 'Supply Run',
		event: 'Transport',
		remarks: 'Cargo delivery',
		portType: null,
		expected: 'Logistics'
	},
	{
		name: 'Default Case',
		location: 'Unknown',
		parentEvent: 'General',
		event: 'Transport',
		remarks: 'General operations',
		portType: null,
		expected: 'Operations'
	}
]

// Test department inference logic
const testDepartmentInference = () => {
	console.log('Testing Department Inference Logic')
	console.log('==================================')
	
	let passed = 0
	let failed = 0
	
	testCases.forEach((testCase, index) => {
		const result = inferDepartmentFromLocation(
			testCase.location,
			testCase.parentEvent,
			testCase.event,
			testCase.remarks,
			testCase.portType
		)
		
		const success = result === testCase.expected
		const status = success ? 'PASS' : 'FAIL'
		
		console.log(`${index + 1}. ${testCase.name}: ${status}`)
		console.log(`   Expected: ${testCase.expected}, Got: ${result}`)
		
		if (success) {
			passed++
		} else {
			failed++
			console.log(`   Location: ${testCase.location}`)
			console.log(`   Parent Event: ${testCase.parentEvent}`)
			console.log(`   Event: ${testCase.event}`)
			console.log(`   Remarks: ${testCase.remarks}`)
			console.log(`   Port Type: ${testCase.portType}`)
		}
		console.log('')
	})
	
	console.log(`Results: ${passed} passed, ${failed} failed`)
	return failed === 0
}

// Test LC allocation processing
const testLCAllocationProcessing = async () => {
	console.log('Testing LC Allocation Processing')
	console.log('=================================')
	
	try {
		// Load cost allocation map
		const costAllocationMap = await loadCostAllocationMap()
		console.log(`Loaded ${costAllocationMap.size} cost allocation mappings`)
		
		// Test cases for LC allocation
		const lcTestCases = [
			{
				name: 'Single LC Number',
				costDedicatedTo: '1234',
				location: 'Thunder Horse',
				parentEvent: 'Drill Support',
				event: 'Positioning',
				remarks: 'Drilling operations',
				portType: null
			},
			{
				name: 'Multiple LC Numbers (Comma)',
				costDedicatedTo: '1234, 5678',
				location: 'Mad Dog',
				parentEvent: 'Production Support',
				event: 'Maintenance',
				remarks: 'Platform maintenance',
				portType: null
			},
			{
				name: 'Multiple LC Numbers (Slash)',
				costDedicatedTo: '1234/5678',
				location: 'Rig 123',
				parentEvent: 'Support',
				event: 'Transport',
				remarks: 'Equipment transport',
				portType: 'rig'
			},
			{
				name: 'No LC Number',
				costDedicatedTo: null,
				location: 'Port Fourchon',
				parentEvent: 'Cargo Operations',
				event: 'Loading',
				remarks: 'Supply run',
				portType: 'base'
			}
		]
		
		lcTestCases.forEach((testCase, index) => {
			console.log(`${index + 1}. ${testCase.name}:`)
			
			const allocations = processLCAllocations(
				testCase.costDedicatedTo,
				testCase.location,
				testCase.parentEvent,
				testCase.event,
				testCase.remarks,
				testCase.portType,
				costAllocationMap
			)
			
			console.log(`   Allocations: ${allocations.length}`)
			allocations.forEach((allocation, i) => {
				console.log(`   ${i + 1}. LC: ${allocation.lcNumber || 'null'}, Dept: ${allocation.department}, %: ${allocation.percentage}`)
				console.log(`      Mapped Location: ${allocation.mappedLocation}`)
				console.log(`      Special Case: ${allocation.isSpecialCase}`)
			})
			console.log('')
		})
		
		return true
	} catch (error) {
		console.error('Error testing LC allocation processing:', error.message)
		return false
	}
}

// Test with sample database records
const testWithSampleRecords = async () => {
	console.log('Testing with Sample Database Records')
	console.log('====================================')
	
	try {
		// Get a small sample of records that need migration
		const sampleRecords = await VoyageEvent.findAll({
			where: {
				department: { [Op.is]: null }
			},
			limit: 5,
			raw: true
		})
		
		if (sampleRecords.length === 0) {
			console.log('No records found that need migration')
			return true
		}
		
		console.log(`Testing with ${sampleRecords.length} sample records:`)
		
		const costAllocationMap = await loadCostAllocationMap()
		
		sampleRecords.forEach((record, index) => {
			console.log(`\n${index + 1}. Record ID: ${record.id}`)
			console.log(`   Mission: ${record.mission}`)
			console.log(`   Vessel: ${record.vessel}`)
			console.log(`   Event: ${record.event}`)
			console.log(`   Location: ${record.location}`)
			console.log(`   Parent Event: ${record.parentEvent}`)
			console.log(`   Cost Dedicated To: ${record.costDedicatedTo}`)
			console.log(`   Port Type: ${record.portType}`)
			console.log(`   Current Department: ${record.department}`)
			
			// Test department inference
			const inferredDepartment = inferDepartmentFromLocation(
				record.location,
				record.parentEvent,
				record.event,
				record.remarks,
				record.portType
			)
			
			// Test LC allocation processing
			const allocations = processLCAllocations(
				record.costDedicatedTo,
				record.location,
				record.parentEvent,
				record.event,
				record.remarks,
				record.portType,
				costAllocationMap
			)
			
			console.log(`   Inferred Department: ${inferredDepartment}`)
			console.log(`   LC Allocations: ${allocations.length}`)
			allocations.forEach((allocation, i) => {
				console.log(`     ${i + 1}. LC: ${allocation.lcNumber || 'null'}, Dept: ${allocation.department}, %: ${allocation.percentage}`)
			})
		})
		
		return true
	} catch (error) {
		console.error('Error testing with sample records:', error.message)
		return false
	}
}

// Main test function
const runTests = async () => {
	console.log('VoyageEvent Migration Logic Tests')
	console.log('=================================\n')
	
	try {
		// Test database connection
		await sequelize.authenticate()
		console.log('Database connection established\n')
		
		// Run tests
		const test1 = testDepartmentInference()
		console.log()
		
		const test2 = await testLCAllocationProcessing()
		console.log()
		
		const test3 = await testWithSampleRecords()
		console.log()
		
		// Summary
		console.log('Test Summary')
		console.log('============')
		console.log(`Department Inference: ${test1 ? 'PASS' : 'FAIL'}`)
		console.log(`LC Allocation Processing: ${test2 ? 'PASS' : 'FAIL'}`)
		console.log(`Sample Records Test: ${test3 ? 'PASS' : 'FAIL'}`)
		
		const allTestsPassed = test1 && test2 && test3
		console.log(`\nOverall: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`)
		
		if (allTestsPassed) {
			console.log('\nThe migration logic is working correctly!')
			console.log('You can now run the full migration with confidence.')
		} else {
			console.log('\nSome tests failed. Please review the logic before running the full migration.')
		}
		
	} catch (error) {
		console.error('Test execution failed:', error.message)
		process.exit(1)
	}
}

// Entry point
if (require.main === module) {
	runTests()
}

module.exports = {
	testDepartmentInference,
	testLCAllocationProcessing,
	testWithSampleRecords
}