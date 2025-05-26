// src/components/dashboard/FileUploadPage.tsx
import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, Database, Factory, CheckCircle, ArrowRight, AlertCircle, Loader2, Ship, DollarSign, Building, List } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { processExcelFiles } from '../../utils/dataProcessing';
import './FileUploadPage.css';

const FileUploadPage: React.FC = () => {
  console.log('FileUploadPage is mounting!');
  
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
    error
  } = useData();

  // File references
  const [files, setFiles] = useState<{
    voyageEvents: File | null;
    vesselManifests: File | null;
    masterFacilities: File | null;
    costAllocation: File | null;
    voyageList: File | null;
    vesselClassifications: File | null;
    bulkActions: File | null;
  }>({
    voyageEvents: null,
    vesselManifests: null,
    masterFacilities: null,
    costAllocation: null,
    voyageList: null,
    vesselClassifications: null,
    bulkActions: null
  });

  // UI State
  const [dragOver, setDragOver] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if required files are uploaded
  const requiredFilesUploaded = !!(files.voyageEvents && files.vesselManifests && files.masterFacilities && files.costAllocation);
  const uploadedCount = Object.values(files).filter(Boolean).length;

  // Helper function to get the appropriate icon based on uploaded files
  const getUploadIcon = () => {
    if (processingStatus === 'processing') {
      return <Loader2 className="upload-icon spinning" />;
    }
    if (processingStatus === 'success') {
      return <CheckCircle className="upload-icon success" />;
    }
    
    // Show specific icons based on which files are uploaded
    if (files.voyageEvents && !files.vesselManifests && !files.masterFacilities && !files.costAllocation) {
      return <Ship className="upload-icon voyage-icon" />;
    }
    if (files.costAllocation && !files.voyageEvents && !files.vesselManifests && !files.masterFacilities) {
      return <DollarSign className="upload-icon cost-icon" />;
    }
    if (files.masterFacilities && !files.voyageEvents && !files.vesselManifests && !files.costAllocation) {
      return <Factory className="upload-icon facility-icon" />;
    }
    if (files.vesselManifests && !files.voyageEvents && !files.masterFacilities && !files.costAllocation) {
      return <FileSpreadsheet className="upload-icon manifest-icon" />;
    }
    if (files.voyageList && !files.voyageEvents && !files.vesselManifests && !files.masterFacilities && !files.costAllocation) {
      return <List className="upload-icon list-icon" />;
    }
    
    // Multiple files or default
    if (uploadedCount > 1) {
      return <Database className="upload-icon multi-files" />;
    }
    
    return <Upload className="upload-icon" />;
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File change triggered');
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      console.log('Files selected:', selectedFiles.map(f => f.name));
      
      // Process each file and try to match it to the correct type
      selectedFiles.forEach(file => {
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('voyage') && fileName.includes('event')) {
          setFiles(prev => ({ ...prev, voyageEvents: file }));
        } else if (fileName.includes('vessel') && fileName.includes('manifest')) {
          setFiles(prev => ({ ...prev, vesselManifests: file }));
        } else if (fileName.includes('master') && fileName.includes('facilit')) {
          setFiles(prev => ({ ...prev, masterFacilities: file }));
        } else if (fileName.includes('cost') && fileName.includes('allocation')) {
          setFiles(prev => ({ ...prev, costAllocation: file }));
        } else if (fileName.includes('voyage') && fileName.includes('list')) {
          setFiles(prev => ({ ...prev, voyageList: file }));
        } else if (fileName.includes('vessel') && fileName.includes('classification')) {
          setFiles(prev => ({ ...prev, vesselClassifications: file }));
        } else if (fileName.includes('bulk') && fileName.includes('action')) {
          setFiles(prev => ({ ...prev, bulkActions: file }));
        } else {
          // If we can't auto-detect, add to the first empty required slot
          setFiles(prev => {
            if (!prev.voyageEvents) return { ...prev, voyageEvents: file };
            if (!prev.vesselManifests) return { ...prev, vesselManifests: file };
            if (!prev.masterFacilities) return { ...prev, masterFacilities: file };
            if (!prev.costAllocation) return { ...prev, costAllocation: file };
            return prev;
          });
        }
      });
      
      setError(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    console.log('Files dropped');
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      console.log('Dropped files:', droppedFiles.map(f => f.name));
      
      // Process dropped files the same way as selected files
      droppedFiles.forEach(file => {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
          setError(`File ${file.name} must be an Excel or CSV file`);
          return;
        }
        
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('voyage') && fileName.includes('event')) {
          setFiles(prev => ({ ...prev, voyageEvents: file }));
        } else if (fileName.includes('vessel') && fileName.includes('manifest')) {
          setFiles(prev => ({ ...prev, vesselManifests: file }));
        } else if (fileName.includes('master') && fileName.includes('facilit')) {
          setFiles(prev => ({ ...prev, masterFacilities: file }));
        } else if (fileName.includes('cost') && fileName.includes('allocation')) {
          setFiles(prev => ({ ...prev, costAllocation: file }));
        } else if (fileName.includes('voyage') && fileName.includes('list')) {
          setFiles(prev => ({ ...prev, voyageList: file }));
        } else if (fileName.includes('vessel') && fileName.includes('classification')) {
          setFiles(prev => ({ ...prev, vesselClassifications: file }));
        } else if (fileName.includes('bulk') && fileName.includes('action')) {
          setFiles(prev => ({ ...prev, bulkActions: file }));
        }
      });
      
      setError(null);
    }
  }, [setError]);

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

  // Handle browse button click
  const handleBrowseClick = () => {
    console.log('Browse button clicked - this should appear in console!');
    if (fileInputRef.current) {
      console.log('File input found, triggering click');
      fileInputRef.current.click();
    } else {
      console.log('ERROR: File input ref is null');
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-hero">
        <div className="hero-icon">
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
        </div>
        <h2 className="hero-title">BP Logistics Dashboard</h2>
        <p className="hero-subtitle">
          Transform your offshore vessel data into powerful insights and analytics
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${requiredFilesUploaded ? 'files-ready' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon-container">
          {getUploadIcon()}
        </div>
        
        <h3 className="upload-title">
          {processingStatus === 'processing' ? 'Processing Files...' :
           processingStatus === 'success' ? 'Files Processed Successfully!' :
           uploadedCount > 0 ? `${uploadedCount} Files Uploaded` :
           'Drag & Drop Files Here'}
        </h3>
        
        <p className="upload-description">
          {processingStatus === 'processing' ? 'Please wait while we process your data...' :
           processingStatus === 'success' ? 'Dashboard will load automatically' :
           'or click to browse'}
        </p>

        <div className="file-requirements">
          <div className={`requirement-item ${files.voyageEvents ? 'uploaded' : ''}`}>
            <Ship className="req-icon voyage-file" />
            <span>{files.voyageEvents ? files.voyageEvents.name : 'Voyage Events.xlsx'}</span>
            <CheckCircle className={`check-icon ${files.voyageEvents ? 'active' : ''}`} />
          </div>
          <div className={`requirement-item ${files.vesselManifests ? 'uploaded' : ''}`}>
            <FileSpreadsheet className="req-icon manifest-file" />
            <span>{files.vesselManifests ? files.vesselManifests.name : 'Vessel Manifests.xlsx'}</span>
            <CheckCircle className={`check-icon ${files.vesselManifests ? 'active' : ''}`} />
          </div>
          <div className={`requirement-item ${files.masterFacilities ? 'uploaded' : ''}`}>
            <Factory className="req-icon facility-file" />
            <span>{files.masterFacilities ? files.masterFacilities.name : 'Master Facilities.xlsx'}</span>
            <CheckCircle className={`check-icon ${files.masterFacilities ? 'active' : ''}`} />
          </div>
          <div className={`requirement-item ${files.costAllocation ? 'uploaded' : ''}`}>
            <DollarSign className="req-icon cost-file" />
            <span>{files.costAllocation ? files.costAllocation.name : 'Cost Allocation.xlsx'}</span>
            <CheckCircle className={`check-icon ${files.costAllocation ? 'active' : ''}`} />
          </div>
          
          {/* Optional Files */}
          {(files.voyageList || files.vesselClassifications || files.bulkActions) && (
            <div className="optional-files-divider">
              <span>Optional Files</span>
            </div>
          )}
          
          {files.voyageList && (
            <div className="requirement-item uploaded optional">
              <List className="req-icon list-file" />
              <span>{files.voyageList.name}</span>
              <CheckCircle className="check-icon active" />
            </div>
          )}
          
          {files.vesselClassifications && (
            <div className="requirement-item uploaded optional">
              <Building className="req-icon vessel-file" />
              <span>{files.vesselClassifications.name}</span>
              <CheckCircle className="check-icon active" />
            </div>
          )}
          
          {files.bulkActions && (
            <div className="requirement-item uploaded optional">
              <Database className="req-icon bulk-file" />
              <span>{files.bulkActions.name}</span>
              <CheckCircle className="check-icon active" />
            </div>
          )}
        </div>

        {processingStatus !== 'processing' && processingStatus !== 'success' && (
          <button 
            className="upload-button"
            onClick={handleBrowseClick}
          >
            <Upload size={20} />
            Choose Files
            <ArrowRight size={16} />
          </button>
        )}

        {requiredFilesUploaded && processingStatus === 'idle' && (
          <button 
            className="process-button"
            onClick={processFiles}
          >
            <Database size={20} />
            Process Files
            <ArrowRight size={16} />
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {processingStatus === 'processing' && (
          <div className="processing-indicator">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        )}
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h4>Lightning Fast</h4>
          <p>Process files instantly in your browser</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h4>Secure & Private</h4>
          <p>Your data never leaves your device</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h4>Advanced Analytics</h4>
          <p>Powerful insights and visualizations</p>
        </div>
      </div>
    </div>
  );
};

export default FileUploadPage;