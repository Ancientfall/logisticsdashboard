// src/hooks/useServerFileLoader.ts
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { processExcelFiles } from '../utils/dataProcessing'

// Server file interface
interface ServerFile {
  name: string
  size: number
  lastModified: string
  type: 'data' | 'reference'
  path: string
}

interface ServerFilesResponse {
  success: boolean
  files: ServerFile[]
  metadata: {
    lastUpdated: string
    totalFiles: number
    version: string
  }
}

// File mapping for server files to local file types
const SERVER_FILE_MAPPING = {
  'Voyage Events.xlsx': 'voyageEvents',
  'Voyage List.xlsx': 'voyageList', 
  'Vessel Manifests.xlsx': 'vesselManifests',
  'Cost Allocation.xlsx': 'costAllocation',
  'Bulk Actions.xlsx': 'bulkActions'
} as const

export const useServerFileLoader = () => {
  const { 
    setVoyageEvents,
    setVesselManifests,
    setMasterFacilities,
    setCostAllocation,
    setVesselClassifications,
    setVoyageList,
    setBulkActions,
    setIsDataReady,
    setIsLoading,
    setError
  } = useData()
  
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false)
  const [serverFilesAvailable, setServerFilesAvailable] = useState(false)
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  // Get API base URL for local development vs production
  const getApiBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5001'
    }
    return window.location.origin
  }

  // Check server files availability
  const checkServerFiles = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/excel-files`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data: ServerFilesResponse = await response.json()
        
        if (data.success && data.files.length > 0) {
          setServerFiles(data.files)
          
          // Check if we have required files for basic functionality
          const requiredFiles = ['Voyage Events.xlsx', 'Cost Allocation.xlsx']
          const availableFiles = data.files.map(f => f.name)
          const hasRequired = requiredFiles.every(file => availableFiles.includes(file))
          
          setServerFilesAvailable(hasRequired)
          return hasRequired
        } else {
          setServerFilesAvailable(false)
          return false
        }
      } else {
        setServerFilesAvailable(false)
        return false
      }
    } catch (error) {
      console.log('Server files not available')
      setServerFilesAvailable(false)
      return false
    }
  }

  // Load files from server and process them
  const loadFromServer = async (): Promise<boolean> => {
    try {
      setIsLoadingFromServer(true)
      setIsLoading(true)
      setErrorMessage('')
      
      // Check if server files are available
      const filesAvailable = await checkServerFiles()
      if (!filesAvailable) {
        throw new Error('Required Excel files not found on server')
      }
      
      // Create file objects from server files
      const serverFileObjects: { [key: string]: File | null } = {
        voyageEventsFile: null,
        voyageListFile: null,
        vesselManifestsFile: null,
        costAllocationFile: null,
        bulkActionsFile: null,
        vesselClassificationsFile: null
      }
      
      // Download each available file from server
      for (const serverFile of serverFiles) {
        const fileType = SERVER_FILE_MAPPING[serverFile.name as keyof typeof SERVER_FILE_MAPPING]
        
        if (fileType) {
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/excel-files/${encodeURIComponent(serverFile.name)}`)
            
            if (response.ok) {
              const blob = await response.blob()
              const file = new File([blob], serverFile.name, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              })
              
              // Map to the correct file parameter name
              const fileKey = `${fileType}File`
              serverFileObjects[fileKey] = file
              
              console.log(`✅ Downloaded ${serverFile.name} from server`)
            } else {
              console.warn(`Failed to download ${serverFile.name}: ${response.status}`)
            }
          } catch (error) {
            console.error(`Error downloading ${serverFile.name}:`, error)
          }
        }
      }
      
      // Ensure we have required files
      if (!serverFileObjects.voyageEventsFile || !serverFileObjects.costAllocationFile) {
        throw new Error('Required files (Voyage Events and Cost Allocation) not available on server')
      }
      
      // Process the server files
      console.log('🔄 Processing server files...')
      const dataStore = await processExcelFiles({
        voyageEventsFile: serverFileObjects.voyageEventsFile,
        voyageListFile: serverFileObjects.voyageListFile,
        vesselManifestsFile: serverFileObjects.vesselManifestsFile,
        costAllocationFile: serverFileObjects.costAllocationFile,
        vesselClassificationsFile: serverFileObjects.vesselClassificationsFile,
        bulkActionsFile: serverFileObjects.bulkActionsFile,
        useMockData: false
      })
      
      // Update data context
      setVoyageEvents(dataStore.voyageEvents)
      setVesselManifests(dataStore.vesselManifests)
      setMasterFacilities(dataStore.masterFacilities)
      setCostAllocation(dataStore.costAllocation)
      setVoyageList(dataStore.voyageList)
      setVesselClassifications(dataStore.vesselClassifications || [])
      setBulkActions(dataStore.bulkActions || [])
      
      setIsDataReady(true)
      console.log('✅ Server data loaded successfully!')
      
      return true
      
    } catch (error) {
      console.error('Error loading from server:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error loading from server'
      setErrorMessage(errorMsg)
      setError(errorMsg)
      return false
    } finally {
      setIsLoadingFromServer(false)
      setIsLoading(false)
    }
  }

  return {
    isLoadingFromServer,
    serverFilesAvailable,
    serverFiles,
    errorMessage,
    checkServerFiles,
    loadFromServer
  }
}