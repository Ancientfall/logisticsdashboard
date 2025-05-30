// utils/voyageProcessing.ts
// Voyage List Processing Utilities - Matching PowerQuery Logic

import { VoyageList, VoyageSegment } from '../types';

// ==================== VOYAGE ID GENERATION ====================

/**
 * Create unique voyage ID matching PowerQuery format: Year_Month_Vessel_VoyageNumber
 */
export function createUniqueVoyageId(
  year: number | null, 
  month: string | null, 
  vessel: string | null, 
  voyageNumber: number | null
): string {
  const yearPart = year === null ? "0000" : year.toString();
  const monthPart = month === null ? "XX" : month;
  const vesselPart = vessel === null ? "Unknown" : vessel.replace(/ /g, "");
  const voyageNumPart = voyageNumber === null ? "000" : voyageNumber.toString();
  
  return `${yearPart}_${monthPart}_${vesselPart}_${voyageNumPart}`;
}

/**
 * Create standardized voyage ID matching PowerQuery format: YYYY-MM-Vessel-VVV
 */
export function createStandardizedVoyageId(
  year: number | null,
  monthNumber: number | null,
  vessel: string | null,
  voyageNumber: number | null
): string {
  const yearPart = year === null ? "0000" : year.toString();
  const monthNumPart = monthNumber === null ? "00" : monthNumber.toString().padStart(2, "0");
  const vesselPart = vessel === null ? "Unknown" : vessel.replace(/ /g, "");
  const voyageNumPart = voyageNumber === null ? "000" : voyageNumber.toString().padStart(3, "0");
  
  return `${yearPart}-${monthNumPart}-${vesselPart}-${voyageNumPart}`;
}

// ==================== MONTH CONVERSION ====================

/**
 * Convert month string to number (matching PowerQuery logic)
 */
export function getMonthNumber(month: string | null): number {
  if (!month) return 1;
  
  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  
  return monthMap[month.toLowerCase()] || 1;
}

// ==================== LOCATION PARSING ====================

/**
 * Parse locations string into array (matching PowerQuery logic)
 */
export function parseLocationList(locations: string | null): string[] {
  if (!locations) return [];
  
  try {
    // Split by arrows and trim whitespace
    return locations
      .split('->')
      .map(location => location.trim())
      .filter(location => location.length > 0);
  } catch {
    return [];
  }
}

/**
 * Get origin port (first location in list)
 */
export function getOriginPort(locationList: string[]): string | null {
  return locationList.length > 0 ? locationList[0] : null;
}

/**
 * Get main destination (second location in list)
 */
export function getMainDestination(locationList: string[]): string | null {
  return locationList.length > 1 ? locationList[1] : null;
}

// ==================== FACILITY CLASSIFICATION ====================

// Production platforms (matching PowerQuery list)
const PRODUCTION_PLATFORMS = [
  "Atlantis PQ", "Na Kika", "Mad Dog Prod", "Thunder Horse PDQ", "Mad Dog"
];

// Drilling locations (matching PowerQuery list)
const DRILLING_LOCATIONS = [
  "Thunder Horse Drilling", "Mad Dog Drilling", "Ocean Blackhornet", 
  "Ocean BlackLion", "Stena IceMAX", "Ocean Blacktip", "Island Venture",
  "Argos", "Deepwater Invictus"
];

// Integrated facilities
const INTEGRATED_FACILITIES = ["Thunder Horse PDQ", "Thunder Horse", "Mad Dog"];

/**
 * Check if voyage includes production platforms
 */
export function includesProduction(locations: string): boolean {
  if (!locations) return false;
  
  return PRODUCTION_PLATFORMS.some(platform => 
    locations.includes(platform)
  );
}

/**
 * Check if voyage includes drilling locations
 */
export function includesDrilling(locations: string): boolean {
  if (!locations) return false;
  
  return DRILLING_LOCATIONS.some(location => 
    locations.includes(location)
  );
}

/**
 * Determine voyage purpose
 */
export function getVoyagePurpose(
  includesProduction: boolean, 
  includesDrilling: boolean
): 'Production' | 'Drilling' | 'Mixed' | 'Other' {
  if (includesProduction && includesDrilling) return "Mixed";
  if (includesProduction) return "Production";
  if (includesDrilling) return "Drilling";
  return "Other";
}

// ==================== SEGMENT CREATION ====================

/**
 * Create voyage segments from location list (matching PowerQuery logic)
 */
export function createVoyageSegments(voyage: VoyageList): VoyageSegment[] {
  const { locationList } = voyage;
  
  if (!locationList || locationList.length < 2) {
    // Create default segment if no proper location list
    return [{
      uniqueVoyageId: voyage.uniqueVoyageId,
      standardizedVoyageId: voyage.standardizedVoyageId,
      vessel: voyage.vessel,
      voyageNumber: voyage.voyageNumber,
      segmentNumber: 1,
      origin: locationList.length > 0 ? locationList[0] : "Unknown Origin",
      destination: locationList.length > 1 ? locationList[1] : "Unknown Destination",
      originStandardized: locationList.length > 0 ? locationList[0].trim() : "Unknown Origin",
      destinationStandardized: locationList.length > 1 ? locationList[1].trim() : "Unknown Destination",
      year: voyage.year,
      month: voyage.month,
      monthNumber: voyage.monthNumber,
      voyageStartDate: voyage.startDate,
      voyageEndDate: voyage.endDate,
      segmentDate: new Date(voyage.startDate),
      segmentType: 'Outbound',
      isProductionSegment: false,
      isDrillingSegment: false,
      isOffshoreSegment: false,
      originIsFourchon: false,
      destinationIsFourchon: false,
      isIntegratedFacility: false,
      directDepartment: 'Other',
      isIntegratedDepartment: false,
      departmentDestination: "Unknown Destination - Other",
      voyagePurpose: 'Other',
      finalDepartment: 'Other',
      isThunderHorse: false,
      isMadDog: false,
      voyagePattern: 'Round Trip',
      isStandardPattern: false
    }];
  }
  
  // Create segments for each consecutive pair of locations
  const segments: VoyageSegment[] = [];
  const locationCount = locationList.length;
  
  for (let i = 0; i < locationCount - 1; i++) {
    const origin = locationList[i];
    const destination = locationList[i + 1];
    
    const segment: VoyageSegment = {
      uniqueVoyageId: voyage.uniqueVoyageId,
      standardizedVoyageId: voyage.standardizedVoyageId,
      vessel: voyage.vessel,
      voyageNumber: voyage.voyageNumber,
      segmentNumber: i + 1,
      origin,
      destination,
      originStandardized: origin.trim(),
      destinationStandardized: destination.trim(),
      year: voyage.year,
      month: voyage.month,
      monthNumber: voyage.monthNumber,
      voyageStartDate: voyage.startDate,
      voyageEndDate: voyage.endDate,
      segmentDate: new Date(voyage.startDate),
      
      // Segment type classification
      segmentType: i === 0 ? 'Outbound' : 
                  i === locationCount - 2 ? 'Return' : 'Intermediate',
      
      // Location classification
      isProductionSegment: PRODUCTION_PLATFORMS.includes(destination),
      isDrillingSegment: DRILLING_LOCATIONS.includes(destination),
      isOffshoreSegment: destination !== "Fourchon" && !destination.startsWith("Port "),
      
      // Fourchon detection
      originIsFourchon: origin === "Fourchon",
      destinationIsFourchon: destination === "Fourchon",
      
      // Facility classification
      isIntegratedFacility: INTEGRATED_FACILITIES.includes(destination),
      
      // Department classification (matching PowerQuery logic)
      directDepartment: classifyDepartment(destination),
      isIntegratedDepartment: classifyDepartment(destination) === 'Integrated',
      departmentDestination: `${destination} - ${classifyDepartment(destination)}`,
      voyagePurpose: getSegmentVoyagePurpose(destination),
      finalDepartment: classifyDepartment(destination),
      
      // Facility-specific flags
      isThunderHorse: destination.toLowerCase().includes("thunder horse"),
      isMadDog: destination.toLowerCase().includes("mad dog"),
      
      // Voyage pattern analysis
      voyagePattern: getVoyagePattern(origin, destination),
      isStandardPattern: isStandardVoyagePattern(i, locationCount, origin, destination)
    };
    
    segments.push(segment);
  }
  
  return segments;
}

// ==================== DEPARTMENT CLASSIFICATION ====================

/**
 * Classify department based on destination (matching PowerQuery logic)
 */
function classifyDepartment(destination: string): 'Drilling' | 'Production' | 'Integrated' | 'Other' {
  const dest = destination.toLowerCase();
  
  if (dest.includes("thunder horse drilling")) return "Drilling";
  if (dest.includes("thunder horse prod")) return "Production";
  if (dest.includes("mad dog drilling")) return "Drilling";
  if (dest.includes("mad dog prod")) return "Production";
  if (dest.includes("thunder horse pdq") || dest.includes("thunder horse") || dest.includes("mad dog")) return "Integrated";
  if (DRILLING_LOCATIONS.some(loc => loc.toLowerCase() === dest)) return "Drilling";
  if (PRODUCTION_PLATFORMS.some(platform => platform.toLowerCase() === dest)) return "Production";
  
  return "Other";
}

/**
 * Get segment voyage purpose
 */
function getSegmentVoyagePurpose(destination: string): 'Production' | 'Drilling' | 'Integrated' | 'Other' {
  const isDrilling = DRILLING_LOCATIONS.includes(destination);
  const isProduction = PRODUCTION_PLATFORMS.includes(destination);
  
  if (isDrilling && isProduction) return "Integrated";
  if (isDrilling) return "Drilling";
  if (isProduction) return "Production";
  return "Other";
}

// ==================== VOYAGE PATTERN ANALYSIS ====================

/**
 * Get voyage pattern classification
 */
function getVoyagePattern(
  origin: string, 
  destination: string
): 'Outbound' | 'Return' | 'Offshore Transfer' | 'Round Trip' {
  const originIsFourchon = origin === "Fourchon";
  const destinationIsFourchon = destination === "Fourchon";
  
  if (originIsFourchon && !destinationIsFourchon) return "Outbound";
  if (!originIsFourchon && destinationIsFourchon) return "Return";
  if (!originIsFourchon && !destinationIsFourchon) return "Offshore Transfer";
  return "Round Trip";
}

/**
 * Check if follows standard voyage pattern
 */
function isStandardVoyagePattern(
  segmentIndex: number,
  totalSegments: number,
  origin: string,
  destination: string
): boolean {
  const isOutbound = segmentIndex === 0 && origin === "Fourchon";
  const isReturn = segmentIndex === totalSegments - 2 && destination === "Fourchon";
  
  return isOutbound || isReturn;
}

// ==================== DURATION CALCULATION ====================

/**
 * Calculate voyage duration in hours (matching PowerQuery logic)
 */
export function calculateVoyageDurationHours(startDate: Date | null, endDate: Date | null): number | null {
  if (!startDate || !endDate) return null;
  
  try {
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60); // Convert to hours
    return Math.round(durationHours * 100) / 100; // Round to 2 decimal places
  } catch {
    return null;
  }
}

// ==================== VALIDATION ====================

/**
 * Validate voyage data quality
 */
export function validateVoyageData(voyage: Partial<VoyageList>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!voyage.vessel) errors.push("Missing vessel name");
  if (!voyage.voyageNumber) errors.push("Missing voyage number");
  if (!voyage.year) errors.push("Missing year");
  if (!voyage.month) errors.push("Missing month");
  if (!voyage.startDate) errors.push("Missing start date");
  
  // Data quality checks
  if (voyage.locationList && voyage.locationList.length < 2) {
    warnings.push("Voyage has less than 2 locations");
  }
  
  if (voyage.durationHours && voyage.durationHours <= 0) {
    warnings.push("Voyage duration is zero or negative");
  }
  
  if (voyage.stopCount && voyage.stopCount > 10) {
    warnings.push("Voyage has unusually high number of stops");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
} 