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
  activityCategory: 'Productive' | 'Non-Productive' | 'Uncategorized';
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
  
  // Time Information
  monthYear?: string;
  month?: number;
  year?: number;
  
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
  id: string;
  uniqueVoyageId: string;
  standardizedVoyageId: string;
  vessel: string;
  standardizedVesselName: string;
  voyageNumber: number;
  
  // Time Information
  year: number;
  month: string;
  monthNumber: number;
  startDate: Date;
  endDate?: Date;
  voyageDate: Date;
  durationHours?: number;
  
  // Voyage Details
  type?: string;
  mission: string;
  routeType?: string;
  locations: string; // Original string like "Fourchon -> Na Kika -> Thunder Horse PDQ"
  locationList: string[]; // Parsed array of locations
  
  // Voyage Analysis
  stopCount: number;
  includesProduction: boolean;
  includesDrilling: boolean;
  voyagePurpose: 'Production' | 'Drilling' | 'Mixed' | 'Other';
  originPort?: string;
  mainDestination?: string;
  
  // Status
  edit?: string;
  isActive: boolean;
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
  uniqueVoyageId: string;
  standardizedVoyageId: string;
  vessel: string;
  voyageNumber: number;
  
  // Segment Information
  segmentNumber: number;
  origin: string;
  destination: string;
  originStandardized: string;
  destinationStandardized: string;
  
  // Time Information
  year: number;
  month: string;
  monthNumber: number;
  voyageStartDate: Date;
  voyageEndDate?: Date;
  segmentDate: Date;
  
  // Classification
  segmentType: 'Outbound' | 'Return' | 'Intermediate';
  isProductionSegment: boolean;
  isDrillingSegment: boolean;
  isOffshoreSegment: boolean;
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
  
  // Month-over-Month Changes
  momChanges: {
    waitingTimePercentage: number;
    cargoOpsHours: number;
    liftsPerCargoHour: number;
    drillingNPTPercentage: number;
    vesselUtilizationRate: number;
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