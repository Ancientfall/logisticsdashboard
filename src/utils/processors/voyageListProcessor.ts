import { VoyageList } from '../../types';
import { parseDate, getMonthNumber } from '../dateUtils';
import { createStandardizedVoyageIdFromVoyage, includesProductionLocation, includesDrillingLocation, determineVoyagePurpose } from '../helpers';

/**
 * Voyage list data processor
 * Extracted from dataProcessing.ts to improve modularity
 */

// Raw voyage list interface
interface RawVoyageList {
  Edit?: string;
  Vessel: string;
  "Voyage Number": number;
  Year: number;
  Month?: string;
  "Start Date": string;
  "End Date"?: string;
  Type?: string;
  Mission: string;
  "Route Type"?: string;
  Locations: string;
}

/**
 * Process voyage list data
 */
export const processVoyageList = (rawVoyages: RawVoyageList[]): VoyageList[] => {
  console.log(`📋 Processing ${rawVoyages.length} voyage list records...`);
  
  return rawVoyages.map((voyage, index) => {
    try {
      const locations = voyage.Locations ? voyage.Locations.split('->').map(loc => loc.trim()) : [];
      const startDate = parseDate(voyage["Start Date"]);
      const endDate = voyage["End Date"] ? parseDate(voyage["End Date"]) : undefined;
      
      // Calculate duration in hours
      const durationHours = startDate && endDate ? 
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) : undefined;
      
      // Create standardized voyage ID
      const standardizedVoyageId = createStandardizedVoyageIdFromVoyage(voyage);
      
      // Unique voyage ID for deduplication
      const uniqueVoyageId = `${voyage.Year}_${voyage.Month || 'January'}_${voyage.Vessel.replace(/\s+/g, '')}_${voyage["Voyage Number"]}`;
      
      // Month number conversion - handle undefined month gracefully
      const monthNumber = voyage.Month ? getMonthNumber(voyage.Month) : 1;
      
      // Voyage purpose analysis
      const voyagePurpose = determineVoyagePurpose(locations);
      const includesProduction = includesProductionLocation(locations);
      const includesDrilling = includesDrillingLocation(locations);
      
      // Route analysis
      const originPort = locations.length > 0 ? locations[0] : undefined;
      const mainDestination = locations.length > 1 ? locations[1] : undefined;
      const stopCount = locations.length;
      
      // Normalize mission type
      const normalizeMissionType = (mission: string): 'Supply' | 'Project' | 'Offhire' | undefined => {
        if (!mission) return undefined;
        const missionLower = mission.toLowerCase().trim();
        
        if (missionLower === 'supply' || missionLower.includes('supply')) {
          return 'Supply';
        } else if (missionLower === 'project' || missionLower.includes('project')) {
          return 'Project';
        } else if (missionLower === 'offhire' || missionLower.includes('off-hire') || missionLower.includes('off hire')) {
          return 'Offhire';
        }
        
        console.warn(`Unknown mission type: "${mission}" for voyage ${voyage.Vessel} - ${voyage["Voyage Number"]}`);
        return undefined;
      };
      
      const missionType = normalizeMissionType(voyage.Mission);
      
      return {
        id: `voyage-${index}`,
        uniqueVoyageId,
        standardizedVoyageId,
        vessel: voyage.Vessel,
        standardizedVesselName: voyage.Vessel.trim(),
        voyageNumber: voyage["Voyage Number"],
        year: voyage.Year,
        month: voyage.Month || 'January',
        monthNumber,
        startDate,
        endDate,
        voyageDate: startDate,
        durationHours,
        type: voyage.Type,
        mission: voyage.Mission,
        missionType,
        routeType: voyage["Route Type"],
        locations: voyage.Locations,
        locationList: locations,
        stopCount,
        includesProduction,
        includesDrilling,
        voyagePurpose,
        originPort,
        mainDestination,
        edit: voyage.Edit,
        isActive: true
      };
    } catch (error) {
      console.error(`❌ Error processing voyage list record ${index + 1}:`, error, voyage);
      
      // Return a minimal record on error
      return {
        id: `voyage-error-${index}`,
        uniqueVoyageId: `ERROR_${index}`,
        standardizedVoyageId: `ERROR_${index}`,
        vessel: voyage.Vessel || 'Unknown',
        standardizedVesselName: voyage.Vessel?.trim() || 'Unknown',
        voyageNumber: voyage["Voyage Number"] || 0,
        year: voyage.Year || 2024, // Default to 2024 for missing year
        month: voyage.Month || 'January',
        monthNumber: 1,
        startDate: voyage["Start Date"] ? parseDate(voyage["Start Date"]) : new Date(2024, 0, 1), // Default to Jan 1, 2024
        endDate: undefined,
        voyageDate: voyage["Start Date"] ? parseDate(voyage["Start Date"]) : new Date(2024, 0, 1), // Default to Jan 1, 2024
        durationHours: undefined,
        type: voyage.Type,
        mission: voyage.Mission || 'Unknown',
        missionType: undefined,
        routeType: voyage["Route Type"],
        locations: voyage.Locations || '',
        locationList: [],
        stopCount: 0,
        includesProduction: false,
        includesDrilling: false,
        voyagePurpose: "Other",
        originPort: undefined,
        mainDestination: undefined,
        edit: voyage.Edit,
        isActive: true
      };
    }
  });
}; 