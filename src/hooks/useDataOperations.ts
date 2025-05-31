// src/hooks/useDataOperations.ts
import { useState, useCallback, useEffect } from 'react';
import { 
  VoyageEvent, 
  VesselManifest, 
  MasterFacility, 
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction 
} from '../types';
import { SimpleStorageManager, StorageData } from '../utils/storage/storageManagerSimple';
import { indexedDBService, IndexedDBStorageData } from '../services/indexedDBService';

interface UseDataOperationsProps {
  onDataUpdate?: (data: Partial<StorageData>) => void;
}

interface UseDataOperationsReturn {
  // Data state
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  
  // Meta state
  isDataReady: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Data setters
  setVoyageEvents: (data: VoyageEvent[]) => void;
  setVesselManifests: (data: VesselManifest[]) => void;
  setMasterFacilities: (data: MasterFacility[]) => void;
  setCostAllocation: (data: CostAllocation[]) => void;
  setVesselClassifications: (data: VesselClassification[]) => void;
  setVoyageList: (data: VoyageList[]) => void;
  setBulkActions: (data: BulkAction[]) => void;
  
  // Operations
  loadStoredData: () => Promise<boolean>;
  saveAllData: () => Promise<boolean>;
  clearAllData: () => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsDataReady: (ready: boolean) => void;
  
  // Storage info
  getStorageInfo: () => Promise<any> | { used: number; keys: string[]; sizeMB: number };
}

const storageManager = SimpleStorageManager.getInstance();

// Helper function to convert between storage formats
const convertToIndexedDBFormat = (data: StorageData): IndexedDBStorageData => ({
  voyageEvents: data.voyageEvents || [],
  vesselManifests: data.vesselManifests || [],
  masterFacilities: data.masterFacilities || [],
  costAllocation: data.costAllocation || [],
  vesselClassifications: data.vesselClassifications || [],
  voyageList: data.voyageList || [],
  bulkActions: data.bulkActions || [],
  metadata: data.metadata
});

const convertFromIndexedDBFormat = (data: IndexedDBStorageData): StorageData => ({
  voyageEvents: data.voyageEvents || [],
  vesselManifests: data.vesselManifests || [],
  masterFacilities: data.masterFacilities || [],
  costAllocation: data.costAllocation || [],
  vesselClassifications: data.vesselClassifications || [],
  voyageList: data.voyageList || [],
  bulkActions: data.bulkActions || [],
  metadata: data.metadata
});

export const useDataOperations = (props?: UseDataOperationsProps): UseDataOperationsReturn => {
  
  // Initialize with empty data (will load from localStorage)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Add flag to prevent save loops
  
  // Data state
  const [voyageEvents, setVoyageEventsState] = useState<VoyageEvent[]>([]);
  const [vesselManifests, setVesselManifestsState] = useState<VesselManifest[]>([]);
  const [masterFacilities, setMasterFacilitiesState] = useState<MasterFacility[]>([]);
  const [costAllocation, setCostAllocationState] = useState<CostAllocation[]>([]);
  const [vesselClassifications, setVesselClassificationsState] = useState<VesselClassification[]>([]);
  const [voyageList, setVoyageListState] = useState<VoyageList[]>([]);
  const [bulkActions, setBulkActionsState] = useState<BulkAction[]>([]);
  
  // Meta state
  const [isDataReady, setIsDataReadyState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


  // Save all data to IndexedDB with localStorage fallback
  const saveAllData = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent saves and save loops
    if (isSaving) {
      console.log('⚠️ Save already in progress, skipping...');
      return false;
    }
    
    try {
      setIsSaving(true);
      setIsLoading(true);
      const dataStore: StorageData = {
        vesselManifests: vesselManifests || [],
        voyageList: voyageList || [],
        voyageEvents: voyageEvents || [],
        costAllocation: costAllocation || [],
        masterFacilities: masterFacilities || [],
        vesselClassifications: vesselClassifications || [],
        bulkActions: bulkActions || []
      };
      
      // Try IndexedDB first (primary storage)
      console.log('💾 Attempting to save to IndexedDB...');
      const indexedDBSuccess = await indexedDBService.saveAllData(convertToIndexedDBFormat(dataStore));
      
      if (indexedDBSuccess) {
        console.log('✅ Successfully saved to IndexedDB');
        setLastUpdated(new Date());
        setIsLoading(false);
        setIsSaving(false);
        return true;
      }
      
      // Fallback to localStorage if IndexedDB fails
      console.warn('⚠️ IndexedDB failed, falling back to localStorage...');
      const localStorageSuccess = storageManager.saveData(dataStore);
      
      if (localStorageSuccess) {
        console.log('✅ Successfully saved to localStorage (fallback)');
        setLastUpdated(new Date());
        setIsLoading(false);
        setIsSaving(false);
        return true;
      }
      
      throw new Error('Both IndexedDB and localStorage save failed');
      
    } catch (error) {
      console.error('❌ Failed to save data:', error);
      setError('Failed to save data to storage');
      setIsLoading(false);
      setIsSaving(false);
      return false;
    }
  }, [voyageEvents, vesselManifests, voyageList, costAllocation, masterFacilities, vesselClassifications, bulkActions, isSaving]);

  // Load data from IndexedDB with localStorage fallback
  const loadStoredData = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Try IndexedDB first (primary storage)
      console.log('🔍 Attempting to load from IndexedDB...');
      const indexedDBData = await indexedDBService.loadAllData();
      
      if (indexedDBData) {
        console.log('✅ Successfully loaded from IndexedDB');
        const data = convertFromIndexedDBFormat(indexedDBData);
        
        setVoyageEventsState(data.voyageEvents || []);
        setVesselManifestsState(data.vesselManifests || []);
        setCostAllocationState(data.costAllocation || []);
        setVoyageListState(data.voyageList || []);
        setMasterFacilitiesState(data.masterFacilities || []);
        setVesselClassificationsState(data.vesselClassifications || []);
        setBulkActionsState(data.bulkActions || []);
        
        const hasData = (data.voyageEvents?.length || 0) > 0 || 
                       (data.vesselManifests?.length || 0) > 0 || 
                       (data.costAllocation?.length || 0) > 0;
        
        setIsDataReadyState(hasData);
        setLastUpdated(hasData ? new Date() : null);
        setIsLoading(false);
        return hasData;
      }
      
      // Fallback to localStorage if IndexedDB has no data
      console.warn('⚠️ No data in IndexedDB, checking localStorage...');
      const localStorageData = storageManager.loadData();
      
      if (localStorageData) {
        console.log('✅ Successfully loaded from localStorage (fallback)');
        
        setVoyageEventsState(localStorageData.voyageEvents || []);
        setVesselManifestsState(localStorageData.vesselManifests || []);
        setCostAllocationState(localStorageData.costAllocation || []);
        setVoyageListState(localStorageData.voyageList || []);
        setMasterFacilitiesState(localStorageData.masterFacilities || []);
        setVesselClassificationsState(localStorageData.vesselClassifications || []);
        setBulkActionsState(localStorageData.bulkActions || []);
        
        const hasData = (localStorageData.voyageEvents?.length || 0) > 0 || 
                       (localStorageData.vesselManifests?.length || 0) > 0 || 
                       (localStorageData.costAllocation?.length || 0) > 0;
        
        setIsDataReadyState(hasData);
        setLastUpdated(hasData ? new Date() : null);
        setIsLoading(false);
        
        // Migrate localStorage data to IndexedDB for future use
        if (hasData) {
          console.log('🔄 Migrating localStorage data to IndexedDB...');
          indexedDBService.saveAllData(convertToIndexedDBFormat(localStorageData))
            .then(success => {
              if (success) {
                console.log('✅ Successfully migrated data to IndexedDB');
              }
            })
            .catch(error => {
              console.warn('⚠️ Failed to migrate data to IndexedDB:', error);
            });
        }
        
        return hasData;
      }
      
      // No data found in either storage
      console.log('ℹ️ No data found in either IndexedDB or localStorage');
      setIsLoading(false);
      return false;
      
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setError('Failed to load data from storage');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Clear all data from both IndexedDB and localStorage
  const clearAllData = useCallback(async () => {
    setVoyageEventsState([]);
    setVesselManifestsState([]);
    setMasterFacilitiesState([]);
    setCostAllocationState([]);
    setVesselClassificationsState([]);
    setVoyageListState([]);
    setBulkActionsState([]);
    setIsDataReadyState(false);
    setError(null);
    setLastUpdated(null);
    
    try {
      // Clear IndexedDB first
      console.log('🧹 Clearing IndexedDB data...');
      const indexedDBCleared = await indexedDBService.clearAllData();
      
      // Clear localStorage as well
      console.log('🧹 Clearing localStorage data...');
      storageManager.clearAllData();
      
      if (indexedDBCleared) {
        console.log('✅ Successfully cleared all data');
      } else {
        console.warn('⚠️ IndexedDB clear failed, but localStorage was cleared');
      }
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      setError('Failed to clear data from storage');
    }
  }, []);

  // Data setters with auto-save
  const setVoyageEvents = useCallback((data: VoyageEvent[]) => {
    setVoyageEventsState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ voyageEvents: data });
  }, [props]);

  const setVesselManifests = useCallback((data: VesselManifest[]) => {
    setVesselManifestsState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ vesselManifests: data });
  }, [props]);

  const setMasterFacilities = useCallback((data: MasterFacility[]) => {
    setMasterFacilitiesState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ masterFacilities: data });
  }, [props]);

  const setCostAllocation = useCallback((data: CostAllocation[]) => {
    setCostAllocationState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ costAllocation: data });
  }, [props]);

  const setVesselClassifications = useCallback((data: VesselClassification[]) => {
    setVesselClassificationsState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ vesselClassifications: data });
  }, [props]);

  const setVoyageList = useCallback((data: VoyageList[]) => {
    setVoyageListState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ voyageList: data });
  }, [props]);

  const setBulkActions = useCallback((data: BulkAction[]) => {
    setBulkActionsState(data);
    setLastUpdated(new Date());
    props?.onDataUpdate?.({ bulkActions: data });
  }, [props]);

  const setIsDataReady = useCallback((ready: boolean) => {
    setIsDataReadyState(ready);
    // Save data when marked as ready, but with loop protection
    if (ready && !isSaving) {
      // Use a small delay to batch multiple state updates
      setTimeout(() => {
        saveAllData();
      }, 100);
    }
  }, [isSaving, saveAllData]);

  // Load data from localStorage on mount
  useEffect(() => {
    if (!initialDataLoaded) {
      setInitialDataLoaded(true);
      loadStoredData();
    }
  }, [initialDataLoaded, loadStoredData]);

  // Get storage info for both IndexedDB and localStorage
  const getStorageInfo = useCallback(async () => {
    try {
      const [indexedDBInfo, localStorageInfo] = await Promise.all([
        indexedDBService.getStorageInfo(),
        Promise.resolve(storageManager.getStorageInfo())
      ]);

      return {
        primary: indexedDBInfo || { type: 'IndexedDB', status: 'unavailable' },
        fallback: { 
          type: 'localStorage', 
          ...localStorageInfo 
        },
        indexedDBSupported: (indexedDBService.constructor as any).isSupported?.() || false
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        primary: { type: 'IndexedDB', status: 'error' },
        fallback: { 
          type: 'localStorage', 
          ...storageManager.getStorageInfo() 
        },
        indexedDBSupported: false
      };
    }
  }, []);

  return {
    // Data
    voyageEvents,
    vesselManifests,
    masterFacilities,
    costAllocation,
    vesselClassifications,
    voyageList,
    bulkActions,
    
    // Meta
    isDataReady,
    isLoading,
    error,
    lastUpdated,
    
    // Setters
    setVoyageEvents,
    setVesselManifests,
    setMasterFacilities,
    setCostAllocation,
    setVesselClassifications,
    setVoyageList,
    setBulkActions,
    
    // Operations
    loadStoredData,
    saveAllData,
    clearAllData,
    setError,
    setIsLoading,
    setIsDataReady,
    getStorageInfo
  };
};