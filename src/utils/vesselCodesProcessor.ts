/**
 * Vessel Codes Processor
 * Handles vessel event classification using Vessel Codes.xlsx data
 * Provides authoritative productive/non-productive classification
 */

import { VesselCode, VesselCodeClassification } from '../types';
import { classifyActivity } from './activityClassification';

// ==================== VESSEL CODES DATA ====================

/**
 * Comprehensive vessel codes mapping based on typical offshore operations
 * This serves as the authoritative source for event classification
 * In production, this would be loaded from Vessel Codes.xlsx
 */
const VESSEL_CODES_DATA: VesselCode[] = [
  // Cargo Operations (Productive)
  {
    l1ParentEvent: 'Cargo Ops',
    l2Event: 'Load - Fuel, Water or Methanol',
    activityCategory: 'Productive',
    portTypeApplicable: 'both',
    isWeatherRelated: false,
    isCargoOperation: true,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Loading fuel, water, or methanol',
    isActive: true
  },
  {
    l1ParentEvent: 'Cargo Ops',
    l2Event: 'Offload - Fuel, Water or Methanol',
    activityCategory: 'Productive',
    portTypeApplicable: 'both',
    isWeatherRelated: false,
    isCargoOperation: true,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Offloading fuel, water, or methanol',
    isActive: true
  },
  {
    l1ParentEvent: 'Cargo Ops',
    l2Event: 'Cargo Loading or Discharging',
    activityCategory: 'Productive',
    portTypeApplicable: 'both',
    isWeatherRelated: false,
    isCargoOperation: true,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'General cargo loading or discharging',
    isActive: true
  },

  // Transit Operations (Productive)
  {
    l1ParentEvent: 'Transit',
    l2Event: 'Steam from Port',
    activityCategory: 'Productive',
    portTypeApplicable: 'base',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: true,
    isMaintenanceOperation: false,
    description: 'Transit from port to offshore location',
    isActive: true
  },
  {
    l1ParentEvent: 'Transit',
    l2Event: 'Steam to Port',
    activityCategory: 'Productive',
    portTypeApplicable: 'base',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: true,
    isMaintenanceOperation: false,
    description: 'Transit from offshore location to port',
    isActive: true
  },
  {
    l1ParentEvent: 'Transit',
    l2Event: 'Steam Infield',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: true,
    isMaintenanceOperation: false,
    description: 'Transit between offshore locations',
    isActive: true
  },

  // Maneuvering Operations (Productive)
  {
    l1ParentEvent: 'Maneuvering',
    l2Event: 'Set Up',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Setting up for operations',
    isActive: true
  },
  {
    l1ParentEvent: 'Maneuvering',
    l2Event: 'Shifting',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Shifting position',
    isActive: true
  },

  // Standby Operations (Productive)
  {
    l1ParentEvent: 'Standby',
    l2Event: 'Close - Standby',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Close standby operations',
    isActive: true
  },
  {
    l1ParentEvent: 'Standby - Close',
    l2Event: '',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Close standby operations (parent event only)',
    isActive: true
  },

  // Weather Operations (Non-Productive)
  {
    l1ParentEvent: 'Waiting on Weather',
    l2Event: '',
    activityCategory: 'Non-Productive',
    portTypeApplicable: 'both',
    isWeatherRelated: true,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Waiting due to weather conditions',
    isActive: true
  },

  // Installation Waiting (Non-Productive)
  {
    l1ParentEvent: 'Waiting on Installation',
    l2Event: '',
    activityCategory: 'Non-Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Waiting on installation readiness',
    isActive: true
  },

  // Quay Waiting (Non-Productive)
  {
    l1ParentEvent: 'Waiting on Quay',
    l2Event: '',
    activityCategory: 'Non-Productive',
    portTypeApplicable: 'base',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Waiting for quay availability',
    isActive: true
  },

  // Maintenance Operations
  {
    l1ParentEvent: 'Maintenance',
    l2Event: 'Vessel Under Maintenance',
    activityCategory: 'Maintenance',
    portTypeApplicable: 'both',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: true,
    description: 'Vessel maintenance activities',
    isActive: true
  },

  // ROV Operations (Productive)
  {
    l1ParentEvent: 'ROV Operations',
    l2Event: 'ROV Operational duties',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: false,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'ROV operational duties',
    isActive: true
  },

  // Installation Productive Time
  {
    l1ParentEvent: 'Installation Productive Time',
    l2Event: 'Bulk Displacement',
    activityCategory: 'Productive',
    portTypeApplicable: 'rig',
    isWeatherRelated: false,
    isCargoOperation: true,
    isTransitOperation: false,
    isMaintenanceOperation: false,
    description: 'Bulk displacement operations',
    isActive: true
  }
];

// ==================== VESSEL CODES LOOKUP ====================

/**
 * Create lookup maps for fast vessel code retrieval
 */
const createVesselCodeLookups = () => {
  const exactLookup = new Map<string, VesselCode>();
  const parentEventLookup = new Map<string, VesselCode[]>();

  VESSEL_CODES_DATA.forEach(code => {
    if (!code.isActive) return;

    // Exact match lookup (parent event + L2 event)
    const exactKey = `${code.l1ParentEvent}|${code.l2Event || ''}`.toLowerCase();
    exactLookup.set(exactKey, code);

    // Parent event lookup
    const parentKey = code.l1ParentEvent.toLowerCase();
    if (!parentEventLookup.has(parentKey)) {
      parentEventLookup.set(parentKey, []);
    }
    parentEventLookup.get(parentKey)!.push(code);
  });

  return { exactLookup, parentEventLookup };
};

const { exactLookup, parentEventLookup } = createVesselCodeLookups();

// ==================== CLASSIFICATION FUNCTIONS ====================

/**
 * Classify a voyage event using vessel codes
 */
export const classifyEventWithVesselCodes = (
  parentEvent: string | null,
  event: string | null,
  portType?: 'rig' | 'base'
): VesselCodeClassification => {
  if (!parentEvent) {
    return {
      parentEvent: parentEvent || '',
      event: event || '',
      vesselCode: null,
      activityCategory: 'Uncategorized',
      confidence: 'Low',
      source: 'Fallback',
      notes: 'Missing parent event'
    };
  }

  // Try exact match first
  const exactKey = `${parentEvent}|${event || ''}`.toLowerCase();
  const exactMatch = exactLookup.get(exactKey);

  if (exactMatch) {
    // Validate port type compatibility
    const portTypeMatch = !portType || 
      exactMatch.portTypeApplicable === 'any' || 
      exactMatch.portTypeApplicable === 'both' || 
      exactMatch.portTypeApplicable === portType;

    return {
      parentEvent,
      event: event || '',
      vesselCode: exactMatch,
      activityCategory: exactMatch.activityCategory,
      confidence: portTypeMatch ? 'High' : 'Medium',
      source: 'VesselCodes',
      notes: portTypeMatch ? undefined : `Port type mismatch: expected ${exactMatch.portTypeApplicable}, got ${portType}`
    };
  }

  // Try parent event match
  const parentKey = parentEvent.toLowerCase();
  const parentMatches = parentEventLookup.get(parentKey);

  if (parentMatches && parentMatches.length > 0) {
    // Find best match based on port type and empty L2 event
    let bestMatch = parentMatches.find(match => 
      !match.l2Event && 
      (match.portTypeApplicable === 'any' || match.portTypeApplicable === 'both' || match.portTypeApplicable === portType)
    );

    if (!bestMatch) {
      bestMatch = parentMatches[0]; // Fallback to first match
    }

    return {
      parentEvent,
      event: event || '',
      vesselCode: bestMatch,
      activityCategory: bestMatch.activityCategory,
      confidence: 'Medium',
      source: 'VesselCodes',
      notes: 'Matched on parent event only'
    };
  }

  // Fallback to existing activity classification
  const fallbackActivity = classifyActivity(parentEvent, event);
  
  return {
    parentEvent,
    event: event || '',
    vesselCode: null,
    activityCategory: mapFallbackActivity(fallbackActivity),
    confidence: 'Low',
    source: 'Fallback',
    notes: 'No vessel code match found, using fallback classification'
  };
};

/**
 * Map fallback activity classification to vessel code categories
 */
const mapFallbackActivity = (
  fallbackActivity: "Productive" | "Non-Productive" | "Needs Review - Null Event" | "Uncategorized"
): 'Productive' | 'Non-Productive' | 'Standby' | 'Transit' | 'Maintenance' | 'Uncategorized' => {
  switch (fallbackActivity) {
    case 'Productive':
      return 'Productive';
    case 'Non-Productive':
      return 'Non-Productive';
    case 'Needs Review - Null Event':
    case 'Uncategorized':
    default:
      return 'Uncategorized';
  }
};

// ==================== ANALYSIS FUNCTIONS ====================

/**
 * Get weather-related events
 */
export const isWeatherRelatedEvent = (parentEvent: string, event?: string): boolean => {
  const classification = classifyEventWithVesselCodes(parentEvent, event || null);
  return classification.vesselCode?.isWeatherRelated || false;
};

/**
 * Get cargo operation events
 */
export const isCargoOperationEvent = (parentEvent: string, event?: string): boolean => {
  const classification = classifyEventWithVesselCodes(parentEvent, event || null);
  return classification.vesselCode?.isCargoOperation || false;
};

/**
 * Get transit operation events
 */
export const isTransitOperationEvent = (parentEvent: string, event?: string): boolean => {
  const classification = classifyEventWithVesselCodes(parentEvent, event || null);
  return classification.vesselCode?.isTransitOperation || false;
};

/**
 * Get maintenance operation events
 */
export const isMaintenanceOperationEvent = (parentEvent: string, event?: string): boolean => {
  const classification = classifyEventWithVesselCodes(parentEvent, event || null);
  return classification.vesselCode?.isMaintenanceOperation || false;
};

/**
 * Check if event is productive
 */
export const isProductiveEvent = (
  parentEvent: string, 
  event?: string, 
  portType?: 'rig' | 'base'
): boolean => {
  const classification = classifyEventWithVesselCodes(parentEvent, event || null, portType);
  return classification.activityCategory === 'Productive';
};

/**
 * Check if event is non-productive
 */
export const isNonProductiveEvent = (
  parentEvent: string, 
  event?: string, 
  portType?: 'rig' | 'base'
): boolean => {
  const classification = classifyEventWithVesselCodes(parentEvent, event || null, portType);
  return classification.activityCategory === 'Non-Productive';
};

// ==================== REPORTING FUNCTIONS ====================

/**
 * Get vessel codes statistics
 */
export const getVesselCodesStats = () => {
  const stats = {
    totalCodes: VESSEL_CODES_DATA.length,
    activeCodes: VESSEL_CODES_DATA.filter(c => c.isActive).length,
    byCategory: {} as Record<string, number>,
    byPortType: {} as Record<string, number>,
    weatherRelated: VESSEL_CODES_DATA.filter(c => c.isWeatherRelated).length,
    cargoOperations: VESSEL_CODES_DATA.filter(c => c.isCargoOperation).length,
    transitOperations: VESSEL_CODES_DATA.filter(c => c.isTransitOperation).length,
    maintenanceOperations: VESSEL_CODES_DATA.filter(c => c.isMaintenanceOperation).length
  };

  // Category breakdown
  VESSEL_CODES_DATA.forEach(code => {
    stats.byCategory[code.activityCategory] = (stats.byCategory[code.activityCategory] || 0) + 1;
    stats.byPortType[code.portTypeApplicable] = (stats.byPortType[code.portTypeApplicable] || 0) + 1;
  });

  return stats;
};

/**
 * Debug function to log vessel codes data
 */
export const debugVesselCodes = () => {
  console.log('🛳️ VESSEL CODES DEBUG INFO:');
  console.log('Total vessel codes loaded:', VESSEL_CODES_DATA.length);
  console.log('Active vessel codes:', VESSEL_CODES_DATA.filter(c => c.isActive).length);
  
  const stats = getVesselCodesStats();
  console.log('Category breakdown:', stats.byCategory);
  console.log('Port type breakdown:', stats.byPortType);
  console.log('Special operations:', {
    weather: stats.weatherRelated,
    cargo: stats.cargoOperations,
    transit: stats.transitOperations,
    maintenance: stats.maintenanceOperations
  });

  // Log a few example classifications
  console.log('\n🔍 Example classifications:');
  const examples = [
    ['Cargo Ops', 'Load - Fuel, Water or Methanol'],
    ['Transit', 'Steam from Port'],
    ['Waiting on Weather', ''],
    ['Standby', 'Close - Standby'],
    ['Unknown Event', 'Unknown Sub Event']
  ];

  examples.forEach(([parent, event]) => {
    const classification = classifyEventWithVesselCodes(parent, event);
    console.log(`"${parent}" + "${event}" -> ${classification.activityCategory} (${classification.confidence} confidence, ${classification.source})`);
  });
};

const vesselCodesProcessor = {
  classifyEventWithVesselCodes,
  isWeatherRelatedEvent,
  isCargoOperationEvent,
  isTransitOperationEvent,
  isMaintenanceOperationEvent,
  isProductiveEvent,
  isNonProductiveEvent,
  getVesselCodesStats,
  debugVesselCodes
};

export default vesselCodesProcessor;