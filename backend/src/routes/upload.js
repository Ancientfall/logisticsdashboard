const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const auth = require('../middleware/auth')
const authorize = require('../middleware/authorize')
const uploadController = require('../controllers/uploadController')

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 50 * 1024 * 1024 // 50MB limit
	},
	fileFilter: (req, file, cb) => {
		const allowedTypes = [
			'.xlsx',
			'.xls',
			'.csv',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
			'text/csv'
		]
		
		const ext = path.extname(file.originalname).toLowerCase()
		const mimetype = file.mimetype
		
		if (allowedTypes.includes(ext) || allowedTypes.includes(mimetype)) {
			return cb(null, true)
		}
		
		cb(new Error('Only Excel and CSV files are allowed'))
	}
})

// Upload well operations data
router.post('/wells',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadWellOperations
)

// Upload vessel data
router.post('/vessels',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadVessels
)

// Upload fluid analysis data
router.post('/fluid-analyses',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadFluidAnalyses
)

// Get upload history
router.get('/history', auth, uploadController.getUploadHistory)

// Get upload details
router.get('/history/:uploadId', auth, uploadController.getUploadDetails)

// DEVELOPMENT: Temporarily disable auth for upload endpoints
// Upload voyage events
router.post('/voyage-events',
	upload.single('file'),
	uploadController.uploadVoyageEvents
)

// Upload vessel manifests
router.post('/vessel-manifests',
	upload.single('file'),
	uploadController.uploadVesselManifests
)

// Upload cost allocation
router.post('/cost-allocation',
	upload.single('file'),
	uploadController.uploadCostAllocation
)

// Upload bulk actions
router.post('/bulk-actions',
	upload.single('file'),
	uploadController.uploadBulkActions
)

// Upload voyage list
router.post('/voyage-list',
	upload.single('file'),
	uploadController.uploadVoyageList
)

// Clear all data from database (development only)
router.post('/clear-all-data',
	auth,
	authorize('admin'),
	uploadController.clearAllData
)

// Clean up duplicate voyage events
router.post('/cleanup-duplicates',
	auth,
	authorize('admin'),
	uploadController.cleanupDuplicateVoyageEvents
)

// Migrate department fields for existing records
router.post('/migrate-department-fields',
	auth,
	authorize('admin'),
	uploadController.migrateDepartmentFields
)

// EMERGENCY: Rollback migration
router.post('/rollback-migration',
	auth,
	authorize('admin'),
	uploadController.rollbackMigration
)

// Migrate activityCategory for existing voyage events (DEVELOPMENT: auth disabled)
router.post('/migrate-activity-category',
	uploadController.migrateActivityCategory
)

// Enhance existing voyage events with missing enhanced fields (DEVELOPMENT: auth disabled)
router.post('/enhance-voyage-events',
	uploadController.enhanceExistingVoyageEvents
)

// Add missing enhanced fields (project type, data quality, etc.) (DEVELOPMENT: auth disabled)
router.post('/add-missing-enhanced-fields',
	uploadController.addMissingEnhancedFields
)

// Enhance voyage processing (voyage IDs, analytics, patterns) (DEVELOPMENT: auth disabled)
router.post('/enhance-voyage-processing',
	uploadController.enhanceVoyageProcessing
)

// Get voyage statistics (DEVELOPMENT: auth disabled)
router.get('/voyage-statistics',
	uploadController.getVoyageStatistics
)

module.exports = router