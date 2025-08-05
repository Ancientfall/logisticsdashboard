/**
 * Cost Allocation Validator - Enhanced utilities for authoritative location determination
 * 
 * Implements CostAllocation.xlsx as the master data source for:
 * - Location determination and LC number validation
 * - Drilling vs production activity classification
 * - Project type and department mapping
 * - Cost allocation percentage handling
 */

import { CostAllocation, VesselManifest, VoyageEvent } from '../types';
import { normalizeRigLocation, BP_OFFSHORE_LOCATIONS } from './vesselRequirementCalculator';

export interface LocationClassification {
  location: string;
  lcNumber?: string;
  projectType: 'drilling' | 'production' | 'mixed' | 'unknown';
  department: 'Drilling' | 'Production' | 'Logistics' | 'Mixed';
  allocationPercentage?: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'cost_allocation' | 'fallback' | 'unknown';
  matchedCostAllocation?: CostAllocation;
}

export interface CostAllocationMatch {
  manifest: VesselManifest;
  costAllocation: CostAllocation | null;
  matchType: 'exact_lc' | 'location_match' | 'fuzzy_match' | 'no_match';
  confidence: 'high' | 'medium' | 'low';
  classification: LocationClassification;
}

export interface DrillingSummary {
  totalDrillingDemand: number;
  totalProductionDemand: number;
  drillingLocationCount: number;
  productionLocationCount: number;
  mixedLocationCount: number;
  drillingToProductionRatio: number;
  locationClassifications: Map<string, LocationClassification>;
}

/**
 * Create authoritative location-to-LC mapping from cost allocation data
 */
export const createLocationLCMapping = (costAllocations: CostAllocation[]): Map<string, CostAllocation[]> => {
  const locationLCMap = new Map<string, CostAllocation[]>();
  
  costAllocations.forEach(allocation => {
    if (!allocation.rigLocation || !allocation.lcNumber) return;
    
    const normalizedLocation = normalizeRigLocation(allocation.rigLocation);
    
    // Only include BP offshore locations
    if (!BP_OFFSHORE_LOCATIONS.includes(normalizedLocation as any)) return;
    
    if (!locationLCMap.has(normalizedLocation)) {
      locationLCMap.set(normalizedLocation, []);
    }
    
    locationLCMap.get(normalizedLocation)!.push(allocation);
  });
  
  return locationLCMap;
};

/**
 * Create LC number to cost allocation mapping for fast lookups
 */
export const createLCMapping = (costAllocations: CostAllocation[]): Map<string, CostAllocation[]> => {
  const lcMap = new Map<string, CostAllocation[]>();
  
  costAllocations.forEach(allocation => {
    if (!allocation.lcNumber) return;
    
    const lcNumber = allocation.lcNumber.trim().toUpperCase();
    
    if (!lcMap.has(lcNumber)) {
      lcMap.set(lcNumber, []);
    }
    
    lcMap.get(lcNumber)!.push(allocation);
  });
  
  return lcMap;
};

/**
 * Classify location based on cost allocation project types
 */
export const classifyLocationActivity = (costAllocations: CostAllocation[]): LocationClassification['projectType'] => {
  if (!costAllocations.length) return 'unknown';
  
  const projectTypes = new Set(
    costAllocations
      .map(ca => ca.projectType?.toLowerCase())
      .filter(Boolean)
  );
  
  const hasDrilling = projectTypes.has('drilling') || projectTypes.has('completions');
  const hasProduction = projectTypes.has('production') || projectTypes.has('maintenance');
  
  if (hasDrilling && hasProduction) return 'mixed';
  if (hasDrilling) return 'drilling';
  if (hasProduction) return 'production';
  
  return 'unknown';
};

/**
 * Determine department based on cost allocation data
 */
export const determineDepartment = (costAllocations: CostAllocation[]): LocationClassification['department'] => {
  if (!costAllocations.length) return 'Logistics';
  
  const departments = new Set(
    costAllocations
      .map(ca => ca.department)
      .filter(Boolean)
  );
  
  const projectTypes = new Set(
    costAllocations
      .map(ca => ca.projectType)
      .filter(Boolean)
  );
  
  // Priority-based department determination
  if (departments.has('Drilling') || projectTypes.has('Drilling') || projectTypes.has('Completions')) {
    return 'Drilling';
  }
  
  if (departments.has('Production') || projectTypes.has('Production') || projectTypes.has('Maintenance')) {
    return 'Production';
  }
  
  if (departments.size > 1 || projectTypes.size > 1) {
    return 'Mixed';
  }
  
  return 'Logistics';
};

/**
 * Match vessel manifest with cost allocation data
 */
export const matchManifestToCostAllocation = (
  manifest: VesselManifest,
  costAllocations: CostAllocation[],
  lcMapping: Map<string, CostAllocation[]>,
  locationMapping: Map<string, CostAllocation[]>
): CostAllocationMatch => {
  
  // Strategy 1: Direct LC number match (highest confidence)
  if (manifest.costCode) {
    const lcNumber = manifest.costCode.trim().toUpperCase();
    const exactMatches = lcMapping.get(lcNumber);
    
    if (exactMatches && exactMatches.length > 0) {
      const bestMatch = exactMatches[0]; // Use first match (could be enhanced with date/time matching)
      
      return {
        manifest,
        costAllocation: bestMatch,
        matchType: 'exact_lc',
        confidence: 'high',
        classification: {
          location: normalizeRigLocation(manifest.offshoreLocation || manifest.mappedLocation || ''),
          lcNumber: bestMatch.lcNumber,
          projectType: classifyLocationActivity(exactMatches),
          department: determineDepartment(exactMatches),
          allocationPercentage: 1.0, // Full allocation for exact LC match
          confidence: 'high',
          source: 'cost_allocation',
          matchedCostAllocation: bestMatch
        }
      };
    }
  }
  
  // Strategy 2: Location-based match (medium confidence)
  const manifestLocation = normalizeRigLocation(
    manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || ''
  );
  
  if (manifestLocation && BP_OFFSHORE_LOCATIONS.includes(manifestLocation as any)) {
    const locationMatches = locationMapping.get(manifestLocation);
    
    if (locationMatches && locationMatches.length > 0) {
      return {
        manifest,
        costAllocation: locationMatches[0],
        matchType: 'location_match',
        confidence: 'medium',
        classification: {
          location: manifestLocation,
          lcNumber: locationMatches[0].lcNumber,
          projectType: classifyLocationActivity(locationMatches),
          department: determineDepartment(locationMatches),
          allocationPercentage: locationMatches.length > 1 ? 0.5 : 1.0, // Split if multiple matches
          confidence: 'medium',
          source: 'cost_allocation',
          matchedCostAllocation: locationMatches[0]
        }
      };
    }
  }
  
  // Strategy 3: Fuzzy location match (low confidence)
  for (const [location, allocations] of locationMapping.entries()) {
    if (manifestLocation.toLowerCase().includes(location.toLowerCase()) || 
        location.toLowerCase().includes(manifestLocation.toLowerCase())) {
      
      return {
        manifest,
        costAllocation: allocations[0],
        matchType: 'fuzzy_match',
        confidence: 'low',
        classification: {
          location: manifestLocation,
          lcNumber: allocations[0].lcNumber,
          projectType: classifyLocationActivity(allocations),
          department: determineDepartment(allocations),
          allocationPercentage: 0.3, // Lower confidence allocation
          confidence: 'low',
          source: 'cost_allocation',
          matchedCostAllocation: allocations[0]
        }
      };
    }
  }
  
  // Strategy 4: No match - use fallback classification
  return {
    manifest,
    costAllocation: null,
    matchType: 'no_match',
    confidence: 'low',
    classification: {
      location: manifestLocation,
      projectType: 'unknown',
      department: 'Logistics',
      confidence: 'low',
      source: 'fallback'
    }
  };
};

/**
 * Process all manifests and create cost allocation matches
 */
export const processManifestCostAllocationMatches = (
  manifests: VesselManifest[],
  costAllocations: CostAllocation[]
): CostAllocationMatch[] => {
  console.log('🔍 Processing manifest cost allocation matches...');
  
  const lcMapping = createLCMapping(costAllocations);
  const locationMapping = createLocationLCMapping(costAllocations);
  
  console.log(`📊 Created mappings: ${lcMapping.size} LC numbers, ${locationMapping.size} locations`);
  
  const matches = manifests.map(manifest => 
    matchManifestToCostAllocation(manifest, costAllocations, lcMapping, locationMapping)
  );
  
  // Log match statistics
  const matchStats = {
    exact_lc: matches.filter(m => m.matchType === 'exact_lc').length,
    location_match: matches.filter(m => m.matchType === 'location_match').length,
    fuzzy_match: matches.filter(m => m.matchType === 'fuzzy_match').length,
    no_match: matches.filter(m => m.matchType === 'no_match').length,
    high_confidence: matches.filter(m => m.confidence === 'high').length,
    medium_confidence: matches.filter(m => m.confidence === 'medium').length,
    low_confidence: matches.filter(m => m.confidence === 'low').length
  };
  
  console.log('📈 Match Statistics:');
  console.log(`  Exact LC matches: ${matchStats.exact_lc} (${(matchStats.exact_lc/matches.length*100).toFixed(1)}%)`);
  console.log(`  Location matches: ${matchStats.location_match} (${(matchStats.location_match/matches.length*100).toFixed(1)}%)`);
  console.log(`  Fuzzy matches: ${matchStats.fuzzy_match} (${(matchStats.fuzzy_match/matches.length*100).toFixed(1)}%)`);
  console.log(`  No matches: ${matchStats.no_match} (${(matchStats.no_match/matches.length*100).toFixed(1)}%)`);
  console.log(`  High confidence: ${matchStats.high_confidence} (${(matchStats.high_confidence/matches.length*100).toFixed(1)}%)`);
  
  return matches;
};

/**
 * Calculate drilling summary based on cost allocation matches
 */
export const calculateDrillingSummary = (matches: CostAllocationMatch[]): DrillingSummary => {
  const locationClassifications = new Map<string, LocationClassification>();
  let totalDrillingDemand = 0;
  let totalProductionDemand = 0;
  
  // Group by location to get classification
  const locationGroups = new Map<string, CostAllocationMatch[]>();
  
  matches.forEach(match => {
    const location = match.classification.location;
    if (!location) return;
    
    if (!locationGroups.has(location)) {
      locationGroups.set(location, []);
    }
    locationGroups.get(location)!.push(match);
  });
  
  // Classify each location and calculate demand
  locationGroups.forEach((locationMatches, location) => {
    const allCostAllocations = locationMatches
      .map(m => m.costAllocation)
      .filter(Boolean) as CostAllocation[];
    
    const classification: LocationClassification = {
      location,
      projectType: classifyLocationActivity(allCostAllocations),
      department: determineDepartment(allCostAllocations),
      confidence: locationMatches[0]?.confidence || 'low',
      source: allCostAllocations.length > 0 ? 'cost_allocation' : 'fallback',
      lcNumber: allCostAllocations[0]?.lcNumber,
      matchedCostAllocation: allCostAllocations[0]
    };
    
    locationClassifications.set(location, classification);
    
    // Calculate demand for this location
    const locationDemand = locationMatches.length;
    
    switch (classification.projectType) {
      case 'drilling':
        totalDrillingDemand += locationDemand;
        break;
      case 'production':
        totalProductionDemand += locationDemand;
        break;
      case 'mixed':
        // Split based on cost allocation ratios or default 60/40
        const drillingRatio = 0.6; // Could be enhanced with actual cost allocation percentages
        totalDrillingDemand += locationDemand * drillingRatio;
        totalProductionDemand += locationDemand * (1 - drillingRatio);
        break;
      default:
        // Default unknown to mixed
        totalDrillingDemand += locationDemand * 0.5;
        totalProductionDemand += locationDemand * 0.5;
    }
  });
  
  const drillingLocationCount = Array.from(locationClassifications.values())
    .filter(c => c.projectType === 'drilling').length;
  
  const productionLocationCount = Array.from(locationClassifications.values())
    .filter(c => c.projectType === 'production').length;
  
  const mixedLocationCount = Array.from(locationClassifications.values())
    .filter(c => c.projectType === 'mixed').length;
  
  const drillingToProductionRatio = totalProductionDemand > 0 ? 
    totalDrillingDemand / totalProductionDemand : 0;
  
  return {
    totalDrillingDemand,
    totalProductionDemand,
    drillingLocationCount,
    productionLocationCount,
    mixedLocationCount,
    drillingToProductionRatio,
    locationClassifications
  };
};

/**
 * Validate voyage event against cost allocation data
 */
export const validateVoyageEventLocation = (
  event: VoyageEvent,
  costAllocations: CostAllocation[],
  lcMapping: Map<string, CostAllocation[]>
): {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  matchedAllocation?: CostAllocation;
  validationNotes: string[];
} => {
  const notes: string[] = [];
  
  // Check LC number match
  if (event.lcNumber) {
    const matches = lcMapping.get(event.lcNumber.toUpperCase());
    if (matches && matches.length > 0) {
      return {
        isValid: true,
        confidence: 'high',
        matchedAllocation: matches[0],
        validationNotes: ['LC number validated against cost allocation']
      };
    } else {
      notes.push(`LC number ${event.lcNumber} not found in cost allocation`);
    }
  }
  
  // Check location consistency
  const normalizedEventLocation = normalizeRigLocation(event.mappedLocation || event.location);
  const relevantAllocations = costAllocations.filter(ca => 
    ca.rigLocation && normalizeRigLocation(ca.rigLocation) === normalizedEventLocation
  );
  
  if (relevantAllocations.length > 0) {
    return {
      isValid: true,
      confidence: 'medium',
      matchedAllocation: relevantAllocations[0],
      validationNotes: ['Location validated against cost allocation']
    };
  }
  
  notes.push(`Location ${normalizedEventLocation} not found in cost allocation`);
  
  return {
    isValid: false,
    confidence: 'low',
    validationNotes: notes
  };
};

/**
 * Get drilling vs production ratios from cost allocation data
 */
export const getCostAllocationRatios = (costAllocations: CostAllocation[]) => {
  const projectTypeCounts = new Map<string, number>();
  
  costAllocations.forEach(allocation => {
    if (allocation.projectType) {
      const type = allocation.projectType.toLowerCase();
      projectTypeCounts.set(type, (projectTypeCounts.get(type) || 0) + 1);
    }
  });
  
  const drillingCount = (projectTypeCounts.get('drilling') || 0) + (projectTypeCounts.get('completions') || 0);
  const productionCount = (projectTypeCounts.get('production') || 0) + (projectTypeCounts.get('maintenance') || 0);
  const totalCount = drillingCount + productionCount;
  
  if (totalCount === 0) {
    return { drillingRatio: 0.6, productionRatio: 0.4 }; // Default fallback
  }
  
  return {
    drillingRatio: drillingCount / totalCount,
    productionRatio: productionCount / totalCount
  };
};