const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 5001

// Security and categorization headers middleware
app.use((req, res, next) => {
    // CORS headers
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    
    // Cache control headers to prevent stale content
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '0')
    res.header('ETag', `"v2.1.0-${Date.now()}"`)
    
    // Security headers that help with categorization
    res.header('X-Content-Type-Options', 'nosniff')
    res.header('X-Frame-Options', 'SAMEORIGIN')
    res.header('X-XSS-Protection', '1; mode=block')
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // Business application identification headers
    res.header('X-Application-Type', 'Business-Analytics-Dashboard')
    res.header('X-Industry', 'Energy-Oil-Gas-Logistics')
    res.header('X-Purpose', 'Internal-Business-Operations')
    res.header('X-Content-Category', 'Business-Intelligence')
    
    // Server identification
    res.header('X-Powered-By', 'BP-Logistics-Analytics-Platform')
    
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
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        application: 'BP Logistics Analytics Dashboard',
        version: '2.1.0'
    })
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
                const filePath = path.join(EXCEL_FILES_DIR, filename)
                const stats = fs.statSync(filePath)
                
                fileList.push({
                    name: filename,
                    size: stats.size,
                    lastModified: stats.mtime.toISOString(),
                    url: `/api/excel-files/${encodeURIComponent(filename)}`
                })
            }
        })

        console.log(`Listed ${fileList.length} Excel files`)
        
        res.json({
            success: true,
            files: fileList,
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalFiles: fileList.length,
                version: '2.1.0'
            }
        })
    } catch (error) {
        console.error('Error listing Excel files:', error)
        res.status(500).json({ 
            success: false, 
            error: 'Failed to list Excel files',
            details: error.message 
        })
    }
})

// GET /api/excel-files/:filename - Download a specific Excel file
app.get('/api/excel-files/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename)
        const filePath = path.join(EXCEL_FILES_DIR, filename)

        // Security check: prevent directory traversal
        if (!filePath.startsWith(EXCEL_FILES_DIR)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid file path' 
            })
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'File not found' 
            })
        }

        // Set appropriate headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
        
        console.log(`Served Excel file: ${filename}`)
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath)
        fileStream.pipe(res)
        
        fileStream.on('error', (error) => {
            console.error(`Error streaming file ${filename}:`, error)
            if (!res.headersSent) {
                res.status(500).json({ 
                    success: false, 
                    error: 'Error streaming file' 
                })
            }
        })
        
    } catch (error) {
        console.error('Error serving Excel file:', error)
        res.status(500).json({ 
            success: false, 
            error: 'Failed to serve Excel file',
            details: error.message 
        })
    }
})

// Serve static files (React build) - this should come last
app.use(express.static('.', {
    maxAge: '0',
    etag: false,
    lastModified: false
}))

// Fallback for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
    console.log(`🚀 BP Logistics Dashboard VPS Server running on port ${PORT}`)
    console.log(`📊 Serving React app from: ${__dirname}`)
    console.log(`📁 Excel files directory: ${EXCEL_FILES_DIR}`)
    console.log(`🌐 Health check: http://localhost:${PORT}/health`)
    console.log(`📈 Excel API: http://localhost:${PORT}/api/excel-files`)
    console.log(`🔒 Security headers enabled for categorization`)
    console.log(`✅ Business application identification headers active`)
})