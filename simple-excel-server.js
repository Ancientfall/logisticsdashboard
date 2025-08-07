const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

const app = express()
const PORT = 5001

// CORS headers for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200)
    } else {
        next()
    }
})

app.use(express.json())

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'excel-data', 'excel-files')
    
    // Ensure directory exists
    try {
      await fs.promises.mkdir(uploadDir, { recursive: true })
    } catch (error) {
      console.error('Error creating upload directory:', error)
    }
    
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Use the target filename from the request
    const targetFileName = req.body.targetFileName || file.originalname
    cb(null, targetFileName)
  }
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow Excel and CSV files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv' ||
        file.originalname.toLowerCase().endsWith('.xlsx') ||
        file.originalname.toLowerCase().endsWith('.xls') ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel and CSV files are allowed'), false)
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
})

// Excel files directory
const EXCEL_FILES_DIR = path.join(__dirname, 'excel-data', 'excel-files')

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// GET /api/excel-files - List available Excel files
app.get('/api/excel-files', (req, res) => {
    try {
        if (!fs.existsSync(EXCEL_FILES_DIR)) {
            return res.json({
                success: true,
                files: [],
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    totalFiles: 0,
                    version: '1.0.0'
                }
            })
        }

        const files = fs.readdirSync(EXCEL_FILES_DIR)
        const fileList = []
        
        files.forEach(filename => {
            if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
                try {
                    const filePath = path.join(EXCEL_FILES_DIR, filename)
                    const stats = fs.statSync(filePath)
                    fileList.push({
                        name: filename,
                        size: stats.size,
                        lastModified: stats.mtime.toISOString(),
                        type: 'data',
                        path: 'excel-files'
                    })
                } catch (error) {
                    console.error('Error reading file stats for', filename, ':', error.message)
                }
            }
        })
        
        res.json({
            success: true,
            files: fileList,
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalFiles: fileList.length,
                version: '1.0.0'
            }
        })
    } catch (error) {
        console.error('Error listing Excel files:', error)
        res.status(500).json({
            success: false,
            message: 'Error listing Excel files',
            error: error.message
        })
    }
})

// GET /api/excel-files/:filename - Serve specific Excel file
app.get('/api/excel-files/:filename', (req, res) => {
    try {
        const filename = req.params.filename
        
        if (!filename || filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename'
            })
        }
        
        const filePath = path.join(EXCEL_FILES_DIR, filename)
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            })
        }
        
        const stats = fs.statSync(filePath)
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
        res.setHeader('Content-Length', stats.size)
        res.setHeader('Last-Modified', stats.mtime.toUTCString())
        
        const fileStream = fs.createReadStream(filePath)
        fileStream.pipe(res)
        
        console.log('Served Excel file:', filename)
        
    } catch (error) {
        console.error('Error serving Excel file:', error)
        res.status(500).json({
            success: false,
            message: 'Error serving file',
            error: error.message
        })
    }
})

// POST /api/upload-monthly-data - Upload monthly data file and append to existing
app.post('/api/upload-monthly-data', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Monthly data upload request received')
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }
    
    const targetFileName = req.body.targetFileName
    const originalFileName = req.file.originalname
    const uploadedFilePath = req.file.path
    
    console.log(`📋 Processing monthly data append:`)
    console.log(`   Original: ${originalFileName}`)
    console.log(`   Target: ${targetFileName}`)
    console.log(`   Uploaded to: ${uploadedFilePath}`)
    
    // Create backup directory
    const backupDir = path.join(__dirname, 'excel-data', 'backups')
    await fs.promises.mkdir(backupDir, { recursive: true })
    
    const existingFilePath = path.join(EXCEL_FILES_DIR, targetFileName)
    
    let newRowsAdded = 0
    let duplicatesSkipped = 0
    
    // Check if target file exists
    const targetExists = await fs.promises.access(existingFilePath).then(() => true).catch(() => false)
    
    if (targetExists) {
      // Create backup of existing file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `${targetFileName}.${timestamp}.backup`)
      await fs.promises.copyFile(existingFilePath, backupPath)
      console.log(`📋 Backup created: ${backupPath}`)
      
      // Append data to existing file
      const XLSX = require('xlsx')
      
      // Read existing file
      const existingWorkbook = XLSX.readFile(existingFilePath)
      const existingSheetName = existingWorkbook.SheetNames[0]
      const existingSheet = existingWorkbook.Sheets[existingSheetName]
      const existingData = XLSX.utils.sheet_to_json(existingSheet)
      
      // Read uploaded file
      const uploadedWorkbook = XLSX.readFile(uploadedFilePath)
      const uploadedSheetName = uploadedWorkbook.SheetNames[0]
      const uploadedSheet = uploadedWorkbook.Sheets[uploadedSheetName]
      const uploadedData = XLSX.utils.sheet_to_json(uploadedSheet)
      
      console.log(`📊 Existing records: ${existingData.length}`)
      console.log(`📊 New records to add: ${uploadedData.length}`)
      
      // Create a simple duplicate detection based on the first few columns
      const getRowSignature = (row) => {
        const keys = Object.keys(row).slice(0, 4) // Use first 4 columns for signature
        return keys.map(key => String(row[key] || '').trim().toLowerCase()).join('|')
      }
      
      // Build set of existing signatures
      const existingSignatures = new Set(existingData.map(getRowSignature))
      
      // Filter out duplicates from uploaded data
      const newRows = uploadedData.filter(row => {
        const signature = getRowSignature(row)
        const isDuplicate = existingSignatures.has(signature)
        if (isDuplicate) {
          duplicatesSkipped++
        } else {
          newRowsAdded++
        }
        return !isDuplicate
      })
      
      // Combine existing and new data
      const combinedData = [...existingData, ...newRows]
      
      // Create new workbook with combined data
      const newWorkbook = XLSX.utils.book_new()
      const newSheet = XLSX.utils.json_to_sheet(combinedData)
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, existingSheetName)
      
      // Write combined file
      XLSX.writeFile(newWorkbook, existingFilePath)
      
      console.log(`✅ Data appended successfully:`)
      console.log(`   New rows added: ${newRowsAdded}`)
      console.log(`   Duplicates skipped: ${duplicatesSkipped}`)
      console.log(`   Total rows now: ${combinedData.length}`)
      
    } else {
      // Target file doesn't exist, just move uploaded file
      await fs.promises.rename(uploadedFilePath, existingFilePath)
      
      // Count rows in new file
      const XLSX = require('xlsx')
      const workbook = XLSX.readFile(existingFilePath)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet)
      newRowsAdded = data.length
      
      console.log(`✅ New file created with ${newRowsAdded} rows`)
    }
    
    // Clean up uploaded file if it still exists
    try {
      await fs.promises.unlink(uploadedFilePath)
    } catch (error) {
      // File already moved or deleted, ignore
    }
    
    // Log successful upload
    const logEntry = {
      timestamp: new Date().toISOString(),
      originalFileName,
      targetFileName,
      fileSize: req.file.size,
      uploadedBy: req.ip || 'unknown',
      action: targetExists ? 'append' : 'create',
      newRowsAdded,
      duplicatesSkipped
    }
    
    const logPath = path.join(__dirname, 'excel-data', 'upload-log.json')
    let logs = []
    
    try {
      const existingLogs = await fs.promises.readFile(logPath, 'utf-8')
      logs = JSON.parse(existingLogs)
    } catch (error) {
      // Log file doesn't exist or is invalid, start fresh
      logs = []
    }
    
    logs.push(logEntry)
    
    // Keep only last 100 log entries
    if (logs.length > 100) {
      logs = logs.slice(-100)
    }
    
    await fs.promises.writeFile(logPath, JSON.stringify(logs, null, 2))
    
    res.json({
      success: true,
      message: 'Monthly data appended successfully',
      originalFileName,
      targetFileName,
      fileSize: req.file.size,
      uploadTime: new Date().toISOString(),
      action: targetExists ? 'append' : 'create',
      newRowsAdded,
      duplicatesSkipped
    })
    
  } catch (error) {
    console.error('❌ Upload error:', error)
    
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed',
      details: error.stack
    })
  }
})

// GET /api/upload-logs - Retrieve upload logs
app.get('/api/upload-logs', async (req, res) => {
  try {
    const logPath = path.join(__dirname, 'excel-data', 'upload-log.json')
    
    try {
      const logs = await fs.promises.readFile(logPath, 'utf-8')
      res.json({
        success: true,
        logs: JSON.parse(logs)
      })
    } catch (error) {
      res.json({
        success: true,
        logs: []
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/excel-files-status - List current Excel files with detailed status
app.get('/api/excel-files-status', async (req, res) => {
  try {
    const excelDir = path.join(__dirname, 'excel-data', 'excel-files')
    const files = await fs.promises.readdir(excelDir)
    
    const fileStatuses = await Promise.all(
      files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
        .map(async (file) => {
          const filePath = path.join(excelDir, file)
          const stats = await fs.promises.stat(filePath)
          
          return {
            filename: file,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString()
          }
        })
    )
    
    res.json({
      success: true,
      files: fileStatuses
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ===== VESSEL SCHEDULE SPECIFIC API ENDPOINTS =====

// GET /api/vessel-schedule-files - List available vessel schedule files
app.get('/api/vessel-schedule-files', async (req, res) => {
  try {
    const excelDir = path.join(__dirname, 'excel-data', 'excel-files')
    const files = await fs.promises.readdir(excelDir)
    
    // Filter for vessel schedule files (pattern: Vessel_Schedule_*.xlsx)
    const scheduleFiles = files
      .filter(file => file.match(/^Vessel_Schedule_\d{4}_\d{2}\.xlsx$/i))
      .sort((a, b) => b.localeCompare(a)) // Sort by name descending (newest first)
    
    const fileDetails = await Promise.all(
      scheduleFiles.map(async (file) => {
        const filePath = path.join(excelDir, file)
        const stats = await fs.promises.stat(filePath)
        
        // Extract version info from filename
        const match = file.match(/Vessel_Schedule_(\d{4})_(\d{2})\.xlsx$/i)
        const version = match ? `${match[1]}-${match[2]}_v1.0` : 'Unknown'
        
        return {
          name: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
          version: version,
          type: 'vessel_schedule'
        }
      })
    )
    
    res.json({
      success: true,
      files: fileDetails,
      count: fileDetails.length
    })
  } catch (error) {
    console.error('Error listing vessel schedule files:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list vessel schedule files',
      details: error.message
    })
  }
})

// GET /api/vessel-schedule-files/:filename - Download specific vessel schedule file
app.get('/api/vessel-schedule-files/:filename', (req, res) => {
  const filename = req.params.filename
  
  // Validate filename pattern for security
  if (!filename.match(/^Vessel_Schedule_\d{4}_\d{2}\.xlsx$/i)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid vessel schedule filename format. Expected: Vessel_Schedule_YYYY_MM.xlsx'
    })
  }
  
  const filePath = path.join(__dirname, 'excel-data', 'excel-files', filename)
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Vessel schedule file not found',
      filename: filename
    })
  }
  
  // Set appropriate headers for Excel file download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-cache')
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath)
  fileStream.pipe(res)
  
  fileStream.on('error', (error) => {
    console.error('Error streaming vessel schedule file:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to download vessel schedule file'
      })
    }
  })
})

// POST /api/upload-vessel-schedule - Upload new vessel schedule file with validation
app.post('/api/upload-vessel-schedule', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }
    
    const uploadedFile = req.file
    const { year, month, version } = req.body
    
    // Generate standardized filename
    const paddedMonth = String(month).padStart(2, '0')
    const targetFileName = `Vessel_Schedule_${year}_${paddedMonth}.xlsx`
    
    // Validate filename matches expected pattern
    if (!targetFileName.match(/^Vessel_Schedule_\d{4}_\d{2}\.xlsx$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename format generated'
      })
    }
    
    const targetPath = path.join(__dirname, 'excel-data', 'excel-files', targetFileName)
    
    // Check if file already exists and create backup
    if (fs.existsSync(targetPath)) {
      const backupPath = targetPath.replace('.xlsx', `_backup_${Date.now()}.xlsx`)
      await fs.promises.copyFile(targetPath, backupPath)
      console.log(`Created backup: ${backupPath}`)
    }
    
    // Move uploaded file to target location
    await fs.promises.rename(uploadedFile.path, targetPath)
    
    // Get file stats
    const stats = await fs.promises.stat(targetPath)
    
    console.log(`Vessel schedule uploaded successfully: ${targetFileName}`)
    
    res.json({
      success: true,
      message: 'Vessel schedule file uploaded successfully',
      file: {
        name: targetFileName,
        size: stats.size,
        uploaded: new Date().toISOString(),
        version: version || `${year}-${paddedMonth}_v1.0`
      }
    })
    
  } catch (error) {
    console.error('Error uploading vessel schedule:', error)
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        await fs.promises.unlink(req.file.path)
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError)
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload vessel schedule file',
      details: error.message
    })
  }
})

// GET /api/vessel-schedule-status - Check vessel schedule file status and version
app.get('/api/vessel-schedule-status', async (req, res) => {
  try {
    const excelDir = path.join(__dirname, 'excel-data', 'excel-files')
    const files = await fs.promises.readdir(excelDir)
    
    // Find the most recent vessel schedule file
    const scheduleFiles = files
      .filter(file => file.match(/^Vessel_Schedule_\d{4}_\d{2}\.xlsx$/i))
      .sort((a, b) => b.localeCompare(a))
    
    if (scheduleFiles.length === 0) {
      return res.json({
        success: true,
        hasSchedule: false,
        message: 'No vessel schedule files found'
      })
    }
    
    const latestFile = scheduleFiles[0]
    const filePath = path.join(excelDir, latestFile)
    const stats = await fs.promises.stat(filePath)
    
    // Extract date info from filename
    const match = latestFile.match(/Vessel_Schedule_(\d{4})_(\d{2})\.xlsx$/i)
    const year = match ? match[1] : 'Unknown'
    const month = match ? match[2] : 'Unknown'
    
    // Calculate age in days
    const ageInDays = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
    
    res.json({
      success: true,
      hasSchedule: true,
      currentFile: {
        name: latestFile,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        version: `${year}-${month}_v1.0`,
        year: parseInt(year),
        month: parseInt(month),
        ageInDays: ageInDays
      },
      totalScheduleFiles: scheduleFiles.length,
      isStale: ageInDays > 45 // Flag as stale if older than 45 days
    })
    
  } catch (error) {
    console.error('Error checking vessel schedule status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check vessel schedule status',
      details: error.message
    })
  }
})

app.listen(PORT, () => {
    console.log('Excel server running on port', PORT)
    console.log('Excel files directory:', EXCEL_FILES_DIR)
    console.log('Health check: http://localhost:' + PORT + '/health')
    console.log('Excel files API: http://localhost:' + PORT + '/api/excel-files')
    console.log('Upload API: http://localhost:' + PORT + '/api/upload-monthly-data')
    console.log('Upload logs: http://localhost:' + PORT + '/api/upload-logs')
    console.log('--- Vessel Schedule APIs ---')
    console.log('Schedule files: http://localhost:' + PORT + '/api/vessel-schedule-files')
    console.log('Schedule upload: http://localhost:' + PORT + '/api/upload-vessel-schedule')
    console.log('Schedule status: http://localhost:' + PORT + '/api/vessel-schedule-status')
})