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

// Helper function to validate and transform voyage event data
const transformVoyageEventData = (rawData) => {
	return rawData.map((row, index) => {
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

		return {
			mission,
			event,
			parentEvent: row['Parent Event'] || null,
			location: row.Location || null,
			quay: row.Quay || null,
			remarks: row.Remarks || null,
			isActive: row['Is active?'] ? String(row['Is active?']).toLowerCase() === 'true' : true,
			from: row.From || null,
			to: row.To || null,
			hours: parseFloat(row.Hours || 0),
			portType: row['Port Type'] || null,
			eventCategory: row['Event Category'] || null,
			year: parseInt(row.Year || new Date().getFullYear()),
			ins500m: row['Ins. 500m'] ? String(row['Ins. 500m']).toLowerCase() === 'true' : false,
			costDedicatedTo: row['Cost Dedicated to'] || null,
			vessel,
			voyageNumber: String(row['Voyage #'] || ''),
			metadata: {
				originalRow: index + 2,
				rawData: row
			}
		}
	})
}

// Helper function to validate and transform vessel manifest data
const transformVesselManifestData = (rawData) => {
	return rawData.map((row, index) => {
		// Use exact field names from RawVesselManifest interface
		const voyageId = row['Voyage Id'] || `auto-voyage-${Date.now()}-${index}`
		const manifestNumber = row['Manifest Number'] || null

		return {
			voyageId: String(voyageId),
			manifestNumber,
			transporter: row.Transporter || null,
			type: row.Type || null,
			manifestDate: row['Manifest Date'] ? new Date(row['Manifest Date']) : null,
			costCode: row['Cost Code'] || null,
			from: row.From || null,
			offshoreLocation: row['Offshore Location'] || null,
			deckLbs: parseFloat(row['Deck Lbs'] || 0),
			deckTons: parseFloat(row['Deck Tons'] || 0),
			rtTons: parseFloat(row['RT Tons'] || 0),
			lifts: parseInt(row.Lifts || 0),
			wetBulkBbls: parseFloat(row['Wet Bulk (bbls)'] || 0),
			wetBulkGals: parseFloat(row['Wet Bulk (gals)'] || 0),
			deckSqft: parseFloat(row['Deck Sqft'] || 0),
			remarks: row.Remarks || null,
			year: parseInt(row.Year || new Date().getFullYear()),
			metadata: {
				originalRow: index + 2,
				rawData: row
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

		// Auto-detect department based on LC number patterns
		let department = row.Department || row.department || row.DEPARTMENT
		if (!department) {
			if (lcNumber.includes('DRL') || lcNumber.includes('DRILL')) {
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

		return {
			lcNumber,
			rigReference: row['Rig Reference'] || row.rigReference || row.rig_reference || null,
			description: row.Description || row.description || row.DESCRIPTION || null,
			costElement: row['Cost Element'] || row.costElement || row.cost_element || null,
			monthYear: row['Month-Year'] || row.monthYear || row.month_year || null,
			mission: row.Mission || row.mission || row.MISSION || null,
			projectType: row['Project Type'] || row.projectType || row.project_type || null,
			allocatedDays: parseFloat(row['Alloc (days)'] || row['Total Allocated Days'] || row.allocatedDays || row.allocated_days || 0),
			avgVesselCostPerDay: parseFloat(row['Average Vessel Cost Per Day'] || row.avgVesselCostPerDay || row.avg_vessel_cost_per_day || 0),
			totalCost: parseFloat(row['Total Cost'] || row.totalCost || row.total_cost || row.Amount || row.amount || 0),
			rigLocation: row['Rig Location'] || row.rigLocation || row.rig_location || null,
			rigType: row['Rig Type'] || row.rigType || row.rig_type || null,
			waterDepth: row['Water Depth'] || row.waterDepth || row.water_depth || null,
			department,
			metadata: {
				originalRow: index + 2,
				rawData: row
			}
		}
	})
}

// Helper function to validate and transform bulk action data
const transformBulkActionData = (rawData) => {
	return rawData.map((row, index) => {
		const vesselName = row['Vessel Name'] || row.vesselName || row.vessel_name || row.Vessel || row.vessel
		
		return {
			vesselName: vesselName || null,
			voyageNumber: String(row['Voyage Number'] || row.voyageNumber || row.voyage_number || ''),
			manifestNumber: row['Manifest Number'] || row.manifestNumber || row.manifest_number || null,
			manifestDate: row['Manifest Date'] || row.manifestDate || row.manifest_date ? 
				new Date(row['Manifest Date'] || row.manifestDate || row.manifest_date) : null,
			from: row.From || row.from || row.FROM || null,
			to: row.To || row.to || row.TO || null,
			cargoType: row['Cargo Type'] || row.cargoType || row.cargo_type || row.Type || row.type || null,
			cargoDescription: row['Cargo Description'] || row.cargoDescription || row.cargo_description || row.Description || row.description || null,
			quantity: parseFloat(row.Quantity || row.quantity || row.QUANTITY || row.Qty || row.qty || 0),
			unit: row.Unit || row.unit || row.UNIT || 'MT',
			weight: parseFloat(row.Weight || row.weight || row.WEIGHT || 0),
			volume: parseFloat(row.Volume || row.volume || row.VOLUME || 0),
			costCode: row['Cost Code'] || row.costCode || row.cost_code || null,
			projectCode: row['Project Code'] || row.projectCode || row.project_code || null,
			department: row.Department || row.department || row.DEPARTMENT || null,
			status: row.Status || row.status || row.STATUS || 'pending',
			actionType: row['Action Type'] || row.actionType || row.action_type || row.Action || row.action || null,
			completedDate: row['Completed Date'] || row.completedDate || row.completed_date ? 
				new Date(row['Completed Date'] || row.completedDate || row.completed_date) : null,
			remarks: row.Remarks || row.remarks || row.REMARKS || null,
			metadata: {
				originalRow: index + 2,
				rawData: row
			}
		}
	})
}

// Helper function to validate and transform voyage list data
const transformVoyageListData = (rawData) => {
	return rawData.map((row, index) => {
		// Use exact field names from RawVoyageList interface
		const vesselName = row.Vessel || 'Unknown Vessel'
		const voyageNumber = row['Voyage Number'] || 0

		return {
			vesselName,
			voyageNumber: String(voyageNumber),
			voyageType: row.Type || null,
			departurePort: row['Start Date'] ? 'Fourchon' : null, // Default departure port
			departureDate: row['Start Date'] ? new Date(row['Start Date']) : null,
			arrivalPort: null, // Will be derived from locations
			arrivalDate: row['End Date'] ? new Date(row['End Date']) : null,
			voyageDuration: 0, // Will be calculated
			totalDistance: 0,
			fuelConsumption: 0,
			cargoCapacity: 0,
			cargoUtilization: 0,
			voyageStatus: 'planned',
			charterer: null,
			operator: null,
			masterName: null,
			totalCrew: 0,
			voyagePurpose: null,
			totalRevenue: 0,
			totalCost: 0,
			profit: 0,
			remarks: null,
			// Add fields that match RawVoyageList exactly
			edit: row.Edit || null,
			year: parseInt(row.Year || new Date().getFullYear()),
			month: row.Month || null,
			mission: row.Mission || 'Unknown Mission',
			routeType: row['Route Type'] || null,
			locations: row.Locations || '',
			metadata: {
				originalRow: index + 2,
				rawData: row
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
			userId: req.user.id,
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
			userId: req.user.id,
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
			userId: req.user.id,
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
		if (req.user.role === 'viewer') {
			where.userId = req.user.id
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
		if (req.user.role === 'viewer' && upload.userId !== req.user.id) {
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
			userId: req.user.id,
			fileName: req.file.originalname,
			fileSize: req.file.size,
			dataType: 'voyage-events',
			status: 'processing'
		}, { transaction })

		// Parse file
		const rawData = parseFile(req.file.buffer, req.file.originalname)
		logger.info(`Parsed ${rawData.length} rows from ${req.file.originalname}`)

		// Transform and validate data
		const transformedData = transformVoyageEventData(rawData)
		
		// Add uploadId to each record
		const dataWithUploadId = transformedData.map(record => ({
			...record,
			uploadId: upload.id
		}))

		// Bulk insert
		const createdRecords = await VoyageEvent.bulkCreate(dataWithUploadId, {
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
			userId: req.user.id,
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
			userId: req.user.id,
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
			userId: req.user.id,
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
			userId: req.user.id,
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