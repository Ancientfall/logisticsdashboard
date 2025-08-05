/**
 * Vessel Codes Processor - Enhanced L1/L2 Event Classification System
 * 
 * Handles vessel event classification using Vessel Codes.xlsx data with:
 * - L1 Parent Event (primary classification)
 * - L2 Event (detailed classification)  
 * - Activity categorization (Productive/Non-Productive/etc.)
 * - Port type applicability and operational context
 * - Integration with cost allocation validation
 */

import { VesselCode, VesselCodeClassification, VoyageEvent } from '../types';
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

// ==================== ENHANCED FUNCTIONS FOR VESSEL REQUIREMENT CALCULATOR ====================

/**
 * Enhanced vessel codes database structure for integration with cost allocation
 */
export interface VesselCodesDatabase {
  codes: Map<string, VesselCode>; // Key: "L1_PARENT_EVENT|L2_EVENT"
  l1Events: Set<string>;
  l2Events: Set<string>;
  productiveCodes: VesselCode[];
  nonProductiveCodes: VesselCode[];
  weatherRelatedCodes: VesselCode[];
  cargoOperationCodes: VesselCode[];
  transitOperationCodes: VesselCode[];
  maintenanceOperationCodes: VesselCode[];
}

/**
 * Create enhanced vessel codes database from existing data
 */
export const createVesselCodesDatabase = (vesselCodes: VesselCode[] = VESSEL_CODES_DATA): VesselCodesDatabase => {
  const database: VesselCodesDatabase = {
    codes: new Map(),
    l1Events: new Set(),
    l2Events: new Set(),
    productiveCodes: [],
    nonProductiveCodes: [],
    weatherRelatedCodes: [],
    cargoOperationCodes: [],
    transitOperationCodes: [],
    maintenanceOperationCodes: []
  };

  vesselCodes.forEach(code => {
    if (!code.isActive) return;

    // Create composite key for lookup
    const key = `${code.l1ParentEvent.toUpperCase()}|${(code.l2Event || '').toUpperCase()}`;
    database.codes.set(key, code);

    // Track unique events
    database.l1Events.add(code.l1ParentEvent.toUpperCase());
    if (code.l2Event) {
      database.l2Events.add(code.l2Event.toUpperCase());
    }

    // Categorize codes
    switch (code.activityCategory) {
      case 'Productive':
        database.productiveCodes.push(code);
        break;
      case 'Non-Productive':
        database.nonProductiveCodes.push(code);
        break;
      case 'Maintenance':
        database.maintenanceOperationCodes.push(code);
        break;
    }

    // Special classifications
    if (code.isWeatherRelated) {
      database.weatherRelatedCodes.push(code);
    }
    if (code.isCargoOperation) {
      database.cargoOperationCodes.push(code);
    }
    if (code.isTransitOperation) {
      database.transitOperationCodes.push(code);
    }
    if (code.isMaintenanceOperation) {
      database.maintenanceOperationCodes.push(code);
    }
  });

  console.log(`🚢 Vessel Codes Database Created:`);
  console.log(`  Total codes: ${database.codes.size}`);
  console.log(`  L1 events: ${database.l1Events.size}`);
  console.log(`  L2 events: ${database.l2Events.size}`);
  console.log(`  Productive codes: ${database.productiveCodes.length}`);
  console.log(`  Non-productive codes: ${database.nonProductiveCodes.length}`);
  console.log(`  Weather-related codes: ${database.weatherRelatedCodes.length}`);
  console.log(`  Cargo operation codes: ${database.cargoOperationCodes.length}`);

  return database;
};

/**
 * Batch classify multiple voyage events using enhanced database
 */
export const batchClassifyVoyageEvents = (
  events: VoyageEvent[],
  database: VesselCodesDatabase
): VesselCodeClassification[] => {
  console.log(`🔍 Classifying ${events.length} voyage events using vessel codes...`);
  
  const classifications = events.map(event => {
    // Use existing function but enhance with database lookup
    const baseClassification = classifyEventWithVesselCodes(
      event.parentEvent, 
      event.event || null, 
      event.portType
    );

    // Enhance with database lookup for better matching
    const parentEvent = event.parentEvent.toUpperCase();
    const eventName = (event.event || '').toUpperCase();
    const exactKey = `${parentEvent}|${eventName}`;
    const parentOnlyKey = `${parentEvent}|`;
    
    const exactMatch = database.codes.get(exactKey);
    const parentMatch = database.codes.get(parentOnlyKey);
    
    if (exactMatch) {
      return {
        ...baseClassification,
        vesselCode: exactMatch,
        activityCategory: exactMatch.activityCategory,
        confidence: 'High' as const,
        source: 'VesselCodes' as const,
        notes: 'Enhanced exact L1/L2 match found'
      };
    } else if (parentMatch) {
      return {
        ...baseClassification,
        vesselCode: parentMatch,
        activityCategory: parentMatch.activityCategory,
        confidence: 'Medium' as const,
        source: 'VesselCodes' as const,
        notes: 'Enhanced L1 parent match found'
      };
    }
    
    return baseClassification;
  });
  
  // Generate enhanced statistics
  const stats = {
    total: classifications.length,
    exact: classifications.filter(c => c.confidence === 'High' && c.source === 'VesselCodes').length,
    fuzzy: classifications.filter(c => c.confidence === 'Medium' && c.source === 'VesselCodes').length,
    fallback: classifications.filter(c => c.source === 'Fallback').length,
    productive: classifications.filter(c => c.activityCategory === 'Productive').length,
    nonProductive: classifications.filter(c => c.activityCategory === 'Non-Productive').length,
    maintenance: classifications.filter(c => c.activityCategory === 'Maintenance').length,
    uncategorized: classifications.filter(c => c.activityCategory === 'Uncategorized').length
  };
  
  console.log('📊 Enhanced Classification Statistics:');
  console.log(`  Exact matches: ${stats.exact} (${(stats.exact/stats.total*100).toFixed(1)}%)`);
  console.log(`  Fuzzy matches: ${stats.fuzzy} (${(stats.fuzzy/stats.total*100).toFixed(1)}%)`);
  console.log(`  Fallback classifications: ${stats.fallback} (${(stats.fallback/stats.total*100).toFixed(1)}%)`);
  console.log(`  Productive: ${stats.productive} (${(stats.productive/stats.total*100).toFixed(1)}%)`);
  console.log(`  Non-Productive: ${stats.nonProductive} (${(stats.nonProductive/stats.total*100).toFixed(1)}%)`);
  console.log(`  Maintenance: ${stats.maintenance} (${(stats.maintenance/stats.total*100).toFixed(1)}%)`);
  console.log(`  Uncategorized: ${stats.uncategorized} (${(stats.uncategorized/stats.total*100).toFixed(1)}%)`);
  
  return classifications;
};

/**
 * Filter events for drilling operations using vessel codes + cost allocation
 */
export const filterEventsForDrillingOperations = (
  events: VoyageEvent[],
  classifications: VesselCodeClassification[],
  excludeWeatherRelated: boolean = true,
  includeTransitTime: boolean = true
): { events: VoyageEvent[]; classifications: VesselCodeClassification[] } => {
  
  const filteredIndices: number[] = [];
  
  events.forEach((event, index) => {
    const classification = classifications[index];
    let include = true;
    
    // Exclude weather-related if requested
    if (excludeWeatherRelated && classification.vesselCode?.isWeatherRelated) {
      include = false;
    }
    
    // Include productive operations
    if (classification.activityCategory === 'Productive') {
      include = true;
    }
    
    // Include transit time if requested
    if (includeTransitTime && classification.vesselCode?.isTransitOperation) {
      include = true;
    }
    
    // Filter by port type (rig operations for drilling)
    if (event.portType !== 'rig' && !classification.vesselCode?.isTransitOperation) {
      include = false;
    }
    
    if (include) {
      filteredIndices.push(index);
    }
  });
  
  return {
    events: filteredIndices.map(i => events[i]),
    classifications: filteredIndices.map(i => classifications[i])
  };
};

/**
 * Calculate productive hours using vessel codes classification
 */
export const calculateProductiveHoursWithVesselCodes = (
  events: VoyageEvent[],
  classifications: VesselCodeClassification[]
): {
  totalHours: number;
  productiveHours: number;
  nonProductiveHours: number;
  maintenanceHours: number;
  transitHours: number;
  cargoOpsHours: number;
  weatherHours: number;
  productivePercentage: number;
  breakdown: Record<string, { hours: number; count: number; percentage: number }>;
} => {
  let totalHours = 0;
  let productiveHours = 0;
  let nonProductiveHours = 0;
  let maintenanceHours = 0;
  let transitHours = 0;
  let cargoOpsHours = 0;
  let weatherHours = 0;
  
  const breakdown: Record<string, { hours: number; count: number; percentage: number }> = {};
  
  events.forEach((event, index) => {
    const classification = classifications[index];
    const hours = event.finalHours || event.hours || 0;
    
    totalHours += hours;
    
    // Initialize breakdown category if not exists
    if (!breakdown[classification.activityCategory]) {
      breakdown[classification.activityCategory] = { hours: 0, count: 0, percentage: 0 };
    }
    
    breakdown[classification.activityCategory].hours += hours;
    breakdown[classification.activityCategory].count += 1;
    
    // Categorize hours
    switch (classification.activityCategory) {
      case 'Productive':
        productiveHours += hours;
        break;
      case 'Non-Productive':
        nonProductiveHours += hours;
        break;
      case 'Maintenance':
        maintenanceHours += hours;
        break;
      default:
        // Uncategorized goes to non-productive
        nonProductiveHours += hours;
    }
    
    // Special categorizations
    if (classification.vesselCode?.isTransitOperation) {
      transitHours += hours;
    }
    if (classification.vesselCode?.isCargoOperation) {
      cargoOpsHours += hours;
    }
    if (classification.vesselCode?.isWeatherRelated) {
      weatherHours += hours;
    }
  });
  
  // Calculate percentages
  Object.keys(breakdown).forEach(category => {
    breakdown[category].percentage = totalHours > 0 ? 
      (breakdown[category].hours / totalHours) * 100 : 0;
  });
  
  const productivePercentage = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
  
  return {
    totalHours,
    productiveHours,
    nonProductiveHours,
    maintenanceHours,
    transitHours,
    cargoOpsHours,
    weatherHours,
    productivePercentage,
    breakdown
  };
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
  debugVesselCodes,
  // Enhanced functions
  createVesselCodesDatabase,
  batchClassifyVoyageEvents,
  filterEventsForDrillingOperations,
  calculateProductiveHoursWithVesselCodes
};

export default vesselCodesProcessor;