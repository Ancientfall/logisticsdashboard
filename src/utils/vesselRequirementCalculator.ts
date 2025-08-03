/**
 * Vessel Requirement Calculator - Data-Driven Approach
 * 
 * Three-step methodology:
 * 1. Calculate monthly delivery demand by location (VesselManifests.xlsx)
 * 2. Calculate monthly delivery capability per vessel (VoyageList.xlsx)  
 * 3. Determine vessel requirement: demand ÷ capability = required vessels
 */

import { VoyageList, VesselManifest } from '../types';

// Analysis period: Jan 1 - Jun 30, 2025 (6 months)
const ANALYSIS_START_DATE = new Date('2025-01-01');
const ANALYSIS_END_DATE = new Date('2025-06-30');

// Vessel type filtering - only exclude specific FSV vessels
export const isPSVOrOSV = (vesselName: string): boolean => {
  const vessel = vesselName.toLowerCase();
  
  // Exclude only the specific FSV vessels you mentioned
  const excludedFSVs = [
    'fast goliath',
    'fast leopard', 
    'fast tiger',
    'fast server'
  ];
  
  // Check if this vessel is one of the excluded FSVs
  if (excludedFSVs.some(fsv => vessel.includes(fsv))) {
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
  // 1. Argos
  'Argos': 'Argos',
  'ARGOS': 'Argos',
  
  // 2. Atlantis
  'ATL': 'Atlantis',
  'AP': 'Atlantis', 
  'Atlantis': 'Atlantis',
  'Atlantis PQ': 'Atlantis',
  'ATLANTIS': 'Atlantis',
  
  // 3. Na Kika
  'NK': 'Na Kika',
  'Na Kika': 'Na Kika',
  'NaKika': 'Na Kika',
  'NA KIKA': 'Na Kika',
  
  // 4. Mad Dog (includes drilling and production)
  'MD': 'Mad Dog',
  'Mad Dog': 'Mad Dog',
  'Mad Dog Drilling': 'Mad Dog',
  'Mad Dog Prod': 'Mad Dog',
  'Mad Dog Production': 'Mad Dog',
  'MDD': 'Mad Dog',
  'MDP': 'Mad Dog',
  'MAD DOG': 'Mad Dog',
  
  // 5. Thunder Horse PDQ (includes drilling and production)
  'TH': 'Thunder Horse PDQ',
  'Thunder Horse': 'Thunder Horse PDQ',
  'Thunder Horse PDQ': 'Thunder Horse PDQ',
  'Thunder Horse Drilling': 'Thunder Horse PDQ',
  'Thunder Horse Prod': 'Thunder Horse PDQ',
  'Thunder Horse Production': 'Thunder Horse PDQ',
  'THD': 'Thunder Horse PDQ',
  'THP': 'Thunder Horse PDQ',
  'THUNDER HORSE': 'Thunder Horse PDQ',
  
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

// BP Offshore Locations - The 10 key locations for delivery requirement analysis
export const BP_OFFSHORE_LOCATIONS = [
  'Argos',
  'Atlantis', 
  'Na Kika',
  'Mad Dog',
  'Thunder Horse PDQ',
  'Ocean BlackLion',
  'Ocean Blackhornet', 
  'Deepwater Invictus',
  'Stena IceMAX',
  'Island Venture'
] as const;

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

/**
 * Step 1: Calculate delivery demand by location using VesselManifests.xlsx
 * Focus on the 10 key BP offshore locations to understand monthly delivery requirements
 * Each location's demand will be compared against total fleet capability
 */
export const calculateDeliveryDemand = (manifests: VesselManifest[], costAllocations?: any[]): DeliveryDemandResult => {
  console.log('📊 Step 1: Calculating delivery demand by location with cost allocation cross-reference...');
  
  // Filter manifests to analysis period
  const filteredManifests = manifests.filter(manifest => {
    if (!manifest.manifestDate) return false;
    const manifestDate = new Date(manifest.manifestDate);
    return manifestDate >= ANALYSIS_START_DATE && manifestDate <= ANALYSIS_END_DATE;
  });
  
  console.log(`📅 Filtered ${filteredManifests.length} manifests in analysis period`);
  
  // Debug: show some sample manifests
  console.log('🔍 Sample manifests:');
  filteredManifests.slice(0, 5).forEach((manifest, i) => {
    const rawLocation = manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || 'Unknown';
    const normalizedLocation = normalizeRigLocation(rawLocation);
    console.log(`${i + 1}. ${rawLocation} → ${normalizedLocation} (${manifest.manifestDate})`);
  });
  
  // Group by location and month
  const locationMonthCounts = new Map<string, Map<string, number>>();
  
  filteredManifests.forEach(manifest => {
    // Use offshore location, mapped location, or cost code location
    const rawLocation = manifest.offshoreLocation || manifest.mappedLocation || manifest.costCode || 'Unknown';
    const location = normalizeRigLocation(rawLocation);
    
    // Skip shore bases
    if (location.toLowerCase().includes('fourchon') || 
        location.toLowerCase().includes('port') ||
        location.toLowerCase().includes('galveston') ||
        location.toLowerCase().includes('houma')) {
      return;
    }
    
    // Only count deliveries to our 10 BP offshore locations
    if (!BP_OFFSHORE_LOCATIONS.includes(location as any)) {
      console.log(`⚠️ Skipping non-BP location: ${location} (raw: ${rawLocation})`);
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
  
  // Calculate individual location monthly demands with drilling vs production classification
  const allLocationMonthlyDemands: number[] = [];
  const drillingLocationDemands: number[] = [];
  const productionLocationDemands: number[] = [];
  const allMonthKeys = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  
  console.log(`🔍 Calculating monthly deliveries needed for each location each month with drilling/production classification:`);
  
  // Create a mapping of locations to their primary activity type based on cost allocation
  const locationActivityMapping = new Map<string, 'drilling' | 'production' | 'mixed'>();
  
  // If cost allocation data is available, use it to classify locations
  if (costAllocations && costAllocations.length > 0) {
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
    
    console.log(`📊 Location Activity Classification from Cost Allocation:`);
    locationActivityMapping.forEach((activity, location) => {
      console.log(`  ${location}: ${activity}`);
    });
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
  
  // Still create location demands array for detailed reporting
  const locationDemands: LocationDeliveryDemand[] = [];
  
  locationMonthCounts.forEach((monthCounts, location) => {
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
  
  // FIXED: Use the average per location per month, not the total sum
  console.log(`📊 Using average location monthly demand: ${averageLocationMonthlyDemand.toFixed(2)} deliveries per location per month`);
  
  return { 
    locationDemands, 
    totalOffshoreDemandPerMonth: averageLocationMonthlyDemand,
    averageDrillingDemand: averageDrillingDemand,
    averageProductionDemand: averageProductionDemand
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
    
    // Remove duplicates within this specific voyage only
    const uniqueOffshoreLocations = [...new Set(offshoreLocations.map(loc => normalizeRigLocation(loc)))];
    const voyageDeliveryCapability = uniqueOffshoreLocations.length;
    
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
  
  // Current fleet: Use the actual fleet size from latest month of data
  const currentVessels = currentFleetSize || vesselCapabilities.length;
  
  // Required vessels calculation using BP's specific formula with data-driven drilling vs production demand:
  // Step 1: Calculate total demand needed using real drilling vs production demand ratios from cost allocation analysis
  const drillingLocations = 4; // Active drilling locations
  const productionLocations = 5; // Active production locations
  
  // Use real demand data if available, otherwise fall back to estimated split
  const drillingDemandPerLocation = averageDrillingDemand || totalMonthlyDeliveryDemand;
  const productionDemandPerLocation = averageProductionDemand || (totalMonthlyDeliveryDemand * 0.5);
  
  const totalDrillingDemand = drillingDemandPerLocation * drillingLocations;
  const totalProductionDemand = productionDemandPerLocation * productionLocations;
  const operatorSharingReduction = 0.5; // Half vessel reduction for operator delivery to one location
  
  const totalDemandNeeded = totalDrillingDemand + totalProductionDemand - operatorSharingReduction;
  
  // Step 2: Calculate what our current baseline fleet can deliver
  const currentFleetCapability = currentVessels * averageVesselCapability;
  
  // Step 3: Calculate additional vessels needed beyond current fleet capability
  const additionalCapabilityNeeded = Math.max(0, totalDemandNeeded - currentFleetCapability);
  const additionalVesselsNeeded = averageVesselCapability > 0 ? 
    Math.ceil(additionalCapabilityNeeded / averageVesselCapability) : 0;
  
  // Step 4: Total recommended fleet = current fleet + additional vessels needed
  const requiredVessels = currentVessels + additionalVesselsNeeded;
  
  console.log(`📊 Drilling Demand: ${drillingDemandPerLocation.toFixed(2)} demand/month × ${drillingLocations} drilling locations = ${totalDrillingDemand.toFixed(2)}`);
  console.log(`📊 Production Demand: ${productionDemandPerLocation.toFixed(2)} demand/month × ${productionLocations} production locations = ${totalProductionDemand.toFixed(2)}`);
  console.log(`📊 Total Demand: ${totalDrillingDemand.toFixed(2)} + ${totalProductionDemand.toFixed(2)} - ${operatorSharingReduction} operator sharing = ${totalDemandNeeded.toFixed(2)} total demand needed`);
  console.log(`⛵ Current Fleet Capability: ${currentVessels} vessels × ${averageVesselCapability.toFixed(2)} capability = ${currentFleetCapability.toFixed(2)} deliveries/month`);
  console.log(`📈 Additional Capability Needed: ${totalDemandNeeded.toFixed(2)} - ${currentFleetCapability.toFixed(2)} = ${additionalCapabilityNeeded.toFixed(2)}`);
  console.log(`🎯 Additional Vessels Needed: ${additionalVesselsNeeded} vessels`);
  console.log(`🚢 Total Recommended Fleet: ${currentVessels} current + ${additionalVesselsNeeded} additional = ${requiredVessels} vessels`);
  
  console.log(`🚢 Current Fleet: ${currentVessels} OSV vessels (based on latest month activity in voyage data)`);
  
  // Utilization analysis
  const utilizationGap = requiredVessels - currentVessels;
  
  // Fleet utilization = total system demand vs fleet capacity
  // Total system demand = average demand per location × number of active locations
  const totalSystemDemand = totalMonthlyDeliveryDemand * locationDemands.length;
  const theoreticalFleetCapacity = currentVessels * averageVesselCapability;
  const utilizationPercentage = theoreticalFleetCapacity > 0 ? 
    (totalSystemDemand / theoreticalFleetCapacity) * 100 : 0;
  
  // Debug utilization calculation
  console.log(`🔍 UTILIZATION DEBUG:`);
  console.log(`   Average Demand Per Location: ${totalMonthlyDeliveryDemand}`);
  console.log(`   Number of Active Locations: ${locationDemands.length}`);
  console.log(`   Total System Demand: ${totalSystemDemand}`);
  console.log(`   Current Vessels: ${currentVessels}`);
  console.log(`   Average Vessel Capability: ${averageVesselCapability}`);
  console.log(`   Theoretical Fleet Capacity: ${theoreticalFleetCapacity}`);
  console.log(`   Utilization %: ${utilizationPercentage.toFixed(2)}%`);
  console.log(`   Logic Check: If total_demand(${totalSystemDemand}) > capacity(${theoreticalFleetCapacity}), we're over-utilized`);
  
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

  const result: VesselRequirementResult = {
    analysisDateRange: {
      startDate: ANALYSIS_START_DATE.toISOString().split('T')[0],
      endDate: ANALYSIS_END_DATE.toISOString().split('T')[0],
      monthsCovered: 6
    },
    totalMonthlyDeliveryDemand: Number(totalMonthlyDeliveryDemand.toFixed(2)),
    locationDemands,
    averageDrillingDemand: averageDrillingDemand || 0,
    averageProductionDemand: averageProductionDemand || 0,
    averageVesselCapability: Number(averageVesselCapability.toFixed(2)),
    totalActiveVessels: currentVessels,
    vesselCapabilities,
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
 * Main function: Calculate vessel requirements using the three-step methodology
 */
export const calculateVesselRequirements = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  costAllocations?: any[]
): VesselRequirementResult => {
  console.log('🚀 Starting vessel requirement calculation...');
  console.log(`📅 Analysis Period: Jan 1 - Jun 30, 2025 (6 months)`);
  
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
  
  console.log('✅ Vessel requirement calculation completed');
  return result;
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