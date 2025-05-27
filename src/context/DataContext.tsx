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
  lastUpdated: null
});

export const useData = () => useContext(DataContext);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Check for existing data in localStorage on initialization
  const loadStoredData = () => {
    try {
      const storedData = localStorage.getItem('logisticsDashboardData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        return {
          hasData: parsed.hasData || false,
          lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null,
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
      console.warn('Failed to load stored data:', error);
    }
    return null;
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

  // Save data to localStorage
  const saveDataToStorage = (data: any) => {
    try {
      localStorage.setItem('logisticsDashboardData', JSON.stringify({
        hasData: true,
        lastUpdated: new Date().toISOString(),
        ...data
      }));
    } catch (error) {
      console.warn('Failed to save data to localStorage:', error);
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
    console.log('📊 DataContext: setIsDataReady called with:', ready);
    setIsDataReadyState(ready);
    if (ready) {
      console.log('💾 Saving data to localStorage...');
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
    
    // Clear localStorage
    try {
      localStorage.removeItem('logisticsDashboardData');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  };
  
  // Reset to upload page (clears data and goes back to upload)
  const resetToUpload = () => {
    clearAllData();
  };
  
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
      resetToUpload
    }}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;