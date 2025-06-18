const express = require('express')
const { Op } = require('sequelize')
const { MasterFacility, VesselClassification } = require('../models')
const { getMasterFacilities, getVesselClassifications } = require('../controllers/referenceController')
const authorize = require('../middleware/authorize')

const router = express.Router()

// Get all master facilities - DEVELOPMENT: Temporarily disable auth for testing
router.get('/facilities', getMasterFacilities)

// Get master facility by ID
router.get('/facilities/:id', authorize(['viewer', 'manager', 'admin']), async (req, res) => {
	try {
		const facility = await MasterFacility.findByPk(req.params.id)
		
		if (!facility) {
			return res.status(404).json({
				success: false,
				error: 'Master facility not found'
			})
		}
		
		res.json({
			success: true,
			data: facility
		})
	} catch (error) {
		console.error('Error fetching master facility:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to fetch master facility'
		})
	}
})

// Create master facility (admin only)
router.post('/facilities', authorize(['admin']), async (req, res) => {
	try {
		const facility = await MasterFacility.create(req.body)
		
		res.status(201).json({
			success: true,
			data: facility
		})
	} catch (error) {
		console.error('Error creating master facility:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to create master facility'
		})
	}
})

// Update master facility (admin only)
router.put('/facilities/:id', authorize(['admin']), async (req, res) => {
	try {
		const facility = await MasterFacility.findByPk(req.params.id)
		
		if (!facility) {
			return res.status(404).json({
				success: false,
				error: 'Master facility not found'
			})
		}
		
		await facility.update(req.body)
		
		res.json({
			success: true,
			data: facility
		})
	} catch (error) {
		console.error('Error updating master facility:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to update master facility'
		})
	}
})

// Delete master facility (admin only)
router.delete('/facilities/:id', authorize(['admin']), async (req, res) => {
	try {
		const facility = await MasterFacility.findByPk(req.params.id)
		
		if (!facility) {
			return res.status(404).json({
				success: false,
				error: 'Master facility not found'
			})
		}
		
		await facility.destroy()
		
		res.json({
			success: true,
			message: 'Master facility deleted successfully'
		})
	} catch (error) {
		console.error('Error deleting master facility:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to delete master facility'
		})
	}
})

// Get all vessel classifications  
// DEVELOPMENT: Temporarily disable auth for testing
router.get('/vessels', getVesselClassifications)

// Get vessel classification by ID
router.get('/vessels/:id', authorize(['viewer', 'manager', 'admin']), async (req, res) => {
	try {
		const vessel = await VesselClassification.findByPk(req.params.id)
		
		if (!vessel) {
			return res.status(404).json({
				success: false,
				error: 'Vessel classification not found'
			})
		}
		
		res.json({
			success: true,
			data: vessel
		})
	} catch (error) {
		console.error('Error fetching vessel classification:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to fetch vessel classification'
		})
	}
})

// Create vessel classification (admin only)
router.post('/vessels', authorize(['admin']), async (req, res) => {
	try {
		const vessel = await VesselClassification.create(req.body)
		
		res.status(201).json({
			success: true,
			data: vessel
		})
	} catch (error) {
		console.error('Error creating vessel classification:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to create vessel classification'
		})
	}
})

// Update vessel classification (admin only)
router.put('/vessels/:id', authorize(['admin']), async (req, res) => {
	try {
		const vessel = await VesselClassification.findByPk(req.params.id)
		
		if (!vessel) {
			return res.status(404).json({
				success: false,
				error: 'Vessel classification not found'
			})
		}
		
		await vessel.update(req.body)
		
		res.json({
			success: true,
			data: vessel
		})
	} catch (error) {
		console.error('Error updating vessel classification:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to update vessel classification'
		})
	}
})

// Delete vessel classification (admin only)
router.delete('/vessels/:id', authorize(['admin']), async (req, res) => {
	try {
		const vessel = await VesselClassification.findByPk(req.params.id)
		
		if (!vessel) {
			return res.status(404).json({
				success: false,
				error: 'Vessel classification not found'
			})
		}
		
		await vessel.destroy()
		
		res.json({
			success: true,
			message: 'Vessel classification deleted successfully'
		})
	} catch (error) {
		console.error('Error deleting vessel classification:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to delete vessel classification'
		})
	}
})

// Seed reference data (DEVELOPMENT: auth disabled)
router.post('/seed', async (req, res) => {
	try {
		const { seedReferenceData } = require('../scripts/seedReferenceData')
		const result = await seedReferenceData()
		
		res.json({
			success: true,
			message: 'Reference data seeded successfully',
			data: result
		})
	} catch (error) {
		console.error('Error seeding reference data:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to seed reference data'
		})
	}
})

module.exports = router