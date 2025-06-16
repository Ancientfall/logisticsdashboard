const { Op } = require('sequelize')
const { sequelize } = require('../config/database')
const { WellOperation, Vessel, FluidAnalysis, Upload } = require('../models')
const logger = require('../utils/logger')

// Helper function to parse query filters
const parseFilters = (query) => {
	const filters = {}
	
	if (query.startDate && query.endDate) {
		filters.date = {
			[Op.between]: [new Date(query.startDate), new Date(query.endDate)]
		}
	}
	
	if (query.location) {
		filters.location = query.location
	}
	
	if (query.well) {
		filters.well = query.well
	}
	
	if (query.vessel) {
		filters.vessel = query.vessel
	}
	
	return filters
}

// Well Operations
exports.getWellOperations = async (req, res) => {
	try {
		const filters = parseFilters(req.query)
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 100
		const offset = (page - 1) * limit

		const { count, rows } = await WellOperation.findAndCountAll({
			where: filters,
			include: [{
				model: Upload,
				as: 'upload',
				attributes: ['fileName', 'userId', 'createdAt']
			}],
			order: [['date', 'DESC']],
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
		logger.error('Get well operations error:', error)
		res.status(500).json({ error: 'Failed to fetch well operations' })
	}
}

exports.getWellOperationById = async (req, res) => {
	try {
		const wellOperation = await WellOperation.findByPk(req.params.id, {
			include: [{
				model: Upload,
				as: 'upload',
				attributes: ['fileName', 'userId', 'createdAt']
			}]
		})

		if (!wellOperation) {
			return res.status(404).json({ error: 'Well operation not found' })
		}

		res.json({ success: true, data: wellOperation })
	} catch (error) {
		logger.error('Get well operation by ID error:', error)
		res.status(500).json({ error: 'Failed to fetch well operation' })
	}
}

// Vessels
exports.getVessels = async (req, res) => {
	try {
		const filters = parseFilters(req.query)
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 100
		const offset = (page - 1) * limit

		const { count, rows } = await Vessel.findAndCountAll({
			where: filters,
			include: [{
				model: Upload,
				as: 'upload',
				attributes: ['fileName', 'userId', 'createdAt']
			}],
			order: [['date', 'DESC']],
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
		logger.error('Get vessels error:', error)
		res.status(500).json({ error: 'Failed to fetch vessels' })
	}
}

exports.getVesselById = async (req, res) => {
	try {
		const vessel = await Vessel.findByPk(req.params.id, {
			include: [{
				model: Upload,
				as: 'upload',
				attributes: ['fileName', 'userId', 'createdAt']
			}]
		})

		if (!vessel) {
			return res.status(404).json({ error: 'Vessel not found' })
		}

		res.json({ success: true, data: vessel })
	} catch (error) {
		logger.error('Get vessel by ID error:', error)
		res.status(500).json({ error: 'Failed to fetch vessel' })
	}
}

// Fluid Analyses
exports.getFluidAnalyses = async (req, res) => {
	try {
		const filters = parseFilters(req.query)
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 100
		const offset = (page - 1) * limit

		const { count, rows } = await FluidAnalysis.findAndCountAll({
			where: filters,
			include: [{
				model: Upload,
				as: 'upload',
				attributes: ['fileName', 'userId', 'createdAt']
			}],
			order: [['date', 'DESC']],
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
		logger.error('Get fluid analyses error:', error)
		res.status(500).json({ error: 'Failed to fetch fluid analyses' })
	}
}

exports.getFluidAnalysisById = async (req, res) => {
	try {
		const fluidAnalysis = await FluidAnalysis.findByPk(req.params.id, {
			include: [{
				model: Upload,
				as: 'upload',
				attributes: ['fileName', 'userId', 'createdAt']
			}]
		})

		if (!fluidAnalysis) {
			return res.status(404).json({ error: 'Fluid analysis not found' })
		}

		res.json({ success: true, data: fluidAnalysis })
	} catch (error) {
		logger.error('Get fluid analysis by ID error:', error)
		res.status(500).json({ error: 'Failed to fetch fluid analysis' })
	}
}

// Dashboard aggregated data
exports.getDashboardData = async (req, res) => {
	try {
		const filters = parseFilters(req.query)

		// Get summary statistics
		const [wellStats, vesselStats, fluidStats] = await Promise.all([
			WellOperation.findOne({
				where: filters,
				attributes: [
					[sequelize.fn('COUNT', sequelize.col('id')), 'totalRecords'],
					[sequelize.fn('SUM', sequelize.col('production')), 'totalProduction'],
					[sequelize.fn('SUM', sequelize.col('consumption')), 'totalConsumption'],
					[sequelize.fn('AVG', sequelize.col('efficiency')), 'avgEfficiency']
				],
				raw: true
			}),
			Vessel.findOne({
				where: filters,
				attributes: [
					[sequelize.fn('COUNT', sequelize.col('id')), 'totalVessels'],
					[sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('vessel'))), 'uniqueVessels'],
					[sequelize.fn('AVG', sequelize.col('utilization')), 'avgUtilization']
				],
				raw: true
			}),
			FluidAnalysis.findOne({
				where: filters,
				attributes: [
					[sequelize.fn('COUNT', sequelize.col('id')), 'totalAnalyses'],
					[sequelize.fn('AVG', sequelize.col('oilContent')), 'avgOilContent'],
					[sequelize.fn('AVG', sequelize.col('waterContent')), 'avgWaterContent'],
					[sequelize.fn('AVG', sequelize.col('gasContent')), 'avgGasContent']
				],
				raw: true
			})
		])

		// Get recent data for charts
		const recentWells = await WellOperation.findAll({
			where: filters,
			attributes: ['date', 'production', 'consumption', 'well', 'location'],
			order: [['date', 'DESC']],
			limit: 30
		})

		const recentVessels = await Vessel.findAll({
			where: filters,
			attributes: ['date', 'vessel', 'location', 'status', 'utilization'],
			order: [['date', 'DESC']],
			limit: 20
		})

		res.json({
			success: true,
			data: {
				summary: {
					wells: wellStats,
					vessels: vesselStats,
					fluidAnalyses: fluidStats
				},
				recentActivity: {
					wells: recentWells,
					vessels: recentVessels
				}
			}
		})
	} catch (error) {
		logger.error('Get dashboard data error:', error)
		res.status(500).json({ error: 'Failed to fetch dashboard data' })
	}
}

// Analytics endpoint for complex queries
exports.getAnalytics = async (req, res) => {
	try {
		const { type, groupBy, metrics } = req.query
		const filters = parseFilters(req.query)

		let model, groupField, metricFields
		
		switch (type) {
			case 'wells':
				model = WellOperation
				groupField = groupBy || 'location'
				metricFields = metrics || ['production', 'consumption']
				break
			case 'vessels':
				model = Vessel
				groupField = groupBy || 'location'
				metricFields = metrics || ['utilization']
				break
			case 'fluid':
				model = FluidAnalysis
				groupField = groupBy || 'well'
				metricFields = metrics || ['oilContent', 'waterContent', 'gasContent']
				break
			default:
				return res.status(400).json({ error: 'Invalid analytics type' })
		}

		const attributes = [groupField]
		metricFields.forEach(field => {
			attributes.push([sequelize.fn('AVG', sequelize.col(field)), `avg_${field}`])
			attributes.push([sequelize.fn('MIN', sequelize.col(field)), `min_${field}`])
			attributes.push([sequelize.fn('MAX', sequelize.col(field)), `max_${field}`])
		})
		attributes.push([sequelize.fn('COUNT', sequelize.col('id')), 'count'])

		const results = await model.findAll({
			where: filters,
			attributes,
			group: [groupField],
			raw: true
		})

		res.json({ success: true, data: results })
	} catch (error) {
		logger.error('Get analytics error:', error)
		res.status(500).json({ error: 'Failed to fetch analytics' })
	}
}

// Delete operations
exports.deleteWellOperation = async (req, res) => {
	try {
		const result = await WellOperation.destroy({
			where: { id: req.params.id }
		})

		if (!result) {
			return res.status(404).json({ error: 'Well operation not found' })
		}

		logger.info(`Deleted well operation: ${req.params.id}`)
		res.json({ success: true, message: 'Well operation deleted successfully' })
	} catch (error) {
		logger.error('Delete well operation error:', error)
		res.status(500).json({ error: 'Failed to delete well operation' })
	}
}

exports.deleteVessel = async (req, res) => {
	try {
		const result = await Vessel.destroy({
			where: { id: req.params.id }
		})

		if (!result) {
			return res.status(404).json({ error: 'Vessel not found' })
		}

		logger.info(`Deleted vessel: ${req.params.id}`)
		res.json({ success: true, message: 'Vessel deleted successfully' })
	} catch (error) {
		logger.error('Delete vessel error:', error)
		res.status(500).json({ error: 'Failed to delete vessel' })
	}
}

exports.deleteFluidAnalysis = async (req, res) => {
	try {
		const result = await FluidAnalysis.destroy({
			where: { id: req.params.id }
		})

		if (!result) {
			return res.status(404).json({ error: 'Fluid analysis not found' })
		}

		logger.info(`Deleted fluid analysis: ${req.params.id}`)
		res.json({ success: true, message: 'Fluid analysis deleted successfully' })
	} catch (error) {
		logger.error('Delete fluid analysis error:', error)
		res.status(500).json({ error: 'Failed to delete fluid analysis' })
	}
}

exports.deleteByUploadId = async (req, res) => {
	try {
		const { uploadId } = req.params

		const results = await Promise.all([
			WellOperation.destroy({ where: { uploadId } }),
			Vessel.destroy({ where: { uploadId } }),
			FluidAnalysis.destroy({ where: { uploadId } })
		])

		const totalDeleted = results.reduce((sum, count) => sum + count, 0)

		logger.info(`Deleted ${totalDeleted} records for upload: ${uploadId}`)
		res.json({ 
			success: true, 
			message: `Deleted ${totalDeleted} records`,
			details: {
				wellOperations: results[0],
				vessels: results[1],
				fluidAnalyses: results[2]
			}
		})
	} catch (error) {
		logger.error('Delete by upload ID error:', error)
		res.status(500).json({ error: 'Failed to delete records' })
	}
}