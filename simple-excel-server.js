const express = require('express')
const path = require('path')
const fs = require('fs')

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

app.listen(PORT, () => {
    console.log('Excel server running on port', PORT)
    console.log('Excel files directory:', EXCEL_FILES_DIR)
    console.log('Health check: http://localhost:' + PORT + '/health')
    console.log('Excel files API: http://localhost:' + PORT + '/api/excel-files')
})