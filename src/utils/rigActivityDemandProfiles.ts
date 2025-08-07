/**
 * Rig Activity Demand Profiles
 * 
 * Maps rig activity types from GWDXAG-Rig Activity Type column to vessel demand characteristics.
 * Each activity type has different vessel support requirements based on operational complexity,
 * material needs, and logistics intensity.
 * 
 * Base assumption: 8.2 deliveries per active rig per month (user provided baseline)
 */

export interface RigActivityProfile {
  code: string;
  name: string;
  description: string;
  demandFactor: number; // Multiplier applied to base 8.2 deliveries/rig/month
  characteristics: {
    logisticsIntensity: 'Low' | 'Medium' | 'High' | 'Critical';
    materialVolume: 'Low' | 'Medium' | 'High';
    frequencyPattern: 'Steady' | 'Front-loaded' | 'Back-loaded' | 'Minimal';
    weatherSensitivity: 'Low' | 'Medium' | 'High';
  };
  typicalDuration: {
    min: number; // days
    max: number; // days  
    average: number; // days
  };
  vesselSupport: {
    criticalWindowDays?: number; // Days requiring intensive vessel support
    sustainedSupport: boolean; // Whether support is needed throughout duration
    fluidIntensive: boolean; // High drilling fluid / completion fluid requirements
  };
}

// Base rig demand rate (deliveries per rig per month)
export const BASE_RIG_DEMAND_RATE = 8.2;

/**
 * Rig Activity Type Demand Profiles
 * Based on BP Gulf of Mexico drilling and completion operations
 */
export const RIG_ACTIVITY_PROFILES: Record<string, RigActivityProfile> = {
  'RSU': {
    code: 'RSU',
    name: 'Rig Start Up',
    description: 'Initial rig mobilization, setup, and commissioning activities',
    demandFactor: 0.6, // Moderate initial setup demand
    characteristics: {
      logisticsIntensity: 'High',
      materialVolume: 'High',
      frequencyPattern: 'Front-loaded',
      weatherSensitivity: 'Medium'
    },
    typicalDuration: { min: 7, max: 21, average: 14 },
    vesselSupport: {
      criticalWindowDays: 7, // First week most critical
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'DRL': {
    code: 'DRL',
    name: 'Drill',
    description: 'Active drilling operations requiring continuous vessel support',
    demandFactor: 1.0, // Full baseline demand - most intensive phase
    characteristics: {
      logisticsIntensity: 'Critical',
      materialVolume: 'High',
      frequencyPattern: 'Steady',
      weatherSensitivity: 'High'
    },
    typicalDuration: { min: 30, max: 120, average: 65 },
    vesselSupport: {
      sustainedSupport: true,
      fluidIntensive: true
    }
  },

  'CPL': {
    code: 'CPL', 
    name: 'Completion',
    description: 'Well completion activities including equipment installation and testing',
    demandFactor: 0.8, // High demand but slightly less than drilling
    characteristics: {
      logisticsIntensity: 'High',
      materialVolume: 'High',
      frequencyPattern: 'Steady',
      weatherSensitivity: 'High'
    },
    typicalDuration: { min: 21, max: 70, average: 45 },
    vesselSupport: {
      sustainedSupport: true,
      fluidIntensive: true
    }
  },

  'RM': {
    code: 'RM',
    name: 'Rig Maintenance', 
    description: 'Scheduled or unscheduled rig maintenance activities',
    demandFactor: 0.2, // Minimal vessel support needed
    characteristics: {
      logisticsIntensity: 'Low',
      materialVolume: 'Low',
      frequencyPattern: 'Front-loaded',
      weatherSensitivity: 'Low'
    },
    typicalDuration: { min: 3, max: 14, average: 7 },
    vesselSupport: {
      criticalWindowDays: 2, // Initial supply delivery
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'WS': {
    code: 'WS',
    name: 'White Space',
    description: 'Planned downtime, standby periods, or transition phases',
    demandFactor: 0.0, // No active vessel support required
    characteristics: {
      logisticsIntensity: 'Low',
      materialVolume: 'Low', 
      frequencyPattern: 'Minimal',
      weatherSensitivity: 'Low'
    },
    typicalDuration: { min: 1, max: 30, average: 7 },
    vesselSupport: {
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'P&A': {
    code: 'P&A',
    name: 'Plug & Abandon',
    description: 'Well abandonment operations including cement plugging and equipment removal',
    demandFactor: 0.4, // Moderate demand for specialized equipment
    characteristics: {
      logisticsIntensity: 'Medium',
      materialVolume: 'Medium',
      frequencyPattern: 'Front-loaded',
      weatherSensitivity: 'Medium'
    },
    typicalDuration: { min: 7, max: 21, average: 14 },
    vesselSupport: {
      criticalWindowDays: 5, // Initial cement and equipment delivery
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'WWP': {
    code: 'WWP',
    name: 'Well Work Production',
    description: 'Production-related well work and optimization activities',
    demandFactor: 0.3, // Light to moderate vessel support
    characteristics: {
      logisticsIntensity: 'Medium',
      materialVolume: 'Medium',
      frequencyPattern: 'Steady',
      weatherSensitivity: 'Medium'
    },
    typicalDuration: { min: 3, max: 14, average: 7 },
    vesselSupport: {
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'MOB': {
    code: 'MOB', 
    name: 'Mobilization',
    description: 'Rig mobilization between locations or contract transitions',
    demandFactor: 0.5, // Moderate demand for equipment transfer
    characteristics: {
      logisticsIntensity: 'High',
      materialVolume: 'Medium',
      frequencyPattern: 'Front-loaded',
      weatherSensitivity: 'High'
    },
    typicalDuration: { min: 2, max: 10, average: 5 },
    vesselSupport: {
      criticalWindowDays: 3, // Peak mobilization period
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'WWI': {
    code: 'WWI',
    name: 'Well Work Intervention',
    description: 'Intervention activities for existing wells including workovers and repairs',
    demandFactor: 0.4, // Moderate demand similar to P&A
    characteristics: {
      logisticsIntensity: 'Medium',
      materialVolume: 'Medium',
      frequencyPattern: 'Steady',
      weatherSensitivity: 'Medium'
    },
    typicalDuration: { min: 5, max: 21, average: 12 },
    vesselSupport: {
      sustainedSupport: false,
      fluidIntensive: false
    }
  },

  'TAR': {
    code: 'TAR',
    name: 'Turnaround',
    description: 'Major maintenance turnaround activities requiring comprehensive support',
    demandFactor: 0.7, // High demand for major maintenance logistics
    characteristics: {
      logisticsIntensity: 'High',
      materialVolume: 'High', 
      frequencyPattern: 'Front-loaded',
      weatherSensitivity: 'Medium'
    },
    typicalDuration: { min: 14, max: 42, average: 28 },
    vesselSupport: {
      criticalWindowDays: 10, // Initial intensive support period
      sustainedSupport: true,
      fluidIntensive: false
    }
  },

  // Handle alternative naming that might appear in data
  'WOW': {
    code: 'WOW',
    name: 'Wait on Weather/White Space',
    description: 'Weather delays or other waiting periods - maps to White Space',
    demandFactor: 0.0, // No active vessel support required
    characteristics: {
      logisticsIntensity: 'Low',
      materialVolume: 'Low',
      frequencyPattern: 'Minimal',
      weatherSensitivity: 'Low'
    },
    typicalDuration: { min: 1, max: 30, average: 7 },
    vesselSupport: {
      sustainedSupport: false,
      fluidIntensive: false
    }
  }
};

/**
 * Calculate monthly vessel demand for a specific activity
 */
export function calculateActivityDemand(
  activityType: string,
  durationDays: number,
  monthlyRigCount: number = 1
): number {
  const profile = getActivityProfile(activityType);
  const monthlyDemandPerRig = BASE_RIG_DEMAND_RATE * profile.demandFactor;
  
  // Adjust for activity duration if less than full month
  const durationAdjustment = Math.min(durationDays / 30, 1.0);
  
  return monthlyDemandPerRig * monthlyRigCount * durationAdjustment;
}

/**
 * Get activity profile with fallback to default
 */
export function getActivityProfile(activityType: string): RigActivityProfile {
  const normalizedType = activityType?.toUpperCase()?.trim() || 'UNKNOWN';
  
  // Direct match
  if (RIG_ACTIVITY_PROFILES[normalizedType]) {
    return RIG_ACTIVITY_PROFILES[normalizedType];
  }
  
  // Fallback for unknown activity types - assume moderate drilling-like demand
  const defaultProfile: RigActivityProfile = {
    code: normalizedType,
    name: `Unknown Activity (${normalizedType})`,
    description: `Unmapped activity type, assuming moderate vessel demand`,
    demandFactor: 0.5, // Conservative estimate
    characteristics: {
      logisticsIntensity: 'Medium',
      materialVolume: 'Medium',
      frequencyPattern: 'Steady',
      weatherSensitivity: 'Medium'
    },
    typicalDuration: { min: 7, max: 30, average: 14 },
    vesselSupport: {
      sustainedSupport: true,
      fluidIntensive: false
    }
  };
  
  console.warn(`⚠️  Unknown rig activity type: ${normalizedType}, using default profile`);
  return defaultProfile;
}

/**
 * Get all defined activity types for validation
 */
export function getDefinedActivityTypes(): string[] {
  return Object.keys(RIG_ACTIVITY_PROFILES);
}

/**
 * Validate activity type exists
 */
export function isValidActivityType(activityType: string): boolean {
  const normalizedType = activityType?.toUpperCase()?.trim();
  return normalizedType ? RIG_ACTIVITY_PROFILES.hasOwnProperty(normalizedType) : false;
}

/**
 * Get summary statistics for activity demand profiles
 */
export function getActivityDemandSummary() {
  const profiles = Object.values(RIG_ACTIVITY_PROFILES);
  
  return {
    totalActivityTypes: profiles.length,
    demandFactorRange: {
      min: Math.min(...profiles.map(p => p.demandFactor)),
      max: Math.max(...profiles.map(p => p.demandFactor)),
      average: profiles.reduce((sum, p) => sum + p.demandFactor, 0) / profiles.length
    },
    highDemandActivities: profiles.filter(p => p.demandFactor >= 0.7).map(p => p.code),
    lowDemandActivities: profiles.filter(p => p.demandFactor <= 0.2).map(p => p.code),
    fluidIntensiveActivities: profiles.filter(p => p.vesselSupport.fluidIntensive).map(p => p.code)
  };
}