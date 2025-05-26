// src/context/DashboardContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DashboardFilters } from '../types';
import { useData } from './DataContext';

interface DashboardContextType {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  resetFilters: () => void;
  applyFilters: () => void;
  isDirty: boolean;
  pendingFilters: DashboardFilters;
  setPendingFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  availableMonths: {value: string, label: string}[];
  availableCompanies: string[];
  availableVessels: string[];
  availableLocations: string[];
}

// Create context with default values
const DashboardContext = createContext<DashboardContextType>({
  filters: {},
  setFilters: () => {},
  resetFilters: () => {},
  applyFilters: () => {},
  isDirty: false,
  pendingFilters: {},
  setPendingFilters: () => {},
  availableMonths: [],
  availableCompanies: [],
  availableVessels: [],
  availableLocations: []
});

// Create hook for using the context
export const useDashboard = () => useContext(DashboardContext);

// Provider component
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { voyageEvents, isDataReady } = useData();
  
  // Current applied filters
  const [filters, setFilters] = useState<DashboardFilters>({
    selectedDepartment: 'Drilling',
    selectedMonth: new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  });
  
  // Pending filters (not yet applied)
  const [pendingFilters, setPendingFilters] = useState<DashboardFilters>(filters);
  
  // Available filter options
  const [availableMonths, setAvailableMonths] = useState<{value: string, label: string}[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableVessels, setAvailableVessels] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  
  // Update available options when data changes
  useEffect(() => {
    if (isDataReady && voyageEvents.length > 0) {
      setAvailableMonths(getMonthOptions(voyageEvents));
      setAvailableCompanies(getUniqueCompanies(voyageEvents));
      setAvailableVessels(getUniqueVessels(voyageEvents));
      setAvailableLocations(getUniqueLocations(voyageEvents));
    }
  }, [voyageEvents, isDataReady]);
  
  // Determine if filters have changed
  const isDirty = JSON.stringify(filters) !== JSON.stringify(pendingFilters);
  
  // Reset filters to default
  const resetFilters = () => {
    const defaultFilters: DashboardFilters = {
      selectedDepartment: 'Drilling',
      selectedMonth: new Date().toISOString().slice(0, 7)
    };
    
    setFilters(defaultFilters);
    setPendingFilters(defaultFilters);
  };
  
  // Apply pending filters
  const applyFilters = () => {
    setFilters(pendingFilters);
  };
  
  // Context value
  const value = {
    filters,
    setFilters,
    resetFilters,
    applyFilters,
    isDirty,
    pendingFilters,
    setPendingFilters,
    availableMonths,
    availableCompanies,
    availableVessels,
    availableLocations
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// Helper functions for option generation
const getMonthOptions = (voyageEvents: any[]): {value: string, label: string}[] => {
  if (!voyageEvents || voyageEvents.length === 0) return [];
  
  const monthMap = new Map<string, string>();
  
  voyageEvents.forEach(event => {
    if (event.eventDate) {
      const date = new Date(event.eventDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long' });
      const label = `${monthName} ${date.getFullYear()}`;
      monthMap.set(monthKey, label);
    }
  });
  
  const options = Array.from(monthMap.entries()).map(([value, label]) => ({ value, label }));
  
  // Sort by date (descending)
  return options.sort((a, b) => b.value.localeCompare(a.value));
};

const getUniqueCompanies = (voyageEvents: any[]): string[] => {
  if (!voyageEvents || voyageEvents.length === 0) return [];
  
  const companies = new Set<string>();
  
  voyageEvents.forEach(event => {
    if (event.company) {
      companies.add(event.company);
    }
  });
  
  return Array.from(companies).sort();
};

const getUniqueVessels = (voyageEvents: any[]): string[] => {
  if (!voyageEvents || voyageEvents.length === 0) return [];
  
  const vessels = new Set<string>();
  
  voyageEvents.forEach(event => {
    if (event.vessel) {
      vessels.add(event.vessel);
    }
  });
  
  return Array.from(vessels).sort();
};

const getUniqueLocations = (voyageEvents: any[]): string[] => {
  if (!voyageEvents || voyageEvents.length === 0) return [];
  
  const locations = new Set<string>();
  
  voyageEvents.forEach(event => {
    if (event.mappedLocation) {
      locations.add(event.mappedLocation);
    }
  });
  
  return Array.from(locations).sort();
};

export default DashboardContext;