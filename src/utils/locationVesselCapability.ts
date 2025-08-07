/**
 * Location-Based Vessel Capability Engine
 * 
 * Calculates vessel delivery capacity based on field locations and transit times.
 * Transit time directly impacts how many deliveries a vessel can complete per month.
 * 
 * User-provided baselines:
 * - Short transit fields (~13 hrs): 6.5 deliveries per vessel per month
 * - Long transit fields (~24 hrs): 4.9 deliveries per vessel per month
 */

export interface LocationCapabilityProfile {
  assetCode: string;
  fieldName: string;
  region: 'GOM' | 'OTHER';
  transitCategory: 'SHORT' | 'LONG';
  approximateTransitHours: number;
  vesselDeliveriesPerMonth: number;
  characteristics: {
    weatherExposure: 'Low' | 'Medium' | 'High';
    operationalComplexity: 'Standard' | 'Complex' | 'Extreme';
    fuelEfficiencyImpact: number; // Multiplier for fuel costs
    crewRotationImpact: 'Low' | 'Medium' | 'High';
  };
  operationalNotes?: string;
}

// Base vessel capabilities by transit category
export const VESSEL_CAPABILITY_BASELINES = {
  SHORT_TRANSIT: {
    deliveriesPerMonth: 6.5,
    transitHours: 13,
    category: 'SHORT' as const
  },
  LONG_TRANSIT: {
    deliveriesPerMonth: 4.9,
    transitHours: 24,
    category: 'LONG' as const
  }
} as const;

/**
 * Location Asset Capability Profiles
 * Based on GWDXAG-Asset field values from rig schedule data
 */
export const LOCATION_CAPABILITY_PROFILES: Record<string, LocationCapabilityProfile> = {
  // ====================== SHORT TRANSIT FIELDS (~13 hrs) ======================
  
  'GOM.Atlantis': {
    assetCode: 'GOM.Atlantis',
    fieldName: 'Atlantis',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'Major production field with established logistics infrastructure'
  },

  'GOM.Nakika': {
    assetCode: 'GOM.Nakika',
    fieldName: 'Nakika',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'Green Canyon field with good access'
  },

  'GOM.Region': {
    assetCode: 'GOM.Region',
    fieldName: 'Gulf of Mexico Region',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'General GOM region - assumes standard access'
  },

  'GOM.GOMX': {
    assetCode: 'GOM.GOMX',
    fieldName: 'Gulf of Mexico Exploration',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'General Gulf of Mexico exploration areas'
  },

  'GOM.ThunderHorse': {
    assetCode: 'GOM.ThunderHorse',
    fieldName: 'Thunder Horse',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'Major Mississippi Canyon production hub'
  },

  'GOM.Argos': {
    assetCode: 'GOM.Argos',
    fieldName: 'Argos',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'Green Canyon field development'
  },

  'GOM.Mad Dog': {
    assetCode: 'GOM.Mad Dog',
    fieldName: 'Mad Dog',
    region: 'GOM',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Low'
    },
    operationalNotes: 'Green Canyon production and drilling field'
  },

  // ====================== LONG TRANSIT FIELDS (~24 hrs) ======================

  'GOM.Paleogene': {
    assetCode: 'GOM.Paleogene',
    fieldName: 'Paleogene',
    region: 'GOM',
    transitCategory: 'LONG',
    approximateTransitHours: 24,
    vesselDeliveriesPerMonth: 4.9,
    characteristics: {
      weatherExposure: 'High',
      operationalComplexity: 'Complex',
      fuelEfficiencyImpact: 1.4,
      crewRotationImpact: 'High'
    },
    operationalNotes: 'Deep water Paleogene formation - extended transit required'
  },

  'GOM.Tiber': {
    assetCode: 'GOM.Tiber',
    fieldName: 'Tiber',
    region: 'GOM',
    transitCategory: 'LONG',
    approximateTransitHours: 24,
    vesselDeliveriesPerMonth: 4.9,
    characteristics: {
      weatherExposure: 'High',
      operationalComplexity: 'Complex',
      fuelEfficiencyImpact: 1.4,
      crewRotationImpact: 'High'
    },
    operationalNotes: 'Ultra-deep water exploration - challenging access'
  },

  // Handle specific Kaskida field (seen in CSV data) - appears to be Paleogene-related
  'GOM.Kaskida': {
    assetCode: 'GOM.Kaskida',
    fieldName: 'Kaskida',
    region: 'GOM',
    transitCategory: 'LONG',
    approximateTransitHours: 24,
    vesselDeliveriesPerMonth: 4.9,
    characteristics: {
      weatherExposure: 'High',
      operationalComplexity: 'Complex',
      fuelEfficiencyImpact: 1.4,
      crewRotationImpact: 'High'
    },
    operationalNotes: 'Deep water Paleogene development - extended transit'
  }
};

/**
 * Calculate vessel capacity for a specific location
 */
export function calculateLocationVesselCapacity(
  assetCode: string,
  vesselCount: number = 1,
  monthlyAdjustment: number = 1.0
): number {
  const profile = getLocationProfile(assetCode);
  return profile.vesselDeliveriesPerMonth * vesselCount * monthlyAdjustment;
}

/**
 * Get location profile with fallback logic
 */
export function getLocationProfile(assetCode: string): LocationCapabilityProfile {
  const normalizedCode = assetCode?.trim();
  
  // Direct match
  if (normalizedCode && LOCATION_CAPABILITY_PROFILES[normalizedCode]) {
    return LOCATION_CAPABILITY_PROFILES[normalizedCode];
  }
  
  // Pattern-based matching for unknown assets
  const fallbackProfile = determineLocationFallback(normalizedCode);
  
  if (fallbackProfile) {
    console.warn(`⚠️  Unknown asset code: ${normalizedCode}, using fallback: ${fallbackProfile.transitCategory} transit`);
    return fallbackProfile;
  }
  
  // Final fallback to short transit
  const defaultProfile: LocationCapabilityProfile = {
    assetCode: normalizedCode || 'UNKNOWN',
    fieldName: `Unknown Field (${normalizedCode})`,
    region: 'OTHER',
    transitCategory: 'SHORT',
    approximateTransitHours: 13,
    vesselDeliveriesPerMonth: 6.5,
    characteristics: {
      weatherExposure: 'Medium',
      operationalComplexity: 'Standard',
      fuelEfficiencyImpact: 1.0,
      crewRotationImpact: 'Medium'
    },
    operationalNotes: 'Unknown asset - assuming short transit default'
  };
  
  console.warn(`⚠️  Unknown asset code: ${normalizedCode}, using default SHORT transit profile`);
  return defaultProfile;
}

/**
 * Determine fallback profile based on asset code patterns
 */
function determineLocationFallback(assetCode?: string): LocationCapabilityProfile | null {
  if (!assetCode) return null;
  
  const code = assetCode.toUpperCase();
  
  // Paleogene-related patterns indicate long transit
  if (code.includes('PALEOGENE') || code.includes('TIBER') || code.includes('KASKIDA')) {
    return {
      assetCode: assetCode,
      fieldName: `Deep Water Field (${assetCode})`,
      region: 'GOM',
      transitCategory: 'LONG',
      approximateTransitHours: 24,
      vesselDeliveriesPerMonth: 4.9,
      characteristics: {
        weatherExposure: 'High',
        operationalComplexity: 'Complex',
        fuelEfficiencyImpact: 1.4,
        crewRotationImpact: 'High'
      },
      operationalNotes: 'Deep water asset - long transit assumed'
    };
  }
  
  // GOM patterns generally indicate short transit
  if (code.startsWith('GOM.')) {
    return {
      assetCode: assetCode,
      fieldName: `GOM Field (${assetCode})`,
      region: 'GOM',
      transitCategory: 'SHORT',
      approximateTransitHours: 13,
      vesselDeliveriesPerMonth: 6.5,
      characteristics: {
        weatherExposure: 'Medium',
        operationalComplexity: 'Standard',
        fuelEfficiencyImpact: 1.0,
        crewRotationImpact: 'Low'
      },
      operationalNotes: 'GOM asset - short transit assumed'
    };
  }
  
  return null;
}

/**
 * Get all defined asset codes for validation
 */
export function getDefinedAssetCodes(): string[] {
  return Object.keys(LOCATION_CAPABILITY_PROFILES);
}

/**
 * Categorize asset by transit type
 */
export function getAssetsByTransitCategory(): {shortTransit: string[], longTransit: string[]} {
  const profiles = Object.values(LOCATION_CAPABILITY_PROFILES);
  
  return {
    shortTransit: profiles.filter(p => p.transitCategory === 'SHORT').map(p => p.assetCode),
    longTransit: profiles.filter(p => p.transitCategory === 'LONG').map(p => p.assetCode)
  };
}

/**
 * Calculate vessel efficiency impact for location
 */
export function calculateVesselEfficiencyImpact(
  assetCode: string,
  baseVesselCount: number
): {
  effectiveCapacity: number;
  efficiencyPenalty: number;
  transitHours: number;
  fuelCostMultiplier: number;
} {
  const profile = getLocationProfile(assetCode);
  
  const baseCapacity = VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth * baseVesselCount;
  const effectiveCapacity = profile.vesselDeliveriesPerMonth * baseVesselCount;
  const efficiencyPenalty = (baseCapacity - effectiveCapacity) / baseCapacity;
  
  return {
    effectiveCapacity,
    efficiencyPenalty,
    transitHours: profile.approximateTransitHours,
    fuelCostMultiplier: profile.characteristics.fuelEfficiencyImpact
  };
}

/**
 * Get location capability summary statistics
 */
export function getLocationCapabilitySummary() {
  const profiles = Object.values(LOCATION_CAPABILITY_PROFILES);
  const shortTransit = profiles.filter(p => p.transitCategory === 'SHORT');
  const longTransit = profiles.filter(p => p.transitCategory === 'LONG');
  
  return {
    totalLocations: profiles.length,
    shortTransitLocations: shortTransit.length,
    longTransitLocations: longTransit.length,
    capacityRange: {
      min: Math.min(...profiles.map(p => p.vesselDeliveriesPerMonth)),
      max: Math.max(...profiles.map(p => p.vesselDeliveriesPerMonth)),
      shortTransitAvg: shortTransit.reduce((sum, p) => sum + p.vesselDeliveriesPerMonth, 0) / shortTransit.length,
      longTransitAvg: longTransit.reduce((sum, p) => sum + p.vesselDeliveriesPerMonth, 0) / longTransit.length
    },
    transitHours: {
      short: VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.transitHours,
      long: VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.transitHours
    },
    capacityImpact: {
      shortTransitDeliveries: VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth,
      longTransitDeliveries: VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.deliveriesPerMonth,
      capacityReduction: (VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth - 
                          VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.deliveriesPerMonth) / 
                          VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth * 100
    }
  };
}

/**
 * Validate asset code exists or can be mapped
 */
export function isValidAssetCode(assetCode: string): boolean {
  if (!assetCode) return false;
  
  // Direct match
  if (LOCATION_CAPABILITY_PROFILES[assetCode]) return true;
  
  // Pattern match
  return determineLocationFallback(assetCode) !== null;
}