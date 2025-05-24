import React, { createContext, useContext, useState, ReactNode } from 'react';
import { VoyageEvent, VesselManifest, MasterFacility } from '../types';

interface DataContextType {
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  isDataReady: boolean;
  setVoyageEvents: (data: VoyageEvent[]) => void;
  setVesselManifests: (data: VesselManifest[]) => void;
  setMasterFacilities: (data: MasterFacility[]) => void;
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
  const [voyageEvents, setVoyageEvents] = useState<VoyageEvent[]>([]);
  const [vesselManifests, setVesselManifests] = useState<VesselManifest[]>([]);
  const [masterFacilities, setMasterFacilities] = useState<MasterFacility[]>([]);

  const isDataReady = voyageEvents.length > 0 && vesselManifests.length > 0;

  return (
    <DataContext.Provider value={{
      voyageEvents,
      vesselManifests,
      masterFacilities,
      isDataReady,
      setVoyageEvents,
      setVesselManifests,
      setMasterFacilities,
    }}>
      {children}
    </DataContext.Provider>
  );
};
