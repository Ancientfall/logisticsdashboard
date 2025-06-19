/**
 * Bulk Fluid Deduplication Engine
 * Prevents double-counting of fluid movements and handles Load/Offload operations correctly
 * Critical for accurate fluid movement KPI calculations
 */

import { BulkAction } from '../types';

// ==================== TYPES ====================

export interface FluidMovementOperation {
  id: string;
  vesselName: string;
  operationDate: Date;
  originLocation: string;
  destinationLocation: string;
  bulkType: string;
  totalVolumeBbls: number;
  operations: BulkAction[];
  movementType: 'Fourchon-to-Offshore' | 'Offshore-to-Offshore' | 'Vessel-to-Facility' | 'Other';
  isDelivery: boolean;
  notes?: string;
}

export interface FluidDeduplicationResult {
  originalActions: number;
  consolidatedOperations: FluidMovementOperation[];
  duplicatesRemoved: number;
  totalVolumeOriginal: number;
  totalVolumeConsolidated: number;
  deduplicationRules: string[];
  warnings: string[];
}

export interface FluidValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  volumeDiscrepancy?: number;
}

// ==================== DEDUPLICATION ENGINE ====================

/**
 * Main deduplication function that processes bulk actions and removes double-counting
 */
export const deduplicateBulkActions = (
  bulkActions: BulkAction[],
  department: 'Drilling' | 'Production' | 'All' = 'All'
): FluidDeduplicationResult => {
  console.log(`🧪 BULK FLUID DEDUPLICATION: Processing ${bulkActions.length} actions for ${department}`);
  
  const deduplicationRules: string[] = [];
  const warnings: string[] = [];
  
  // Filter actions by department if specified
  let filteredActions = bulkActions;
  if (department !== 'All') {
    filteredActions = bulkActions.filter(action => {
      if (department === 'Drilling') {
        return action.isDrillingFluid || action.isCompletionFluid;
      } else if (department === 'Production') {
        return !action.isDrillingFluid && !action.isCompletionFluid;
      }
      return true;
    });
    
    console.log(`📊 Filtered to ${filteredActions.length} ${department} actions`);
    deduplicationRules.push(`Filtered for ${department} operations: ${filteredActions.length} actions`);
  }

  // Group actions by vessel, date, bulk type, and location combination
  const groupedActions = groupActionsByOperation(filteredActions);
  console.log(`📊 Grouped into ${groupedActions.length} operation groups`);

  // Process each group to identify movement operations
  const consolidatedOperations: FluidMovementOperation[] = [];
  let duplicatesRemoved = 0;

  groupedActions.forEach(group => {
    const result = processActionGroup(group);
    if (result.operation) {
      consolidatedOperations.push(result.operation);
    }
    duplicatesRemoved += result.duplicatesRemoved;
    deduplicationRules.push(...result.rules);
    warnings.push(...result.warnings);
  });

  // Calculate totals
  const totalVolumeOriginal = filteredActions.reduce((sum, action) => sum + action.volumeBbls, 0);
  const totalVolumeConsolidated = consolidatedOperations.reduce((sum, op) => sum + op.totalVolumeBbls, 0);

  console.log(`✅ DEDUPLICATION COMPLETE:`);
  console.log(`   Original actions: ${filteredActions.length}`);
  console.log(`   Consolidated operations: ${consolidatedOperations.length}`);
  console.log(`   Duplicates removed: ${duplicatesRemoved}`);
  console.log(`   Volume: ${totalVolumeOriginal.toLocaleString()} -> ${totalVolumeConsolidated.toLocaleString()} bbls`);

  return {
    originalActions: filteredActions.length,
    consolidatedOperations,
    duplicatesRemoved,
    totalVolumeOriginal,
    totalVolumeConsolidated,
    deduplicationRules,
    warnings
  };
};

/**
 * Group bulk actions by vessel, date, bulk type, and location pattern
 */
const groupActionsByOperation = (actions: BulkAction[]): BulkAction[][] => {
  const groups = new Map<string, BulkAction[]>();

  actions.forEach(action => {
    // Create grouping key based on vessel, date, bulk type, and location pattern
    const dateKey = action.startDate.toDateString();
    const originKey = normalizeLocation(action.atPort);
    const destKey = normalizeLocation(action.destinationPort || '');
    
    // Group by vessel, date, bulk type, and location pair
    const groupKey = `${action.vesselName}|${dateKey}|${action.bulkType}|${originKey}|${destKey}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(action);
  });

  return Array.from(groups.values());
};

/**
 * Process a group of actions to create a single fluid movement operation
 */
const processActionGroup = (actions: BulkAction[]): {
  operation: FluidMovementOperation | null;
  duplicatesRemoved: number;
  rules: string[];
  warnings: string[];
} => {
  if (actions.length === 0) {
    return { operation: null, duplicatesRemoved: 0, rules: [], warnings: [] };
  }

  const rules: string[] = [];
  const warnings: string[] = [];
  
  // Analyze the action group
  const firstAction = actions[0];
  const vesselName = firstAction.vesselName;
  const operationDate = firstAction.startDate;
  const bulkType = firstAction.bulkType;

  // Categorize actions by Load/Offload
  const loadActions = actions.filter(a => a.action.toLowerCase().includes('load'));
  const offloadActions = actions.filter(a => a.action.toLowerCase().includes('offload'));
  const otherActions = actions.filter(a => !a.action.toLowerCase().includes('load') && !a.action.toLowerCase().includes('offload'));

  console.log(`🔍 Processing group: ${vesselName} - ${bulkType} on ${operationDate.toDateString()}`);
  console.log(`   Load actions: ${loadActions.length}, Offload actions: ${offloadActions.length}, Other: ${otherActions.length}`);

  // Determine movement type and consolidation strategy
  const originLocation = normalizeLocation(firstAction.atPort);
  const destinationLocation = normalizeLocation(firstAction.destinationPort || '');
  
  const movementType = classifyMovementType(originLocation, destinationLocation);
  const isDelivery = determineIfDelivery(loadActions, offloadActions, movementType);

  // Apply deduplication logic based on movement type
  let consolidatedVolume = 0;
  let duplicatesRemoved = 0;
  let notes = '';

  if (originLocation === destinationLocation && originLocation !== '') {
    // Same location for both at port and destination - this is a vessel-to-facility transfer
    consolidatedVolume = actions.reduce((sum, action) => sum + action.volumeBbls, 0);
    duplicatesRemoved = Math.max(0, actions.length - 1); // Count as one operation
    notes = 'Vessel-to-facility transfer (same location)';
    rules.push(`Same location transfer: ${originLocation} - consolidated ${actions.length} actions into single operation`);
    
  } else if (loadActions.length > 0 && offloadActions.length > 0) {
    // Both load and offload operations - validate and use delivery volume
    const loadVolume = loadActions.reduce((sum, action) => sum + action.volumeBbls, 0);
    const offloadVolume = offloadActions.reduce((sum, action) => sum + action.volumeBbls, 0);
    
    if (Math.abs(loadVolume - offloadVolume) < 0.01) {
      // Volumes match - use offload volume (delivery)
      consolidatedVolume = offloadVolume;
      duplicatesRemoved = loadActions.length; // Don't count load actions
      notes = 'Load/Offload pair - using delivery volume';
      rules.push(`Load/Offload pair: ${loadVolume} loaded, ${offloadVolume} delivered - using delivery volume`);
    } else {
      // Volume discrepancy - flag for review
      consolidatedVolume = Math.max(loadVolume, offloadVolume);
      duplicatesRemoved = Math.min(loadActions.length, offloadActions.length);
      notes = `Volume discrepancy: loaded ${loadVolume}, delivered ${offloadVolume}`;
      warnings.push(`Volume discrepancy for ${vesselName} ${bulkType}: loaded ${loadVolume}, delivered ${offloadVolume}`);
      rules.push(`Volume discrepancy detected - using maximum volume: ${consolidatedVolume}`);
    }
    
  } else {
    // Only load or only offload actions
    consolidatedVolume = actions.reduce((sum, action) => sum + action.volumeBbls, 0);
    duplicatesRemoved = 0; // No duplicates when only one type
    notes = loadActions.length > 0 ? 'Load operations only' : 'Offload operations only';
    rules.push(`Single operation type: ${actions.length} ${loadActions.length > 0 ? 'load' : 'offload'} actions`);
  }

  // Create consolidated operation
  const operation: FluidMovementOperation = {
    id: `${vesselName}_${operationDate.getTime()}_${bulkType}`,
    vesselName,
    operationDate,
    originLocation,
    destinationLocation,
    bulkType,
    totalVolumeBbls: consolidatedVolume,
    operations: actions,
    movementType,
    isDelivery,
    notes
  };

  return {
    operation,
    duplicatesRemoved,
    rules,
    warnings
  };
};

/**
 * Classify the type of fluid movement
 */
const classifyMovementType = (
  origin: string, 
  destination: string
): 'Fourchon-to-Offshore' | 'Offshore-to-Offshore' | 'Vessel-to-Facility' | 'Other' => {
  const isFourchonOrigin = origin.toLowerCase().includes('fourchon');
  const isOffshoreOrigin = isOffshoreLocation(origin);
  const isOffshoreDestination = isOffshoreLocation(destination);

  if (origin === destination && origin !== '') {
    return 'Vessel-to-Facility';
  } else if (isFourchonOrigin && isOffshoreDestination) {
    return 'Fourchon-to-Offshore';
  } else if (isOffshoreOrigin && isOffshoreDestination) {
    return 'Offshore-to-Offshore';
  } else {
    return 'Other';
  }
};

/**
 * Determine if this represents a delivery operation
 */
const determineIfDelivery = (
  loadActions: BulkAction[],
  offloadActions: BulkAction[],
  movementType: string
): boolean => {
  // Deliveries are typically represented by offload operations at offshore locations
  if (offloadActions.length > 0 && movementType === 'Fourchon-to-Offshore') {
    return true;
  }
  
  // If only load actions and moving to offshore, also consider delivery
  if (loadActions.length > 0 && offloadActions.length === 0 && movementType === 'Fourchon-to-Offshore') {
    return true;
  }
  
  return false;
};

/**
 * Check if a location is an offshore location
 */
const isOffshoreLocation = (location: string): boolean => {
  if (!location) return false;
  
  const offshoreKeywords = [
    'deepwater', 'thunder horse', 'mad dog', 'atlantis', 'na kika',
    'devil\'s tower', 'blind faith', 'great white', 'cascade',
    'chinook', 'st. malo', 'pompano', 'villa', 'stena', 'icemax'
  ];
  
  const normalizedLocation = location.toLowerCase();
  return offshoreKeywords.some(keyword => normalizedLocation.includes(keyword));
};

/**
 * Normalize location names for consistent comparison
 */
const normalizeLocation = (location: string): string => {
  if (!location) return '';
  
  return location
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['"]/g, '');
};

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate fluid movement operations for consistency
 */
export const validateFluidMovements = (
  operations: FluidMovementOperation[]
): FluidValidationResult => {
  const issues: string[] = [];
  const warnings: string[] = [];
  let totalVolumeDiscrepancy = 0;

  operations.forEach(operation => {
    // Check for volume consistency
    const totalActionVolume = operation.operations.reduce((sum, action) => sum + action.volumeBbls, 0);
    const discrepancy = Math.abs(operation.totalVolumeBbls - totalActionVolume);
    
    if (discrepancy > 0.01) {
      const issue = `Volume discrepancy in operation ${operation.id}: consolidated ${operation.totalVolumeBbls}, actions total ${totalActionVolume}`;
      issues.push(issue);
      totalVolumeDiscrepancy += discrepancy;
    }

    // Check for logical consistency
    if (operation.originLocation === operation.destinationLocation && 
        operation.movementType !== 'Vessel-to-Facility') {
      warnings.push(`Operation ${operation.id} has same origin and destination but not classified as vessel-to-facility transfer`);
    }

    // Check for missing destinations
    if (!operation.destinationLocation && operation.movementType !== 'Other') {
      warnings.push(`Operation ${operation.id} missing destination location`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    volumeDiscrepancy: totalVolumeDiscrepancy > 0 ? totalVolumeDiscrepancy : undefined
  };
};

// ==================== FILTERING FUNCTIONS ====================

/**
 * Filter fluid movements for drilling operations only
 */
export const getDrillingFluidMovements = (
  operations: FluidMovementOperation[]
): FluidMovementOperation[] => {
  return operations.filter(operation => 
    operation.operations.some(action => action.isDrillingFluid || action.isCompletionFluid)
  );
};

/**
 * Filter fluid movements for production operations only
 */
export const getProductionFluidMovements = (
  operations: FluidMovementOperation[]
): FluidMovementOperation[] => {
  return operations.filter(operation => 
    operation.operations.some(action => !action.isDrillingFluid && !action.isCompletionFluid)
  );
};

/**
 * Get fluid movements by location
 */
export const getFluidMovementsByLocation = (
  operations: FluidMovementOperation[],
  location: string
): FluidMovementOperation[] => {
  const normalizedLocation = normalizeLocation(location);
  return operations.filter(operation => 
    normalizeLocation(operation.destinationLocation).includes(normalizedLocation) ||
    normalizeLocation(operation.originLocation).includes(normalizedLocation)
  );
};

// ==================== REPORTING FUNCTIONS ====================

/**
 * Generate deduplication summary report
 */
export const generateDeduplicationReport = (
  result: FluidDeduplicationResult
): string => {
  const report = [
    '🧪 BULK FLUID DEDUPLICATION REPORT',
    '=' .repeat(50),
    '',
    `Original Actions: ${result.originalActions.toLocaleString()}`,
    `Consolidated Operations: ${result.consolidatedOperations.length.toLocaleString()}`,
    `Duplicates Removed: ${result.duplicatesRemoved.toLocaleString()}`,
    `Volume Processed: ${result.totalVolumeOriginal.toLocaleString()} bbls`,
    `Volume After Deduplication: ${result.totalVolumeConsolidated.toLocaleString()} bbls`,
    '',
    'DEDUPLICATION RULES APPLIED:',
    ...result.deduplicationRules.map(rule => `  • ${rule}`),
    ''
  ];

  if (result.warnings.length > 0) {
    report.push('⚠️  WARNINGS:');
    report.push(...result.warnings.map(warning => `  • ${warning}`));
    report.push('');
  }

  return report.join('\n');
};

export default {
  deduplicateBulkActions,
  validateFluidMovements,
  getDrillingFluidMovements,
  getProductionFluidMovements,
  getFluidMovementsByLocation,
  generateDeduplicationReport
};