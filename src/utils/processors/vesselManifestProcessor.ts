import { VesselManifest, MasterFacility, CostAllocation, VoyageSegment } from '../../types';
import { parseDate } from '../dateUtils';
import { inferCompanyFromVessel, inferVesselType } from '../activityClassification';
import { createStandardizedVoyageId, createEmptyManifest, safeNumeric } from '../helpers';
import { enhanceManifestWithSegmentData } from '../manifestVoyageIntegration';

/**
 * Vessel manifest data processor
 * Extracted from dataProcessing.ts to improve modularity
 */

// Raw vessel manifest interface - corrected to match actual Excel column names
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
  RTLifts: number;              // Excel column "RTLifts" (no space)
  Lifts: number;
  "Wet Bulk (bbls)": number;
  "Wet Bulk Gal": number;       // Excel uses "Wet Bulk Gal" not "gals"
  "RTWet Bulk Gal": number;     // Excel RT Wet Bulk field
  "Deck Sqft": number;
  Remarks?: string;
  Year: number;
}

/**
 * Process Vessel Manifests with enhanced logic from PowerBI
 * Incorporates sophisticated integrated facility handling and department assignment
 */
export const processVesselManifests = (
  rawManifests: RawVesselManifest[],
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>
): VesselManifest[] => {
  
  console.log(`🚢 Processing ${rawManifests.length} vessel manifests with enhanced PowerBI logic...`);
  
  return rawManifests.map((manifest, index) => {
    try {
      const manifestDate = parseDate(manifest["Manifest Date"]);
      
      // Enhanced Cost Code Processing (from PowerBI logic)
      const processCostInfo = () => {
        const costCode = manifest["Cost Code"];
        
        // Special handling for Fourchon logistics cost codes
        const specialLogisticsCodes = ["999", "333", "7777", "8888"];
        const isSpecialCost = costCode && specialLogisticsCodes.includes(costCode);
        const isFromFourchon = manifest.From && manifest.From.toLowerCase().includes('fourchon');
        
        if (isSpecialCost && isFromFourchon) {
          return {
            costCode,
            originalLocation: "Fourchon",
            mappedLocation: "Fourchon",
            department: "Logistics" as "Drilling" | "Production" | "Logistics",
            matchFound: true,
            isIntegratedFacility: false,
            isDrillingActivity: false
          };
        }
        
        // Direct lookup from CostAllocation table
        const costAllocation = costCode ? costAllocationMap.get(costCode) : null;
        const hasMatch = !!costAllocation;
        const lookupLocation = costAllocation?.locationReference;
        
        // Enhanced integrated facility detection
        const offshoreLocation = manifest["Offshore Location"] || "";
        const isIntegratedFacility = 
          lookupLocation === "Mad Dog" || 
          lookupLocation === "Thunder Horse PDQ" ||
          offshoreLocation.toLowerCase().includes("mad dog") ||
          offshoreLocation.toLowerCase().includes("thunder horse");
        
        // Determine if drilling based on location name patterns
        const isDrillingActivity = 
          offshoreLocation.toLowerCase().includes("drilling") ||
          offshoreLocation.toLowerCase().includes("drill");
        
        // Final location processing for integrated facilities (PowerBI logic)
        let finalLocation = lookupLocation;
        if (isIntegratedFacility) {
          if (lookupLocation?.includes("Mad Dog") || offshoreLocation.toLowerCase().includes("mad dog")) {
            finalLocation = isDrillingActivity ? "Mad Dog Drilling" : "Mad Dog Prod";
          } else if (lookupLocation?.includes("Thunder Horse") || offshoreLocation.toLowerCase().includes("thunder horse")) {
            finalLocation = isDrillingActivity ? "Thunder Horse Drilling" : "Thunder Horse Prod";
          }
        }
        
        // Department determination (PowerBI multi-step logic)
        let department: "Drilling" | "Production" | "Logistics" | null = null;
        if (finalLocation) {
          if (finalLocation.toLowerCase().includes("drilling") || finalLocation.toLowerCase().includes("drill")) {
            department = "Drilling";
          } else if (finalLocation.toLowerCase().includes("prod")) {
            department = "Production";
          }
        }
        
        return {
          costCode,
          originalLocation: lookupLocation,
          mappedLocation: finalLocation || offshoreLocation,
          department,
          matchFound: hasMatch,
          isIntegratedFacility,
          isDrillingActivity
        };
      };
      
      // Enhanced Offshore Location Analysis (from PowerBI logic)
      const processOffshoreLocationInfo = () => {
        const offshoreLocation = manifest["Offshore Location"] || "";
        
        // Check if location already indicates drilling
        const isDrillingByName = 
          offshoreLocation.toLowerCase().includes("drilling") ||
          offshoreLocation.toLowerCase().includes("drill");
        
        // Check for integrated facilities
        const isIntegratedFacility = 
          offshoreLocation.toLowerCase().includes("mad dog") ||
          offshoreLocation.toLowerCase().includes("thunder horse");
        
        // Check in Master Facilities for drilling capability
        const facility = facilitiesMap.get(offshoreLocation.toLowerCase());
        const isDrillingByFacility = facility?.isDrillingCapable;
        
        return {
          offshoreLocation,
          isDrillingByName,
          isDrillingByFacility,
          isIntegratedFacility
        };
      };
      
      // Process both cost and offshore location info
      const costInfo = processCostInfo();
      const offshoreInfo = processOffshoreLocationInfo();
      
      // Final Department Assignment (PowerBI combined logic)
      const determineFinalDepartment = (): "Drilling" | "Production" | "Logistics" | undefined => {
        // First try to use department from cost code mapping
        if (costInfo.department) {
          return costInfo.department;
        }
        
        // Check if this is an integrated facility with drilling indicators
        const isIntegrated = costInfo.isIntegratedFacility || offshoreInfo.isIntegratedFacility;
        const isDrilling = costInfo.isDrillingActivity || offshoreInfo.isDrillingByName || offshoreInfo.isDrillingByFacility;
        
        // Specific checks for Thunder Horse and Mad Dog
        const offshoreLocation = manifest["Offshore Location"] || "";
        const isThunderHorse = offshoreLocation.toLowerCase().includes("thunder horse");
        const isMadDog = offshoreLocation.toLowerCase().includes("mad dog");
        
        if ((isIntegrated || isThunderHorse || isMadDog) && isDrilling) {
          return "Drilling";
        } else if (isIntegrated || isThunderHorse || isMadDog) {
          return "Production";
        } else if (offshoreLocation && !offshoreLocation.toLowerCase().includes("drill")) {
          return "Production";
        }
        
        return undefined;
      };
      
      // Final Mapped Location (PowerBI sophisticated mapping)
      const determineFinalMappedLocation = (): string => {
        const offshoreLocation = manifest["Offshore Location"] || "";
        const finalDepartment = determineFinalDepartment();
        
        // Direct pattern recognition for explicit facility names (most reliable)
        if (offshoreLocation.toLowerCase().includes("thunder horse drilling") ||
            (offshoreLocation.toLowerCase().includes("thunder horse") && offshoreLocation.toLowerCase().includes("drill"))) {
          return "Thunder Horse Drilling";
        } else if (offshoreLocation.toLowerCase().includes("thunder horse prod")) {
          return "Thunder Horse Prod";
        } else if (offshoreLocation.toLowerCase().includes("mad dog drilling") ||
                   (offshoreLocation.toLowerCase().includes("mad dog") && offshoreLocation.toLowerCase().includes("drill"))) {
          return "Mad Dog Drilling";
        } else if (offshoreLocation.toLowerCase().includes("mad dog prod")) {
          return "Mad Dog Prod";
        }
        
        // Use cost allocation mapping if available
        if (costInfo.mappedLocation && costInfo.mappedLocation !== offshoreLocation) {
          return costInfo.mappedLocation;
        }
        
        // Department-based mapping for integrated facilities
        const isThunderHorse = offshoreLocation.toLowerCase().includes("thunder horse");
        const isMadDog = offshoreLocation.toLowerCase().includes("mad dog");
        
        if (isThunderHorse && finalDepartment === "Drilling") {
          return "Thunder Horse Drilling";
        } else if (isThunderHorse) {
          return "Thunder Horse Prod";
        } else if (isMadDog && finalDepartment === "Drilling") {
          return "Mad Dog Drilling";
        } else if (isMadDog) {
          return "Mad Dog Prod";
        }
        
        // Default to original location
        return offshoreLocation;
      };
      
      // Enhanced Cargo Type Classification (from PowerBI logic)
      const determineCargoType = (): "Deck Cargo" | "Below Deck Cargo" | "Liquid Bulk" | "Lift Only" | "Other/Mixed" => {
        const deckTons = manifest["deck tons (metric)"] || 0;
        const rtTons = manifest["RT Tons"] || 0;
        const wetBulkBbls = manifest["Wet Bulk (bbls)"] || 0;
        const wetBulkGals = manifest["Wet Bulk Gal"] || 0;
        const lifts = manifest.Lifts || 0;
        const rtLifts = manifest.RTLifts || 0;
        
        if (deckTons > 0) return "Deck Cargo";
        if (rtTons > 0) return "Below Deck Cargo";
        if (wetBulkBbls > 0 || wetBulkGals > 0) return "Liquid Bulk";
        if ((lifts > 0 || rtLifts > 0) && deckTons === 0 && rtTons === 0) return "Lift Only";
        return "Other/Mixed";
      };
      
      // Calculate final values
      const finalDepartment = determineFinalDepartment();
      const mappedLocation = determineFinalMappedLocation();
      const cargoType = determineCargoType();
      
      // Enhanced Date Fields (from PowerBI)
      const manifestDateOnly = new Date(manifestDate.getFullYear(), manifestDate.getMonth(), manifestDate.getDate());
      const monthName = manifestDate.toLocaleString('default', { month: 'long' });
      const monthNumber = manifestDate.getMonth() + 1;
      const quarter = `Q${Math.ceil(monthNumber / 3)}`;
      
      // Standardized Voyage ID (from PowerBI)
      const standardizedVoyageId = manifest["Voyage Id"] ? String(manifest["Voyage Id"]).trim() : createStandardizedVoyageId(Number(manifest["Voyage Id"]) || 0, manifestDate);
      
      // Debug removed to improve performance

      return {
        id: `manifest-${index}`,
        voyageId: String(manifest["Voyage Id"] || ''),
        standardizedVoyageId,
        manifestNumber: manifest["Manifest Number"] || '',
        transporter: manifest.Transporter || '',
        from: manifest.From || '',
        offshoreLocation: manifest["Offshore Location"] || '',
        mappedLocation,
        deckLbs: safeNumeric(manifest["Deck Lbs"]),
        deckTons: safeNumeric(manifest["deck tons (metric)"]),
        rtTons: safeNumeric(manifest["RT Tons"]),
        rtLifts: safeNumeric(manifest.RTLifts),
        lifts: safeNumeric(manifest.Lifts),
        wetBulkBbls: safeNumeric(manifest["Wet Bulk (bbls)"]),
        wetBulkGals: safeNumeric(manifest["Wet Bulk Gal"]),
        rtWetBulkGals: safeNumeric(manifest["RTWet Bulk Gal"]),
        deckSqft: safeNumeric(manifest["Deck Sqft"]),
        manifestDate,
        manifestDateOnly,
        month: monthName,
        monthNumber,
        quarter,
        year: manifest.Year || manifestDate.getFullYear(),
        costCode: manifest["Cost Code"],
        finalDepartment,
        cargoType,
        remarks: manifest.Remarks,
        company: inferCompanyFromVessel(manifest.Transporter || ''),
        vesselType: inferVesselType(manifest.Transporter || ''),
        
        // Additional PowerBI-inspired fields for analytics
        isIntegratedFacility: costInfo.isIntegratedFacility || offshoreInfo.isIntegratedFacility,
        isDrillingActivity: costInfo.isDrillingActivity || offshoreInfo.isDrillingByName || !!offshoreInfo.isDrillingByFacility,
        costCodeMatchFound: costInfo.matchFound,
        originalLocationFromCost: costInfo.originalLocation
      };
    } catch (error) {
      console.error(`❌ Error processing vessel manifest ${index + 1}:`, error, manifest);
      return createEmptyManifest(index, manifest);
    }
  });
};

/**
 * Process Vessel Manifests with voyage segment integration
 * Enhanced version that matches manifests to voyage segments for better cost allocation
 */
export const processVesselManifestsWithSegments = (
  rawManifests: RawVesselManifest[],
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>,
  voyageSegments: VoyageSegment[]
): VesselManifest[] => {
  
  console.log(`🚢 Processing ${rawManifests.length} vessel manifests with voyage segment integration...`);
  
  // First process manifests normally
  const baseManifests = processVesselManifests(rawManifests, facilitiesMap, costAllocationMap);
  
  // Group segments by voyage ID for efficient lookup
  const segmentsByVoyage = new Map<string, VoyageSegment[]>();
  voyageSegments.forEach(segment => {
    const voyageIds = [segment.uniqueVoyageId, segment.standardizedVoyageId];
    voyageIds.forEach(id => {
      if (!segmentsByVoyage.has(id)) {
        segmentsByVoyage.set(id, []);
      }
      segmentsByVoyage.get(id)!.push(segment);
    });
  });
  
  // Enhance each manifest with segment data
  return baseManifests.map(manifest => {
    try {
      // Find segments for this manifest's voyage
      const relevantSegments = segmentsByVoyage.get(manifest.voyageId) || 
                              segmentsByVoyage.get(manifest.standardizedVoyageId) || 
                              [];
      
      if (relevantSegments.length === 0) {
        return manifest;
      }
      
      // Enhance manifest with segment data
      const enhanced = enhanceManifestWithSegmentData(manifest, relevantSegments);
      
      // Log improvements
      if (enhanced.matchConfidence && enhanced.matchConfidence > 50) {
        console.log(`✅ Enhanced manifest ${manifest.manifestNumber}:`, {
          originalLocation: manifest.offshoreLocation,
          segmentDestination: enhanced.segmentDestination,
          originalDepartment: manifest.finalDepartment,
          validatedDepartment: enhanced.validatedDepartment,
          confidence: enhanced.matchConfidence,
          matchType: enhanced.matchType
        });
      }
      
      // Apply validated department if confidence is high
      if (enhanced.validatedDepartment && enhanced.matchConfidence && enhanced.matchConfidence > 70) {
        // Only update if validated department is one of the allowed values
        if (['Drilling', 'Production', 'Logistics'].includes(enhanced.validatedDepartment)) {
          enhanced.finalDepartment = enhanced.validatedDepartment as 'Drilling' | 'Production' | 'Logistics';
        }
        
        // Update mapped location if suggested
        if (enhanced.suggestedLocation && enhanced.matchType !== 'exact') {
          console.log(`📍 Suggesting location update for manifest ${manifest.manifestNumber}: ${manifest.offshoreLocation} → ${enhanced.suggestedLocation}`);
        }
      }
      
      return enhanced;
      
    } catch (error) {
      console.error(`❌ Error enhancing manifest ${manifest.manifestNumber}:`, error);
      return manifest;
    }
  });
}; 