// src/components/FileUpload.tsx
import React, { useState, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { processExcelFiles } from '../utils/dataProcessing';
import LoadingScreen from './ui/LoadingScreen';

// Mock data option for testing without file uploads
const useMockData = false;

const FileUpload: React.FC = () => {
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
  
  // File references
  const [files, setFiles] = useState<{
    voyageEvents: File | null;
    voyageList: File | null;
    vesselManifests: File | null;
    costAllocation: File | null;
  }>({
    voyageEvents: null,
    voyageList: null,
    vesselManifests: null,
    costAllocation: null
  });
  
  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<{
    voyageEvents: number;
    voyageList: number;
    vesselManifests: number;
    costAllocation: number;
  }>({
    voyageEvents: 0,
    voyageList: 0,
    vesselManifests: 0,
    costAllocation: 0
  });
  
  // Processing status
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof typeof files) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setErrorMessage(`${fileType} file must be an Excel or CSV file`);
        return;
      }
      
      // Update files state
      setFiles(prev => ({
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
  
  // Reset file input
  const resetFileInput = (fileType: keyof typeof files) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
    
    setUploadProgress(prev => ({
      ...prev,
      [fileType]: 0
    }));
  };
  
  // Process files
  const processFiles = async () => {
    // Check if using mock data or if required files are uploaded
    if (!useMockData) {
      // Required files
      if (!files.voyageEvents || !files.costAllocation) {
        setErrorMessage('Voyage Events and Cost Allocation files are required');
        return;
      }
    }
    
    // Set loading state
    setProcessingStatus('processing');
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Process Excel files
      const dataStore = await processExcelFiles({
        voyageEventsFile: files.voyageEvents,
        voyageListFile: files.voyageList,
        vesselManifestsFile: files.vesselManifests,
        costAllocationFile: files.costAllocation,
        vesselClassificationsFile: null, // Optional
        bulkActionsFile: null, // Optional
        useMockData
      });
      
      // Update individual data arrays
      setVoyageEvents(dataStore.voyageEvents);
      setVesselManifests(dataStore.vesselManifests);
      setMasterFacilities(dataStore.masterFacilities);
      setCostAllocation(dataStore.costAllocation);
      setVoyageList(dataStore.voyageList);
      setVesselClassifications(dataStore.vesselClassifications || []);
      setBulkActions(dataStore.bulkActions || []);
      
      setIsDataReady(true);
      setProcessingStatus('success');
    } catch (error) {
      console.error('Error processing files:', error);
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
  
  const handleDrop = useCallback((e: React.DragEvent, fileType: keyof typeof files) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setErrorMessage(`${fileType} file must be an Excel or CSV file`);
        return;
      }
      
      // Update files state
      setFiles(prev => ({
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
  
  // Option to load mock data for testing
  const handleShowMockData = () => {
    processFiles();
  };
  
  // Generate file input
  const FileInput = ({ 
    fileType, 
    label
  }: { 
    fileType: keyof typeof files; 
    label: string; 
  }) => (
    <div 
      className={`mb-4 p-4 border-2 border-dashed rounded-lg ${
        files[fileType] ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
      }`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, fileType)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4">
            {files[fileType] ? (
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
            <p className="font-medium">{label}</p>
            {files[fileType] ? (
              <p className="text-sm text-gray-600">{files[fileType]?.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
            )}
          </div>
        </div>
        
        <div>
          {files[fileType] ? (
            <button
              type="button"
              onClick={() => resetFileInput(fileType)}
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
                onChange={(e) => handleFileChange(e, fileType)}
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
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Excel Files</h2>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
        </div>
      )}
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Please upload the Excel files to process the data for the dashboard. Required files are marked with an asterisk (*).
        </p>
        
        <FileInput 
          fileType="voyageEvents" 
          label="Voyage Events *"
        />
        
        <FileInput 
          fileType="costAllocation" 
          label="Cost Allocation *"
        />
        
        <FileInput 
          fileType="voyageList" 
          label="Voyage List (optional)"
        />
        
        <FileInput 
          fileType="vesselManifests" 
          label="Vessel Manifests (optional)"
        />
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={processFiles}
          disabled={processingStatus === 'processing' || (!useMockData && (!files.voyageEvents || !files.costAllocation))}
          className={`px-4 py-2 rounded font-medium ${
            processingStatus === 'processing' || (!useMockData && (!files.voyageEvents || !files.costAllocation))
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {processingStatus === 'processing' ? 'Processing...' : 'Process Files'}
        </button>
      </div>
      
      {useMockData && (
        <div className="mt-4 text-center">
          <button
            onClick={handleShowMockData}
            className="text-blue-500 underline"
          >
            Use mock data for testing
          </button>
        </div>
      )}
      
      {processingStatus === 'processing' && (
        <LoadingScreen message="Processing files, please wait..." />
      )}
      
      {processingStatus === 'success' && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Files processed successfully! Loading dashboard...
        </div>
      )}
    </div>
  );
};

export default FileUpload;