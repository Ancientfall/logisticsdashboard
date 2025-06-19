#!/usr/bin/env node

/**
 * Simple development server for serving Excel files to the React app
 * This server only serves the Excel files API - no database required
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs').promises

const app = express()
const PORT = 5001

// Excel files directory
const EXCEL_FILES_DIR = path.join(__dirname, 'excel-data', 'excel-files')

console.log('🚀 BP Logistics Excel File Server')
console.log('📁 Serving files from:', EXCEL_FILES_DIR)

// CORS for local development
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}))

// Parse JSON
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    server: 'Excel File Server', 
    port: PORT,
    timestamp: new Date().toISOString()
  })
})

// GET /api/excel-files - List available Excel files
app.get('/api/excel-files', async (req, res) => {
  try {
    console.log('📋 Listing Excel files...')
    
    // Check if directory exists
    try {
      await fs.access(EXCEL_FILES_DIR)
    } catch (error) {
      console.error('❌ Excel files directory not found:', EXCEL_FILES_DIR)
      return res.status(404).json({
        success: false,
        message: 'Excel files directory not found',
        path: EXCEL_FILES_DIR
      })
    }

    const files = await fs.readdir(EXCEL_FILES_DIR)
    const excelFiles = []

    for (const filename of files) {
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
        try {
          const filePath = path.join(EXCEL_FILES_DIR, filename)
          const stats = await fs.stat(filePath)
          
          excelFiles.push({
            name: filename,
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            type: 'data',
            path: 'excel-files'
          })
          
          console.log(`  ✅ ${filename} (${Math.round(stats.size / 1024)}KB)`)
        } catch (error) {
          console.error(`  ❌ Error reading ${filename}:`, error.message)
        }
      }
    }

    console.log(`📊 Found ${excelFiles.length} Excel files`)

    res.json({
      success: true,
      files: excelFiles,
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalFiles: excelFiles.length,
        version: '1.0.0-dev'
      }
    })
    
  } catch (error) {
    console.error('❌ Error listing Excel files:', error)
    res.status(500).json({
      success: false,
      message: 'Error listing Excel files',
      error: error.message
    })
  }
})

// GET /api/excel-files/:filename - Serve specific Excel file
app.get('/api/excel-files/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    
    console.log(`📥 Serving file: ${filename}`)
    
    // Validate filename
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      })
    }

    const filePath = path.join(EXCEL_FILES_DIR, filename)
    
    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      console.error(`❌ File not found: ${filename}`)
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    // Get file stats
    const stats = await fs.stat(filePath)

    // Set headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', stats.size)
    res.setHeader('Last-Modified', stats.mtime.toUTCString())
    
    // Allow cross-origin access
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath)
    fileStream.pipe(res)
    
    console.log(`  ✅ Served ${filename} (${Math.round(stats.size / 1024)}KB)`)
    
  } catch (error) {
    console.error('❌ Error serving Excel file:', error)
    res.status(500).json({
      success: false,
      message: 'Error serving file',
      error: error.message
    })
  }
})

// Catch all - show available endpoints
app.get('*', (req, res) => {
  res.json({
    message: 'BP Logistics Excel File Server',
    endpoints: [
      'GET /health - Health check',
      'GET /api/excel-files - List Excel files',
      'GET /api/excel-files/:filename - Download Excel file'
    ],
    excelFilesPath: EXCEL_FILES_DIR
  })
})

// Start server
app.listen(PORT, () => {
  console.log('')
  console.log(`🌐 Server running on http://localhost:${PORT}`)
  console.log(`📋 Excel files API: http://localhost:${PORT}/api/excel-files`)
  console.log(`💚 Health check: http://localhost:${PORT}/health`)
  console.log('')
  console.log('💡 Your React app useServerFileLoader hook will now work!')
  console.log('   The landing page should show "View Analytics" instead of "Get Started"')
  console.log('')
  console.log('🛑 Press Ctrl+C to stop the server')
  console.log('')
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('')
  console.log('🛑 Shutting down Excel file server...')
  process.exit(0)
})

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})