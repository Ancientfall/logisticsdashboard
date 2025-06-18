// src/context/DataContext.tsx
import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { 
  VoyageEvent, 
  VesselManifest, 
  MasterFacility, 
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction 
} from '../types';
import { SimpleDataStore } from '../types/simpleDataStore';
import { useDataOperations } from '../hooks/useDataOperations';
import { DebugUtils } from '../utils/storage/debugUtils';

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
  dataStore: SimpleDataStore | null;
  setDataStore: (dataStore: SimpleDataStore | null) => void;
  
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
  loadDataFromPostgreSQL: () => Promise<boolean>;
  lastUpdated: Date | null;
  
  // Debug function
  debugDashboardData: () => void;
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
  loadDataFromPostgreSQL: async () => false,
  lastUpdated: null,
  debugDashboardData: () => {}
});

export const useData = () => useContext(DataContext);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Use the custom hook for all data operations
  const dataOps = useDataOperations();
  
  // Track last data readiness change to prevent rapid toggles
  const lastDataReadyChange = React.useRef<number>(0);

  // Attach debug utilities on mount
  useEffect(() => {
    DebugUtils.attachToWindow();
  }, []);

  // Create dataStore for backward compatibility
  const dataStore: SimpleDataStore | null = dataOps.isDataReady ? {
    voyageEvents: dataOps.voyageEvents,
    vesselManifests: dataOps.vesselManifests,
    masterFacilities: dataOps.masterFacilities,
    costAllocation: dataOps.costAllocation,
    vesselClassifications: dataOps.vesselClassifications,
    voyageList: dataOps.voyageList,
    bulkActions: dataOps.bulkActions
  } : null;

  // Wrapper functions for backward compatibility
  const setDataStore = useCallback((data: SimpleDataStore | null) => {
    if (data) {
      dataOps.setVoyageEvents(data.voyageEvents || []);
      dataOps.setVesselManifests(data.vesselManifests || []);
      dataOps.setMasterFacilities(data.masterFacilities || []);
      dataOps.setCostAllocation(data.costAllocation || []);
      dataOps.setVesselClassifications(data.vesselClassifications || []);
      dataOps.setVoyageList(data.voyageList || []);
      dataOps.setBulkActions(data.bulkActions || []);
      dataOps.setIsDataReady(true);
    } else {
      dataOps.clearAllData();
    }
  }, [dataOps]);

  const setLoading = useCallback((loading: boolean) => {
    dataOps.setIsLoading(loading);
  }, [dataOps]);

  const resetToUpload = useCallback(() => {
    dataOps.clearAllData();
  }, [dataOps]);

  const forceRefreshFromStorage = useCallback(async () => {
    console.log('🔄 Force refreshing data from PostgreSQL...');
    const success = await dataOps.loadDataFromPostgreSQL();
    console.log(success ? '✅ Data refreshed successfully' : '❌ No data found to refresh');
  }, [dataOps]);

  const loadDataFromPostgreSQL = useCallback(async (): Promise<boolean> => {
    console.log('🔄 Loading data from PostgreSQL database...');
    return await dataOps.loadDataFromPostgreSQL();
  }, [dataOps]);

  // Track uploaded files
  const uploadedFiles = {
    voyageEvents: dataOps.voyageEvents.length > 0,
    vesselManifests: dataOps.vesselManifests.length > 0,
    masterFacilities: dataOps.masterFacilities.length > 0,
    costAllocation: dataOps.costAllocation.length > 0,
    vesselClassifications: dataOps.vesselClassifications.length > 0,
    voyageList: dataOps.voyageList.length > 0,
    bulkActions: dataOps.bulkActions.length > 0
  };

  // Auto-check data readiness when arrays change (with debouncing)
  useEffect(() => {
    const hasAnyData = dataOps.voyageEvents.length > 0 || 
                      dataOps.costAllocation.length > 0 || 
                      dataOps.vesselManifests.length > 0;
    
    const now = Date.now();
    const timeSinceLastChange = now - lastDataReadyChange.current;
    
    // Only update if there's a real change in data state and enough time has passed
    if (timeSinceLastChange > 1000) { // 1 second debounce
      if (hasAnyData && !dataOps.isDataReady && !dataOps.isLoading) {
        console.log('🔄 Auto-setting isDataReady to true');
        lastDataReadyChange.current = now;
        dataOps.setIsDataReady(true);
      } else if (!hasAnyData && dataOps.isDataReady && !dataOps.isLoading) {
        console.log('🔄 Auto-setting isDataReady to false');
        lastDataReadyChange.current = now;
        dataOps.setIsDataReady(false);
      }
    }
  }, [dataOps.voyageEvents.length, dataOps.costAllocation.length, dataOps.vesselManifests.length, dataOps.isDataReady, dataOps.isLoading, dataOps]);

  // REMOVED: Auto-save functionality that was causing infinite loops
  // Data is now saved manually when needed through setIsDataReady or explicit save calls

  return (
    <DataContext.Provider value={{
      // Data
      voyageEvents: dataOps.voyageEvents,
      vesselManifests: dataOps.vesselManifests,
      masterFacilities: dataOps.masterFacilities,
      costAllocation: dataOps.costAllocation,
      vesselClassifications: dataOps.vesselClassifications,
      voyageList: dataOps.voyageList,
      bulkActions: dataOps.bulkActions,
      
      // Data store for compatibility
      dataStore,
      setDataStore,
      
      // State
      isDataReady: dataOps.isDataReady,
      setIsDataReady: dataOps.setIsDataReady,
      isLoading: dataOps.isLoading,
      setIsLoading: dataOps.setIsLoading,
      error: dataOps.error,
      uploadedFiles,
      lastUpdated: dataOps.lastUpdated,
      
      // Setters
      setVoyageEvents: dataOps.setVoyageEvents,
      setVesselManifests: dataOps.setVesselManifests,
      setMasterFacilities: dataOps.setMasterFacilities,
      setCostAllocation: dataOps.setCostAllocation,
      setVesselClassifications: dataOps.setVesselClassifications,
      setVoyageList: dataOps.setVoyageList,
      setBulkActions: dataOps.setBulkActions,
      
      // Utilities
      setLoading,
      setError: dataOps.setError,
      clearAllData: dataOps.clearAllData,
      resetToUpload,
      forceRefreshFromStorage,
      loadDataFromPostgreSQL,
      debugDashboardData: dataOps.debugDashboardData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;