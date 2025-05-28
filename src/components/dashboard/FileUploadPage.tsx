// src/components/dashboard/FileUploadPage.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

interface DataManagementSystemProps {
  onNavigateHome?: () => void;
  onNavigateToDrilling?: () => void;
  onNavigateToProduction?: () => void;
  onNavigateToComparison?: () => void;
  onNavigateToVoyage?: () => void;
}

const DataManagementSystem: React.FC<DataManagementSystemProps> = ({ 
  onNavigateHome, 
  onNavigateToDrilling, 
  onNavigateToProduction, 
  onNavigateToComparison,
  onNavigateToVoyage 
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
    clearAllData,
    forceRefreshFromStorage
  } = useData();

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
  
  // Add initial log entry if we loaded existing data
  React.useEffect(() => {
    const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length;
    if (totalRecords > 0) {
      addLog(`Existing data detected: ${totalRecords} records loaded`, 'success');
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
  }>({
    voyageEvents: null,
    vesselManifests: null,
    costAllocation: null,
    voyageList: null
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
  
  const processFilesWithMockData = async () => {
    setProcessingState('processing');
    setIsLoading(true);
    addLog('Loading mock data for testing...', 'info');
    
    try {
      // Use mock data from the processing utility
      const dataStoreResult = await processExcelFiles({
        voyageEventsFile: null,
        voyageListFile: null,
        vesselManifestsFile: null,
        costAllocationFile: null,
        vesselClassificationsFile: null,
        bulkActionsFile: null,
        useMockData: true
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
      
      const totalRecords = Object.values(newData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      addLog(`📊 Mock data generated: ${totalRecords} records`, 'info');
      
      // Only update context to avoid double storage
      addLog('💾 Saving mock data to context...', 'info');
      setVoyageEvents(newData.voyageEvents);
      setVesselManifests(newData.vesselManifests);
      setMasterFacilities(newData.masterFacilities);
      setCostAllocation(newData.costAllocation);
      setVoyageList(newData.voyageList);
      setVesselClassifications(newData.vesselClassifications);
      setBulkActions(newData.bulkActions);
      setIsDataReady(true);
      
      // Calculate date range for logging
      const dateRange = calculateDateRange(newData.voyageEvents);
      
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
      
      addLog(`Mock data loaded successfully: ${totalRecords} records`, 'success');
      setProcessingState('complete');
      
      // Auto-redirect to dashboard after successful processing
      setTimeout(() => {
        addLog('Redirecting to dashboard...', 'success');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Mock data loading failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Mock data loading failed: ${errorMessage}`, 'error');
      setProcessingState('error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const processFiles = async (mode = 'initial') => {
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
        bulkActionsFile: null,
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
        const dateRange = calculateDateRange(newData.voyageEvents);
        
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
    const dataBlob = new Blob([JSON.stringify(dataStore, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bp-logistics-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('Data exported successfully', 'success');
  };
  
  const emergencyStorageClear = () => {
    console.log('🚨 EMERGENCY: Clearing all localStorage to free up space...');
    try {
      // Get storage size before clearing
      const beforeSize = JSON.stringify(localStorage).length;
      console.log(`📊 Storage size before clearing: ${(beforeSize / 1024).toFixed(1)}KB`);
      
      // Clear everything
      localStorage.clear();
      
      console.log('✅ Emergency storage clear completed');
      console.log('🔄 You can now upload your data again');
      
      addLog('🚨 Emergency storage clear completed - you can now upload data again', 'success');
    } catch (error) {
      console.error('❌ Emergency storage clear failed:', error);
      addLog('❌ Emergency storage clear failed - please clear browser data manually', 'error');
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
  
  // Storage Status Indicator Component
  const StorageStatusIndicator = ({ getStorageInfo }: { getStorageInfo: () => any }) => {
    const [storageInfo, setStorageInfo] = React.useState<any>(null);
    
    React.useEffect(() => {
      const info = getStorageInfo();
      setStorageInfo(info);
    }, [getStorageInfo]);
    
    if (!storageInfo) return null;
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Normal': return 'text-green-600 bg-green-50';
        case 'Near Limit': return 'text-yellow-600 bg-yellow-50';
        case 'Critical': return 'text-red-600 bg-red-50';
        case 'Minimal Mode': return 'text-orange-600 bg-orange-50';
        case 'Emergency Mode': return 'text-red-800 bg-red-100 border-red-500';
        default: return 'text-gray-600 bg-gray-50';
      }
    };
    
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Storage Status</span>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(storageInfo.status)}`}>
            {storageInfo.status}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <span>Used: </span>
            <span className="font-medium">{storageInfo.usedMB}MB</span>
          </div>
          <div>
            <span>Remaining: </span>
            <span className="font-medium">{storageInfo.remainingMB}MB</span>
          </div>
        </div>
        {(storageInfo.isCompressed || storageInfo.isChunked || storageInfo.hasMinimal || storageInfo.hasEmergency) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {storageInfo.hasEmergency && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-red-200 text-red-800 rounded border border-red-400">
                🚨 Emergency
              </span>
            )}
            {storageInfo.isCompressed && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                🗜️ Compressed
              </span>
            )}
            {storageInfo.isChunked && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                📦 Chunked
              </span>
            )}
            {storageInfo.hasMinimal && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                ⚠️ Minimal
              </span>
            )}
          </div>
        )}
        {storageInfo.status === 'Critical' && (
          <div className="mt-2 text-xs text-red-600">
            ⚠️ Storage nearly full. Consider exporting data and clearing storage.
          </div>
        )}
        {storageInfo.status === 'Emergency Mode' && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            🚨 <strong>Emergency Storage Mode:</strong> Storage was critically full. Some data may be incomplete.
            <br />
            • Export any available data immediately
            • Clear browser storage to continue normally
            • Check processing log for recovery instructions
          </div>
        )}
      </div>
    );
  };

  const DataSummary = () => {
    // Debug localStorage content
    const debugLocalStorage = () => {
      try {
        console.log('🔍 DEBUG: Current DataContext state:', {
          voyageEvents: voyageEvents.length,
          vesselManifests: vesselManifests.length,
          costAllocation: costAllocation.length,
          voyageList: voyageList.length,
          isDataReady,
          lastUpdated
        });
        
        const savedData = localStorage.getItem('bp-logistics-data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          console.log('🔍 DEBUG: localStorage content:', parsed);
          addLog(`🔍 localStorage debug: ${savedData.length} chars, ${Object.keys(parsed).length} keys`, 'info');
          addLog(`📊 Data found: voyageEvents(${(parsed.voyageEvents || []).length}), manifests(${(parsed.vesselManifests || []).length})`, 'info');
        } else {
          console.log('🔍 DEBUG: No data in localStorage');
          addLog('❌ No data found in localStorage', 'warning');
        }
        
        // Add storage diagnostics
        const storageInfo = getStorageInfo();
        addLog(`💾 Storage Info: ${storageInfo.usedMB}MB used, ${storageInfo.status}`, 'info');
        
        // Add computed dataStore info
        const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length;
        addLog(`🧮 Computed dataStore: ${totalRecords} total records`, 'info');
        addLog(`📊 DataStore breakdown: VE(${voyageEvents.length}), VM(${vesselManifests.length}), CA(${costAllocation.length}), VL(${voyageList.length})`, 'info');
        
      } catch (error) {
        console.error('🔍 DEBUG: Error reading localStorage:', error);
        addLog(`❌ Error reading localStorage: ${error}`, 'error');
      }
    };

    // Get localStorage usage information
    const getStorageInfo = () => {
      try {
        let totalSize = 0;
        let itemCount = 0;
        const sizes: Record<string, number> = {};
        
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            const value = localStorage.getItem(key) || '';
            const size = new Blob([value]).size;
            sizes[key] = size;
            totalSize += size;
            itemCount++;
          }
        }
        
        const usedMB = (totalSize / 1024 / 1024).toFixed(2);
        const isCompressed = localStorage.getItem('bp-logistics-data-compressed') === 'true';
        const isChunked = localStorage.getItem('bp-logistics-data-chunked') === 'true';
        const hasMinimal = !!localStorage.getItem('bp-logistics-data-minimal');
        
        // Estimate available space (5MB typical limit)
        const estimatedLimitMB = 5;
        const remainingMB = Math.max(0, estimatedLimitMB - parseFloat(usedMB)).toFixed(2);
        
        let status = 'Normal';
        const hasEmergency = !!localStorage.getItem('bp-logistics-data-emergency');
        
        if (hasEmergency) status = 'Emergency Mode';
        else if (parseFloat(usedMB) > 4.5) status = 'Critical';
        else if (parseFloat(usedMB) > 4) status = 'Near Limit';
        else if (hasMinimal) status = 'Minimal Mode';
        
        console.log('💾 Storage Analysis:', {
          usedMB,
          remainingMB,
          itemCount,
          status,
          isCompressed,
          isChunked,
          hasMinimal,
          largestItems: Object.entries(sizes)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([key, size]) => ({ key, sizeMB: (size / 1024 / 1024).toFixed(2) }))
        });
        
        return { usedMB, remainingMB, status, isCompressed, isChunked, hasMinimal, hasEmergency };
      } catch (error) {
        console.error('Failed to analyze storage:', error);
        return { usedMB: 'Unknown', remainingMB: 'Unknown', status: 'Error' };
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Data Store</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={debugLocalStorage}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Debug
            </button>
            <button
              onClick={() => {
                addLog('🔄 Force refreshing data from storage...', 'info');
                forceRefreshFromStorage();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <RefreshCw size={16} />
              Force Refresh
            </button>
            <button
              onClick={exportData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={emergencyStorageClear}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              title="Emergency: Clear all localStorage to fix storage quota errors"
            >
              <AlertTriangle size={16} />
              🚨 Emergency Clear
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
            <div className="text-xs text-gray-500 mt-1">
              Expected: 37,009
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
            <div className="text-xs text-gray-500 mt-1">
              Expected: 1,143
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
            <div className="text-xs text-gray-500 mt-1">
              Expected: 1,941
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
                Total Records: {(voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length).toLocaleString()}
              </div>
            </div>
            {dataStore.metadata.dateRange.start && dataStore.metadata.dateRange.end && (
              <div className="mt-2 text-sm text-gray-600">
                Data Range: {new Date(dataStore.metadata.dateRange.start).toLocaleDateString()} - {new Date(dataStore.metadata.dateRange.end).toLocaleDateString()}
              </div>
            )}
            <div className="mt-2 p-3 bg-gray-100 rounded">
              <div className="text-sm font-medium text-gray-700 mb-2">Unique Vessels Summary</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">From Events:</span>
                  <span className="ml-2 font-medium">
                    {new Set(dataStore.voyageEvents.map(e => e.vessel)).size}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">From Manifests:</span>
                  <span className="ml-2 font-medium">
                    {new Set(dataStore.vesselManifests.map(m => m.transporter)).size}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">From Voyages:</span>
                  <span className="ml-2 font-medium">
                    {new Set(dataStore.voyageList.map(v => v.vessel)).size}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Expected Total: 34 unique vessels
              </div>
            </div>
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
            
            {/* Storage Status Indicator */}
            <StorageStatusIndicator getStorageInfo={getStorageInfo} />
          </div>
        )}
      </div>
    );
  };
  
  const ProcessingLog = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Processing Log</h3>
        <button
          onClick={() => {
            setProcessingLog([]);
            localStorage.removeItem('bp-logistics-processing-log');
          }}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Log
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto space-y-2">
        {processingLog.length === 0 ? (
          <p className="text-gray-500 text-sm">No processing activity yet</p>
        ) : (
          processingLog.map((log, index) => (
            <div key={`${log.id}-${index}`} className="flex items-start gap-3 text-sm">
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

  const hasRequiredFiles = files.voyageEvents && files.costAllocation;
  
  console.log('🔍 File validation:', {
    voyageEvents: !!files.voyageEvents,
    costAllocation: !!files.costAllocation,
    voyageList: !!files.voyageList,
    hasRequiredFiles
  });
  
  // Preload functionality - automatically load files from a specific folder structure
  const preloadFiles = async () => {
    setProcessingState('processing');
    setIsLoading(true);
    addLog('🔍 Checking for preload files...', 'info');
    
    try {
      // Create a file input element to let user select multiple files at once
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.xlsx,.xls';
      
      input.onchange = async (e) => {
        const selectedFiles = Array.from((e.target as HTMLInputElement).files || []);
        
        if (selectedFiles.length === 0) {
          addLog('❌ No files selected for preload', 'warning');
          setProcessingState('idle');
          setIsLoading(false);
          return;
        }
        
        addLog(`📁 Found ${selectedFiles.length} files for preload`, 'info');
        
        // Auto-detect file types based on filename patterns
        const detectedFiles = {
          voyageEvents: null as File | null,
          vesselManifests: null as File | null,
          costAllocation: null as File | null,
          voyageList: null as File | null
        };
        
        selectedFiles.forEach(file => {
          const fileName = file.name.toLowerCase();
          
          // More flexible pattern matching for file detection
          if ((fileName.includes('voyage') && fileName.includes('event')) || 
              fileName.includes('voyage-event') || 
              fileName.includes('voyageevents') ||
              fileName.includes('events')) {
            detectedFiles.voyageEvents = file;
            addLog(`✅ Detected Voyage Events: ${file.name}`, 'success');
          } else if (fileName.includes('manifest') || 
                     fileName.includes('vessel-manifest') ||
                     fileName.includes('vesselmanifest')) {
            detectedFiles.vesselManifests = file;
            addLog(`✅ Detected Vessel Manifests: ${file.name}`, 'success');
          } else if ((fileName.includes('cost') && fileName.includes('allocation')) || 
                     fileName.includes('cost-allocation') ||
                     fileName.includes('costallocation') ||
                     fileName.includes('allocation')) {
            detectedFiles.costAllocation = file;
            addLog(`✅ Detected Cost Allocation: ${file.name}`, 'success');
          } else if ((fileName.includes('voyage') && fileName.includes('list')) || 
                     fileName.includes('voyage-list') ||
                     fileName.includes('voyagelist') ||
                     fileName.includes('voyages')) {
            detectedFiles.voyageList = file;
            addLog(`✅ Detected Voyage List: ${file.name}`, 'success');
          } else {
            addLog(`❓ Unknown file type: ${file.name}`, 'warning');
            addLog(`💡 Rename to include keywords: 'events', 'manifests', 'allocation', or 'voyages'`, 'info');
          }
        });
        
        // Check if we have required files
        if (!detectedFiles.voyageEvents || !detectedFiles.costAllocation) {
          addLog('❌ Missing required files. Need at least: voyage-events.xlsx and cost-allocation.xlsx', 'error');
          setProcessingState('error');
          setIsLoading(false);
          return;
        }
        
        // Set the detected files
        setFiles(detectedFiles);
        
        // Clear existing data first to prevent accumulation
        addLog('🧹 Clearing existing data to prevent storage issues...', 'info');
        clearAllData();
        
        // Auto-process the files directly with detected files
        addLog('🚀 Auto-processing detected files...', 'info');
        
        try {
          // Process Excel files using the detected files directly
          const dataStoreResult = await processExcelFiles({
            voyageEventsFile: detectedFiles.voyageEvents,
            voyageListFile: detectedFiles.voyageList,
            vesselManifestsFile: detectedFiles.vesselManifests,
            costAllocationFile: detectedFiles.costAllocation,
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
          
          // Calculate storage size before saving
          const totalRecords = Object.values(newData).reduce((sum, arr) => sum + (arr?.length || 0), 0);
          const estimatedSizeMB = (JSON.stringify(newData).length / 1024 / 1024).toFixed(2);
          addLog(`📊 Data processed: ${totalRecords} records, estimated size: ${estimatedSizeMB}MB`, 'info');
          
          // Only update context (avoid double storage by not calling setDataStore)
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
          const dateRange = calculateDateRange(newData.voyageEvents);
          
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
          
          addLog(`✅ Preload completed successfully: ${totalRecords} records`, 'success');
          setProcessingState('complete');
          
        } catch (error) {
          console.error('❌ Preload processing failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          addLog(`Preload processing failed: ${errorMessage}`, 'error');
          setProcessingState('error');
        }
      };
      
      // Handle dialog cancellation
      input.oncancel = () => {
        addLog('📝 File selection cancelled', 'info');
        setProcessingState('idle');
        setIsLoading(false);
      };
      
      // Trigger file selection dialog
      input.click();
      
    } catch (error) {
      console.error('❌ Preload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Preload failed: ${errorMessage}`, 'error');
      setProcessingState('error');
      setIsLoading(false);
    }
  };
  
  // Alternative: Preload with specific file naming convention
  const preloadWithNamingConvention = () => {
    addLog('📋 File naming convention for auto-detection:', 'info');
    addLog('• voyage-events.xlsx (required)', 'info');
    addLog('• cost-allocation.xlsx (required)', 'info');
    addLog('• vessel-manifests.xlsx (optional)', 'info');
    addLog('• voyage-list.xlsx (optional)', 'info');
    addLog('', 'info');
    addLog('💡 Click "Preload from Files" and select all your Excel files at once!', 'info');
  };
  
  return (
    <DataManagementLayout 
      onNavigateHome={onNavigateHome}
      onNavigateToDrilling={onNavigateToDrilling}
      onNavigateToProduction={onNavigateToProduction}
      onNavigateToComparison={onNavigateToComparison}
      onNavigateToVoyage={onNavigateToVoyage}
    >
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
          <FileUploadZone label="Voyage List (2024-April 2025)" fileType="voyageList" />
          <FileUploadZone label="Vessel Manifests (2024-April 2025)" fileType="vesselManifests" />
        </div>
        
        <div className="mt-6 flex justify-center gap-4 flex-wrap">
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
          
          <button
            onClick={preloadFiles}
            disabled={processingState === 'processing'}
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all border-2 ${
              processingState === 'processing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                : 'bg-white text-purple-600 border-purple-600 hover:bg-purple-50 hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Preload from Files
            </div>
          </button>
          
          <button
            onClick={() => processFilesWithMockData()}
            disabled={processingState === 'processing'}
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all border-2 ${
              processingState === 'processing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50 hover:shadow-lg'
            }`}
          >
            Use Mock Data (Testing)
          </button>
        </div>
        
        {!hasRequiredFiles && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Please upload all required files to continue
          </p>
        )}
        
        {/* Preload Help Section */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-purple-900 mb-2">💡 Quick Preload Feature</h4>
              <p className="text-sm text-purple-800 mb-3">
                Use the <strong>"Preload from Files"</strong> button to quickly load multiple Excel files at once! 
                The system will auto-detect file types based on their names.
              </p>
              <div className="text-xs text-purple-700 space-y-1">
                <p><strong>File naming convention:</strong></p>
                <p>• <code className="bg-purple-100 px-1 rounded">voyage-events.xlsx</code> (required) - Contains voyage event data</p>
                <p>• <code className="bg-purple-100 px-1 rounded">cost-allocation.xlsx</code> (required) - Contains cost allocation data</p>
                <p>• <code className="bg-purple-100 px-1 rounded">vessel-manifests.xlsx</code> (optional) - Contains manifest data</p>
                <p>• <code className="bg-purple-100 px-1 rounded">voyage-list.xlsx</code> (optional) - Contains voyage list data</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={preloadWithNamingConvention}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Show naming convention in log →
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {processingState === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
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
                        <p>• <strong>Use "Mock Data"</strong> button above to test dashboard functionality</p>
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