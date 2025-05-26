// src/components/FileUpload.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useData } from '../context/DataContext';
import { processExcelFiles } from '../utils/dataProcessing';

const FileUploadComponent: React.FC = () => {
  console.log('FileUploadComponent is mounting!');
  
  const { 
    setVoyageEvents, 
    setVesselManifests, 
    setMasterFacilities, 
    setCostAllocation,
    setVesselClassifications,
    setVoyageList,
    setBulkActions,
    setLoading, 
    setError,
    isLoading,
    error
  } = useData();
  
  // File references
  const [files, setFiles] = useState<{
    voyageEvents: File | null;
    voyageList: File | null;
    vesselManifests: File | null;
    masterFacilities: File | null;
    costAllocation: File | null;
    vesselClassifications: File | null;
    bulkActions: File | null;
  }>({
    voyageEvents: null,
    voyageList: null,
    vesselManifests: null,
    masterFacilities: null,
    costAllocation: null,
    vesselClassifications: null,
    bulkActions: null
  });
  
  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<{
    voyageEvents: number;
    voyageList: number;
    vesselManifests: number;
    masterFacilities: number;
    costAllocation: number;
    vesselClassifications: number;
    bulkActions: number;
  }>({
    voyageEvents: 0,
    voyageList: 0,
    vesselManifests: 0,
    masterFacilities: 0,
    costAllocation: 0,
    vesselClassifications: 0,
    bulkActions: 0
  });
  
  // Processing status
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  
  // File input refs - fixed ref types
  const voyageEventsRef = useRef<HTMLInputElement>(null);
  const voyageListRef = useRef<HTMLInputElement>(null);
  const vesselManifestsRef = useRef<HTMLInputElement>(null);
  const masterFacilitiesRef = useRef<HTMLInputElement>(null);
  const costAllocationRef = useRef<HTMLInputElement>(null);
  const vesselClassificationsRef = useRef<HTMLInputElement>(null);
  const bulkActionsRef = useRef<HTMLInputElement>(null);
  
  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof typeof files) => {
    console.log('File change triggered for:', fileType);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setError(`${fileType} file must be an Excel or CSV file`);
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
      
      // Clear any previous errors
      setError(null);
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
    
    // Reset file input
    const refs = {
      voyageEvents: voyageEventsRef,
      voyageList: voyageListRef,
      vesselManifests: vesselManifestsRef,
      masterFacilities: masterFacilitiesRef,
      costAllocation: costAllocationRef,
      vesselClassifications: vesselClassificationsRef,
      bulkActions: bulkActionsRef
    };
    
    const ref = refs[fileType];
    if (ref.current) {
      ref.current.value = '';
    }
  };
  
  // Process files
  const processFiles = async () => {
    console.log('Process files clicked!');
    // Check if all required files are uploaded
    if (!files.voyageEvents || !files.vesselManifests || 
        !files.masterFacilities || !files.costAllocation) {
      setError('Please upload all required files (Voyage Events, Vessel Manifests, Master Facilities, Cost Allocation)');
      return;
    }
    
    // Set loading state
    setProcessingStatus('processing');
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting file processing...');
      
      // Process Excel files
      const results = await processExcelFiles(
        files.voyageEvents,
        files.vesselManifests,
        files.masterFacilities,
        files.costAllocation,
        files.voyageList || undefined,
        files.vesselClassifications || undefined,
        files.bulkActions || undefined
      );
      
      console.log('Processing complete, updating context...');
      
      // Update data context
      setVoyageEvents(results.voyageEvents);
      setVesselManifests(results.vesselManifests);
      setMasterFacilities(results.masterFacilities);
      setCostAllocation(results.costAllocation);
      setVesselClassifications(results.vesselClassifications);
      setVoyageList(results.voyageList);
      setBulkActions(results.bulkActions);
      
      setProcessingStatus('success');
      console.log('Data context updated successfully');
      
    } catch (error) {
      console.error('Error processing files:', error);
      setError(`Error processing files: ${error instanceof Error ? error.message : String(error)}`);
      setProcessingStatus('error');
    } finally {
      setLoading(false);
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
        setError(`${fileType} file must be an Excel or CSV file`);
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
      
      // Clear any previous errors
      setError(null);
    }
  }, [setError]);
  
  // Generate file input
  const FileInput = ({ 
    fileType, 
    label, 
    ref,
    required = false
  }: { 
    fileType: keyof typeof files; 
    label: string; 
    ref: React.RefObject<HTMLInputElement | null>;
    required?: boolean;
  }) => (
    <div 
      className={`mb-4 p-4 border-2 border-dashed rounded-lg transition-colors ${
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
            <p className="font-medium">
              {label} {required && <span className="text-red-500">*</span>}
            </p>
            {files[fileType] ? (
              <p className="text-sm text-gray-600">{files[fileType]?.name}</p>
            ) : (
              <p className="text-sm text-gray-500">
                {required ? 'Required - ' : 'Optional - '}
                Drag & drop or click to browse
              </p>
            )}
          </div>
        </div>
        
        <div>
          {files[fileType] ? (
            <button
              type="button"
              onClick={(e) => {
                console.log('Remove button clicked for:', fileType);
                e.preventDefault();
                e.stopPropagation();
                resetFileInput(fileType);
              }}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Remove
            </button>
          ) : (
            <>
              <button
                type="button"
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm cursor-pointer transition-colors"
                onClick={(e) => {
                  console.log('Browse button clicked for:', fileType);
                  e.preventDefault();
                  if (ref.current) {
                    ref.current.click();
                  }
                }}
              >
                Browse
              </button>
              <input
                type="file"
                ref={ref}
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => handleFileChange(e, fileType)}
                onClick={() => console.log('Input clicked for:', fileType)}
              />
            </>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {uploadProgress[fileType] > 0 && uploadProgress[fileType] < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${uploadProgress[fileType]}%` }}
          ></div>
        </div>
      )}
    </div>
  );
  
  const requiredFilesUploaded = !!(files.voyageEvents && files.vesselManifests && files.masterFacilities && files.costAllocation);
  
  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Excel Files</h2>
      <p className="text-gray-600 mb-6">
        Upload your Excel files to process the data for the dashboard. Required files are marked with *.
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Required Files */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Required Files</h3>
          
          <FileInput 
            fileType="voyageEvents" 
            label="Voyage Events" 
            ref={voyageEventsRef}
            required={true}
          />
          
          <FileInput 
            fileType="vesselManifests" 
            label="Vessel Manifests" 
            ref={vesselManifestsRef}
            required={true}
          />
          
          <FileInput 
            fileType="masterFacilities" 
            label="Master Facilities" 
            ref={masterFacilitiesRef}
            required={true}
          />
          
          <FileInput 
            fileType="costAllocation" 
            label="Cost Allocation" 
            ref={costAllocationRef}
            required={true}
          />
        </div>
        
        {/* Optional Files */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Optional Files</h3>
          
          <FileInput 
            fileType="voyageList" 
            label="Voyage List" 
            ref={voyageListRef}
          />
          
          <FileInput 
            fileType="vesselClassifications" 
            label="Vessel Classifications" 
            ref={vesselClassificationsRef}
          />
          
          <FileInput 
            fileType="bulkActions" 
            label="Bulk Actions" 
            ref={bulkActionsRef}
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {requiredFilesUploaded ? (
            <span className="text-green-600 font-medium">✓ All required files uploaded</span>
          ) : (
            <span>Please upload all required files to continue</span>
          )}
        </div>
        
        <button
          type="button"
          onClick={(e) => {
            console.log('Button clicked!', e);
            processFiles();
          }}
          disabled={processingStatus === 'processing' || !requiredFilesUploaded}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            processingStatus === 'processing' || !requiredFilesUploaded
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {processingStatus === 'processing' ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : 'Process Files'}
        </button>
      </div>
      
      {processingStatus === 'processing' && (
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full animate-pulse w-full"></div>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Processing files, please wait... This may take a few moments.
          </p>
        </div>
      )}
      
      {processingStatus === 'success' && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Files processed successfully! Dashboard will load automatically...
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;