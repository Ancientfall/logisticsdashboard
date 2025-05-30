// src/context/DataContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  VoyageEvent, 
  VesselManifest, 
  MasterFacility, 
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction 
} from '../types';
import { DataStore } from '../types/dataModel';

// Add singleton pattern to prevent race conditions
let dataContextInstance: any = null;
let isInitializing = false;

interface DataContextType {
  // Main data arrays
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  
  // Data store (for compatibility with existing code)
  dataStore: DataStore | null;
  setDataStore: (dataStore: DataStore | null) => void;
  
  // Data state
  isDataReady: boolean;
  setIsDataReady: (isReady: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  error: string | null;
  
  // Setters for data
  setVoyageEvents: (data: VoyageEvent[]) => void;
  setVesselManifests: (data: VesselManifest[]) => void;
  setMasterFacilities: (data: MasterFacility[]) => void;
  setCostAllocation: (data: CostAllocation[]) => void;
  setVesselClassifications: (data: VesselClassification[]) => void;
  setVoyageList: (data: VoyageList[]) => void;
  setBulkActions: (data: BulkAction[]) => void;
  
  // Utility functions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAllData: () => void;
   
  // File upload tracking
  uploadedFiles: {
    voyageEvents: boolean;
    vesselManifests: boolean;
    masterFacilities: boolean;
    costAllocation: boolean;
    vesselClassifications: boolean;
    voyageList: boolean;
    bulkActions: boolean;
  };
  
  // New navigation functions for our enhanced UI
  resetToUpload: () => void;
  forceRefreshFromStorage: () => void;
  lastUpdated: Date | null;
}

const DataContext = createContext<DataContextType>({
  // Default values
  voyageEvents: [],
  vesselManifests: [],
  masterFacilities: [],
  costAllocation: [],
  vesselClassifications: [],
  voyageList: [],
  bulkActions: [],
  
  dataStore: null,
  setDataStore: () => {},
  
  isDataReady: false,
  setIsDataReady: () => {},
  isLoading: false,
  setIsLoading: () => {},
  error: null,
  
  setVoyageEvents: () => {},
  setVesselManifests: () => {},
  setMasterFacilities: () => {},
  setCostAllocation: () => {},
  setVesselClassifications: () => {},
  setVoyageList: () => {},
  setBulkActions: () => {},
  
  setLoading: () => {},
  setError: () => {},
  clearAllData: () => {},
  
  uploadedFiles: {
    voyageEvents: false,
    vesselManifests: false,
    masterFacilities: false,
    costAllocation: false,
    vesselClassifications: false,
    voyageList: false,
    bulkActions: false
  },
  
  resetToUpload: () => {},
  forceRefreshFromStorage: () => {},
  lastUpdated: null
});

export const useData = () => useContext(DataContext);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Generate unique instance ID for debugging
  const instanceId = React.useRef(Math.random().toString(36).substr(2, 9));
  
  // IMMEDIATE DEBUG: Check localStorage right at startup
  console.log(`🚀 DataProvider[${instanceId.current}] starting - immediate localStorage check...`);
  
  // Prevent multiple simultaneous initializations
  if (isInitializing) {
    console.log(`⏳ DataProvider[${instanceId.current}] waiting - another instance is initializing...`);
  } else {
    isInitializing = true;
    console.log(`🎯 DataProvider[${instanceId.current}] is the primary initializer`);
  }
  
  try {
    const immediateCheck = localStorage.getItem('bp-logistics-data');
    if (immediateCheck) {
      const parsed = JSON.parse(immediateCheck);
      console.log(`🎯 IMMEDIATE[${instanceId.current}]: Found data in localStorage:`, {
        hasMetadata: !!parsed.metadata,
        voyageEventsCount: (parsed.voyageEvents || []).length,
        vesselManifestsCount: (parsed.vesselManifests || []).length,
        totalRecords: parsed.metadata?.totalRecords || 0,
        dataKeys: Object.keys(parsed)
      });
    } else {
      console.log(`❌ IMMEDIATE[${instanceId.current}]: No bp-logistics-data found in localStorage`);
      // Check if there are ANY keys
      const allKeys = Object.keys(localStorage);
      console.log(`🗂️ IMMEDIATE[${instanceId.current}]: All localStorage keys:`, allKeys.slice(0, 10));
    }
  } catch (error) {
    console.error(`❌ IMMEDIATE[${instanceId.current}]: Error checking localStorage:`, error);
  }

  // Enhanced data loading with better validation
  const loadStoredData = () => {
    console.log(`🔍 DataContext[${instanceId.current}] starting - loadStoredData() called - checking localStorage...`);
    
    try {
      // First, let's see what's actually in localStorage
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('bp-logistics'));
      console.log(`🗂️ All bp-logistics keys in localStorage[${instanceId.current}]:`, allKeys);
      
      if (allKeys.length > 0) {
        allKeys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            const sizeKB = Math.round(value.length / 1024);
            console.log(`📋[${instanceId.current}] ${key}: ${sizeKB}KB`);
            if (key === 'bp-logistics-data') {
              try {
                const parsed = JSON.parse(value);
                console.log(`📊[${instanceId.current}] Data structure preview:`, {
                  hasMetadata: !!parsed.metadata,
                  voyageEventsCount: (parsed.voyageEvents || []).length,
                  vesselManifestsCount: (parsed.vesselManifests || []).length,
                  costAllocationCount: (parsed.costAllocation || []).length,
                  voyageListCount: (parsed.voyageList || []).length,
                  totalRecords: parsed.metadata?.totalRecords || 0
                });
                
                // More detailed analysis
                if (parsed.costAllocation && Array.isArray(parsed.costAllocation)) {
                  const sampleRecord = parsed.costAllocation[0];
                  console.log(`🔍[${instanceId.current}] First cost allocation record structure:`, sampleRecord);
                  
                  // Check for meaningful data
                  const recordsWithValues = parsed.costAllocation.filter((record: any) => 
                    (record.totalAllocatedDays && record.totalAllocatedDays > 0) ||
                    (record.budgetedVesselCost && record.budgetedVesselCost > 0) ||
                    (record.totalCost && record.totalCost > 0)
                  );
                  console.log(`💰[${instanceId.current}] Records with meaningful cost data: ${recordsWithValues.length}/${parsed.costAllocation.length}`);
                  
                  // Check date distribution
                  const uniqueDates = [...new Set(parsed.costAllocation.map((r: any) => r.monthYear).filter(Boolean))];
                  console.log(`📅[${instanceId.current}] Date distribution:`, uniqueDates.slice(0, 10));
                  
                  // Check year distribution
                  const uniqueYears = [...new Set(parsed.costAllocation.map((r: any) => r.year).filter(Boolean))];
                  console.log(`📆[${instanceId.current}] Year distribution:`, uniqueYears);
                } else {
                  console.error(`❌[${instanceId.current}] NO COST ALLOCATION DATA FOUND!`);
                }
                
                // EMERGENCY DEBUG: Log the actual structure keys
                console.log(`🚨[${instanceId.current}] EMERGENCY - Raw localStorage structure:`, {
                  allKeys: Object.keys(parsed),
                  voyageEventsType: typeof parsed.voyageEvents,
                  voyageEventsArray: Array.isArray(parsed.voyageEvents),
                  firstVoyageEvent: parsed.voyageEvents?.[0],
                  actualStringLength: value.length,
                  actualSizeBytes: new Blob([value]).size
                });
                
                // CRITICAL FIX: Validate that voyage events actually contain data
                if (parsed.voyageEvents && Array.isArray(parsed.voyageEvents) && parsed.voyageEvents.length > 0) {
                  const firstEvent = parsed.voyageEvents[0];
                  console.log(`✅[${instanceId.current}] First voyage event validation:`, {
                    hasId: !!firstEvent.id,
                    hasVessel: !!firstEvent.vessel,
                    hasEventDate: !!firstEvent.eventDate,
                    sample: firstEvent
                  });
                  
                  if (!firstEvent.vessel || !firstEvent.eventDate) {
                    console.warn(`⚠️[${instanceId.current}] Voyage events exist but appear corrupted - missing vessel or date`);
                  }
                } else {
                  console.warn(`❌[${instanceId.current}] No valid voyage events array found in stored data`);
                }
              } catch (e) {
                console.warn(`❌[${instanceId.current}] Failed to parse bp-logistics-data:`, e);
              }
            }
          }
        });
      } else {
        console.log(`❌[${instanceId.current}] No bp-logistics keys found in localStorage`);
      }
      
      // Check for emergency data first (critical storage failure case)
      const emergencyData = localStorage.getItem('bp-logistics-data-emergency');
      if (emergencyData) {
        console.error(`🚨 Loading emergency data - storage was critically full`);
        const parsed = JSON.parse(emergencyData);
        
        // Try to load any chunked data that was successfully saved
        let partialData = {
          voyageEvents: [],
          vesselManifests: [],
          masterFacilities: [],
          costAllocation: [],
          vesselClassifications: [],
          voyageList: [],
          bulkActions: []
        };
        
        // Attempt to load partial chunked data if available
        if (parsed.savedData) {
          try {
            const chunkedResult = loadChunkedData();
            if (chunkedResult) {
              partialData = {
                voyageEvents: chunkedResult.voyageEvents || [],
                vesselManifests: chunkedResult.vesselManifests || [],
                masterFacilities: chunkedResult.masterFacilities || [],
                costAllocation: chunkedResult.costAllocation || [],
                vesselClassifications: chunkedResult.vesselClassifications || [],
                voyageList: chunkedResult.voyageList || [],
                bulkActions: chunkedResult.bulkActions || []
              };
              console.log(`✅[${instanceId.current}] Recovered partial data from chunks:`, {
                voyageEvents: partialData.voyageEvents.length,
                vesselManifests: partialData.vesselManifests.length,
                voyageList: partialData.voyageList.length
              });
            }
          } catch (chunkError) {
            console.warn(`Failed to load partial chunked data:`, chunkError);
          }
        }
        
        return {
          hasData: Object.values(partialData).some(arr => arr.length > 0), // Has data if any array has items
          lastUpdated: parsed.metadata?.lastUpdated ? new Date(parsed.metadata.lastUpdated) : null,
          ...partialData,
          isEmergency: true,
          message: parsed.message,
          instructions: parsed.instructions,
          savedData: parsed.savedData
        };
      }
      
      // Check for minimal data (fallback case)
      const minimalData = localStorage.getItem('bp-logistics-data-minimal');
      if (minimalData && !localStorage.getItem('bp-logistics-data')) {
        console.warn(`⚠️ Loading minimal data due to storage constraints`);
        const parsed = JSON.parse(minimalData);
        return {
          hasData: true,
          lastUpdated: parsed.metadata?.lastUpdated ? new Date(parsed.metadata.lastUpdated) : null,
          voyageEvents: parsed.sampleData?.voyageEvents || [],
          vesselManifests: parsed.sampleData?.vesselManifests || [],
          masterFacilities: [],
          costAllocation: parsed.sampleData?.costAllocation || [],
          vesselClassifications: [],
          voyageList: [],
          bulkActions: [],
          isMinimal: true,
          counts: parsed.counts
        };
      }
      
      // Check if data is chunked
      const isChunked = localStorage.getItem('bp-logistics-data-chunked') === 'true';
      if (isChunked) {
        console.log(`📦 Loading chunked data from localStorage...`);
        return loadChunkedData();
      }
      
      // Check if data is compressed
      const isCompressed = localStorage.getItem('bp-logistics-data-compressed') === 'true';
      
      const storedData = localStorage.getItem('bp-logistics-data');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        
        console.log(`📁[${instanceId.current}] Loading stored data from localStorage:`, {
          format: parsed.metadata ? 'FileUploadPage' : 'DataContext',
          isCompressed,
          isChunked,
          totalRecords: parsed.metadata?.totalRecords || 0,
          hasMetadata: !!parsed.metadata,
          voyageEventsCount: (parsed.voyageEvents || []).length,
          vesselManifestsCount: (parsed.vesselManifests || []).length,
          voyageListCount: (parsed.voyageList || []).length
        });
        
        // ENHANCED VALIDATION: Multiple checks to ensure data integrity
        const voyageEventsArray = parsed.voyageEvents || [];
        const hasValidVoyageEvents = voyageEventsArray.length > 0;
        const hasMetadataRecords = parsed.metadata && parsed.metadata.totalRecords > 0;
        const hasDirectFlag = parsed.hasData === true;
        const hasAnyData = voyageEventsArray.length > 0 || 
                          (parsed.vesselManifests || []).length > 0 || 
                          (parsed.costAllocation || []).length > 0 || 
                          (parsed.voyageList || []).length > 0;
        
        // Additional data structure validation
        let isDataStructureValid = false;
        if (hasValidVoyageEvents) {
          const firstEvent = voyageEventsArray[0];
          isDataStructureValid = !!(firstEvent && firstEvent.vessel && firstEvent.eventDate);
        }
        
        const hasData = hasValidVoyageEvents && isDataStructureValid;
        const lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : 
                           (parsed.metadata && parsed.metadata.lastUpdated ? new Date(parsed.metadata.lastUpdated) : null);
        
        console.log(`🔍[${instanceId.current}] Data validation checks:`, {
          hasValidVoyageEvents,
          hasMetadataRecords,
          hasDirectFlag,
          hasAnyData,
          isDataStructureValid,
          finalHasData: hasData,
          voyageEventsCount: voyageEventsArray.length,
          vesselManifestsCount: (parsed.vesselManifests || []).length,
          costAllocationCount: (parsed.costAllocation || []).length,
          voyageListCount: (parsed.voyageList || []).length,
          metadataTotalRecords: parsed.metadata?.totalRecords || 0
        });
        
        // If we have data, store this instance as the authoritative one
        if (hasData) {
          dataContextInstance = {
            hasData,
            lastUpdated,
            voyageEvents: parsed.voyageEvents || [],
            vesselManifests: parsed.vesselManifests || [],
            masterFacilities: parsed.masterFacilities || [],
            costAllocation: parsed.costAllocation || [],
            vesselClassifications: parsed.vesselClassifications || [],
            voyageList: parsed.voyageList || [],
            bulkActions: parsed.bulkActions || []
          };
          console.log(`✅[${instanceId.current}] Stored authoritative data instance`);
        }
        
        return {
          hasData,
          lastUpdated,
          voyageEvents: parsed.voyageEvents || [],
          vesselManifests: parsed.vesselManifests || [],
          masterFacilities: parsed.masterFacilities || [],
          costAllocation: parsed.costAllocation || [],
          vesselClassifications: parsed.vesselClassifications || [],
          voyageList: parsed.voyageList || [],
          bulkActions: parsed.bulkActions || []
        };
      }
    } catch (error) {
      console.warn(`[${instanceId.current}] Failed to load stored data:`, error);
    }
    
    // If no local data found but we have an authoritative instance, use that
    if (dataContextInstance && dataContextInstance.hasData) {
      console.log(`🔄[${instanceId.current}] Using authoritative data instance:`, {
        voyageEventsCount: dataContextInstance.voyageEvents.length,
        hasData: dataContextInstance.hasData
      });
      return dataContextInstance;
    }
    
    return null;
  };
  
  // Load chunked data from localStorage
  const loadChunkedData = () => {
    try {
      const mainChunk = localStorage.getItem('bp-logistics-data');
      if (!mainChunk) return null;
      
      const parsed = JSON.parse(mainChunk);
      const reconstructedData: any = { ...parsed };
      
      // Reconstruct chunked arrays
      Object.keys(parsed).forEach(key => {
        if (parsed[key] && typeof parsed[key] === 'object' && parsed[key].chunked) {
          const { totalChunks, partial, originalLength, savedLength } = parsed[key];
          const fullArray: any[] = [];
          
          if (partial) {
            console.warn(`⚠️ ${key} has partial data: ${savedLength}/${originalLength} items due to storage constraints`);
          }
          
          for (let i = 0; i < totalChunks; i++) {
            const chunkKey = `bp-logistics-data-chunk-${key}-${i}`;
            const chunkData = localStorage.getItem(chunkKey);
            if (chunkData) {
              try {
                const chunkArray = JSON.parse(chunkData);
                fullArray.push(...chunkArray);
              } catch (error) {
                console.error(`Failed to parse chunk ${i} for ${key}:`, error);
              }
            } else {
              console.warn(`Missing chunk ${i} for ${key}`);
            }
          }
          
          reconstructedData[key] = fullArray;
          
          if (partial) {
            console.log(`📦 Reconstructed ${key}: ${fullArray.length} items from ${totalChunks} chunks (PARTIAL - ${savedLength}/${originalLength})`);
          } else {
            console.log(`📦 Reconstructed ${key}: ${fullArray.length} items from ${totalChunks} chunks`);
          }
        }
      });
      
      const hasData = reconstructedData.metadata && reconstructedData.metadata.totalRecords > 0;
      const lastUpdated = reconstructedData.metadata?.lastUpdated ? new Date(reconstructedData.metadata.lastUpdated) : null;
      
      console.log(`✅ Successfully loaded chunked data:`, {
        totalRecords: reconstructedData.metadata?.totalRecords || 0,
        voyageEventsCount: reconstructedData.voyageEvents?.length || 0,
        vesselManifestsCount: reconstructedData.vesselManifests?.length || 0
      });
      
      return {
        hasData,
        lastUpdated,
        voyageEvents: reconstructedData.voyageEvents || [],
        vesselManifests: reconstructedData.vesselManifests || [],
        masterFacilities: reconstructedData.masterFacilities || [],
        costAllocation: reconstructedData.costAllocation || [],
        vesselClassifications: reconstructedData.vesselClassifications || [],
        voyageList: reconstructedData.voyageList || [],
        bulkActions: reconstructedData.bulkActions || []
      };
    } catch (error) {
      console.error(`❌ Failed to load chunked data:`, error);
      return null;
    }
  };

  const storedData = loadStoredData();
  
  // Main data state - initialize with stored data if available
  const [voyageEvents, setVoyageEventsState] = useState<VoyageEvent[]>(storedData?.voyageEvents || []);
  const [vesselManifests, setVesselManifestsState] = useState<VesselManifest[]>(storedData?.vesselManifests || []);
  const [masterFacilities, setMasterFacilitiesState] = useState<MasterFacility[]>(storedData?.masterFacilities || []);
  const [costAllocation, setCostAllocationState] = useState<CostAllocation[]>(storedData?.costAllocation || []);
  const [vesselClassifications, setVesselClassificationsState] = useState<VesselClassification[]>(storedData?.vesselClassifications || []);
  const [voyageList, setVoyageListState] = useState<VoyageList[]>(storedData?.voyageList || []);
  const [bulkActions, setBulkActionsState] = useState<BulkAction[]>(storedData?.bulkActions || []);
  
  // Data store for compatibility with existing code
  const [dataStore, setDataStoreState] = useState<DataStore | null>(null);
  
  // Loading and error state
  const [isLoading, setIsLoadingState] = useState(false);
  const [isDataReady, setIsDataReadyState] = useState(storedData?.hasData || false);
  const [error, setErrorState] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(storedData?.lastUpdated || null);
  
  // Debug initial state
  console.log(`🔧 DataContext[${instanceId.current}] initialized with:`, {
    hasStoredData: !!storedData,
    isDataReady: storedData?.hasData || false,
    voyageEventsCount: storedData?.voyageEvents?.length || 0,
    vesselManifestsCount: storedData?.vesselManifests?.length || 0,
    costAllocationCount: storedData?.costAllocation?.length || 0,
    voyageListCount: storedData?.voyageList?.length || 0,
    lastUpdated: storedData?.lastUpdated,
    isEmergency: (storedData as any)?.isEmergency || false,
    isMinimal: (storedData as any)?.isMinimal || false
  });
  
  // Enhanced validation logic - check for any valid data, not just voyage events
  const hasVoyageEvents = storedData && storedData.voyageEvents && storedData.voyageEvents.length > 0;
  const hasCostAllocation = storedData && storedData.costAllocation && storedData.costAllocation.length > 0;
  const hasVesselManifests = storedData && storedData.vesselManifests && storedData.vesselManifests.length > 0;
  const hasAnyValidData = hasVoyageEvents || hasCostAllocation || hasVesselManifests;
  
  if (hasAnyValidData) {
    console.log(`✅ DataContext[${instanceId.current}]: Found valid data in localStorage`, {
      voyageEvents: storedData?.voyageEvents?.length || 0,
      costAllocation: storedData?.costAllocation?.length || 0,
      vesselManifests: storedData?.vesselManifests?.length || 0,
      voyageList: storedData?.voyageList?.length || 0
    });
    
    // Only log sample data if we have voyage events
    if (hasVoyageEvents) {
      console.log(`📊[${instanceId.current}] Sample voyage event:`, storedData.voyageEvents[0]);
      console.log(`🚢[${instanceId.current}] Unique vessels:`, [...new Set(storedData.voyageEvents.map((e: any) => e.vessel))].slice(0, 5));
    }
  } else {
    console.log(`❌ DataContext[${instanceId.current}]: No valid data found in localStorage (checked voyage events, cost allocation, and manifests)`);
  }
  
  // Mark initialization as complete
  React.useEffect(() => {
    isInitializing = false;
    console.log(`🏁 DataContext[${instanceId.current}] initialization completed`);
  }, []);
  
  // ENHANCED Auto-set isDataReady when we have voyage events - but only if not conflicting
  React.useEffect(() => {
    const hasVoyageEvents = voyageEvents.length > 0;
    const hasCostAllocation = costAllocation.length > 0;
    const hasAnyData = hasVoyageEvents || hasCostAllocation || vesselManifests.length > 0;
    
    console.log(`🎯[${instanceId.current}] Auto-checking data readiness:`, { 
      hasVoyageEvents, 
      hasCostAllocation,
      hasAnyData,
      voyageEventsCount: voyageEvents.length,
      costAllocationCount: costAllocation.length,
      currentIsDataReady: isDataReady,
      shouldUpdate: hasAnyData !== isDataReady,
      isLoading
    });
    
    // CRITICAL FIX: Only update isDataReady if this instance actually has data and we're confident about it
    if (hasAnyData && !isDataReady) {
      // Additional validation: ensure the data looks legitimate
      if (hasVoyageEvents) {
        const firstEvent = voyageEvents[0];
        if (firstEvent && firstEvent.vessel && firstEvent.eventDate) {
          console.log(`🔄[${instanceId.current}] Updating isDataReady from false to true (valid voyage events detected)`);
          setIsDataReadyState(true);
        } else {
          console.warn(`⚠️[${instanceId.current}] Voyage events exist but appear invalid - not setting isDataReady`);
        }
      } else if (hasCostAllocation) {
        const firstCost = costAllocation[0];
        if (firstCost && firstCost.lcNumber) {
          console.log(`🔄[${instanceId.current}] Updating isDataReady from false to true (valid cost allocation detected)`);
          setIsDataReadyState(true);
        } else {
          console.warn(`⚠️[${instanceId.current}] Cost allocation exists but appears invalid - not setting isDataReady`);
        }
      }
    } else if (!hasAnyData && isDataReady && !isLoading) {
      // Only set to false if we're absolutely sure there's no data and we're the authoritative instance
      if (!dataContextInstance || !dataContextInstance.hasData) {
        console.log(`🔄[${instanceId.current}] Updating isDataReady from true to false (confirmed no data)`);
        setIsDataReadyState(false);
      } else {
        console.log(`⏸️[${instanceId.current}] Not setting isDataReady to false - authoritative instance has data`);
      }
    }
  }, [voyageEvents, costAllocation, vesselManifests.length, isDataReady, isLoading]);
  
  // Auto-save data whenever main arrays change (DISABLED temporarily due to quota errors)
  React.useEffect(() => {
    if (voyageEvents.length > 0) {
      // Reduced logging to minimize storage impact
      if (voyageEvents.length < 100) { // Only log for small datasets
        console.log(`💾 Data changed (auto-save disabled due to storage quota):`, {
          voyageEvents: voyageEvents.length,
          vesselManifests: vesselManifests.length,
          costAllocation: costAllocation.length
        });
      }
      
      // EMERGENCY: Disable auto-save to prevent QuotaExceededError
      // User needs to clear storage first
      if (voyageEvents.length < 100) { // Only warn for small datasets to avoid spam
        console.warn(`⚠️ Auto-save disabled - storage quota exceeded. Please clear storage.`);
      }
    }
  }, [voyageEvents.length, vesselManifests.length, costAllocation.length, voyageList.length]);
  
  // Track which files have been uploaded
  const [uploadedFiles, setUploadedFiles] = useState({
    voyageEvents: storedData?.voyageEvents.length > 0 || false,
    vesselManifests: storedData?.vesselManifests.length > 0 || false,
    masterFacilities: storedData?.masterFacilities.length > 0 || false,
    costAllocation: storedData?.costAllocation.length > 0 || false,
    vesselClassifications: storedData?.vesselClassifications.length > 0 || false,
    voyageList: storedData?.voyageList.length > 0 || false,
    bulkActions: storedData?.bulkActions.length > 0 || false
  });

  // Save data to localStorage with size management and chunking
  const saveDataToStorage = (data: any) => {
    const timestamp = new Date().toISOString();
    console.log(`💾[${instanceId.current}] saveDataToStorage called at ${timestamp}:`, {
      hasVoyageEvents: !!(data.voyageEvents && data.voyageEvents.length > 0),
      voyageEventsCount: data.voyageEvents?.length || 0,
      vesselManifestsCount: data.vesselManifests?.length || 0,
      costAllocationCount: data.costAllocation?.length || 0,
      voyageListCount: data.voyageList?.length || 0,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    try {
      const totalRecords = Object.values(data).reduce((sum: number, arr) => sum + ((arr as any[])?.length || 0), 0);
      
      const dataWithMetadata = {
        ...data,
        metadata: {
          lastUpdated: new Date(),
          dateRange: { 
            start: data.voyageEvents && data.voyageEvents.length > 0 ? 
              new Date(Math.min(...data.voyageEvents.map((e: any) => new Date(e.eventDate).getTime()))) : null,
            end: data.voyageEvents && data.voyageEvents.length > 0 ? 
              new Date(Math.max(...data.voyageEvents.map((e: any) => new Date(e.eventDate).getTime()))) : null
          },
          totalRecords,
          dataVersion: '1.0'
        }
      };
      
      const dataString = JSON.stringify(dataWithMetadata);
      const dataSizeMB = (new Blob([dataString]).size / 1024 / 1024).toFixed(2);
      
      console.log(`💾[${instanceId.current}] Attempting to save to localStorage:`, {
        totalRecords,
        hasMetadata: true,
        voyageEventsCount: data.voyageEvents?.length || 0,
        dataSizeMB: `${dataSizeMB}MB`,
        stringLength: dataString.length
      });
      
      // Check if data is too large for localStorage (typical limit is 5-10MB)
      if (dataString.length > 4 * 1024 * 1024) { // 4MB threshold
        console.warn(`⚠️[${instanceId.current}] Data size is large, implementing storage strategy...`, { dataSizeMB });
        
        // Try to save with compressed format first
        const compressedData = compressDataForStorage(dataWithMetadata);
        const compressedString = JSON.stringify(compressedData);
        const compressedSizeMB = (new Blob([compressedString]).size / 1024 / 1024).toFixed(2);
        
        console.log(`🗜️[${instanceId.current}] Compressed data size:`, { 
          originalMB: dataSizeMB, 
          compressedMB: compressedSizeMB,
          compressionRatio: `${((1 - compressedString.length / dataString.length) * 100).toFixed(1)}%`
        });
        
        if (compressedString.length < 4.5 * 1024 * 1024) { // Still within reasonable limits
          localStorage.setItem('bp-logistics-data', compressedString);
          localStorage.setItem('bp-logistics-data-compressed', 'true');
          console.log(`✅[${instanceId.current}] Saved compressed data to localStorage`);
          
          // VERIFICATION: Immediately check if data was actually saved
          setTimeout(() => {
            const verification = localStorage.getItem('bp-logistics-data');
            if (verification) {
              const verifySize = Math.round(verification.length / 1024);
              console.log(`🔍[${instanceId.current}] VERIFICATION: Data persisted in localStorage, size: ${verifySize}KB`);
              try {
                const verifyParsed = JSON.parse(verification);
                console.log(`✅[${instanceId.current}] VERIFICATION: Data is parseable, voyage events: ${(verifyParsed.voyageEvents || []).length}`);
              } catch (e) {
                console.error(`❌[${instanceId.current}] VERIFICATION: Data exists but not parseable:`, e);
              }
            } else {
              console.error(`🚨[${instanceId.current}] VERIFICATION FAILED: Data was not saved to localStorage!`);
            }
          }, 100);
          
          // Update the authoritative instance
          dataContextInstance = {
            hasData: true,
            lastUpdated: new Date(),
            voyageEvents: data.voyageEvents || [],
            vesselManifests: data.vesselManifests || [],
            masterFacilities: data.masterFacilities || [],
            costAllocation: data.costAllocation || [],
            vesselClassifications: data.vesselClassifications || [],
            voyageList: data.voyageList || [],
            bulkActions: data.bulkActions || []
          };
          return;
        } else {
          // If still too large, implement chunked storage
          console.warn(`📦[${instanceId.current}] Data still too large, implementing chunked storage...`);
          saveDataInChunks(dataWithMetadata);
          return;
        }
      }
      
      // Normal save for smaller data
      localStorage.setItem('bp-logistics-data', dataString);
      localStorage.removeItem('bp-logistics-data-compressed'); // Remove compression flag if it exists
      localStorage.removeItem('bp-logistics-data-chunked'); // Remove chunked flag if it exists
      console.log(`✅[${instanceId.current}] Saved data to localStorage normally`);
      
      // VERIFICATION: Immediately check if data was actually saved
      setTimeout(() => {
        const verification = localStorage.getItem('bp-logistics-data');
        if (verification) {
          const verifySize = Math.round(verification.length / 1024);
          console.log(`🔍[${instanceId.current}] VERIFICATION: Data persisted in localStorage, size: ${verifySize}KB`);
          try {
            const verifyParsed = JSON.parse(verification);
            console.log(`✅[${instanceId.current}] VERIFICATION: Data is parseable, voyage events: ${(verifyParsed.voyageEvents || []).length}`);
          } catch (e) {
            console.error(`❌[${instanceId.current}] VERIFICATION: Data exists but not parseable:`, e);
          }
        } else {
          console.error(`🚨[${instanceId.current}] VERIFICATION FAILED: Data was not saved to localStorage!`);
        }
      }, 100);
      
      // Update the authoritative instance
      dataContextInstance = {
        hasData: true,
        lastUpdated: new Date(),
        voyageEvents: data.voyageEvents || [],
        vesselManifests: data.vesselManifests || [],
        masterFacilities: data.masterFacilities || [],
        costAllocation: data.costAllocation || [],
        vesselClassifications: data.vesselClassifications || [],
        voyageList: data.voyageList || [],
        bulkActions: data.bulkActions || []
      };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error(`💥[${instanceId.current}] localStorage quota exceeded! Implementing fallback strategy...`, error);
        handleQuotaExceeded(data);
      } else {
        console.warn(`[${instanceId.current}] Failed to save data to localStorage:`, error);
      }
    }
  };
  
  // Compress data by removing redundant fields and optimizing structure
  const compressDataForStorage = (data: any) => {
    const compressed = { ...data };
    
    // Compress voyage events (largest dataset typically)
    if (compressed.voyageEvents && Array.isArray(compressed.voyageEvents)) {
      compressed.voyageEvents = compressed.voyageEvents.map((event: any) => {
        // Keep only essential fields and compress common values
        const compressed = { ...event };
        
        // Remove null/undefined fields
        Object.keys(compressed).forEach(key => {
          if (compressed[key] === null || compressed[key] === undefined || compressed[key] === '') {
            delete compressed[key];
          }
        });
        
        return compressed;
      });
    }
    
    // Apply same compression to other arrays
    ['vesselManifests', 'costAllocation', 'masterFacilities', 'voyageList'].forEach(key => {
      if (compressed[key] && Array.isArray(compressed[key])) {
        compressed[key] = compressed[key].map((item: any) => {
          const compressedItem = { ...item };
          Object.keys(compressedItem).forEach(itemKey => {
            if (compressedItem[itemKey] === null || compressedItem[itemKey] === undefined || compressedItem[itemKey] === '') {
              delete compressedItem[itemKey];
            }
          });
          return compressedItem;
        });
      }
    });
    
    return compressed;
  };
  
  // Save data in chunks when it's too large
  const saveDataInChunks = (data: any) => {
    try {
      // Clear any existing chunks and free up space
      clearChunkedData();
      
      // Clear processing logs to free up more space
      localStorage.removeItem('bp-logistics-processing-log');
      
      const chunks: Record<string, any> = {};
      let maxChunkSize = 1024 * 1024; // Start with 1MB chunks (smaller)
      
      // Try progressively smaller chunk sizes if needed
      const chunkSizes = [1024 * 1024, 512 * 1024, 256 * 1024, 128 * 1024]; // 1MB, 512KB, 256KB, 128KB
      let chunkSizeIndex = 0;
      
      // Split each data array into chunks
      for (const key of Object.keys(data)) {
        if (key === 'metadata') {
          chunks[key] = data[key]; // Always keep metadata in main chunk
          continue;
        }
        
        if (Array.isArray(data[key]) && data[key].length > 0) {
          const arrayString = JSON.stringify(data[key]);
          
          if (arrayString.length > maxChunkSize) {
            console.log(`📦 Chunking ${key}: ${arrayString.length} bytes into chunks of max ${maxChunkSize} bytes`);
            
            // Calculate optimal items per chunk with safety margin
            let itemsPerChunk = Math.max(1, Math.floor(data[key].length * (maxChunkSize * 0.8) / arrayString.length));
            const totalChunks = Math.ceil(data[key].length / itemsPerChunk);
            
            let chunksSaved = 0;
            for (let i = 0; i < totalChunks; i++) {
              try {
                const chunkData = data[key].slice(i * itemsPerChunk, (i + 1) * itemsPerChunk);
                const chunkString = JSON.stringify(chunkData);
                
                // If chunk is still too large, reduce items per chunk
                if (chunkString.length > maxChunkSize && itemsPerChunk > 1) {
                  itemsPerChunk = Math.max(1, Math.floor(itemsPerChunk * 0.5));
                  console.warn(`⚠️ Reducing items per chunk to ${itemsPerChunk} for ${key}`);
                  // Recalculate with smaller chunk size
                  const newChunkData = data[key].slice(i * itemsPerChunk, (i + 1) * itemsPerChunk);
                  const newChunkString = JSON.stringify(newChunkData);
                  
                  const chunkKey = `bp-logistics-data-chunk-${key}-${i}`;
                  localStorage.setItem(chunkKey, newChunkString);
                  chunksSaved++;
                } else {
                  const chunkKey = `bp-logistics-data-chunk-${key}-${i}`;
                  localStorage.setItem(chunkKey, chunkString);
                  chunksSaved++;
                }
                
              } catch (chunkError: any) {
                if (chunkError.name === 'QuotaExceededError') {
                  console.error(`💥 Quota exceeded saving chunk ${i} for ${key}. Trying smaller chunks...`);
                  
                  // Try with next smaller chunk size
                  if (chunkSizeIndex < chunkSizes.length - 1) {
                    chunkSizeIndex++;
                    maxChunkSize = chunkSizes[chunkSizeIndex];
                    console.log(`🔄 Retrying with smaller chunk size: ${maxChunkSize} bytes`);
                    
                    // Clear chunks saved so far for this key and retry
                    for (let j = 0; j < i; j++) {
                      localStorage.removeItem(`bp-logistics-data-chunk-${key}-${j}`);
                    }
                    
                    // Restart chunking for this key with smaller size
                    itemsPerChunk = Math.max(1, Math.floor(data[key].length * (maxChunkSize * 0.7) / arrayString.length));
                    i = -1; // Will be incremented to 0 in next iteration
                    chunksSaved = 0;
                    continue;
                  } else {
                    // Even smallest chunks don't work, save what we can
                    console.error(`❌ Cannot save ${key} even with smallest chunks. Saving partial data...`);
                    const partialData = data[key].slice(0, i * itemsPerChunk);
                    chunks[key] = { 
                      chunked: true, 
                      totalChunks: chunksSaved, 
                      itemsPerChunk,
                      partial: true,
                      originalLength: data[key].length,
                      savedLength: partialData.length
                    };
                    break;
                  }
                } else {
                  throw chunkError;
                }
              }
            }
            
            if (chunksSaved === totalChunks) {
              chunks[key] = { chunked: true, totalChunks, itemsPerChunk };
              console.log(`✅ Successfully chunked ${key}: ${chunksSaved} chunks`);
            }
          } else {
            chunks[key] = data[key]; // Keep small arrays in main chunk
          }
        } else {
          chunks[key] = data[key]; // Keep non-arrays or empty arrays
        }
      }
      
      // Save main chunk info
      try {
        localStorage.setItem('bp-logistics-data', JSON.stringify(chunks));
        localStorage.setItem('bp-logistics-data-chunked', 'true');
        console.log('✅ Saved chunked data metadata successfully');
      } catch (metadataError: any) {
        if (metadataError.name === 'QuotaExceededError') {
          console.error('💥 Cannot even save metadata! Storage is critically full.');
          // Emergency fallback: save only the most essential info
          const emergencyData = {
            metadata: data.metadata,
            emergency: true,
            message: 'Storage critically full - partial data saved with chunking',
            savedData: {
              voyageEventsChunks: chunks.voyageEvents?.totalChunks || 0,
              vesselManifestsChunks: chunks.vesselManifests?.totalChunks || 0,
              voyageListChunks: chunks.voyageList?.totalChunks || 0,
              costAllocationChunks: chunks.costAllocation?.totalChunks || 0
            },
            instructions: [
              'Some data was successfully saved in chunks',
              'Export any available data using the Export button',
              'Clear browser storage in Settings > Storage',
              'Try using a different browser with larger storage limits',
              'Consider splitting your data into smaller files'
            ]
          };
          
          try {
            // Try to save emergency data without clearing everything first
            localStorage.setItem('bp-logistics-data-emergency', JSON.stringify(emergencyData));
            console.warn('🚨 Emergency: Saved emergency metadata with recovery instructions');
          } catch (emergencyError) {
            // Only clear if we can't even save emergency data
            try {
              localStorage.clear();
              localStorage.setItem('bp-logistics-data-emergency', JSON.stringify({
                emergency: true,
                message: 'Storage completely full - all data cleared',
                timestamp: new Date().toISOString()
              }));
              console.warn('🚨 Nuclear option: Cleared all localStorage due to complete storage failure');
            } catch (finalError) {
              console.error('💥 Complete storage failure - cannot save anything:', finalError);
            }
          }
          
          // Don't throw an error - handle gracefully
          console.warn('🚨 Storage critically full - operating in emergency mode');
          return; // Exit gracefully, emergency data is saved
        } else {
          throw metadataError;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to save chunked data:', error);
      // Last resort: save only metadata and essential counts
      saveMinimalData(data);
    }
  };
  
  // Clear all chunked data from localStorage
  const clearChunkedData = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('bp-logistics-data-chunk-')) {
        localStorage.removeItem(key);
      }
    });
  };
  
  // Handle quota exceeded error with progressive data reduction
  const handleQuotaExceeded = (data: any) => {
    console.warn('🚨 Implementing emergency storage cleanup...');
    
    try {
      // Clear other applications' data if possible (be conservative)
      // const oldDataSize = JSON.stringify(localStorage).length;
      
      // Clear our old chunks first
      clearChunkedData();
      
      // Clear processing logs
      localStorage.removeItem('bp-logistics-processing-log');
      
      // Try saving compressed version again
      const compressedData = compressDataForStorage(data);
      const compressedString = JSON.stringify(compressedData);
      
      if (compressedString.length < 3 * 1024 * 1024) { // 3MB limit
        localStorage.setItem('bp-logistics-data', compressedString);
        localStorage.setItem('bp-logistics-data-compressed', 'true');
        console.log('✅ Saved compressed data after cleanup');
      } else {
        // Save minimal essential data only
        saveMinimalData(data);
      }
    } catch (error) {
      console.error('❌ Emergency storage cleanup failed:', error);
      saveMinimalData(data);
    }
  };
  
  // Save only essential data when all else fails
  const saveMinimalData = (data: any) => {
    try {
      const minimalData = {
        metadata: data.metadata,
        counts: {
          voyageEvents: data.voyageEvents?.length || 0,
          vesselManifests: data.vesselManifests?.length || 0,
          costAllocation: data.costAllocation?.length || 0,
          voyageList: data.voyageList?.length || 0,
          masterFacilities: data.masterFacilities?.length || 0
        },
        sampleData: {
          // Keep first few items for reference
          voyageEvents: data.voyageEvents?.slice(0, 5) || [],
          vesselManifests: data.vesselManifests?.slice(0, 5) || [],
          costAllocation: data.costAllocation?.slice(0, 5) || []
        }
      };
      
      localStorage.setItem('bp-logistics-data-minimal', JSON.stringify(minimalData));
      localStorage.removeItem('bp-logistics-data'); // Remove full data
      console.warn('⚠️ Saved only minimal data due to storage constraints');
      console.log('💡 Recommendation: Use "Export Data" to save full dataset to file');
    } catch (error) {
      console.error('❌ Even minimal data save failed:', error);
      console.error('🚨 Browser storage is critically full - please clear browser data');
    }
  };
  
  // Update uploaded files tracking when data is set
  const setVoyageEvents = (data: VoyageEvent[]) => {
    setVoyageEventsState(data);
    setUploadedFiles(prev => ({ ...prev, voyageEvents: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  const setVesselManifests = (data: VesselManifest[]) => {
    setVesselManifestsState(data);
    setUploadedFiles(prev => ({ ...prev, vesselManifests: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  const setMasterFacilities = (data: MasterFacility[]) => {
    setMasterFacilitiesState(data);
    setUploadedFiles(prev => ({ ...prev, masterFacilities: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  const setCostAllocation = (data: CostAllocation[]) => {
    setCostAllocationState(data);
    setUploadedFiles(prev => ({ ...prev, costAllocation: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  const setVesselClassifications = (data: VesselClassification[]) => {
    setVesselClassificationsState(data);
    setUploadedFiles(prev => ({ ...prev, vesselClassifications: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  const setVoyageList = (data: VoyageList[]) => {
    setVoyageListState(data);
    setUploadedFiles(prev => ({ ...prev, voyageList: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  const setBulkActions = (data: BulkAction[]) => {
    setBulkActionsState(data);
    setUploadedFiles(prev => ({ ...prev, bulkActions: data.length > 0 }));
    setLastUpdated(new Date());
  };
  
  // Function wrappers for consistent API
  const setDataStore = (data: DataStore | null) => {
    setDataStoreState(data);
  };
  
  const setIsDataReady = (ready: boolean) => {
    console.log(`📊[${instanceId.current}] DataContext: setIsDataReady called with:`, ready, {
      voyageEventsCount: voyageEvents.length,
      vesselManifestsCount: vesselManifests.length,
      costAllocationCount: costAllocation.length
    });
    setIsDataReadyState(ready);
    if (ready) {
      console.log(`💾[${instanceId.current}] Saving data to localStorage...`, {
        voyageEvents: voyageEvents.length,
        vesselManifests: vesselManifests.length,
        costAllocation: costAllocation.length
      });
      // Save current data state to localStorage when data becomes ready
      saveDataToStorage({
        voyageEvents,
        vesselManifests,
        masterFacilities,
        costAllocation,
        vesselClassifications,
        voyageList,
        bulkActions
      });
    }
  };
  
  const setIsLoading = (loading: boolean) => {
    setIsLoadingState(loading);
  };
  
  const setError = (err: string | null) => {
    setErrorState(err);
  };
  
  // Set loading state wrapper
  const setLoading = (loading: boolean) => {
    setIsLoadingState(loading);
  };
  
  // Clear all data
  const clearAllData = () => {
    setVoyageEventsState([]);
    setVesselManifestsState([]);
    setMasterFacilitiesState([]);
    setCostAllocationState([]);
    setVesselClassificationsState([]);
    setVoyageListState([]);
    setBulkActionsState([]);
    setDataStoreState(null);
    setUploadedFiles({
      voyageEvents: false,
      vesselManifests: false,
      masterFacilities: false,
      costAllocation: false,
      vesselClassifications: false,
      voyageList: false,
      bulkActions: false
    });
    setErrorState(null);
    setLastUpdated(null);
    setIsDataReadyState(false);
    
    // Clear all localStorage data including compressed, chunked, minimal, and emergency versions
    try {
      localStorage.removeItem('bp-logistics-data');
      localStorage.removeItem('bp-logistics-data-compressed');
      localStorage.removeItem('bp-logistics-data-chunked');
      localStorage.removeItem('bp-logistics-data-minimal');
      localStorage.removeItem('bp-logistics-data-emergency');
      localStorage.removeItem('bp-logistics-processing-log');
      
      // Clear any chunked data
      clearChunkedData();
      
      console.log('🧹 Cleared all localStorage data including emergency storage');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  };
  
  // Reset to upload page (clears data and goes back to upload)
  const resetToUpload = () => {
    clearAllData();
  };
  
  // Force refresh data from localStorage (for debugging)
  const forceRefreshFromStorage = () => {
    console.log(`🔄[${instanceId.current}] Force refreshing data from localStorage...`);
    const freshStoredData = loadStoredData();
    
    if (freshStoredData) {
      console.log(`✅[${instanceId.current}] Fresh data loaded:`, {
        hasData: freshStoredData.hasData,
        voyageEventsCount: freshStoredData.voyageEvents?.length || 0,
        vesselManifestsCount: freshStoredData.vesselManifests?.length || 0
      });
      
      // Update all state
      setVoyageEventsState(freshStoredData.voyageEvents || []);
      setVesselManifestsState(freshStoredData.vesselManifests || []);
      setMasterFacilitiesState(freshStoredData.masterFacilities || []);
      setCostAllocationState(freshStoredData.costAllocation || []);
      setVesselClassificationsState(freshStoredData.vesselClassifications || []);
      setVoyageListState(freshStoredData.voyageList || []);
      setBulkActionsState(freshStoredData.bulkActions || []);
      setIsDataReadyState(freshStoredData.hasData || false);
      setLastUpdated(freshStoredData.lastUpdated || null);
      
      console.log(`🎯[${instanceId.current}] Force refresh completed, isDataReady set to:`, freshStoredData.hasData);
    } else {
      console.log(`❌[${instanceId.current}] No fresh data found in localStorage`);
      setIsDataReadyState(false);
    }
  };
  
  // EMERGENCY DEBUG: Add a manual override function that can be called from console
  const manualDataCheck = React.useCallback(() => {
    console.log(`🔍[${instanceId.current}] MANUAL DEBUG: Checking data state...`);
    console.log(`📊[${instanceId.current}] Current state:`, {
      voyageEventsCount: voyageEvents.length,
      vesselManifestsCount: vesselManifests.length,
      isDataReady,
      isLoading
    });
    
    // ENHANCED: Direct localStorage inspection
    console.log(`🚨[${instanceId.current}] DIRECT localStorage inspection:`);
    const allKeys = Object.keys(localStorage);
    console.log(`🗂️[${instanceId.current}] All localStorage keys:`, allKeys);
    
    const bpKeys = allKeys.filter(key => key.startsWith('bp-logistics'));
    console.log(`📋[${instanceId.current}] BP logistics keys:`, bpKeys);
    
    bpKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        const sizeKB = Math.round(value.length / 1024);
        const sizeMB = (value.length / 1024 / 1024).toFixed(2);
        console.log(`📊[${instanceId.current}] ${key}:`, {
          sizeKB: `${sizeKB}KB`,
          sizeMB: `${sizeMB}MB`,
          stringLength: value.length,
          blobSize: new Blob([value]).size,
          firstChars: value.substring(0, 100),
          lastChars: value.substring(value.length - 100)
        });
        
        if (key === 'bp-logistics-data') {
          try {
            const parsed = JSON.parse(value);
            console.log(`🔬[${instanceId.current}] Parsed data detailed analysis:`, {
              topLevelKeys: Object.keys(parsed),
              voyageEvents: {
                exists: !!parsed.voyageEvents,
                isArray: Array.isArray(parsed.voyageEvents),
                length: parsed.voyageEvents?.length || 0,
                firstElement: parsed.voyageEvents?.[0],
                sample: parsed.voyageEvents?.slice(0, 3)
              },
              vesselManifests: {
                exists: !!parsed.vesselManifests,
                isArray: Array.isArray(parsed.vesselManifests),
                length: parsed.vesselManifests?.length || 0
              },
              metadata: {
                exists: !!parsed.metadata,
                content: parsed.metadata
              }
            });
            
            // Test if we can manually set the data
            if (parsed.voyageEvents && Array.isArray(parsed.voyageEvents) && parsed.voyageEvents.length > 0) {
              console.log(`🚨[${instanceId.current}] Data exists but React state is empty - attempting manual fix!`);
              console.log(`🔧[${instanceId.current}] Manually updating React state...`);
              
              // Force update the React state with the parsed data
              setVoyageEventsState(parsed.voyageEvents || []);
              setVesselManifestsState(parsed.vesselManifests || []);
              setMasterFacilitiesState(parsed.masterFacilities || []);
              setCostAllocationState(parsed.costAllocation || []);
              setVesselClassificationsState(parsed.vesselClassifications || []);
              setVoyageListState(parsed.voyageList || []);
              setBulkActionsState(parsed.bulkActions || []);
              setIsDataReadyState(true);
              setLastUpdated(parsed.metadata?.lastUpdated ? new Date(parsed.metadata.lastUpdated) : new Date());
              
              console.log(`✅[${instanceId.current}] Manual state update completed!`);
              return true;
            }
          } catch (e) {
            console.error(`❌[${instanceId.current}] Failed to parse stored data:`, e);
          }
        }
      }
    });
    
    return false;
  }, [voyageEvents.length, vesselManifests.length, isDataReady, isLoading]);
  
  // Make manualDataCheck available globally for debugging
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugDataContext = manualDataCheck;
      console.log(`🛠️[${instanceId.current}] Debug function available: window.debugDataContext()`);
    }
  }, [isDataReady, manualDataCheck]);
  
  return (
    <DataContext.Provider value={{
      // Data
      voyageEvents,
      vesselManifests,
      masterFacilities,
      costAllocation,
      vesselClassifications,
      voyageList,
      bulkActions,
      
      // Data store for compatibility
      dataStore,
      setDataStore,
      
      // State
      isDataReady,
      setIsDataReady,
      isLoading,
      setIsLoading,
      error,
      uploadedFiles,
      lastUpdated,
      
      // Setters
      setVoyageEvents,
      setVesselManifests,
      setMasterFacilities,
      setCostAllocation,
      setVesselClassifications,
      setVoyageList,
      setBulkActions,
      
      // Utilities
      setLoading,
      setError,
      clearAllData,
      resetToUpload,
      forceRefreshFromStorage
    }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;