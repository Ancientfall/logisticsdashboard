// src/types/dataModel.ts

// ===================== RAW DATA INTERFACES =====================
// These match the structure of the Excel files

export interface RawVesselClassification {
  [key: string]: any; // Placeholder - structure to be defined
}

export interface RawBulkAction {
  "Port Type": string;
  "Vessel Name": string;
  "Start Date": string; // Will be converted to Date
  "Action": string;
  "Qty": number;
  "Unit": string;
  "Pound Per Gallon": string;
  "Bulk Type": string;
  "Bulk Description": string;
  "At Port": string;
  "Destination Port": string;
  "Remarks": string;
  "Tank": string;
}

export interface RawVoyageEvent {
  Vessel: string;
  "Voyage #": number;
  Mission: string;
  Event: string | null;
  "Parent Event": string;
  Location: string;
  Quay: string | null;
  Remarks: string | null;
  "Is active?": string;
  From: string; // Will be converted to Date
  To: string;   // Will be converted to Date
  Engines: string | null;
  Generators: string | null;
  Hours: number;
  "Dist.": number | null;
  "Port Type": string;
  "Event Category": string | null;
  Year: number;
  "Voyage Type": string | null;
  "Calculated Speed": string | null;
  "Consumed Fuel": string | null;
  "Consumed Lng": string | null;
  "Ins. 500m": string | null;
  "Hours%": number | null;
  "Cost Type": string | null;
  "Cost Dedicated to": string | null;
}

export interface RawVoyageListItem {
  Edit: number;
  Vessel: string;
  "Voyage Number": number;
  "Cost Allocat.": number | null;
  Year: number;
  Month: string;
  "Start Date": string; // Will be converted to Date
  "End Date": string;   // Will be converted to Date
  Type: string | null;
  Mission: string;
  "Route Type": string | null;
  Locations: string;
}

export interface RawVesselManifest {
  month: string;
  Edit: number;
  "Voyage Id": number;
  "Manifest Number": string;
  Transporter: string;
  Type: string | null;
  "Manifest Date": string; // Will be converted to Date
  "Cost Code": number | null;
  From: string;
  "Offshore Location": string;
  "Deck Lbs": number | null;
  "Deck Tons": number | null;
  "RT Tons": number | null;
  Lifts: number | null;
  "Wet Bulk (bbls)": string | null;
  "Wet Bulk (gals)": number | null;
  "Deck Sqft": string | null;
  Remarks: string | null;
  Year: number;
}

export interface RawMasterFacility {
  LocationID: number;
  LocationName: string;
  DisplayName: string;
  FacilityType: "Production" | "Drilling" | "Integrated";
  ParentFacility: string | null;
  Region: string;
  IsActive: boolean;
  SortOrder: number;
  ProductionLCs: string | null;
  IsProductionCapable: boolean;
  IsDrillingCapable: boolean;
}

export interface RawCostAllocation {
  "LC Number": number;
  "Cost Element": string;
  Description: string;
  "Alloc (days)": number | null;
  "Month-Year": string;
  Mission: string | null;
}

// ===================== PROCESSED DATA INTERFACES =====================
// These represent the data after transformation

export interface LCAllocation {
  lcNumber: string;
  percentage: number;
  originalLocation: string | null;
  mappedLocation: string;
  department: "Drilling" | "Production" | "Logistics" | null;
  isSpecialCase: boolean;
}

export interface ProcessedVoyageEvent {
  id: string; // Generated unique ID
  vessel: string;
  voyageNumber: string;
  mission: string;
  event: string | null;
  parentEvent: string;
  originalLocation: string;
  mappedLocation: string;
  quay: string | null;
  remarks: string | null;
  isActive: boolean;
  startTime: Date;
  endTime: Date | null;
  hours: number;
  finalHours: number; // After LC allocation
  portType: "rig" | "base" | string;
  locationType: "Offshore" | "Onshore" | "Other";
  activityCategory: "Productive" | "Non-Productive" | "Needs Review - Null Event" | "Uncategorized";
  year: number;
  quarter: string;
  month: string;
  monthNumber: number;
  weekOfYear: number;
  dayOfWeek: string;
  dayOfMonth: number;
  eventDate: Date;
  lcAllocations: LCAllocation[];
  department: "Drilling" | "Production" | "Logistics" | null;
  mappingStatus: "LC Mapped" | "Special Case Mapping" | "No LC Info" | "LC Not Mapped" | "Error in Expansion";
  dataIntegrity: "Valid" | "Valid - Special Case" | "Missing LC" | "Unknown LC" | "Error";
  standardizedVoyageNumber: string;
}

export interface LocationInfo {
  name: string;
  isProduction: boolean;
  isDrilling: boolean;
  isIntegrated: boolean;
}

export interface ProcessedVoyage {
  id: string;
  uniqueVoyageId: string;
  standardizedVoyageId: string;
  vessel: string;
  voyageNumber: number;
  year: number;
  month: string;
  monthNumber: number;
  startDate: Date;
  endDate: Date | null;
  type: string | null;
  mission: string;
  routeType: string | null;
  locations: string[];
  stopCount: number;
  durationHours: number | null;
  includesProduction: boolean;
  includesDrilling: boolean;
  voyagePurpose: "Production" | "Drilling" | "Mixed" | "Other";
  standardizedVesselName: string;
  voyageDate: Date;
  originPort: string | null;
  mainDestination: string | null;
}

export interface VoyageSegment {
  id: string;
  uniqueVoyageId: string;
  standardizedVoyageId: string;
  vessel: string;
  voyageNumber: number;
  year: number;
  month: string;
  monthNumber: number;
  segmentNumber: number;
  origin: string;
  destination: string;
  voyageStartDate: Date;
  voyageEndDate: Date | null;
  segmentType: "Outbound" | "Return" | "Intermediate" | "Unknown";
  originStandardized: string;
  destinationStandardized: string;
  originIsFourchon: boolean;
  destinationIsFourchon: boolean;
  isProductionSegment: boolean;
  isDrillingSegment: boolean;
  isOffshoreSegment: boolean;
  segmentDate: Date | null;
  isIntegratedFacility: boolean;
  finalDepartment: "Drilling" | "Production" | "Integrated" | "Other" | null;
  isIntegratedDepartment: boolean;
  departmentDestination: string;
  voyagePurpose: "Production" | "Drilling" | "Integrated" | "Other";
  isThunderHorse: boolean;
  isMadDog: boolean;
  voyagePattern: "Outbound" | "Return" | "Offshore Transfer" | "Round Trip";
  isStandardPattern: boolean;
}

export interface ProcessedVesselManifest {
  id: string;
  voyageId: string;
  standardizedVoyageId: string;
  manifestNumber: string;
  transporter: string;
  manifestDate: Date;
  costCode: number | null;
  from: string;
  offshoreLocation: string;
  mappedLocation: string;
  deckLbs: number;
  deckTons: number;
  rtTons: number;
  lifts: number;
  wetBulkBbls: number;
  wetBulkGals: number;
  deckSqft: number;
  remarks: string | null;
  year: number;
  month: string;
  monthNumber: number;
  quarter: string;
  department: "Drilling" | "Production" | "Logistics" | null;
  cargoType: "Deck Cargo" | "Below Deck Cargo" | "Liquid Bulk" | "Lift Only" | "Other/Mixed";
  
  // New fields for voyage segment integration
  voyageSegmentId?: string;
  segmentDestination?: string;
  segmentDepartment?: string;
  manifestTimeOffset?: number;
  matchConfidence?: number;
  matchType?: 'exact' | 'fuzzy' | 'temporal' | 'voyageOnly' | 'none';
  suggestedLocation?: string;
  validatedDepartment?: string;
}

export interface MasterFacility {
  locationId: number;
  locationName: string;
  displayName: string;
  facilityType: "Production" | "Drilling" | "Integrated";
  parentFacility: string | null;
  region: string;
  isActive: boolean;
  sortOrder: number;
  productionLCs: number[] | null;
  isProductionCapable: boolean;
  isDrillingCapable: boolean;
  category: "Production Facilities" | "Drilling Rigs" | "Integrated Facilities" | "Other";
  isIntegrated: boolean;
}

export interface CostAllocation {
  lcNumber: number;
  costElement: string;
  description: string;
  allocDays: number | null;
  monthYear: string;
  mission: string | null;
  locationReference?: string; // Added from PowerQuery transformation
}

// ===================== RELATIONSHIP INTERFACES =====================
// These represent the hierarchical relationships between entities

export interface VoyageWithRelated extends ProcessedVoyage {
  events: ProcessedVoyageEvent[];
  manifests: ProcessedVesselManifest[];
  segments: VoyageSegment[];
}

// ===================== DATA STORE INTERFACE =====================
// Represents the complete data model

export interface DataStore {
  // Raw data from Excel files
  rawData: {
    voyageEvents: RawVoyageEvent[];
    voyageList: RawVoyageListItem[];
    vesselManifests: RawVesselManifest[];
    masterFacilities: RawMasterFacility[];
    costAllocation: RawCostAllocation[];
    vesselClassifications?: RawVesselClassification[];
    bulkActions?: RawBulkAction[];
  };
  
  // Processed data after transformations
  processedData: {
    voyageEvents: ProcessedVoyageEvent[];
    voyages: ProcessedVoyage[];
    vesselManifests: ProcessedVesselManifest[];
    voyageSegments: VoyageSegment[];
  };
  
  // Reference data
  referenceData: {
    masterFacilities: MasterFacility[];
    costAllocation: CostAllocation[];
  };
  
  // Derived data with relationships
  voyagesWithRelated: VoyageWithRelated[];
  
  // Metadata
  metadata: {
    lastUpdated: Date;
    dataStatus: "loading" | "loaded" | "error";
    errorMessage?: string;
  };
}