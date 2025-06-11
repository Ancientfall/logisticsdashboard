// src/components/dashboard/FileUploadPage.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Plus, RefreshCw, CheckCircle, FileText, BarChart2, Factory, GitBranch, Ship, DollarSign, Settings2, Bell, Clock, Home, Package } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { processExcelFiles } from '../../utils/dataProcessing';
import { VoyageEvent, VesselManifest, MasterFacility, CostAllocation, VoyageList, VesselClassification, BulkAction } from '../../types';

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

interface DataManagementSystemProps {
  onNavigateHome?: () => void;
  onNavigateToDrilling?: () => void;
  onNavigateToProduction?: () => void;
  onNavigateToComparison?: () => void;
  onNavigateToVoyage?: () => void;
  onNavigateToCost?: () => void;
  onNavigateToBulk?: () => void;
}

const DataManagementSystem: React.FC<DataManagementSystemProps> = ({ 
  onNavigateHome, 
  onNavigateToDrilling, 
  onNavigateToProduction, 
  onNavigateToComparison,
  onNavigateToVoyage,
  onNavigateToCost,
  onNavigateToBulk
}) => {
  const { 
    voyageEvents,
    vesselManifests,
    masterFacilities,
    costAllocation,
    voyageList,
    vesselClassifications,
    bulkActions,
    lastUpdated,
    isDataReady,
    setVoyageEvents,
    setVesselManifests,
    setMasterFacilities,
    setCostAllocation,
    setVesselClassifications,
    setVoyageList,
    setBulkActions,
    setIsDataReady,
    setIsLoading,
    setError,
    clearAllData
  } = useData();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Create a computed dataStore from the DataContext data
  const dataStore: DataStore = useMemo(() => {
    const totalRecords = voyageEvents.length + vesselManifests.length + masterFacilities.length + 
                        costAllocation.length + voyageList.length + vesselClassifications.length + bulkActions.length;
    
    const dateRange = voyageEvents.length > 0 ? (() => {
      const dates = voyageEvents.map(e => new Date(e.eventDate)).filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return { start: null, end: null };
      return {
        start: new Date(Math.min(...dates.map(d => d.getTime()))),
        end: new Date(Math.max(...dates.map(d => d.getTime())))
      };
    })() : { start: null, end: null };

    return {
      voyageEvents,
      vesselManifests,
      masterFacilities,
      costAllocation,
      voyageList,
      vesselClassifications,
      bulkActions,
      metadata: {
        lastUpdated,
        dateRange,
        totalRecords,
        dataVersion: '1.0'
      }
    };
  }, [voyageEvents, vesselManifests, masterFacilities, costAllocation, voyageList, vesselClassifications, bulkActions, lastUpdated]);

  const [uploadMode, setUploadMode] = useState<'initial' | 'incremental'>('initial');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const isProcessingRef = React.useRef(false); // Add ref to track if we're currently processing
  
  // Initialize processing log from localStorage
  const initializeProcessingLog = (): ProcessingLogEntry[] => {
    try {
      const savedLog = localStorage.getItem('bp-logistics-processing-log');
      if (savedLog) {
        const parsed = JSON.parse(savedLog);
        if (Array.isArray(parsed)) {
          // Ensure unique IDs for existing log entries and fix any duplicates
          const now = Date.now();
          return parsed.map((entry, index) => ({
            ...entry,
            id: now + index * 1000 + Math.random() * 100 // Guaranteed unique ID
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load processing log:', error);
    }
    return [];
  };
  
  const [processingLog, setProcessingLog] = useState<ProcessingLogEntry[]>(initializeProcessingLog);
  
  // Counter for unique log IDs
  const logIdCounter = React.useRef(Date.now());
  
  // Add initial log entry if we loaded existing data (only once)
  const hasLoggedInitialData = React.useRef(false);
  React.useEffect(() => {
    if (!hasLoggedInitialData.current) {
      const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length;
      if (totalRecords > 0) {
        hasLoggedInitialData.current = true;
        addLog(`Existing data detected: ${totalRecords} records loaded`, 'success');
      }
    }
    
    // Check for emergency storage mode
    const emergencyData = localStorage.getItem('bp-logistics-data-emergency');
    if (emergencyData) {
      try {
        const parsed = JSON.parse(emergencyData);
        addLog('🚨 Emergency storage mode detected', 'warning');
        addLog(parsed.message || 'Storage was critically full', 'warning');
        if (parsed.instructions) {
          parsed.instructions.forEach((instruction: string) => {
            addLog(`💡 ${instruction}`, 'info');
          });
        }
      } catch (error) {
        addLog('🚨 Emergency storage mode detected but data corrupted', 'error');
      }
    }
  }, [voyageEvents.length, vesselManifests.length, costAllocation.length, voyageList.length]); // Include dependencies
  const [files, setFiles] = useState<{
    voyageEvents: File | null;
    vesselManifests: File | null;
    costAllocation: File | null;
    voyageList: File | null;
    bulkActions: File | null;
  }>({
    voyageEvents: null,
    vesselManifests: null,
    costAllocation: null,
    voyageList: null,
    bulkActions: null
  });
  
  // Load data from localStorage on component mount (only if not already loaded)
  useEffect(() => {
    // Remove duplicate loading logic - DataContext already handles this
    // Just add debugging to see what data we have
    const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length;
    console.log('📊 FileUploadPage: Current data state:', {
      voyageEventsCount: voyageEvents.length,
      vesselManifestsCount: vesselManifests.length,
      costAllocationCount: costAllocation.length,
      voyageListCount: voyageList.length,
      totalRecords: totalRecords,
      isDataReady,
      lastUpdated
    });
  }, [voyageEvents.length, vesselManifests.length, costAllocation.length, voyageList.length, isDataReady, lastUpdated]);
  
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const newLogEntry = {
      id: ++logIdCounter.current, // Increment counter for unique IDs
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    
    setProcessingLog(prev => {
      const updatedLog = [...prev.slice(-49), newLogEntry];
      
      // EMERGENCY: Disable localStorage saving for processing log to prevent QuotaExceededError
      console.log(`📝 Processing Log [${type.toUpperCase()}]: ${message}`);
      
      // Don't save to localStorage to prevent quota errors
      // This is a temporary emergency fix until storage is cleared
      return updatedLog;
    });
  };
  
  const processFiles = async (mode = 'initial') => {
    // Prevent concurrent processing
    if (isProcessingRef.current) {
      console.log('⚠️ Processing already in progress, ignoring request');
      addLog('Processing already in progress, please wait...', 'warning');
      return;
    }
    
    isProcessingRef.current = true;
    console.log('🚀 Starting file processing...', { mode, files });
    setProcessingState('processing');
    setIsLoading(true);
    addLog(`Starting ${mode} data processing...`);
    
    try {
      console.log('📁 Files to process:', {
        voyageEvents: files.voyageEvents?.name,
        voyageList: files.voyageList?.name,
        vesselManifests: files.vesselManifests?.name,
        costAllocation: files.costAllocation?.name
      });
      
      // Process Excel files using existing utility
      console.log('🔄 Calling processExcelFiles...');
      const dataStoreResult = await processExcelFiles({
        voyageEventsFile: files.voyageEvents,
        voyageListFile: files.voyageList,
        vesselManifestsFile: files.vesselManifests,
        costAllocationFile: files.costAllocation,
        vesselClassificationsFile: null,
        bulkActionsFile: files.bulkActions,
        useMockData: false
      });
      console.log('✅ processExcelFiles completed:', dataStoreResult);
      
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
        // Replace all data - clear existing first to prevent accumulation
        addLog('🧹 Clearing existing data for initial load...', 'info');
        
        const totalRecords = Object.values(newData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
        const estimatedSizeMB = (JSON.stringify(newData).length / 1024 / 1024).toFixed(2);
        addLog(`📊 Data processed: ${totalRecords} records, estimated size: ${estimatedSizeMB}MB`, 'info');
        
        // Only update context to avoid double storage
        addLog('💾 Saving data to context...', 'info');
        setVoyageEvents(newData.voyageEvents);
        setVesselManifests(newData.vesselManifests);
        setMasterFacilities(newData.masterFacilities);
        setCostAllocation(newData.costAllocation);
        setVoyageList(newData.voyageList);
        setVesselClassifications(newData.vesselClassifications);
        setBulkActions(newData.bulkActions);
        setIsDataReady(true);
        
        // Calculate date range for logging
        const dateRange = calculateDateRange(newData.voyageEvents, newData.costAllocation);
        
        console.log('✅ Data processing completed successfully!', { totalRecords, isDataReady: true });
        
        // Add detailed debugging information
        const uniqueVesselsFromEvents = new Set(newData.voyageEvents.map(e => e.vessel));
        const uniqueVesselsFromManifests = new Set(newData.vesselManifests.map(m => m.transporter));
        const uniqueVesselsFromVoyageList = new Set(newData.voyageList.map(v => v.vessel));
        
        // Additional data validation
        const eventsByYear = newData.voyageEvents.reduce((acc, e) => {
          const year = e.eventYear || new Date(e.eventDate).getFullYear();
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const manifestsByYear = newData.vesselManifests.reduce((acc, m) => {
          const year = m.year;
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const voyagesByYear = newData.voyageList.reduce((acc, v) => {
          const year = v.year;
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        // Check for potential duplicates or empty records
        const emptyVesselsInEvents = newData.voyageEvents.filter(e => !e.vessel || e.vessel.trim() === '').length;
        const emptyVesselsInManifests = newData.vesselManifests.filter(m => !m.transporter || m.transporter.trim() === '').length;
        const emptyVesselsInVoyageList = newData.voyageList.filter(v => !v.vessel || v.vessel.trim() === '').length;
        
        console.log('📊 Data Processing Complete - Detailed Analysis:', {
          voyageEvents: newData.voyageEvents.length,
          vesselManifests: newData.vesselManifests.length,
          voyageList: newData.voyageList.length,
          costAllocation: newData.costAllocation.length,
          masterFacilities: newData.masterFacilities.length,
          uniqueVesselsFromEvents: uniqueVesselsFromEvents.size,
          uniqueVesselsFromManifests: uniqueVesselsFromManifests.size,
          uniqueVesselsFromVoyageList: uniqueVesselsFromVoyageList.size,
          allVesselsFromEvents: Array.from(uniqueVesselsFromEvents).sort(),
          allVesselsFromManifests: Array.from(uniqueVesselsFromManifests).sort(),
          allVesselsFromVoyageList: Array.from(uniqueVesselsFromVoyageList).sort(),
          dateRange: dateRange,
          totalRecords,
          yearlyBreakdown: {
            events: eventsByYear,
            manifests: manifestsByYear,
            voyages: voyagesByYear
          },
          dataQuality: {
            emptyVesselsInEvents,
            emptyVesselsInManifests,
            emptyVesselsInVoyageList,
            eventDateRange: {
              earliest: newData.voyageEvents.length > 0 ? 
                new Date(Math.min(...newData.voyageEvents.map(e => e.eventDate.getTime()))).toISOString() : 'N/A',
              latest: newData.voyageEvents.length > 0 ? 
                new Date(Math.max(...newData.voyageEvents.map(e => e.eventDate.getTime()))).toISOString() : 'N/A'
            },
            manifestDateRange: {
              earliest: newData.vesselManifests.length > 0 ? 
                new Date(Math.min(...newData.vesselManifests.map(m => m.manifestDate.getTime()))).toISOString() : 'N/A',
              latest: newData.vesselManifests.length > 0 ? 
                new Date(Math.max(...newData.vesselManifests.map(m => m.manifestDate.getTime()))).toISOString() : 'N/A'
            }
          }
        });
        
        addLog(`Initial data load complete: ${totalRecords} records`, 'success');
        addLog(`Vessel Analysis: Events(${uniqueVesselsFromEvents.size}), Manifests(${uniqueVesselsFromManifests.size}), VoyageList(${uniqueVesselsFromVoyageList.size})`, 'info');
      } else {
        // Merge with existing data
        const mergedData = mergeDataSets(dataStore, newData);
        // setDataStore(mergedData);
        
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
      console.error('❌ File processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Processing failed: ${errorMessage}`, 'error');
      setProcessingState('error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false; // Reset processing flag
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
        dateRange: calculateDateRange(merged.voyageEvents || existing.voyageEvents, merged.costAllocation || existing.costAllocation),
        totalRecords,
        newRecords: newRecordsCount,
        dataVersion: existing.metadata.dataVersion
      }
    };
  };
  
  const calculateDateRange = (voyageEvents: VoyageEvent[], costAllocation: CostAllocation[] = []) => {
    const allDates: Date[] = [];
    
    // Add dates from voyage events
    if (voyageEvents.length > 0) {
      const voyageDates = voyageEvents.flatMap(event => [event.from, event.to]);
      allDates.push(...voyageDates);
    }
    
    // Add dates from cost allocation data
    if (costAllocation.length > 0) {
      const costDates = costAllocation
        .map(allocation => allocation.costAllocationDate)
        .filter((date): date is Date => date !== undefined);
      allDates.push(...costDates);
      
      // Also consider dates created from year/month if costAllocationDate is not available
      costAllocation.forEach(allocation => {
        if (!allocation.costAllocationDate && allocation.year && allocation.month) {
          allDates.push(new Date(allocation.year, allocation.month - 1, 1));
        }
      });
    }
    
    if (allDates.length === 0) {
      return { start: null, end: null };
    }
    
    return {
      start: new Date(Math.min(...allDates.map(d => d.getTime()))),
      end: new Date(Math.max(...allDates.map(d => d.getTime())))
    };
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
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        // Validate file before adding
        if (selectedFile.size > 50 * 1024 * 1024) {
          addLog(`File ${selectedFile.name} is too large (${Math.round(selectedFile.size / 1024 / 1024)}MB). Maximum size is 50MB.`, 'error');
          return;
        }
        
        if (!selectedFile.name.toLowerCase().endsWith('.xlsx') && !selectedFile.name.toLowerCase().endsWith('.xls')) {
          addLog(`File ${selectedFile.name} must be an Excel file (.xlsx or .xls)`, 'error');
          return;
        }

        // Check if file is readable
        try {
          addLog(`Validating file ${selectedFile.name}...`, 'info');
          
          // Try to read first few bytes to check if file is accessible
          const testSlice = selectedFile.slice(0, 1024);
          const testBuffer = await testSlice.arrayBuffer();
          
          if (testBuffer.byteLength === 0) {
            addLog(`File ${selectedFile.name} appears to be empty or corrupted`, 'error');
            return;
          }

          // Check Excel file signature
          const uint8Array = new Uint8Array(testBuffer);
          const isValidExcel = (
            // XLSX signature (ZIP format)
            (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) ||
            // XLS signature
            (uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF && uint8Array[2] === 0x11 && uint8Array[3] === 0xE0)
          );

          if (!isValidExcel) {
            addLog(`File ${selectedFile.name} does not appear to be a valid Excel file`, 'warning');
          }

          // Check for Safari/WebKit file size issues
          if (selectedFile.size > 2 * 1024 * 1024) { // 2MB threshold
            addLog(`Large file detected (${Math.round(selectedFile.size / 1024 / 1024)}MB). Safari may have issues with files >2MB. Consider using Chrome/Firefox or splitting the data.`, 'warning');
          }
          
          addLog(`File ${selectedFile.name} validated successfully (${Math.round(selectedFile.size / 1024)}KB)`, 'success');
          setFiles(prev => ({ ...prev, [fileType]: selectedFile }));
          
        } catch (error) {
          addLog(`Failed to validate file ${selectedFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
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
            <label className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 cursor-pointer text-sm transition-all duration-200 shadow-md">
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
  
  
  const ProcessingLog = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Processing Log</h3>
        </div>
        <button
          onClick={() => {
            setProcessingLog([]);
            localStorage.removeItem('bp-logistics-processing-log');
          }}
          className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Clear Log
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-4">
        {processingLog.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No processing activity yet</p>
        ) : (
          processingLog.map((log, index) => (
            <div key={`${log.id}-${index}`} className="flex items-start gap-3 text-sm p-2 hover:bg-white rounded transition-colors">
              <span className="text-gray-500 font-mono text-xs mt-0.5 min-w-[80px]">
                {log.timestamp}
              </span>
              <span className={`flex-1 ${
                log.type === 'success' ? 'text-green-700' :
                log.type === 'error' ? 'text-red-700' :
                log.type === 'warning' ? 'text-yellow-700' :
                'text-gray-700'
              }`}>
                {log.type === 'success' && '✓ '}
                {log.type === 'error' && '✗ '}
                {log.type === 'warning' && '⚠ '}
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const hasRequiredFiles = files.voyageEvents && files.costAllocation;
  
  console.log('🔍 File validation:', {
    voyageEvents: !!files.voyageEvents,
    costAllocation: !!files.costAllocation,
    voyageList: !!files.voyageList,
    hasRequiredFiles
  });
  
  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This will clear the dashboard and return to upload mode.')) {
      clearAllData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gray-900 relative z-20">
        {/* Top Bar */}
        <div className="border-b border-gray-800">
          <div className="max-w-screen-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section - Logo & Title */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">bp</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Logistics Analytics</h1>
                    <p className="text-xs text-gray-400">Data Upload & Management</p>
                  </div>
                </div>
              </div>

              {/* Right Section - Date/Time & Notifications */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock size={16} />
                  <span className="text-sm">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • 
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <Bell size={18} className="text-gray-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-gray-850 border-b border-gray-800">
          <div className="max-w-screen-2xl mx-auto px-6">
            <nav className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Navigation Items */}
                <button
                  onClick={onNavigateToDrilling}
                  className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all duration-200"
                >
                  <Factory size={20} />
                  <span className="font-medium">Drilling</span>
                </button>

                <button
                  onClick={onNavigateToProduction}
                  className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all duration-200"
                >
                  <BarChart2 size={20} />
                  <span className="font-medium">Production</span>
                </button>

                <button
                  onClick={onNavigateToComparison}
                  className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all duration-200"
                >
                  <GitBranch size={20} />
                  <span className="font-medium">Comparison</span>
                </button>

                <button
                  onClick={onNavigateToVoyage}
                  className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all duration-200"
                >
                  <Ship size={20} />
                  <span className="font-medium">Voyage</span>
                </button>

                <button
                  onClick={onNavigateToCost}
                  className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all duration-200"
                >
                  <DollarSign size={20} />
                  <span className="font-medium">Cost</span>
                </button>

                <button
                  onClick={onNavigateToBulk}
                  className="flex items-center gap-3 px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all duration-200"
                >
                  <Package size={20} />
                  <span className="font-medium">Bulk Actions</span>
                </button>

                <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-green-500 text-white bg-gray-800/50">
                  <Upload size={20} />
                  <span className="font-medium">Data Upload</span>
                </div>
              </div>

              {/* Right Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigateHome}
                  className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-all duration-200"
                >
                  <Home size={16} />
                  <span className="text-sm font-medium">Home</span>
                </button>
                <button
                  onClick={handleResetData}
                  className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-all duration-200"
                >
                  <Settings2 size={16} />
                  <span className="text-sm font-medium">Reset Data</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Upload & Management</h1>
              <p className="text-gray-600">Upload and manage your offshore logistics data with incremental updates</p>
            </div>
            <div className="flex items-center gap-3">
              {dataStore.metadata.totalRecords > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">
                      {dataStore.metadata.totalRecords.toLocaleString()} records loaded
                    </span>
                  </div>
                  {lastUpdated && (
                    <p className="text-xs text-green-600 mt-1">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      
      {/* Mode Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setUploadMode('initial')}
            className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
              uploadMode === 'initial' 
                ? 'border-green-500 bg-green-50 shadow-sm' 
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
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
            className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
              uploadMode === 'incremental' 
                ? 'border-green-500 bg-green-50 shadow-sm' 
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {uploadMode === 'initial' ? 'Upload Initial Data Files' : 'Upload Monthly Update Files'}
        </h3>
        <div className="space-y-4">
          <FileUploadZone label="Voyage Events" fileType="voyageEvents" required />
          <FileUploadZone label="Cost Allocation" fileType="costAllocation" required />
          <FileUploadZone label="Voyage List" fileType="voyageList" />
          <FileUploadZone label="Vessel Manifests" fileType="vesselManifests" />
          <FileUploadZone label="Bulk Actions" fileType="bulkActions" />
        </div>
        
        <div className="mt-6 flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => processFiles(uploadMode)}
            disabled={processingState === 'processing' || !hasRequiredFiles}
            className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-200 ${
              processingState === 'processing' || !hasRequiredFiles
                ? 'bg-gray-300/80 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-lg'
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
        
        {processingState === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <h4 className="font-semibold text-red-800 mb-2">Storage or File Processing Issue Detected</h4>
            <div className="text-sm text-red-700 space-y-2">
              
              {/* Check for storage quota issues */}
              {(() => {
                const lastLogEntry = processingLog[processingLog.length - 1];
                const isStorageIssue = lastLogEntry?.message?.includes('quota') || 
                                     lastLogEntry?.message?.includes('QuotaExceededError') ||
                                     lastLogEntry?.message?.includes('Storage');
                
                if (isStorageIssue) {
                  return (
                    <>
                      <p className="font-medium">💾 Browser Storage Full</p>
                      <div className="bg-red-100 p-3 rounded border-l-4 border-red-400">
                        <p className="font-medium mb-1">Storage Solutions:</p>
                        <p>• <strong>Export your data</strong> using the "Export" button above</p>
                        <p>• <strong>Clear browser data</strong> - go to browser settings and clear storage</p>
                        <p>• <strong>Use Private/Incognito mode</strong> for a fresh start</p>
                        <p>• <strong>Try a different browser</strong> - some have larger storage limits</p>
                        <p>• <strong>Use smaller data files</strong> - split large datasets</p>
                      </div>
                      <div className="text-xs text-red-600 mt-2">
                        <p>Browser storage limit reached (~5-10MB). The system tried compression and chunking but storage is critically full.</p>
                      </div>
                    </>
                  );
                } else {
                  return (
                    <>
                      <p className="font-medium">🚨 Known Safari/WebKit Bug with large files ({'>'}2MB)</p>
                      <div className="bg-red-100 p-3 rounded border-l-4 border-red-400">
                        <p className="font-medium mb-1">Recommended Solutions:</p>
                        <p>• <strong>Use Chrome or Firefox</strong> - they handle large Excel files better</p>
                        <p>• <strong>Split your data</strong> into smaller files (under 2MB each)</p>
                        <p>• <strong>Save as new .xlsx</strong> in Excel to reduce file size</p>
                      </div>
                      <div className="text-xs text-red-600 mt-2">
                        <p>This is a known WebKit bug (#272600) affecting Safari's File API with large files.</p>
                      </div>
                    </>
                  );
                }
              })()}
            </div>
          </div>
        )}
      </div>
      
      {/* Processing Log Only */}
      <div className="w-full">
        <ProcessingLog />
      </div>
      
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200/50 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <span>© 2024 BP p.l.c.</span>
              <span className="text-gray-400">•</span>
              <span>Offshore Logistics Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DataManagementSystem;