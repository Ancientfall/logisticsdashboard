// types/index.ts
// Complete TypeScript interface definitions for BP Logistics Dashboard
// Based on PowerBI data model and PowerQuery transformations

// ==================== CORE DATA ENTITIES ====================

export interface VoyageEvent {
  // Identifiers
  id: string;
  mission: string;
  vessel: string;
  voyageNumber: string;
  
  // Event Details
  event?: string;
  parentEvent: string;
  location: string;
  originalLocation: string;
  mappedLocation: string;
  quay?: string;
  remarks?: string;
  
  // Time Information
  from: Date;
  to: Date;
  hours: number;
  finalHours: number; // After LC allocation
  eventDate: Date;
  eventYear: number;
  quarter: string;
  monthNumber: number;
  monthName: string;
  weekOfYear: number;
  dayOfWeek: string;
  dayOfMonth: number;
  
  // Classification
  portType: 'rig' | 'base';
  locationType: 'Offshore' | 'Onshore' | 'Other';
  activityCategory: 'Productive' | 'Non-Productive' | 'Needs Review - Null Event' | 'Uncategorized';
  eventCategory?: string;
  
  // Business Logic Fields
  department?: 'Drilling' | 'Production' | 'Logistics';
  costDedicatedTo?: string;
  lcNumber?: string;
  originalLCLocation?: string;
  lcPercentage?: number;
  mappingStatus: 'LC Mapped' | 'Special Case Mapping' | 'No LC Info' | 'LC Not Mapped' | 'Error in Expansion';
  dataIntegrity: 'Valid' | 'Valid - Special Case' | 'Missing LC' | 'Unknown LC' | 'Error';
  
  // Metadata
  isActive?: boolean;
  ins500m?: string;
  year: number;
  
  // Additional computed fields
  company?: string;
  standardizedVoyageNumber?: string;
  
  // Vessel Cost Information
  vesselCostTotal?: number;        // Total cost for this event (hourly rate * finalHours)
  vesselDailyRate?: number;        // Daily rate applied for this event date
  vesselHourlyRate?: number;       // Hourly rate (dailyRate / 24)
  vesselCostRateDescription?: string; // Description of rate period used
}

export interface VesselManifest {
  // Identifiers
  id: string;
  voyageId: string;
  standardizedVoyageId: string;
  manifestNumber: string;
  transporter: string; // Vessel name
  
  // Location Information
  from: string;
  offshoreLocation: string;
  mappedLocation: string;
  
  // Cargo Information
  deckLbs: number;
  deckTons: number;
  rtTons: number;
  lifts: number;
  wetBulkBbls: number;
  wetBulkGals: number;
  deckSqft: number;
  
  // Time Information
  manifestDate: Date;
  manifestDateOnly: Date;
  month: string;
  monthNumber: number;
  quarter: string;
  year: number;
  
  // Business Logic
  costCode?: string;
  finalDepartment?: 'Drilling' | 'Production' | 'Logistics';
  cargoType: 'Deck Cargo' | 'Below Deck Cargo' | 'Liquid Bulk' | 'Lift Only' | 'Other/Mixed';
  
  // Additional Fields
  remarks?: string;
  company?: string;
  vesselType?: string;
  
  // PowerBI-Inspired Analytics Fields
  isIntegratedFacility?: boolean;        // True for Thunder Horse/Mad Dog facilities
  isDrillingActivity?: boolean;          // True if determined to be drilling-related
  costCodeMatchFound?: boolean;          // True if cost code was found in CostAllocation
  originalLocationFromCost?: string;     // Original location from cost allocation lookup
}

export interface MasterFacility {
  // Core Information
  locationName: string;
  facilityType: 'Production' | 'Drilling' | 'Integrated' | 'Logistics';
  parentFacility?: string;
  
  // Capabilities
  isProductionCapable: boolean;
  isDrillingCapable: boolean;
  
  // Business Logic
  productionLCs?: string[];
  region?: string;
  
  // Metadata
  notes?: string;
  isActive: boolean;
}

export interface CostAllocation {
  // Core Fields
  lcNumber: string;
  locationReference: string;
  description?: string;
  costElement?: string;
  
  // Project Information
  projectType?: 'Drilling' | 'Completions' | 'Production' | 'Maintenance' | 'Operator Sharing';
  
  // Time Information
  monthYear?: string;
  month?: number;
  year?: number;
  costAllocationDate?: Date;  // NEW: Date used for vessel rate calculation
  
  // Cost Information
  totalAllocatedDays?: number;
  averageVesselCostPerDay?: number;
  totalCost?: number;
  costPerHour?: number;
  
  // Budgeted Vessel Cost Information (NEW)
  budgetedVesselCost?: number;      // Total allocated days × vessel daily rate
  vesselDailyRateUsed?: number;     // Daily rate applied for this time period
  vesselRateDescription?: string;   // Description of rate period (e.g., "Jan 2024 - Mar 2025: $33,000/day")
  
  // Rig Location Information
  rigLocation?: string;
  rigType?: string;
  waterDepth?: number;
  
  // Additional Information
  mission?: string;
  department?: 'Drilling' | 'Production' | 'Logistics';
  isActive: boolean;
}

export interface VesselClassification {
  // Core Information
  vesselName: string;
  standardizedVesselName: string;
  company: string;
  
  // Specifications
  size: number; // Length in feet
  vesselType: 'FSV' | 'OSV' | 'Support' | 'Specialty' | 'Other';
  vesselCategory: string;
  sizeCategory: 'Small' | 'Medium' | 'Large';
  
  // Additional Information
  yearBuilt?: number;
  flag?: string;
  isActive: boolean;
}

export interface VoyageList {
  // Core Identifiers
  id: string;                           // For internal use
  uniqueVoyageId: string;              // From PowerQuery: Year_Month_Vessel_VoyageNumber
  standardizedVoyageId: string;        // From PowerQuery: YYYY-MM-Vessel-VVV format
  vessel: string;
  standardizedVesselName: string;
  voyageNumber: number;
  
  // Time Information
  year: number;
  month: string;                       // jan, feb, mar, etc.
  monthNumber: number;                 // 1-12
  startDate: Date;
  endDate?: Date;
  voyageDate: Date;                    // Date.From(startDate)
  durationHours?: number;              // Calculated duration in hours (rounded to 2 decimal places)
  
  // Voyage Details
  edit?: string;                       // Edit column from Excel
  type?: string;                       // Type column from Excel
  mission: string;
  routeType?: string;                  // Route Type column from Excel
  locations: string;                   // Original locations string like "Fourchon -> Na Kika -> Thunder Horse PDQ"
  locationList: string[];              // Parsed array of locations split by "->"
  
  // Voyage Analysis
  stopCount: number;                   // Count of locations in locationList
  includesProduction: boolean;         // Based on production platform detection
  includesDrilling: boolean;           // Based on drilling location detection
  voyagePurpose: 'Production' | 'Drilling' | 'Mixed' | 'Other'; // Based on includes flags
  originPort?: string;                 // First location in locationList
  mainDestination?: string;            // Second location in locationList (main offshore destination)
  
  // Status
  isActive: boolean;                   // For filtering
}

export interface BulkAction {
  // Core Information
  id: string;
  portType: 'rig' | 'base';
  vesselName: string;
  startDate: Date;
  
  // Action Details
  action: string;
  qty: number;
  unit: 'bbl' | 'gal' | 'ton' | 'lbs';
  ppg?: string;
  
  // Fluid Information
  bulkType: string;
  bulkDescription?: string;
  fluidClassification: string;
  fluidCategory: string;
  productionChemicalType?: string;
  
  // Location Information
  atPort: string;
  standardizedOrigin: string;
  destinationPort?: string;
  standardizedDestination?: string;
  productionPlatform?: string;
  
  // Calculated Fields
  volumeBbls: number;
  isReturn: boolean;
  
  // Time Intelligence
  monthNumber: number;
  year: number;
  monthName: string;
  monthYear: string;
  
  // Additional Information
  remarks?: string;
  tank?: string;
}

// ==================== SUPPORTING TYPES ====================

export interface VoyageSegment {
  // Identifiers
  uniqueVoyageId: string;              // From parent voyage
  standardizedVoyageId: string;        // From parent voyage
  vessel: string;
  voyageNumber: number;
  
  // Segment Information
  segmentNumber: number;               // 1, 2, 3, etc. for multi-stop voyages
  origin: string;                      // Origin location for this segment
  destination: string;                 // Destination location for this segment
  originStandardized: string;          // Trimmed origin
  destinationStandardized: string;     // Trimmed destination
  
  // Time Information
  year: number;
  month: string;                       // jan, feb, mar, etc.
  monthNumber: number;                 // 1-12
  voyageStartDate: Date;               // Parent voyage start date
  voyageEndDate?: Date;                // Parent voyage end date
  segmentDate: Date;                   // Date.From(voyageStartDate)
  
  // Classification from PowerQuery
  segmentType: 'Outbound' | 'Return' | 'Intermediate'; // Based on position in voyage
  isProductionSegment: boolean;        // Destination is production platform
  isDrillingSegment: boolean;          // Destination is drilling location
  isOffshoreSegment: boolean;          // Not Fourchon and not Port location
  
  // Fourchon Detection
  originIsFourchon: boolean;           // Origin = "Fourchon"
  destinationIsFourchon: boolean;      // Destination = "Fourchon"
  
  // Facility Classification
  isIntegratedFacility: boolean;       // Thunder Horse PDQ, Thunder Horse, Mad Dog
  
  // Department Classification (from PowerQuery logic)
  directDepartment: 'Drilling' | 'Production' | 'Integrated' | 'Other'; // Based on destination analysis
  isIntegratedDepartment: boolean;     // directDepartment = "Integrated"
  departmentDestination: string;       // Destination + " - " + directDepartment
  voyagePurpose: 'Production' | 'Drilling' | 'Integrated' | 'Other'; // Based on segment type
  finalDepartment: 'Drilling' | 'Production' | 'Integrated' | 'Other'; // Final department assignment
  
  // Facility-Specific Flags
  isThunderHorse: boolean;             // Contains "Thunder Horse" or "Thunder horse"
  isMadDog: boolean;                   // Contains "Mad Dog"
  
  // Voyage Pattern Analysis
  voyagePattern: 'Outbound' | 'Return' | 'Offshore Transfer' | 'Round Trip'; // Based on Fourchon analysis
  isStandardPattern: boolean;          // Standard outbound/return pattern with Fourchon
}

// ==================== COMPUTED/DERIVED TYPES ====================

export interface KPIMetrics {
  // Time Metrics
  totalOffshoreTime: number;
  totalOnshoreTime: number;
  productiveHours: number;
  nonProductiveHours: number;
  
  // Drilling Metrics
  drillingHours: number;
  drillingNPTHours: number;
  drillingNPTPercentage: number;
  drillingCargoOpsHours: number;
  
  // Waiting Time Metrics
  waitingTimeOffshore: number;
  waitingTimePercentage: number;
  weatherWaitingHours: number;
  installationWaitingHours: number;
  
  // Cargo Metrics
  cargoOpsHours: number;
  liftsPerCargoHour: number;
  totalLifts: number;
  totalDeckTons: number;
  totalRTTons: number;
  
  // Efficiency Metrics
  vesselUtilizationRate: number;
  averageTripDuration: number;
  cargoTonnagePerVisit: number;
  
  // Vessel Cost Metrics
  totalVesselCost: number;
  averageVesselCostPerHour: number;
  averageVesselCostPerDay: number;
  vesselCostByDepartment: Record<string, { cost: number; hours: number; events: number }>;
  vesselCostByActivity: Record<string, { cost: number; hours: number; events: number }>;
  vesselCostRateBreakdown: Record<string, { cost: number; hours: number; events: number }>;
  
  // Budget vs Actual Cost Analysis (NEW)
  budgetVsActualAnalysis?: {
    totalBudgetedVesselCost: number;
    totalActualVesselCost: number;
    totalVariance: number;
    totalVariancePercentage: number;
    lcCount: number;
    lcsOverBudget: number;
    lcsUnderBudget: number;
    lcComparison: Record<string, {
      lcNumber: string;
      budgetedCost: number;
      actualCost: number;
      variance: number;
      variancePercentage: number;
      budgetedDays: number;
      actualDays: number;
      budgetedRate: number;
      actualRate: number;
    }>;
  };
  
  // Voyage List Metrics
  voyageListMetrics?: {
    // Basic Voyage Metrics
    totalVoyages: number;
    averageVoyageDuration: number;       // In hours
    avgVoyageDurationMoMChange: number;
    averageStopsPerVoyage: number;
    multiStopPercentage: number;         // Percentage of voyages with >2 stops
    
    // Voyage Purpose Distribution
    productionVoyagePercentage: number;  // % of voyages with production purpose
    drillingVoyagePercentage: number;    // % of voyages with drilling purpose
    mixedVoyagePercentage: number;       // % of voyages with mixed purpose
    otherVoyagePercentage: number;       // % of voyages with other purpose
    voyagePurposeDistribution: Record<string, number>;
    
    // Pattern Analysis
    outboundPatternPercentage: number;   // % following standard Fourchon outbound pattern
    returnPatternPercentage: number;     // % following standard Fourchon return pattern
    offshoreTransferPercentage: number;  // % of offshore-to-offshore transfers
    roundTripPercentage: number;         // % of round trips
    standardPatternPercentage: number;   // % following standard patterns
    
    // Facility-Specific Metrics
    thunderHorseVoyagePercentage: number; // % involving Thunder Horse
    madDogVoyagePercentage: number;      // % involving Mad Dog
    integratedFacilityPercentage: number; // % involving integrated facilities
    
    // Department Distribution
    drillingDepartmentPercentage: number;
    productionDepartmentPercentage: number;
    integratedDepartmentPercentage: number;
    otherDepartmentPercentage: number;
    
    // Efficiency Metrics
    mixedVoyageEfficiency: number;       // Efficiency score for mixed voyages
    routeEfficiencyScore: number;        // Overall route efficiency
    consolidationBenefit: number;        // Benefit from voyage consolidation
    
    // Vessel Utilization
    activeVesselsThisMonth: number;
    voyagesPerVessel: number;            // Average voyages per vessel
    vesselUtilizationRate: number;       // Based on voyage frequency
    
    // Popular Destinations
    popularDestinations: Array<{ 
      destination: string; 
      count: number; 
      percentage: number;
      departmentDistribution: Record<string, number>;
    }>;
    
    // Temporal Analysis
    peakSeasonIndicator: string;         // Based on voyage volume
    monthlyVoyageDistribution: Record<string, number>;
    
    // Quality Metrics
    onTimeVoyagePercentage: number;      // Based on planned vs actual
    averageExecutionEfficiency: number;  // Execution efficiency score
    routeConcentration: number;          // Concentration of routes
    
    // Advanced Analytics
    segmentAnalysis: {
      totalSegments: number;
      averageSegmentsPerVoyage: number;
      productionSegmentPercentage: number;
      drillingSegmentPercentage: number;
      offshoreSegmentPercentage: number;
      fourchonOriginPercentage: number;
      fourchonDestinationPercentage: number;
    };
  };
  
  // Month-over-Month Changes
  momChanges: {
    waitingTimePercentage: number;
    cargoOpsHours: number;
    liftsPerCargoHour: number;
    drillingNPTPercentage: number;
    vesselUtilizationRate: number;
    totalVesselCost: number;
    averageVesselCostPerHour: number;
  };
}

export interface CompanyPerformance {
  company: string;
  totalHours: number;
  productiveHours: number;
  nonProductiveHours: number;
  productivePercentage: number;
  waitingPercentage: number;
  performanceScore: number;
  vesselCount: number;
  averageHoursPerVessel: number;
}

export interface LocationAnalytics {
  location: string;
  facilityType: string;
  totalVisits: number;
  totalHours: number;
  averageHoursPerVisit: number;
  cargoTonnage: number;
  isDrilling: boolean;
  isProduction: boolean;
}

export interface FluidAnalytics {
  fluidType: string;
  totalVolume: number;
  percentage: number;
  shipmentCount: number;
  averageVolumePerShipment: number;
  returnVolume: number;
  returnPercentage: number;
}

// ==================== FILTER AND SELECTION TYPES ====================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardFilters {
  selectedMonth?: string;
  selectedYear?: number;
  selectedCompany?: string;
  selectedVessel?: string;
  selectedDepartment?: 'Drilling' | 'Production' | 'Logistics';
  selectedFacilityType?: string;
  selectedLocation?: string;
  dateRange?: DateRange;
  selectedVesselType?: string;
  selectedActivityCategory?: 'Productive' | 'Non-Productive';
}

// ==================== DATA PROCESSING TYPES ====================

export interface ProcessingStatus {
  stage: 'idle' | 'reading' | 'transforming' | 'validating' | 'complete' | 'error';
  progress: number;
  message: string;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recordCount: number;
  duplicateCount: number;
  missingFieldCount: number;
}

export interface DataQuality {
  voyageEvents: ValidationResult;
  vesselManifests: ValidationResult;
  masterFacilities: ValidationResult;
  costAllocation: ValidationResult;
  vesselClassifications: ValidationResult;
  voyageList: ValidationResult;
  bulkActions: ValidationResult;
  overallQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

// ==================== CHART AND VISUALIZATION TYPES ====================

export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  color?: string;
  percentage?: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
}

export interface TreemapDataPoint {
  name: string;
  size: number;
  category: string;
  color?: string;
  children?: TreemapDataPoint[];
}

// ==================== API AND EXPORT TYPES ====================

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  dateRange?: DateRange;
  filters?: DashboardFilters;
  includeCharts: boolean;
  includeRawData: boolean;
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  dateRange: DateRange;
  filters: DashboardFilters;
  sections: string[];
  includeExecutiveSummary: boolean;
  includeDetailedAnalysis: boolean;
  includeRecommendations: boolean;
}

// ==================== UTILITY TYPES ====================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

// ==================== ERROR AND LOADING TYPES ====================

export interface DataError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  source: string;
}

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

// ==================== BUSINESS RULE TYPES ====================

export interface LCAllocationRule {
  lcNumber: string;
  percentage: number;
  location: string;
  department: string;
  isSpecialCase: boolean;
}

export interface ActivityClassificationRule {
  parentEvent: string;
  event?: string;
  category: 'Productive' | 'Non-Productive';
  description: string;
}

export interface FacilityClassificationRule {
  location: string;
  facilityType: string;
  isDrilling: boolean;
  isProduction: boolean;
  specialHandling?: string;
}