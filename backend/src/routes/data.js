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

// Logistics data endpoints
// DEVELOPMENT: Temporarily disable auth for data endpoints to test PostgreSQL integration
router.get('/voyage-events', dataController.getVoyageEvents)
router.get('/voyage-events/:id', dataController.getVoyageEventById)
router.get('/vessel-manifests', dataController.getVesselManifests)
router.get('/vessel-manifests/:id', dataController.getVesselManifestById)
router.get('/voyage-list', dataController.getVoyageList)
router.get('/voyage-list/:id', dataController.getVoyageListById)
router.get('/cost-allocation', dataController.getCostAllocation)
router.get('/cost-allocation/:id', dataController.getCostAllocationById)
router.get('/bulk-actions', dataController.getBulkActions)
router.get('/bulk-actions/:id', dataController.getBulkActionById)

// Delete data (admin only)
router.delete('/wells/:id', auth, authorize('admin'), dataController.deleteWellOperation)
router.delete('/vessels/:id', auth, authorize('admin'), dataController.deleteVessel)
router.delete('/fluid-analyses/:id', auth, authorize('admin'), dataController.deleteFluidAnalysis)

// Bulk delete by upload ID (admin only)
router.delete('/upload/:uploadId', auth, authorize('admin'), dataController.deleteByUploadId)

module.exports = router