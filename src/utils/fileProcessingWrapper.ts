import { processExcelFiles as processExcelFilesOriginal, ProcessingResults } from './dataProcessing'

interface ProcessResult {
  success: boolean
  data?: ProcessingResults
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
    // Process files using the existing processExcelFiles function
    const result = await processExcelFilesOriginal({
      files,
      onProgress: progressCallback
    })

    // The processExcelFiles function returns the result directly
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error processing Excel files:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}