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
import { dataAPI } from '../services/api';

// Import processors for data enhancement
import { getVesselTypeFromName, getVesselCompanyFromName } from '../data/vesselClassification';
import { classifyBulkFluid, BulkFluidCategory } from '../utils/bulkFluidClassification';
import { getAllDrillingCapableLocations } from '../data/masterFacilities';

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
  loadDataFromPostgreSQL: () => Promise<boolean>;
  saveAllData: () => Promise<boolean>;
  clearAllData: () => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsDataReady: (ready: boolean) => void;
  
  // Storage info
  getStorageInfo: () => Promise<any> | { used: number; keys: string[]; sizeMB: number };
  
  // Debug function
  debugDashboardData: () => void;
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

  // Load data from PostgreSQL database via API
  // Helper function to fetch all pages of data
  const fetchAllPages = async (fetchFunction: Function, dataType: string, params: any = {}) => {
    let allData: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        console.log(`📄 Fetching ${dataType} - Page ${page}...`);
        const response = await fetchFunction({ page, limit: 1000, ...params });
        const pageData = response.data || [];
        allData = [...allData, ...pageData];
        
        console.log(`📄 ${dataType} - Page ${page}: ${pageData.length} records (Total: ${allData.length})`);
        
        // Check if there are more pages
        const pagination = response.pagination;
        hasMore = pagination && page < pagination.pages;
        page++;
      } catch (error) {
        console.error(`Error fetching ${dataType} page ${page}:`, error);
        hasMore = false;
      }
    }
    
    return allData;
  };

  // Enhanced data processing function
  const enhanceDataWithProcessors = (
    voyageEventsData: any[],
    vesselManifestsData: any[],
    costAllocationData: any[],
    voyageListData: any[],
    bulkActionsData: any[],
    masterFacilitiesData: any[],
    vesselClassificationsData: any[]
  ) => {
    console.log('🔧 Starting data enhancement with processors...');
    
    // Create facility and cost allocation maps for processors
    const facilitiesMap = new Map();
    masterFacilitiesData.forEach(facility => {
      facilitiesMap.set(facility.locationName?.toLowerCase(), facility);
    });
    
    const costAllocationMap = new Map();
    costAllocationData.forEach(cost => {
      if (cost.lcNumber) {
        costAllocationMap.set(cost.lcNumber, cost);
      }
    });
    
    // Apply enhanced field calculations to voyage events
    let enhancedVoyageEvents = voyageEventsData.map(event => {
      const isNPT = detectNPT(event.parentEvent, event.event, event.remarks);
      const costCalculations = event.hours ? calculateEventCosts(event.hours, event.eventDate || event.from) : {};
      
      // Calculate finalHours based on LC allocation
      let finalHours = event.hours || 0;
      if (event.lcNumber && event.lcPercentage) {
        finalHours = (event.hours || 0) * (event.lcPercentage / 100);
      }
      
      // Determine activity category more sophisticatedly
      let activityCategory = 'Uncategorized';
      if (event.parentEvent === 'Cargo Ops' || 
          event.parentEvent === 'Installation Productive Time' ||
          (event.event && (
            event.event.toLowerCase().includes('cargo') ||
            event.event.toLowerCase().includes('loading') ||
            event.event.toLowerCase().includes('discharge')
          ))) {
        activityCategory = 'Productive';
      } else if (isNPT) {
        activityCategory = 'Non-Productive';
      } else if (!event.event) {
        activityCategory = 'Needs Review - Null Event';
      } else {
        activityCategory = 'Productive'; // Default for other activities
      }
      
      // Determine location type
      let locationType = 'Other';
      if (event.portType === 'rig') {
        locationType = 'Offshore';
      } else if (event.portType === 'base') {
        locationType = 'Onshore';
      }
      
      return {
        ...event,
        // Add vessel classifications
        enhancedVesselType: getVesselTypeFromName(event.vessel || ''),
        enhancedVesselCompany: getVesselCompanyFromName(event.vessel || ''),
        
        // Add NPT detection and sophisticated activity classification
        isNPT,
        isProductive: !isNPT,
        activityCategory,
        locationType,
        
        // Add LC allocation results
        finalHours,
        
        // Add calculated vessel costs (PowerBI-inspired)
        ...costCalculations,
        vesselCostTotal: costCalculations.vesselCostTotal,
        vesselDailyRate: costCalculations.vesselDailyRate,
        vesselHourlyRate: costCalculations.vesselHourlyRate,
        vesselCostRateDescription: costCalculations.vesselCostRateDescription,
        
        // Ensure required date fields
        eventDate: event.eventDate || event.from || new Date(),
        monthName: event.monthName || (event.eventDate ? new Date(event.eventDate).toLocaleString('default', { month: 'long' }) : 'Unknown'),
        
        // Add location reference for dashboard compatibility
        locationReference: event.mappedLocation || event.location,
        
        // Add company field for analytics
        company: getVesselCompanyFromName(event.vessel || ''),
        
        // Add standardized voyage number
        standardizedVoyageNumber: `${event.vessel}-${event.voyageNumber}`.replace(/\s+/g, '-')
      };
    });
    
    // Apply enhanced field calculations to vessel manifests
    let enhancedVesselManifests = vesselManifestsData.map(manifest => {
      const location = manifest.offshoreLocation || manifest.mappedLocation || '';
      const isThunderHorse = location.toLowerCase().includes('thunder horse') || location.toLowerCase().includes('thunderhorse');
      const isMadDog = location.toLowerCase().includes('mad dog') || location.toLowerCase().includes('maddog');
      const isIntegratedFacility = isThunderHorse || isMadDog;
      
      // Determine if this is drilling activity based on cost code and location
      let isDrillingActivity = false;
      if (manifest.costCode) {
        const costCodeStr = String(manifest.costCode).trim();
        const drillingFacilities = getAllDrillingCapableLocations();
        const allDrillingLCs = new Set<string>();
        drillingFacilities.forEach(facility => {
          if (facility.drillingLCs) {
            facility.drillingLCs.split(',').forEach(lc => {
              allDrillingLCs.add(lc.trim());
            });
          }
        });
        isDrillingActivity = allDrillingLCs.has(costCodeStr);
      }
      
      // Check if cost code was found in cost allocation data
      const costCodeMatchFound = costAllocationMap.has(manifest.costCode || '');
      const originalLocationFromCost = costCodeMatchFound ? costAllocationMap.get(manifest.costCode || '')?.locationReference : undefined;
      
      return {
        ...manifest,
        // Add vessel classifications
        enhancedVesselType: getVesselTypeFromName(manifest.transporter || ''),
        enhancedVesselCompany: getVesselCompanyFromName(manifest.transporter || ''),
        
        // Calculate cargo efficiency metrics
        cargoEfficiency: calculateCargoEfficiency(manifest),
        
        // PowerBI-Inspired Analytics Fields
        isIntegratedFacility,
        isDrillingActivity,
        costCodeMatchFound,
        originalLocationFromCost,
        
        // Ensure date fields
        manifestDate: manifest.manifestDate || new Date(),
        monthName: manifest.month || (manifest.manifestDate ? new Date(manifest.manifestDate).toLocaleString('default', { month: 'long' }) : 'Unknown'),
        
        // Add company and vessel type for analytics
        company: getVesselCompanyFromName(manifest.transporter || ''),
        vesselType: getVesselTypeFromName(manifest.transporter || '')
      };
    });
    
    // Apply enhanced field calculations to cost allocation
    let enhancedCostAllocation = costAllocationData.map(cost => {
      const rigLocation = cost.rigLocation || cost.locationReference || cost.description || '';
      const isThunderHorse = rigLocation.toLowerCase().includes('thunder horse') || rigLocation.toLowerCase().includes('thunderhorse');
      const isMadDog = rigLocation.toLowerCase().includes('mad dog') || rigLocation.toLowerCase().includes('maddog');
      
      // Determine if this is drilling based on project type and LC number
      let isDrilling = false;
      if (cost.projectType === 'Drilling' || cost.department === 'Drilling') {
        isDrilling = true;
      } else if (cost.lcNumber) {
        // Check against drilling LCs
        const drillingFacilities = getAllDrillingCapableLocations();
        const allDrillingLCs = new Set<string>();
        drillingFacilities.forEach(facility => {
          if (facility.drillingLCs) {
            facility.drillingLCs.split(',').forEach(lc => {
              allDrillingLCs.add(lc.trim());
            });
          }
        });
        isDrilling = allDrillingLCs.has(String(cost.lcNumber).trim());
      }
      
      return {
        ...cost,
        // Add location reference field for dashboard compatibility
        locationReference: rigLocation,
        
        // Enhanced Location Information (PowerBI-inspired)
        isDrilling,
        isThunderHorse,
        isMadDog,
        
        // Ensure numeric fields are properly typed
        totalCost: Number(cost.totalCost || cost.budgetedVesselCost || 0),
        budgetedVesselCost: Number(cost.budgetedVesselCost || cost.totalCost || 0),
        totalAllocatedDays: Number(cost.totalAllocatedDays || cost.allocatedDays || cost.days || 0),
        
        // Calculate missing cost fields if we have enough data
        ...(cost.totalAllocatedDays && cost.averageVesselCostPerDay ? {
          calculatedTotalCost: Number(cost.totalAllocatedDays) * Number(cost.averageVesselCostPerDay)
        } : {}),
        
        // Ensure date field is available
        costAllocationDate: cost.costAllocationDate || cost.date || new Date()
      };
    });
    
    // Apply enhanced field calculations to voyage list
    let enhancedVoyageList = voyageListData.map(voyage => ({
      ...voyage,
      // Add vessel classifications
      enhancedVesselType: getVesselTypeFromName(voyage.vessel || ''),
      enhancedVesselCompany: getVesselCompanyFromName(voyage.vessel || ''),
      
      // Ensure date and duration fields
      voyageDate: voyage.voyageDate || new Date(),
      durationHours: voyage.durationHours || 0,
      
      // Add mission and purpose fields if missing
      mission: voyage.mission || voyage.missionType || 'Unknown',
      voyagePurpose: voyage.voyagePurpose || 'General'
    }));
    
    // Apply enhanced field calculations to bulk actions using complete processing logic
    let enhancedBulkActions = bulkActionsData.map(action => {
      // Use the proper fluid classification system
      const bulkType = action.bulkType || 'Unknown';
      const bulkDescription = action.bulkDescription || '';
      const classification = classifyBulkFluid(bulkType, bulkDescription);
      
      // Map new classification to existing fluid classification format
      let fluidClassification = 'Other';
      if (classification.category === BulkFluidCategory.PRODUCTION_CHEMICAL) {
        fluidClassification = 'Chemical';
      } else if (classification.category === BulkFluidCategory.DRILLING || classification.category === BulkFluidCategory.COMPLETION_INTERVENTION) {
        fluidClassification = 'Drilling Fluid';
      } else if (classification.category === BulkFluidCategory.UTILITY) {
        fluidClassification = 'Water';
      } else if (classification.category === BulkFluidCategory.PETROLEUM) {
        fluidClassification = 'Oil/Fuel';
      }
      
      // Calculate volume in barrels and gallons if not already calculated
      let volumeBbls = action.volumeBbls || 0;
      let volumeGals = action.volumeGals || 0;
      
      // If volume calculations are missing or zero, recalculate from qty
      if (volumeBbls === 0 && action.qty) {
        const qty = action.qty;
        const unit = (action.unit || '').toLowerCase();
        const ppg = parseFloat(action.ppg || '8.34'); // Default to water density if not provided
        
        if (unit === 'gal' || unit === 'gals' || unit === 'gallons') {
          volumeGals = qty;
          volumeBbls = qty / 42; // Convert gallons to barrels
        } else if (unit === 'bbl' || unit === 'bbls' || unit === 'barrels') {
          volumeBbls = qty;
          volumeGals = qty * 42; // Convert barrels to gallons
        } else if (unit === 'ton' || unit === 'tons' || unit === 'mt') {
          // Convert tons to barrels using PPG
          volumeBbls = (qty * 2000) / (ppg * 42);
          volumeGals = volumeBbls * 42;
        } else if (unit === 'lbs' || unit === 'pounds') {
          // Convert pounds to barrels using PPG
          volumeBbls = qty / (ppg * 42);
          volumeGals = volumeBbls * 42;
        } else if (unit === 'kg' || unit === 'kilograms') {
          // Convert kg to barrels (1 kg = 2.20462 lbs)
          volumeBbls = (qty * 2.20462) / (ppg * 42);
          volumeGals = volumeBbls * 42;
        }
      }
      
      return {
        ...action,
        // Add vessel classifications
        enhancedVesselType: getVesselTypeFromName(action.vesselName || ''),
        enhancedVesselCompany: getVesselCompanyFromName(action.vesselName || ''),
        
        // Add proper fluid classification using the existing classification system
        fluidClassification,
        fluidCategory: classification.category,
        fluidSpecificType: classification.specificType,
        isDrillingFluid: classification.isDrillingFluid,
        isCompletionFluid: classification.isCompletionFluid,
        productionChemicalType: classification.category === BulkFluidCategory.PRODUCTION_CHEMICAL ? bulkType : undefined,
        
        // Ensure volume calculations are complete
        volumeBbls,
        volumeGals,
        
        // Ensure date and time fields
        startDate: action.startDate || new Date(),
        monthNumber: action.monthNumber || (action.startDate ? new Date(action.startDate).getMonth() + 1 : new Date().getMonth() + 1),
        year: action.year || (action.startDate ? new Date(action.startDate).getFullYear() : new Date().getFullYear()),
        monthName: action.monthName || (action.startDate ? new Date(action.startDate).toLocaleString('default', { month: 'long' }) : 'Unknown'),
        monthYear: action.monthYear || (action.startDate ? new Date(action.startDate).toISOString().substring(0, 7) : ''),
        
        // Add standardized origin/destination for better filtering
        standardizedOrigin: action.standardizedOrigin || action.atPort || 'Unknown',
        standardizedDestination: action.standardizedDestination || action.destinationPort || action.atPort || 'Unknown',
        
        // Determine if this is a return trip
        isReturn: action.isReturn || (action.remarks || '').toLowerCase().includes('return') || (action.action || '').toLowerCase().includes('return')
      };
    });
    
    console.log('✅ Data enhancement completed:', {
      voyageEvents: enhancedVoyageEvents.length,
      vesselManifests: enhancedVesselManifests.length,
      costAllocation: enhancedCostAllocation.length,
      voyageList: enhancedVoyageList.length,
      bulkActions: enhancedBulkActions.length
    });
    
    // Debug sample enhanced data
    if (enhancedVoyageEvents.length > 0) {
      console.log('📊 Sample enhanced voyage event:', {
        vessel: enhancedVoyageEvents[0].vessel,
        enhancedVesselType: enhancedVoyageEvents[0].enhancedVesselType,
        enhancedVesselCompany: enhancedVoyageEvents[0].enhancedVesselCompany,
        isNPT: enhancedVoyageEvents[0].isNPT,
        isProductive: enhancedVoyageEvents[0].isProductive
      });
    }
    
    if (enhancedBulkActions.length > 0) {
      console.log('📊 Sample enhanced bulk action:', {
        vesselName: enhancedBulkActions[0].vesselName,
        enhancedVesselType: enhancedBulkActions[0].enhancedVesselType,
        enhancedVesselCompany: enhancedBulkActions[0].enhancedVesselCompany,
        isDrillingFluid: enhancedBulkActions[0].isDrillingFluid,
        isCompletionFluid: enhancedBulkActions[0].isCompletionFluid
      });
    }
    
    // Add validation summary
    const validationSummary = {
      voyageEventsWithNPT: enhancedVoyageEvents.filter(e => e.isNPT).length,
      voyageEventsWithProductive: enhancedVoyageEvents.filter(e => e.isProductive).length,
      voyageEventsWithCompany: enhancedVoyageEvents.filter(e => e.enhancedVesselCompany && e.enhancedVesselCompany !== 'Unknown').length,
      bulkActionsWithDrillingFluid: enhancedBulkActions.filter(a => a.isDrillingFluid).length,
      bulkActionsWithCompletionFluid: enhancedBulkActions.filter(a => a.isCompletionFluid).length,
      vesselManifestsWithCompany: enhancedVesselManifests.filter(m => m.enhancedVesselCompany && m.enhancedVesselCompany !== 'Unknown').length,
      costAllocationWithCosts: enhancedCostAllocation.filter(c => c.totalCost > 0).length,
      costAllocationWithDays: enhancedCostAllocation.filter(c => c.totalAllocatedDays > 0).length,
      totalDrillingFluidVolume: enhancedBulkActions.filter(a => a.isDrillingFluid).reduce((sum, a) => sum + a.volumeBbls, 0),
      totalCompletionFluidVolume: enhancedBulkActions.filter(a => a.isCompletionFluid).reduce((sum, a) => sum + a.volumeBbls, 0)
    };
    
    console.log('📈 Data enhancement validation summary:', validationSummary);
    
    // Log sample drilling fluids for debugging
    const sampleDrillingFluids = enhancedBulkActions.filter(a => a.isDrillingFluid).slice(0, 5);
    if (sampleDrillingFluids.length > 0) {
      console.log('🔧 Sample drilling fluids detected:', sampleDrillingFluids.map(a => ({
        bulkType: a.bulkType,
        description: a.bulkDescription,
        volume: a.volumeBbls,
        vessel: a.vesselName
      })));
    }
    
    // Log sample cost allocations for debugging
    const sampleCosts = enhancedCostAllocation.filter(c => c.totalCost > 0).slice(0, 5);
    if (sampleCosts.length > 0) {
      console.log('💰 Sample cost allocations with costs:', sampleCosts.map(c => ({
        lcNumber: c.lcNumber,
        totalCost: c.totalCost,
        totalAllocatedDays: c.totalAllocatedDays,
        rigLocation: c.rigLocation
      })));
    }
    
    return {
      voyageEvents: enhancedVoyageEvents,
      vesselManifests: enhancedVesselManifests,
      costAllocation: enhancedCostAllocation,
      voyageList: enhancedVoyageList,
      bulkActions: enhancedBulkActions
    };
  };

  const loadDataFromPostgreSQL = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Fetching ALL data from PostgreSQL database with pagination...');
      
      // Fetch all data types with proper pagination
      const [
        voyageEventsData,
        vesselManifestsData,
        costAllocationData,
        voyageListData,
        bulkActionsData,
        masterFacilitiesData,
        vesselClassificationsData
      ] = await Promise.all([
        fetchAllPages(dataAPI.getVoyageEvents, 'Voyage Events'),
        fetchAllPages(dataAPI.getVesselManifests, 'Vessel Manifests'),
        fetchAllPages(dataAPI.getCostAllocation, 'Cost Allocation'),
        fetchAllPages(dataAPI.getVoyageList, 'Voyage List'),
        fetchAllPages(dataAPI.getBulkActions, 'Bulk Actions'),
        fetchAllPages(dataAPI.getMasterFacilities, 'Master Facilities', { active: true }),
        fetchAllPages(dataAPI.getVesselClassifications, 'Vessel Classifications', { active: true })
      ]);
      
      console.log('📊 PostgreSQL data loaded:', {
        voyageEvents: voyageEventsData.length,
        vesselManifests: vesselManifestsData.length,
        costAllocation: costAllocationData.length,
        voyageList: voyageListData.length,
        bulkActions: bulkActionsData.length,
        masterFacilities: masterFacilitiesData.length,
        vesselClassifications: vesselClassificationsData.length
      });
      
      // Apply data enhancement with processors
      const enhancedData = enhanceDataWithProcessors(
        voyageEventsData,
        vesselManifestsData,
        costAllocationData,
        voyageListData,
        bulkActionsData,
        masterFacilitiesData,
        vesselClassificationsData
      );
      
      // Update state with enhanced data
      setVoyageEventsState(enhancedData.voyageEvents);
      setVesselManifestsState(enhancedData.vesselManifests);
      setCostAllocationState(enhancedData.costAllocation);
      setVoyageListState(enhancedData.voyageList);
      setBulkActionsState(enhancedData.bulkActions);
      
      // Convert PostgreSQL reference data to match frontend types
      const convertedMasterFacilities = masterFacilitiesData.map((facility: any) => ({
        locationName: facility.locationName,
        facilityType: facility.facilityType,
        parentFacility: facility.parentFacility,
        isProductionCapable: facility.isProductionCapable,
        isDrillingCapable: facility.isDrillingCapable,
        productionLCs: facility.productionLCs || [],
        region: facility.region,
        notes: facility.notes || '',
        isActive: facility.isActive
      }));
      
      const convertedVesselClassifications = vesselClassificationsData.map((vessel: any) => ({
        vesselName: vessel.vesselName,
        standardizedVesselName: vessel.standardizedVesselName,
        company: vessel.company,
        size: vessel.size,
        vesselType: vessel.vesselType,
        vesselCategory: vessel.vesselCategory,
        sizeCategory: vessel.sizeCategory,
        yearBuilt: vessel.yearBuilt,
        flag: vessel.flag,
        isActive: vessel.isActive
      }));
      
      setMasterFacilitiesState(convertedMasterFacilities);
      setVesselClassificationsState(convertedVesselClassifications);
        
        const hasAnyData = voyageEventsData.length > 0 || 
                           vesselManifestsData.length > 0 || 
                           costAllocationData.length > 0 ||
                           voyageListData.length > 0 ||
                           bulkActionsData.length > 0;
        
        setIsDataReadyState(hasAnyData);
        setLastUpdated(hasAnyData ? new Date() : null);
        setIsLoading(false);
        
        // Cache the enhanced data in local storage for offline access
        if (hasAnyData) {
          console.log('💾 Caching enhanced PostgreSQL data to local storage...');
          const dataStore: StorageData = {
            voyageEvents: enhancedData.voyageEvents,
            vesselManifests: enhancedData.vesselManifests,
            costAllocation: enhancedData.costAllocation,
            voyageList: enhancedData.voyageList,
            bulkActions: enhancedData.bulkActions,
            masterFacilities: convertedMasterFacilities,
            vesselClassifications: convertedVesselClassifications
          };
          
          await indexedDBService.saveAllData(convertToIndexedDBFormat(dataStore));
          console.log('✅ Data cached successfully');
        }
        
        return hasAnyData;
      
    } catch (error) {
      console.error('❌ Failed to load data from PostgreSQL:', error);
      setError('Failed to load data from database. Please check your connection.');
      setIsLoading(false);
      
      // Fallback to cached data if PostgreSQL fails
      console.log('🔄 Falling back to cached data...');
      return await loadStoredData();
    }
  }, [loadStoredData]);

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

  // Load data from cache on mount ONLY (no automatic PostgreSQL calls)
  useEffect(() => {
    if (!initialDataLoaded) {
      setInitialDataLoaded(true);
      // Only load from local storage on mount to prevent flashing
      console.log('🔄 Loading cached data on mount...');
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
    loadDataFromPostgreSQL,
    saveAllData,
    clearAllData,
    setError,
    setIsLoading,
    setIsDataReady,
    getStorageInfo,
    
    // Debug function for troubleshooting dashboard data
    debugDashboardData: () => {
      console.clear(); // Clear console first
      
      console.log('🔍 === DRILLING DASHBOARD DATA DEBUG ===');
      console.log('Data Overview:', {
        totalVoyageEvents: voyageEvents.length,
        totalBulkActions: bulkActions.length,
        totalCostAllocation: costAllocation.length,
        isDataReady
      });
      
      if (bulkActions.length === 0) {
        console.log('❌ NO BULK ACTIONS FOUND - This is likely the root cause!');
        return;
      }
      
      // Concise bulk actions analysis
      const drillingCount = bulkActions.filter(a => a.isDrillingFluid).length;
      const completionCount = bulkActions.filter(a => a.isCompletionFluid).length;
      const neitherCount = bulkActions.filter(a => !a.isDrillingFluid && !a.isCompletionFluid).length;
      const totalVolume = bulkActions.reduce((sum, a) => sum + (a.volumeBbls || 0), 0);
      
      console.log('🧪 BULK ACTIONS SUMMARY:');
      console.log(`Total Actions: ${bulkActions.length}`);
      console.log(`Drilling Fluids: ${drillingCount} (${((drillingCount/bulkActions.length)*100).toFixed(1)}%)`);
      console.log(`Completion Fluids: ${completionCount} (${((completionCount/bulkActions.length)*100).toFixed(1)}%)`);
      console.log(`Unclassified: ${neitherCount} (${((neitherCount/bulkActions.length)*100).toFixed(1)}%)`);
      console.log(`Total Volume: ${totalVolume.toLocaleString()} bbls`);
      
      // Sample data analysis
      const sampleActions = bulkActions.slice(0, 3);
      console.log('📋 SAMPLE BULK ACTIONS:');
      sampleActions.forEach((action, i) => {
        console.log(`${i + 1}. Type: "${action.bulkType}" | Description: "${action.bulkDescription}" | Volume: ${action.volumeBbls} bbls | Drilling: ${action.isDrillingFluid} | Completion: ${action.isCompletionFluid}`);
      });
      
      // Show unique types (limited)
      const uniqueTypes = [...new Set(bulkActions.map(a => a.bulkType).filter(Boolean))].slice(0, 10);
      console.log('📝 BULK TYPES (first 10):', uniqueTypes);
      
      // Test proper fluid classification on samples
      console.log('🧪 FLUID CLASSIFICATION TEST:');
      sampleActions.forEach((action, i) => {
        const combined = `${action.bulkType || ''} ${action.bulkDescription || ''}`;
        const classification = classifyBulkFluid(action.bulkType || '', action.bulkDescription || '');
        console.log(`${i + 1}. "${combined}" -> Category: ${classification.category}, Drilling: ${classification.isDrillingFluid}, Completion: ${classification.isCompletionFluid}, Type: ${classification.specificType || 'N/A'}`);
      });
      
      // Check if PostgreSQL data has the expected field structure
      console.log('🗃️ POSTGRESQL DATA FIELD CHECK:');
      if (sampleActions.length > 0) {
        const firstAction = sampleActions[0];
        const expectedFields = [
          'portType', 'vesselName', 'startDate', 'action', 'qty', 'unit', 'ppg',
          'bulkType', 'bulkDescription', 'atPort', 'destinationPort', 'remarks', 'tank',
          'volumeBbls', 'volumeGals', 'fluidClassification', 'fluidCategory', 
          'isDrillingFluid', 'isCompletionFluid'
        ];
        
        const missingFields = expectedFields.filter(field => !(field in firstAction));
        const extraFields = Object.keys(firstAction).filter(field => !expectedFields.includes(field));
        
        console.log('Missing expected fields:', missingFields);
        console.log('Extra fields from PostgreSQL:', extraFields);
        console.log('All available fields:', Object.keys(firstAction));
      }
      
      console.log('🔍 === END DEBUG ===');
    }
  };
};

// Helper functions for data enhancement

/**
 * Detect Non-Productive Time (NPT) events
 */
const detectNPT = (parentEvent: string, event: string, remarks: string): boolean => {
  const combined = `${parentEvent || ''} ${event || ''} ${remarks || ''}`.toLowerCase();
  
  return combined.includes('waiting') || 
         combined.includes('delay') ||
         combined.includes('breakdown') || 
         combined.includes('weather') ||
         combined.includes('standby') || 
         combined.includes('equipment failure') ||
         combined.includes('waiting on weather') ||
         combined.includes('equipment problems') ||
         combined.includes('mechanical problems');
};

/**
 * Calculate event costs based on hours and date
 */
const calculateEventCosts = (hours: number, eventDate: Date | string): any => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  const vesselSize = 250; // Default vessel size for cost calculation
  
  // Base hourly rate calculation (from CLAUDE.md)
  const baseHourlyRate = vesselSize > 300 ? 1500 : vesselSize > 250 ? 1200 : vesselSize > 200 ? 1000 : 800;
  const vesselHourlyRate = baseHourlyRate; // Assuming standard vessel type
  
  const totalCost = hours * vesselHourlyRate;
  const dailyRate = vesselHourlyRate * 24;
  
  return {
    vesselHourlyRate,
    vesselDailyRate: dailyRate,
    vesselCostTotal: totalCost,
    vesselCostRateDescription: `${vesselHourlyRate}/hr based on vessel size ${vesselSize}ft`
  };
};

/**
 * Calculate cargo efficiency for vessel manifests
 */
const calculateCargoEfficiency = (manifest: any): number => {
  const deckTons = manifest.deckTons || 0;
  const rtTons = manifest.rtTons || 0;
  const wetBulkBbls = manifest.wetBulkBbls || 0;
  const lifts = manifest.lifts || 0;
  
  // Simple efficiency calculation based on total cargo moved
  const totalCargoTons = deckTons + rtTons + (wetBulkBbls / 42); // Convert bbls to approximate tons
  const cargoScore = totalCargoTons + (lifts * 0.5); // Lifts contribute to efficiency
  
  return cargoScore;
};

// Note: Fluid classification is now handled by the proper classifyBulkFluid function
// from src/utils/bulkFluidClassification.ts which provides comprehensive keyword matching
// and proper categorization for drilling, completion, and production fluids.