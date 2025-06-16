const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const authorize = require('../middleware/authorize')
const dataController = require('../controllers/dataController')

// Get all well operations
router.get('/wells', auth, dataController.getWellOperations)

// Get well operation by ID
router.get('/wells/:id', auth, dataController.getWellOperationById)

// Get all vessels
router.get('/vessels', auth, dataController.getVessels)

// Get vessel by ID
router.get('/vessels/:id', auth, dataController.getVesselById)

// Get all fluid analyses
router.get('/fluid-analyses', auth, dataController.getFluidAnalyses)

// Get fluid analysis by ID
router.get('/fluid-analyses/:id', auth, dataController.getFluidAnalysisById)

// Get aggregated dashboard data
router.get('/dashboard', auth, dataController.getDashboardData)

// Get analytics data
router.get('/analytics', auth, dataController.getAnalytics)

// Delete data (admin only)
router.delete('/wells/:id', auth, authorize('admin'), dataController.deleteWellOperation)
router.delete('/vessels/:id', auth, authorize('admin'), dataController.deleteVessel)
router.delete('/fluid-analyses/:id', auth, authorize('admin'), dataController.deleteFluidAnalysis)

// Bulk delete by upload ID (admin only)
router.delete('/upload/:uploadId', auth, authorize('admin'), dataController.deleteByUploadId)

module.exports = router