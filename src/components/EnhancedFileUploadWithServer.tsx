// src/components/EnhancedFileUploadWithServer.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { processExcelFiles } from '../utils/dataProcessing';
import LoadingScreen from './ui/LoadingScreen';

// Server file interface
interface ServerFile {
  name: string;
  size: number;
  lastModified: string;
  type: 'data' | 'reference';
  path: string;
}

interface ServerFilesResponse {
  success: boolean;
  files: ServerFile[];
  metadata: {
    lastUpdated: string;
    totalFiles: number;
    version: string;
  };
}

// File mapping for server files to local file types
const SERVER_FILE_MAPPING = {
  'Voyage Events.xlsx': 'voyageEvents',
  'Voyage List.xlsx': 'voyageList', 
  'Vessel Manifests.xlsx': 'vesselManifests',
  'Cost Allocation.xlsx': 'costAllocation',
  'Bulk Actions.xlsx': 'bulkActions'
} as const;

const EnhancedFileUploadWithServer: React.FC = () => {
  const navigate = useNavigate();
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
  } = useData();
  
  // Local file references
  const [localFiles, setLocalFiles] = useState<{
    voyageEvents: File | null;
    voyageList: File | null;
    vesselManifests: File | null;
    costAllocation: File | null;
    bulkActions: File | null;
  }>({
    voyageEvents: null,
    voyageList: null,
    vesselManifests: null,
    costAllocation: null,
    bulkActions: null
  });
  
  // Server files state
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [serverMetadata, setServerMetadata] = useState<ServerFilesResponse['metadata'] | null>(null);
  const [serverAvailable, setServerAvailable] = useState<boolean>(false);
  const [checkingServer, setCheckingServer] = useState<boolean>(true);
  
  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<{
    voyageEvents: number;
    voyageList: number;
    vesselManifests: number;
    costAllocation: number;
    bulkActions: number;
  }>({
    voyageEvents: 0,
    voyageList: 0,
    vesselManifests: 0,
    costAllocation: 0,
    bulkActions: 0
  });
  
  // Processing status
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingMethod, setLoadingMethod] = useState<'server' | 'local' | null>(null);

  // Check for server files on component mount - ONLY ONCE
  useEffect(() => {
    let mounted = true;
    
    const checkOnce = async () => {
      if (mounted) {
        await checkServerFiles();
      }
    };
    
    checkOnce();
    
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once

  // Get API base URL for local development vs production
  const getApiBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5001';
    }
    return window.location.origin;
  };

  // Check server files availability
  const checkServerFiles = async () => {
    try {
      setCheckingServer(true);
      
      // Try to fetch server files with proper base URL and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${getApiBaseUrl()}/api/excel-files`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data: ServerFilesResponse = await response.json();
        
        if (data.success && data.files.length > 0) {
          setServerFiles(data.files);
          setServerMetadata(data.metadata);
          setServerAvailable(true);
          
          // Check if we have all required files (for future use if needed)
          // const requiredFiles = Object.keys(SERVER_FILE_MAPPING);
          // const availableFiles = data.files.map(f => f.name);
          // const allRequired = requiredFiles.every(file => availableFiles.includes(file));
          
          // Note: Auto-loading removed to prevent polling loops
          // User must manually click "Load Data from Server" button
        } else {
          setServerAvailable(false);
        }
      } else {
        setServerAvailable(false);
      }
    } catch (error) {
      // Only log once to avoid console spam
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Server check timed out - server may not be running');
      } else {
        console.log('Server files not available, using local upload mode');
      }
      setServerAvailable(false);
    } finally {
      setCheckingServer(false);
    }
  };

  // Load files from server
  const loadFromServer = async () => {
    try {
      setProcessingStatus('processing');
      setIsLoading(true);
      setLoadingMethod('server');
      setErrorMessage('');
      
      // Create file objects from server files
      const serverFileObjects: { [key: string]: File | null } = {
        voyageEventsFile: null,
        voyageListFile: null,
        vesselManifestsFile: null,
        costAllocationFile: null,
        bulkActionsFile: null,
        vesselClassificationsFile: null
      };
      
      // Download each required file from server
      for (const serverFile of serverFiles) {
        const fileType = SERVER_FILE_MAPPING[serverFile.name as keyof typeof SERVER_FILE_MAPPING];
        
        if (fileType) {
          try {
            const response = await fetch(`${getApiBaseUrl()}/api/excel-files/${encodeURIComponent(serverFile.name)}`);
            
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], serverFile.name, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              });
              
              // Map to the correct file parameter name
              const fileKey = `${fileType}File`;
              serverFileObjects[fileKey] = file;
              
              // Update progress
              setUploadProgress(prev => ({
                ...prev,
                [fileType]: 100
              }));
            }
          } catch (error) {
            console.error(`Error downloading ${serverFile.name}:`, error);
          }
        }
      }
      
      // Process the server files
      const dataStore = await processExcelFiles({
        voyageEventsFile: serverFileObjects.voyageEventsFile,
        voyageListFile: serverFileObjects.voyageListFile,
        vesselManifestsFile: serverFileObjects.vesselManifestsFile,
        costAllocationFile: serverFileObjects.costAllocationFile,
        vesselClassificationsFile: serverFileObjects.vesselClassificationsFile,
        bulkActionsFile: serverFileObjects.bulkActionsFile,
        useMockData: false
      });
      
      // Update data context
      setVoyageEvents(dataStore.voyageEvents);
      setVesselManifests(dataStore.vesselManifests);
      setMasterFacilities(dataStore.masterFacilities);
      setCostAllocation(dataStore.costAllocation);
      setVoyageList(dataStore.voyageList);
      setVesselClassifications(dataStore.vesselClassifications || []);
      setBulkActions(dataStore.bulkActions || []);
      
      setIsDataReady(true);
      setProcessingStatus('success');
      
      // Navigate to dashboard after successful loading
      setTimeout(() => {
        navigate('/dashboards');
      }, 1500);
      
    } catch (error) {
      console.error('Error loading from server:', error);
      setErrorMessage(`Error loading from server: ${error instanceof Error ? error.message : String(error)}`);
      setProcessingStatus('error');
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle local file change
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof typeof localFiles) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setErrorMessage(`${fileType} file must be an Excel or CSV file`);
        return;
      }
      
      // Update local files state
      setLocalFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      
      // Update progress
      setUploadProgress(prev => ({
        ...prev,
        [fileType]: 100
      }));
    }
  };

  // Reset local file input
  const resetLocalFileInput = (fileType: keyof typeof localFiles) => {
    setLocalFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
    
    setUploadProgress(prev => ({
      ...prev,
      [fileType]: 0
    }));
  };

  // Process local files
  const processLocalFiles = async () => {
    // Check if required files are uploaded
    if (!localFiles.voyageEvents || !localFiles.costAllocation) {
      setErrorMessage('Voyage Events and Cost Allocation files are required');
      return;
    }
    
    // Set loading state
    setProcessingStatus('processing');
    setIsLoading(true);
    setLoadingMethod('local');
    setErrorMessage('');
    
    try {
      // Process Excel files
      const dataStore = await processExcelFiles({
        voyageEventsFile: localFiles.voyageEvents,
        voyageListFile: localFiles.voyageList,
        vesselManifestsFile: localFiles.vesselManifests,
        costAllocationFile: localFiles.costAllocation,
        vesselClassificationsFile: null,
        bulkActionsFile: localFiles.bulkActions,
        useMockData: false
      });
      
      // Update data context
      setVoyageEvents(dataStore.voyageEvents);
      setVesselManifests(dataStore.vesselManifests);
      setMasterFacilities(dataStore.masterFacilities);
      setCostAllocation(dataStore.costAllocation);
      setVoyageList(dataStore.voyageList);
      setVesselClassifications(dataStore.vesselClassifications || []);
      setBulkActions(dataStore.bulkActions || []);
      
      setIsDataReady(true);
      setProcessingStatus('success');
      
      // Navigate to dashboard after successful loading
      setTimeout(() => {
        navigate('/dashboards');
      }, 1500);
    } catch (error) {
      console.error('Error processing local files:', error);
      setErrorMessage(`Error processing files: ${error instanceof Error ? error.message : String(error)}`);
      setProcessingStatus('error');
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, fileType: keyof typeof localFiles) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setErrorMessage(`${fileType} file must be an Excel or CSV file`);
        return;
      }
      
      // Update local files state
      setLocalFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      
      // Update progress
      setUploadProgress(prev => ({
        ...prev,
        [fileType]: 100
      }));
    }
  }, []);

  // Get server file info for display
  const getServerFileInfo = (fileName: string) => {
    return serverFiles.find(f => f.name === fileName);
  };

  // Local file input component
  const LocalFileInput = ({ 
    fileType, 
    label,
    required = false
  }: { 
    fileType: keyof typeof localFiles; 
    label: string;
    required?: boolean;
  }) => (
    <div 
      className={`mb-4 p-4 border-2 border-dashed rounded-lg ${
        localFiles[fileType] ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
      }`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, fileType)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4">
            {localFiles[fileType] ? (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <div>
            <p className="font-medium">{label} {required && <span className="text-red-500">*</span>}</p>
            {localFiles[fileType] ? (
              <p className="text-sm text-gray-600">{localFiles[fileType]?.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
            )}
          </div>
        </div>
        
        <div>
          {localFiles[fileType] ? (
            <button
              type="button"
              onClick={() => resetLocalFileInput(fileType)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          ) : (
            <label className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm cursor-pointer">
              Browse
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => handleLocalFileChange(e, fileType)}
              />
            </label>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {uploadProgress[fileType] > 0 && uploadProgress[fileType] < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${uploadProgress[fileType]}%` }}
          ></div>
        </div>
      )}
    </div>
  );

  // Server file display component
  const ServerFileDisplay = ({ fileName, label }: { fileName: string; label: string }) => {
    const fileInfo = getServerFileInfo(fileName);
    
    return (
      <div className="mb-4 p-4 border-2 border-solid rounded-lg border-blue-500 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13H14a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div>
              <p className="font-medium text-blue-800">{label} (Server)</p>
              {fileInfo ? (
                <div className="text-sm text-blue-600">
                  <p>{fileName}</p>
                  <p>Size: {(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p>Updated: {new Date(fileInfo.lastModified).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-sm text-blue-600">Available on server</p>
              )}
            </div>
          </div>
          
          <div className="text-sm text-blue-600 font-medium">
            ✓ Ready
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2 transition-colors"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => navigate('/dashboards')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors"
          >
            Skip to Analytics →
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">BP Logistics Data Center</h1>
        <p className="text-lg text-gray-600">Load Excel data to power your analytics dashboards</p>
      </div>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      {/* Loading indicator while checking server */}
      {checkingServer && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
            Checking for server files...
          </div>
        </div>
      )}

      {/* Server files available */}
      {serverAvailable && serverMetadata && !checkingServer && (
        <div className="mb-6">
          <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded mb-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Server files available!</p>
                <p className="text-sm">
                  {serverFiles.length} files found • Last updated: {new Date(serverMetadata.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button
              type="button"
              onClick={loadFromServer}
              disabled={processingStatus === 'processing'}
              className={`w-full px-4 py-3 rounded font-medium text-lg ${
                processingStatus === 'processing'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {processingStatus === 'processing' && loadingMethod === 'server' 
                ? 'Loading from Server...' 
                : '🚀 Load Data from Server'}
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Available Server Files:</h3>
            <ServerFileDisplay fileName="Voyage Events.xlsx" label="Voyage Events" />
            <ServerFileDisplay fileName="Cost Allocation.xlsx" label="Cost Allocation" />
            <ServerFileDisplay fileName="Voyage List.xlsx" label="Voyage List" />
            <ServerFileDisplay fileName="Vessel Manifests.xlsx" label="Vessel Manifests" />
            <ServerFileDisplay fileName="Bulk Actions.xlsx" label="Bulk Actions" />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Alternative: Upload Local Files</h3>
            <p className="text-gray-600 mb-4">
              If you prefer to upload your own Excel files, you can use the local upload option below.
            </p>
          </div>
        </div>
      )}

      {/* Local file upload section */}
      {(!serverAvailable || checkingServer) && (
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Please upload the Excel files to process the data for the dashboard. Required files are marked with an asterisk (*).
          </p>
        </div>
      )}
      
      <LocalFileInput 
        fileType="voyageEvents" 
        label="Voyage Events"
        required={true}
      />
      
      <LocalFileInput 
        fileType="costAllocation" 
        label="Cost Allocation"
        required={true}
      />
      
      <LocalFileInput 
        fileType="voyageList" 
        label="Voyage List"
      />
      
      <LocalFileInput 
        fileType="vesselManifests" 
        label="Vessel Manifests"
      />

      <LocalFileInput 
        fileType="bulkActions" 
        label="Bulk Actions"
      />

      {/* Local files process button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={processLocalFiles}
          disabled={processingStatus === 'processing' || (!localFiles.voyageEvents || !localFiles.costAllocation)}
          className={`px-4 py-2 rounded font-medium ${
            processingStatus === 'processing' || (!localFiles.voyageEvents || !localFiles.costAllocation)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {processingStatus === 'processing' && loadingMethod === 'local' 
            ? 'Processing Local Files...' 
            : 'Process Local Files'}
        </button>
      </div>
      
      {processingStatus === 'processing' && (
        <LoadingScreen 
          message={loadingMethod === 'server' 
            ? "Loading data from server, please wait..." 
            : "Processing local files, please wait..."
          } 
        />
      )}
      
      {processingStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Files processed successfully! Loading dashboard...
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUploadWithServer;