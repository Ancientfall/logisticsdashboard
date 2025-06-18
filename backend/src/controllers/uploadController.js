const XLSX = require('xlsx')
const { sequelize } = require('../config/database')
const { 
	Upload, 
	WellOperation, 
	Vessel, 
	FluidAnalysis,
	VoyageEvent,
	VesselManifest,
	CostAllocation,
	BulkAction,
	VoyageList
} = require('../models')
const logger = require('../utils/logger')
const { getVesselByName, getVesselTypeFromName, getVesselCompanyFromName, getVesselSizeFromName, inferCompanyFromVessel } = require('../data/vesselClassification')

// Helper function to parse Excel/CSV file
const parseFile = (buffer, filename) => {
	try {
		const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
		const sheetName = workbook.SheetNames[0]
		const worksheet = workbook.Sheets[sheetName]
		const data = XLSX.utils.sheet_to_json(worksheet, { 
			raw: false,
			dateNF: 'yyyy-mm-dd'
		})
		
		// Debug logging to see actual column names
		if (data.length > 0) {
			logger.info(`📊 ${filename} columns:`, Object.keys(data[0]))
			logger.info(`📊 ${filename} sample row:`, data[0])
		}
		
		return data
	} catch (error) {
		logger.error(`Error parsing file ${filename}:`, error)
		throw new Error('Failed to parse file. Please ensure it is a valid Excel or CSV file.')
	}
}

// Helper function to validate and transform well operation data
const transformWellData = (rawData) => {
	return rawData.map((row, index) => {
		// Handle different possible column names
		const date = row.Date || row.date || row.DATE
		const well = row.Well || row.well || row.WELL || row['Well Name']
		const production = parseFloat(row.Production || row.production || row.PRODUCTION || 0)
		const consumption = parseFloat(row.Consumption || row.consumption || row.CONSUMPTION || 0)
		
		if (!date || !well) {
			throw new Error(`Row ${index + 2}: Missing required fields (date, well)`)
		}

		return {
			date: new Date(date),
			well,
			production: isNaN(production) ? 0 : production,
			consumption: isNaN(consumption) ? 0 : consumption,
			location: row.Location || row.location || row.LOCATION || null,
			status: row.Status || row.status || row.STATUS || 'Active',
			efficiency: row.Efficiency || row.efficiency || null,
			metadata: {
				originalRow: index + 2,
				rawData: row
			}
		}
	})
}

// Helper function to validate and transform vessel data
const transformVesselData = (rawData) => {
	return rawData.map((row, index) => {
		const date = row.Date || row.date || row.DATE
		const vessel = row.Vessel || row.vessel || row.VESSEL || row['Vessel Name']
		
		if (!date || !vessel) {
			throw new Error(`Row ${index + 2}: Missing required fields (date, vessel)`)
		}

		return {
			date: new Date(date),
			vessel,
			location: row.Location || row.location || row.LOCATION || null,
			cargo: row.Cargo || row.cargo || row.CARGO || null,
			status: row.Status || row.status || row.STATUS || 'Active',
			eta: row.ETA || row.eta ? new Date(row.ETA || row.eta) : null,
			capacity: parseFloat(row.Capacity || row.capacity || 0),
			utilization: parseFloat(row.Utilization || row.utilization || 0),
			metadata: {
				originalRow: index + 2,
				rawData: row
			}
		}
	})
}

// Helper function to validate and transform fluid analysis data
const transformFluidData = (rawData) => {
	return rawData.map((row, index) => {
		const date = row.Date || row.date || row.DATE
		const well = row.Well || row.well || row.WELL || row['Well Name']
		const sample = row.Sample || row.sample || row.SAMPLE || row['Sample ID'] || `S${index + 1}`
		
		if (!date || !well) {
			throw new Error(`Row ${index + 2}: Missing required fields (date, well)`)
		}

		return {
			date: new Date(date),
			well,
			sample,
			oilContent: parseFloat(row['Oil Content'] || row.oil_content || row.OilContent || 0),
			waterContent: parseFloat(row['Water Content'] || row.water_content || row.WaterContent || 0),
			gasContent: parseFloat(row['Gas Content'] || row.gas_content || row.GasContent || 0),
			pressure: parseFloat(row.Pressure || row.pressure || row.PRESSURE || 0),
			temperature: parseFloat(row.Temperature || row.temperature || row.TEMPERATURE || 0),
			metadata: {
				originalRow: index + 2,
				rawData: row
			}
		}
	})
}

// Create lookup maps for enhanced processing (mirroring IndexedDB processors)
const createCostAllocationMap = (costAllocationData) => {
	const map = new Map()
	costAllocationData.forEach(cost => {
		if (cost.lcNumber) {
			map.set(cost.lcNumber.toString(), cost)
		}
	})
	return map
}

// Enhanced LC allocation logic matching IndexedDB exactly
const processLCAllocations = (costDedicatedTo, location, parentEvent, event, remarks, portType, costAllocationMap) => {
	const allocations = []
	
	// Production LC mappings from Master Facilities (Thunder Horse & Mad Dog)
	const productionLCs = new Set([
		'9358', '9360', '10097', '10099', '10081', '10084', 
		'10074', '10072', '10052', '10067' // Thunder Horse & Mad Dog Production LCs
	])
	
	// Fourchon Logistics LCs
	const logisticsLCs = new Set(['999', '333', '7777', '8888'])
	
	if (!costDedicatedTo) {
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
		return allocations
	}
	
	// Parse complex LC allocation formats like "9358 45, 10137 12, 10101"
	const costStr = costDedicatedTo.toString().trim()
	const lcAllocations = []
	
	// Split by various delimiters (comma, semicolon, pipe)
	const parts = costStr.split(/[,;|]/).map(part => part.trim()).filter(part => part)
	
	let totalExplicitPercentage = 0
	let lcWithoutPercentage = []
	
	parts.forEach(part => {
		// Try to extract LC number and percentage
		// Format: "9358 45" or "9358" or "9358-45" or "LC9358: 45%"
		const match = part.match(/(\d{3,5})\s*[-:]?\s*(\d+(?:\.\d+)?)?%?/)
		
		if (match) {
			const lcNumber = match[1]
			const percentage = match[2] ? parseFloat(match[2]) : null
			
			if (percentage !== null && percentage > 0 && percentage <= 100) {
				lcAllocations.push({ lcNumber, percentage })
				totalExplicitPercentage += percentage
			} else {
				lcWithoutPercentage.push(lcNumber)
			}
		}
	})
	
	// Handle remaining percentage for LCs without explicit percentages
	const remainingPercentage = Math.max(0, 100 - totalExplicitPercentage)
	const percentagePerRemainingLC = lcWithoutPercentage.length > 0 ? remainingPercentage / lcWithoutPercentage.length : 0
	
	// Add LCs without explicit percentages
	lcWithoutPercentage.forEach(lcNumber => {
		if (percentagePerRemainingLC > 0) {
			lcAllocations.push({ lcNumber, percentage: percentagePerRemainingLC })
		}
	})
	
	// If no valid LC allocations found, fall back to basic parsing
	if (lcAllocations.length === 0) {
		const basicLCs = costStr.split(/[,\/;]/).map(lc => lc.trim().replace(/\D/g, '')).filter(lc => lc)
		const evenPercentage = basicLCs.length > 0 ? 100 / basicLCs.length : 100
		
		basicLCs.forEach(lcNumber => {
			lcAllocations.push({ lcNumber, percentage: evenPercentage })
		})
	}
	
	// Create allocations with enhanced department inference
	lcAllocations.forEach(({ lcNumber, percentage }) => {
		let department
		let isSpecialCase = false
		let mappedLocation = location
		
		// Priority 1: Cost Allocation lookup (most authoritative)
		const costAllocation = costAllocationMap.get(lcNumber)
		if (costAllocation) {
			department = costAllocation.department
			mappedLocation = costAllocation.rigReference || location
			isSpecialCase = true
		}
		// Priority 2: Master Facilities Production LC mapping
		else if (productionLCs.has(lcNumber)) {
			department = 'Production'
			// Map to specific facilities
			if (['9358', '10097', '10084', '10072', '10067'].includes(lcNumber)) {
				mappedLocation = 'Mad Dog Production Facility'
			} else if (['9360', '10099', '10081', '10074', '10052'].includes(lcNumber)) {
				mappedLocation = 'Thunder Horse Production Facility'
			}
			isSpecialCase = true
		}
		// Priority 3: Fourchon Logistics LCs
		else if (logisticsLCs.has(lcNumber)) {
			department = 'Logistics'
			mappedLocation = 'Fourchon Logistics Base'
			isSpecialCase = true
		}
		// Priority 4: Location-based inference (fallback)
		else {
			department = inferDepartmentFromLocation(location, parentEvent, event, remarks, portType)
		}
		
		allocations.push({
			lcNumber,
			department,
			percentage: Math.round(percentage * 100) / 100, // Round to avoid floating point issues
			mappedLocation,
			originalLocation: location,
			isSpecialCase
		})
	})
	
	return allocations
}

// Enhanced department inference matching IndexedDB sophistication
const inferDepartmentFromLocation = (location, parentEvent, event, remarks, portType) => {
	const locationLower = (location || '').toLowerCase()
	const eventLower = (event || '').toLowerCase()
	const parentEventLower = (parentEvent || '').toLowerCase()
	const remarksLower = (remarks || '').toLowerCase()
	const portTypeLower = (portType || '').toLowerCase()
	
	// Combine all text for comprehensive analysis
	const combinedText = `${locationLower} ${eventLower} ${parentEventLower} ${remarksLower} ${portTypeLower}`
	
	// Priority 1: Thunder Horse & Mad Dog Production facility inference
	if (locationLower.includes('thunder') || locationLower.includes('thunderhorse') || 
		locationLower.includes('thr') || locationLower.includes('mad dog') || 
		locationLower.includes('maddog')) {
		// Check if it's production-related activity
		if (combinedText.includes('production') || combinedText.includes('process') || 
			combinedText.includes('manifold') || combinedText.includes('flowline') ||
			combinedText.includes('separator') || combinedText.includes('facility') ||
			combinedText.includes('platform')) {
			return 'Production'
		}
		// Default Thunder Horse/Mad Dog to Production unless clearly drilling
		if (!combinedText.includes('drill') && !combinedText.includes('rig')) {
			return 'Production'
		}
	}
	
	// Priority 2: Drilling operations (comprehensive keywords)
	const drillingKeywords = [
		'drill', 'drilling', 'rig', 'spud', 'bop', 'blowout preventer',
		'casing', 'cementing', 'mud', 'wellhead', 'derrick', 'rotary',
		'bit', 'pipe', 'tubular', 'completion', 'workover', 'sidetrack'
	]
	
	if (drillingKeywords.some(keyword => combinedText.includes(keyword))) {
		return 'Drilling'
	}
	
	// Priority 3: Production operations (comprehensive keywords)
	const productionKeywords = [
		'production', 'producing', 'process', 'processing', 'manifold',
		'flowline', 'pipeline', 'separator', 'christmas tree', 'xmas tree',
		'facility', 'platform', 'deck', 'module', 'compressor', 'pump',
		'injection', 'treatment', 'gas lift', 'subsea', 'umbilical'
	]
	
	if (productionKeywords.some(keyword => combinedText.includes(keyword))) {
		return 'Production'
	}
	
	// Priority 4: Logistics operations (comprehensive keywords)
	const logisticsKeywords = [
		'supply', 'transport', 'cargo', 'personnel', 'crew change', 'crew boat',
		'helicopter', 'helideck', 'logistics', 'fourchon', 'base', 'shore',
		'vessel', 'boat', 'barge', 'supply boat', 'crew transfer',
		'mobilization', 'demobilization', 'standby', 'positioning', 'anchor',
		'towing', 'utility', 'subsea support', 'dive support', 'construction'
	]
	
	if (logisticsKeywords.some(keyword => combinedText.includes(keyword))) {
		return 'Logistics'
	}
	
	// Priority 5: Port Type specific inference
	if (portTypeLower === 'rig') return 'Drilling'
	if (portTypeLower === 'production' || portTypeLower === 'facility') return 'Production'
	if (portTypeLower === 'supply' || portTypeLower === 'logistics' || portTypeLower === 'base') return 'Logistics'
	
	// Priority 6: Location-specific patterns
	if (locationLower.includes('fourchon') || locationLower.includes('base') || 
		locationLower.includes('shore')) {
		return 'Logistics'
	}
	
	// Priority 7: Event-based patterns
	if (eventLower.includes('mobiliz') || eventLower.includes('demobiliz') ||
		eventLower.includes('standby') || eventLower.includes('positioning')) {
		return 'Logistics'
	}
	
	if (eventLower.includes('maintenance') || eventLower.includes('inspection') ||
		eventLower.includes('repair') || eventLower.includes('install')) {
		// Context-dependent: could be any department
		if (combinedText.includes('drill') || combinedText.includes('rig')) return 'Drilling'
		if (combinedText.includes('production') || combinedText.includes('facility')) return 'Production'
		return 'Operations'
	}
	
	// Priority 8: Generic vessel operations
	if (eventLower.includes('transit') || eventLower.includes('voyage') ||
		eventLower.includes('sailing') || eventLower.includes('weather')) {
		return 'Logistics'
	}
	
	// Default: If we have vessel/location context but no clear department, default to Logistics
	if (locationLower || eventLower.includes('vessel') || eventLower.includes('boat')) {
		return 'Logistics'
	}
	
	return 'Operations'
}

// Helper function to validate and transform voyage event data (enhanced to mirror IndexedDB processors)
const transformVoyageEventData = (rawData, costAllocationMap = new Map()) => {
	const processedEvents = []
	
	rawData.forEach((row, index) => {
		try {
			// Use exact field names from RawVoyageEvent interface
			const mission = row.Mission || 'Default Mission'
			const vessel = row.Vessel || 'Unknown Vessel'
			const event = row.Event || 'Event'
			
			// Parse dates safely
			const parseDate = (dateStr) => {
				if (!dateStr) return new Date()
				const date = new Date(dateStr)
				return isNaN(date.getTime()) ? new Date() : date
			}

			// Parse dates
			const from = parseDate(row.From)
			const to = parseDate(row.To)
			
			// Calculate hours
			let hours = parseFloat(row.Hours || 0)
			if ((hours === 0 || !hours) && from && to) {
				hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60)
			}
			
			// Process LC allocations using enhanced logic
			const lcAllocations = processLCAllocations(
				row['Cost Dedicated to'],
				row.Location,
				row['Parent Event'],
				row.Event,
				row.Remarks,
				row['Port Type'],
				costAllocationMap
			)
			
			// Create an event for each LC allocation (mirroring IndexedDB logic)
			lcAllocations.forEach((allocation, allocIndex) => {
				const finalHours = hours * (allocation.percentage / 100)
				const eventDate = from || new Date()
				
				// Add computed date fields (matching IndexedDB)
				const eventYear = eventDate.getFullYear()
				const monthNumber = eventDate.getMonth() + 1
				const quarter = `Q${Math.ceil(monthNumber / 3)}`
				const monthName = eventDate.toLocaleString('default', { month: 'long' })
				const dayOfWeek = eventDate.toLocaleString('default', { weekday: 'long' })
				const dayOfMonth = eventDate.getDate()
				
				// Get week number (matching IndexedDB logic)
				const getWeekNumber = (date) => {
					const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
					const pastDaysOfYear = (date - firstDayOfYear) / 86400000
					return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
				}
				const weekOfYear = getWeekNumber(eventDate)
				
				// Location type inference (matching IndexedDB)
				const locationType = (row['Port Type'] || '').toLowerCase() === 'rig' ? 'Offshore' : 
									  (row['Port Type'] || '').toLowerCase() === 'onshore' ? 'Onshore' : 'Other'
				
				// Enhanced activity category inference (matching IndexedDB and dashboard expectations)
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
				const activityCategory = classifyActivity(row['Parent Event'], row.Event)
				
				// Enhanced company inference using vessel classification data
				const company = inferCompanyFromVessel(vessel)
				
				// Enhanced vessel information from classification data
				const vesselInfo = getVesselByName(vessel)
				const vesselType = getVesselTypeFromName(vessel)
				const vesselSize = getVesselSizeFromName(vessel)
				
				// Enhanced vessel cost calculation using vessel size and type
				const baseHourlyRate = vesselSize > 300 ? 1500 : vesselSize > 250 ? 1200 : vesselSize > 200 ? 1000 : 800
				const vesselHourlyRate = vesselType === 'FSV' ? baseHourlyRate * 0.8 : baseHourlyRate // FSVs typically cost less
				const vesselDailyRate = vesselHourlyRate * 24
				const vesselCostTotal = finalHours * vesselHourlyRate
				
				// Standardized voyage number
				const standardizedVoyageNumber = (row['Voyage Number'] || '').toString().trim()
				
				processedEvents.push({
					mission,
					event,
					parentEvent: row['Parent Event'] || null,
					location: row.Location || null,
					mappedLocation: allocation.mappedLocation,
					quay: row.Quay || null,
					remarks: row.Remarks || null,
					
					// Add all computed fields matching IndexedDB
					eventYear,
					quarter,
					monthNumber,
					monthName,
					weekOfYear,
					dayOfWeek,
					dayOfMonth,
					locationType,
					activityCategory,
					company,
					vesselCostTotal,
					vesselDailyRate,
					vesselHourlyRate,
					standardizedVoyageNumber,
					isActive: true, // Process all records ignoring "Is active?" column (matching IndexedDB logic)
					from: row.From || null,
					to: row.To || null,
					hours,
					finalHours: Number(isNaN(finalHours) ? 0 : finalHours.toFixed(2)),
					eventDate,
					portType: row['Port Type'] || null,
					eventCategory: row['Event Category'] || null,
					year: parseInt(row.Year || new Date().getFullYear()),
					ins500m: row['Ins. 500m'] ? String(row['Ins. 500m']).toLowerCase() === 'true' : false,
					costDedicatedTo: row['Cost Dedicated to'] || null,
					vessel,
					voyageNumber: String(row['Voyage Number'] || row['Voyage #'] || ''),
					
					// Enhanced fields from IndexedDB processors
					department: allocation.department,
					lcNumber: allocation.lcNumber,
					lcPercentage: allocation.percentage,
					mappingStatus: allocation.isSpecialCase ? "LC Mapped" : "Location Inferred",
					dataIntegrity: allocation.isSpecialCase ? "Valid" : "Inferred",
					
					metadata: {
						originalRow: index + 2,
						rawData: row,
						allocationIndex: allocIndex,
						vesselClassification: vesselInfo ? {
							company: vesselInfo.company,
							vesselType: vesselInfo.vesselType,
							category: vesselInfo.category,
							size: vesselInfo.size,
							status: vesselInfo.status
						} : null
					}
				})
			})
		} catch (error) {
			console.error(`Error processing voyage event row ${index + 2}:`, error)
			// Add a basic record for failed processing
			processedEvents.push({
				mission: row.Mission || 'Default Mission',
				event: row.Event || 'Event',
				parentEvent: row['Parent Event'] || null,
				location: row.Location || null,
				mappedLocation: row.Location || null,
				quay: row.Quay || null,
				remarks: row.Remarks || null,
				isActive: true,
				from: row.From || null,
				to: row.To || null,
				hours: 0,
				finalHours: 0,
				eventDate: new Date(),
				portType: row['Port Type'] || null,
				eventCategory: row['Event Category'] || null,
				year: parseInt(row.Year || new Date().getFullYear()),
				ins500m: false,
				costDedicatedTo: row['Cost Dedicated to'] || null,
				vessel: row.Vessel || 'Unknown Vessel',
				voyageNumber: String(row['Voyage Number'] || row['Voyage #'] || ''),
				department: 'Operations',
				lcNumber: null,
				lcPercentage: 100,
				mappingStatus: "Error - Default Values",
				dataIntegrity: "Invalid",
				metadata: {
					originalRow: index + 2,
					rawData: row,
					processingError: error.message
				}
			})
		}
	})
	
	return processedEvents
}

// Enhanced vessel manifest transformation matching IndexedDB sophistication
const transformVesselManifestData = (rawData) => {
	return rawData.map((row, index) => {
		// Use exact field names from RawVesselManifest interface
		const voyageId = row['Voyage Id'] || `auto-voyage-${Date.now()}-${index}`
		const manifestNumber = row['Manifest Number'] || null
		const manifestDate = row['Manifest Date'] ? new Date(row['Manifest Date']) : new Date()
		
		// Enhanced location processing (matching IndexedDB)
		const from = row.From || null
		const offshoreLocation = row['Offshore Location'] || null
		
		const classifyLocation = (location) => {
			if (!location) return 'Unknown'
			const loc = location.toLowerCase()
			if (loc.includes('thunder') || loc.includes('mad dog') || loc.includes('rig')) return 'Offshore Platform'
			if (loc.includes('fourchon') || loc.includes('base') || loc.includes('shore')) return 'Shore Base'
			if (loc.includes('facility') || loc.includes('terminal')) return 'Processing Facility'
			return 'Other'
		}
		
		// Enhanced cargo and transfer classification
		const type = row.Type || null
		const transporter = row.Transporter || null
		
		const classifyTransferType = (type, transporter, deckLbs, wetBulkBbls) => {
			if (wetBulkBbls > 0) return 'Bulk Liquid Transfer'
			if (deckLbs > 0) return 'Deck Cargo Transfer'
			if (type && type.toLowerCase().includes('supply')) return 'Supply Transfer'
			if (type && type.toLowerCase().includes('crew')) return 'Personnel Transfer'
			return 'General Transfer'
		}
		
		// Calculate volumes and weights
		const deckLbs = parseFloat(row['Deck Lbs'] || 0)
		const deckTons = parseFloat(row['Deck Tons'] || 0)
		const rtTons = parseFloat(row['RT Tons'] || 0)
		const wetBulkBbls = parseFloat(row['Wet Bulk (bbls)'] || 0)
		const wetBulkGals = parseFloat(row['Wet Bulk (gals)'] || 0)
		const deckSqft = parseFloat(row['Deck Sqft'] || 0)
		const lifts = parseInt(row.Lifts || 0)
		
		// Enhanced department inference
		const inferDepartmentFromManifest = (transferType, from, offshoreLocation) => {
			const fromType = classifyLocation(from)
			const toType = classifyLocation(offshoreLocation)
			
			// Priority 1: Transfer type classification
			if (transferType === 'Bulk Liquid Transfer') {
				// Could be drilling fluids, completion fluids, or production chemicals
				if (fromType === 'Shore Base' && toType === 'Offshore Platform') return 'Logistics'
				if (toType === 'Offshore Platform') return 'Drilling' // Assume drilling unless specified
			}
			
			if (transferType === 'Personnel Transfer') return 'Logistics'
			if (transferType === 'Supply Transfer') return 'Logistics'
			
			// Priority 2: Location-based classification
			if (fromType === 'Shore Base' && toType === 'Offshore Platform') return 'Logistics'
			if (fromType === 'Offshore Platform' && toType === 'Shore Base') return 'Logistics'
			if (fromType === 'Offshore Platform' && toType === 'Offshore Platform') return 'Production'
			
			return 'Operations'
		}
		
		// Enhanced computed fields (matching IndexedDB)
		const transferType = classifyTransferType(type, transporter, deckLbs, wetBulkBbls)
		const department = inferDepartmentFromManifest(transferType, from, offshoreLocation)
		const fromLocationType = classifyLocation(from)
		const toLocationType = classifyLocation(offshoreLocation)
		
		// Date computations
		const eventYear = manifestDate.getFullYear()
		const monthNumber = manifestDate.getMonth() + 1
		const quarter = `Q${Math.ceil(monthNumber / 3)}`
		const monthName = manifestDate.toLocaleString('default', { month: 'long' })
		
		// Total cargo calculations
		const totalWeightLbs = deckLbs + (deckTons * 2000) + (rtTons * 2000)
		const totalVolumeBbls = wetBulkBbls + (wetBulkGals / 42)
		
		// Enhanced company inference from transporter using vessel classification
		const company = inferCompanyFromVessel(transporter)

		return {
			voyageId: String(voyageId),
			manifestNumber,
			transporter,
			type,
			manifestDate,
			costCode: row['Cost Code'] || null,
			from,
			offshoreLocation,
			deckLbs,
			deckTons,
			rtTons,
			lifts,
			wetBulkBbls,
			wetBulkGals,
			deckSqft,
			remarks: row.Remarks || null,
			year: parseInt(row.Year || manifestDate.getFullYear()),
			
			// Enhanced computed fields (matching IndexedDB and VesselManifest model)
			standardizedTransporter: transporter,
			standardizedFrom: from,
			standardizedOffshoreLocation: offshoreLocation,
			company,
			facilityName: offshoreLocation,
			facilityType: classifyLocation(offshoreLocation),
			department,
			lcNumber: row['LC Number'] || row['Cost Code'] || null,
			costAllocationData: row['Cost Code'] ? { costCode: row['Cost Code'] } : null,
			month: manifestDate.getMonth() + 1,
			monthName: manifestDate.toLocaleString('default', { month: 'long' }),
			monthYear: `${manifestDate.toLocaleString('default', { month: 'long' })} ${manifestDate.getFullYear()}`,
			totalWeight: totalWeightLbs,
			totalVolume: totalVolumeBbls,
			cargoEfficiency: Math.min(100, (deckSqft > 0 ? (totalWeightLbs / deckSqft) * 10 : 0)),
			liftsPerTon: (deckTons + rtTons) > 0 ? lifts / (deckTons + rtTons) : 0,
			utilizationPercentage: Math.min(100, (deckSqft > 0 ? (totalWeightLbs / deckSqft) * 10 : 0)),
			voyageSegmentId: `${String(voyageId)}-${manifestNumber || 'unknown'}`,
			voyageSegmentInfo: {
				transferType,
				fromLocationType,
				toLocationType,
				transferDirection: fromLocationType === 'Shore Base' ? 'Outbound' : 'Inbound',
				isOffshoreTransfer: fromLocationType !== toLocationType
			},
			processedAt: new Date(),
			
			metadata: {
				originalRow: index + 2,
				rawData: row,
				fromLocationClassification: fromLocationType,
				toLocationClassification: toLocationType,
				transferTypeClassification: transferType
			}
		}
	})
}

// Helper function to validate and transform cost allocation data
const transformCostAllocationData = (rawData) => {
	return rawData.map((row, index) => {
		const lcNumber = row['LC Number'] || row.lcNumber || row.lc_number
		
		if (!lcNumber) {
			throw new Error(`Row ${index + 2}: Missing required field (lcNumber)`)
		}

		// Enhanced department inference based on multiple fields
		let department = row.Department || row.department || row.DEPARTMENT
		if (!department) {
			const projectType = (row['Project Type'] || '').toLowerCase()
			const description = (row.Description || '').toLowerCase()
			const mission = (row.Mission || '').toLowerCase()
			const rigReference = (row['Rig Reference'] || '').toLowerCase()
			const costElement = (row['Cost Element'] || '').toLowerCase()
			
			// Use Project Type as primary indicator
			if (projectType.includes('drill')) {
				department = 'Drilling'
			} else if (projectType.includes('production') || projectType.includes('prod')) {
				department = 'Production'
			} else if (mission.includes('supply') || mission.includes('transport') || mission.includes('cargo')) {
				department = 'Logistics'
			} else if (description.includes('drill') || rigReference.includes('drill') || costElement.includes('drill')) {
				department = 'Drilling'
			} else if (description.includes('prod') || rigReference.includes('prod') || costElement.includes('prod')) {
				department = 'Production'
			} else if (lcNumber.includes('DRL') || lcNumber.includes('DRILL')) {
				department = 'Drilling'
			} else if (lcNumber.includes('PRD') || lcNumber.includes('PROD')) {
				department = 'Production'
			} else if (lcNumber.includes('LOG') || lcNumber.includes('SHIP')) {
				department = 'Logistics'
			} else if (lcNumber.includes('MNT') || lcNumber.includes('MAINT')) {
				department = 'Maintenance'
			} else {
				department = 'Operations'
			}
		}

		// Enhanced date processing
		const monthYear = row['Month-Year'] || row.monthYear || row.month_year || null
		let parsedDate = null
		let year = null
		let month = null
		let quarter = null
		let monthName = null
		
		if (monthYear) {
			try {
				// Handle various date formats: "Jan-2024", "2024-01", "January 2024"
				const dateStr = monthYear.toString()
				if (dateStr.includes('-')) {
					const parts = dateStr.split('-')
					if (parts.length === 2) {
						// Could be "Jan-2024" or "2024-01"
						if (parts[0].length === 4) {
							// "2024-01" format
							parsedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
						} else {
							// "Jan-2024" format
							const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
							const monthIndex = monthNames.indexOf(parts[0].toLowerCase())
							if (monthIndex !== -1) {
								parsedDate = new Date(parseInt(parts[1]), monthIndex)
							}
						}
					}
				} else {
					// Try direct parsing
					parsedDate = new Date(dateStr)
				}
				
				if (parsedDate && !isNaN(parsedDate.getTime())) {
					year = parsedDate.getFullYear()
					month = parsedDate.getMonth() + 1
					quarter = `Q${Math.ceil(month / 3)}`
					monthName = parsedDate.toLocaleString('default', { month: 'long' })
				}
			} catch (e) {
				// Keep null values if parsing fails
			}
		}
		
		// Enhanced cost calculations
		const allocatedDays = parseFloat(row['Alloc (days)'] || row['Total Allocated Days'] || row.allocatedDays || row.allocated_days || 0)
		const avgVesselCostPerDay = parseFloat(row['Average Vessel Cost Per Day'] || row.avgVesselCostPerDay || row.avg_vessel_cost_per_day || 0)
		const totalCost = parseFloat(row['Total Cost'] || row.totalCost || row.total_cost || row.Amount || row.amount || 0)
		
		// Calculate derived cost metrics
		const dailyRate = totalCost > 0 && allocatedDays > 0 ? totalCost / allocatedDays : avgVesselCostPerDay
		const hourlyRate = dailyRate / 24
		const costPerBarrel = 0 // Would need production data to calculate
		
		// Enhanced location classification
		const rigLocation = row['Rig Location'] || row.rigLocation || row.rig_location || null
		const rigReference = row['Rig Reference'] || row.rigReference || row.rig_reference || null
		
		const classifyRigLocation = (location, reference) => {
			const combined = `${location || ''} ${reference || ''}`.toLowerCase()
			if (combined.includes('thunder') || combined.includes('thunderhorse')) return 'Thunder Horse'
			if (combined.includes('mad dog') || combined.includes('maddog')) return 'Mad Dog'
			if (combined.includes('offshore') || combined.includes('rig')) return 'Offshore'
			if (combined.includes('onshore') || combined.includes('land')) return 'Onshore'
			return 'Unknown'
		}
		
		const locationCategory = classifyRigLocation(rigLocation, rigReference)
		
		// Enhanced project classification
		const projectType = row['Project Type'] || row.projectType || row.project_type || null
		const description = row.Description || row.description || row.DESCRIPTION || null
		const costElement = row['Cost Element'] || row.costElement || row.cost_element || null
		
		const classifyProjectCategory = (projectType, description, costElement) => {
			const combined = `${projectType || ''} ${description || ''} ${costElement || ''}`.toLowerCase()
			
			if (combined.includes('exploration') || combined.includes('wildcat')) return 'Exploration'
			if (combined.includes('development') || combined.includes('devex')) return 'Development'
			if (combined.includes('production') || combined.includes('opex')) return 'Production'
			if (combined.includes('workover') || combined.includes('intervention')) return 'Workover'
			if (combined.includes('abandonment') || combined.includes('plug')) return 'Abandonment'
			if (combined.includes('facility') || combined.includes('infrastructure')) return 'Facilities'
			return 'General'
		}
		
		const projectCategory = classifyProjectCategory(projectType, description, costElement)
		
		// Water depth classification
		const waterDepth = row['Water Depth'] || row.waterDepth || row.water_depth || null
		const classifyWaterDepth = (depth) => {
			if (!depth) return 'Unknown'
			const depthNum = parseFloat(depth.toString().replace(/[^\d.]/g, ''))
			if (depthNum < 500) return 'Shallow Water'
			if (depthNum < 1500) return 'Deepwater'
			return 'Ultra-Deepwater'
		}
		
		const waterDepthCategory = classifyWaterDepth(waterDepth)
		
		// Enhanced company inference from rig reference, mission, or vessel name
		const mission = row.Mission || row.mission || row.MISSION || null
		const vesselName = row['Vessel Name'] || row.vesselName || row.vessel_name || null
		
		const inferCompanyFromCostAllocation = (rigRef, mission, vesselName) => {
			// First try vessel classification if vessel name is available
			if (vesselName) {
				const vesselCompany = getVesselCompanyFromName(vesselName)
				if (vesselCompany !== 'Unknown') return vesselCompany
			}
			
			// Fallback to pattern matching
			const combined = `${rigRef || ''} ${mission || ''}`.toLowerCase()
			if (combined.includes('bp') || combined.includes('british petroleum')) return 'BP'
			if (combined.includes('shell')) return 'Shell'
			if (combined.includes('chevron')) return 'Chevron'
			if (combined.includes('exxon')) return 'ExxonMobil'
			return 'Operator'
		}

		return {
			lcNumber,
			rigReference,
			description,
			costElement,
			monthYear,
			mission,
			projectType,
			allocatedDays,
			avgVesselCostPerDay,
			totalCost,
			rigLocation,
			locationReference: rigReference, // Dashboard expects this field
			rigType: row['Rig Type'] || row.rigType || row.rig_type || null,
			waterDepth,
			department,
			
			// Enhanced computed fields (matching IndexedDB and CostAllocation model)
			costAllocationDate: parsedDate,
			standardizedLCNumber: lcNumber,
			standardizedRigReference: rigReference,
			projectCategory,
			waterDepthCategory,
			waterDepthMeters: waterDepth ? parseFloat(waterDepth.toString().replace(/[^\d.]/g, '')) : null,
			location: locationCategory,
			costPerHour: hourlyRate,
			costEfficiency: allocatedDays > 0 ? totalCost / allocatedDays : 0,
			utilizationPercentage: allocatedDays > 0 ? Math.min(100, allocatedDays / 30 * 100) : 0,
			productivityScore: Math.min(100, (totalCost > 0 && allocatedDays > 0) ? (totalCost / allocatedDays / 1000) * 10 : 0),
			costVariance: avgVesselCostPerDay > 0 ? ((dailyRate - avgVesselCostPerDay) / avgVesselCostPerDay) * 100 : 0,
			budgetUtilization: avgVesselCostPerDay > 0 ? Math.min(100, (totalCost / (avgVesselCostPerDay * allocatedDays)) * 100) : 0,
			isActive: true,
			
			metadata: {
				originalRow: index + 2,
				rawData: row,
				locationClassification: locationCategory,
				projectCategoryClassification: projectCategory,
				waterDepthClassification: waterDepthCategory,
				dateParsingStatus: parsedDate ? 'success' : 'failed',
				company: inferCompanyFromCostAllocation(rigReference, mission, vesselName),
				vesselClassification: vesselName ? getVesselByName(vesselName) : null
			}
		}
	})
}

// Enhanced bulk action (fluid movements) transformation matching IndexedDB sophistication
const transformBulkActionData = (rawData) => {
	return rawData.map((row, index) => {
		const vesselName = row['Vessel Name'] || row.vesselName || row.vessel_name || row.Vessel || row.vessel
		const manifestDate = row['Start Date'] || row.manifestDate || row.manifest_date ? 
			new Date(row['Start Date'] || row.manifestDate || row.manifest_date) : new Date()
		
		// Enhanced fluid classification (matching IndexedDB bulkFluidClassification.ts)
		const cargoType = row['Bulk Type'] || row['Cargo Type'] || row.cargoType || row.cargo_type || row.Type || row.type || null
		const cargoDescription = row['Cargo Description'] || row.cargoDescription || row.cargo_description || row.Description || row.description || row.Tank || null
		const tank = row.Tank || null
		
		const classifyFluidType = (cargoType, cargoDescription, tank) => {
			const combined = `${cargoType || ''} ${cargoDescription || ''} ${tank || ''}`.toLowerCase()
			
			// Drilling Fluids Classification
			if (combined.includes('wbm') || combined.includes('water based mud')) return 'Water-Based Mud (WBM)'
			if (combined.includes('obm') || combined.includes('oil based mud')) return 'Oil-Based Mud (OBM)'
			if (combined.includes('sbm') || combined.includes('synthetic based mud')) return 'Synthetic-Based Mud (SBM)'
			if (combined.includes('drill') && combined.includes('mud')) return 'Drilling Mud'
			if (combined.includes('drilling fluid')) return 'Drilling Fluid'
			
			// Completion/Intervention Fluids
			if (combined.includes('calcium bromide') || combined.includes('cabr2')) return 'Calcium Bromide'
			if (combined.includes('calcium chloride') || combined.includes('cacl2')) return 'Calcium Chloride'
			if (combined.includes('sodium bromide') || combined.includes('nabr')) return 'Sodium Bromide'
			if (combined.includes('completion') && combined.includes('brine')) return 'Completion Brine'
			if (combined.includes('packer fluid')) return 'Packer Fluid'
			if (combined.includes('kill fluid')) return 'Kill Fluid'
			
			// Production Chemicals
			if (combined.includes('methanol')) return 'Methanol'
			if (combined.includes('glycol')) return 'Glycol'
			if (combined.includes('corrosion inhibitor')) return 'Corrosion Inhibitor'
			if (combined.includes('scale inhibitor')) return 'Scale Inhibitor'
			if (combined.includes('asphaltene inhibitor')) return 'Asphaltene Inhibitor'
			if (combined.includes('biocide')) return 'Biocide'
			if (combined.includes('production chemical')) return 'Production Chemical'
			
			// Utility Fluids
			if (combined.includes('diesel') || combined.includes('fuel')) return 'Diesel Fuel'
			if (combined.includes('freshwater') || combined.includes('potable water')) return 'Freshwater'
			if (combined.includes('seawater') || combined.includes('sea water')) return 'Seawater'
			if (combined.includes('base oil')) return 'Base Oil'
			if (combined.includes('hydraulic fluid')) return 'Hydraulic Fluid'
			
			// Petroleum Products
			if (combined.includes('crude oil')) return 'Crude Oil'
			if (combined.includes('condensate')) return 'Condensate'
			if (combined.includes('produced water')) return 'Produced Water'
			
			// Waste Products
			if (combined.includes('slop') || combined.includes('waste')) return 'Waste/Slop'
			if (combined.includes('contaminated')) return 'Contaminated Fluid'
			if (combined.includes('spent')) return 'Spent Fluid'
			
			return 'Other Fluid'
		}
		
		const classifyFluidCategory = (fluidType) => {
			const drillingFluids = ['Water-Based Mud (WBM)', 'Oil-Based Mud (OBM)', 'Synthetic-Based Mud (SBM)', 'Drilling Mud', 'Drilling Fluid']
			const completionFluids = ['Calcium Bromide', 'Calcium Chloride', 'Sodium Bromide', 'Completion Brine', 'Packer Fluid', 'Kill Fluid']
			const productionChemicals = ['Methanol', 'Glycol', 'Corrosion Inhibitor', 'Scale Inhibitor', 'Asphaltene Inhibitor', 'Biocide', 'Production Chemical']
			const utilityFluids = ['Diesel Fuel', 'Freshwater', 'Seawater', 'Base Oil', 'Hydraulic Fluid']
			const petroleumProducts = ['Crude Oil', 'Condensate', 'Produced Water']
			const wasteProducts = ['Waste/Slop', 'Contaminated Fluid', 'Spent Fluid']
			
			if (drillingFluids.includes(fluidType)) return 'Drilling'
			if (completionFluids.includes(fluidType)) return 'Completion/Intervention'
			if (productionChemicals.includes(fluidType)) return 'Production Chemical'
			if (utilityFluids.includes(fluidType)) return 'Utility'
			if (petroleumProducts.includes(fluidType)) return 'Petroleum'
			if (wasteProducts.includes(fluidType)) return 'Waste'
			return 'Other'
		}
		
		// Enhanced location and transfer processing
		const from = row.From || row.from || row.FROM || null
		const to = row.To || row.to || row.TO || row['At Port'] || null
		
		const classifyLocation = (location) => {
			if (!location) return 'Unknown'
			const loc = location.toLowerCase()
			if (loc.includes('thunder') || loc.includes('mad dog') || loc.includes('rig')) return 'Offshore Platform'
			if (loc.includes('fourchon') || loc.includes('base') || loc.includes('shore')) return 'Shore Base'
			if (loc.includes('facility') || loc.includes('terminal')) return 'Processing Facility'
			return 'Other'
		}
		
		// Volume and quantity calculations
		const quantity = parseFloat(row.Quantity || row.quantity || row.QUANTITY || row.Qty || row.qty || 0)
		const volume = parseFloat(row.Volume || row.volume || row.VOLUME || 0)
		const weight = parseFloat(row['Pound Per Gallon'] || row.Weight || row.weight || row.WEIGHT || 0)
		const unit = row.Unit || row.unit || row.UNIT || 'gallons'
		
		// Convert to barrels (standard oil industry unit)
		const volumeBbls = unit.toLowerCase().includes('barrel') ? quantity : 
						   unit.toLowerCase().includes('gallon') ? quantity / 42 : 
						   volume ? volume / 42 : quantity / 42
		
		// Enhanced computed fields
		const fluidType = classifyFluidType(cargoType, cargoDescription, tank)
		const fluidCategory = classifyFluidCategory(fluidType)
		const fromLocationType = classifyLocation(from)
		const toLocationType = classifyLocation(to)
		
		// Department inference based on fluid category and transfer direction
		const inferDepartmentFromFluid = (fluidCategory, fromType, toType) => {
			if (fluidCategory === 'Drilling') return 'Drilling'
			if (fluidCategory === 'Completion/Intervention') return 'Drilling'
			if (fluidCategory === 'Production Chemical') return 'Production'
			if (fluidCategory === 'Petroleum') return 'Production'
			
			// Location-based for utility and other fluids
			if (fromType === 'Shore Base' && toType === 'Offshore Platform') return 'Logistics'
			if (fromType === 'Offshore Platform' && toType === 'Shore Base') return 'Logistics'
			if (fromType === 'Offshore Platform' && toType === 'Offshore Platform') return 'Production'
			
			return 'Operations'
		}
		
		const department = inferDepartmentFromFluid(fluidCategory, fromLocationType, toLocationType)
		
		// Date computations
		const eventYear = manifestDate.getFullYear()
		const monthNumber = manifestDate.getMonth() + 1
		const quarter = `Q${Math.ceil(monthNumber / 3)}`
		const monthName = manifestDate.toLocaleString('default', { month: 'long' })
		
		// Enhanced company inference using vessel classification

		return {
			vesselName: vesselName || null,
			voyageNumber: String(row['Voyage Number'] || row.voyageNumber || row.voyage_number || ''),
			manifestNumber: row['Manifest Number'] || row.manifestNumber || row.manifest_number || null,
			manifestDate,
			from,
			to: to,
			cargoType,
			cargoDescription,
			quantity,
			unit,
			weight,
			volume,
			costCode: row['Cost Code'] || row.costCode || row.cost_code || null,
			projectCode: row['Project Code'] || row.projectCode || row.project_code || null,
			department,
			status: row.Status || row.status || row.STATUS || 'completed',
			actionType: row['Action Type'] || row.actionType || row.action_type || row.Action || row.action || null,
			completedDate: row['Completed Date'] || row.completedDate || row.completed_date || row['Start Date'] ? 
				new Date(row['Completed Date'] || row.completedDate || row.completed_date || row['Start Date']) : null,
			remarks: row.Remarks || row.remarks || row.REMARKS || null,
			
			// Enhanced computed fields (matching IndexedDB and BulkAction model)
			portType: row['Port Type'] || null,
			startDate: manifestDate,
			action: row['Action Type'] || row.actionType || row.action_type || row.Action || row.action || 'Transfer',
			qty: quantity,
			ppg: weight,
			bulkType: cargoType,
			bulkDescription: cargoDescription,
			fluidClassification: fluidType,
			fluidCategory,
			fluidSpecificType: fluidType,
			isDrillingFluid: fluidCategory === 'Drilling',
			isCompletionFluid: fluidCategory === 'Completion/Intervention',
			productionChemicalType: fluidCategory === 'Production Chemical' ? fluidType : null,
			atPort: to,
			standardizedOrigin: from,
			destinationPort: to,
			standardizedDestination: to,
			productionPlatform: toLocationType === 'Offshore Platform' ? to : null,
			volumeBbls,
			volumeGals: volumeBbls * 42,
			isReturn: transferDirection === 'Inbound',
			monthNumber,
			year: eventYear,
			monthName,
			monthYear: `${monthName} ${eventYear}`,
			tank: tank,
			
			metadata: {
				originalRow: index + 2,
				rawData: row,
				portType: row['Port Type'] || null,
				bulkType: row['Bulk Type'] || null,
				poundPerGallon: row['Pound Per Gallon'] || null,
				tank,
				fluidClassification: fluidType,
				fluidCategoryClassification: fluidCategory,
				fromLocationClassification: fromLocationType,
				toLocationClassification: toLocationType,
				company: inferCompanyFromVessel(vesselName),
				transferDirection,
				isOffshoreTransfer: fromLocationType !== toLocationType,
				vesselClassification: getVesselByName(vesselName)
			}
		}
	})
}

// Enhanced voyage list transformation matching IndexedDB sophistication  
const transformVoyageListData = (rawData) => {
	return rawData.map((row, index) => {
		// Use exact field names from RawVoyageList interface
		const vesselName = row.Vessel || 'Unknown Vessel'
		const voyageNumber = row['Voyage Number'] || 0
		const mission = row.Mission || 'Unknown Mission'
		const locations = row.Locations || ''
		
		// Enhanced date processing
		const departureDate = row['Start Date'] ? new Date(row['Start Date']) : null
		const arrivalDate = row['End Date'] ? new Date(row['End Date']) : null
		
		// Calculate voyage duration in days
		const calculateVoyageDuration = (start, end) => {
			if (!start || !end) return 0
			const diffTime = Math.abs(end - start)
			return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
		}
		const voyageDuration = calculateVoyageDuration(departureDate, arrivalDate)
		
		// Enhanced location processing (matching IndexedDB)
		const parseLocations = (locationsStr) => {
			if (!locationsStr) return []
			// Split by common delimiters and clean up
			return locationsStr.split(/[,;|]/)
				.map(loc => loc.trim())
				.filter(loc => loc.length > 0)
		}
		
		const locationList = parseLocations(locations)
		
		const classifyLocation = (location) => {
			if (!location) return 'Unknown'
			const loc = location.toLowerCase()
			if (loc.includes('thunder') || loc.includes('mad dog') || loc.includes('rig')) return 'Offshore Platform'
			if (loc.includes('fourchon') || loc.includes('base') || loc.includes('shore')) return 'Shore Base'
			if (loc.includes('facility') || loc.includes('terminal')) return 'Processing Facility'
			return 'Other'
		}
		
		// Determine primary destination and voyage characteristics
		const departurePort = locationList.length > 0 ? locationList[0] : 'Fourchon'
		const arrivalPort = locationList.length > 1 ? locationList[locationList.length - 1] : null
		
		const departurePortType = classifyLocation(departurePort)
		const arrivalPortType = classifyLocation(arrivalPort)
		
		// Enhanced voyage classification
		const classifyVoyageType = (mission, locations, routeType) => {
			const combined = `${mission} ${locations} ${routeType || ''}`.toLowerCase()
			
			if (combined.includes('drill') || combined.includes('rig')) return 'Drilling Support'
			if (combined.includes('production') || combined.includes('facility')) return 'Production Support'
			if (combined.includes('supply') || combined.includes('cargo')) return 'Supply Run'
			if (combined.includes('crew') || combined.includes('personnel')) return 'Personnel Transfer'
			if (combined.includes('emergency') || combined.includes('rescue')) return 'Emergency Response'
			if (combined.includes('maintenance') || combined.includes('service')) return 'Maintenance Support'
			return 'General Operations'
		}
		
		// Enhanced voyage purpose classification
		const classifyVoyagePurpose = (voyageType, mission, locations) => {
			if (voyageType === 'Drilling Support') return 'Drilling Operations'
			if (voyageType === 'Production Support') return 'Production Operations'
			if (voyageType === 'Supply Run') return 'Logistics Operations'
			if (voyageType === 'Personnel Transfer') return 'Crew Operations'
			return 'General Operations'
		}
		
		// Department inference based on voyage characteristics
		const inferDepartmentFromVoyage = (voyagePurpose, departureType, arrivalType) => {
			if (voyagePurpose === 'Drilling Operations') return 'Drilling'
			if (voyagePurpose === 'Production Operations') return 'Production'
			if (voyagePurpose.includes('Logistics') || voyagePurpose.includes('Crew')) return 'Logistics'
			
			// Location-based fallback
			if (departureType === 'Shore Base' && arrivalType === 'Offshore Platform') return 'Logistics'
			if (departureType === 'Offshore Platform' && arrivalType === 'Shore Base') return 'Logistics'
			if (departureType === 'Offshore Platform' && arrivalType === 'Offshore Platform') return 'Production'
			
			return 'Operations'
		}
		
		// Enhanced computed fields
		const routeType = row['Route Type'] || null
		const voyageType = classifyVoyageType(mission, locations, routeType)
		const voyagePurpose = classifyVoyagePurpose(voyageType, mission, locations)
		const department = inferDepartmentFromVoyage(voyagePurpose, departurePortType, arrivalPortType)
		
		// Date computations
		const year = parseInt(row.Year || (departureDate ? departureDate.getFullYear() : new Date().getFullYear()))
		const month = row.Month || (departureDate ? departureDate.toLocaleString('default', { month: 'long' }) : null)
		const quarter = departureDate ? `Q${Math.ceil((departureDate.getMonth() + 1) / 3)}` : null
		const monthNumber = departureDate ? departureDate.getMonth() + 1 : null
		
		// Voyage efficiency calculations
		const estimateDistance = (locationsCount, voyageDuration) => {
			// Rough estimate: Gulf of Mexico average distances
			const avgDistancePerLeg = 50 // nautical miles
			return (locationsCount - 1) * avgDistancePerLeg
		}
		
		const totalDistance = estimateDistance(locationList.length, voyageDuration)
		
		// Vessel utilization metrics
		const calculateUtilization = (voyageDuration, totalLocations) => {
			if (voyageDuration === 0 || totalLocations === 0) return 0
			// Higher utilization for more locations visited in shorter time
			return Math.min(100, (totalLocations / voyageDuration) * 10)
		}
		
		const utilizationScore = calculateUtilization(voyageDuration, locationList.length)
		
		// Enhanced company inference using vessel classification
		const company = inferCompanyFromVessel(vesselName)
		const vesselInfo = getVesselByName(vesselName)

		return {
			vesselName,
			voyageNumber: String(voyageNumber),
			voyageType,
			departurePort,
			departureDate,
			arrivalPort,
			arrivalDate,
			voyageDuration,
			totalDistance,
			fuelConsumption: totalDistance * 0.5, // Estimated based on distance
			cargoCapacity: 0, // Would need vessel specifications
			cargoUtilization: utilizationScore,
			voyageStatus: arrivalDate && arrivalDate < new Date() ? 'completed' : 'planned',
			charterer: null,
			operator: null,
			masterName: null,
			totalCrew: 0,
			voyagePurpose,
			totalRevenue: 0,
			totalCost: totalDistance * 100, // Estimated cost per nautical mile
			profit: 0,
			remarks: null,
			
			// Original fields that match RawVoyageList exactly
			edit: row.Edit || null,
			year,
			month,
			mission,
			routeType,
			locations,
			
			// Enhanced computed fields (matching IndexedDB and VoyageList model)
			standardizedVesselName: vesselName,
			startDate: departureDate,
			endDate: arrivalDate,
			type: voyageType,
			locationList: locationList,
			locationCount: locationList.length,
			hasProduction: locations.toLowerCase().includes('production') || locations.toLowerCase().includes('thunder') || locations.toLowerCase().includes('mad dog'),
			hasDrilling: locations.toLowerCase().includes('drill') || locations.toLowerCase().includes('rig'),
			isSupplyRun: voyageType === 'Supply Run',
			isDrillingSupport: voyageType === 'Drilling Support',
			isProductionSupport: voyageType === 'Production Support',
			locationType: departurePortType,
			voyageClassification: voyageType,
			department,
			durationDays: voyageDuration,
			durationHours: voyageDuration * 24,
			distanceCalculated: totalDistance,
			fuelEfficiency: totalDistance > 0 ? (totalDistance * 0.5) / totalDistance : 0,
			speedAverage: voyageDuration > 0 ? totalDistance / (voyageDuration * 24) : 0,
			utilizationPercentage: utilizationScore,
			costPerDay: voyageDuration > 0 ? (totalDistance * 100) / voyageDuration : 0,
			costPerNauticalMile: 100,
			efficiencyScore: Math.min(100, utilizationScore * (locationList.length / Math.max(1, voyageDuration))),
			company,
			monthName: month,
			monthYear: `${month} ${year}`,
			
			metadata: {
				originalRow: index + 2,
				rawData: row,
				locationList,
				departurePortClassification: departurePortType,
				arrivalPortClassification: arrivalPortType,
				voyageTypeClassification: voyageType,
				voyagePurposeClassification: voyagePurpose,
				vesselClassification: vesselInfo
			}
		}
	})
}

// Upload well operations
exports.uploadWellOperations = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'wells',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformWellData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await WellOperation.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} well operations`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} well operations`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload well operations error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload well operations data'
		})
	}
}

// Upload vessel data
exports.uploadVessels = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'vessels',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformVesselData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await Vessel.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} vessels`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} vessels`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload vessels error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload vessel data'
		})
	}
}

// Upload fluid analysis data
exports.uploadFluidAnalyses = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'fluid-analyses',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformFluidData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await FluidAnalysis.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} fluid analyses`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} fluid analyses`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload fluid analyses error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload fluid analysis data'
		})
	}
}

// Get upload history
exports.getUploadHistory = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 20
		const offset = (page - 1) * limit

		const where = {}
		if (req.user?.role === 'viewer') {
			where.userId = req.user?.id || '00000000-0000-0000-0000-000000000000' // Fallback UUID for development when auth is disabled
		}

		const { count, rows } = await Upload.findAndCountAll({
			where,
			include: [{
				model: require('../models/User'),
				as: 'user',
				attributes: ['id', 'email', 'firstName', 'lastName']
			}],
			order: [['createdAt', 'DESC']],
			limit,
			offset
		})

		res.json({
			success: true,
			data: rows,
			pagination: {
				total: count,
				page,
				limit,
				pages: Math.ceil(count / limit)
			}
		})
	} catch (error) {
		logger.error('Get upload history error:', error)
		res.status(500).json({ error: 'Failed to fetch upload history' })
	}
}

// Get upload details
exports.getUploadDetails = async (req, res) => {
	try {
		const upload = await Upload.findByPk(req.params.uploadId, {
			include: [
				{
					model: require('../models/User'),
					as: 'user',
					attributes: ['id', 'email', 'firstName', 'lastName']
				},
				{
					model: WellOperation,
					as: 'wellOperations',
					limit: 10,
					order: [['date', 'DESC']]
				},
				{
					model: Vessel,
					as: 'vessels',
					limit: 10,
					order: [['date', 'DESC']]
				},
				{
					model: FluidAnalysis,
					as: 'fluidAnalyses',
					limit: 10,
					order: [['date', 'DESC']]
				},
				{
					model: VoyageEvent,
					as: 'voyageEvents',
					limit: 10,
					order: [['createdAt', 'DESC']]
				},
				{
					model: VesselManifest,
					as: 'vesselManifests',
					limit: 10,
					order: [['manifestDate', 'DESC']]
				},
				{
					model: CostAllocation,
					as: 'costAllocations',
					limit: 10,
					order: [['createdAt', 'DESC']]
				},
				{
					model: BulkAction,
					as: 'bulkActions',
					limit: 10,
					order: [['manifestDate', 'DESC']]
				},
				{
					model: VoyageList,
					as: 'voyageLists',
					limit: 10,
					order: [['departureDate', 'DESC']]
				}
			]
		})

		if (!upload) {
			return res.status(404).json({ error: 'Upload not found' })
		}

		// Check permissions
		if (req.user?.role === 'viewer' && upload.userId !== (req.user?.id || '00000000-0000-0000-0000-000000000000')) {
			return res.status(403).json({ error: 'Access denied' })
		}

		res.json({ success: true, data: upload })
	} catch (error) {
		logger.error('Get upload details error:', error)
		res.status(500).json({ error: 'Failed to fetch upload details' })
	}
}

// Upload voyage events
exports.uploadVoyageEvents = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'voyage-events',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Load existing Cost Allocation data for enhanced processing
		const existingCostAllocations = await CostAllocation.findAll({ transaction })
		const costAllocationMap = createCostAllocationMap(existingCostAllocations)
		
		logger.info(`Loaded ${existingCostAllocations.length} cost allocations for enhanced department inference`)
		
		// Transform and validate data with enhanced processing
		const transformedData = transformVoyageEventData(rawData, costAllocationMap)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Enhanced deduplication logic for LC-allocated events
		const existingEvents = await VoyageEvent.findAll({
			attributes: ['mission', 'vessel', 'voyageNumber', 'event', 'from', 'to', 'hours', 'lcNumber', 'lcPercentage'],
			transaction
		})
		
		// Create a Set of existing event signatures including LC allocation details
		const existingSignatures = new Set(
			existingEvents.map(e => `${e.mission}-${e.vessel}-${e.voyageNumber}-${e.event}-${e.from}-${e.to}-${e.hours}-${e.lcNumber || 'null'}-${e.lcPercentage || 100}`)
		)
		
		// Filter out records that would create duplicates (including LC allocation combinations)
		const deduplicatedData = dataWithUploadId.filter(record => {
			const signature = `${record.mission}-${record.vessel}-${record.voyageNumber}-${record.event}-${record.from}-${record.to}-${record.hours}-${record.lcNumber || 'null'}-${record.lcPercentage || 100}`
			return !existingSignatures.has(signature)
		})
		
		logger.info(`📊 Processing stats:`)
		logger.info(`   Raw Excel rows processed: ${rawData.length}`)
		logger.info(`   LC allocations created: ${processedEvents.length}`)
		logger.info(`   Records after adding uploadId: ${dataWithUploadId.length}`)
		logger.info(`   Duplicate records filtered: ${dataWithUploadId.length - deduplicatedData.length}`)
		logger.info(`   Final records to insert: ${deduplicatedData.length}`)

		// Bulk insert only deduplicated records
		const createdRecords = await VoyageEvent.bulkCreate(deduplicatedData, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} voyage events`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} voyage events`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload voyage events error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload voyage events data'
		})
	}
}

// Upload vessel manifests
exports.uploadVesselManifests = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'vessel-manifests',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformVesselManifestData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await VesselManifest.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} vessel manifests`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} vessel manifests`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload vessel manifests error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload vessel manifests data'
		})
	}
}

// Upload cost allocation
exports.uploadCostAllocation = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'cost-allocations',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformCostAllocationData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await CostAllocation.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} cost allocations`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} cost allocations`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload cost allocations error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload cost allocations data'
		})
	}
}

// Upload bulk actions
exports.uploadBulkActions = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'bulk-actions',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformBulkActionData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await BulkAction.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} bulk actions`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} bulk actions`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload bulk actions error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload bulk actions data'
		})
	}
}

// Clear all data from database
exports.clearAllData = async (req, res) => {
	const transaction = await sequelize.transaction()
	
	try {
		// Delete all records from all tables in correct order (respecting foreign keys)
		logger.info('Starting to clear all data from database...')
		
		// Delete data records first
		const voyageEventsDeleted = await VoyageEvent.destroy({ where: {}, transaction })
		const vesselManifestsDeleted = await VesselManifest.destroy({ where: {}, transaction })
		const costAllocationsDeleted = await CostAllocation.destroy({ where: {}, transaction })
		const bulkActionsDeleted = await BulkAction.destroy({ where: {}, transaction })
		const voyageListsDeleted = await VoyageList.destroy({ where: {}, transaction })
		const wellOperationsDeleted = await WellOperation.destroy({ where: {}, transaction })
		const vesselsDeleted = await Vessel.destroy({ where: {}, transaction })
		const fluidAnalysesDeleted = await FluidAnalysis.destroy({ where: {}, transaction })
		
		// Delete upload records last
		const uploadsDeleted = await Upload.destroy({ where: {}, transaction })
		
		await transaction.commit()
		
		const totalDeleted = voyageEventsDeleted + vesselManifestsDeleted + costAllocationsDeleted + 
			bulkActionsDeleted + voyageListsDeleted + wellOperationsDeleted + vesselsDeleted + 
			fluidAnalysesDeleted + uploadsDeleted
		
		logger.info(`Successfully cleared all data: ${totalDeleted} total records deleted`)
		
		res.json({
			success: true,
			message: `Successfully cleared all data from database`,
			deletedCounts: {
				voyageEvents: voyageEventsDeleted,
				vesselManifests: vesselManifestsDeleted,
				costAllocations: costAllocationsDeleted,
				bulkActions: bulkActionsDeleted,
				voyageLists: voyageListsDeleted,
				wellOperations: wellOperationsDeleted,
				vessels: vesselsDeleted,
				fluidAnalyses: fluidAnalysesDeleted,
				uploads: uploadsDeleted,
				total: totalDeleted
			}
		})
		
	} catch (error) {
		await transaction.rollback()
		logger.error('Clear all data error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to clear all data'
		})
	}
}

// EMERGENCY: Rollback migration - restore original data structure
exports.rollbackMigration = async (req, res) => {
	let transaction
	
	try {
		logger.info('🚨 EMERGENCY: Starting migration rollback...')
		
		// Start transaction
		transaction = await sequelize.transaction()
		
		// Get current count
		const currentCount = await VoyageEvent.count({ transaction })
		logger.info(`📊 Current record count: ${currentCount}`)
		
		// Step 1: Remove any records created by migration (have dataIntegrity = 'migration_processed')
		const migrationRecords = await VoyageEvent.destroy({
			where: {
				dataIntegrity: 'migration_processed'
			},
			transaction
		})
		
		logger.info(`🗑️ Removed ${migrationRecords} migration-processed records`)
		
		// Step 2: Reset enhanced fields to NULL for records that were modified
		const resetCount = await VoyageEvent.update({
			department: null,
			mappedLocation: null,
			finalHours: null,
			eventDate: null,
			lcNumber: null,
			lcPercentage: null,
			mappingStatus: null,
			dataIntegrity: null
		}, {
			where: {
				// Reset any records that have been processed
				[sequelize.Op.or]: [
					{ dataIntegrity: { [sequelize.Op.ne]: null } },
					{ department: { [sequelize.Op.ne]: null } }
				]
			},
			transaction
		})
		
		logger.info(`🔄 Reset ${resetCount[0]} records to original state`)
		
		// Commit transaction
		await transaction.commit()
		
		// Get final count
		const finalCount = await VoyageEvent.count()
		
		logger.info('✅ Migration rollback completed')
		logger.info(`📊 Final record count: ${finalCount}`)
		
		res.json({
			success: true,
			message: 'Migration rollback completed successfully',
			details: {
				originalCount: currentCount,
				migrationRecordsRemoved: migrationRecords,
				recordsReset: resetCount[0],
				finalCount: finalCount
			}
		})
		
	} catch (error) {
		logger.error('💥 Rollback failed:', error)
		if (transaction) {
			await transaction.rollback()
			logger.info('🔄 Transaction rolled back')
		}
		res.status(500).json({ 
			error: 'Rollback failed', 
			details: error.message 
		})
	}
}

// Migration endpoint to backfill department fields
exports.migrateDepartmentFields = async (req, res) => {
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
			return res.json({
				success: true,
				message: 'No records need migration. All records already have department values.',
				details: {
					recordsProcessed: 0,
					recordsUpdated: 0
				}
			})
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
		
		res.json({
			success: true,
			message: 'Department fields migration completed successfully',
			details: {
				recordsProcessed: processedCount,
				recordsUpdated: updatedCount,
				departmentStats,
				verification: verificationQuery
			}
		})
		
	} catch (error) {
		logger.error('💥 Migration failed:', error)
		if (transaction) {
			await transaction.rollback()
			logger.info('🔄 Transaction rolled back')
		}
		res.status(500).json({ 
			error: 'Migration failed', 
			details: error.message 
		})
	}
}

// Clean up duplicate voyage events
exports.cleanupDuplicateVoyageEvents = async (req, res) => {
	const transaction = await sequelize.transaction()
	
	try {
		// Find all voyage events grouped by signature
		const voyageEvents = await VoyageEvent.findAll({
			attributes: ['id', 'mission', 'vessel', 'voyageNumber', 'event', 'from', 'to', 'hours', 'createdAt'],
			order: [['createdAt', 'ASC']], // Keep oldest record
			transaction
		})
		
		// Group by signature and find duplicates
		const signatureGroups = {}
		voyageEvents.forEach(event => {
			const signature = `${event.mission}-${event.vessel}-${event.voyageNumber}-${event.event}-${event.from}-${event.to}-${event.hours}`
			if (!signatureGroups[signature]) {
				signatureGroups[signature] = []
			}
			signatureGroups[signature].push(event)
		})
		
		// Collect IDs of duplicate records (keep the first/oldest, remove the rest)
		const duplicateIds = []
		Object.values(signatureGroups).forEach(group => {
			if (group.length > 1) {
				// Keep the first record, mark others as duplicates
				duplicateIds.push(...group.slice(1).map(event => event.id))
			}
		})
		
		logger.info(`Found ${duplicateIds.length} duplicate voyage events to remove`)
		
		// Delete duplicate records
		if (duplicateIds.length > 0) {
			const deletedCount = await VoyageEvent.destroy({
				where: {
					id: duplicateIds
				},
				transaction
			})
			
			await transaction.commit()
			
			res.json({
				success: true,
				message: `Successfully removed ${deletedCount} duplicate voyage events`,
				duplicatesRemoved: deletedCount,
				totalSignatures: Object.keys(signatureGroups).length
			})
		} else {
			await transaction.commit()
			
			res.json({
				success: true,
				message: 'No duplicate voyage events found',
				duplicatesRemoved: 0,
				totalSignatures: Object.keys(signatureGroups).length
			})
		}
		
	} catch (error) {
		await transaction.rollback()
		logger.error('Cleanup duplicate voyage events error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to cleanup duplicate voyage events'
		})
	}
}

// Upload voyage list
exports.uploadVoyageList = async (req, res) => {
	const transaction = await sequelize.transaction()
	const startTime = Date.now()

	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' })
		}

		// Create upload record
		const upload = await Upload.create({
			userId: req.user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID for development when auth is disabled
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'voyage-lists',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformVoyageListData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await VoyageList.bulkCreate(dataWithUploadId, {
			transaction,
			validate: true
		})

		// Update upload record
		upload.status = 'completed'
		upload.recordsProcessed = createdRecords.length
		upload.processingTime = Date.now() - startTime
		await upload.save({ transaction })

		await transaction.commit()

		logger.info(`Successfully uploaded ${createdRecords.length} voyage lists`)

		res.json({
			success: true,
			message: `Successfully uploaded ${createdRecords.length} voyage lists`,
			upload: {
				id: upload.id,
				fileName: upload.fileName,
				recordsProcessed: upload.recordsProcessed,
				processingTime: upload.processingTime
			}
		})
	} catch (error) {
		await transaction.rollback()
		logger.error('Upload voyage lists error:', error)
		res.status(500).json({ 
			error: error.message || 'Failed to upload voyage lists data'
		})
	}
}

// Enhanced activity category classification (matching dashboard expectations)
const classifyActivityForMigration = (parentEvent, event) => {
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
	return 'Productive'
}

// Migrate activityCategory for existing voyage events
const migrateActivityCategory = async (req, res) => {
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
			return res.json({
				success: true,
				message: 'No records need migration - all activityCategory fields are populated',
				stats: {
					processed: 0,
					updated: 0
				}
			})
		}
		
		// Process in batches to avoid memory issues
		const batchSize = 1000
		let updated = 0
		
		for (let i = 0; i < events.length; i += batchSize) {
			const batch = events.slice(i, i + batchSize)
			
			// Use a transaction for each batch
			await sequelize.transaction(async (transaction) => {
				const updatePromises = batch.map(async (event) => {
					const activityCategory = classifyActivityForMigration(event.parentEvent, event.event)
					
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
				
				logger.info(`✅ Processed batch ${Math.ceil((i + batchSize) / batchSize)} - ${updated}/${events.length} records`)
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
		
		const stats = {
			totalProcessed: updated,
			productive: productiveCount,
			nonProductive: nonProductiveCount,
			stillNull: nullCount
		}
		
		logger.info('📊 Migration Results:', stats)
		
		res.json({
			success: true,
			message: `Successfully migrated activityCategory for ${updated} voyage events`,
			stats
		})
		
	} catch (error) {
		logger.error('❌ activityCategory migration failed:', error)
		res.status(500).json({
			success: false,
			error: error.message || 'Migration failed'
		})
	}
}

// Enhanced voyage event processing migration
const enhanceExistingVoyageEvents = async (req, res) => {
	try {
		const { enhanceExistingVoyageEvents: runEnhancement } = require('../scripts/enhanceExistingVoyageEvents')
		const success = await runEnhancement()
		
		res.json({
			success: true,
			message: 'Successfully enhanced existing voyage events with missing fields'
		})
		
	} catch (error) {
		logger.error('❌ Voyage event enhancement failed:', error)
		res.status(500).json({
			success: false,
			error: error.message || 'Enhancement failed'
		})
	}
}

// Additional enhanced fields migration
const addMissingEnhancedFields = async (req, res) => {
	try {
		const { addMissingEnhancedFields: runAdditionalEnhancement } = require('../scripts/addMissingEnhancedFields')
		const success = await runAdditionalEnhancement()
		
		res.json({
			success: true,
			message: 'Successfully added missing enhanced fields (project type, data quality, etc.)'
		})
		
	} catch (error) {
		logger.error('❌ Additional enhanced fields migration failed:', error)
		res.status(500).json({
			success: false,
			error: error.message || 'Additional enhancement failed'
		})
	}
}

// Voyage processing enhancement migration
const enhanceVoyageProcessing = async (req, res) => {
	try {
		const { enhanceVoyageProcessing: runVoyageEnhancement } = require('../scripts/enhanceVoyageProcessing')
		const success = await runVoyageEnhancement()
		
		res.json({
			success: true,
			message: 'Successfully enhanced voyage processing (voyage IDs, analytics, patterns, etc.)'
		})
		
	} catch (error) {
		logger.error('❌ Voyage processing enhancement failed:', error)
		res.status(500).json({
			success: false,
			error: error.message || 'Voyage processing enhancement failed'
		})
	}
}

// Get voyage statistics
const getVoyageStatistics = async (req, res) => {
	try {
		const { getVoyageStatistics: runStats } = require('../scripts/getVoyageStatistics')
		const stats = await runStats()
		
		res.json({
			success: true,
			message: 'Voyage statistics retrieved successfully',
			data: stats
		})
		
	} catch (error) {
		logger.error('❌ Failed to get voyage statistics:', error)
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to get voyage statistics'
		})
	}
}

// Export the migration functions
exports.migrateActivityCategory = migrateActivityCategory
exports.enhanceExistingVoyageEvents = enhanceExistingVoyageEvents
exports.addMissingEnhancedFields = addMissingEnhancedFields
exports.enhanceVoyageProcessing = enhanceVoyageProcessing
exports.getVoyageStatistics = getVoyageStatistics