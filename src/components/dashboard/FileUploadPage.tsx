// src/components/dashboard/FileUploadPage.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { processExcelFiles } from '../../utils/dataProcessing';
import './FileUploadPage.css'; // Import your beautiful CSS

// Mock data option for testing without file uploads
const useMockData = false;

const FileUploadPage: React.FC = () => {
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
  
  // Add drag state for styling
  const [dragOver, setDragOver] = useState(false);
  
  // File references
  const [files, setFiles] = useState<{
    voyageEvents: File | null;
    voyageList: File | null;
    vesselManifests: File | null;
    masterFacilities: File | null;
    costAllocation: File | null;
  }>({
    voyageEvents: null,
    voyageList: null,
    vesselManifests: null,
    masterFacilities: null,
    costAllocation: null
  });
  
  
  // Processing status
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // File input refs for browse button
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    }
  };
  
  // Reset file input
  const resetFileInput = (fileType: keyof typeof files) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
  };
  
  // Process files
  const processFiles = async () => {
    // Check if using mock data or if required files are uploaded
    if (!useMockData) {
      // Required files
      if (!files.voyageEvents || !files.masterFacilities || !files.costAllocation) {
        setErrorMessage('Voyage Events, Master Facilities, and Cost Allocation files are required');
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
        masterFacilitiesFile: files.masterFacilities,
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
      setVoyageList(dataStore.voyageList || []);
      setVesselClassifications(dataStore.vesselClassifications || []);
      setBulkActions(dataStore.bulkActions || []);
      
      setIsDataReady(true);
      setProcessingStatus('success');
    } catch (error) {
      console.error('Error processing files:', error);
      const errorMsg = `Error processing files: ${error instanceof Error ? error.message : String(error)}`;
      setErrorMessage(errorMsg);
      setError(errorMsg);
      setProcessingStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Drag and drop handlers with visual feedback
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent, fileType: keyof typeof files) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
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
    }
  }, []);
  
  // Handle browse button click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Option to load mock data for testing
  const handleShowMockData = () => {
    processFiles();
  };
  
  // Check if any files are uploaded
  const anyFilesUploaded = Object.values(files).some(file => file !== null);
  const allRequiredFilesUploaded = files.voyageEvents && files.masterFacilities && files.costAllocation;
  
  // Generate file input
  const FileInput = ({ 
    fileType, 
    label,
    required = false
  }: { 
    fileType: keyof typeof files; 
    label: string;
    required?: boolean;
  }) => (
    <div className={`requirement-item ${files[fileType] ? 'uploaded' : ''}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="req-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
      <span>{label}{required && ' *'}</span>
      {files[fileType] ? (
        <button 
          onClick={() => resetFileInput(fileType)}
          className="remove-file-btn"
          title="Remove file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className={`check-icon ${files[fileType] ? 'active' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
  
  return (
    <div className="file-upload-container">
      {/* BP Logo/Helios Animation */}
      <div className="upload-hero">
        <div className="bp-logo-container">
          <div className="bp-logo">
            <div className="bp-helios">
              <div className="helios-ray helios-ray-1"></div>
              <div className="helios-ray helios-ray-2"></div>
              <div className="helios-ray helios-ray-3"></div>
              <div className="helios-ray helios-ray-4"></div>
              <div className="helios-ray helios-ray-5"></div>
              <div className="helios-ray helios-ray-6"></div>
              <div className="helios-ray helios-ray-7"></div>
              <div className="helios-ray helios-ray-8"></div>
              <div className="helios-center"></div>
            </div>
          </div>
        </div>
        <h1 className="hero-title">BP Logistics Dashboard</h1>
        <p className="hero-subtitle">Upload your Excel files to process data for the offshore vessel logistics analytics dashboard.</p>
      </div>
      
      {/* Error Banner */}
      {errorMessage && (
        <div className="error-banner">
          <svg xmlns="http://www.w3.org/2000/svg" className="req-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
      
      {/* Upload Zone */}
      <div 
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${anyFilesUploaded ? 'files-ready' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'voyageEvents')} // You may want to handle this differently
      >
        <div className="upload-icon-container">
          {processingStatus === 'processing' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="upload-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          ) : processingStatus === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="upload-icon success" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="upload-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        <h2 className="upload-title">
          {processingStatus === 'processing' ? 'Processing Files...' : 
           processingStatus === 'success' ? 'Processing Complete!' : 
           'Upload Excel Files'}
        </h2>
        
        <p className="upload-description">
          {processingStatus === 'processing' ? 'Please wait while we process your files. This may take a few moments.' : 
           processingStatus === 'success' ? 'All files processed successfully! Loading dashboard...' : 
           'Drag and drop your Excel files here, or click to browse'}
        </p>
        
        {processingStatus === 'idle' && (
          <>
            {/* File Requirements */}
            <div className="file-requirements">
              <FileInput 
                fileType="voyageEvents" 
                label="Voyage Events"
                required={true}
              />
              
              <FileInput 
                fileType="masterFacilities" 
                label="Master Facilities"
                required={true}
              />
              
              <FileInput 
                fileType="costAllocation" 
                label="Cost Allocation"
                required={true}
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
            
            <button className="upload-button" onClick={handleBrowseClick}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Browse Files
            </button>
            <input 
              type="file" 
              multiple 
              accept=".xlsx,.csv" 
              ref={fileInputRef}
              onChange={(e) => {
                // Detect the file type by name and call the appropriate handler
                if (e.target.files && e.target.files.length > 0) {
                  const file = e.target.files[0];
                  const fileName = file.name.toLowerCase();
                  
                  if (fileName.includes('voyage') && fileName.includes('event')) {
                    handleFileChange(e, 'voyageEvents');
                  } else if (fileName.includes('master') && fileName.includes('facilit')) {
                    handleFileChange(e, 'masterFacilities');
                  } else if (fileName.includes('cost') && fileName.includes('alloc')) {
                    handleFileChange(e, 'costAllocation');
                  } else if (fileName.includes('vessel') && fileName.includes('manifest')) {
                    handleFileChange(e, 'vesselManifests');
                  } else if (fileName.includes('voyage') && fileName.includes('list')) {
                    handleFileChange(e, 'voyageList');
                  } else {
                    // Default to voyage events if can't detect
                    handleFileChange(e, 'voyageEvents');
                  }
                }
              }}
              style={{ display: 'none' }}
            />
          </>
        )}
        
        {processingStatus === 'processing' && (
          <div className="processing-indicator">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Process Button */}
      {anyFilesUploaded && processingStatus === 'idle' && (
        <div className="text-center">
          <button 
            className="process-button"
            onClick={processFiles}
            disabled={!allRequiredFilesUploaded && !useMockData}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Process Files
          </button>
        </div>
      )}
      
      {/* Mock Data Option */}
      {useMockData && processingStatus === 'idle' && (
        <div className="text-center mt-4">
          <button
            onClick={handleShowMockData}
            className="text-blue-500 underline"
          >
            Use mock data for testing
          </button>
        </div>
      )}
      
      {/* Features Grid */}
      {processingStatus === 'idle' && (
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h4>Interactive Analytics</h4>
            <p>Explore drilling efficiency metrics with intuitive visualizations and real-time filtering options.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h4>Time Tracking</h4>
            <p>Analyze productive vs. non-productive time with month-over-month comparisons and trending.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🚢</div>
            <h4>Vessel Performance</h4>
            <p>Compare vessel efficiency across operations with detailed cargo and transit metrics.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadPage;