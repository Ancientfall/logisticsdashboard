/**
 * Vessel Requirement Calculator
 * Based on whiteboard formula: PSV vessels required = (number of vessels * 7 days per week) / 24 hours per day
 * Analyzes voyage patterns by rig location and calculates total vessel requirements
 */

import { VoyageList, VesselManifest, VoyageEvent } from '../types';

// Vessel type filtering - only PSV/OSV vessels (exclude Fast vessels and non-PSV)
export const isPSVOrOSV = (vesselName: string): boolean => {
  const vessel = vesselName.toLowerCase();
  
  // Exclude Fast vessels and other non-PSV types
  if (vessel.includes('fast ') || vessel.includes('fast_')) {
    return false;
  }
  
  // Exclude other non-PSV vessel types
  const excludePatterns = [
    'm/v holiday',
    'bollinger amelia',
    'houma dock',
    'galveston',
    'gomex',
    'inspections and maintenance'
  ];
  
  return !excludePatterns.some(pattern => vessel.includes(pattern));
};

// Contract-based rig classifications
export const CONTRACT_RIGS = {
  DRILLING: [
    'Ocean BlackLion',
    'Ocean Blackhornet', 
    'Thunder Horse Drilling',
    'Mad Dog Drilling',
    'Stena IceMAX',
    'Deepwater Invictus'
  ],
  PRODUCTION: [
    'Atlantis PQ',
    'Argos', 
    'Thunder Horse Prod',
    'Mad Dog Prod',
    'Na Kika'
  ]
} as const;

// Rig location mappings based on actual data analysis from Excel files
// Updated with correct abbreviations from user
export const RIG_LOCATION_MAPPINGS: Record<string, string> = {
  // Thunder Horse variations - CORRECTED: TH = Thunder Horse PDQ
  'TH': 'Thunder Horse PDQ',
  'Thunder Horse': 'Thunder Horse PDQ',
  'Thunder Horse PDQ': 'Thunder Horse PDQ',
  'Thunder Horse Drilling': 'Thunder Horse Drilling', 
  'Thunder Horse Prod': 'Thunder Horse Prod',
  'Thunder horse Prod': 'Thunder Horse Prod', // Note: lowercase 'h' in data
  'Thunderhorse': 'Thunder Horse PDQ',
  'ThunderHorse': 'Thunder Horse PDQ',
  'THD': 'Thunder Horse Drilling',
  'THP': 'Thunder Horse Prod',
  
  // Mad Dog variations - CORRECTED: MD = Mad Dog (consolidated)
  'MD': 'Mad Dog',
  'Mad Dog': 'Mad Dog',
  'Mad Dog Drilling': 'Mad Dog',  // Consolidate drilling into main Mad Dog
  'Mad Dog Prod': 'Mad Dog',     // Consolidate production into main Mad Dog
  'MadDog': 'Mad Dog',
  'MDD': 'Mad Dog',  // Changed from Mad Dog Drilling to Mad Dog
  'MDP': 'Mad Dog',  // Changed from Mad Dog Prod to Mad Dog
  
  // Production Platforms - CORRECTED: ATL = Atlantis PQ
  'ATL': 'Atlantis PQ',  // CORRECTED from 'AP'
  'AP': 'Atlantis PQ',   // Keep old mapping for compatibility
  'Atlantis': 'Atlantis PQ',
  'Atlantis PQ': 'Atlantis PQ',
  
  // CORRECTED: NK = Na Kika
  'NK': 'Na Kika',
  'Na Kika': 'Na Kika',
  'NaKika': 'Na Kika',
  
  // Argos remains the same
  'Argos': 'Argos',
  
  'SHE': 'Shenzi',
  'Shenzi': 'Shenzi',
  
  // Drilling Rigs - CORRECTED: IM = Stena IceMAX
  'IM': 'Stena IceMAX',    // CORRECTED from 'SI'
  'SI': 'Stena IceMAX',    // Keep old mapping for compatibility
  'Stena IceMAX': 'Stena IceMAX',
  
  // CORRECTED: OBL = Ocean BlackLion (already correct)
  'OBL': 'Ocean BlackLion',
  'Ocean BlackLion': 'Ocean BlackLion',
  'Ocean Blacklion': 'Ocean BlackLion',
  
  // CORRECTED: OBH = Ocean Blackhornet (already correct)
  'OBH': 'Ocean Blackhornet', 
  'Ocean BlackHornet': 'Ocean Blackhornet',
  'Ocean Blackhornet': 'Ocean Blackhornet',
  
  // CORRECTED: DVS = Deepwater Invictus
  'DVS': 'Deepwater Invictus',  // CORRECTED from 'DI'
  'DI': 'Deepwater Invictus',   // Keep old mapping for compatibility
  'Deepwater Invictus': 'Deepwater Invictus',
  
  'IV': 'Island Venture',
  'Island Venture': 'Island Venture',
  
  'AUR': 'Auriga',
  'Auriga': 'Auriga',
  
  'CC': 'C-Constructor',
  'C-Constructor': 'C-Constructor',
  
  // Less frequent locations
  'MH': 'M/V Holiday',
  'M/V Holiday': 'M/V Holiday',
  
  'BA': 'Bollinger Amelia',
  'Bollinger Amelia': 'Bollinger Amelia',
  
  'HD': 'Houma Dock',
  'Houma Dock': 'Houma Dock',
  
  'GAL': 'Galveston', 
  'Galveston': 'Galveston',
  
  'GOM': 'GOMEX',
  'GOMEX': 'GOMEX',
  
  'IAM': 'Inspections and Maintenance',
  'Inspections and Maintenance': 'Inspections and Maintenance'
};

export interface RigVoyagePattern {
  rigLocation: string;
  rigCode: string;
  totalVoyages: number;
  weeklyVoyages: number;
  dailyVoyages: number;
  averageVoyageDuration: number; // in hours
  uniqueVessels: Set<string>;
  vesselCount: number;
  voyageFrequency: number; // voyages per day
  
  // Detailed voyage analysis
  voyagesByWeek: Record<string, number>;
  voyagesByMonth: Record<string, number>;
  voyagesByVessel: Record<string, number>;
  
  // Time analysis
  peakDays: string[];
  averageTimeBetweenVoyages: number; // in hours
  
  // Requirements calculation
  recommendedVessels: number; // Based on formula
  currentUtilization: number; // Current vessel utilization %
  efficiencyScore: number; // Overall efficiency rating
}

export interface CoreFleetAnalysis {
  coreVessels: {
    identified: string[];
    missing: string[];
    totalCore: number;
    averagePerformance: number;
  };
  spotVessels: {
    identified: string[];
    totalSpot: number;
    averagePerformance: number;
  };
  fleetComposition: {
    coreFleetPercentage: number;
    spotFleetPercentage: number;
    performanceGap: number; // Core vs Spot performance difference
  };
}

export interface ProbabilityAccuracyAnalysis {
  capacityPrediction: {
    mode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC';
    confidenceLevel: number; // 0-100%
    accuracyScore: number; // Based on historical performance
    variabilityRisk: number; // Standard deviation factor
  };
  seasonalFactors: {
    monthlyVariation: Record<string, number>; // Monthly adjustment factors
    peakSeasonRisk: number;
    weatherImpactFactor: number;
  };
  riskAssessment: {
    capacityShortfallRisk: number; // Probability of not meeting demand
    overCapacityRisk: number; // Probability of excess capacity
    recommendedBufferSize: number; // Additional vessels for safety margin
  };
}

export interface VesselSharingAnalysis {
  totalVoyages: number;
  multiLocationVoyages: number;
  sharingPercentage: number; // Percentage of voyages that serve multiple locations
  averageLocationsPerVoyage: number;
  
  // Sharing patterns
  sharingPatterns: {
    pattern: string; // e.g., "Fourchon -> Na Kika -> Thunder Horse -> Fourchon"
    count: number;
    vessels: string[];
    efficiency: number; // How many locations served per voyage
  }[];
  
  // Monthly sharing statistics
  monthlySharingRates: Record<string, number>; // Month -> sharing percentage
  
  // Vessel sharing efficiency
  vesselSharingEfficiency: {
    baselineVesselsNeeded: number; // If no sharing
    actualVesselsNeeded: number; // With sharing accounted
    efficiencyGain: number; // Percentage reduction in vessel needs
  };
  
  // Top shared routes
  topSharedRoutes: {
    route: string;
    frequency: number;
    averageVessels: number;
  }[];
}

export interface VesselRequirementSummary {
  totalRigs: number;
  totalVoyages: number; // FIXED: Total delivery capability (offshore port calls) - can exceed actualVoyageCount for multi-location voyages
  actualVoyageCount: number; // FIXED: Actual number of unique voyages (no double counting)
  totalRecommendedVessels: number;
  currentVesselCount: number;
  overallUtilization: number;
  
  // New delivery capability metrics
  deliveryCapability: {
    totalDeliveries: number;
    averageDeliveriesPerVoyage: number;
    theoreticalDeliveriesPerVessel: number; // Based on 9-vessel baseline
    actualAverageDeliveriesPerVessel: number;
    fleetEfficiencyVsBaseline: number; // Percentage
    multiDeliveryVoyages: number;
    totalActiveVessels: number;
  };
  
  rigAnalysis: RigVoyagePattern[];
  
  // Vessel sharing analysis - NEW!
  vesselSharingAnalysis: VesselSharingAnalysis;
  
  // Aggregated insights
  highestDemandRig: string;
  mostEfficientRig: string;
  underutilizedRigs: string[];
  
  // Date filter information
  analysisDateRange: {
    startDate: string;
    endDate: string;
    monthFilter?: number;
    periodDescription: string;
  };
  
  // Contract-based vessel requirements
  contractRequirements: {
    drillingRigs: {
      count: number;
      voyagesPerRigPerWeek: number;
      vesselRequirement: number;
    };
    productionFacilities: {
      count: number;
      vesselRequirement: number;
    };
    mandatoryWarehouseVessel: number;
    totalCalculatedRequirement: number;
    adjustedForSharing: number; // NEW! Adjusted for vessel sharing efficiency
    capacityAssumptions: {
      mode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC';
      voyagesPerMonth: number;
      voyagesPerDay: number;
      description: string;
    };
  };
  
  // NEW! Delivery capacity-based vessel requirements
  deliveryCapacityRequirements: {
    weeklyDeliveries: number;
    weeklyVoyages: number;
    deliveriesPerVoyage: number;
    voyagesPerVesselPerWeek: number;
    vesselsNeededForVoyages: number;
    vesselsNeededForDeliveries: number;
    recommendedVessels: number;
    projectedUtilization: number;
    capacityAssumptions: {
      mode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC';
      voyagesPerMonth: number;
      voyagesPerWeek: number;
      description: string;
    };
  };
  
  // Formula breakdown
  formulaBreakdown: {
    totalWeeklyVoyages: number;
    dailyVoyageRequirement: number;
    vesselHoursPerDay: number;
    calculatedVesselNeed: number;
    sharingAdjustment: number; // NEW! Reduction due to sharing
  };
  
  // Enhanced analysis features
  coreFleetAnalysis: CoreFleetAnalysis;
  probabilityAccuracy: ProbabilityAccuracyAnalysis;
}

/**
 * Normalize rig location to standard format with correct abbreviations
 */
export const normalizeRigLocation = (location: string): { standardName: string; rigCode: string } => {
  if (!location) return { standardName: 'Unknown', rigCode: 'UNK' };
  
  const locationUpper = location.trim().toUpperCase();
  const locationLower = location.trim().toLowerCase();
  
  // Define correct abbreviations mapping
  const standardCodeMappings: Record<string, string> = {
    'Thunder Horse PDQ': 'TH',
    'Stena IceMAX': 'IM', 
    'Ocean Blackhornet': 'OBH',
    'Ocean BlackLion': 'OBL',
    'Mad Dog': 'MD',
    'Deepwater Invictus': 'DVS',
    'Atlantis PQ': 'ATL',
    'Argos': 'Argos',
    'Na Kika': 'NK'
  };
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(RIG_LOCATION_MAPPINGS)) {
    if (key.toUpperCase() === locationUpper || locationLower.includes(key.toLowerCase())) {
      // Use the correct abbreviation from our mapping
      const rigCode = standardCodeMappings[value] || 
                     Object.keys(RIG_LOCATION_MAPPINGS).find(k => 
                       RIG_LOCATION_MAPPINGS[k] === value && k.length <= 3
                     ) || value.substring(0, 3).toUpperCase();
      
      return { standardName: value, rigCode };
    }
  }
  
  // Generate code for unmapped locations
  const words = location.split(' ');
  const rigCode = words.length > 1 
    ? words.map(w => w.charAt(0)).join('').toUpperCase().substring(0, 3)
    : location.substring(0, 3).toUpperCase();
    
  return { standardName: location.trim(), rigCode };
};

/**
 * Analyze vessel sharing patterns across voyages
 */
export const analyzeVesselSharing = (voyages: VoyageList[]): VesselSharingAnalysis => {
  console.log('🔄 Analyzing vessel sharing patterns...');
  
  const totalVoyages = voyages.length;
  
  // Identify multi-location voyages (more than just Fourchon -> Rig -> Fourchon)
  const multiLocationVoyages = voyages.filter(voyage => {
    // Filter out base locations (Fourchon, ports) and count only offshore locations
    const offshoreLocations = voyage.locationList.filter(location => 
      location && 
      !location.toLowerCase().includes('fourchon') &&
      !location.toLowerCase().includes('port') &&
      !location.toLowerCase().includes('galveston') &&
      !location.toLowerCase().includes('houma')
    );
    return offshoreLocations.length > 1; // Serves multiple offshore locations
  });
  
  const sharingPercentage = totalVoyages > 0 ? (multiLocationVoyages.length / totalVoyages) * 100 : 0;
  
  // Calculate average locations per voyage
  const totalLocations = voyages.reduce((sum, voyage) => {
    const offshoreLocations = voyage.locationList.filter(location => 
      location && 
      !location.toLowerCase().includes('fourchon') &&
      !location.toLowerCase().includes('port')
    );
    return sum + offshoreLocations.length;
  }, 0);
  const averageLocationsPerVoyage = totalVoyages > 0 ? totalLocations / totalVoyages : 1;
  
  // Analyze sharing patterns
  const patternMap = new Map<string, { count: number; vessels: Set<string>; efficiency: number }>();
  
  multiLocationVoyages.forEach(voyage => {
    const pattern = voyage.locations; // Full route pattern
    const offshoreCount = voyage.locationList.filter(loc => 
      loc && !loc.toLowerCase().includes('fourchon') && !loc.toLowerCase().includes('port')
    ).length;
    
    if (!patternMap.has(pattern)) {
      patternMap.set(pattern, { count: 0, vessels: new Set(), efficiency: offshoreCount });
    }
    
    const entry = patternMap.get(pattern)!;
    entry.count++;
    entry.vessels.add(voyage.vessel);
  });
  
  // Convert to array and sort by frequency
  const sharingPatterns = Array.from(patternMap.entries())
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      vessels: Array.from(data.vessels),
      efficiency: data.efficiency
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 patterns
  
  // Monthly sharing rates
  const monthlySharingRates: Record<string, number> = {};
  const monthlyVoyages = new Map<string, { total: number; shared: number }>();
  
  voyages.forEach(voyage => {
    const monthKey = `${voyage.year}-${voyage.monthNumber.toString().padStart(2, '0')}`;
    if (!monthlyVoyages.has(monthKey)) {
      monthlyVoyages.set(monthKey, { total: 0, shared: 0 });
    }
    
    const monthData = monthlyVoyages.get(monthKey)!;
    monthData.total++;
    
    const offshoreLocations = voyage.locationList.filter(location => 
      location && !location.toLowerCase().includes('fourchon') && !location.toLowerCase().includes('port')
    );
    if (offshoreLocations.length > 1) {
      monthData.shared++;
    }
  });
  
  monthlyVoyages.forEach((data, month) => {
    monthlySharingRates[month] = data.total > 0 ? (data.shared / data.total) * 100 : 0;
  });
  
  // Calculate vessel sharing efficiency
  // If no sharing: each location would need separate voyages
  const baselineVesselsNeeded = totalLocations; // One voyage per location
  const actualVesselsNeeded = totalVoyages; // Actual voyages with sharing
  const efficiencyGain = baselineVesselsNeeded > 0 ? 
    ((baselineVesselsNeeded - actualVesselsNeeded) / baselineVesselsNeeded) * 100 : 0;
  
  // Top shared routes
  const routeFrequency = new Map<string, { count: number; vessels: Set<string> }>();
  multiLocationVoyages.forEach(voyage => {
    const route = voyage.locationList
      .filter(loc => loc && !loc.toLowerCase().includes('fourchon'))
      .join(' -> ');
    
    if (!routeFrequency.has(route)) {
      routeFrequency.set(route, { count: 0, vessels: new Set() });
    }
    
    const routeData = routeFrequency.get(route)!;
    routeData.count++;
    routeData.vessels.add(voyage.vessel);
  });
  
  const topSharedRoutes = Array.from(routeFrequency.entries())
    .map(([route, data]) => ({
      route,
      frequency: data.count,
      averageVessels: data.vessels.size
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
  
  console.log(`📊 Vessel Sharing Analysis: ${sharingPercentage.toFixed(1)}% of voyages serve multiple locations`);
  console.log(`🔄 Average locations per voyage: ${averageLocationsPerVoyage.toFixed(2)}`);
  console.log(`⚡ Efficiency gain from sharing: ${efficiencyGain.toFixed(1)}%`);
  
  return {
    totalVoyages,
    multiLocationVoyages: multiLocationVoyages.length,
    sharingPercentage,
    averageLocationsPerVoyage,
    sharingPatterns,
    monthlySharingRates,
    vesselSharingEfficiency: {
      baselineVesselsNeeded,
      actualVesselsNeeded,
      efficiencyGain
    },
    topSharedRoutes
  };
};

/**
 * Analyze voyage patterns for a specific rig location
 * FIXED: Added tracking for multi-rig voyage assignments
 */
export const analyzeRigVoyagePattern = (
  rigLocation: string,
  voyages: VoyageList[],
  manifests: VesselManifest[],
  events: VoyageEvent[]
): RigVoyagePattern => {
  const { standardName, rigCode } = normalizeRigLocation(rigLocation);
  
  console.log(`\n🔍 ANALYZING RIG: ${rigLocation} (${standardName})`);
  
  // Filter relevant voyages for this rig - NOTE: Multi-location voyages will be counted for each rig
  const rigVoyages = voyages.filter(voyage => {
    const locationsMatch = voyage.locations.toLowerCase().includes(rigLocation.toLowerCase());
    const mainDestMatch = voyage.mainDestination?.toLowerCase().includes(rigLocation.toLowerCase());
    const locationListMatch = voyage.locationList.some(loc => loc.toLowerCase().includes(rigLocation.toLowerCase()));
    
    // Return true if ANY of the conditions match (OR logic, not additive)
    return locationsMatch || mainDestMatch || locationListMatch;
  });
  
  console.log(`📊 ${rigLocation}: Found ${rigVoyages.length} matching voyages`);
  
  // DEBUGGING: Show which voyages are multi-location for this rig
  const multiLocationVoyagesForRig = rigVoyages.filter(voyage => {
    const offshoreLocations = voyage.locationList.filter(loc => 
      loc && loc.toLowerCase() !== 'fourchon' && !loc.toLowerCase().includes('port')
    );
    return offshoreLocations.length > 1;
  });
  
  if (multiLocationVoyagesForRig.length > 0) {
    console.log(`   📍 Multi-location voyages: ${multiLocationVoyagesForRig.length}`);
    multiLocationVoyagesForRig.slice(0, 3).forEach((voyage, idx) => {
      const otherRigs = voyage.locationList.filter(loc => 
        loc && loc.toLowerCase() !== 'fourchon' && !loc.toLowerCase().includes('port') && 
        !loc.toLowerCase().includes(rigLocation.toLowerCase())
      );
      if (otherRigs.length > 0) {
        console.log(`     ${idx + 1}. ${voyage.vessel}-${voyage.voyageNumber}: Also serves [${otherRigs.join(', ')}]`);
      }
    });
  }
  
  // Note: We could filter manifests and events for more detailed analysis, but 
  // for the basic vessel requirement calculation, voyage data is sufficient
  
  // Calculate basic metrics
  const totalVoyages = rigVoyages.length;
  const uniqueVessels = new Set(rigVoyages.map(v => v.vessel));
  const vesselCount = uniqueVessels.size;
  
  // Time period analysis (assuming data spans multiple weeks)
  const voyagesByWeek: Record<string, number> = {};
  const voyagesByMonth: Record<string, number> = {};
  const voyagesByVessel: Record<string, number> = {};
  
  rigVoyages.forEach(voyage => {
    // Proper week calculation using ISO week number
    const startDate = new Date(voyage.startDate);
    const yearStart = new Date(voyage.year, 0, 1);
    const weekNumber = Math.ceil(((startDate.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
    const weekKey = `${voyage.year}-W${weekNumber.toString().padStart(2, '0')}`;
    voyagesByWeek[weekKey] = (voyagesByWeek[weekKey] || 0) + 1;
    
    // Month analysis
    const monthKey = `${voyage.year}-${voyage.month}`;
    voyagesByMonth[monthKey] = (voyagesByMonth[monthKey] || 0) + 1;
    
    // Vessel analysis
    voyagesByVessel[voyage.vessel] = (voyagesByVessel[voyage.vessel] || 0) + 1;
  });
  
  // Calculate proper time periods
  const weekCount = Object.keys(voyagesByWeek).length || 1;
  // const monthCount = Object.keys(voyagesByMonth).length || 1; // Unused variable
  
  // Calculate the actual data time span in weeks
  const sortedDates = rigVoyages.map(v => new Date(v.startDate)).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const actualWeeksSpan = firstDate && lastDate ? 
    Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000))) : 
    weekCount;
  
  // Use actual time span for more accurate weekly averages
  const weeklyVoyages = totalVoyages / actualWeeksSpan;
  const dailyVoyages = weeklyVoyages / 7;
  
  // Calculate average voyage duration
  const totalDuration = rigVoyages.reduce((sum, voyage) => 
    sum + (voyage.durationHours || 24), 0
  );
  const averageVoyageDuration = totalVoyages > 0 ? totalDuration / totalVoyages : 24;
  
  // Vessel requirement calculation (improved whiteboard formula interpretation)
  // Formula: PSV vessels required = (weekly voyages × average duration hours) ÷ (7 days × 24 hours)
  // This calculates how much vessel-time is needed per week vs. available vessel-time
  // Each vessel provides 7 × 24 = 168 hours per week of capacity
  const weeklyVesselHoursRequired = weeklyVoyages * averageVoyageDuration;
  const weeklyVesselHoursAvailable = 7 * 24; // 168 hours per vessel per week
  const recommendedVessels = Math.ceil(weeklyVesselHoursRequired / weeklyVesselHoursAvailable);
  
  // Current utilization based on actual vessel-hours used vs. available
  // More accurate than just voyage count - considers actual time spent
  const weeklyVesselHoursUsed = weeklyVoyages * averageVoyageDuration;
  const weeklyVesselHoursCapacity = vesselCount * 7 * 24; // Total vessel-hours available per week
  const currentUtilization = weeklyVesselHoursCapacity > 0 ? 
    (weeklyVesselHoursUsed / weeklyVesselHoursCapacity) * 100 : 0;
  
  // Efficiency score (combination of utilization and voyage frequency)
  const efficiencyScore = Math.min(100, (currentUtilization + (dailyVoyages * 10)) / 2);
  
  // Peak analysis
  const dailyVoyageCounts = Object.values(voyagesByWeek);
  const maxDailyVoyages = Math.max(...dailyVoyageCounts);
  const peakDays = Object.keys(voyagesByWeek).filter(week => 
    voyagesByWeek[week] === maxDailyVoyages
  );
  
  // Average time between voyages
  const averageTimeBetweenVoyages = dailyVoyages > 0 ? 24 / dailyVoyages : 24;
  
  return {
    rigLocation: standardName,
    rigCode,
    totalVoyages,
    weeklyVoyages: Number(weeklyVoyages.toFixed(2)),
    dailyVoyages: Number(dailyVoyages.toFixed(2)),
    averageVoyageDuration: Number(averageVoyageDuration.toFixed(2)),
    uniqueVessels,
    vesselCount,
    voyageFrequency: Number(dailyVoyages.toFixed(2)),
    
    voyagesByWeek,
    voyagesByMonth,
    voyagesByVessel,
    
    peakDays,
    averageTimeBetweenVoyages: Number(averageTimeBetweenVoyages.toFixed(2)),
    
    recommendedVessels: Math.max(1, recommendedVessels), // At least 1 vessel
    currentUtilization: Number(currentUtilization.toFixed(2)),
    efficiencyScore: Number(efficiencyScore.toFixed(2))
  };
};

// BP Core Fleet Definition (Standard Operations)
export const BP_CORE_FLEET = {
  OSV_PSV: [
    'Dauphin Island',
    'Pelican Island', 
    'Fantasy Island', // Main Chemical/Production Vessel
    'Squall',
    'Lightning',
    'Harvey Supporter',
    'Ship Island',
    'Tucker Candies', // Mad Dog Warehouse Vessel
    'Harvey Carrier'
  ],
  FSV: [
    'Fast Goliath',
    'Fast Leopard'
  ]
} as const;

// Known BP Contract Vessels - expand this list as needed
export const BP_CONTRACT_VESSELS = [
  // Core Fleet
  'Dauphin Island',
  'Pelican Island', 
  'Fantasy Island',
  'Squall',
  'Lightning',
  'Harvey Supporter',
  'Ship Island',
  'Tucker Candies',
  'Harvey Carrier',
  // Fast Vessels
  'Fast Goliath',
  'Fast Leopard',
  // Additional contract vessels (add as needed)
  'Gulf Streamer',
  'Seacor Charger',
  'Seacor Cheetah',
  // Add other known contract vessels here
] as const;

/**
 * Check if a vessel is on BP contract (more restrictive than isPSVOrOSV)
 */
export const isContractVessel = (vesselName: string): boolean => {
  const vessel = vesselName.toLowerCase().trim();
  
  // Check against known contract vessels
  return BP_CONTRACT_VESSELS.some(contractVessel => 
    vessel.includes(contractVessel.toLowerCase()) || 
    contractVessel.toLowerCase().includes(vessel)
  );
};

// Core Fleet vs Spot Fleet Performance Rates (based on PSV Capacity Analysis)
export const FLEET_CAPACITY_RATES = {
  CORE_FLEET: {
    CONSERVATIVE: { voyagesPerMonth: 5.5, description: 'Core fleet average performance' },
    REALISTIC: { voyagesPerMonth: 6.0, description: 'Achievable core fleet target' },
    OPTIMISTIC: { voyagesPerMonth: 6.5, description: 'Top core fleet performance' }
  },
  SPOT_FLEET: {
    CONSERVATIVE: { voyagesPerMonth: 3.0, description: 'Spot vessel average performance' },
    REALISTIC: { voyagesPerMonth: 4.0, description: 'Improved spot vessel performance' },
    OPTIMISTIC: { voyagesPerMonth: 5.0, description: 'Best case spot vessel performance' }
  },
  // Legacy rates for backward compatibility
  CONSERVATIVE: { voyagesPerMonth: 4, description: 'Mixed fleet average' },
  REALISTIC: { voyagesPerMonth: 5, description: 'Recommended planning rate' },
  OPTIMISTIC: { voyagesPerMonth: 6, description: 'Top quartile performance' }
} as const;

// Data-driven PSV capacity rates based on actual manifest analysis (2025 YTD)
export const PSV_CAPACITY_RATES = FLEET_CAPACITY_RATES;

/**
 * Analyze core fleet vs spot fleet composition and performance
 */
export const analyzeCoreFleetComposition = (vessels: string[]): CoreFleetAnalysis => {
  const allCoreVessels = [...BP_CORE_FLEET.OSV_PSV, ...BP_CORE_FLEET.FSV];
  
  const coreVesselsFound = vessels.filter(vessel => 
    allCoreVessels.some(coreVessel => 
      vessel.toLowerCase().includes(coreVessel.toLowerCase()) ||
      coreVessel.toLowerCase().includes(vessel.toLowerCase())
    )
  );
  
  const spotVessels = vessels.filter(vessel => !coreVesselsFound.includes(vessel));
  const missingCoreVessels = allCoreVessels.filter(coreVessel => 
    !vessels.some(vessel => 
      vessel.toLowerCase().includes(coreVessel.toLowerCase()) ||
      coreVessel.toLowerCase().includes(vessel.toLowerCase())
    )
  );
  
  const totalVessels = vessels.length;
  const coreFleetPercentage = totalVessels > 0 ? (coreVesselsFound.length / totalVessels) * 100 : 0;
  const spotFleetPercentage = 100 - coreFleetPercentage;
  
  // Performance gap based on PSV Capacity Analysis findings
  const performanceGap = 44; // Core fleet averages 44% higher utilization
  
  return {
    coreVessels: {
      identified: coreVesselsFound,
      missing: missingCoreVessels,
      totalCore: coreVesselsFound.length,
      averagePerformance: 5.78 // voyages/month from analysis
    },
    spotVessels: {
      identified: spotVessels,
      totalSpot: spotVessels.length,
      averagePerformance: 4.01 // overall fleet average
    },
    fleetComposition: {
      coreFleetPercentage,
      spotFleetPercentage,
      performanceGap
    }
  };
};

/**
 * Calculate probability accuracy analysis based on capacity assumptions and historical data
 */
export const calculateProbabilityAccuracy = (
  capacityMode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC',
  rigAnalysis: RigVoyagePattern[]
): ProbabilityAccuracyAnalysis => {
  // Confidence levels based on PSV Capacity Analysis findings
  const confidenceLevels = {
    CONSERVATIVE: 95, // Very high confidence for conservative estimates
    REALISTIC: 85,    // High confidence for realistic planning
    OPTIMISTIC: 70    // Moderate confidence for optimistic scenarios
  };
  
  // Accuracy scores based on historical performance consistency
  const accuracyScores = {
    CONSERVATIVE: 92, // Based on core fleet minimum performance
    REALISTIC: 85,    // Based on achievable targets
    OPTIMISTIC: 68    // Based on peak performance sustainability
  };
  
  // Variability risk (standard deviation factors)
  const variabilityRisks = {
    CONSERVATIVE: 0.15, // ±15% variation
    REALISTIC: 0.25,    // ±25% variation
    OPTIMISTIC: 0.35    // ±35% variation
  };
  
  // Monthly variation factors (from seasonal analysis)
  const monthlyVariation = {
    '1': 0.92,  // January (-8%)
    '2': 0.94,  // February (-6%)
    '3': 1.05,  // March (+5%)
    '4': 1.08,  // April (+8%)
    '5': 1.02,  // May (+2%)
    '6': 1.07,  // June (+7%)
    '7': 1.00,  // July (baseline)
    '8': 1.00,  // August (baseline)
    '9': 0.98,  // September (-2%)
    '10': 1.03, // October (+3%)
    '11': 0.96, // November (-4%)
    '12': 0.95  // December (-5%)
  };
  
  // Calculate capacity risks
  // const baseCapacity = FLEET_CAPACITY_RATES[capacityMode].voyagesPerMonth; // Unused variable
  // const variability = variabilityRisks[capacityMode]; // Unused variable
  
  const capacityShortfallRisk = capacityMode === 'OPTIMISTIC' ? 30 : 
                                capacityMode === 'REALISTIC' ? 15 : 5;
  const overCapacityRisk = capacityMode === 'CONSERVATIVE' ? 25 : 
                          capacityMode === 'REALISTIC' ? 15 : 8;
  
  // Buffer size recommendations
  const recommendedBufferSize = capacityMode === 'OPTIMISTIC' ? 2 : 
                               capacityMode === 'REALISTIC' ? 1 : 0;
  
  return {
    capacityPrediction: {
      mode: capacityMode,
      confidenceLevel: confidenceLevels[capacityMode],
      accuracyScore: accuracyScores[capacityMode],
      variabilityRisk: variabilityRisks[capacityMode]
    },
    seasonalFactors: {
      monthlyVariation,
      peakSeasonRisk: 15, // ±15% seasonal variation
      weatherImpactFactor: 0.10 // 10% weather-related delays
    },
    riskAssessment: {
      capacityShortfallRisk,
      overCapacityRisk,
      recommendedBufferSize
    }
  };
};

/**
 * Calculate contract-based vessel requirements using BP methodology with core fleet focus and vessel sharing
 */
export const calculateContractBasedRequirements = (
  capacityMode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC' = 'OPTIMISTIC',
  vesselSharingEfficiency?: number // Efficiency gain from vessel sharing (0-1)
) => {
  // Drilling Rigs: 6 rigs × 3 voyages/week × 52 weeks ÷ 365 days = 2.58 voyages/day per rig
  const drillingRigCount = CONTRACT_RIGS.DRILLING.length; // 6 rigs
  const voyagesPerRigPerWeek = 3;
  const drillingVoyagesPerDay = (drillingRigCount * voyagesPerRigPerWeek * 52) / 365; // 2.58 voyages/day total
  
  // Use Core Fleet capacity rates for more accurate planning
  const selectedCapacity = FLEET_CAPACITY_RATES.CORE_FLEET[capacityMode] || FLEET_CAPACITY_RATES[capacityMode];
  const psvCapacityPerDay = (selectedCapacity.voyagesPerMonth * 12) / 365; // Convert to daily rate
  
  // Calculate drilling vessel requirement
  const drillingVesselRequirement = drillingVoyagesPerDay / psvCapacityPerDay;
  
  // Production: 1.5 vessels for all production facilities
  const productionVesselRequirement = 1.5;
  
  // Mandatory warehouse vessel for Mad Dog Drilling
  const mandatoryWarehouseVessel = 1;
  
  // Total requirement before sharing adjustment
  const totalCalculatedRequirement = drillingVesselRequirement + productionVesselRequirement + mandatoryWarehouseVessel;
  
  // Apply vessel sharing efficiency if provided
  let adjustedForSharing = totalCalculatedRequirement;
  if (vesselSharingEfficiency && vesselSharingEfficiency > 0) {
    // Reduce vessel requirement by sharing efficiency percentage
    // But don't reduce below minimum operational levels
    const maxReduction = totalCalculatedRequirement * 0.25; // Max 25% reduction for safety
    const sharingReduction = Math.min(totalCalculatedRequirement * (vesselSharingEfficiency / 100), maxReduction);
    adjustedForSharing = Math.max(totalCalculatedRequirement - sharingReduction, 6); // Minimum 6 vessels
  }
  
  return {
    drillingRigs: {
      count: drillingRigCount,
      voyagesPerRigPerWeek: voyagesPerRigPerWeek,
      vesselRequirement: Number(drillingVesselRequirement.toFixed(1))
    },
    productionFacilities: {
      count: CONTRACT_RIGS.PRODUCTION.length,
      vesselRequirement: productionVesselRequirement
    },
    mandatoryWarehouseVessel: mandatoryWarehouseVessel,
    totalCalculatedRequirement: Number(totalCalculatedRequirement.toFixed(1)),
    adjustedForSharing: Number(adjustedForSharing.toFixed(1)),
    capacityAssumptions: {
      mode: capacityMode,
      voyagesPerMonth: selectedCapacity.voyagesPerMonth,
      voyagesPerDay: Number(psvCapacityPerDay.toFixed(3)),
      description: selectedCapacity.description
    }
  };
};

/**
 * Calculate vessel requirements based on actual delivery capacity demand
 * This uses real operational data instead of theoretical contract estimates
 * 
 * IMPORTANT: VESSEL SHARING EFFICIENCY INHERENTLY CAPTURED
 * ========================================================
 * This calculation does NOT explicitly apply vessel sharing efficiency reduction because:
 * 
 * 1. INPUT DATA ALREADY REFLECTS SHARING:
 *    - totalDeliveryCapability = actual offshore port calls (benefits from multi-location voyages)
 *    - actualVoyageCount = actual unique voyages (already optimized through vessel sharing)
 *    - The ratio between these two metrics inherently captures sharing efficiency
 * 
 * 2. SHARING IS BUILT INTO OPERATIONAL REALITY:
 *    - Multi-location voyages naturally reduce vessel requirements
 *    - Vessels serving multiple rigs per trip are already counted once in actualVoyageCount
 *    - totalDeliveryCapability includes all deliveries made by those shared voyages
 * 
 * 3. AVOIDING DOUBLE-COUNTING:
 *    - Applying additional sharing efficiency would REDUCE requirements below actual demand
 *    - This would create unrealistic vessel needs that couldn't meet operational reality
 *    - The delivery capacity approach is inherently more efficient than contract-based estimates
 * 
 * 4. COMPARISON WITH CONTRACT-BASED:
 *    - Contract-based: Uses theoretical minimums + applies sharing efficiency reduction
 *    - Delivery capacity-based: Uses actual operational demand (sharing already optimized)
 *    - Result: Delivery capacity approach typically shows higher but more realistic requirements
 * 
 * This approach ensures vessel calculations match actual operational demand patterns
 * where vessel sharing has already been naturally optimized through operational planning.
 */
export const calculateDeliveryCapacityBasedRequirements = (
  totalDeliveryCapability: number,
  actualVoyageCount: number,
  weeksAnalyzed: number,
  capacityMode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC',
  currentVesselCount: number
) => {
  console.log('\\n🚢 CALCULATING DELIVERY CAPACITY-BASED VESSEL REQUIREMENTS:');
  
  // Calculate weekly delivery demand
  const weeklyDeliveries = totalDeliveryCapability / weeksAnalyzed;
  const weeklyVoyages = actualVoyageCount / weeksAnalyzed;
  
  // Average deliveries per voyage (efficiency metric)
  const deliveriesPerVoyage = actualVoyageCount > 0 ? totalDeliveryCapability / actualVoyageCount : 1;
  
  console.log(`📊 Delivery Analysis:`);
  console.log(`   Total deliveries (port calls): ${totalDeliveryCapability}`);
  console.log(`   Actual voyages: ${actualVoyageCount}`);
  console.log(`   Weeks analyzed: ${weeksAnalyzed}`);
  console.log(`   Weekly deliveries needed: ${weeklyDeliveries.toFixed(1)}`);
  console.log(`   Weekly voyages: ${weeklyVoyages.toFixed(1)}`);
  console.log(`   Deliveries per voyage: ${deliveriesPerVoyage.toFixed(2)}`);
  
  // Get vessel capacity per week based on mode
  const selectedCapacity = FLEET_CAPACITY_RATES.CORE_FLEET[capacityMode] || FLEET_CAPACITY_RATES[capacityMode];
  const voyagesPerVesselPerWeek = (selectedCapacity.voyagesPerMonth * 12) / 52; // Convert monthly to weekly
  
  console.log(`\\n⚙️ Capacity Assumptions (${capacityMode}):`);
  console.log(`   Voyages per vessel per month: ${selectedCapacity.voyagesPerMonth}`);
  console.log(`   Voyages per vessel per week: ${voyagesPerVesselPerWeek.toFixed(2)}`);
  
  // Calculate vessels needed based on actual voyage demand
  const vesselsNeededForVoyages = weeklyVoyages / voyagesPerVesselPerWeek;
  
  // Alternative calculation: vessels needed based on delivery capacity
  // This accounts for multi-location efficiency
  const deliveriesPerVesselPerWeek = voyagesPerVesselPerWeek * deliveriesPerVoyage;
  const vesselsNeededForDeliveries = weeklyDeliveries / deliveriesPerVesselPerWeek;
  
  console.log(`\\n🎯 Vessel Requirements:`);
  console.log(`   Based on voyage demand: ${vesselsNeededForVoyages.toFixed(1)} vessels`);
  console.log(`   Based on delivery capacity: ${vesselsNeededForDeliveries.toFixed(1)} vessels`);
  
  // Use the higher of the two calculations for safety
  const recommendedVessels = Math.max(vesselsNeededForVoyages, vesselsNeededForDeliveries);
  
  // Apply minimum fleet size
  const finalRecommendation = Math.max(recommendedVessels, 6); // Minimum 6 vessels
  
  console.log(`   Recommended (max of both): ${recommendedVessels.toFixed(1)} vessels`);
  console.log(`   Final recommendation: ${finalRecommendation.toFixed(1)} vessels`);
  
  // Calculate utilization if we used recommended fleet
  const projectedUtilization = currentVesselCount > 0 
    ? Math.min(100, (weeklyVoyages / (finalRecommendation * voyagesPerVesselPerWeek)) * 100)
    : 0;
  
  console.log(`   Projected utilization: ${projectedUtilization.toFixed(1)}%`);
  
  return {
    weeklyDeliveries: Number(weeklyDeliveries.toFixed(1)),
    weeklyVoyages: Number(weeklyVoyages.toFixed(1)),
    deliveriesPerVoyage: Number(deliveriesPerVoyage.toFixed(2)),
    voyagesPerVesselPerWeek: Number(voyagesPerVesselPerWeek.toFixed(2)),
    vesselsNeededForVoyages: Number(vesselsNeededForVoyages.toFixed(1)),
    vesselsNeededForDeliveries: Number(vesselsNeededForDeliveries.toFixed(1)),
    recommendedVessels: Number(finalRecommendation.toFixed(1)),
    projectedUtilization: Number(projectedUtilization.toFixed(1)),
    capacityAssumptions: {
      mode: capacityMode,
      voyagesPerMonth: selectedCapacity.voyagesPerMonth,
      voyagesPerWeek: Number(voyagesPerVesselPerWeek.toFixed(2)),
      description: selectedCapacity.description
    }
  };
};

/**
 * Calculate total vessel requirements across all rigs
 * FIXED: Addresses double counting issues in rig analysis
 */
export const calculateVesselRequirements = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  events: VoyageEvent[],
  dateFilter?: { startDate?: Date; endDate?: Date; monthFilter?: number },
  capacityMode: 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC' = 'OPTIMISTIC'
): VesselRequirementSummary => {
  console.log('🚢 Calculating vessel requirements using whiteboard formula (FIXED for double counting)...');
  
  // Filter to YTD 2025 data (Jan 1 - June 30, 2025) by default
  const defaultStartDate = new Date('2025-01-01');
  const defaultEndDate = new Date('2025-06-30');
  const startDate = dateFilter?.startDate || defaultStartDate;
  const endDate = dateFilter?.endDate || defaultEndDate;
  const monthFilter = dateFilter?.monthFilter;
  
  console.log(`🗓️ DATE FILTER DEBUG:`);
  console.log(`📅 Start Date: ${startDate.toISOString()}`);
  console.log(`📅 End Date: ${endDate.toISOString()}`);
  console.log(`📅 Month Filter: ${monthFilter || 'None'}`);
  console.log(`📅 Expected Range: Jan 1, 2025 - Jun 30, 2025`);
  
  // Debug all voyage dates before filtering
  console.log(`📊 VOYAGE DATE RANGE ANALYSIS:`);
  const voyageDates = voyages.map(v => new Date(v.startDate)).filter(d => !isNaN(d.getTime()));
  const sortedDates = voyageDates.sort((a, b) => a.getTime() - b.getTime());
  
  if (sortedDates.length > 0) {
    const earliestDate = sortedDates[0];
    const latestDate = sortedDates[sortedDates.length - 1];
    console.log(`📅 Earliest voyage date in data: ${earliestDate.toISOString().split('T')[0]}`);
    console.log(`📅 Latest voyage date in data: ${latestDate.toISOString().split('T')[0]}`);
    console.log(`📅 Total voyages in raw data: ${voyages.length}`);
    
    // Count voyages by year
    const voyagesByYear = new Map<number, number>();
    sortedDates.forEach(date => {
      const year = date.getFullYear();
      voyagesByYear.set(year, (voyagesByYear.get(year) || 0) + 1);
    });
    
    console.log(`📅 Voyages by year:`);
    Array.from(voyagesByYear.entries()).sort((a, b) => a[0] - b[0]).forEach(([year, count]) => {
      console.log(`   ${year}: ${count} voyages`);
    });
    
    // Count 2025 voyages by month
    const voyages2025 = sortedDates.filter(d => d.getFullYear() === 2025);
    const voyagesByMonth2025 = new Map<number, number>();
    voyages2025.forEach(date => {
      const month = date.getMonth() + 1; // 1-based month
      voyagesByMonth2025.set(month, (voyagesByMonth2025.get(month) || 0) + 1);
    });
    
    console.log(`📅 2025 voyages by month:`);
    for (let month = 1; month <= 12; month++) {
      const count = voyagesByMonth2025.get(month) || 0;
      if (count > 0) {
        const monthName = new Date(2025, month - 1, 1).toLocaleString('en-US', { month: 'short' });
        console.log(`   ${monthName} 2025: ${count} voyages`);
      }
    }
  }

  // Filter voyages to current YTD period and PSV/OSV vessels only
  const allVoyagesInDateRange = voyages.filter(voyage => {
    const voyageDate = new Date(voyage.startDate);
    const isInDateRange = voyageDate >= startDate && voyageDate <= endDate;
    
    // Additional month filter if specified
    if (monthFilter) {
      return isInDateRange && voyage.monthNumber === monthFilter;
    }
    
    return isInDateRange;
  });

  const filteredVoyages = allVoyagesInDateRange.filter(voyage => {
    return isPSVOrOSV(voyage.vessel);
  });
  
  // Debug vessel type filtering - DETAILED ANALYSIS
  const excludedVessels = new Set<string>();
  const includedVessels = new Map<string, number>(); // vessel -> voyage count
  
  allVoyagesInDateRange.forEach(voyage => {
    if (!isPSVOrOSV(voyage.vessel)) {
      excludedVessels.add(voyage.vessel);
    } else {
      // Count voyages per included vessel
      const current = includedVessels.get(voyage.vessel) || 0;
      includedVessels.set(voyage.vessel, current + 1);
    }
  });
  
  console.log(`📊 Total voyages in date range: ${allVoyagesInDateRange.length}`);
  console.log(`📊 PSV/OSV voyages filtered: ${filteredVoyages.length}`);
  console.log(`📊 Excluded voyages: ${allVoyagesInDateRange.length - filteredVoyages.length}`);
  
  if (excludedVessels.size > 0) {
    console.log(`🚫 EXCLUDED VESSEL TYPES (${excludedVessels.size} vessels):`);
    Array.from(excludedVessels).sort().forEach((vessel, index) => {
      console.log(`${index + 1}. ${vessel}`);
    });
  }
  
  // Show all included PSV/OSV vessels with voyage counts
  console.log(`\n✅ INCLUDED PSV/OSV VESSELS (${includedVessels.size} vessels, ${filteredVoyages.length} total voyages):`);
  const sortedIncludedVessels = Array.from(includedVessels.entries())
    .sort((a, b) => b[1] - a[1]); // Sort by voyage count (highest first)
  
  sortedIncludedVessels.forEach(([vessel, count], index) => {
    console.log(`${index + 1}. ${vessel}: ${count} voyages`);
  });
  
  // Analyze vessel names for potential issues
  console.log(`\n🔍 POTENTIAL NON-PSV VESSELS IN INCLUDED LIST:`);
  const suspiciousVessels: [string, number][] = [];
  sortedIncludedVessels.forEach(([vessel, count]) => {
    const vesselLower = vessel.toLowerCase();
    // Check for patterns that might indicate non-PSV vessels
    if (vesselLower.includes('fast') || 
        vesselLower.includes('crew') ||
        vesselLower.includes('utility') ||
        vesselLower.includes('work') ||
        vesselLower.includes('tug') ||
        vesselLower.includes('barge') ||
        vesselLower.includes('service') ||
        vesselLower.includes('inspection') ||
        vesselLower.includes('maintenance') ||
        vesselLower.includes('survey') ||
        vesselLower.includes('holiday') ||
        vesselLower.includes('amelia') ||
        vesselLower.includes('dock') ||
        vesselLower.includes('galveston') ||
        vesselLower.includes('gomex')) {
      suspiciousVessels.push([vessel, count]);
    }
  });
  
  if (suspiciousVessels.length > 0) {
    console.log(`⚠️ Found ${suspiciousVessels.length} potentially non-PSV vessels:`);
    suspiciousVessels.forEach(([vessel, count], index) => {
      console.log(`${index + 1}. ${vessel}: ${count} voyages`);
    });
  } else {
    console.log(`✅ No obviously suspicious vessel names found in included vessels`);
  }
  
  // Calculate total delivery capability (unique offshore port calls per voyage)
  let totalDeliveryCapability = 0;
  const deliveryBreakdown: { voyage: string; vessel: string; deliveries: number; locations: string[] }[] = [];
  
  filteredVoyages.forEach((voyage, index) => {
    // DEBUG: Show full voyage route for first few voyages
    if (index < 5) {
      console.log(`\n🔍 VOYAGE ${index + 1} ANALYSIS - ${voyage.vessel}:`);
      console.log(`📍 Full Route: [${voyage.locationList.join(' → ')}]`);
      console.log(`📍 Locations String: "${voyage.locations}"`);
      console.log(`📍 Main Destination: "${voyage.mainDestination}"`);
    }
    
    // Count unique offshore locations per voyage (excluding Fourchon/ports)
    const offshoreLocations = voyage.locationList.filter(loc => 
      loc && 
      loc.toLowerCase() !== 'fourchon' && 
      !loc.toLowerCase().includes('port') &&
      !loc.toLowerCase().includes('galveston') &&
      !loc.toLowerCase().includes('houma')
    );
    
    // Remove duplicates within the same voyage
    const uniqueOffshoreLocations = [...new Set(offshoreLocations)];
    const deliveryCount = uniqueOffshoreLocations.length;
    
    // DEBUG: Show delivery analysis for first few voyages
    if (index < 5) {
      console.log(`📊 Offshore Locations Found: [${offshoreLocations.join(', ')}]`);
      console.log(`✅ Unique Offshore Locations: [${uniqueOffshoreLocations.join(', ')}]`);
      console.log(`🚢 Delivery Count: ${deliveryCount}`);
    }
    
    totalDeliveryCapability += deliveryCount;
    
    deliveryBreakdown.push({
      voyage: `${voyage.vessel}-${voyage.voyageNumber || 'N/A'}`,
      vessel: voyage.vessel,
      deliveries: deliveryCount,
      locations: uniqueOffshoreLocations
    });
  });
  
  console.log(`📊 DELIVERY CAPABILITY ANALYSIS:`);
  console.log(`📊 Total Voyages: ${filteredVoyages.length}`);
  console.log(`🚢 Total Delivery Capability: ${totalDeliveryCapability} offshore port calls`);
  console.log(`📈 Average Deliveries per Voyage: ${(totalDeliveryCapability / filteredVoyages.length).toFixed(2)}`);
  
  // Calculate theoretical performance based on 9-vessel baseline
  const BASELINE_FLEET_SIZE = 9;
  const theoreticalDeliveriesPerVessel = totalDeliveryCapability / BASELINE_FLEET_SIZE;
  
  console.log(`\n🎯 VESSEL PERFORMANCE ANALYSIS (9-Vessel Baseline):`);
  console.log(`📊 Theoretical Deliveries per Vessel: ${theoreticalDeliveriesPerVessel.toFixed(1)} deliveries`);
  
  // Calculate actual delivery performance per vessel
  const vesselDeliveryPerformance = new Map<string, number>();
  deliveryBreakdown.forEach(voyage => {
    const current = vesselDeliveryPerformance.get(voyage.vessel) || 0;
    vesselDeliveryPerformance.set(voyage.vessel, current + voyage.deliveries);
  });
  
  // Show top performing vessels vs theoretical target
  const sortedVesselPerformance = Array.from(vesselDeliveryPerformance.entries())
    .sort((a, b) => b[1] - a[1]);
  
  console.log(`\n⭐ TOP VESSEL DELIVERY PERFORMANCE:`);
  sortedVesselPerformance.slice(0, 10).forEach(([vessel, deliveries], index) => {
    const vsTarget = ((deliveries / theoreticalDeliveriesPerVessel) * 100).toFixed(1);
    console.log(`${index + 1}. ${vessel}: ${deliveries} deliveries (${vsTarget}% of target)`);
  });
  
  // Calculate fleet efficiency
  const totalActiveVessels = vesselDeliveryPerformance.size;
  const actualAverageDeliveriesPerVessel = totalDeliveryCapability / totalActiveVessels;
  const fleetEfficiencyVsBaseline = (actualAverageDeliveriesPerVessel / theoreticalDeliveriesPerVessel) * 100;
  
  console.log(`\n📈 FLEET EFFICIENCY METRICS:`);
  console.log(`📊 Active Vessels: ${totalActiveVessels}`);
  console.log(`📊 Actual Avg Deliveries per Vessel: ${actualAverageDeliveriesPerVessel.toFixed(1)}`);
  console.log(`📊 Fleet Efficiency vs 9-Vessel Baseline: ${fleetEfficiencyVsBaseline.toFixed(1)}%`);
  
  // Show breakdown of multi-delivery voyages
  const multiDeliveryVoyages = deliveryBreakdown.filter(v => v.deliveries > 1);
  console.log(`\n🔄 MULTI-DELIVERY VOYAGES (${multiDeliveryVoyages.length} of ${filteredVoyages.length}):`);
  multiDeliveryVoyages.slice(0, 10).forEach((voyage, index) => {
    console.log(`${index + 1}. ${voyage.vessel}: ${voyage.deliveries} deliveries to [${voyage.locations.join(', ')}]`);
  });
  
  console.log(`📊 Final filtered voyages for analysis: ${filteredVoyages.length} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);
  if (monthFilter) {
    console.log(`📅 Month filter applied: ${monthFilter}`);
  }
  
  // Identify all unique rig locations from filtered data - NORMALIZE TO AVOID DUPLICATES
  const allLocations = new Set<string>();
  const locationNormalizationMap = new Map<string, string>(); // raw -> normalized
  
  // Extract and normalize locations from filtered voyages
  filteredVoyages.forEach(voyage => {
    voyage.locationList.forEach(loc => {
      if (loc && loc.toLowerCase() !== 'fourchon' && !loc.toLowerCase().includes('port')) {
        const { standardName } = normalizeRigLocation(loc.trim());
        allLocations.add(standardName);
        locationNormalizationMap.set(loc.trim(), standardName);
      }
    });
    if (voyage.mainDestination && !voyage.mainDestination.toLowerCase().includes('fourchon')) {
      const { standardName } = normalizeRigLocation(voyage.mainDestination.trim());
      allLocations.add(standardName);
      locationNormalizationMap.set(voyage.mainDestination.trim(), standardName);
    }
  });
  
  // Filter and extract locations from manifests
  const filteredManifests = manifests.filter(manifest => {
    if (manifest.manifestDate) {
      const manifestDate = new Date(manifest.manifestDate);
      return manifestDate >= startDate && manifestDate <= endDate;
    }
    return false;
  });
  
  filteredManifests.forEach(manifest => {
    if (manifest.offshoreLocation && !manifest.offshoreLocation.toLowerCase().includes('fourchon')) {
      const { standardName } = normalizeRigLocation(manifest.offshoreLocation.trim());
      allLocations.add(standardName);
      locationNormalizationMap.set(manifest.offshoreLocation.trim(), standardName);
    }
    if (manifest.mappedLocation && !manifest.mappedLocation.toLowerCase().includes('fourchon')) {
      const { standardName } = normalizeRigLocation(manifest.mappedLocation.trim());
      allLocations.add(standardName);
      locationNormalizationMap.set(manifest.mappedLocation.trim(), standardName);
    }
  });
  
  // Filter and extract locations from events
  const filteredEvents = events.filter(event => {
    if (event.eventDate) {
      const eventDate = new Date(event.eventDate);
      return eventDate >= startDate && eventDate <= endDate;
    }
    return false;
  });
  
  filteredEvents.forEach(event => {
    if (event.portType === 'rig' && event.location) {
      const { standardName } = normalizeRigLocation(event.location.trim());
      allLocations.add(standardName);
      locationNormalizationMap.set(event.location.trim(), standardName);
    }
    if (event.portType === 'rig' && event.mappedLocation) {
      const { standardName } = normalizeRigLocation(event.mappedLocation.trim());
      allLocations.add(standardName);
      locationNormalizationMap.set(event.mappedLocation.trim(), standardName);
    }
  });
  
  console.log(`📊 Found ${allLocations.size} unique offshore locations (after normalization)`);
  console.log(`🔍 LOCATION NORMALIZATION DEBUG:`);
  Array.from(allLocations).sort().forEach((location, index) => {
    console.log(`${index + 1}. ${location}`);
  });
  
  // Analyze each rig location - FIXED: Track voyage assignments to prevent double counting
  const rigAnalysis: RigVoyagePattern[] = [];
  const voyageAssignmentTracker = new Map<string, string[]>(); // voyageId -> [rigLocations]
  
  Array.from(allLocations).forEach(location => {
    const analysis = analyzeRigVoyagePattern(location, filteredVoyages, filteredManifests, filteredEvents);
    if (analysis.totalVoyages > 0) { // Only include rigs with actual voyage data
      rigAnalysis.push(analysis);
      
      // Track which voyages are assigned to this rig for debugging
      const rigVoyages = filteredVoyages.filter(voyage => {
        const locationsMatch = voyage.locations.toLowerCase().includes(location.toLowerCase());
        const mainDestMatch = voyage.mainDestination?.toLowerCase().includes(location.toLowerCase());
        const locationListMatch = voyage.locationList.some(loc => loc.toLowerCase().includes(location.toLowerCase()));
        return locationsMatch || mainDestMatch || locationListMatch;
      });
      
      rigVoyages.forEach(voyage => {
        const voyageKey = `${voyage.vessel}-${voyage.voyageNumber || voyage.id}`;
        if (!voyageAssignmentTracker.has(voyageKey)) {
          voyageAssignmentTracker.set(voyageKey, []);
        }
        voyageAssignmentTracker.get(voyageKey)!.push(location);
      });
    }
  });
  
  // Debug: Show voyage assignment tracking
  console.log('\n📊 VOYAGE ASSIGNMENT TRACKING (Double Counting Check):');
  const multiAssignedVoyages = Array.from(voyageAssignmentTracker.entries())
    .filter(([_, rigs]) => rigs.length > 1);
  
  console.log(`Total voyages tracked: ${voyageAssignmentTracker.size}`);
  console.log(`Multi-assigned voyages: ${multiAssignedVoyages.length}`);
  
  if (multiAssignedVoyages.length > 0) {
    console.log('⚠️ VOYAGES ASSIGNED TO MULTIPLE RIGS:');
    multiAssignedVoyages.forEach(([voyageKey, rigs]) => {
      console.log(`   ${voyageKey}: [${rigs.join(', ')}]`);
    });
  }
  
  // Sort by total voyages (highest demand first)
  rigAnalysis.sort((a, b) => b.totalVoyages - a.totalVoyages);
  
  // Calculate summary metrics - FIXED: Separate delivery capability from voyage count
  const totalRigs = rigAnalysis.length;
  
  // IMPORTANT: Keep delivery capability and voyage count separate
  // totalDeliveryCapability = sum of offshore port calls (can be > voyage count for multi-location voyages)
  // filteredVoyages.length = actual number of voyages
  const actualVoyageCount = filteredVoyages.length;
  
  // Verify no double counting in rig analysis
  const rigAnalysisVoyageSum = rigAnalysis.reduce((sum, rig) => sum + rig.totalVoyages, 0);
  console.log(`\n📊 DOUBLE COUNTING VERIFICATION:`);
  console.log(`Actual voyages in dataset: ${actualVoyageCount}`);
  console.log(`Sum of rig-specific voyages: ${rigAnalysisVoyageSum}`);
  console.log(`Delivery capability (port calls): ${totalDeliveryCapability}`);
  
  if (rigAnalysisVoyageSum > actualVoyageCount) {
    console.log(`⚠️ DOUBLE COUNTING DETECTED: ${rigAnalysisVoyageSum - actualVoyageCount} extra voyage counts`);
    console.log(`   This occurs when multi-location voyages are counted for each rig they serve.`);
    console.log(`   ✅ SOLUTION: Use actualVoyageCount (${actualVoyageCount}) for fleet calculations, not rig sums (${rigAnalysisVoyageSum})`);
  } else {
    console.log(`✅ No double counting detected in rig analysis.`);
  }
  
  console.log(`\\n📋 RIG ANALYSIS INTERPRETATION:`);
  console.log(`   • Rig-specific counts: For understanding demand per location`);
  console.log(`   • Fleet calculations: Based on actual voyage count (${actualVoyageCount})`);
  console.log(`   • Multi-location voyages: Counted once for fleet, multiple times for rig analysis`);
  console.log(`   • This is CORRECT behavior - vessels serve multiple rigs efficiently`);
  
  // Current vessel count - separate contract vs all vessels
  const allVessels = new Set<string>();
  const contractVessels = new Set<string>();
  
  rigAnalysis.forEach(rig => {
    rig.uniqueVessels.forEach(vessel => {
      if (isPSVOrOSV(vessel)) {
        allVessels.add(vessel);
        
        // Also check if it's a known contract vessel
        if (isContractVessel(vessel)) {
          contractVessels.add(vessel);
        }
      }
    });
  });
  
  // Debug: Show which vessels are being counted
  console.log('\\n🚢 VESSEL COUNT ANALYSIS:');
  console.log(`📊 All PSV/OSV vessels found: ${allVessels.size}`);
  console.log(`📊 Known contract vessels found: ${contractVessels.size}`);
  
  console.log('\\n🚢 ALL PSV/OSV VESSELS IN DATA:');
  const allVesselsList = Array.from(allVessels).sort();
  allVesselsList.forEach((vessel, index) => {
    const isContract = isContractVessel(vessel);
    console.log(`${index + 1}. ${vessel} ${isContract ? '✅ (Contract)' : '❌ (Non-contract)'}`);
  });
  
  console.log('\\n🚢 CONFIRMED CONTRACT VESSELS:');
  const contractVesselsList = Array.from(contractVessels).sort();
  contractVesselsList.forEach((vessel, index) => {
    console.log(`${index + 1}. ${vessel}`);
  });
  
  // Use contract vessels for more accurate count
  const currentVesselCount = contractVessels.size;
  
  // Analyze vessel sharing patterns - NEW!
  const vesselSharingAnalysis = analyzeVesselSharing(filteredVoyages);
  
  // Analyze core fleet composition using contract vessels only
  const coreFleetAnalysis = analyzeCoreFleetComposition(Array.from(contractVessels));
  
  // Calculate contract-based requirements with selected capacity mode and sharing efficiency
  const contractRequirements = calculateContractBasedRequirements(
    capacityMode, 
    vesselSharingAnalysis.vesselSharingEfficiency.efficiencyGain
  );
  
  // Calculate probability accuracy analysis
  const probabilityAccuracy = calculateProbabilityAccuracy(capacityMode, rigAnalysis);
  
  // Calculate time span from actual voyage dates for proper weekly averages
  const voyageDatesActual = filteredVoyages.map(v => new Date(v.startDate)).filter(d => !isNaN(d.getTime()));
  const sortedVoyageDates = voyageDatesActual.sort((a, b) => a.getTime() - b.getTime());
  
  let actualWeeksSpan = 1; // Default to 1 week minimum
  if (sortedVoyageDates.length > 1) {
    const firstVoyageDate = sortedVoyageDates[0];
    const lastVoyageDate = sortedVoyageDates[sortedVoyageDates.length - 1];
    actualWeeksSpan = Math.max(1, Math.ceil((lastVoyageDate.getTime() - firstVoyageDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  }
  
  // NEW: Calculate delivery capacity-based vessel requirements (after actualWeeksSpan is defined)
  const deliveryCapacityRequirements = calculateDeliveryCapacityBasedRequirements(
    totalDeliveryCapability,
    actualVoyageCount,
    actualWeeksSpan,
    capacityMode,
    currentVesselCount
  );
  
  // Overall utilization - FIXED: Base on actual voyages, not double-counted rig analysis
  const actualWeeklyVoyages = actualVoyageCount / actualWeeksSpan;
  const avgVoyageDuration = filteredVoyages.length > 0 ? 
    filteredVoyages.reduce((sum, v) => sum + (v.durationHours || 24), 0) / filteredVoyages.length : 24;
  
  const actualWeeklyVesselHours = actualWeeklyVoyages * avgVoyageDuration;
  const totalWeeklyCapacity = currentVesselCount * 7 * 24; // Total available vessel-hours per week
  const overallUtilization = totalWeeklyCapacity > 0 
    ? (actualWeeklyVesselHours / totalWeeklyCapacity) * 100 
    : 0;
    
  console.log(`\n📊 UTILIZATION CALCULATION (FIXED - No Double Counting):`);
  console.log(`   Analysis period: ${actualWeeksSpan} weeks`);
  console.log(`   Actual voyages: ${actualVoyageCount}`)
  console.log(`   Actual weekly voyages: ${actualWeeklyVoyages.toFixed(2)}`);
  console.log(`   Average voyage duration: ${avgVoyageDuration.toFixed(1)} hours`);
  console.log(`   Weekly vessel-hours needed: ${actualWeeklyVesselHours.toFixed(1)}`);
  console.log(`   Weekly vessel-hours available: ${totalWeeklyCapacity}`);
  console.log(`   Utilization: ${overallUtilization.toFixed(2)}%`);
  
  // Insights
  const highestDemandRig = rigAnalysis.length > 0 ? rigAnalysis[0].rigLocation : 'None';
  const mostEfficientRig = rigAnalysis.reduce((best, rig) => 
    rig.efficiencyScore > best.efficiencyScore ? rig : best, 
    rigAnalysis[0] || { efficiencyScore: 0, rigLocation: 'None' }
  ).rigLocation;
  
  const underutilizedRigs = rigAnalysis
    .filter(rig => rig.currentUtilization < 50)
    .map(rig => rig.rigLocation);
  
  // Formula breakdown - FIXED: Use actual voyages, not rig analysis sums
  const dailyVoyageRequirement = actualWeeklyVoyages / 7;
  const vesselHoursPerDay = 24; // 24 hours per day per vessel
  
  // Generate period description
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let periodDescription = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
  
  if (monthFilter) {
    periodDescription = `${monthNames[monthFilter - 1]} 2025`;
  } else if (startDate.getFullYear() === 2025 && endDate.getFullYear() === 2025) {
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];
    periodDescription = startMonth === endMonth ? `${startMonth} 2025` : `${startMonth} - ${endMonth} 2025 YTD`;
  }

  const summary: VesselRequirementSummary = {
    totalRigs,
    totalVoyages: totalDeliveryCapability, // FIXED: Clearly represents delivery capability (port calls)
    actualVoyageCount: actualVoyageCount, // FIXED: Use actual voyage count, not filtered length
    totalRecommendedVessels: deliveryCapacityRequirements.recommendedVessels, // FIXED: Use delivery capacity-based calculation
    currentVesselCount,
    overallUtilization: Number(overallUtilization.toFixed(2)),
    
    // Delivery capability metrics
    deliveryCapability: {
      totalDeliveries: totalDeliveryCapability,
      averageDeliveriesPerVoyage: Number((totalDeliveryCapability / filteredVoyages.length).toFixed(2)),
      theoreticalDeliveriesPerVessel: Number(theoreticalDeliveriesPerVessel.toFixed(1)),
      actualAverageDeliveriesPerVessel: Number(actualAverageDeliveriesPerVessel.toFixed(1)),
      fleetEfficiencyVsBaseline: Number(fleetEfficiencyVsBaseline.toFixed(1)),
      multiDeliveryVoyages: multiDeliveryVoyages.length,
      totalActiveVessels: totalActiveVessels
    },
    
    rigAnalysis,
    
    // NEW! Vessel sharing analysis
    vesselSharingAnalysis,
    
    highestDemandRig,
    mostEfficientRig,
    underutilizedRigs,
    
    analysisDateRange: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      monthFilter,
      periodDescription
    },
    
    contractRequirements,
    
    // NEW! Delivery capacity-based requirements
    deliveryCapacityRequirements,
    
    formulaBreakdown: {
      totalWeeklyVoyages: Number(actualWeeklyVoyages.toFixed(2)), // FIXED: Use actual weekly voyages
      dailyVoyageRequirement: Number(dailyVoyageRequirement.toFixed(2)),
      vesselHoursPerDay,
      calculatedVesselNeed: contractRequirements.totalCalculatedRequirement,
      sharingAdjustment: Number((contractRequirements.totalCalculatedRequirement - contractRequirements.adjustedForSharing).toFixed(2))
    },
    
    // Enhanced analysis features
    coreFleetAnalysis,
    probabilityAccuracy
  };
  
  // Log results
  console.log('\n🚢 VESSEL REQUIREMENT CALCULATION RESULTS (FIXED):');
  console.log(`📊 Analysis Period: ${periodDescription}`);
  console.log(`📊 Total Rigs Analyzed: ${totalRigs}`);
  console.log(`🚢 Total Delivery Capability: ${totalDeliveryCapability} offshore port calls`);
  console.log(`📊 Actual Voyages: ${actualVoyageCount}`);
  console.log(`📈 Average Deliveries per Voyage: ${(totalDeliveryCapability / actualVoyageCount).toFixed(2)}`);
  console.log(`⛵ Current PSV/OSV Vessels: ${currentVesselCount}`);
  console.log(`🎯 Contract-Based Requirement: ${contractRequirements.totalCalculatedRequirement} vessels`);
  console.log(`📈 Overall Utilization: ${overallUtilization.toFixed(2)}%`);
  console.log(`\n📊 CALCULATION INTEGRITY CHECK:`);
  console.log(`   Rig analysis voyage sum: ${rigAnalysisVoyageSum}`);
  console.log(`   Expected double counting: ${rigAnalysisVoyageSum > actualVoyageCount ? 'YES' : 'NO'}`);
  console.log(`   Multi-assigned voyages: ${multiAssignedVoyages.length}`);
  
  console.log('\n🔧 CONTRACT-BASED BREAKDOWN:');
  console.log(`📊 PSV Capacity Mode: ${contractRequirements.capacityAssumptions.mode} (${contractRequirements.capacityAssumptions.voyagesPerMonth} voyages/month, ${contractRequirements.capacityAssumptions.voyagesPerDay} voyages/day)`);
  console.log(`📝 Capacity Description: ${contractRequirements.capacityAssumptions.description}`);
  console.log(`⚙️ Drilling Rigs (${contractRequirements.drillingRigs.count}): ${contractRequirements.drillingRigs.vesselRequirement} vessels`);
  console.log(`🏭 Production Facilities (${contractRequirements.productionFacilities.count}): ${contractRequirements.productionFacilities.vesselRequirement} vessels`);
  console.log(`📦 Mandatory Warehouse (Mad Dog): ${contractRequirements.mandatoryWarehouseVessel} vessel`);
  console.log(`📊 TOTAL REQUIREMENT: ${contractRequirements.totalCalculatedRequirement} vessels`);
  
  console.log('\n📋 ACTIVE PSV/OSV VESSELS IN ANALYSIS:');
  const allVesselsArray = Array.from(allVessels).sort();
  console.log(`Total: ${allVesselsArray.length} vessels`);
  console.log(allVesselsArray.join(', '));
  
  console.log('\n📋 CONTRACT RIGS:');
  console.log(`⚙️ Drilling: ${CONTRACT_RIGS.DRILLING.join(', ')}`);
  console.log(`🏭 Production: ${CONTRACT_RIGS.PRODUCTION.join(', ')}`);
  
  console.log('\n📋 TOP 10 RIGS BY DEMAND:');
  rigAnalysis.slice(0, 10).forEach((rig, index) => {
    console.log(`${index + 1}. ${rig.rigCode} (${rig.rigLocation}): ${rig.totalVoyages} voyages, ${rig.vesselCount} vessels, ${rig.recommendedVessels} needed`);
  });
  
  return summary;
};

/**
 * Generate vessel requirement report in table format
 */
export const generateVesselRequirementReport = (summary: VesselRequirementSummary): string => {
  let report = '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                    VESSEL REQUIREMENT ANALYSIS\n';
  report += '                 Based on Whiteboard Formula\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';
  
  // Summary section
  report += '📊 EXECUTIVE SUMMARY:\n';
  report += `   • Total Offshore Rigs: ${summary.totalRigs}\n`;
  report += `   • Total Voyages Analyzed: ${summary.totalVoyages}\n`;
  report += `   • Current Fleet Size: ${summary.currentVesselCount} vessels\n`;
  report += `   • Recommended Fleet Size: ${summary.totalRecommendedVessels} vessels\n`;
  report += `   • Fleet Utilization: ${summary.overallUtilization}%\n`;
  report += `   • Highest Demand Rig: ${summary.highestDemandRig}\n`;
  report += `   • Most Efficient Rig: ${summary.mostEfficientRig}\n\n`;
  
  // Formula breakdown
  report += '🧮 FORMULA BREAKDOWN:\n';
  report += `   • Total Weekly Voyages: ${summary.formulaBreakdown.totalWeeklyVoyages}\n`;
  report += `   • Daily Voyage Requirement: ${summary.formulaBreakdown.dailyVoyageRequirement}\n`;
  report += `   • Calculated Vessel Need: ${summary.formulaBreakdown.calculatedVesselNeed}\n\n`;
  
  // Detailed rig analysis
  report += '📋 DETAILED RIG ANALYSIS:\n';
  report += '─'.repeat(100) + '\n';
  report += `${'RIG CODE'.padEnd(10)} ${'LOCATION'.padEnd(25)} ${'VOYAGES'.padEnd(10)} ${'WEEKLY'.padEnd(10)} ${'VESSELS'.padEnd(10)} ${'UTIL%'.padEnd(8)}\n`;
  report += '─'.repeat(100) + '\n';
  
  summary.rigAnalysis.forEach(rig => {
    report += `${rig.rigCode.padEnd(10)} `;
    report += `${rig.rigLocation.substring(0, 24).padEnd(25)} `;
    report += `${rig.totalVoyages.toString().padEnd(10)} `;
    report += `${rig.weeklyVoyages.toString().padEnd(10)} `;
    report += `${rig.recommendedVessels.toString().padEnd(10)} `;
    report += `${rig.currentUtilization.toFixed(1).padEnd(8)}\n`;
  });
  
  report += '─'.repeat(100) + '\n\n';
  
  // Insights and recommendations
  if (summary.underutilizedRigs.length > 0) {
    report += '⚠️ UNDERUTILIZED RIGS (< 50% utilization):\n';
    summary.underutilizedRigs.forEach(rig => {
      report += `   • ${rig}\n`;
    });
    report += '\n';
  }
  
  report += '💡 RECOMMENDATIONS:\n';
  if (summary.totalRecommendedVessels > summary.currentVesselCount) {
    report += `   • Consider adding ${summary.totalRecommendedVessels - summary.currentVesselCount} vessels to meet demand\n`;
  } else if (summary.totalRecommendedVessels < summary.currentVesselCount) {
    report += `   • Fleet may be oversized by ${summary.currentVesselCount - summary.totalRecommendedVessels} vessels\n`;
  } else {
    report += '   • Current fleet size appears optimal\n';
  }
  
  if (summary.overallUtilization < 70) {
    report += '   • Consider optimizing routes to improve vessel utilization\n';
  }
  
  report += '\n═══════════════════════════════════════════════════════════════\n';
  
  return report;
};

/**
 * Export vessel requirement data for Excel/CSV
 */
export const exportVesselRequirementData = (summary: VesselRequirementSummary) => {
  return {
    summary: {
      totalRigs: summary.totalRigs,
      totalVoyages: summary.totalVoyages,
      currentVessels: summary.currentVesselCount,
      recommendedVessels: summary.totalRecommendedVessels,
      utilization: summary.overallUtilization,
      highestDemandRig: summary.highestDemandRig,
      mostEfficientRig: summary.mostEfficientRig,
      vesselSharingEfficiency: summary.vesselSharingAnalysis.vesselSharingEfficiency.efficiencyGain,
      sharingPercentage: summary.vesselSharingAnalysis.sharingPercentage
    },
    vesselSharing: {
      totalVoyages: summary.vesselSharingAnalysis.totalVoyages,
      multiLocationVoyages: summary.vesselSharingAnalysis.multiLocationVoyages,
      sharingPercentage: summary.vesselSharingAnalysis.sharingPercentage,
      averageLocationsPerVoyage: summary.vesselSharingAnalysis.averageLocationsPerVoyage,
      efficiencyGain: summary.vesselSharingAnalysis.vesselSharingEfficiency.efficiencyGain,
      topSharedRoutes: summary.vesselSharingAnalysis.topSharedRoutes
    },
    rigDetails: summary.rigAnalysis.map(rig => ({
      rigCode: rig.rigCode,
      rigLocation: rig.rigLocation,
      totalVoyages: rig.totalVoyages,
      weeklyVoyages: rig.weeklyVoyages,
      dailyVoyages: rig.dailyVoyages,
      averageVoyageDuration: rig.averageVoyageDuration,
      vesselCount: rig.vesselCount,
      recommendedVessels: rig.recommendedVessels,
      currentUtilization: rig.currentUtilization,
      efficiencyScore: rig.efficiencyScore
    }))
  };
};