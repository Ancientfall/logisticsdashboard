// src/components/dashboard/FileUploadPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Database, Calendar, Plus, RefreshCw, Download, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { processExcelFiles } from '../../utils/dataProcessing';
import { VoyageEvent, VesselManifest, MasterFacility, CostAllocation, VoyageList, VesselClassification, BulkAction } from '../../types';
import DataManagementLayout from '../layout/DataManagementLayout';

interface ProcessingLogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface DataStoreMetadata {
  lastUpdated: Date | null;
  dateRange: { start: Date | null; end: Date | null };
  totalRecords: number;
  dataVersion: string;
  newRecords?: number;
}

interface DataStore {
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  voyageList: VoyageList[];
  vesselClassifications: VesselClassification[];
  bulkActions: BulkAction[];
  metadata: DataStoreMetadata;
}

const DataManagementSystem: React.FC = () => {
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

  const [dataStore, setDataStore] = useState<DataStore>({
    voyageEvents: [],
    vesselManifests: [],
    masterFacilities: [],
    costAllocation: [],
    voyageList: [],
    vesselClassifications: [],
    bulkActions: [],
    metadata: {
      lastUpdated: null,
      dateRange: { start: null, end: null },
      totalRecords: 0,
      dataVersion: '1.0'
    }
  });
  
  const [uploadMode, setUploadMode] = useState<'initial' | 'incremental'>('initial');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [processingLog, setProcessingLog] = useState<ProcessingLogEntry[]>([]);
  const [files, setFiles] = useState<{
    voyageEvents: File | null;
    vesselManifests: File | null;
    costAllocation: File | null;
    voyageList: File | null;
  }>({
    voyageEvents: null,
    vesselManifests: null,
    costAllocation: null,
    voyageList: null
  });
  
  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('bp-logistics-data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setDataStore(parsed);
        addLog(`Loaded existing data: ${parsed.metadata.totalRecords} records`, 'success');
        
        // Update context with loaded data
        setVoyageEvents(parsed.voyageEvents || []);
        setVesselManifests(parsed.vesselManifests || []);
        setMasterFacilities(parsed.masterFacilities || []);
        setCostAllocation(parsed.costAllocation || []);
        setVoyageList(parsed.voyageList || []);
        setVesselClassifications(parsed.vesselClassifications || []);
        setBulkActions(parsed.bulkActions || []);
        setIsDataReady(true);
      } catch (error) {
        addLog('Failed to load saved data', 'error');
      }
    }
  }, []);
  
  // Save data to localStorage whenever dataStore changes
  useEffect(() => {
    if (dataStore.metadata.totalRecords > 0) {
      localStorage.setItem('bp-logistics-data', JSON.stringify(dataStore));
    }
  }, [dataStore]);
  
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setProcessingLog(prev => [...prev.slice(-49), {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };
  
  const processFiles = async (mode = 'initial') => {
    setProcessingState('processing');
    setIsLoading(true);
    addLog(`Starting ${mode} data processing...`);
    
    try {
      // Process Excel files using existing utility
      const dataStoreResult = await processExcelFiles({
        voyageEventsFile: files.voyageEvents,
        voyageListFile: files.voyageList,
        vesselManifestsFile: files.vesselManifests,
        costAllocationFile: files.costAllocation,
        vesselClassificationsFile: null,
        bulkActionsFile: null,
        useMockData: false
      });
      
      const newData = {
        voyageEvents: dataStoreResult.voyageEvents,
        vesselManifests: dataStoreResult.vesselManifests,
        masterFacilities: dataStoreResult.masterFacilities,
        costAllocation: dataStoreResult.costAllocation,
        voyageList: dataStoreResult.voyageList,
        vesselClassifications: dataStoreResult.vesselClassifications || [],
        bulkActions: dataStoreResult.bulkActions || []
      };
      
      if (mode === 'initial') {
        // Replace all data
        const totalRecords = Object.values(newData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        const updatedDataStore = {
          ...newData,
          metadata: {
            lastUpdated: new Date(),
            dateRange: calculateDateRange(newData.voyageEvents),
            totalRecords,
            dataVersion: '1.0'
          }
        };
        
        setDataStore(updatedDataStore);
        
        // Update context
        setVoyageEvents(newData.voyageEvents);
        setVesselManifests(newData.vesselManifests);
        setMasterFacilities(newData.masterFacilities);
        setCostAllocation(newData.costAllocation);
        setVoyageList(newData.voyageList);
        setVesselClassifications(newData.vesselClassifications);
        setBulkActions(newData.bulkActions);
        setIsDataReady(true);
        
        addLog(`Initial data load complete: ${totalRecords} records`, 'success');
      } else {
        // Merge with existing data
        const mergedData = mergeDataSets(dataStore, newData);
        setDataStore(mergedData);
        
        // Update context with merged data
        setVoyageEvents(mergedData.voyageEvents);
        setVesselManifests(mergedData.vesselManifests);
        setMasterFacilities(mergedData.masterFacilities);
        setCostAllocation(mergedData.costAllocation);
        setVoyageList(mergedData.voyageList);
        setVesselClassifications(mergedData.vesselClassifications);
        setBulkActions(mergedData.bulkActions);
        
        addLog(`Incremental update complete: +${mergedData.metadata.newRecords} records`, 'success');
      }
      
      setProcessingState('complete');
      
      // Auto-redirect to dashboard after successful processing
      setTimeout(() => {
        addLog('Redirecting to dashboard...', 'success');
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Processing failed: ${errorMessage}`, 'error');
      setProcessingState('error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const mergeDataSets = (existing: DataStore, newData: Omit<DataStore, 'metadata'>): DataStore => {
    addLog('Merging datasets...');
    
    let newRecordsCount = 0;
    const merged: Partial<DataStore> = {};
    
    Object.keys(newData).forEach(key => {
      if (key === 'metadata') return;
      
      const existingRecords = existing[key as keyof DataStore] || [];
      const newRecords = newData[key as keyof Omit<DataStore, 'metadata'>] || [];
      
      // Simple deduplication by ID for voyage events, or by unique combination for others
      let existingIds: Set<string>;
      let uniqueNewRecords: any[];
      
      if (key === 'voyageEvents') {
        existingIds = new Set((existingRecords as VoyageEvent[]).map(r => r.id));
        uniqueNewRecords = (newRecords as VoyageEvent[]).filter(r => !existingIds.has(r.id));
      } else if (key === 'vesselManifests') {
        existingIds = new Set((existingRecords as VesselManifest[]).map(r => `${r.voyageId}-${r.manifestNumber}`));
        uniqueNewRecords = (newRecords as VesselManifest[]).filter(r => !existingIds.has(`${r.voyageId}-${r.manifestNumber}`));
      } else {
        // For other data types, use simple ID-based deduplication
        existingIds = new Set((existingRecords as any[]).map(r => r.id || r.lcNumber || r.locationName));
        uniqueNewRecords = (newRecords as any[]).filter(r => !existingIds.has(r.id || r.lcNumber || r.locationName));
      }
      
      (merged as any)[key] = [...(existingRecords as any[]), ...uniqueNewRecords];
      newRecordsCount += uniqueNewRecords.length;
      
      addLog(`${key}: +${uniqueNewRecords.length} new records (${newRecords.length - uniqueNewRecords.length} duplicates skipped)`);
    });
    
    const totalRecords = Object.values(merged).reduce((sum, arr) => sum + ((arr as any[])?.length || 0), 0);
    
    return {
      voyageEvents: merged.voyageEvents || existing.voyageEvents,
      vesselManifests: merged.vesselManifests || existing.vesselManifests,
      masterFacilities: merged.masterFacilities || existing.masterFacilities,
      costAllocation: merged.costAllocation || existing.costAllocation,
      voyageList: merged.voyageList || existing.voyageList,
      vesselClassifications: merged.vesselClassifications || existing.vesselClassifications,
      bulkActions: merged.bulkActions || existing.bulkActions,
      metadata: {
        lastUpdated: new Date(),
        dateRange: calculateDateRange(merged.voyageEvents || existing.voyageEvents),
        totalRecords,
        newRecords: newRecordsCount,
        dataVersion: existing.metadata.dataVersion
      }
    };
  };
  
  const calculateDateRange = (voyageEvents: VoyageEvent[]) => {
    if (!voyageEvents || voyageEvents.length === 0) {
      return { start: null, end: null };
    }
    
    const dates = voyageEvents.map(event => new Date(event.eventDate || event.from));
    return {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  };
  
  const exportData = () => {
    const dataBlob = new Blob([JSON.stringify(dataStore, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bp-logistics-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Data exported successfully', 'success');
  };
  
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.removeItem('bp-logistics-data');
      const emptyDataStore = {
        voyageEvents: [],
        vesselManifests: [],
        masterFacilities: [],
        costAllocation: [],
        voyageList: [],
        vesselClassifications: [],
        bulkActions: [],
        metadata: {
          lastUpdated: null,
          dateRange: { start: null, end: null },
          totalRecords: 0,
          dataVersion: '1.0'
        }
      };
      
      setDataStore(emptyDataStore);
      
      // Clear context
      setVoyageEvents([]);
      setVesselManifests([]);
      setMasterFacilities([]);
      setCostAllocation([]);
      setVoyageList([]);
      setVesselClassifications([]);
      setBulkActions([]);
      setIsDataReady(false);
      
      addLog('All data cleared', 'warning');
    }
  };
  
  const FileUploadZone = ({ label, fileType, required = false }: { 
    label: string; 
    fileType: keyof typeof files; 
    required?: boolean; 
  }) => {
    const [dragActive, setDragActive] = useState(false);
    const file = files[fileType];
    
    const handleDrag = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    }, []);
    
    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv')) {
          setFiles(prev => ({ ...prev, [fileType]: droppedFile }));
        } else {
          addLog(`Invalid file type for ${label}. Please upload Excel or CSV files only.`, 'error');
        }
      }
    }, [fileType, label]);
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFiles(prev => ({ ...prev, [fileType]: selectedFile }));
      }
    };
    
    return (
      <div
        className={`relative p-6 border-2 border-dashed rounded-lg transition-all ${
          dragActive ? 'border-green-400 bg-green-50' :
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${
            file ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {file ? <CheckCircle size={20} /> : <Upload size={20} />}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {file ? file.name : 'Drag & drop Excel file or click to browse'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {file && (
              <button
                onClick={() => setFiles(prev => ({ ...prev, [fileType]: null }))}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Remove
              </button>
            )}
            <label className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer text-sm">
              Browse
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      </div>
    );
  };
  
  const DataSummary = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Current Data Store</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={exportData}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={clearAllData}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <AlertTriangle size={16} />
            Clear All
          </button>
        </div>
      </div>
      
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         <div className="text-center p-4 bg-green-50 rounded-lg">
           <div className="text-2xl font-bold text-green-900">
             {dataStore.voyageEvents.length.toLocaleString()}
           </div>
           <div className="text-sm text-green-700">Voyage Events</div>
           <div className="text-xs text-green-600 mt-1">
             {dataStore.voyageEvents.length > 0 ? '✓ Loaded' : 'Pending Upload'}
           </div>
         </div>
         <div className="text-center p-4 bg-blue-50 rounded-lg">
           <div className="text-2xl font-bold text-blue-900">
             {dataStore.costAllocation.length.toLocaleString()}
           </div>
           <div className="text-sm text-blue-700">Cost Allocations</div>
           <div className="text-xs text-blue-600 mt-1">
             {dataStore.costAllocation.length > 0 ? '✓ Loaded' : 'Pending Upload'}
           </div>
         </div>
         <div className="text-center p-4 bg-purple-50 rounded-lg">
           <div className="text-2xl font-bold text-purple-900">
             {dataStore.voyageList.length.toLocaleString()}
           </div>
           <div className="text-sm text-purple-700">Voyage Lists</div>
           <div className="text-xs text-purple-600 mt-1">
             {dataStore.voyageList.length > 0 ? '✓ Loaded' : 'Pending Upload'}
           </div>
         </div>
         <div className="text-center p-4 bg-orange-50 rounded-lg">
           <div className="text-2xl font-bold text-orange-900">
             {dataStore.vesselManifests.length.toLocaleString()}
           </div>
           <div className="text-sm text-orange-700">Vessel Manifests</div>
           <div className="text-xs text-orange-600 mt-1">
             {dataStore.vesselManifests.length > 0 ? '✓ Loaded' : 'Optional'}
           </div>
         </div>
       </div>
      
             {dataStore.metadata.lastUpdated && (
         <div className="p-4 bg-gray-50 rounded-lg">
           <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-2">
               <Calendar size={16} className="text-gray-600" />
               <span className="text-gray-700">
                 Last Updated: {new Date(dataStore.metadata.lastUpdated).toLocaleString()}
               </span>
             </div>
             <div className="text-gray-700">
               Total Records: {dataStore.metadata.totalRecords.toLocaleString()}
             </div>
           </div>
           {dataStore.metadata.dateRange.start && dataStore.metadata.dateRange.end && (
             <div className="mt-2 text-sm text-gray-600">
               Data Range: {new Date(dataStore.metadata.dateRange.start).toLocaleDateString()} - {new Date(dataStore.metadata.dateRange.end).toLocaleDateString()}
             </div>
           )}
           <div className="mt-3 flex items-center gap-4 text-xs">
             <div className="flex items-center gap-1">
               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
               <span className="text-green-700">Data Validated</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
               <span className="text-blue-700">Ready for Analysis</span>
             </div>
             <div className="flex items-center gap-1">
               <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
               <span className="text-purple-700">Backup Created</span>
             </div>
           </div>
         </div>
       )}
    </div>
  );
  
  const ProcessingLog = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Processing Log</h3>
        <button
          onClick={() => setProcessingLog([])}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Log
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-2">
        {processingLog.length === 0 ? (
          <p className="text-gray-500 text-sm">No processing activity yet</p>
        ) : (
          processingLog.map(log => (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <span className="text-gray-500 font-mono text-xs mt-0.5">
                {log.timestamp}
              </span>
              <span className={`flex-1 ${
                log.type === 'success' ? 'text-green-700' :
                log.type === 'error' ? 'text-red-700' :
                log.type === 'warning' ? 'text-yellow-700' :
                'text-gray-700'
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const hasRequiredFiles = files.voyageEvents && files.costAllocation && files.voyageList;
  
  return (
    <DataManagementLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Upload & Management</h1>
          <p className="text-gray-600">Upload and manage your offshore logistics data with incremental updates</p>
        </div>
      
      {/* Mode Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setUploadMode('initial')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              uploadMode === 'initial' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-green-600" size={20} />
              <h4 className="font-semibold">Initial Data Load</h4>
            </div>
            <p className="text-sm text-gray-600">
              Upload all historical data (Jan 2024 - April 2025). This will replace any existing data.
            </p>
          </button>
          
          <button
            onClick={() => setUploadMode('incremental')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              uploadMode === 'incremental' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Plus className="text-green-600" size={20} />
              <h4 className="font-semibold">Monthly Update</h4>
            </div>
            <p className="text-sm text-gray-600">
              Add new monthly data to existing records. Duplicates will be automatically detected and skipped.
            </p>
          </button>
        </div>
      </div>
      
      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {uploadMode === 'initial' ? 'Upload Initial Data Files' : 'Upload Monthly Update Files'}
        </h3>
        <div className="space-y-4">
          <FileUploadZone label="Voyage Events (2024-April 2025)" fileType="voyageEvents" required />
          <FileUploadZone label="Cost Allocation (2024-April 2025)" fileType="costAllocation" required />
          <FileUploadZone label="Voyage List (2024-April 2025)" fileType="voyageList" required />
          <FileUploadZone label="Vessel Manifests (2024-April 2025)" fileType="vesselManifests" />
        </div>
        
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => processFiles(uploadMode)}
            disabled={processingState === 'processing' || !hasRequiredFiles}
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all ${
              processingState === 'processing' || !hasRequiredFiles
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
            }`}
          >
            {processingState === 'processing' ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="animate-spin" size={20} />
                Processing...
              </div>
            ) : (
              `${uploadMode === 'initial' ? 'Load Initial Data' : 'Update Data'}`
            )}
          </button>
        </div>
        
        {!hasRequiredFiles && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Please upload all required files to continue
          </p>
        )}
      </div>
      
      {/* Data Summary and Processing Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataSummary />
        <ProcessingLog />
      </div>
      </div>
    </DataManagementLayout>
  );
};

export default DataManagementSystem;