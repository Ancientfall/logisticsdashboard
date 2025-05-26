// context/DataContext.tsx
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

interface DataContextType {
  // Main data arrays
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  
  // Data state
  isDataReady: boolean;
  isLoading: boolean;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Main data state
  const [voyageEvents, setVoyageEvents] = useState<VoyageEvent[]>([]);
  const [vesselManifests, setVesselManifests] = useState<VesselManifest[]>([]);
  const [masterFacilities, setMasterFacilities] = useState<MasterFacility[]>([]);
  const [costAllocation, setCostAllocation] = useState<CostAllocation[]>([]);
  const [vesselClassifications, setVesselClassifications] = useState<VesselClassification[]>([]);
  const [voyageList, setVoyageList] = useState<VoyageList[]>([]);
  const [bulkActions, setBulkActions] = useState<BulkAction[]>([]);
  
  // Loading and error state
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track which files have been uploaded
  const [uploadedFiles, setUploadedFiles] = useState({
    voyageEvents: false,
    vesselManifests: false,
    masterFacilities: false,
    costAllocation: false,
    vesselClassifications: false,
    voyageList: false,
    bulkActions: false
  });
  
  // Update uploaded files tracking when data is set
  const updateVoyageEvents = (data: VoyageEvent[]) => {
    setVoyageEvents(data);
    setUploadedFiles(prev => ({ ...prev, voyageEvents: data.length > 0 }));
  };
  
  const updateVesselManifests = (data: VesselManifest[]) => {
    setVesselManifests(data);
    setUploadedFiles(prev => ({ ...prev, vesselManifests: data.length > 0 }));
  };
  
  const updateMasterFacilities = (data: MasterFacility[]) => {
    setMasterFacilities(data);
    setUploadedFiles(prev => ({ ...prev, masterFacilities: data.length > 0 }));
  };
  
  const updateCostAllocation = (data: CostAllocation[]) => {
    setCostAllocation(data);
    setUploadedFiles(prev => ({ ...prev, costAllocation: data.length > 0 }));
  };
  
  const updateVesselClassifications = (data: VesselClassification[]) => {
    setVesselClassifications(data);
    setUploadedFiles(prev => ({ ...prev, vesselClassifications: data.length > 0 }));
  };
  
  const updateVoyageList = (data: VoyageList[]) => {
    setVoyageList(data);
    setUploadedFiles(prev => ({ ...prev, voyageList: data.length > 0 }));
  };
  
  const updateBulkActions = (data: BulkAction[]) => {
    setBulkActions(data);
    setUploadedFiles(prev => ({ ...prev, bulkActions: data.length > 0 }));
  };
  
  // Clear all data
  const clearAllData = () => {
    setVoyageEvents([]);
    setVesselManifests([]);
    setMasterFacilities([]);
    setCostAllocation([]);
    setVesselClassifications([]);
    setVoyageList([]);
    setBulkActions([]);
    setUploadedFiles({
      voyageEvents: false,
      vesselManifests: false,
      masterFacilities: false,
      costAllocation: false,
      vesselClassifications: false,
      voyageList: false,
      bulkActions: false
    });
    setError(null);
  };
  
  // Check if minimum required data is ready
  // You can adjust this based on which files are absolutely required
  const isDataReady = 
    voyageEvents.length > 0 && 
    vesselManifests.length > 0 && 
    masterFacilities.length > 0 &&
    costAllocation.length > 0;
  
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
      
      // State
      isDataReady,
      isLoading,
      error,
      uploadedFiles,
      
      // Setters
      setVoyageEvents: updateVoyageEvents,
      setVesselManifests: updateVesselManifests,
      setMasterFacilities: updateMasterFacilities,
      setCostAllocation: updateCostAllocation,
      setVesselClassifications: updateVesselClassifications,
      setVoyageList: updateVoyageList,
      setBulkActions: updateBulkActions,
      
      // Utilities
      setLoading,
      setError,
      clearAllData
    }}>
      {children}
    </DataContext.Provider>
  );
};