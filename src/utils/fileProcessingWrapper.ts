import { processFiles } from './dataProcessing'
import { ProcessedData } from '../types'

interface ProcessResult {
  success: boolean
  data?: ProcessedData
  error?: string
}

/**
 * Wrapper function to process Excel files
 * Bridges the gap between FileUploadPageWithDB expectations and actual implementation
 */
export async function processExcelFiles(
  files: File[], 
  progressCallback?: (progress: number) => void
): Promise<ProcessResult> {
  try {
    // Create FileData array from File array
    const fileDataArray = files.map(file => ({
      file,
      category: categorizeFile(file.name)
    }))

    // Process files using the existing processFiles function
    const result = await processFiles(fileDataArray, progressCallback)

    if (result.success && result.data) {
      return {
        success: true,
        data: result.data
      }
    } else {
      return {
        success: false,
        error: result.error || 'Failed to process files'
      }
    }
  } catch (error) {
    console.error('Error processing Excel files:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Categorize file based on filename
 */
function categorizeFile(filename: string): string {
  const lower = filename.toLowerCase()
  
  if (lower.includes('voyage') && lower.includes('event')) {
    return 'voyageEvents'
  } else if (lower.includes('manifest')) {
    return 'vesselManifests'
  } else if (lower.includes('cost') || lower.includes('allocation')) {
    return 'costAllocation'
  } else if (lower.includes('bulk')) {
    return 'bulkActions'
  } else if (lower.includes('voyage') && lower.includes('list')) {
    return 'voyageList'
  } else if (lower.includes('facility') || lower.includes('master')) {
    return 'masterFacilities'
  } else if (lower.includes('vessel') && lower.includes('class')) {
    return 'vesselClassifications'
  }
  
  // Default categorization based on common patterns
  if (lower.includes('voyage')) return 'voyageEvents'
  if (lower.includes('vessel')) return 'vesselManifests'
  if (lower.includes('cost')) return 'costAllocation'
  
  return 'unknown'
}