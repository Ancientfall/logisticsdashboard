const XLSX = require('xlsx')
const { sequelize } = require('../config/database')
const { Upload, WellOperation, Vessel, FluidAnalysis } = require('../models')
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