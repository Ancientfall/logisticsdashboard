// src/components/dashboard/FileUploadPage.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { processExcelFiles } from '../../utils/dataProcessing';

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
  
  const [dragOver, setDragOver] = useState(false);
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
  
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof typeof files) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setErrorMessage(`${fileType} file must be an Excel or CSV file`);
        return;
      }
      
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
    }
  };
  
  const resetFileInput = (fileType: keyof typeof files) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
  };
  
  const processFiles = async () => {
    if (!useMockData) {
      if (!files.voyageEvents || !files.masterFacilities || !files.costAllocation) {
        setErrorMessage('Voyage Events, Master Facilities, and Cost Allocation files are required');
        return;
      }
    }
    
    setProcessingStatus('processing');
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const dataStore = await processExcelFiles({
        voyageEventsFile: files.voyageEvents,
        voyageListFile: files.voyageList,
        vesselManifestsFile: files.vesselManifests,
        masterFacilitiesFile: files.masterFacilities,
        costAllocationFile: files.costAllocation,
        vesselClassificationsFile: null,
        bulkActionsFile: null,
        useMockData
      });
      
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
      
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
        setErrorMessage(`${fileType} file must be an Excel or CSV file`);
        return;
      }
      
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
    }
  }, []);
  
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleShowMockData = () => {
    processFiles();
  };
  
  const anyFilesUploaded = Object.values(files).some(file => file !== null);
  const allRequiredFilesUploaded = files.voyageEvents && files.masterFacilities && files.costAllocation;
  
  const FileInput = ({ 
    fileType, 
    label,
    required = false
  }: { 
    fileType: keyof typeof files; 
    label: string;
    required?: boolean;
  }) => (
    <div className={`group relative overflow-hidden rounded-lg p-4 transition-all duration-300 ${
      files[fileType] 
        ? 'bg-green-50 border-2 border-green-300' 
        : 'bg-white border-2 border-gray-200 hover:border-green-300'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-md transition-all ${
          files[fileType] ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1">
          <p className={`font-semibold ${files[fileType] ? 'text-green-700' : 'text-gray-800'}`}>
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {files[fileType] && (
            <p className="text-sm text-gray-600 mt-1">{files[fileType]!.name}</p>
          )}
        </div>
        
        {files[fileType] ? (
          <button 
            onClick={() => resetFileInput(fileType)}
            className="p-2 bg-white rounded-md hover:bg-red-500 hover:text-white transition-all"
            title="Remove file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <div className={`p-2 rounded-md ${files[fileType] ? 'text-green-500' : 'text-gray-300'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Progress indicator */}
      {files[fileType] && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500 animate-pulse" />
      )}
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          {/* BP Logo */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 rounded-full animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">bp</span>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Logistics Analytics Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your offshore vessel operations data into actionable insights
          </p>
        </div>
        
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-8">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 font-medium">{errorMessage}</span>
            </div>
          </div>
        )}
        
        {/* Main Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-12">
          {/* Progress Bar */}
          {processingStatus === 'processing' && (
            <div className="h-2 bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 animate-pulse" />
            </div>
          )}
          
          <div 
            className={`p-8 transition-all duration-300 ${
              dragOver ? 'bg-green-50' : 'bg-white'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'voyageEvents')}
          >
            {/* Status Icons */}
            <div className="text-center mb-8">
              {processingStatus === 'processing' ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full animate-spin">
                  <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.364-6.364l-2.828 2.828M8.464 15.536l-2.828 2.828m12.728 0l-2.828-2.828M8.464 8.464L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              ) : processingStatus === 'success' ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <svg className="w-8 h-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-semibold text-center text-gray-900 mb-2">
              {processingStatus === 'processing' ? 'Processing Your Data...' : 
               processingStatus === 'success' ? 'Ready to Launch!' : 
               'Upload Your Excel Files'}
            </h2>
            
            <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
              {processingStatus === 'processing' ? 'Analyzing vessel operations and generating insights' : 
               processingStatus === 'success' ? 'All files processed successfully. Redirecting to dashboard...' : 
               'Drag and drop files or click browse to select from your computer'}
            </p>
            
            {processingStatus === 'idle' && (
              <>
                {/* File Upload Grid */}
                <div className="grid gap-4 mb-8 max-w-3xl mx-auto">
                  <FileInput fileType="voyageEvents" label="Voyage Events" required={true} />
                  <FileInput fileType="masterFacilities" label="Master Facilities" required={true} />
                  <FileInput fileType="costAllocation" label="Cost Allocation" required={true} />
                  <FileInput fileType="voyageList" label="Voyage List" required={false} />
                  <FileInput fileType="vesselManifests" label="Vessel Manifests" required={false} />
                </div>
                
                {/* Browse Button */}
                <div className="text-center">
                  <button 
                    className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                    onClick={handleBrowseClick}
                  >
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
                          handleFileChange(e, 'voyageEvents');
                        }
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Process Button */}
        {anyFilesUploaded && processingStatus === 'idle' && (
          <div className="text-center mb-12">
            <button 
              className={`inline-flex items-center gap-3 px-8 py-4 text-white font-bold text-lg rounded-lg shadow-lg transform transition-all duration-200 ${
                allRequiredFilesUploaded 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-xl hover:-translate-y-1' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              onClick={processFiles}
              disabled={!allRequiredFilesUploaded && !useMockData}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Process Files & Launch Dashboard
            </button>
          </div>
        )}
        
        {/* Mock Data Option */}
        {useMockData && processingStatus === 'idle' && (
          <div className="text-center mt-4">
            <button
              onClick={handleShowMockData}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Use sample data for demo
            </button>
          </div>
        )}
        
        {/* Features Grid */}
        {processingStatus === 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17H7a2 2 0 01-2-2V7a2 2 0 012-2h2m4 14h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-4 14h4m0-14h-4m0 0v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Analytics</h4>
              <p className="text-gray-600">
                Track vessel movements, cargo operations, and performance metrics with live data visualization
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Efficiency Tracking</h4>
              <p className="text-gray-600">
                Monitor productive time, identify bottlenecks, and optimize vessel utilization rates
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Cost Analysis</h4>
              <p className="text-gray-600">
                Deep dive into operational costs with detailed allocation and trending insights
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadPage;