import { VoyageEvent, VesselManifest, MasterFacility, CostAllocation } from '../types';
import { getMonthNumber } from './dateUtils';

/**
 * General helper utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Create lookup maps for better performance
 */
export const createFacilitiesMap = (facilities: MasterFacility[]): Map<string, MasterFacility> => {
  const map = new Map<string, MasterFacility>();
  for (const facility of facilities) {
    map.set(facility.locationName.toLowerCase(), facility);
  }
  return map;
};

export const createCostAllocationMap = (costAllocations: CostAllocation[]): Map<string, CostAllocation> => {
  const map = new Map<string, CostAllocation>();
  for (const costAlloc of costAllocations) {
    map.set(costAlloc.lcNumber, costAlloc);
  }
  return map;
};

/**
 * Calculate total hours for a collection of voyage events
 */
export const calculateTotalHours = (events: VoyageEvent[]): number => {
  return Number(events.reduce((sum, event) => sum + event.finalHours, 0).toFixed(1));
};

/**
 * Calculate average trip duration from voyage events
 */
export const calculateAverageTripDuration = (events: VoyageEvent[]): number => {
  // Group by mission to get all events for each voyage
  const missionMap = new Map<string, VoyageEvent[]>();
  events.forEach(event => {
    if (!missionMap.has(event.mission)) {
      missionMap.set(event.mission, []);
    }
    missionMap.get(event.mission)!.push(event);
  });
  
  // Calculate the duration of each mission
  const durations: number[] = [];
  missionMap.forEach(missionEvents => {
    // Find earliest and latest timestamps
    const timestamps = missionEvents.flatMap(event => [event.from.getTime(), event.to.getTime()]);
    if (timestamps.length > 0) {
      const earliest = Math.min(...timestamps);
      const latest = Math.max(...timestamps);
      const durationHours = (latest - earliest) / (1000 * 60 * 60);
      durations.push(durationHours);
    }
  });
  
  // Calculate average
  return durations.length > 0 
    ? Number((durations.reduce((sum, duration) => sum + duration, 0) / durations.length).toFixed(1))
    : 0;
};

/**
 * Voyage ID creation utilities
 */
export const createStandardizedVoyageId = (voyageId: number, manifestDate: Date): string => {
  const year = manifestDate.getFullYear();
  const month = String(manifestDate.getMonth() + 1).padStart(2, '0');
  const paddedVoyageId = String(voyageId).padStart(3, '0');
  return `${year}-${month}-UNKNOWN-${paddedVoyageId}`;
};

export const createStandardizedVoyageIdFromVoyage = (voyage: { Vessel: string; Month?: string; Year: number; "Voyage Number": number }): string => {
  const monthNumber = voyage.Month ? getMonthNumber(voyage.Month) : 1;
  const paddedMonth = String(monthNumber).padStart(2, '0');
  const vesselNoSpaces = voyage.Vessel.replace(/\s+/g, '');
  const paddedVoyageNumber = String(voyage["Voyage Number"]).padStart(3, '0');
  return `${voyage.Year}-${paddedMonth}-${vesselNoSpaces}-${paddedVoyageNumber}`;
};

/**
 * Voyage location analysis utilities
 */
export const includesProductionLocation = (locations: string[]): boolean => {
  const productionLocations = [
    "Atlantis PQ", "Na Kika", "Mad Dog Prod", 
    "Thunder Horse PDQ", "Thunder Horse Prod", "Mad Dog", "Argos"
  ];
  
  // Case-insensitive checking for consistency
  return locations.some(location => 
    productionLocations.some(prodLoc => 
      location.toLowerCase().includes(prodLoc.toLowerCase())
    )
  );
};

export const includesDrillingLocation = (locations: string[]): boolean => {
  const drillingLocations = [
    "Thunder Horse Drilling", "Mad Dog Drilling", "Ocean BlackHornet", "Ocean Blackhornet",
    "Ocean BlackLion", "Ocean Blacklion", "Stena IceMAX", "Ocean Blacktip", "Island Venture",
    "Deepwater Invictus"
  ];
  
  // Case-insensitive checking to handle variations like "BlackHornet" vs "Blackhornet"
  return locations.some(location => 
    drillingLocations.some(drillLoc => 
      location.toLowerCase().includes(drillLoc.toLowerCase())
    )
  );
};

export const determineVoyagePurpose = (locations: string[]): "Production" | "Drilling" | "Mixed" | "Other" => {
  const hasProduction = includesProductionLocation(locations);
  const hasDrilling = includesDrillingLocation(locations);
  
  if (hasProduction && hasDrilling) return "Mixed";
  if (hasProduction) return "Production";
  if (hasDrilling) return "Drilling";
  return "Other";
};

/**
 * Create empty/fallback manifest for error handling
 */
export const createEmptyManifest = (index: number, originalManifest: any): VesselManifest => {
  return {
    id: `manifest-error-${index}`,
    voyageId: String(originalManifest["Voyage Id"] || 0),
    standardizedVoyageId: '',
    manifestNumber: originalManifest["Manifest Number"] || '',
    transporter: originalManifest.Transporter || '',
    from: originalManifest.From || '',
    offshoreLocation: originalManifest["Offshore Location"] || '',
    mappedLocation: '',
    deckLbs: 0,
    deckTons: 0,
    rtTons: 0,
    rtLifts: 0,
    lifts: 0,
    wetBulkBbls: 0,
    wetBulkGals: 0,
    rtWetBulkGals: 0,
    deckSqft: 0,
    manifestDate: new Date(),
    manifestDateOnly: new Date(),
    month: '',
    monthNumber: 0,
    quarter: '',
    year: originalManifest.Year || new Date().getFullYear(),
    costCode: originalManifest["Cost Code"],
    finalDepartment: undefined,
    cargoType: "Other/Mixed",
    remarks: originalManifest.Remarks,
    company: 'Unknown',
    vesselType: 'Other'
  };
};

/**
 * Safe numeric value extraction with defaults
 */
export const safeNumeric = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Mission type utilities
 */
export const isMissionTypeSupply = (missionType?: string): boolean => {
  return missionType === 'Supply';
};

export const isMissionTypeProject = (missionType?: string): boolean => {
  return missionType === 'Project';
};

export const isMissionTypeOffhire = (missionType?: string): boolean => {
  return missionType === 'Offhire';
};

/**
 * Get mission type description
 */
export const getMissionTypeDescription = (missionType?: string): string => {
  switch (missionType) {
    case 'Supply':
      return 'Normal everyday supply runs to offshore facilities';
    case 'Project':
      return 'Special project work (e.g., Mad Dog storage vessel operations)';
    case 'Offhire':
      return 'Vessel off-hire for maintenance or not under BP contract';
    default:
      return 'Unknown mission type';
  }
};

/**
 * Check if voyage should be included in cost calculations
 * Offhire voyages are typically excluded from BP cost allocation
 */
export const shouldIncludeInCostCalculations = (missionType?: string): boolean => {
  return missionType !== 'Offhire';
}; 