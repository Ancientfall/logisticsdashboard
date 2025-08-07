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
  rtLifts: number;          // RT Lifts field
  lifts: number;
  wetBulkBbls: number;
  wetBulkGals: number;
  rtWetBulkGals: number;    // RT Wet Bulk field
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
  
  // Enhanced Location Information
  isDrilling?: boolean;           // True if this is a drilling activity
  isThunderHorse?: boolean;       // True if this is Thunder Horse related
  isMadDog?: boolean;            // True if this is Mad Dog related
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
  mission: string;                     // Mission type: 'Supply', 'Project', 'Offhire'
  missionType?: 'Supply' | 'Project' | 'Offhire'; // Normalized mission type
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
  fluidSpecificType?: string;
  isDrillingFluid: boolean;
  isCompletionFluid: boolean;
  productionChemicalType?: string;
  
  // Location Information
  atPort: string;
  standardizedOrigin: string;
  destinationPort?: string;
  standardizedDestination?: string;
  productionPlatform?: string;
  
  // Calculated Fields
  volumeBbls: number;
  volumeGals: number;
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

// ==================== VESSEL CODES TYPES ====================

export interface VesselCode {
  // Core Classification
  l1ParentEvent: string;          // L1 Parent Event (primary classification)
  l2Event: string;                // L2 Event (detailed classification)
  
  // Activity Classification
  activityCategory: 'Productive' | 'Non-Productive' | 'Standby' | 'Transit' | 'Maintenance';
  
  // Operational Context
  portTypeApplicable: 'rig' | 'base' | 'both' | 'any';
  isWeatherRelated: boolean;
  isCargoOperation: boolean;
  isTransitOperation: boolean;
  isMaintenanceOperation: boolean;
  
  // Additional Details
  description?: string;
  notes?: string;
  isActive: boolean;
}

export interface VesselCodeClassification {
  parentEvent: string;
  event: string;
  vesselCode: VesselCode | null;
  activityCategory: 'Productive' | 'Non-Productive' | 'Standby' | 'Transit' | 'Maintenance' | 'Uncategorized';
  confidence: 'High' | 'Medium' | 'Low';
  source: 'VesselCodes' | 'Fallback' | 'Manual';
  notes?: string;
}

// ==================== AUTHENTICATION AND API TYPES ====================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'viewer';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'manager' | 'viewer';
}

// API Response types
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  upload: {
    id: string;
    fileName: string;
    recordsProcessed: number;
    processingTime: number;
  };
}

export interface DashboardData {
  summary: {
    wells: {
      totalRecords: number;
      totalProduction: number;
      totalConsumption: number;
      avgEfficiency: number;
    };
    vessels: {
      totalVessels: number;
      uniqueVessels: number;
      avgUtilization: number;
    };
    fluidAnalyses: {
      totalAnalyses: number;
      avgOilContent: number;
      avgWaterContent: number;
      avgGasContent: number;
    };
  };
  recentActivity: {
    wells: WellOperation[];
    vessels: Vessel[];
  };
}

// Legacy types for backward compatibility
export interface WellOperation {
  id: string;
  date: string;
  well: string;
  production: number;
  consumption: number;
  location?: string;
  status?: string;
  efficiency?: number;
  uploadId?: string;
}

export interface Vessel {
  id: string;
  date: string;
  vessel: string;
  location?: string;
  cargo?: string;
  status?: string;
  eta?: string;
  capacity?: number;
  utilization?: number;
  uploadId?: string;
}

export interface FluidAnalysis {
  id: string;
  date: string;
  well: string;
  sample: string;
  oilContent?: number;
  waterContent?: number;
  gasContent?: number;
  pressure?: number;
  temperature?: number;
  uploadId?: string;
}

// ==================== VESSEL FORECASTING INTERFACES ====================

/**
 * Future demand prediction for a specific location
 */
export interface ForecastDemand {
  location: string;
  monthlyForecast: Record<string, number>; // month (YYYY-MM) -> predicted deliveries
  confidence: Record<string, number>; // confidence level for each month (0-1)
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern?: Record<string, number>; // seasonal adjustment factors
  growthRate: number; // monthly growth rate
  historicalAverage: number;
  notes?: string;
}

/**
 * Vessel capability forecast
 */
export interface VesselCapabilityForecast {
  vesselName: string;
  monthlyCapability: Record<string, number>; // month (YYYY-MM) -> predicted capability
  plannedMaintenance: Record<string, number>; // maintenance periods reducing capability
  utilizationForecast: Record<string, number>; // expected utilization rates
  performanceTrend: 'improving' | 'declining' | 'stable';
  averageCapability: number;
  notes?: string;
}

/**
 * Additional vessel requirement injections
 */
export interface VesselInject {
  id: string;
  name: string;
  description: string;
  type: 'drilling_campaign' | 'maintenance_project' | 'contract_change' | 'emergency_response' | 'special_project';
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
  vesselRequirement: number; // additional vessels needed (+) or capability reduction (-)
  locations: string[]; // affected locations
  impact: 'demand_increase' | 'demand_decrease' | 'capability_reduction' | 'capability_increase';
  priority: 'high' | 'medium' | 'low';
  probability: number; // 0-1, likelihood of this inject occurring
  cost?: number; // estimated cost impact
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Forecasting scenario configuration
 */
export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  type: 'base_case' | 'optimistic' | 'pessimistic' | 'custom';
  demandGrowthRate: number; // overall demand growth assumption
  capabilityGrowthRate: number; // fleet capability improvement assumption
  activeInjects: string[]; // inject IDs to include in this scenario
  confidenceThreshold: number; // minimum confidence level for predictions
  timeHorizon: number; // forecast horizon in months
  assumptions: string[];
  createdAt: Date;
  lastModified: Date;
}

/**
 * Complete forecast result for a scenario
 */
export interface ScenarioResult {
  scenario: ForecastScenario;
  forecastPeriod: {
    startMonth: string;
    endMonth: string;
    totalMonths: number;
  };
  
  // Demand forecasts
  locationForecasts: ForecastDemand[];
  totalDemandForecast: Record<string, number>; // month -> total demand
  drillingDemandForecast: Record<string, number>;
  productionDemandForecast: Record<string, number>;
  
  // Capability forecasts
  vesselCapabilityForecasts: VesselCapabilityForecast[];
  totalCapabilityForecast: Record<string, number>; // month -> total capability
  
  // Vessel requirements
  vesselRequirementsByMonth: Record<string, number>; // month -> required vessels
  vesselGapByMonth: Record<string, number>; // month -> gap (+ shortage, - surplus)
  
  // Applied injects
  appliedInjects: VesselInject[];
  injectImpactByMonth: Record<string, number>; // month -> inject impact
  
  // Analysis
  averageUtilization: number;
  peakDemandMonth: string;
  maxVesselGap: number;
  recommendedFleetSize: number;
  confidenceScore: number; // overall confidence in forecast
  
  // Metadata
  calculatedAt: Date;
  calculationDuration: number; // milliseconds
}

/**
 * Management recommendation for vessel planning
 */
export interface ManagementRecommendation {
  id: string;
  type: 'vessel_acquisition' | 'vessel_retirement' | 'contract_renegotiation' | 'capacity_optimization' | 'capacity_planning' | 'operational_excellence';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  
  // Timing
  recommendedAction: string;
  timeframe: 'immediate' | 'next_quarter' | 'next_6_months' | 'next_year' | 'next_3_months';
  targetMonth?: string;
  
  // Impact
  vesselImpact: number; // vessels affected
  costImpact?: number; // estimated cost
  demandImpact: number; // delivery capacity affected
  utilizationImpact: number; // utilization change
  
  // Supporting data
  triggerConditions: string[]; // conditions that led to this recommendation
  alternativeOptions: string[]; // alternative approaches
  riskFactors?: string[]; // risk factors to consider
  dataSupport?: string[]; // supporting data sources
  stakeholderAlignment?: 'high' | 'medium' | 'low'; // stakeholder alignment level
  risks: string[]; // risks of not taking action
  benefits: string[]; // benefits of taking action
  
  // Metadata
  confidence: number; // 0-1
  basedOnScenarios: string[]; // scenario IDs that support this recommendation
  createdAt: Date;
  reviewDate?: Date; // review date
  reviewedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
}

/**
 * Vessel forecast analysis result
 */
export interface VesselForecastResult {
  // Input data summary
  historicalMonths: number;
  forecastMonths: number;
  analysisDate: Date;
  
  // Core fleet baseline
  coreFleetBaseline: CoreFleetBaseline;
  
  // Scenarios analyzed
  scenarios: ScenarioResult[];
  baseScenario: ScenarioResult;
  
  // Cross-scenario analysis
  demandRange: { min: number; max: number; average: number }; // across all scenarios
  vesselRequirementRange: { min: number; max: number; average: number };
  consensusRecommendations: ManagementRecommendation[]; // recommendations supported by multiple scenarios
  
  // Risk analysis
  highRiskMonths: string[]; // months with significant vessel shortages
  lowUtilizationMonths: string[]; // months with excess capacity
  sensitivityAnalysis: {
    demandSensitivity: number; // how much vessel requirements change per 1% demand change
    capabilitySensitivity: number; // how much requirements change per 1% capability change
  };
  
  // Summary metrics
  averageForecastAccuracy: number; // based on historical validation
  recommendedDecisionPoints: Array<{
    month: string;
    decision: string;
    rationale: string;
  }>;
  
  // Export data
  exportData: {
    forecastSummary: any[];
    monthlyBreakdown: any[];
    recommendations: any[];
  };
}

// ==================== RIG SCHEDULE & ACTIVITY-BASED FORECASTING ====================

/**
 * Rig schedule entry from monthly 18-month planning data
 * Based on P10 (early case) and P50 (mean case) timing scenarios
 */
export interface RigScheduleEntry {
  // Identifiers
  id: string;
  rigName: string;
  activityName?: string;
  
  // Activity Classification  
  rigActivityType: string; // Made more flexible for CSV import
  wellType?: string; // Made optional
  activityStatus?: string; // Added from CSV
  
  // Timing Information
  originalDuration: number; // hours as planned (CSV provides hours)
  actualDuration?: number; // hours if completed
  startDate: string | Date; // More flexible for CSV processing
  finishDate: string | Date; // More flexible for CSV processing
  timing?: 'P10' | 'P50'; // Early case vs Mean case scenario - optional for CSV
  scenario?: 'early' | 'mean'; // Alternative scenario field for CSV
  
  // Location & Context
  location: string;
  fieldName?: string;
  platform?: string;
  waterDepth?: number;
  region?: string; // Added from CSV
  
  // Vessel Impact Factors (made optional for CSV compatibility)
  fluidIntensity?: 'Low' | 'Medium' | 'High' | 'Critical'; // fluid volume expectations
  logisticsComplexity?: 'Standard' | 'Complex' | 'Extreme'; // special requirements
  weatherSensitivity?: 'Low' | 'Medium' | 'High'; // weather window criticality
  
  // Business Context
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  projectCode?: string;
  costCenter?: string;
  
  // Additional CSV fields
  rigContractor?: string;
  rigType?: string;
  plan?: string;
  estimate?: string;
  eventType?: string;
  wellheadType?: string;
  
  // Metadata (made optional for CSV compatibility)
  scheduleVersion?: string; // e.g., "Aug2025_v1.2"
  lastUpdated?: Date;
  confidence?: number; // 0-1 confidence in timing
  assumptions?: string[];
}

/**
 * Activity-based vessel requirement mapping
 * Maps rig activities to expected vessel needs
 */
export interface ActivityVesselMapping {
  // Activity Identification
  activityType: string;
  wellType: string;
  locationCategory: 'Shallow_Water' | 'Deep_Water' | 'Ultra_Deep_Water';
  
  // Base Requirements
  baseVesselRequirement: number; // typical vessels needed for this activity
  durationMultiplier: number; // adjustment factor for longer/shorter activities
  simultaneousActivityPenalty: number; // additional vessels when multiple rigs active
  
  // Demand Factors
  fluidVolumeEstimate: number; // expected BBLs for this activity type
  equipmentVolumeEstimate: number; // expected deck space requirements
  frequencyFactor: number; // trips per week multiplier
  
  // Location & Environmental Factors
  weatherBufferFactor: number; // additional capacity for weather delays
  distanceFactor: number; // transit time impact
  portAccessibilityFactor: number; // ease of loading/unloading
  
  // Special Requirements
  specializedVesselNeeds: string[]; // e.g., ['crane_vessel', 'chemical_vessel']
  concurrentSupport: boolean; // requires simultaneous vessel operations
  
  // Business Rules
  minimumVesselCount: number; // absolute minimum vessels for this activity
  maximumEfficiencyThreshold: number; // vessels beyond this point show diminishing returns
  
  // Confidence & Validation
  confidence: number; // 0-1 confidence in these estimates
  basedOnHistoricalEvents: number; // number of historical events used for calibration
  lastCalibrated: Date;
  notes: string;
}

/**
 * Core fleet baseline configuration
 * Represents the contracted vessel capacity and flexibility
 */
export interface CoreFleetBaseline {
  // Fleet Composition
  baseVesselCount: number; // standard 8 vessels under contract
  contractedVessels: ContractedVessel[];
  
  // Flexibility & Options
  flexibilityBuffer: number; // vessels that can be released if needed
  maxFlexUpCapacity: number; // maximum additional vessels that can be chartered quickly
  
  // Contract Terms
  coreContractExpiry: Date;
  dayRateStructure: DayRateStructure;
  charterOptions: CharterOption[];
  
  // Performance Metrics
  averageUtilizationTarget: number; // target utilization for core fleet
  minimumUtilizationThreshold: number; // below this, consider fleet reduction
  
  // Operational Constraints
  maintenanceSchedule: VesselMaintenanceWindow[];
  seasonalAdjustments: SeasonalFleetAdjustment[];
  
  // Business Rules
  contractualNoticeRequired: number; // days notice needed for fleet changes
  emergencyCharterSLA: number; // hours to secure emergency vessel
  
  // Tracking
  lastReviewDate: Date;
  nextReviewDue: Date;
  fleetManager: string;
}

/**
 * Individual contracted vessel information
 */
export interface ContractedVessel {
  vesselName: string;
  vesselType: 'PSV' | 'AHTS' | 'Crew_Boat' | 'Multi_Purpose';
  vesselSpecs: {
    deckSpace: number; // square feet
    cargoCapacity: number; // tons
    liquidCapacity: number; // BBLs
    craneCapacity?: number; // tons
  };
  
  // Contract Details
  contractType: 'Long_Term' | 'Medium_Term' | 'Spot' | 'Call_Option';
  dayRate: number;
  contractStart: Date;
  contractEnd: Date;
  
  // Performance & Availability
  reliability: number; // 0-1 reliability score
  averageTransitTime: Record<string, number>; // location -> hours
  maintenanceSchedule: Date[];
  
  // Flexibility
  canBeReleased: boolean;
  releaseNoticeDay: number;
  replacementCost: number; // cost to charter equivalent vessel
}

/**
 * Day rate structure for vessel chartering
 */
export interface DayRateStructure {
  baseRate: number; // standard day rate
  volumeDiscount: number; // discount for multiple vessels
  longTermDiscount: number; // discount for longer contracts
  seasonalSurcharge: Record<string, number>; // month -> surcharge percentage
  emergencyPremium: number; // premium for short-notice charters
  fuelEscalation: boolean; // whether fuel costs are escalated
}

/**
 * Charter options and flexibility arrangements
 */
export interface CharterOption {
  optionType: 'Call_Option' | 'Put_Option' | 'Swing_Option';
  vesselCount: number;
  exerciseNotice: number; // days notice required
  optionFee: number; // cost to maintain option
  exerciseRate: number; // day rate if option is exercised
  validFrom: Date;
  validTo: Date;
  exerciseConditions: string[];
}

/**
 * Planned vessel maintenance windows
 */
export interface VesselMaintenanceWindow {
  vesselName: string;
  maintenanceType: 'Routine' | 'Major_Overhaul' | 'Dry_Dock' | 'Inspection';
  plannedStart: Date;
  plannedEnd: Date;
  estimatedDuration: number; // days
  canBeDeferred: boolean;
  deferralCost: number; // cost impact of deferring maintenance
  impactOnFleet: number; // vessels effectively out of service
}

/**
 * Seasonal fleet adjustments
 */
export interface SeasonalFleetAdjustment {
  season: 'Hurricane' | 'Winter_Weather' | 'Summer_Campaign' | 'Holiday_Shutdown';
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  fleetAdjustment: number; // +/- vessels from baseline
  rationale: string;
  historicalBasis: string;
}

/**
 * Enhanced vessel inject with rig schedule integration
 * Replaces generic injects with specific business scenarios
 */
export interface EnhancedVesselInject extends Omit<VesselInject, 'type'> {
  // Enhanced inject types matching specific business scenarios
  type: 'new_well_campaign' | 'extended_drilling_program' | 'planned_maintenance_window' | 
        'emergency_response' | 'rig_move_support' | 'completion_intensive_period' |
        'simultaneous_operations' | 'weather_contingency' | 'equipment_mobilization';
  
  // Rig schedule integration
  triggeredBySchedule: boolean;
  relatedRigActivities: string[]; // RigScheduleEntry IDs
  scheduleConfidence: number; // 0-1 confidence that this inject will be needed
  
  // Core fleet impact
  baselineAdjustment: number; // +/- from 8-vessel baseline
  charterRecommendation: 'charter_additional' | 'release_excess' | 'maintain_baseline' | 'exercise_option';
  
  // Business context
  businessJustification: string;
  contractualImplications: string[]; // impact on existing contracts
  costEstimate: number; // estimated additional cost
  riskMitigation: string[];
  
  // Decision support
  triggerDate: Date; // when this decision needs to be made
  reversible: boolean; // can this decision be easily reversed
  alternativeOptions: string[];
  
  // Integration with rig schedule
  linkedWells: string[]; // well names affected
  linkedRigs: string[]; // rig names involved
  linkedLocations: string[]; // platforms/locations involved
  
  // Performance tracking
  actualVesselImpact?: number; // actual vessels used (for historical injects)
  actualCost?: number; // actual cost incurred
  effectivenessScore?: number; // 0-1 score of how well this inject worked
}