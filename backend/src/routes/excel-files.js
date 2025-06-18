const express = require('express')
const path = require('path')
const fs = require('fs').promises
const multer = require('multer')
const { auth } = require('../middleware/auth')
const { authorize } = require('../middleware/authorize')
const logger = require('../utils/logger')

const router = express.Router()

// Excel files storage directory
const EXCEL_FILES_DIR = path.join(process.cwd(), 'excel-data', 'excel-files')
const REFERENCE_DATA_DIR = path.join(process.cwd(), 'excel-data', 'reference-data')
const METADATA_FILE = path.join(process.cwd(), 'excel-data', 'metadata', 'files-metadata.json')

// Ensure directories exist
async function ensureDirectories() {
	try {
		await fs.mkdir(path.dirname(EXCEL_FILES_DIR), { recursive: true })
		await fs.mkdir(EXCEL_FILES_DIR, { recursive: true })
		await fs.mkdir(REFERENCE_DATA_DIR, { recursive: true })
		await fs.mkdir(path.dirname(METADATA_FILE), { recursive: true })
	} catch (error) {
		logger.error('Error creating directories:', error)
	}
}

// Initialize directories
ensureDirectories()

// Multer configuration for file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const isReference = req.body.isReference === 'true'
		cb(null, isReference ? REFERENCE_DATA_DIR : EXCEL_FILES_DIR)
	},
	filename: (req, file, cb) => {
		// Keep original filename for Excel files
		cb(null, file.originalname)
	}
})

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 50 * 1024 * 1024 // 50MB limit
	},
	fileFilter: (req, file, cb) => {
		// Only allow Excel files
		const allowedTypes = ['.xlsx', '.xls', '.csv']
		const fileExt = path.extname(file.originalname).toLowerCase()
		
		if (allowedTypes.includes(fileExt)) {
			cb(null, true)
		} else {
			cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'))
		}
	}
})

// Get file metadata
async function getFileMetadata() {
	try {
		const metadataContent = await fs.readFile(METADATA_FILE, 'utf8')
		return JSON.parse(metadataContent)
	} catch (error) {
		// Return default metadata if file doesn't exist
		return {
			lastUpdated: new Date().toISOString(),
			files: {},
			version: '1.0.0'
		}
	}
}

// Update file metadata
async function updateFileMetadata(filename, fileStats, isReference = false) {
	const metadata = await getFileMetadata()
	
	metadata.files[filename] = {
		size: fileStats.size,
		lastModified: fileStats.mtime.toISOString(),
		uploadedAt: new Date().toISOString(),
		type: isReference ? 'reference' : 'data',
		path: isReference ? 'reference-data' : 'excel-files'
	}
	
	metadata.lastUpdated = new Date().toISOString()
	metadata.version = `1.0.${Object.keys(metadata.files).length}`
	
	await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2))
	return metadata
}

// GET /api/excel-files - List available Excel files
router.get('/', async (req, res) => {
	try {
		const [excelFiles, referenceFiles] = await Promise.all([
			fs.readdir(EXCEL_FILES_DIR).catch(() => []),
			fs.readdir(REFERENCE_DATA_DIR).catch(() => [])
		])
		
		const allFiles = []
		
		// Process Excel files
		for (const filename of excelFiles) {
			if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
				try {
					const filePath = path.join(EXCEL_FILES_DIR, filename)
					const stats = await fs.stat(filePath)
					allFiles.push({
						name: filename,
						size: stats.size,
						lastModified: stats.mtime.toISOString(),
						type: 'data',
						path: 'excel-files'
					})
				} catch (error) {
					logger.error(`Error reading file stats for ${filename}:`, error)
				}
			}
		}
		
		// Process reference files
		for (const filename of referenceFiles) {
			if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
				try {
					const filePath = path.join(REFERENCE_DATA_DIR, filename)
					const stats = await fs.stat(filePath)
					allFiles.push({
						name: filename,
						size: stats.size,
						lastModified: stats.mtime.toISOString(),
						type: 'reference',
						path: 'reference-data'
					})
				} catch (error) {
					logger.error(`Error reading file stats for ${filename}:`, error)
				}
			}
		}
		
		// Get metadata
		const metadata = await getFileMetadata()
		
		res.json({
			success: true,
			files: allFiles,
			metadata: {
				lastUpdated: metadata.lastUpdated,
				totalFiles: allFiles.length,
				version: metadata.version
			}
		})
	} catch (error) {
		logger.error('Error listing Excel files:', error)
		res.status(500).json({
			success: false,
			message: 'Error listing Excel files',
			error: error.message
		})
	}
})

// GET /api/excel-files/:filename - Serve specific Excel file
router.get('/:filename', async (req, res) => {
	try {
		const { filename } = req.params
		
		// Validate filename
		if (!filename || filename.includes('..') || filename.includes('/')) {
			return res.status(400).json({
				success: false,
				message: 'Invalid filename'
			})
		}
		
		// Check in both directories
		let filePath = path.join(EXCEL_FILES_DIR, filename)
		let fileExists = false
		
		try {
			await fs.access(filePath)
			fileExists = true
		} catch {
			// Try reference data directory
			filePath = path.join(REFERENCE_DATA_DIR, filename)
			try {
				await fs.access(filePath)
				fileExists = true
			} catch {
				fileExists = false
			}
		}
		
		if (!fileExists) {
			return res.status(404).json({
				success: false,
				message: 'File not found'
			})
		}
		
		// Get file stats
		const stats = await fs.stat(filePath)
		
		// Set appropriate headers
		res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.setHeader('Content-Length', stats.size)
		res.setHeader('Last-Modified', stats.mtime.toUTCString())
		
		// Stream the file
		const fileStream = require('fs').createReadStream(filePath)
		fileStream.pipe(res)
		
		logger.info(`Served Excel file: ${filename}`)
		
	} catch (error) {
		logger.error('Error serving Excel file:', error)
		res.status(500).json({
			success: false,
			message: 'Error serving file',
			error: error.message
		})
	}
})

// POST /api/excel-files/upload - Upload Excel file (Admin only)
router.post('/upload', auth, authorize(['admin']), upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'No file uploaded'
			})
		}
		
		const { filename, size, path: filePath } = req.file
		const isReference = req.body.isReference === 'true'
		
		// Get file stats
		const stats = await fs.stat(filePath)
		
		// Update metadata
		const metadata = await updateFileMetadata(filename, stats, isReference)
		
		logger.info(`Excel file uploaded: ${filename} (${size} bytes) by user ${req.user.id}`)
		
		res.json({
			success: true,
			message: 'File uploaded successfully',
			file: {
				name: filename,
				size: size,
				type: isReference ? 'reference' : 'data',
				uploadedAt: new Date().toISOString()
			},
			metadata: {
				version: metadata.version,
				totalFiles: Object.keys(metadata.files).length
			}
		})
		
	} catch (error) {
		logger.error('Error uploading Excel file:', error)
		res.status(500).json({
			success: false,
			message: 'Error uploading file',
			error: error.message
		})
	}
})

// DELETE /api/excel-files/:filename - Delete Excel file (Admin only)
router.delete('/:filename', auth, authorize(['admin']), async (req, res) => {
	try {
		const { filename } = req.params
		
		// Validate filename
		if (!filename || filename.includes('..') || filename.includes('/')) {
			return res.status(400).json({
				success: false,
				message: 'Invalid filename'
			})
		}
		
		// Check in both directories and delete
		let filePath = path.join(EXCEL_FILES_DIR, filename)
		let fileExists = false
		
		try {
			await fs.access(filePath)
			await fs.unlink(filePath)
			fileExists = true
		} catch {
			// Try reference data directory
			filePath = path.join(REFERENCE_DATA_DIR, filename)
			try {
				await fs.access(filePath)
				await fs.unlink(filePath)
				fileExists = true
			} catch {
				fileExists = false
			}
		}
		
		if (!fileExists) {
			return res.status(404).json({
				success: false,
				message: 'File not found'
			})
		}
		
		// Update metadata (remove file entry)
		const metadata = await getFileMetadata()
		delete metadata.files[filename]
		metadata.lastUpdated = new Date().toISOString()
		await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2))
		
		logger.info(`Excel file deleted: ${filename} by user ${req.user.id}`)
		
		res.json({
			success: true,
			message: 'File deleted successfully',
			filename: filename
		})
		
	} catch (error) {
		logger.error('Error deleting Excel file:', error)
		res.status(500).json({
			success: false,
			message: 'Error deleting file',
			error: error.message
		})
	}
})

// GET /api/excel-files/metadata/info - Get detailed metadata
router.get('/metadata/info', async (req, res) => {
	try {
		const metadata = await getFileMetadata()
		res.json({
			success: true,
			metadata: metadata
		})
	} catch (error) {
		logger.error('Error getting metadata:', error)
		res.status(500).json({
			success: false,
			message: 'Error getting metadata',
			error: error.message
		})
	}
})

module.exports = router