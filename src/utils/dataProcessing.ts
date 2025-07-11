// src/utils/dataProcessing.ts
import { 
  VoyageEvent, 
  VesselManifest, 
  MasterFacility, 
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction,
  KPIMetrics,
  DateRange,
  DashboardFilters 
} from '../types';
import { masterFacilitiesData } from '../data/masterFacilities';
import { classifyBulkFluid, BulkFluidCategory } from './bulkFluidClassification';

// Import new modular functions
import { readExcelFile } from './excel/excelReader';
import { processCostAllocation } from './processors/costAllocationProcessor';
import { processVoyageEvents } from './processors/voyageEventProcessor';
import { processVesselManifestsWithSegments } from './processors/vesselManifestProcessor';
import { processVoyageList } from './processors/voyageListProcessor';
import { calculateMetrics } from './metricsCalculation';
import { createFacilitiesMap, createCostAllocationMap } from './helpers';
import { createVoyageSegments } from './voyageProcessing';

// ===================== RAW DATA INTERFACES =====================
// These represent the data as it comes from Excel files

interface RawVoyageEvent {
  Mission: string;
  Event?: string | null;
  "Parent Event": string;
  Location: string;
  Quay?: string;
  Remarks?: string | null;
  "Is active?": string;
  From: string;
  To?: string;
  Hours: number;
  "Port Type": string;
  "Event Category"?: string;
  Year: number;
  "Ins. 500m"?: string;
  "Cost Dedicated to"?: string | null;
  Vessel: string;
  "Voyage #": number;
}

interface RawVesselManifest {
  "Voyage Id": number;
  "Manifest Number": string;
  Transporter: string;
  Type?: string;
  "Manifest Date": string;
  "Cost Code"?: string;
  From: string;
  "Offshore Location": string;
  "Deck Lbs": number;
  "deck tons (metric)": number;
  "RT Tons": number;
  RTLifts: number;              // RT Lifts field (no space in Excel)
  Lifts: number;
  "Wet Bulk (bbls)": number;
  "Wet Bulk Gal": number;
  "RTWet Bulk Gal": number;     // RT Wet Bulk field
  "Deck Sqft": number;
  Remarks?: string;
  Year: number;
}

interface RawCostAllocation {
  "LC Number": string;
  "Location Reference"?: string;  // Legacy field name
  "Rig Reference"?: string;       // UPDATED: Actual Excel header
  Description?: string;
  "Cost Element"?: string;
  "Month-Year"?: string | number | Date;  // UPDATED: Support multiple date formats
  Mission?: string;
  "Project Type"?: string;
  
  // Cost Information - multiple possible field names
  "Total Allocated Days"?: number;  // Legacy field name
  "Alloc (days)"?: number;          // UPDATED: Actual Excel header
  "Allocated Days"?: number;
  "Days"?: number;
  "Average Vessel Cost Per Day"?: number;
  "Total Cost"?: number;
  "Amount"?: number;
  "Cost Per Hour"?: number;
  
  // Rig Location Information
  "Rig Location"?: string;
  "Rig Type"?: string;
  "Water Depth"?: number;
}

interface RawVoyageList {
  Edit?: string;
  Vessel: string;
  "Voyage Number": number;
  Year: number;
  Month: string;
  "Start Date": string;
  "End Date"?: string;
  Type?: string;
  Mission: string;
  "Route Type"?: string;
  Locations: string;
}

// ===================== PROCESSING OPTIONS & RESULTS =====================

// Processing options interface
interface ProcessingOptions {
  voyageEventsFile: File | null;
  voyageListFile: File | null;
  vesselManifestsFile: File | null;
  costAllocationFile: File | null;
  vesselClassificationsFile?: File | null;
  bulkActionsFile?: File | null;
  useMockData?: boolean;
}

// Processing results interface
export interface ProcessingResults {
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  metrics: KPIMetrics;
  errors: string[];
  warnings: string[];
}

// ===================== MAIN PROCESSING FUNCTION =====================

/**
 * Process Excel files and return a data store
 */
export const processExcelFiles = async (options: ProcessingOptions): Promise<ProcessingResults & { metrics: KPIMetrics; dateRange: DateRange; filters: DashboardFilters }> => {
  const {
    voyageEventsFile,
    voyageListFile,
    vesselManifestsFile,
    costAllocationFile,
    vesselClassificationsFile,
    bulkActionsFile,
    useMockData = false
  } = options;

  // If using mock data, return mock data store
  if (useMockData) {
    return createMockDataStore();
  }

  // Validate files - masterFacilitiesFile no longer required as it's hardcoded
  if (!voyageEventsFile || !costAllocationFile) {
    throw new Error('Voyage Events and Cost Allocation files must be provided');
  }

  try {
    // Process files
    const results = await processFiles({
      voyageEventsFile,
      voyageListFile,
      vesselManifestsFile,
      costAllocationFile,
      vesselClassificationsFile,
      bulkActionsFile
    });

    // Calculate metrics using new modular function
    const metrics = calculateMetrics(
      results.voyageEvents,
      results.vesselManifests,
      results.voyageList,
      results.costAllocation
    );

    // Create data store
    return {
      voyageEvents: results.voyageEvents,
      vesselManifests: results.vesselManifests,
      masterFacilities: results.masterFacilities,
      costAllocation: results.costAllocation,
      vesselClassifications: results.vesselClassifications,
      voyageList: results.voyageList,
      bulkActions: results.bulkActions,
      metrics,
      errors: results.errors,
      warnings: results.warnings,
      dateRange: getDateRange(results.voyageEvents, results.costAllocation),
      filters: getDefaultFilters()
    };
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
};

/**
 * Process all Excel files and return processed data
 */
const processFiles = async (files: {
  voyageEventsFile: File | null;
  voyageListFile: File | null;
  vesselManifestsFile: File | null;
  costAllocationFile: File | null;
  vesselClassificationsFile?: File | null;
  bulkActionsFile?: File | null;
}): Promise<ProcessingResults> => {
  try {
    console.log('Starting Excel file processing...');

    // Read all required Excel files using new modular function
    const voyageEventsFile = files.voyageEventsFile!;
    const costAllocationFile = files.costAllocationFile!;
    
    // Read required Excel files
    const rawVoyageEvents = await readExcelFile<RawVoyageEvent>(voyageEventsFile);
    const rawCostAllocation = await readExcelFile<RawCostAllocation>(costAllocationFile);
    
    // Use static master facilities data instead of file upload
    const staticMasterFacilities = masterFacilitiesData;
    
    // Read optional files with null checks
    const rawVesselManifests = files.vesselManifestsFile ? 
      await readExcelFile<RawVesselManifest>(files.vesselManifestsFile) : [];
    const rawVoyageList = files.voyageListFile ? 
      await readExcelFile<RawVoyageList>(files.voyageListFile) : [];
    const rawVesselClassifications = files.vesselClassificationsFile ? 
      await readExcelFile<any>(files.vesselClassificationsFile) : [];
    const rawBulkActions = files.bulkActionsFile ? 
      await readExcelFile<any>(files.bulkActionsFile) : [];

    console.log('Excel files read successfully:', {
      voyageEvents: rawVoyageEvents.length,
      vesselManifests: rawVesselManifests.length,
      masterFacilities: staticMasterFacilities.length,
      costAllocation: rawCostAllocation.length,
      voyageList: rawVoyageList.length,
      vesselClassifications: rawVesselClassifications.length,
      bulkActions: rawBulkActions.length
    });

    // Process reference data first (needed for lookups) using new modular functions
    // Use static master facilities data directly (already in correct format)
    const masterFacilities = staticMasterFacilities.map(facility => ({
      locationName: facility.locationName,
      facilityType: facility.facilityType as 'Production' | 'Drilling' | 'Integrated' | 'Logistics',
      parentFacility: facility.parentFacility || undefined,
      isProductionCapable: facility.isProductionCapable,
      isDrillingCapable: facility.isDrillingCapable,
      productionLCs: facility.productionLCs ? facility.productionLCs.split(',').map(lc => lc.trim()) : undefined,
      region: facility.region,
      notes: undefined,
      isActive: true
    }));
    
    // Process cost allocation using new modular function
    const costAllocation = processCostAllocation(rawCostAllocation);

    console.log('Reference data processed');

    // Create lookup maps for better performance using new modular functions
    const facilitiesMap = createFacilitiesMap(masterFacilities);
    const costAllocationMap = createCostAllocationMap(costAllocation);

    // Process main data entities using new modular functions
    const voyageEvents = processVoyageEvents(rawVoyageEvents, facilitiesMap, costAllocationMap);
    const voyageList = processVoyageList(rawVoyageList);
    
    // Create voyage segments from voyage list
    const voyageSegments = voyageList.flatMap(voyage => createVoyageSegments(voyage));
    console.log(`Created ${voyageSegments.length} voyage segments from ${voyageList.length} voyages`);
    
    // Process vessel manifests with segment integration
    const vesselManifests = processVesselManifestsWithSegments(
      rawVesselManifests, 
      facilitiesMap, 
      costAllocationMap,
      voyageSegments
    );

    console.log('Main data processed:', {
      voyageEvents: voyageEvents.length,
      vesselManifests: vesselManifests.length,
      voyageList: voyageList.length
    });

    // Process optional data
    const vesselClassifications = processVesselClassifications(rawVesselClassifications);
    const bulkActions = processBulkActions(rawBulkActions);

    return {
      voyageEvents,
      vesselManifests,
      masterFacilities,
      costAllocation,
      vesselClassifications,
      voyageList,
      bulkActions,
      metrics: {
        totalOffshoreTime: 0,
        totalOnshoreTime: 0,
        productiveHours: 0,
        nonProductiveHours: 0,
        drillingHours: 0,
        drillingNPTHours: 0,
        drillingNPTPercentage: 0,
        drillingCargoOpsHours: 0,
        waitingTimeOffshore: 0,
        waitingTimePercentage: 0,
        weatherWaitingHours: 0,
        installationWaitingHours: 0,
        cargoOpsHours: 0,
        liftsPerCargoHour: 0,
        totalLifts: 0,
        totalDeckTons: 0,
        totalRTTons: 0,
        vesselUtilizationRate: 0,
        averageTripDuration: 0,
        cargoTonnagePerVisit: 0,
        
        // Vessel Cost Metrics (default values for early return)
        totalVesselCost: 0,
        averageVesselCostPerHour: 0,
        averageVesselCostPerDay: 0,
        vesselCostByDepartment: {},
        vesselCostByActivity: {},
        vesselCostRateBreakdown: {},
        
        momChanges: {
          waitingTimePercentage: 0,
          cargoOpsHours: 0,
          liftsPerCargoHour: 0,
          drillingNPTPercentage: 0,
          vesselUtilizationRate: 0,
          totalVesselCost: 0,
          averageVesselCostPerHour: 0
        }
      },
      errors: [],
      warnings: []
    };

  } catch (error) {
    console.error('Error processing files:', error);
    throw new Error(`Failed to process Excel files: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ===================== OPTIONAL DATA PROCESSORS =====================

const processVesselClassifications = (rawData: any[]): VesselClassification[] => {
  return rawData.map((item, index) => ({
    vesselName: item["Vessel Name"] || `Unknown-${index}`,
    standardizedVesselName: (item["Vessel Name"] || `Unknown-${index}`).trim(),
    company: item.Company || 'Unknown',
    size: item.Size || 0,
    vesselType: item["Vessel Type"] || 'Other',
    vesselCategory: item["Vessel Type"] || 'Other',
    sizeCategory: (item.Size || 0) <= 200 ? 'Small' : (item.Size || 0) <= 280 ? 'Medium' : 'Large',
    yearBuilt: item["Year Built"],
    flag: item.Flag,
    isActive: true
  }));
};

const processBulkActions = (rawData: any[]): BulkAction[] => {
  // Log first few items to see the actual data structure
  if (rawData.length > 0) {
    console.log('🔍 Sample bulk action raw data:', rawData.slice(0, 5));
    
    // Log unique bulk types for debugging
    const uniqueTypes = new Set(rawData.map(item => item["Bulk Type"]));
    console.log('📊 Unique bulk types in data:', Array.from(uniqueTypes));
  }
  
  return rawData.map((item, index) => {
    // Parse date once for efficiency
    const startDate = parseDate(item["Start Date"]) || new Date();
    
    // Use the new fluid classification system
    const bulkType = item["Bulk Type"] || 'Unknown';
    const bulkDescription = item["Bulk Description"] || '';
    const classification = classifyBulkFluid(bulkType, bulkDescription);
    
    // Log drilling/completion fluid detections
    if (index < 10 && (classification.isDrillingFluid || classification.isCompletionFluid)) {
      console.log(`✅ Detected ${classification.category}: Type="${bulkType}", Desc="${bulkDescription}"`);
    }
    
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
    
    // Calculate volume in barrels and gallons
    let volumeBbls = 0;
    let volumeGals = 0;
    const qty = parseFloat(item.Qty) || 0;
    const unit = (item.Unit || '').toLowerCase();
    const ppg = parseFloat(item["Pound Per Gallon"]) || 8.34; // Default to water density if not provided
    
    if (unit === 'gal' || unit === 'gals' || unit === 'gallons') {
      volumeGals = qty;
      volumeBbls = qty / 42; // Convert gallons to barrels
    } else if (unit === 'bbl' || unit === 'bbls' || unit === 'barrels') {
      volumeBbls = qty;
      volumeGals = qty * 42; // Convert barrels to gallons
    } else if (unit === 'ton' || unit === 'tons' || unit === 'mt') {
      // Convert tons to barrels using PPG
      // 1 ton = 2000 lbs, 1 barrel = 42 gallons
      // pounds / (ppg * 42) = barrels
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
    
    return {
      id: `bulk-${index}`,
      portType: item["Port Type"] || 'base',
      vesselName: item["Vessel Name"] || 'Unknown',
      startDate,
      action: item["Action"] || 'Unknown',
      qty,
      unit: item.Unit || 'bbl',
      ppg: item["Pound Per Gallon"],
      bulkType: item["Bulk Type"] || 'Unknown',
      bulkDescription: item["Bulk Description"],
      fluidClassification,
      fluidCategory: classification.category,
      fluidSpecificType: classification.specificType,
      isDrillingFluid: classification.isDrillingFluid,
      isCompletionFluid: classification.isCompletionFluid,
      productionChemicalType: classification.category === BulkFluidCategory.PRODUCTION_CHEMICAL ? item["Bulk Type"] : undefined,
      atPort: item["At Port"] || 'Unknown',
      standardizedOrigin: (item["At Port"] || 'Unknown').trim(),
      destinationPort: item["Destination Port"],
      standardizedDestination: item["Destination Port"] ? item["Destination Port"].trim() : undefined,
      productionPlatform: item["Destination Port"], // Assume destination is the platform
      volumeBbls,
      volumeGals,
      isReturn: (item.Remarks || '').toLowerCase().includes('return') || 
                (item["Action"] || '').toLowerCase().includes('return'),
      monthNumber: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      monthName: startDate.toLocaleString('default', { month: 'long' }),
      monthYear: startDate.toISOString().substring(0, 7),
      remarks: item.Remarks,
      tank: item.Tank
    } as BulkAction;
  });
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Parse date strings - simplified version for remaining usage
 */
const parseDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    console.warn(`⚠️ Could not parse date: "${dateStr}", using current date`);
    return new Date();
  } catch (error) {
    console.warn(`⚠️ Error parsing date: ${dateStr}`, error);
    return new Date();
  }
};

const getDateRange = (voyageEvents: VoyageEvent[], costAllocation: CostAllocation[] = []): DateRange => {
  const dates: Date[] = [];
  
  // Add dates from voyage events
  voyageEvents.forEach(event => {
    dates.push(event.eventDate);
    if (event.from) dates.push(event.from);
    if (event.to) dates.push(event.to);
  });
  
  // Add dates from cost allocation
  costAllocation.forEach(cost => {
    if (cost.costAllocationDate) {
      dates.push(cost.costAllocationDate);
    }
    // Also try to parse from monthYear if available
    if (cost.monthYear && cost.year && cost.month) {
      const date = new Date(cost.year, cost.month - 1, 15);
      if (!isNaN(date.getTime())) {
        dates.push(date);
      }
    }
  });
  
  // Filter out invalid dates and sort
  const validDates = dates
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (validDates.length === 0) {
    console.warn('⚠️ No valid dates found, using confirmed data range: Jan 1, 2024 - May 31, 2025');
    return {
      startDate: new Date(2024, 0, 1),  // January 1, 2024
      endDate: new Date(2025, 4, 31)    // May 31, 2025
    };
  }
  
  const range = {
    startDate: validDates[0],
    endDate: validDates[validDates.length - 1]
  };
  
  console.log(`📅 Date range calculated: ${range.startDate.toISOString().split('T')[0]} to ${range.endDate.toISOString().split('T')[0]}`);
  
  return range;
};

const getDefaultFilters = (): DashboardFilters => {
  // Default to January 2024 for consistency with data range
  return {
    selectedDepartment: 'Drilling',
    selectedMonth: '2024-01', // January 2024 in YYYY-MM format
    selectedYear: 2024
  };
};

/**
 * Create a mock data store for testing - DISABLED TO ENSURE REAL DATA IS USED
 */
export const createMockDataStore = (): ProcessingResults & { metrics: KPIMetrics; dateRange: DateRange; filters: DashboardFilters } => {
  console.warn('🚨 createMockDataStore called - this should only be used for testing!');
  console.warn('🚨 If you see this in production, real data is not being loaded properly!');
  
  // Return minimal empty data structure to force real data loading
  return {
    voyageEvents: [],
    vesselManifests: [],
    masterFacilities: [],
    costAllocation: [],
    vesselClassifications: [],
    voyageList: [],
    bulkActions: [],
    metrics: {
      totalOffshoreTime: 0,
      totalOnshoreTime: 0,
      productiveHours: 0,
      nonProductiveHours: 0,
      drillingHours: 0,
      drillingNPTHours: 0,
      drillingNPTPercentage: 0,
      drillingCargoOpsHours: 0,
      waitingTimeOffshore: 0,
      waitingTimePercentage: 0,
      weatherWaitingHours: 0,
      installationWaitingHours: 0,
      cargoOpsHours: 0,
      liftsPerCargoHour: 0,
      totalLifts: 0,
      totalDeckTons: 0,
      totalRTTons: 0,
      vesselUtilizationRate: 0,
      averageTripDuration: 0,
      cargoTonnagePerVisit: 0,
      totalVesselCost: 0,
      averageVesselCostPerHour: 0,
      averageVesselCostPerDay: 0,
      vesselCostByDepartment: {},
      vesselCostByActivity: {},
      vesselCostRateBreakdown: {},
      momChanges: {
        waitingTimePercentage: 0,
        cargoOpsHours: 0,
        liftsPerCargoHour: 0,
        drillingNPTPercentage: 0,
        vesselUtilizationRate: 0,
        totalVesselCost: 0,
        averageVesselCostPerHour: 0
      }
    },
    errors: ['Mock data disabled - please upload real Excel files'],
    warnings: ['This is empty mock data - real data should be loaded'],
    dateRange: {
      startDate: new Date(2024, 0, 1),  // January 1, 2024
      endDate: new Date(2025, 3, 30)    // April 30, 2025
    },
    filters: {
      selectedDepartment: 'Drilling',
      selectedMonth: new Date().toISOString().slice(0, 7),
      selectedYear: new Date().getFullYear()
    }
  };
};