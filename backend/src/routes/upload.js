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

// Upload voyage events
router.post('/voyage-events',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadVoyageEvents
)

// Upload vessel manifests
router.post('/vessel-manifests',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadVesselManifests
)

// Upload cost allocation
router.post('/cost-allocation',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadCostAllocation
)

// Upload bulk actions
router.post('/bulk-actions',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadBulkActions
)

// Upload voyage list
router.post('/voyage-list',
	auth,
	authorize('admin', 'manager'),
	upload.single('file'),
	uploadController.uploadVoyageList
)

module.exports = router