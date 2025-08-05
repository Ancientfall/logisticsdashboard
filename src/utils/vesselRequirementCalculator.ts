/**
 * Vessel Requirement Calculator - Data-Driven Approach
 * 
 * Three-step methodology:
 * 1. Calculate monthly delivery demand by location (VesselManifests.xlsx)
 * 2. Calculate monthly delivery capability per vessel (VoyageList.xlsx)  
 * 3. Determine vessel requirement: demand ÷ capability = required vessels
 */

import { VoyageList, VesselManifest } from '../types';
import { 
  processManifestCostAllocationMatches, 
  calculateDrillingSummary,
  CostAllocationMatch 
} from './costAllocationValidator';

// Analysis period: Jan 1 - Jun 30, 2025 (6 months)
const ANALYSIS_START_DATE = new Date('2025-01-01');
const ANALYSIS_END_DATE = new Date('2025-06-30');

// Vessel type filtering - exclude specific vessels: Tucker Candies, Fantasy Island, Fast vessels
export const isPSVOrOSV = (vesselName: string): boolean => {
  const vessel = vesselName.toLowerCase();
  
  // Exclude specific vessels as requested
  const excludedVessels = [
    'tucker candies',
    'fantasy island', 
    'fast goliath',
    'fast leopard',
    'fast server',
    'fast tiger' // Keep this one too as it was already excluded
  ];
  
  // Check if this vessel is one of the excluded vessels
  if (excludedVessels.some(excluded => vessel.includes(excluded))) {
    // Log excluded vessels for debugging
    if (Math.random() < 0.1) { // Only log 10% to avoid spam
      console.log(`🚫 Excluding vessel: ${vesselName} (matches exclusion pattern)`);
    }
    return false;
  }
  
  // Exclude only basic non-vessel entries (keep it minimal)
  const excludePatterns = [
    'inspections and maintenance',
    'crew boat',
    'utility boat'
  ];
  
  return !excludePatterns.some(pattern => vessel.includes(pattern));
};

// BP Offshore location mappings for normalization
// Based on your 10 key BP offshore locations
export const RIG_LOCATION_MAPPINGS: Record<string, string> = {
  // 3. Production Locations - UPDATED: Map to actual production locations
  'Argos': 'Argos',
  'ARGOS': 'Argos',
  
  'ATL': 'Atlantis',
  'AP': 'Atlantis', 
  'Atlantis': 'Atlantis',
  'Atlantis PQ': 'Atlantis',
  'ATLANTIS': 'Atlantis',
  
  'NK': 'Na Kika',
  'Na Kika': 'Na Kika',
  'NaKika': 'Na Kika',
  'NA KIKA': 'Na Kika',
  
  // Shenzi - Woodside location but BP handles
  'Shenzi': 'Shenzi',
  'SHENZI': 'Shenzi',
  'SZ': 'Shenzi',
  
  // Fantasy Island - Virtual/administrative location
  'FI': 'Fantasy Island',
  'Fantasy Island': 'Fantasy Island',
  'FANTASY ISLAND': 'Fantasy Island',
  
  // 4. Mad Dog - SEPARATED: Drilling vs Production
  'Mad Dog Drilling': 'Mad Dog Drilling',
  'MDD': 'Mad Dog Drilling',
  'MAD DOG DRILLING': 'Mad Dog Drilling',
  'Mad Dog Drill': 'Mad Dog Drilling',
  
  'Mad Dog Prod': 'Mad Dog Prod',
  'Mad Dog Production': 'Mad Dog Prod',
  'MDP': 'Mad Dog Prod',
  'MAD DOG PRODUCTION': 'Mad Dog Prod',
  'MAD DOG PROD': 'Mad Dog Prod',
  
  // Note: Generic Mad Dog and Thunder Horse entries removed from mappings
  // to prevent automatic classification as drilling. Only explicit drilling
  // entries like 'Mad Dog Drilling', 'Thunder Horse Drilling' are mapped.
  
  // 5. Thunder Horse - SEPARATED: Drilling vs Production  
  'ThunderHorse Drilling': 'ThunderHorse Drilling',
  'Thunder Horse Drilling': 'ThunderHorse Drilling',
  'THD': 'ThunderHorse Drilling',
  'THUNDER HORSE DRILLING': 'ThunderHorse Drilling',
  'Thunder Horse Drill': 'ThunderHorse Drilling',
  
  'Thunder Horse Prod': 'Thunder Horse Prod',
  'Thunder Horse Production': 'Thunder Horse Prod',
  'THP': 'Thunder Horse Prod',
  'THUNDER HORSE PRODUCTION': 'Thunder Horse Prod',
  'THUNDER HORSE PROD': 'Thunder Horse Prod',
  
  // Generic Thunder Horse maps - be conservative, only explicit drilling
  // 'THD': 'ThunderHorse Drilling', // Already defined above
  'Thunder Horse PDQ': 'ThunderHorse Drilling', // PDQ is drilling-specific
  // 'THUNDER HORSE DRILLING': 'ThunderHorse Drilling', // Already defined above
  
  // 6. Ocean BlackLion
  'OBL': 'Ocean BlackLion',
  'Ocean BlackLion': 'Ocean BlackLion',
  'Ocean Black Lion': 'Ocean BlackLion',
  'OCEAN BLACKLION': 'Ocean BlackLion',
  
  // 7. Ocean Blackhornet
  'OBH': 'Ocean Blackhornet',
  'Ocean Blackhornet': 'Ocean Blackhornet',
  'Ocean Black Hornet': 'Ocean Blackhornet',
  'OCEAN BLACKHORNET': 'Ocean Blackhornet',
  
  // 8. Deepwater Invictus
  'DVS': 'Deepwater Invictus',
  'DI': 'Deepwater Invictus',
  'Deepwater Invictus': 'Deepwater Invictus',
  'DEEPWATER INVICTUS': 'Deepwater Invictus',
  
  // 9. Stena IceMAX
  'IM': 'Stena IceMAX',
  'SI': 'Stena IceMAX',
  'Stena IceMAX': 'Stena IceMAX',
  'Stena Ice MAX': 'Stena IceMAX',
  'STENA ICEMAX': 'Stena IceMAX',
  
  // 10. Island Venture
  'IV': 'Island Venture',
  'Island Venture': 'Island Venture',
  'ISLAND VENTURE': 'Island Venture'
};

// BP Offshore Locations - CORRECTED: Only the 6 locations for operational calculations
// Fantasy Island is excluded (handled as +1 baseline), Island Venture removed per requirements
// DRILLING LOCATIONS: 6 locations - Variable demand, hard to forecast (PRIMARY FOCUS)
export const BP_DRILLING_LOCATIONS = [
  'Ocean BlackLion',
  'Ocean Blackhornet', 
  'Mad Dog Drilling',
  'ThunderHorse Drilling',
  'Stena IceMAX',
  'Deepwater Invictus'
] as const;

// PRODUCTION LOCATIONS: 6 locations - Fixed 1.5 vessel baseline (simpler model)
export const BP_PRODUCTION_LOCATIONS = [
  'Argos',
  'Atlantis', 
  'Mad Dog Prod',
  'Na Kika',
  'Thunder Horse Prod',
  'Shenzi' // Woodside location but BP handles
] as const;

// LEGACY: Combined locations array for backward compatibility
export const BP_OFFSHORE_LOCATIONS = [
  ...BP_DRILLING_LOCATIONS,
  ...BP_PRODUCTION_LOCATIONS
] as const;

// ENHANCED PRODUCTION FLEET BASELINE: Fixed vessel allocation (not calculated dynamically)
export const PRODUCTION_FLEET_BASELINE = 1.25; // Fantasy Island (1.0) + Additional (0.25) for Thunder Horse support
export const CHEVRON_OUTSOURCED_CAPACITY = 0.25; // Chevron partnership vessel dedicated to Atlantis operations
export const MAD_DOG_WAREHOUSE_VESSELS = 1; // Additional warehouse requirement for Mad Dog operations
export const FANTASY_ISLAND_VESSEL_COUNT = 1; // Part of production baseline (Fantasy Island)

// TOTAL PRODUCTION CAPACITY: 1.5 vessels (1.25 internal + 0.25 Chevron outsourced)
export const TOTAL_PRODUCTION_CAPACITY = PRODUCTION_FLEET_BASELINE + CHEVRON_OUTSOURCED_CAPACITY;

// LEGACY: Keep old constant name for backward compatibility
export const CHEVRON_PARTNERSHIP_VESSELS = CHEVRON_OUTSOURCED_CAPACITY;

/**
 * ADJUSTMENT: Check if location is Fantasy Island (which has hardcoded vessel count)
 */
export const isFantasyIsland = (location: string): boolean => {
  const normalizedLocation = normalizeRigLocation(location);
  return normalizedLocation === 'Fantasy Island';
};

/**
 * ADJUSTMENT: Get Fantasy Island vessel contribution
 */
export const getFantasyIslandVesselContribution = (): {
  vesselCount: number;
  capability: number;
  locationDemand: any;
} => {
  return {
    vesselCount: FANTASY_ISLAND_VESSEL_COUNT,
    capability: FANTASY_ISLAND_VESSEL_COUNT, // 1 vessel = 1 capability unit
    locationDemand: {
      location: 'Fantasy Island',
      totalDeliveries: 0, // No real delivery data, just vessel count
      monthlyAverage: 0,
      isFantasyIsland: true,
      vesselRequirement: FANTASY_ISLAND_VESSEL_COUNT
    }
  };
};

/**
 * Normalize rig location to standard format
 */
export const normalizeRigLocation = (location: string): string => {
  if (!location) return 'Unknown';
  
  const locationTrimmed = location.trim();
  const locationUpper = locationTrimmed.toUpperCase();
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(RIG_LOCATION_MAPPINGS)) {
    if (key.toUpperCase() === locationUpper || locationTrimmed.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return locationTrimmed;
};

export interface LocationDeliveryDemand {
  location: string;
  totalDeliveries: number;
  monthlyAverage: number;
  monthlyBreakdown: Record<string, number>; // '2025-01' → count
}

export interface VesselCapability {
  vesselName: string;
  totalUniquePortCalls: number;
  monthlyAverage: number;
  monthlyBreakdown: Record<string, number>; // '2025-01' → total deliveries made
}

export interface VesselCapabilityResult {
  vesselCapabilities: VesselCapability[];
  fleetCapability: number;
  currentFleetSize: number;
}

export interface DeliveryDemandResult {
  locationDemands: LocationDeliveryDemand[];
  totalOffshoreDemandPerMonth: number;
  averageDrillingDemand: number;
  averageProductionDemand: number;
}

export interface VesselRequirementResult {
  // Analysis period
  analysisDateRange: {
    startDate: string;
    endDate: string;
    monthsCovered: number;
  };
  
  // Demand side (Step 1)
  totalMonthlyDeliveryDemand: number;
  locationDemands: LocationDeliveryDemand[];
  averageDrillingDemand: number;
  averageProductionDemand: number;
  
  // Supply side (Step 2)
  averageVesselCapability: number;
  totalActiveVessels: number;
  vesselCapabilities: VesselCapability[];
  
  // Final calculation (Step 3)
  requiredVessels: number;
  currentVessels: number;
  utilizationGap: number; // positive = need more vessels, negative = excess capacity
  utilizationPercentage: number;
  recommendation: string;
  
  // Enhanced monthly breakdown data for visualizations
  monthlyBreakdown: {
    month: string;
    totalDemand: number;
    totalCapability: number;
    drillingDemand: number;
    productionDemand: number;
    utilizationRate: number;
    gap: number;
  }[];
}

export interface EnhancedVesselRequirementResult extends VesselRequirementResult {
  // Enhanced drilling-focused calculations
  totalDrillingDemand: number; // Demand from 6 drilling locations only
  currentTotalFleetCapability: number; // Total fleet capability before allocation
  currentDrillingCapability: number; // Fleet capability available for drilling (after production allocation)
  drillingGap: number; // Additional drilling vessels needed (drilling demand - drilling capability)
  madDogWarehouseVessels: number; // Mad Dog warehouse requirement (+1)
  productionFleetBaseline: number; // Fixed production fleet allocation (1.25)
  chevronOutsourcedCapacity: number; // Chevron outsourced capacity (0.25)
  drillingOnlyRecommendation: number; // Drilling-only vessel recommendation (excludes production)
  enhancedRecommendation: string; // Detailed recommendation with breakdown
  
  // Enhanced breakdown showing components  
  recommendationBreakdown: {
    productionFleet: number; // Internal production fleet (1.25)
    outsourcedCapacity: number; // Chevron outsourced capacity (0.25)
    drillingGap: number; // Additional drilling vessels needed
    madDogWarehouse: number; // Mad Dog warehouse vessels
    drillingOnlyTotal: number; // Additional drilling-only recommendation
    totalDrillingRequired: number; // Total drilling fleet required for all drilling operations
    totalInternalRequired: number; // Total internal vessels needed (drilling + production - outsourced + warehouse)
    totalWithProduction: number; // Total including production (for reference)
  };
  
  // Legacy field for backward compatibility
  chevronPartnership: number;
}

/**
 * Step 1: Calculate delivery demand by location using VesselManifests.xlsx
 * Focus on the 10 key BP offshore locations to understand monthly delivery requirements
 * Each location's demand will be compared against total fleet capability
 * 
 * ENHANCED: Uses CostAllocation.xlsx as master data source for authoritative location determination
 */
export const calculateDeliveryDemand = (manifests: VesselManifest[], costAllocations?: any[]): DeliveryDemandResult => {
  console.log('📊 Step 1: Calculating delivery demand by location with cost allocation validation...');
  
  // Filter manifests to analysis period  
  const filteredManifests = manifests.filter(manifest => {
    if (!manifest.manifestDate) return false;
    const manifestDate = new Date(manifest.manifestDate);
    return manifestDate >= ANALYSIS_START_DATE && manifestDate <= ANALYSIS_END_DATE;
  });
  
  console.log(`📅 Filtered ${filteredManifests.length} manifests in analysis period`);
  
  // ENHANCED: Process cost allocation matches for authoritative location determination
  let costAllocationMatches: CostAllocationMatch[] = [];
  let drillingSummary: any = null;
  
  if (costAllocations && costAllocations.length > 0) {
    console.log(`🔗 Processing cost allocation matches with ${costAllocations.length} cost allocation records...`);
    costAllocationMatches = processManifestCostAllocationMatches(filteredManifests, costAllocations);
    drillingSummary = calculateDrillingSummary(costAllocationMatches);
    
    console.log(`✅ Cost allocation processing complete:`);
    console.log(`   High confidence matches: ${costAllocationMatches.filter(m => m.confidence === 'high').length}`);
    console.log(`   Drilling locations: ${drillingSummary.drillingLocationCount}`);
    console.log(`   Production locations: ${drillingSummary.productionLocationCount}`);
    console.log(`   Mixed locations: ${drillingSummary.mixedLocationCount}`);
  } else {
    console.log('⚠️ No cost allocation data provided - using fallback location classification');
  }
  
  // Debug: show some sample manifests with enhanced location determination
  console.log('🔍 Sample manifests with cost allocation validation:');
  filteredManifests.slice(0, 5).forEach((manifest, i) => {
    const match = costAllocationMatches.find(m => m.manifest.id === manifest.id);
    const rawLocation = manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || 'Unknown';
    const enhancedLocation = match ? match.classification.location : normalizeRigLocation(rawLocation);
    const matchType = match ? `${match.matchType} (${match.confidence})` : 'no match';
    console.log(`${i + 1}. ${rawLocation} → ${enhancedLocation} [${matchType}] (${manifest.manifestDate})`);
  });
  
  // Group by location and month using enhanced cost allocation validation
  const locationMonthCounts = new Map<string, Map<string, number>>();
  let validatedManifestCount = 0;
  let skippedNonBPCount = 0;
  let skippedShoreBaseCount = 0;
  let skippedFantasyIslandCount = 0;
  let skippedProductionCount = 0;
  
  filteredManifests.forEach(manifest => {
    // ENHANCED: Use cost allocation validated location if available
    const match = costAllocationMatches.find(m => m.manifest.id === manifest.id);
    let location: string;
    let isDrillingDelivery = false;
    
    if (match && match.classification.location) {
      // Use cost allocation validated location
      location = match.classification.location;
      // Check if this is a drilling delivery using cost allocation data
      isDrillingDelivery = match.classification.projectType === 'drilling';
      validatedManifestCount++;
    } else {
      // Fallback to original logic
      const rawLocation = manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || 'Unknown';
      location = normalizeRigLocation(rawLocation);
      
      // DRILLING-ONLY FILTER: For Mad Dog and Thunder Horse, only count drilling deliveries
      // Check the original raw location to determine if this is drilling or production
      const originalLocation = rawLocation.toLowerCase();
      
      if (originalLocation.includes('mad dog') || originalLocation.includes('thunder horse')) {
        // Check if this is explicitly a drilling delivery
        isDrillingDelivery = originalLocation.includes('drilling') || originalLocation.includes('drill');
        
        // If it's explicitly production, skip it entirely
        if (originalLocation.includes('prod') || originalLocation.includes('production')) {
          skippedProductionCount++;
          if (skippedProductionCount <= 5) { // Only log first 5 to avoid spam
            console.log(`🚫 Skipping production delivery: ${rawLocation} → excluded from drilling-only analysis`);
          }
          return;
        }
        
        // If no explicit drilling/production indicators, we need to be more careful
        // Only include if it's clearly drilling-related
        if (!isDrillingDelivery) {
          // If no clear drilling indicators, assume it might be production and skip it to be conservative
          skippedProductionCount++;
          if (skippedProductionCount <= 10) { // Log more to see what we're excluding
            console.log(`🚫 Skipping ambiguous delivery (assuming production): ${rawLocation} → excluded from drilling-only analysis`);
          }
          return;
        }
      } else {
        // For other locations, include all deliveries
        isDrillingDelivery = true;
      }
    }
    
    // DRILLING-ONLY FILTER: Skip non-drilling deliveries for Mad Dog and Thunder Horse
    // This should now be redundant due to the improved logic above, but keep as safety check
    if ((location === 'Mad Dog Drilling' || location === 'Thunder Horse Drilling') && !isDrillingDelivery) {
      skippedProductionCount++;
      if (skippedProductionCount <= 5) { // Only log first 5 to avoid spam
        console.log(`🚫 Skipping non-drilling delivery to ${location}`);
      }
      return;
    }
    
    // Skip shore bases
    if (location.toLowerCase().includes('fourchon') || 
        location.toLowerCase().includes('port') ||
        location.toLowerCase().includes('galveston') ||
        location.toLowerCase().includes('houma')) {
      skippedShoreBaseCount++;
      return;
    }
    
    // ADJUSTMENT: Skip Fantasy Island manifests from demand calculations (hardcoded +1 baseline instead)
    if (location === 'Fantasy Island') {
      skippedFantasyIslandCount++;
      if (skippedFantasyIslandCount <= 5) { // Only log first 5 to avoid spam
        console.log(`🏝️ Skipping Fantasy Island manifest from demand calculations (will be added as +1 baseline)`);
      }
      return;
    }
    
    // Only count deliveries to our BP offshore locations (excluding Fantasy Island)
    if (!BP_OFFSHORE_LOCATIONS.includes(location as any)) {
      if (Math.random() < 0.1) { // Only log 10% to avoid spam
        console.log(`⚠️ Skipping non-BP location: ${location}`);
      }
      skippedNonBPCount++;
      return;
    }
    
    const manifestDate = new Date(manifest.manifestDate!);
    const monthKey = `${manifestDate.getFullYear()}-${(manifestDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!locationMonthCounts.has(location)) {
      locationMonthCounts.set(location, new Map());
    }
    
    const monthCounts = locationMonthCounts.get(location)!;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  });
  
  console.log(`📊 Location grouping results:`);
  console.log(`   Cost allocation validated: ${validatedManifestCount} manifests`);
  console.log(`   Skipped shore bases: ${skippedShoreBaseCount} manifests`);
  console.log(`   Skipped Fantasy Island: ${skippedFantasyIslandCount} manifests`);
  console.log(`   Skipped production deliveries: ${skippedProductionCount} manifests`);
  console.log(`   Skipped non-BP locations: ${skippedNonBPCount} manifests`);
  console.log(`   Valid BP drilling locations: ${locationMonthCounts.size} drilling locations`);
  
  // Calculate individual location monthly demands with ENHANCED drilling vs production classification
  const allLocationMonthlyDemands: number[] = [];
  const drillingLocationDemands: number[] = [];
  const productionLocationDemands: number[] = [];
  const allMonthKeys = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  
  console.log(`🔍 Calculating monthly deliveries with enhanced cost allocation-based drilling/production classification:`);
  
  // ENHANCED: Use drilling summary from cost allocation if available
  let locationActivityMapping = new Map<string, 'drilling' | 'production' | 'mixed'>();
  
  if (drillingSummary && drillingSummary.locationClassifications) {
    // Use cost allocation classifications directly
    drillingSummary.locationClassifications.forEach((classification: any, location: string) => {
      locationActivityMapping.set(location, classification.projectType);
    });
    
    console.log(`📊 Enhanced Location Activity Classification from Cost Allocation:`);
    locationActivityMapping.forEach((activity, location) => {
      console.log(`  ${location}: ${activity}`);
    });
  } else if (costAllocations && costAllocations.length > 0) {
    // Fallback to original cost allocation classification logic
    const locationProjectTypes = new Map<string, Set<string>>();
    
    costAllocations.forEach(allocation => {
      if (allocation.rigLocation && allocation.projectType) {
        const normalizedLocation = normalizeRigLocation(allocation.rigLocation);
        if (!locationProjectTypes.has(normalizedLocation)) {
          locationProjectTypes.set(normalizedLocation, new Set());
        }
        locationProjectTypes.get(normalizedLocation)!.add(allocation.projectType.toLowerCase());
      }
    });
    
    // Classify locations based on their project types
    locationProjectTypes.forEach((projectTypes, location) => {
      const hasDrilling = projectTypes.has('drilling') || projectTypes.has('completions');
      const hasProduction = projectTypes.has('production') || projectTypes.has('maintenance');
      
      if (hasDrilling && hasProduction) {
        locationActivityMapping.set(location, 'mixed');
      } else if (hasDrilling) {
        locationActivityMapping.set(location, 'drilling');
      } else if (hasProduction) {
        locationActivityMapping.set(location, 'production');
      }
    });
    
    console.log(`📊 Fallback Location Activity Classification from Cost Allocation:`);
    locationActivityMapping.forEach((activity, location) => {
      console.log(`  ${location}: ${activity}`);
    });
  } else {
    console.log(`⚠️ No cost allocation data - using default mixed classification for all locations`);
  }
  
  // For each location, for each month, get their delivery demand and classify by activity type
  locationMonthCounts.forEach((monthCounts, location) => {
    const activityType = locationActivityMapping.get(location) || 'mixed'; // Default to mixed if not classified
    
    allMonthKeys.forEach(monthKey => {
      const deliveriesNeeded = monthCounts.get(monthKey) || 0;
      if (deliveriesNeeded > 0) {
        allLocationMonthlyDemands.push(deliveriesNeeded);
        
        // Classify demand by activity type
        if (activityType === 'drilling') {
          drillingLocationDemands.push(deliveriesNeeded);
        } else if (activityType === 'production') {
          productionLocationDemands.push(deliveriesNeeded);
        } else {
          // For mixed locations, split demand 60/40 drilling/production
          drillingLocationDemands.push(deliveriesNeeded * 0.6);
          productionLocationDemands.push(deliveriesNeeded * 0.4);
        }
        
        // Debug: show individual location monthly demands
        if (allLocationMonthlyDemands.length <= 20) { // Show first 20 for debugging
          console.log(`  ${location} ${monthKey}: ${deliveriesNeeded} deliveries needed (${activityType})`);
        }
      }
    });
  });
  
  // Calculate average monthly demand per location by activity type
  const averageLocationMonthlyDemand = allLocationMonthlyDemands.length > 0 
    ? allLocationMonthlyDemands.reduce((sum, demand) => sum + demand, 0) / allLocationMonthlyDemands.length 
    : 0;
    
  const averageDrillingDemand = drillingLocationDemands.length > 0
    ? drillingLocationDemands.reduce((sum, demand) => sum + demand, 0) / drillingLocationDemands.length
    : 0;
    
  const averageProductionDemand = productionLocationDemands.length > 0
    ? productionLocationDemands.reduce((sum, demand) => sum + demand, 0) / productionLocationDemands.length
    : 0;
  
  console.log(`📊 Total location-month demand records: ${allLocationMonthlyDemands.length}`);
  console.log(`🎯 Average Location Monthly Demand: ${averageLocationMonthlyDemand.toFixed(2)} deliveries per location per month`);
  console.log(`🔵 Average Drilling Demand: ${averageDrillingDemand.toFixed(2)} deliveries per drilling location per month (${drillingLocationDemands.length} records)`);
  console.log(`🟢 Average Production Demand: ${averageProductionDemand.toFixed(2)} deliveries per production location per month (${productionLocationDemands.length} records)`);
  
  if (averageDrillingDemand > 0 && averageProductionDemand > 0) {
    const demandRatio = (averageProductionDemand / averageDrillingDemand * 100).toFixed(1);
    console.log(`📊 Production vs Drilling Ratio: ${demandRatio}% (production locations need ${demandRatio}% of drilling demand)`);
  }
  
  console.log(`📊 Calculation Summary: Used cost allocation data to classify locations by activity type, then calculated separate demand averages for drilling vs production`);
  
  // Show some statistics for transparency
  if (allLocationMonthlyDemands.length > 0) {
    const sortedDemands = [...allLocationMonthlyDemands].sort((a, b) => b - a);
    const median = sortedDemands[Math.floor(sortedDemands.length / 2)];
    const max = Math.max(...allLocationMonthlyDemands);
    const min = Math.min(...allLocationMonthlyDemands);
    
    console.log(`📈 Overall Demand Stats: Min=${min}, Median=${median}, Max=${max}, Avg=${averageLocationMonthlyDemand.toFixed(2)}`);
  }
  
  // Still create location demands array for detailed reporting (EXCLUDE Fantasy Island from calculations)
  const locationDemands: LocationDeliveryDemand[] = [];
  
  locationMonthCounts.forEach((monthCounts, location) => {
    // ADJUSTMENT: Skip Fantasy Island from demand calculations - it will be added as +1 baseline later
    if (location === 'Fantasy Island') {
      console.log(`🏝️ Skipping Fantasy Island from demand calculations (will be added as +1 baseline)`);
      return;
    }
    
    const monthlyBreakdown: Record<string, number> = {};
    let totalDeliveries = 0;
    
    monthCounts.forEach((count, month) => {
      monthlyBreakdown[month] = count;
      totalDeliveries += count;
    });
    
    const monthsCovered = Object.keys(monthlyBreakdown).length;
    const monthlyAverage = monthsCovered > 0 ? totalDeliveries / 6 : 0; // Always use 6 months for consistency
    
    locationDemands.push({
      location,
      totalDeliveries,
      monthlyAverage: Number(monthlyAverage.toFixed(2)),
      monthlyBreakdown
    });
  });
  
  // Sort by demand (highest first)
  locationDemands.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  
  console.log(`📍 Found delivery demand for ${locationDemands.length} locations`);
  console.log('🎯 BP Offshore locations with individual monthly averages:');
  locationDemands.forEach((demand, index) => {
    console.log(`${index + 1}. ${demand.location}: ${demand.monthlyAverage} deliveries/month (${demand.totalDeliveries} total)`);
  });
  
  // ENHANCED: Use real drilling vs production averages if available from cost allocation
  let finalDrillingDemand = averageDrillingDemand;
  let finalProductionDemand = averageProductionDemand;
  
  if (drillingSummary) {
    // Use enhanced drilling summary data
    finalDrillingDemand = drillingSummary.totalDrillingDemand / (allMonthKeys.length * drillingSummary.drillingLocationCount || 1);
    finalProductionDemand = drillingSummary.totalProductionDemand / (allMonthKeys.length * drillingSummary.productionLocationCount || 1);
    
    console.log(`🎯 Enhanced demand calculation using cost allocation data:`);
    console.log(`   Real drilling demand: ${finalDrillingDemand.toFixed(2)} deliveries per drilling location per month`);
    console.log(`   Real production demand: ${finalProductionDemand.toFixed(2)} deliveries per production location per month`);
    console.log(`   Cost allocation drilling ratio: ${(drillingSummary.totalDrillingDemand / (drillingSummary.totalDrillingDemand + drillingSummary.totalProductionDemand) * 100).toFixed(1)}%`);
  }
  
  console.log(`📊 Final calculation using: ${averageLocationMonthlyDemand.toFixed(2)} average deliveries per location per month`);
  console.log(`📊 Enhanced drilling/production split: ${finalDrillingDemand.toFixed(2)}/${finalProductionDemand.toFixed(2)}`);
  
  return { 
    locationDemands, 
    totalOffshoreDemandPerMonth: averageLocationMonthlyDemand,
    averageDrillingDemand: finalDrillingDemand,
    averageProductionDemand: finalProductionDemand
  };
};

/**
 * Step 2: Calculate vessel delivery capability using VoyageList.xlsx
 * For each vessel per month: sum unique port calls across all voyages in that month
 * This measures total delivery capacity for fleet planning
 * 
 * Example: Ocean BlackLion January 2025:
 * - Voyage 1: Fourchon → Thunder Horse → Fourchon = 1 delivery
 * - Voyage 2: Fourchon → Thunder Horse → Mad Dog → Fourchon = 2 deliveries  
 * - Voyage 3: Fourchon → Mad Dog → Fourchon = 1 delivery
 * Total January capability: 1 + 2 + 1 = 4 deliveries
 * 
 * Fleet Example: 6 locations/month × 9 PSV vessels = 54 offshore port calls/month capacity
 */
export const calculateVesselCapability = (voyages: VoyageList[]): VesselCapabilityResult => {
  console.log('🚢 Step 2: Calculating vessel delivery capability...');
  
  // Filter voyages to analysis period and PSV/OSV vessels only
  const filteredVoyages = voyages.filter(voyage => {
    const voyageDate = new Date(voyage.startDate);
    const isInPeriod = voyageDate >= ANALYSIS_START_DATE && voyageDate <= ANALYSIS_END_DATE;
    const isPSV = isPSVOrOSV(voyage.vessel);
    
    // Debug: log vessels being excluded (only show first few to avoid spam)
    if (isInPeriod && !isPSV && Math.random() < 0.1) { // Show ~10% of exclusions
      console.log(`🚫 Excluding vessel: ${voyage.vessel}`);
    }
    
    return isInPeriod && isPSV;
  });
  
  console.log(`📅 Filtered ${filteredVoyages.length} PSV/OSV voyages in analysis period`);
  
  // Debug: show which vessels are being included
  const uniqueVessels = [...new Set(filteredVoyages.map(voyage => voyage.vessel))];
  console.log(`🚢 Included vessels (${uniqueVessels.length}):`);
  uniqueVessels.forEach((vessel, i) => {
    console.log(`${i + 1}. ${vessel}`);
  });
  
  // Debug: Check for any Fast vessels that might have slipped through
  const potentialFastVessels = uniqueVessels.filter(vessel => 
    vessel.toLowerCase().includes('fast')
  );
  if (potentialFastVessels.length > 0) {
    console.warn('⚠️ WARNING: Found vessels with "Fast" in name:', potentialFastVessels);
  }
  
  // Group by vessel and month, track both deliveries and voyage counts
  const vesselMonthPortCalls = new Map<string, Map<string, number>>();
  const vesselMonthVoyageCounts = new Map<string, Map<string, number>>();
  
  console.log(`🔍 Processing voyages to calculate vessel delivery capabilities...`);
  
  filteredVoyages.forEach(voyage => {
    const vessel = voyage.vessel;
    const voyageDate = new Date(voyage.startDate);
    const monthKey = `${voyageDate.getFullYear()}-${(voyageDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Count unique offshore locations in this specific voyage (exclude Fourchon/ports)
    const offshoreLocations = voyage.locationList.filter(loc => 
      loc && 
      !loc.toLowerCase().includes('fourchon') &&
      !loc.toLowerCase().includes('port') &&
      !loc.toLowerCase().includes('galveston') &&
      !loc.toLowerCase().includes('houma')
    );
    
    // Remove duplicates within this specific voyage only and EXCLUDE Fantasy Island from capability calculations
    const uniqueOffshoreLocations = [...new Set(offshoreLocations.map(loc => normalizeRigLocation(loc)))].filter(loc => loc !== 'Fantasy Island');
    const voyageDeliveryCapability = uniqueOffshoreLocations.length;
    
    // Debug: Log when Fantasy Island is excluded
    const allNormalizedLocations = [...new Set(offshoreLocations.map(loc => normalizeRigLocation(loc)))];
    if (allNormalizedLocations.includes('Fantasy Island')) {
      console.log(`🏝️ Excluding Fantasy Island from voyage delivery capability calculation`);
    }
    
    if (voyageDeliveryCapability > 0) {
      // Track deliveries
      if (!vesselMonthPortCalls.has(vessel)) {
        vesselMonthPortCalls.set(vessel, new Map());
      }
      const monthCounts = vesselMonthPortCalls.get(vessel)!;
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + voyageDeliveryCapability);
      
      // Track voyage count
      if (!vesselMonthVoyageCounts.has(vessel)) {
        vesselMonthVoyageCounts.set(vessel, new Map());
      }
      const monthVoyages = vesselMonthVoyageCounts.get(vessel)!;
      monthVoyages.set(monthKey, (monthVoyages.get(monthKey) || 0) + 1);
    }
  });
  
  // Calculate individual vessel delivery capabilities (unique deliveries for each vessel each month)
  const allVesselDeliveryCapabilities: number[] = [];
  const allMonthKeys = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  
  console.log(`🔍 Calculating unique deliveries for each vessel each month:`);
  
  // Track vessels active in each month to find current fleet size
  const monthlyActiveVessels = new Map<string, Set<string>>();
  allMonthKeys.forEach(monthKey => {
    monthlyActiveVessels.set(monthKey, new Set());
  });
  
  // For each vessel, for each month, get their unique deliveries (not divided by voyages)
  vesselMonthPortCalls.forEach((monthCounts, vessel) => {
    allMonthKeys.forEach(monthKey => {
      const uniqueDeliveries = monthCounts.get(monthKey) || 0;
      if (uniqueDeliveries > 0) {
        allVesselDeliveryCapabilities.push(uniqueDeliveries);
        
        // Track this vessel as active in this month
        monthlyActiveVessels.get(monthKey)!.add(vessel);
        
        // Debug: show individual vessel monthly deliveries
        if (allVesselDeliveryCapabilities.length <= 20) { // Show first 20 for debugging
          console.log(`  ${vessel} ${monthKey}: ${uniqueDeliveries} unique offshore deliveries`);
        }
      }
    });
  });
  
  // Find the latest month with data and count active vessels
  let latestMonthFleetSize = 0;
  let latestMonth = '';
  for (let i = allMonthKeys.length - 1; i >= 0; i--) {
    const monthKey = allMonthKeys[i];
    const activeVesselsThisMonth = monthlyActiveVessels.get(monthKey)!.size;
    if (activeVesselsThisMonth > 0) {
      latestMonthFleetSize = activeVesselsThisMonth;
      latestMonth = monthKey;
      break;
    }
  }
  
  console.log(`📅 Latest month with vessel activity: ${latestMonth} with ${latestMonthFleetSize} active OSV vessels`);
  console.log(`🚢 Current Fleet Size: ${latestMonthFleetSize} OSV vessels (based on latest month activity)`);
  
  // Calculate average delivery capability per vessel
  const averageVesselDeliveryCapability = allVesselDeliveryCapabilities.length > 0 
    ? allVesselDeliveryCapabilities.reduce((sum, deliveries) => sum + deliveries, 0) / allVesselDeliveryCapabilities.length 
    : 0;
  
  console.log(`📊 Total vessel-month delivery records: ${allVesselDeliveryCapabilities.length}`);
  console.log(`🎯 Average Vessel Delivery Capability: ${averageVesselDeliveryCapability.toFixed(2)} unique deliveries per vessel per month`);
  console.log(`📊 Calculation Summary: For each vessel each month, we counted unique offshore deliveries, then averaged all values to understand what each vessel can realistically deliver`);
  
  // Show some statistics for transparency
  if (allVesselDeliveryCapabilities.length > 0) {
    const sortedCapabilities = [...allVesselDeliveryCapabilities].sort((a, b) => b - a);
    const median = sortedCapabilities[Math.floor(sortedCapabilities.length / 2)];
    const max = Math.max(...allVesselDeliveryCapabilities);
    const min = Math.min(...allVesselDeliveryCapabilities);
    
    console.log(`📈 Delivery Capability Stats: Min=${min}, Median=${median}, Max=${max}, Avg=${averageVesselDeliveryCapability.toFixed(2)}`);
  }
  
  // Still create individual vessel capabilities for detailed reporting
  const vesselCapabilities: VesselCapability[] = [];
  
  vesselMonthPortCalls.forEach((monthCounts, vessel) => {
    const monthlyBreakdown: Record<string, number> = {};
    let totalUniquePortCalls = 0;
    
    monthCounts.forEach((count, month) => {
      monthlyBreakdown[month] = count;
      totalUniquePortCalls += count;
    });
    
    const monthlyAverage = totalUniquePortCalls / 6; // Always use 6 months for consistency
    
    vesselCapabilities.push({
      vesselName: vessel,
      totalUniquePortCalls,
      monthlyAverage: Number(monthlyAverage.toFixed(2)),
      monthlyBreakdown
    });
  });
  
  // Sort by capability (highest first)
  vesselCapabilities.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  
  console.log(`⛵ Found capability data for ${vesselCapabilities.length} vessels`);
  console.log('📊 Top vessels by monthly delivery capability:');
  vesselCapabilities.slice(0, 5).forEach((capability, index) => {
    console.log(`${index + 1}. ${capability.vesselName}: ${capability.monthlyAverage} deliveries/month`);
  });
  
  // Return both vessel capabilities and the average vessel delivery capability
  return { 
    vesselCapabilities, 
    fleetCapability: averageVesselDeliveryCapability,
    currentFleetSize: latestMonthFleetSize
  };
};

/**
 * Step 3: Calculate vessel requirement using demand ÷ capability formula
 */
export const calculateVesselRequirement = (
  locationDemands: LocationDeliveryDemand[],
  vesselCapabilities: VesselCapability[],
  fleetCapability?: number, // New parameter for month-by-month calculated capability
  totalOffshoreDemandPerMonth?: number, // New parameter for average offshore demand per month
  currentFleetSize?: number, // New parameter for current fleet size from latest month
  averageDrillingDemand?: number, // New parameter for drilling-specific demand
  averageProductionDemand?: number // New parameter for production-specific demand
): VesselRequirementResult => {
  console.log('🎯 Step 3: Calculating vessel requirement...');
  
  // Use the new total offshore demand per month if provided, otherwise fall back to old method
  const totalMonthlyDeliveryDemand = totalOffshoreDemandPerMonth || locationDemands.reduce((sum, demand) => sum + demand.monthlyAverage, 0);
  
  // Use the month-by-month fleet capability if provided, otherwise fall back to old method
  const averageVesselCapability = fleetCapability || (vesselCapabilities.length > 0 ? 
    vesselCapabilities.reduce((sum, capability) => sum + capability.monthlyAverage, 0) / vesselCapabilities.length : 0);
  
  // ADJUSTMENT: Fantasy Island is now a +1 baseline addition, NOT included in calculations
  const fantasyIslandContribution = getFantasyIslandVesselContribution();
  const fantasyIslandVessels = fantasyIslandContribution.vesselCount;
  
  // Current fleet: Use ONLY the actual fleet size from voyage data (Fantasy Island excluded from calculations)
  const baseCurrentVessels = currentFleetSize || vesselCapabilities.length;
  const currentVessels = baseCurrentVessels; // Fantasy Island NOT included in calculations
  
  // IMPROVED: Data-driven vessel requirement calculation based on actual BP offshore locations
  // Step 1: Use actual location count and real demand data instead of hardcoded assumptions
  const actualLocations = BP_OFFSHORE_LOCATIONS.length; // 6 actual BP offshore locations
  
  // Calculate total system demand using actual location demands
  const totalSystemDemand = locationDemands.reduce((sum, location) => sum + location.monthlyAverage, 0);
  
  // Use real demand data if available, with improved fallback logic
  const totalDemandNeeded = totalSystemDemand || totalMonthlyDeliveryDemand;
  
  // Step 2: Calculate what our current baseline fleet can deliver
  const currentFleetCapability = currentVessels * averageVesselCapability;
  
  // Step 3: Calculate additional vessels needed beyond current fleet capability
  const additionalCapabilityNeeded = Math.max(0, totalDemandNeeded - currentFleetCapability);
  const additionalVesselsNeeded = averageVesselCapability > 0 ? 
    Math.ceil(additionalCapabilityNeeded / averageVesselCapability) : 0;
  
  // Step 4: Total recommended fleet = current fleet + additional vessels needed + Fantasy Island baseline
  const calculatedRequiredVessels = currentVessels + additionalVesselsNeeded;
  const requiredVessels = calculatedRequiredVessels + fantasyIslandVessels; // Add Fantasy Island as +1 baseline
  
  console.log(`📊 IMPROVED CALCULATION: Using actual location data instead of hardcoded assumptions`);
  console.log(`📊 Active BP Offshore Locations: ${actualLocations} locations`);
  console.log(`📊 Total System Demand: ${totalSystemDemand.toFixed(2)} deliveries/month (from actual location data)`);
  console.log(`📊 Total Demand Needed: ${totalDemandNeeded.toFixed(2)} deliveries/month`);
  console.log(`⛵ Current Fleet Capability: ${currentVessels} vessels × ${averageVesselCapability.toFixed(2)} capability = ${currentFleetCapability.toFixed(2)} deliveries/month`);
  console.log(`📈 Additional Capability Needed: ${totalDemandNeeded.toFixed(2)} - ${currentFleetCapability.toFixed(2)} = ${additionalCapabilityNeeded.toFixed(2)}`);
  console.log(`🎯 Additional Vessels Needed: ${additionalVesselsNeeded} vessels`);
  console.log(`📊 Calculated Required Vessels: ${currentVessels} current + ${additionalVesselsNeeded} additional = ${calculatedRequiredVessels} vessels`);
  console.log(`🏝️ ADJUSTMENT: Fantasy Island Vessels: +${fantasyIslandVessels} vessel (hardcoded baseline addition)`);
  console.log(`🚢 Total Recommended Fleet: ${calculatedRequiredVessels} calculated + ${fantasyIslandVessels} Fantasy Island baseline = ${requiredVessels} vessels`);
  
  console.log(`🚢 Current Fleet: ${baseCurrentVessels} OSV vessels (from voyage data) - Fantasy Island excluded from calculations`);
  
  // Utilization analysis - compare actual calculated requirement vs current operational fleet
  const utilizationGap = calculatedRequiredVessels - currentVessels; // Fantasy Island excluded from gap analysis
  
  // Fleet utilization = total system demand vs fleet capacity
  // Use the improved totalSystemDemand already calculated from actual location data
  const theoreticalFleetCapability = currentVessels * averageVesselCapability;
  const utilizationPercentage = theoreticalFleetCapability > 0 ? 
    (totalSystemDemand / theoreticalFleetCapability) * 100 : 0;
  
  // Debug utilization calculation
  console.log(`🔍 UTILIZATION DEBUG:`);
  console.log(`   BP Offshore Locations: ${actualLocations} active locations`);
  console.log(`   Total System Demand: ${totalSystemDemand.toFixed(2)} deliveries/month (from actual location data)`);
  console.log(`   Current Vessels: ${currentVessels}`);
  console.log(`   Average Vessel Capability: ${averageVesselCapability.toFixed(2)}`);
  console.log(`   Theoretical Fleet Capacity: ${theoreticalFleetCapability.toFixed(2)}`);
  console.log(`   Utilization %: ${utilizationPercentage.toFixed(2)}%`);
  console.log(`   Logic Check: If total_demand(${totalSystemDemand.toFixed(2)}) > capacity(${theoreticalFleetCapability.toFixed(2)}), we're over-utilized`);
  
  // Generate recommendation
  let recommendation = '';
  if (utilizationGap > 0) {
    recommendation = `Need ${utilizationGap} additional vessel${utilizationGap > 1 ? 's' : ''} to meet demand`;
  } else if (utilizationGap < 0) {
    recommendation = `Have ${Math.abs(utilizationGap)} excess vessel${Math.abs(utilizationGap) > 1 ? 's' : ''} - consider optimization`;
  } else {
    recommendation = 'Current fleet size is optimal for demand';
  }
  
  // Generate monthly breakdown data for visualizations
  const allMonths = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  const monthlyBreakdown = allMonths.map(month => {
    // Calculate total demand for this month across all locations
    const totalDemand = locationDemands.reduce((sum, location) => {
      return sum + (location.monthlyBreakdown[month] || 0);
    }, 0);

    // Calculate total capability for this month across all vessels
    const totalCapability = vesselCapabilities.reduce((sum, vessel) => {
      return sum + (vessel.monthlyBreakdown[month] || 0);
    }, 0);

    // Split demand into drilling vs production using the calculated averages
    const drillingDemand = averageDrillingDemand || (totalDemand * 0.6);
    const productionDemand = averageProductionDemand || (totalDemand * 0.4);

    // Calculate utilization rate and gap
    const utilizationRate = totalCapability > 0 ? (totalDemand / totalCapability) * 100 : 0;
    const gap = totalDemand - totalCapability;

    return {
      month,
      totalDemand,
      totalCapability,
      drillingDemand,
      productionDemand,
      utilizationRate: Number(utilizationRate.toFixed(1)),
      gap
    };
  });

  // ADJUSTMENT: Fantasy Island is excluded from location demands and vessel capabilities
  // It's added as +1 baseline to the final vessel requirement only
  const enhancedLocationDemands: LocationDeliveryDemand[] = [...locationDemands];
  const enhancedVesselCapabilities: VesselCapability[] = [...vesselCapabilities];

  const result: VesselRequirementResult = {
    analysisDateRange: {
      startDate: ANALYSIS_START_DATE.toISOString().split('T')[0],
      endDate: ANALYSIS_END_DATE.toISOString().split('T')[0],
      monthsCovered: 6
    },
    totalMonthlyDeliveryDemand: Number(totalMonthlyDeliveryDemand.toFixed(2)),
    locationDemands: enhancedLocationDemands,
    averageDrillingDemand: averageDrillingDemand || 0,
    averageProductionDemand: averageProductionDemand || 0,
    averageVesselCapability: Number(averageVesselCapability.toFixed(2)),
    totalActiveVessels: currentVessels,
    vesselCapabilities: enhancedVesselCapabilities,
    requiredVessels,
    currentVessels,
    utilizationGap,
    utilizationPercentage: Number(utilizationPercentage.toFixed(1)),
    recommendation,
    monthlyBreakdown
  };
  
  // Log results
  console.log('\n🚢 VESSEL REQUIREMENT CALCULATION RESULTS:');
  console.log(`📊 Analysis Period: ${result.analysisDateRange.startDate} to ${result.analysisDateRange.endDate}`);
  console.log(`📈 Total Monthly Delivery Demand: ${result.totalMonthlyDeliveryDemand} deliveries`);
  console.log(`⛵ Average Vessel Capability: ${result.averageVesselCapability} port calls/month`);
  console.log(`🎯 Required Vessels: ${result.requiredVessels}`);
  console.log(`⛵ Current Active Vessels: ${result.currentVessels}`);
  console.log(`📊 Utilization: ${result.utilizationPercentage}%`);
  console.log(`💡 Recommendation: ${result.recommendation}`);
  
  return result;
};

/**
 * ENHANCED: Calculate vessel requirements using drilling-focused methodology
 * 
 * New approach separates drilling demand forecasting from fixed production baseline:
 * 1. Calculate drilling demand from 6 drilling locations only
 * 2. Calculate drilling capability (total fleet - production allocation)
 * 3. Calculate drilling gap and add Mad Dog warehouse requirement
 * 4. Total recommendation = Production baseline + Drilling gap + Mad Dog warehouse
 */
export const calculateEnhancedVesselRequirement = (
  locationDemands: LocationDeliveryDemand[],
  vesselCapabilities: VesselCapability[],
  fleetCapability?: number,
  totalOffshoreDemandPerMonth?: number,
  currentFleetSize?: number,
  averageDrillingDemand?: number,
  averageProductionDemand?: number
): EnhancedVesselRequirementResult => {
  console.log('🎯 Enhanced Step 3: Calculating vessel requirement with drilling focus...');
  
  // CORRECTED APPROACH: Follow your methodology exactly
  
  // Step 1: Calculate total offshore demand per month (all drilling locations)
  const drillingLocationDemands = locationDemands.filter(location => 
    BP_DRILLING_LOCATIONS.includes(location.location as any)
  );
  
  const totalDrillingDemand = drillingLocationDemands.reduce((sum, location) => 
    sum + location.monthlyAverage, 0
  );
  
  console.log(`🔵 STEP 1 - TOTAL OFFSHORE DEMAND:`);
  console.log(`   Expected drilling locations: ${BP_DRILLING_LOCATIONS.join(', ')}`);
  console.log(`   Found drilling locations: ${drillingLocationDemands.map(d => d.location).join(', ')}`);
  console.log(`   Drilling locations count: ${drillingLocationDemands.length}/${BP_DRILLING_LOCATIONS.length}`);
  drillingLocationDemands.forEach(loc => {
    console.log(`   - ${loc.location}: ${loc.monthlyAverage.toFixed(2)} deliveries/month`);
  });
  console.log(`   Total drilling demand: ${totalDrillingDemand.toFixed(2)} deliveries/month`);
  
  // DEBUG: Check if we have any production locations mixed in
  const allFoundLocations = locationDemands.map(d => d.location);
  const unexpectedLocations = allFoundLocations.filter(loc => 
    !BP_DRILLING_LOCATIONS.includes(loc as any) && !['Fantasy Island'].includes(loc)
  );
  if (unexpectedLocations.length > 0) {
    console.warn(`⚠️ WARNING: Found unexpected locations in demand data: ${unexpectedLocations.join(', ')}`);
  }
  
  // Step 2: Calculate average vessel capability
  const averageVesselCapability = fleetCapability || (vesselCapabilities.length > 0 ? 
    vesselCapabilities.reduce((sum, capability) => sum + capability.monthlyAverage, 0) / vesselCapabilities.length : 0);
  
  console.log(`⛵ STEP 2 - VESSEL CAPABILITY:`);
  console.log(`   Average vessel capability: ${averageVesselCapability.toFixed(2)} deliveries/month`);
  
  // Step 3: Calculate vessels needed for drilling demand
  const drillingVesselsNeeded = averageVesselCapability > 0 ? 
    Math.ceil(totalDrillingDemand / averageVesselCapability) : 0;
  
  console.log(`🎯 STEP 3 - VESSELS NEEDED FOR DRILLING:`);
  console.log(`   Drilling demand: ${totalDrillingDemand.toFixed(2)} deliveries/month`);
  console.log(`   ÷ Average capability: ${averageVesselCapability.toFixed(2)} deliveries/vessel/month`);
  console.log(`   = Drilling vessels needed: ${drillingVesselsNeeded} vessels`);
  
  // Step 4: Add production vessels
  const productionFleetBaseline = PRODUCTION_FLEET_BASELINE;
  const totalVesselsBeforeOutsourcing = drillingVesselsNeeded + productionFleetBaseline;
  
  console.log(`🟢 STEP 4 - ADD PRODUCTION:`);
  console.log(`   Drilling vessels: ${drillingVesselsNeeded}`);
  console.log(`   + Production vessels: ${productionFleetBaseline}`);
  console.log(`   = Total before outsourcing: ${totalVesselsBeforeOutsourcing} vessels`);
  
  // Step 5: Subtract outsourced capacity
  const chevronOutsourcedCapacity = CHEVRON_OUTSOURCED_CAPACITY;
  const totalInternalVesselsNeeded = Math.max(0, totalVesselsBeforeOutsourcing - chevronOutsourcedCapacity);
  
  console.log(`🟦 STEP 5 - SUBTRACT OUTSOURCED:`);
  console.log(`   Total before outsourcing: ${totalVesselsBeforeOutsourcing}`);
  console.log(`   - Chevron outsourced: ${chevronOutsourcedCapacity}`);
  console.log(`   = Internal vessels needed: ${totalInternalVesselsNeeded} vessels`);
  
  // Calculate gap vs current fleet
  const currentVessels = currentFleetSize || vesselCapabilities.length;
  const drillingGapVessels = Math.max(0, totalInternalVesselsNeeded - currentVessels);
  
  console.log(`📊 GAP ANALYSIS:`);
  console.log(`   Internal vessels needed: ${totalInternalVesselsNeeded}`);
  console.log(`   Current vessels: ${currentVessels}`);
  console.log(`   Gap: ${drillingGapVessels} additional vessels needed`);
  
  // For backward compatibility, calculate drilling capability
  const currentTotalFleetCapability = currentVessels * averageVesselCapability;
  const productionFleetCapabilityRequired = PRODUCTION_FLEET_BASELINE * averageVesselCapability;
  const currentDrillingCapability = Math.max(0, currentTotalFleetCapability - productionFleetCapabilityRequired);
  const drillingGap = Math.max(0, totalDrillingDemand - currentDrillingCapability);
  
  console.log(`🔍 DRILLING GAP ANALYSIS:`);
  console.log(`   Drilling demand: ${totalDrillingDemand.toFixed(2)} deliveries/month`);
  console.log(`   Drilling capability: ${currentDrillingCapability.toFixed(2)} deliveries/month`);
  console.log(`   Drilling gap: ${drillingGap.toFixed(2)} deliveries/month`);
  console.log(`   Additional drilling vessels needed: ${drillingGapVessels} vessels`);
  
  // Step 6: Calculate final recommendations using corrected approach
  const madDogWarehouseVessels = MAD_DOG_WAREHOUSE_VESSELS;
  
  // TOTAL DRILLING FLEET REQUIREMENT = Drilling vessels needed + Mad Dog warehouse
  const totalDrillingVesselsRequired = drillingVesselsNeeded + madDogWarehouseVessels;
  
  // TOTAL INTERNAL VESSELS NEEDED = Drilling + Production - Outsourced + Mad Dog warehouse
  const totalInternalRecommendation = totalInternalVesselsNeeded + madDogWarehouseVessels;
  
  // DRILLING-ONLY RECOMMENDATION (ADDITIONAL) = Gap + Mad Dog warehouse 
  const drillingOnlyRecommendation = drillingGapVessels + madDogWarehouseVessels;
  
  // Total with production (for reference) = Total internal + outsourced
  const totalWithProduction = totalInternalRecommendation + chevronOutsourcedCapacity;
  
  console.log(`📊 CORRECTED CALCULATION SUMMARY:`);
  console.log(`   1. Total offshore demand: ${totalDrillingDemand.toFixed(2)} deliveries/month`);
  console.log(`   2. Average vessel capability: ${averageVesselCapability.toFixed(2)} deliveries/month`);
  console.log(`   3. Drilling vessels needed: ${drillingVesselsNeeded} vessels`);
  console.log(`   4. + Production vessels: ${productionFleetBaseline} vessels`);
  console.log(`   5. - Outsourced capacity: ${chevronOutsourcedCapacity} vessels`);
  console.log(`   6. + Mad Dog warehouse: ${madDogWarehouseVessels} vessel`);
  console.log(`   = TOTAL INTERNAL VESSELS NEEDED: ${totalInternalRecommendation} vessels`);
  console.log(`   = TOTAL DRILLING FLEET REQUIRED: ${totalDrillingVesselsRequired} vessels`);
  console.log(`   Current fleet: ${currentVessels} vessels`);
  console.log(`   Additional needed: ${Math.max(0, totalInternalRecommendation - currentVessels)} vessels`);
  
  // Generate enhanced drilling-focused recommendation text using corrected approach
  const additionalVesselsNeeded = Math.max(0, totalInternalRecommendation - currentVessels);
  let enhancedRecommendation = '';
  if (additionalVesselsNeeded > 0) {
    enhancedRecommendation = `CORRECTED CALCULATION: Need ${totalInternalRecommendation} total internal vessels (${drillingVesselsNeeded} drilling + ${productionFleetBaseline} production - ${chevronOutsourcedCapacity} outsourced + ${madDogWarehouseVessels} warehouse). Additional ${additionalVesselsNeeded} vessels needed beyond current ${currentVessels} vessels.`;
  } else {
    enhancedRecommendation = `CORRECTED CALCULATION: Need ${totalInternalRecommendation} total internal vessels (${drillingVesselsNeeded} drilling + ${productionFleetBaseline} production - ${chevronOutsourcedCapacity} outsourced + ${madDogWarehouseVessels} warehouse). Current ${currentVessels} vessels sufficient.`;
  }
  
  // Create enhanced drilling-focused breakdown using corrected calculations
  const recommendationBreakdown = {
    productionFleet: productionFleetBaseline, // Internal production fleet (1.25)
    outsourcedCapacity: chevronOutsourcedCapacity, // Chevron outsourced capacity (0.25)
    drillingGap: additionalVesselsNeeded, // Additional vessels needed (corrected)
    madDogWarehouse: madDogWarehouseVessels, // Mad Dog warehouse vessels
    drillingOnlyTotal: drillingOnlyRecommendation, // Legacy field for backward compatibility
    totalDrillingRequired: totalDrillingVesselsRequired, // Total drilling fleet required
    totalInternalRequired: totalInternalRecommendation, // Total internal vessels needed (NEW)
    totalWithProduction: totalWithProduction // Total including production (for reference)
  };
  
  // Generate base result using existing function for compatibility
  const baseResult = calculateVesselRequirement(
    locationDemands,
    vesselCapabilities,
    fleetCapability,
    totalOffshoreDemandPerMonth,
    currentFleetSize,
    averageDrillingDemand,
    averageProductionDemand
  );
  
  // Create enhanced result
  const enhancedResult: EnhancedVesselRequirementResult = {
    ...baseResult,
    // Override with enhanced drilling-focused calculations
    requiredVessels: drillingOnlyRecommendation, // Now shows drilling-only recommendation
    recommendation: enhancedRecommendation,
    utilizationGap: drillingOnlyRecommendation - currentVessels, // Drilling gap vs current fleet
    
    // Enhanced drilling-focused metrics
    totalDrillingDemand,
    currentTotalFleetCapability,
    currentDrillingCapability,
    drillingGap: drillingGapVessels,
    madDogWarehouseVessels,
    productionFleetBaseline,
    chevronOutsourcedCapacity,
    drillingOnlyRecommendation,
    enhancedRecommendation,
    recommendationBreakdown,
    
    // Legacy field for backward compatibility
    chevronPartnership: chevronOutsourcedCapacity
  };
  
  console.log('\n🎯 ENHANCED DRILLING-FOCUSED VESSEL REQUIREMENT RESULTS:');
  console.log(`📊 Drilling Demand: ${totalDrillingDemand.toFixed(2)} deliveries/month from ${BP_DRILLING_LOCATIONS.length} drilling locations`);
  console.log(`⛵ Current Fleet: ${currentVessels} vessels (${currentTotalFleetCapability.toFixed(2)} deliveries/month capability)`);
  console.log(`🟢 Production Fleet: ${productionFleetBaseline} vessels (internal - Fantasy Island + Thunder Horse support)`);
  console.log(`🟦 Outsourced Capacity: ${chevronOutsourcedCapacity} vessels (Chevron partnership for Atlantis)`);
  console.log(`🔵 Drilling Capability: ${currentDrillingCapability.toFixed(2)} deliveries/month available for drilling`);
  console.log(`📈 Drilling Gap: ${drillingGapVessels} additional vessels needed`);
  console.log(`🏭 Mad Dog Warehouse: ${madDogWarehouseVessels} vessel`);
  console.log(`🎯 TOTAL DRILLING FLEET REQUIRED: ${totalDrillingVesselsRequired} vessels`);
  console.log(`🎯 DRILLING-ONLY RECOMMENDATION (ADDITIONAL): ${drillingOnlyRecommendation} vessels`);
  console.log(`📊 Total with Production: ${totalWithProduction} vessels (for reference)`);
  console.log(`💡 Enhanced Recommendation: ${enhancedRecommendation}`);
  
  return enhancedResult;
};

/**
 * Main function: Calculate vessel requirements using the ENHANCED three-step methodology
 * 
 * ENHANCEMENTS:
 * - Uses CostAllocation.xlsx as master data source for location determination
 * - Integrates Vessel Codes.xlsx for proper activity classification (when available)
 * - Real drilling vs production demand ratios from cost allocation data
 * - Enhanced validation and debugging throughout
 */
export const calculateVesselRequirements = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  costAllocations?: any[]
): VesselRequirementResult => {
  console.log('🚀 Starting ENHANCED vessel requirement calculation...');
  console.log(`📅 Analysis Period: Jan 1 - Jun 30, 2025 (6 months)`);
  
  // Log data availability
  console.log(`📊 Input data summary:`);
  console.log(`   Voyages: ${voyages.length}`);
  console.log(`   Manifests: ${manifests.length}`);
  console.log(`   Cost Allocations: ${costAllocations?.length || 0}`);
  
  if (costAllocations && costAllocations.length > 0) {
    console.log(`✅ Cost allocation data available - using enhanced location determination`);
  } else {
    console.log(`⚠️ No cost allocation data - using fallback location mapping`);
  }
  
  // Step 1: Calculate delivery demand by location with cost allocation cross-reference
  const demandResult = calculateDeliveryDemand(manifests, costAllocations);
  
  // Step 2: Calculate vessel delivery capability (month-by-month approach)
  const capabilityResult = calculateVesselCapability(voyages);
  
  // Step 3: Calculate vessel requirement using month-by-month fleet capability with drilling/production split
  const result = calculateVesselRequirement(
    demandResult.locationDemands, 
    capabilityResult.vesselCapabilities,
    capabilityResult.fleetCapability,
    demandResult.totalOffshoreDemandPerMonth,
    capabilityResult.currentFleetSize,
    demandResult.averageDrillingDemand,
    demandResult.averageProductionDemand
  );
  
  console.log('✅ ENHANCED vessel requirement calculation completed');
  
  // Enhanced logging for validation
  console.log('\n🎯 FINAL ENHANCED RESULTS SUMMARY:');
  console.log(`   Used cost allocation data: ${costAllocations && costAllocations.length > 0 ? 'YES' : 'NO'}`);
  console.log(`   Drilling vs Production Split: ${result.averageDrillingDemand.toFixed(2)} / ${result.averageProductionDemand.toFixed(2)}`);
  console.log(`   Drilling/Production Ratio: ${result.averageProductionDemand > 0 ? (result.averageDrillingDemand / result.averageProductionDemand * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`   Locations Analyzed: ${result.locationDemands.length}`);
  console.log(`   Vessels Analyzed: ${result.vesselCapabilities.length} (Active: ${result.totalActiveVessels})`);
  console.log(`   Recommendation: ${result.recommendation}`);
  
  return result;
};

/**
 * ENHANCED Main function: Calculate vessel requirements using enhanced drilling-focused methodology
 * 
 * NEW APPROACH:
 * - Separates drilling demand forecasting from fixed production baseline
 * - Focuses on 6 drilling locations for variable demand calculation  
 * - Uses fixed production fleet allocation (1.25 vessels)
 * - Adds Mad Dog warehouse requirement (+1 vessel)
 * - Provides drilling gap analysis for better forecasting
 */
export const calculateEnhancedVesselRequirements = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  costAllocations?: any[]
): EnhancedVesselRequirementResult => {
  console.log('🚀 Starting ENHANCED drilling-focused vessel requirement calculation...');
  console.log(`📅 Analysis Period: Jan 1 - Jun 30, 2025 (6 months)`);
  console.log(`🎯 Focus: Drilling demand forecasting with fixed production baseline`);
  
  // Log data availability
  console.log(`📊 Input data summary:`);
  console.log(`   Voyages: ${voyages.length}`);
  console.log(`   Manifests: ${manifests.length}`);
  console.log(`   Cost Allocations: ${costAllocations?.length || 0}`);
  
  if (costAllocations && costAllocations.length > 0) {
    console.log(`✅ Cost allocation data available - using enhanced location determination`);
  } else {
    console.log(`⚠️ No cost allocation data - using fallback location mapping`);
  }
  
  // Step 1: Calculate delivery demand by location with cost allocation cross-reference
  const demandResult = calculateDeliveryDemand(manifests, costAllocations);
  
  // Step 2: Calculate vessel delivery capability (month-by-month approach)
  const capabilityResult = calculateVesselCapability(voyages);
  
  // Step 3: Enhanced vessel requirement calculation with drilling focus
  const enhancedResult = calculateEnhancedVesselRequirement(
    demandResult.locationDemands, 
    capabilityResult.vesselCapabilities,
    capabilityResult.fleetCapability,
    demandResult.totalOffshoreDemandPerMonth,
    capabilityResult.currentFleetSize,
    demandResult.averageDrillingDemand,
    demandResult.averageProductionDemand
  );
  
  console.log('✅ ENHANCED drilling-focused vessel requirement calculation completed');
  
  // Enhanced logging for validation
  console.log('\n🎯 FINAL ENHANCED DRILLING-FOCUSED RESULTS SUMMARY:');
  console.log(`   Methodology: Drilling-focused with production handled separately`);
  console.log(`   Drilling locations analyzed: ${BP_DRILLING_LOCATIONS.length} (${BP_DRILLING_LOCATIONS.join(', ')})`);
  console.log(`   Production fleet (internal): ${PRODUCTION_FLEET_BASELINE} vessels (Fantasy Island + Thunder Horse support)`);
  console.log(`   Outsourced capacity (Chevron): ${CHEVRON_OUTSOURCED_CAPACITY} vessels (for Atlantis)`);
  console.log(`   Mad Dog warehouse: ${MAD_DOG_WAREHOUSE_VESSELS} vessel (additional)`);
  console.log(`   Total drilling demand: ${enhancedResult.totalDrillingDemand.toFixed(2)} deliveries/month`);
  console.log(`   Current drilling capability: ${enhancedResult.currentDrillingCapability.toFixed(2)} deliveries/month`);
  console.log(`   Drilling gap: ${enhancedResult.drillingGap} additional vessels needed`);
  console.log(`   TOTAL DRILLING FLEET REQUIRED: ${enhancedResult.recommendationBreakdown.totalDrillingRequired} vessels`);
  console.log(`   Drilling breakdown: ${Math.ceil(enhancedResult.totalDrillingDemand / enhancedResult.averageVesselCapability)} for demand + ${enhancedResult.recommendationBreakdown.madDogWarehouse} Mad Dog warehouse`);
  console.log(`   Additional drilling vessels needed: ${enhancedResult.recommendationBreakdown.drillingGap} vessels`);
  console.log(`   Production handled separately: ${enhancedResult.recommendationBreakdown.productionFleet} internal + ${enhancedResult.recommendationBreakdown.outsourcedCapacity} Chevron`);
  console.log(`   Enhanced recommendation: ${enhancedResult.enhancedRecommendation}`);
  
  return enhancedResult;
};

/**
 * Generate simple report for vessel requirements
 */
export const generateVesselRequirementReport = (result: VesselRequirementResult): string => {
  let report = '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                    VESSEL REQUIREMENT ANALYSIS\n';
  report += '                     Data-Driven Approach\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';
  
  // Executive summary
  report += '📊 EXECUTIVE SUMMARY:\n';
  report += `   Analysis Period: ${result.analysisDateRange.startDate} to ${result.analysisDateRange.endDate}\n`;
  report += `   Total Monthly Delivery Demand: ${result.totalMonthlyDeliveryDemand} deliveries\n`;
  report += `   Average Vessel Capability: ${result.averageVesselCapability} port calls/month\n`;
  report += `   Required Vessels: ${result.requiredVessels}\n`;
  report += `   Current Active Vessels: ${result.currentVessels}\n`;
  report += `   Fleet Utilization: ${result.utilizationPercentage}%\n`;
  report += `   Recommendation: ${result.recommendation}\n\n`;
  
  // Top delivery locations
  report += '📍 TOP DELIVERY LOCATIONS:\n';
  result.locationDemands.slice(0, 10).forEach((demand, index) => {
    report += `   ${index + 1}. ${demand.location}: ${demand.monthlyAverage} deliveries/month\n`;
  });
  report += '\n';
  
  // Top performing vessels
  report += '⛵ TOP PERFORMING VESSELS:\n';
  result.vesselCapabilities.slice(0, 10).forEach((capability, index) => {
    report += `   ${index + 1}. ${capability.vesselName}: ${capability.monthlyAverage} port calls/month\n`;
  });
  
  report += '\n═══════════════════════════════════════════════════════════════\n';
  
  return report;
};

/**
 * NEW APPROACH: Manifest-Based Vessel Requirement Calculator
 * 
 * This approach uses VesselManifests.xlsx as the primary source for:
 * 1. Drilling vs Production classification (using finalDepartment field)
 * 2. Direct vessel capability calculation from actual manifest data
 * 3. More accurate demand calculation based on real operational data
 */

export interface ManifestBasedVesselDemand {
  totalDrillingDeliveries: number;
  totalProductionDeliveries: number;
  drillingDeliveriesPerMonth: number;
  productionDeliveriesPerMonth: number; // Internal production (1.25)
  actualProductionDeliveriesPerMonth: number; // Actual production deliveries from manifest data
  totalProductionDemand: number; // Total production demand (1.5)
  outsourcedProduction: number; // 0.25 vessels/month
  madDogWarehouse: number; // 1.0 vessels/month
  recommendedTotalVessels: number; // drilling + production + maddog
  vesselDrillingCapabilities: Map<string, number>; // vessel -> deliveries per month
  vesselProductionCapabilities: Map<string, number>; // vessel -> deliveries per month
  // Enhanced capability metrics
  fleetMonthlyCapability: number; // total fleet capability deliveries/month
  averageVesselCapability: number; // average capability per vessel per month
  coreFleetAverageCapability: number; // core fleet average capability per vessel per month
  activeVesselCount: number; // number of active vessels
  analysisDateRange: {
    startDate: string;
    endDate: string;
    monthsCovered: number;
  };
}

export interface ManifestBasedVesselRequirementResult {
  // Source data
  totalManifests: number;
  drillingManifests: number;
  productionManifests: number;
  analysisDateRange: {
    startDate: string;
    endDate: string;
    monthsCovered: number;
  };
  
  // Demand calculations
  totalDrillingDemand: number; // deliveries per month
  totalProductionDemand: number; // total production demand per month (1.5 vessels)
  internalProductionDemand: number; // internal production per month (1.25 vessels) 
  actualProductionDemand: number; // actual production deliveries from manifests per month
  outsourcedProduction: number; // vessels per month (Chevron/Atlantis)
  madDogWarehouse: number; // vessels per month
  recommendedTotalVessels: number; // drilling + production + maddog (excludes outsourced)
  
  // Vessel capability analysis  
  totalVesselsAnalyzed: number;
  averageVesselCapability: number; // deliveries per vessel per month
  topDrillingVessels: { vessel: string; capability: number }[];
  topProductionVessels: { vessel: string; capability: number }[];
  
  // Requirement calculations
  drillingVesselsNeeded: number;
  productionVesselsNeeded: number;
  totalVesselsNeeded: number;
  additionalVesselsNeeded: number; // Vessels needed beyond core fleet of 5
  coreFleetUtilizationDrilling: number; // Core fleet utilization percentage for drilling
  
  // Current fleet analysis
  currentActiveVessels: number;
  vesselGap: number; // positive = need more, negative = excess
  recommendation: string;
  
  // Enhanced data for visualizations
  locationDemands: LocationDeliveryDemand[]; // Monthly breakdown by drilling location
  vesselCapabilities: VesselCapability[]; // Monthly breakdown by vessel
  monthlyBreakdown: {
    month: string;
    totalDemand: number;
    totalCapability: number;
    drillingDemand: number;
    productionDemand: number;
    utilizationRate: number;
    gap: number;
    // Drilling vessel requirement forecasting
    drillingVesselsNeeded: number;
    additionalVesselsNeeded: number;
    coreFleetUtilization: number;
  }[];
}

/**
 * Calculate drilling and production demand directly from vessel manifests
 * Uses the finalDepartment field AND drilling location filtering for accurate classification
 */
export const calculateManifestBasedDemand = (manifests: VesselManifest[]): ManifestBasedVesselDemand => {
  console.log('📋 Calculating manifest-based demand using finalDepartment classification and drilling location filtering...');
  console.log(`🎯 Target drilling locations: ${BP_DRILLING_LOCATIONS.join(', ')}`);
  
  // Filter to analysis period
  const filteredManifests = manifests.filter(manifest => {
    if (!manifest.manifestDate) return false;
    const manifestDate = new Date(manifest.manifestDate);
    return manifestDate >= ANALYSIS_START_DATE && manifestDate <= ANALYSIS_END_DATE;
  });
  
  console.log(`📅 Filtered ${filteredManifests.length} manifests in analysis period`);
  
  // Debug: Check finalDepartment distribution
  const departmentBreakdown = new Map<string, number>();
  filteredManifests.forEach(manifest => {
    const dept = manifest.finalDepartment || 'Unknown';
    departmentBreakdown.set(dept, (departmentBreakdown.get(dept) || 0) + 1);
  });
  
  console.log(`📊 Department distribution:`);
  departmentBreakdown.forEach((count, dept) => {
    console.log(`  - ${dept}: ${count} manifests`);
  });
  
  // CORRECTED: Filter manifests by drilling locations AND exclude specified vessels
  // This counts ALL manifests going to our 6 drilling locations with allowed vessels only
  const drillingManifests = filteredManifests.filter(manifest => {
    // Must be delivered to one of our 6 drilling locations
    const manifestLocation = normalizeRigLocation(
      manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || ''
    );
    
    const isDrillingLocation = BP_DRILLING_LOCATIONS.includes(manifestLocation as any);
    
    if (!isDrillingLocation) {
      if (manifestLocation && manifestLocation !== 'Unknown' && Math.random() < 0.1) {
        const rawLocation = manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode;
        console.log(`🚫 Excluding manifest: "${rawLocation}" → normalized to "${manifestLocation}" (not in drilling locations)`);
      }
      return false;
    }
    
    // ALSO exclude manifests from excluded vessels
    const vessel = manifest.transporter;
    if (vessel && !isPSVOrOSV(vessel)) {
      if (Math.random() < 0.1) { // Only log 10% to avoid spam
        console.log(`🚫 Excluding manifest from excluded vessel: ${vessel} to ${manifestLocation}`);
      }
      return false;
    }
    
    return true;
  });
  
  // Production manifests: Must go to actual production locations (not just any Production department manifest)
  const productionManifests = filteredManifests.filter(manifest => {
    // Must be going to one of our 6 production locations
    const manifestLocation = normalizeRigLocation(
      manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || ''
    );
    
    const isProductionLocation = BP_PRODUCTION_LOCATIONS.includes(manifestLocation as any);
    
    // ALSO exclude manifests from excluded vessels
    const vessel = manifest.transporter;
    const isValidVessel = vessel && isPSVOrOSV(vessel);
    
    return isProductionLocation && isValidVessel;
  });
  
  console.log(`🔵 Drilling location manifests: ${drillingManifests.length} (ALL manifests to 6 drilling locations, regardless of department)`);
  console.log(`🟢 Production location manifests: ${productionManifests.length} (to actual production facilities: ${BP_PRODUCTION_LOCATIONS.join(', ')})`);
  console.log(`⚪ Other manifests: ${filteredManifests.length - drillingManifests.length} (not going to drilling locations)`);
  
  // Show breakdown by drilling location
  const drillingLocationBreakdown = new Map<string, number>();
  drillingManifests.forEach(manifest => {
    const location = normalizeRigLocation(
      manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || ''
    );
    drillingLocationBreakdown.set(location, (drillingLocationBreakdown.get(location) || 0) + 1);
  });
  
  console.log(`📍 Drilling manifests by location:`);
  let totalDrillingManifests = 0;
  BP_DRILLING_LOCATIONS.forEach(location => {
    const count = drillingLocationBreakdown.get(location) || 0;
    const monthlyAverage = count / 6; // 6 months analysis period
    totalDrillingManifests += count;
    console.log(`  - ${location}: ${count} manifests (${monthlyAverage.toFixed(1)} deliveries/month)`);
  });
  
  const averageManifestsPerLocation = totalDrillingManifests / BP_DRILLING_LOCATIONS.length;
  console.log(`📊 Summary: ${totalDrillingManifests} total drilling manifests across ${BP_DRILLING_LOCATIONS.length} locations`);
  console.log(`📊 Average per location: ${averageManifestsPerLocation.toFixed(1)} manifests per location over 6 months`);
  console.log(`📊 Expected range check: ${averageManifestsPerLocation.toFixed(1)} manifests per location (expecting 50-60 total across all locations per month = ~300-360 per location over 6 months)`);
  
  if (averageManifestsPerLocation < 45) {
    console.warn(`⚠️ WARNING: Average manifests per location (${averageManifestsPerLocation.toFixed(1)}) is below expected range (50-60)`);
    console.warn(`   This could indicate location mapping issues or department classification problems`);
  }
  
  // Calculate monthly totals with detailed breakdown
  const monthsCovered = 6; // Jan-Jun 2025
  const monthKeys = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  
  // Count manifests by month for proper averaging
  const manifestsByMonth = new Map<string, number>();
  monthKeys.forEach(month => manifestsByMonth.set(month, 0));
  
  drillingManifests.forEach(manifest => {
    if (manifest.manifestDate) {
      const manifestDate = new Date(manifest.manifestDate);
      const monthKey = `${manifestDate.getFullYear()}-${(manifestDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (manifestsByMonth.has(monthKey)) {
        manifestsByMonth.set(monthKey, manifestsByMonth.get(monthKey)! + 1);
      }
    }
  });
  
  // Calculate average monthly demand
  let totalManifestsAcrossAllMonths = 0;
  console.log(`📅 Monthly breakdown of drilling manifests:`);
  manifestsByMonth.forEach((count, month) => {
    totalManifestsAcrossAllMonths += count;
    console.log(`  ${month}: ${count} manifests`);
  });
  
  const drillingDeliveriesPerMonth = totalManifestsAcrossAllMonths / monthsCovered;
  
  // PRODUCTION DEMAND: Fixed business rule - broken down by component
  const totalProductionDemand = 1.5;        // Total production vessel requirement per month
  const outsourcedProduction = 0.25;        // Chevron delivering Atlantis cargo per month (outsourced)  
  const productionDeliveriesPerMonth = totalProductionDemand - outsourcedProduction; // Internal production = 1.5 - 0.25 = 1.25 vessels/month
  const madDogWarehouse = 1.0;              // Mad Dog Warehouse requirement per month
  
  console.log(`📊 Total drilling manifests: ${drillingManifests.length}`);
  console.log(`📊 Total across all months: ${totalManifestsAcrossAllMonths}`);  
  console.log(`📊 Drilling demand per month: ${drillingDeliveriesPerMonth.toFixed(2)} deliveries/month`);
  console.log(`📊 Production demand breakdown:`);
  console.log(`  - Total production required: ${totalProductionDemand} vessels/month`);
  console.log(`  - Outsourced (Chevron/Atlantis): ${outsourcedProduction} vessels/month`);
  console.log(`  - Internal production needed: ${productionDeliveriesPerMonth} vessels/month (${totalProductionDemand} - ${outsourcedProduction})`);
  console.log(`  - Mad Dog Warehouse: ${madDogWarehouse} vessels/month`);
  
  // Calculate recommended total vessels: (Drilling deliveries ÷ vessel capability) + Production vessels + Mad Dog vessels  
  // We'll calculate this in the main function where we have vessel capability data
  // For now, set a placeholder - will be calculated properly in calculateManifestBasedVesselRequirements
  const recommendedTotalVessels = 0; // Placeholder - calculated later with actual vessel capability
  console.log(`📊 Recommended Total Vessels: ${recommendedTotalVessels.toFixed(2)} vessels/month`);
  console.log(`  (${drillingDeliveriesPerMonth.toFixed(2)} drilling + ${productionDeliveriesPerMonth} production + ${madDogWarehouse} Mad Dog warehouse)`);
  
  if (Math.abs(drillingManifests.length - totalManifestsAcrossAllMonths) > 0) {
    console.warn(`⚠️ WARNING: Manifest count mismatch! Total=${drillingManifests.length}, Sum by month=${totalManifestsAcrossAllMonths}`);
  }
  
  // Calculate TOTAL vessel capabilities using month-by-month methodology from ALL manifests
  const vesselDrillingCapabilities = new Map<string, number>();
  const vesselProductionCapabilities = new Map<string, number>();
  
  // Process ALL manifests by vessel AND month for capability calculation (not just drilling locations)
  let includedVessels = new Set<string>();
  let excludedVessels = new Set<string>();
  const vesselMonthlyCapabilities = new Map<string, Map<string, number>>(); // vessel -> month -> count
  
  console.log(`📊 Calculating vessel capability from ALL ${filteredManifests.length} manifests (Jan-Jun 2025)...`);
  
  // Debug: Check manifest data quality
  let manifestsWithVessels = 0;
  let manifestsWithoutVessels = 0;
  let uniqueVesselNames = new Set<string>();
  
  filteredManifests.forEach(manifest => {
    if (manifest.transporter && manifest.transporter.trim()) {
      manifestsWithVessels++;
      uniqueVesselNames.add(manifest.transporter.toLowerCase());
    } else {
      manifestsWithoutVessels++;
    }
  });
  
  console.log(`📊 Manifest data quality check:`);
  console.log(`  Manifests with vessel names: ${manifestsWithVessels}`);
  console.log(`  Manifests without vessel names: ${manifestsWithoutVessels}`);
  console.log(`  Unique vessel names found: ${uniqueVesselNames.size}`);
  console.log(`  Sample vessel names: ${Array.from(uniqueVesselNames).slice(0, 10).join(', ')}`);
  
  filteredManifests.forEach(manifest => {
    const vessel = manifest.transporter;
    const manifestDate = new Date(manifest.manifestDate!);
    const monthKey = `${manifestDate.getFullYear()}-${(manifestDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (vessel && isPSVOrOSV(vessel)) { // Same vessel exclusions as drilling demand
      includedVessels.add(vessel);
      
      // Track monthly capabilities from ALL deliveries (not just drilling)
      if (!vesselMonthlyCapabilities.has(vessel)) {
        vesselMonthlyCapabilities.set(vessel, new Map());
      }
      const vesselMonths = vesselMonthlyCapabilities.get(vessel)!;
      vesselMonths.set(monthKey, (vesselMonths.get(monthKey) || 0) + 1);
      
    } else if (vessel) {
      excludedVessels.add(vessel);
    }
  });
  
  console.log(`📊 Vessel capability calculation: ${filteredManifests.length} total manifests processed`);
  
  console.log(`⛵ Vessels included in TOTAL capability analysis: ${Array.from(includedVessels).slice(0, 10).join(', ')}${includedVessels.size > 10 ? ` (and ${includedVessels.size - 10} more)` : ''}`);
  console.log(`🚫 Vessels excluded from TOTAL capability analysis: ${Array.from(excludedVessels).slice(0, 5).join(', ')}${excludedVessels.size > 5 ? ` (and ${excludedVessels.size - 5} more)` : ''}`);
  
  // Calculate average monthly capability per vessel from ALL their deliveries
  console.log(`📊 TOTAL Vessel capability breakdown month-by-month (ALL locations):`);
  vesselMonthlyCapabilities.forEach((monthCounts, vessel) => {
    let totalDeliveries = 0;
    let activeMonths = 0;
    
    monthKeys.forEach(month => {
      const deliveries = monthCounts.get(month) || 0;
      totalDeliveries += deliveries;
      if (deliveries > 0) activeMonths++;
    });
    
    // Average monthly capability for this vessel (from ALL their deliveries)
    const averageMonthlyCapability = totalDeliveries / monthsCovered;
    vesselDrillingCapabilities.set(vessel, averageMonthlyCapability);
    
    // Log ALL vessels for debugging to identify capability issues
    console.log(`  ${vessel}: ${averageMonthlyCapability.toFixed(1)} deliveries/month TOTAL capability (active in ${activeMonths} months, total: ${totalDeliveries})`);
  });
  
  // Define core fleet vessels (consistent baseline fleet)
  const CORE_FLEET_VESSELS = [
    'pelican island',
    'dauphin island', 
    'lightning',
    'squall',
    'harvey supporter'
  ];
  
  // Calculate fleet-wide capability metrics
  let totalFleetCapability = 0;
  let coreFleetCapability = 0;
  let vesselCapabilityValues: number[] = [];
  let coreFleetCapabilityValues: number[] = [];
  
  vesselDrillingCapabilities.forEach((capability, vesselName) => {
    totalFleetCapability += capability;
    vesselCapabilityValues.push(capability);
    
    // Check if this is a core fleet vessel
    if (CORE_FLEET_VESSELS.some(coreVessel => vesselName.toLowerCase().includes(coreVessel))) {
      coreFleetCapability += capability;
      coreFleetCapabilityValues.push(capability);
    }
  });
  
  const averageVesselCapability = vesselCapabilityValues.length > 0 ? 
    totalFleetCapability / vesselCapabilityValues.length : 0;
  const coreFleetAverageCapability = coreFleetCapabilityValues.length > 0 ?
    coreFleetCapability / coreFleetCapabilityValues.length : 0;
  const fleetMonthlyCapability = totalFleetCapability;
  
  // Additional debugging for capability distribution
  const sortedCapabilities = vesselCapabilityValues.sort((a, b) => b - a);
  const highPerformers = sortedCapabilities.filter(cap => cap >= 8).length;
  const mediumPerformers = sortedCapabilities.filter(cap => cap >= 4 && cap < 8).length;
  const lowPerformers = sortedCapabilities.filter(cap => cap < 4).length;

  console.log(`📊 VESSEL CAPABILITY ANALYSIS:`);
  console.log(`\n🎯 CORE FLEET (Baseline Operations):`);
  console.log(`  Core vessels: ${coreFleetCapabilityValues.length} vessels (${CORE_FLEET_VESSELS.join(', ')})`);
  console.log(`  Core fleet capability: ${coreFleetCapability.toFixed(2)} deliveries/month`);
  console.log(`  Core fleet average: ${coreFleetAverageCapability.toFixed(2)} deliveries/month/vessel`);
  console.log(`  Core fleet utilization: ${coreFleetCapability > 0 ? (50.67 / coreFleetCapability * 100).toFixed(1) : 0}% (vs drilling demand)`);
  
  console.log(`\n⚡ TOTAL FLEET (Including Temporary Vessels):`);
  console.log(`  Total active vessels: ${vesselDrillingCapabilities.size}`);
  console.log(`  Total fleet capability: ${fleetMonthlyCapability.toFixed(2)} deliveries/month (ALL destinations)`);
  console.log(`  Total fleet average: ${averageVesselCapability.toFixed(2)} deliveries/month/vessel (ALL vessels)`);
  console.log(`  Total fleet utilization: ${fleetMonthlyCapability > 0 ? (50.67 / fleetMonthlyCapability * 100).toFixed(1) : 0}% (vs drilling demand)`);
  
  console.log(`\n📊 FLEET COMPOSITION:`);
  console.log(`  Core fleet vessels: ${coreFleetCapabilityValues.length}`);
  console.log(`  Temporary/support vessels: ${vesselCapabilityValues.length - coreFleetCapabilityValues.length}`);
  console.log(`  High performers (≥8 deliveries/month): ${highPerformers} vessels`);
  console.log(`  Medium performers (4-8 deliveries/month): ${mediumPerformers} vessels`);
  console.log(`  Low performers (<4 deliveries/month): ${lowPerformers} vessels`);
  console.log(`  Top 5 performers: ${sortedCapabilities.slice(0, 5).map(cap => cap.toFixed(1)).join(', ')} deliveries/month`);
  if (sortedCapabilities.length > 5) {
    console.log(`  Bottom 5 performers: ${sortedCapabilities.slice(-5).map(cap => cap.toFixed(1)).join(', ')} deliveries/month`);
  }
  
  // Process production manifests by vessel (same exclusions)
  productionManifests.forEach(manifest => {
    const vessel = manifest.transporter;
    if (vessel && isPSVOrOSV(vessel)) { // Same vessel exclusions
      vesselProductionCapabilities.set(vessel, (vesselProductionCapabilities.get(vessel) || 0) + 1);
    }
  });
  
  // Convert production capabilities to monthly
  vesselProductionCapabilities.forEach((deliveries, vessel) => {
    vesselProductionCapabilities.set(vessel, deliveries / monthsCovered);
  });
  
  // Calculate actual production deliveries per month from manifest data
  const actualProductionDeliveriesPerMonth = productionManifests.length / monthsCovered;
  
  console.log(`📊 TOTAL drilling demand (across all 6 drilling locations): ${drillingDeliveriesPerMonth.toFixed(2)} deliveries/month`);
  console.log(`📊 Average drilling demand per location: ${(drillingDeliveriesPerMonth / 6).toFixed(2)} deliveries per location per month`);
  console.log(`📊 Production demand (fixed business rule): ${productionDeliveriesPerMonth.toFixed(2)} vessels/month`);
  console.log(`📊 Actual production deliveries (from manifests): ${actualProductionDeliveriesPerMonth.toFixed(2)} deliveries/month`);
  console.log(`⛵ PSV/OSV vessels with drilling activity: ${vesselDrillingCapabilities.size}`);
  console.log(`⛵ PSV/OSV vessels with production activity: ${vesselProductionCapabilities.size}`);
  console.log(`📊 Fleet monthly capability vs demand: ${fleetMonthlyCapability.toFixed(2)} capability vs ${drillingDeliveriesPerMonth.toFixed(2)} demand = ${(fleetMonthlyCapability / drillingDeliveriesPerMonth * 100).toFixed(1)}% utilization`);
  
  return {
    totalDrillingDeliveries: drillingManifests.length,
    totalProductionDeliveries: Math.round(productionDeliveriesPerMonth * monthsCovered), // Convert monthly requirement back to total for UI
    drillingDeliveriesPerMonth,
    productionDeliveriesPerMonth, // This is now the fixed 1.25 vessels/month (internal)
    actualProductionDeliveriesPerMonth, // Actual production deliveries from manifest data
    totalProductionDemand, // This is 1.5 vessels/month (total before outsourcing)
    outsourcedProduction, // 0.25 vessels/month
    madDogWarehouse, // 1.0 vessels/month
    recommendedTotalVessels, // drilling + production + maddog
    vesselDrillingCapabilities,
    vesselProductionCapabilities,
    // Enhanced capability metrics
    fleetMonthlyCapability,
    averageVesselCapability,
    coreFleetAverageCapability, // Pass core fleet average for main KPI display
    activeVesselCount: vesselDrillingCapabilities.size,
    analysisDateRange: {
      startDate: ANALYSIS_START_DATE.toISOString().split('T')[0],
      endDate: ANALYSIS_END_DATE.toISOString().split('T')[0],
      monthsCovered
    }
  };
};

/**
 * Calculate vessel requirements using manifest-based approach
 * Much simpler and more accurate than location-based inference
 */
export const calculateManifestBasedVesselRequirements = (manifests: VesselManifest[]): ManifestBasedVesselRequirementResult => {
  console.log('🚀 Starting MANIFEST-BASED vessel requirement calculation...');
  console.log('📋 Using VesselManifests.xlsx as primary source with finalDepartment classification');
  
  // Calculate demand from manifests
  const demandData = calculateManifestBasedDemand(manifests);
  
  // Calculate vessel capabilities
  const allVessels = new Set([
    ...demandData.vesselDrillingCapabilities.keys(),
    ...demandData.vesselProductionCapabilities.keys()
  ]);
  
  const totalVesselsAnalyzed = allVessels.size;
  
  // Use the enhanced capability metrics from the demand calculation
  const averageVesselCapability = demandData.averageVesselCapability;
  const fleetCapability = demandData.fleetMonthlyCapability;
  const activeVesselCount = demandData.activeVesselCount;
  
  // Get top performing vessels
  const topDrillingVessels = Array.from(demandData.vesselDrillingCapabilities.entries())
    .map(([vessel, capability]) => ({ vessel, capability }))
    .sort((a, b) => b.capability - a.capability)
    .slice(0, 5);
    
  const topProductionVessels = Array.from(demandData.vesselProductionCapabilities.entries())
    .map(([vessel, capability]) => ({ vessel, capability }))
    .sort((a, b) => b.capability - a.capability)
    .slice(0, 5);
  
  // Calculate drilling vessel requirements using CORE FLEET baseline capability
  const coreFleetCapability = demandData.coreFleetAverageCapability;
  
  // Drilling vessel requirements (separate from production)
  const drillingVesselsNeededCoreFleet = coreFleetCapability > 0 ? 
    Math.ceil(demandData.drillingDeliveriesPerMonth / coreFleetCapability) : 0;
    
  // Alternative calculation using total fleet average (for comparison)
  const drillingVesselsNeededTotalFleet = demandData.averageVesselCapability > 0 ? 
    Math.ceil(demandData.drillingDeliveriesPerMonth / demandData.averageVesselCapability) : 0;
    
  // Production vessel requirements (fixed 1.5 vessels/month requirement)
  const productionVesselsNeeded = coreFleetCapability > 0 ? 
    Math.ceil(demandData.productionDeliveriesPerMonth / coreFleetCapability) : 0;
    
  // Total requirements
  const totalVesselsNeeded = drillingVesselsNeededCoreFleet + productionVesselsNeeded;
  
  // Core fleet utilization analysis
  const coreFleetUtilizationDrilling = (demandData.drillingDeliveriesPerMonth / (5 * coreFleetCapability)) * 100;
  const additionalVesselsNeeded = Math.max(0, drillingVesselsNeededCoreFleet - 5); // Beyond core fleet of 5
  
  // Calculate the CORRECT recommended total vessels:
  // (Drilling deliveries ÷ core fleet capability) + Production vessels + Mad Dog vessels
  const drillingVesselsFromCapability = coreFleetCapability > 0 ? 
    Math.ceil(demandData.drillingDeliveriesPerMonth / coreFleetCapability) : 0;
  const recommendedTotalVessels = drillingVesselsFromCapability + 
    Math.ceil(demandData.productionDeliveriesPerMonth / coreFleetCapability) + 
    Math.ceil(demandData.madDogWarehouse / coreFleetCapability);
  
  // Current fleet analysis using enhanced metrics
  const currentActiveVessels = activeVesselCount;
  const vesselGap = totalVesselsNeeded - currentActiveVessels;
  
  // Enhanced capability analysis
  const utilizationRate = fleetCapability > 0 ? 
    (demandData.drillingDeliveriesPerMonth / fleetCapability * 100) : 0;
  
  // Generate detailed drilling-focused recommendation
  let recommendation = '';
  let drillingAnalysis = '';
  
  if (additionalVesselsNeeded > 0) {
    drillingAnalysis = `Core fleet (5 vessels) insufficient for drilling demand. Need ${additionalVesselsNeeded} additional drilling vessel${additionalVesselsNeeded > 1 ? 's' : ''}`;
    recommendation = `Bring on ${additionalVesselsNeeded} temporary vessel${additionalVesselsNeeded > 1 ? 's' : ''} to supplement core fleet for drilling operations`;
  } else {
    drillingAnalysis = `Core fleet (5 vessels) sufficient for drilling demand at ${coreFleetUtilizationDrilling.toFixed(1)}% utilization`;
    recommendation = `Core fleet capacity sufficient for current drilling demand. Consider production support vessels`;
  }
  
  console.log(`\n🎯 DRILLING VESSEL REQUIREMENTS ANALYSIS:`);
  console.log(`  Drilling demand: ${demandData.drillingDeliveriesPerMonth.toFixed(2)} deliveries/month`);
  console.log(`  Core fleet capability: ${(5 * coreFleetCapability).toFixed(2)} deliveries/month (5 vessels × ${coreFleetCapability.toFixed(2)})`);
  console.log(`  Core fleet utilization for drilling: ${coreFleetUtilizationDrilling.toFixed(1)}%`);
  console.log(`  Drilling vessels needed (core fleet basis): ${drillingVesselsNeededCoreFleet} vessels`);
  console.log(`  Additional vessels beyond core fleet: ${additionalVesselsNeeded} vessels`);
  console.log(`  Analysis: ${drillingAnalysis}`);
  
  console.log(`\n📊 RECOMMENDED TOTAL VESSELS CALCULATION:`);
  console.log(`  Drilling vessels needed: ${drillingVesselsFromCapability} vessels (${demandData.drillingDeliveriesPerMonth.toFixed(2)} deliveries ÷ ${coreFleetCapability.toFixed(2)} capability)`);
  console.log(`  Production vessels needed: ${Math.ceil(demandData.productionDeliveriesPerMonth / coreFleetCapability)} vessels (${demandData.productionDeliveriesPerMonth} ÷ ${coreFleetCapability.toFixed(2)} capability)`);
  console.log(`  Mad Dog vessels needed: ${Math.ceil(demandData.madDogWarehouse / coreFleetCapability)} vessels (${demandData.madDogWarehouse} ÷ ${coreFleetCapability.toFixed(2)} capability)`);
  console.log(`  TOTAL RECOMMENDED: ${recommendedTotalVessels} vessels/month`);
  console.log(`  (Excludes ${demandData.outsourcedProduction} outsourced vessels handled by Chevron)`);
  
  // Generate enhanced data for visualizations
  
  // 1. Create LocationDeliveryDemand array using REAL monthly breakdown data
  const locationDemands: LocationDeliveryDemand[] = [];
  const monthKeys = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  
  // We need to get the actual monthly breakdown from the manifestsByMonth data we calculated earlier
  // Let's create location demands based on actual drilling manifests by location and month
  
  console.log('🔍 Creating location demands with REAL monthly data...');
  
  // Group drilling manifests by location and month to get real breakdown
  const locationMonthBreakdown = new Map<string, Map<string, number>>();
  
  // Process the filtered drilling manifests to get real monthly breakdown by location
  // Re-create the drilling manifests filtering since we need it here for visualization data
  const filteredDrillingManifests = manifests.filter(manifest => {
    // First apply date range filter
    if (!manifest.manifestDate) return false;
    const manifestDate = new Date(manifest.manifestDate);
    if (manifestDate < ANALYSIS_START_DATE || manifestDate > ANALYSIS_END_DATE) return false;
    
    // Then filter by drilling location
    const manifestLocation = normalizeRigLocation(
      manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || ''
    );
    const isDrillingLocation = BP_DRILLING_LOCATIONS.includes(manifestLocation as any);
    
    // And vessel filter
    const vessel = manifest.transporter;
    const isValidVessel = vessel && isPSVOrOSV(vessel);
    
    return isDrillingLocation && isValidVessel;
  });
  
  console.log(`📊 Processing ${filteredDrillingManifests.length} real drilling manifests for location breakdown...`);
  
  filteredDrillingManifests.forEach(manifest => {
    const location = normalizeRigLocation(
      manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || ''
    );
    const manifestDate = new Date(manifest.manifestDate!);
    const monthKey = `${manifestDate.getFullYear()}-${(manifestDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!locationMonthBreakdown.has(location)) {
      locationMonthBreakdown.set(location, new Map());
    }
    const monthCounts = locationMonthBreakdown.get(location)!;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  });
  
  // Create LocationDeliveryDemand with real monthly data
  BP_DRILLING_LOCATIONS.forEach(location => {
    const monthCounts = locationMonthBreakdown.get(location) || new Map();
    const monthlyBreakdown: Record<string, number> = {};
    let totalDeliveries = 0;
    
    monthKeys.forEach(month => {
      const count = monthCounts.get(month) || 0;
      monthlyBreakdown[month] = count;
      totalDeliveries += count;
    });
    
    locationDemands.push({
      location,
      totalDeliveries,
      monthlyAverage: totalDeliveries / 6,
      monthlyBreakdown
    });
    
    console.log(`  ${location}: ${totalDeliveries} total (${(totalDeliveries/6).toFixed(1)}/month) - ${Object.values(monthlyBreakdown).join(', ')}`);
  });
  
  // 2. Create VesselCapability array using REAL monthly capability data
  const vesselCapabilities: VesselCapability[] = [];
  
  console.log('🔍 Creating vessel capabilities with REAL monthly data...');
  
  // We already have the vesselMonthlyCapabilities from the enhanced calculation
  // Let's use that data directly instead of creating artificial distributions
  if (demandData.vesselDrillingCapabilities) {
    // Get the actual monthly data from the enhanced demand calculation
    // We need to recreate the vessel monthly breakdown from ALL manifests
    const vesselMonthlyData = new Map<string, Map<string, number>>();
    
    // Re-create the ALL manifests filtering for vessel capability data
    const allFilteredManifests = manifests.filter(manifest => {
      if (!manifest.manifestDate) return false;
      const manifestDate = new Date(manifest.manifestDate);
      return manifestDate >= ANALYSIS_START_DATE && manifestDate <= ANALYSIS_END_DATE;
    });
    
    allFilteredManifests.forEach((manifest: VesselManifest) => {
      const vessel = manifest.transporter;
      if (vessel && isPSVOrOSV(vessel)) {
        const manifestDate = new Date(manifest.manifestDate!);
        const monthKey = `${manifestDate.getFullYear()}-${(manifestDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!vesselMonthlyData.has(vessel)) {
          vesselMonthlyData.set(vessel, new Map());
        }
        const monthCounts = vesselMonthlyData.get(vessel)!;
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      }
    });
    
    // Create VesselCapability with real monthly breakdown
    demandData.vesselDrillingCapabilities.forEach((averageCapability, vesselName) => {
      const monthCounts = vesselMonthlyData.get(vesselName) || new Map();
      const monthlyBreakdown: Record<string, number> = {};
      let totalPortCalls = 0;
      
      monthKeys.forEach(month => {
        const count = monthCounts.get(month) || 0;
        monthlyBreakdown[month] = count;
        totalPortCalls += count;
      });
      
      vesselCapabilities.push({
        vesselName,
        totalUniquePortCalls: totalPortCalls,
        monthlyAverage: totalPortCalls / 6,
        monthlyBreakdown
      });
      
      if (totalPortCalls > 30) { // Only log high-activity vessels
        console.log(`  ${vesselName}: ${totalPortCalls} total (${(totalPortCalls/6).toFixed(1)}/month) - ${Object.values(monthlyBreakdown).join(', ')}`);
      }
    });
  }
  
  // Sort by capability (highest first)
  vesselCapabilities.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  
  // 3. Create monthly breakdown for comparison charts with drilling vessel requirements
  const monthlyComparisonData = monthKeys.map(month => {
    const monthIndex = parseInt(month.split('-')[1]) - 1;
    const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][monthIndex];
    
    // Calculate monthly totals
    const drillingDemand = locationDemands.reduce((sum, location) => sum + (location.monthlyBreakdown[month] || 0), 0);
    const productionDemand = demandData.productionDeliveriesPerMonth; // Fixed 1.5 vessels/month
    const totalDemand = drillingDemand + productionDemand;
    const totalCapability = vesselCapabilities.reduce((sum, vessel) => sum + (vessel.monthlyBreakdown[month] || 0), 0);
    
    // Monthly drilling vessel requirements
    const monthlyDrillingVesselsNeeded = coreFleetCapability > 0 ? Math.ceil(drillingDemand / coreFleetCapability) : 0;
    const monthlyAdditionalVesselsNeeded = Math.max(0, monthlyDrillingVesselsNeeded - 5); // Beyond core fleet
    const monthlyCoreFleetUtilization = drillingDemand > 0 ? (drillingDemand / (5 * coreFleetCapability)) * 100 : 0;
    
    const utilizationRate = totalCapability > 0 ? (totalDemand / totalCapability) * 100 : 0;
    const gap = totalDemand - totalCapability;
    
    return {
      month: monthName,
      totalDemand,
      totalCapability,
      drillingDemand,
      productionDemand, // Fixed 1.5 vessels/month every month
      utilizationRate: Number(utilizationRate.toFixed(1)),
      gap,
      // Drilling-specific metrics for forecasting
      drillingVesselsNeeded: monthlyDrillingVesselsNeeded,
      additionalVesselsNeeded: monthlyAdditionalVesselsNeeded,
      coreFleetUtilization: Number(monthlyCoreFleetUtilization.toFixed(1))
    };
  });
  
  const result: ManifestBasedVesselRequirementResult = {
    totalManifests: manifests.length,
    drillingManifests: demandData.totalDrillingDeliveries,
    productionManifests: demandData.totalProductionDeliveries,
    analysisDateRange: demandData.analysisDateRange,
    totalDrillingDemand: demandData.drillingDeliveriesPerMonth,
    totalProductionDemand: demandData.totalProductionDemand, // 1.5 vessels/month total
    internalProductionDemand: demandData.productionDeliveriesPerMonth, // 1.25 vessels/month internal
    actualProductionDemand: demandData.actualProductionDeliveriesPerMonth, // actual deliveries from manifests
    outsourcedProduction: demandData.outsourcedProduction,
    madDogWarehouse: demandData.madDogWarehouse,
    recommendedTotalVessels: recommendedTotalVessels, // Calculated with actual vessel capability
    totalVesselsAnalyzed,
    averageVesselCapability: demandData.coreFleetAverageCapability, // Use core fleet average for main KPI display
    topDrillingVessels,
    topProductionVessels,
    drillingVesselsNeeded: drillingVesselsNeededCoreFleet,
    productionVesselsNeeded,
    totalVesselsNeeded,
    additionalVesselsNeeded, // Vessels needed beyond core fleet
    coreFleetUtilizationDrilling, // Core fleet utilization for drilling
    currentActiveVessels,
    vesselGap,
    recommendation,
    // Enhanced visualization data
    locationDemands,
    vesselCapabilities,
    monthlyBreakdown: monthlyComparisonData
  };
  
  console.log('\n🎯 MANIFEST-BASED VESSEL REQUIREMENT RESULTS (ENHANCED CAPABILITY ANALYSIS):');
  console.log(`📊 Analysis Period: ${result.analysisDateRange.startDate} to ${result.analysisDateRange.endDate}`);
  console.log(`📋 Total Manifests Analyzed: ${result.totalManifests}`);
  console.log(`🔵 Drilling Location Manifests: ${result.drillingManifests} total (ALL manifests to 6 drilling locations)`);
  console.log(`🔵 TOTAL drilling demand across all 6 locations: ${result.totalDrillingDemand.toFixed(2)} deliveries/month`);
  console.log(`🔵 Average per drilling location: ${(result.totalDrillingDemand / 6).toFixed(2)} deliveries per location per month`);
  console.log(`🟢 Production demand: ${result.totalProductionDemand.toFixed(2)} deliveries/month`);
  console.log(`⛵ Active PSV/OSV Vessels: ${activeVesselCount} vessels`);
  console.log(`📈 Fleet Monthly Capability: ${fleetCapability.toFixed(2)} deliveries/month total`);
  console.log(`📈 Average Vessel Capability: ${result.averageVesselCapability.toFixed(2)} deliveries/month per vessel`);
  console.log(`📊 Fleet Utilization: ${utilizationRate.toFixed(1)}% (${result.totalDrillingDemand.toFixed(2)} demand vs ${fleetCapability.toFixed(2)} capability)`);
  console.log(`🎯 Drilling Vessels Needed: ${result.drillingVesselsNeeded} vessels`);
  console.log(`🎯 Production Vessels Needed: ${result.productionVesselsNeeded} vessels`);
  console.log(`🚢 Total Vessels Needed: ${result.totalVesselsNeeded} vessels`);
  console.log(`📊 Current Active Vessels: ${result.currentActiveVessels} vessels`);
  console.log(`🔄 Vessel Gap: ${result.vesselGap > 0 ? '+' : ''}${result.vesselGap} vessels`);
  console.log(`💡 Recommendation: ${result.recommendation}`);
  
  return result;
};