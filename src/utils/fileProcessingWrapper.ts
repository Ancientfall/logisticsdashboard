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
    // Categorize files by type
    let voyageEventsFile: File | null = null
    let voyageListFile: File | null = null
    let vesselManifestsFile: File | null = null
    let costAllocationFile: File | null = null
    let vesselClassificationsFile: File | null = null
    let bulkActionsFile: File | null = null

    // Categorize each file based on its name
    files.forEach(file => {
      const lower = file.name.toLowerCase()
      
      if (lower.includes('voyage') && lower.includes('event')) {
        voyageEventsFile = file
      } else if (lower.includes('voyage') && lower.includes('list')) {
        voyageListFile = file
      } else if (lower.includes('manifest')) {
        vesselManifestsFile = file
      } else if (lower.includes('cost') || lower.includes('allocation')) {
        costAllocationFile = file
      } else if (lower.includes('vessel') && lower.includes('class')) {
        vesselClassificationsFile = file
      } else if (lower.includes('bulk')) {
        bulkActionsFile = file
      } else if (lower.includes('voyage')) {
        // Default voyage files to events if not list
        voyageEventsFile = file
      } else if (lower.includes('vessel')) {
        // Default vessel files to manifests if not classifications
        vesselManifestsFile = file
      }
    })

    // Process files using the existing processExcelFiles function
    const result = await processExcelFilesOriginal({
      voyageEventsFile,
      voyageListFile,
      vesselManifestsFile,
      costAllocationFile,
      vesselClassificationsFile,
      bulkActionsFile
    })
    
    // Call progress callback at 100% when done
    if (progressCallback) {
      progressCallback(1)
    }

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