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
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    res.header('Last-Modified', new Date().toUTCString())
    res.header('ETag', `"v2.1.2-${Date.now()}"`)
    
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
app.use(express.static('.'))

// Excel files directory
const EXCEL_FILES_DIR = path.join(__dirname, 'excel-data', 'excel-files')

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Cache-busting endpoint to force refresh
app.get('/cache-buster', (req, res) => {
    const timestamp = Date.now()
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    res.header('Last-Modified', new Date().toUTCString())
    res.json({ 
        cacheBuster: timestamp,
        message: 'Cache refresh forced',
        timestamp: new Date().toISOString(),
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '-1'
        }
    })
})

// Version check endpoint
app.get('/version', (req, res) => {
    res.json({ 
        version: '2.1.2',
        buildTimestamp: new Date().toISOString(),
        serverTimestamp: new Date().toISOString(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        cacheStatus: 'no-cache-enforced',
        deploymentId: `deploy-${Date.now()}`
    })
})

// Standard web categorization endpoints
app.get('/robots.txt', (req, res) => {
    res.type('text/plain')
    res.send(`User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /

# BP Logistics Analytics Dashboard
# Internal business application for offshore drilling operations
# Industry: Energy, Oil & Gas, Maritime Logistics
# Purpose: Business Intelligence and Analytics

Sitemap: https://bpsolutionsdashboard.com/sitemap.xml`)
})

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml')
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://bpsolutionsdashboard.com/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://bpsolutionsdashboard.com/dashboard</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>https://bpsolutionsdashboard.com/drilling</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://bpsolutionsdashboard.com/production</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>`)
})

app.get('/security.txt', (req, res) => {
    res.type('text/plain')
    res.send(`# Security Contact Information
Contact: mailto:security@bp.com
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: en
Canonical: https://bpsolutionsdashboard.com/.well-known/security.txt

# Application Information
# BP Logistics Analytics Dashboard
# Internal business intelligence platform
# Industry: Energy, Oil & Gas Operations
# Classification: Business-Critical Internal Tool`)
})

app.get('/.well-known/security.txt', (req, res) => {
    res.redirect(301, '/security.txt')
})

// Application information endpoint for categorization
app.get('/app-info', (req, res) => {
    res.json({
        application: {
            name: "BP Logistics Analytics Dashboard",
            industry: "Energy, Oil & Gas, Maritime Logistics",
            category: "Business Intelligence",
            purpose: "Internal Operations Analytics",
            classification: "Business-Critical Internal Tool",
            compliance: ["SOX", "Internal Controls"],
            security: "Enterprise-Grade"
        },
        organization: {
            industry: "Energy",
            sector: "Oil & Gas",
            operations: "Offshore Drilling & Production"
        },
        technical: {
            platform: "React",
            backend: "Node.js",
            security: "Authentication Required",
            data: "Internal Business Data Only"
        },
        lastUpdated: new Date().toISOString()
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

// Aggressive favicon serving with cache-busting
app.get('/favicon.ico', (req, res) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    res.header('Last-Modified', new Date().toUTCString())
    res.header('ETag', `"favicon-v2.1.2-${Date.now()}"`)
    res.sendFile(path.join(__dirname, 'favicon.ico'))
})

// Alternative favicon endpoints for cache-busting
app.get('/favicon-*.ico', (req, res) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    res.header('Last-Modified', new Date().toUTCString())
    res.header('ETag', `"favicon-alt-v2.1.2-${Date.now()}"`)
    const filename = req.path.substring(1) // Remove leading slash
    if (fs.existsSync(path.join(__dirname, filename))) {
        res.sendFile(path.join(__dirname, filename))
    } else {
        res.sendFile(path.join(__dirname, 'favicon.ico'))
    }
})

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
    console.log('Enhanced server running on port', PORT)
    console.log('Excel files directory:', EXCEL_FILES_DIR)
    console.log('Health check: http://localhost:' + PORT + '/health')
    console.log('Excel files API: http://localhost:' + PORT + '/api/excel-files')
})