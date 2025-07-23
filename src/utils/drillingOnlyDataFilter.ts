import { VoyageEvent, VesselManifest, BulkAction, CostAllocation, VoyageList } from '../types';

/**
 * Comprehensive drilling-only data filtering for Thunder Horse and Mad Dog
 * Ensures all KPIs show drilling activities only, not production
 */

export interface DrillingOnlyFilterResult {
  manifests: VesselManifest[];
  voyageEvents: VoyageEvent[];
  bulkActions: BulkAction[];
  costAllocations: CostAllocation[];
  stats: {
    manifestsFiltered: { original: number; drillingOnly: number; removed: number };
    voyageEventsFiltered: { original: number; drillingOnly: number; removed: number };
    bulkActionsFiltered: { original: number; drillingOnly: number; removed: number };
    costAllocationsFiltered: { original: number; drillingOnly: number; removed: number };
  };
}

/**
 * Create a voyage-to-activity classification map using manifests
 */
const createVoyageClassificationMap = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  locationFilter: string
): Map<string, 'Drilling' | 'Production' | 'Mixed' | 'Unknown'> => {
  
  const classificationMap = new Map<string, 'Drilling' | 'Production' | 'Mixed' | 'Unknown'>();
  
  // Only classify Thunder Horse and Mad Dog voyages
  const isThunderHorse = locationFilter.includes('Thunder Horse');
  const isMadDog = locationFilter.includes('Mad Dog');
  
  if (!isThunderHorse && !isMadDog) {
    return classificationMap; // Return empty map for other locations
  }
  
  voyages.forEach(voyage => {
    // Check if voyage visits the target location
    const locationPattern = isThunderHorse ? 'thunder horse' : 'mad dog';
    const visitsTarget = voyage.locations?.toLowerCase().includes(locationPattern) ||
                        voyage.locationList?.some(l => l.toLowerCase().includes(locationPattern));
    
    if (!visitsTarget) return;
    
    // Find matching manifests for this voyage
    const matchingManifests = manifests.filter(manifest => {
      // Vessel matching
      const manifestVessel = manifest.transporter?.toLowerCase().trim() || '';
      const voyageVessel = voyage.vessel?.toLowerCase().trim() || '';
      
      if (manifestVessel !== voyageVessel) return false;
      
      // Time window matching (within 2 days)
      const timeDiff = Math.abs(manifest.manifestDate.getTime() - voyage.startDate.getTime());
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      
      return timeDiff <= twoDaysInMs;
    });
    
    // Find location-specific manifests
    const targetManifests = matchingManifests.filter(m =>
      m.offshoreLocation?.toLowerCase().includes(locationPattern)
    );
    
    if (targetManifests.length === 0) {
      classificationMap.set(voyage.standardizedVoyageId, 'Unknown');
      return;
    }
    
    // Classify based on manifest offshore locations
    const productionManifests = targetManifests.filter(m => {
      const location = m.offshoreLocation?.toLowerCase() || '';
      return location.includes('prod') || location.includes('production');
    });
    
    const drillingManifests = targetManifests.filter(m => {
      const location = m.offshoreLocation?.toLowerCase() || '';
      return location.includes('drilling') || location.includes('drill');
    });
    
    // Determine classification
    let classification: 'Drilling' | 'Production' | 'Mixed' | 'Unknown';
    
    if (productionManifests.length > 0 && drillingManifests.length > 0) {
      classification = 'Mixed';
    } else if (productionManifests.length > 0) {
      classification = 'Production';
    } else if (drillingManifests.length > 0) {
      classification = 'Drilling';
    } else {
      classification = 'Unknown';
    }
    
    classificationMap.set(voyage.standardizedVoyageId, classification);
  });
  
  return classificationMap;
};

/**
 * Get drilling-only voyage IDs for a specific location
 */
const getDrillingVoyageIds = (
  voyages: VoyageList[],
  manifests: VesselManifest[],
  locationFilter: string
): Set<string> => {
  
  const classificationMap = createVoyageClassificationMap(voyages, manifests, locationFilter);
  const drillingVoyageIds = new Set<string>();
  
  classificationMap.forEach((classification, voyageId) => {
    if (classification === 'Drilling') {
      drillingVoyageIds.add(voyageId);
    }
  });
  
  return drillingVoyageIds;
};

/**
 * Filter manifests to drilling-only for Thunder Horse and Mad Dog
 */
export const filterManifestsToDrillingOnly = (
  manifests: VesselManifest[],
  voyages: VoyageList[],
  locationFilter: string
): VesselManifest[] => {
  
  // Only apply filtering for Thunder Horse and Mad Dog drilling
  if (!locationFilter.includes('Thunder Horse (Drilling)') && 
      !locationFilter.includes('Mad Dog (Drilling)')) {
    return manifests; // Return all manifests for other locations
  }
  
  const drillingVoyageIds = getDrillingVoyageIds(voyages, manifests, locationFilter);
  
  if (drillingVoyageIds.size === 0) {
    return manifests; // Fallback to all manifests if no drilling voyages identified
  }
  
  // Filter manifests to those associated with drilling voyages
  const drillingManifests = manifests.filter(manifest => {
    // Try to match manifest to a drilling voyage
    const matchingVoyage = voyages.find(voyage => {
      // Vessel matching
      const manifestVessel = manifest.transporter?.toLowerCase().trim() || '';
      const voyageVessel = voyage.vessel?.toLowerCase().trim() || '';
      
      if (manifestVessel !== voyageVessel) return false;
      
      // Time window matching
      const timeDiff = Math.abs(manifest.manifestDate.getTime() - voyage.startDate.getTime());
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      
      return timeDiff <= twoDaysInMs;
    });
    
    if (!matchingVoyage) return false;
    
    return drillingVoyageIds.has(matchingVoyage.standardizedVoyageId);
  });
  
  return drillingManifests;
};

/**
 * Filter voyage events to drilling-only for Thunder Horse and Mad Dog
 */
export const filterVoyageEventsToDrillingOnly = (
  voyageEvents: VoyageEvent[],
  voyages: VoyageList[],
  manifests: VesselManifest[],
  locationFilter: string
): VoyageEvent[] => {
  
  // Only apply filtering for Thunder Horse and Mad Dog drilling
  if (!locationFilter.includes('Thunder Horse (Drilling)') && 
      !locationFilter.includes('Mad Dog (Drilling)')) {
    return voyageEvents; // Return all events for other locations
  }
  
  const drillingVoyageIds = getDrillingVoyageIds(voyages, manifests, locationFilter);
  
  if (drillingVoyageIds.size === 0) {
    return voyageEvents; // Fallback to all events if no drilling voyages identified
  }
  
  // Filter events to those associated with drilling voyages
  const drillingEvents = voyageEvents.filter(event => {
    // Try to match event to a drilling voyage
    const matchingVoyage = voyages.find(voyage => {
      // Vessel matching
      const eventVessel = event.vessel?.toLowerCase().trim() || '';
      const voyageVessel = voyage.vessel?.toLowerCase().trim() || '';
      
      if (eventVessel !== voyageVessel) return false;
      
      // Voyage number matching (if available)
      if (event.voyageNumber && voyage.voyageNumber) {
        if (String(event.voyageNumber) !== String(voyage.voyageNumber)) return false;
      }
      
      // Time window matching
      const timeDiff = Math.abs(event.eventDate.getTime() - voyage.startDate.getTime());
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // Larger window for events
      
      return timeDiff <= sevenDaysInMs;
    });
    
    if (!matchingVoyage) return false;
    
    return drillingVoyageIds.has(matchingVoyage.standardizedVoyageId);
  });
  
  return drillingEvents;
};

/**
 * Filter bulk actions to drilling-only for Thunder Horse and Mad Dog
 */
export const filterBulkActionsToDrillingOnly = (
  bulkActions: BulkAction[],
  voyages: VoyageList[],
  manifests: VesselManifest[],
  locationFilter: string
): BulkAction[] => {
  
  // Only apply filtering for Thunder Horse and Mad Dog drilling
  if (!locationFilter.includes('Thunder Horse (Drilling)') && 
      !locationFilter.includes('Mad Dog (Drilling)')) {
    return bulkActions; // Return all actions for other locations
  }
  
  const drillingVoyageIds = getDrillingVoyageIds(voyages, manifests, locationFilter);
  
  if (drillingVoyageIds.size === 0) {
    return bulkActions; // Fallback to all actions if no drilling voyages identified
  }
  
  // Filter bulk actions to drilling-only based on destination and fluid type
  const drillingBulkActions = bulkActions.filter(action => {
    // Check if destination is drilling-specific
    const destination = action.destinationPort?.toLowerCase() || '';
    const atPort = action.atPort?.toLowerCase() || '';
    
    const locationPattern = locationFilter.includes('Thunder Horse') ? 'thunder horse' : 'mad dog';
    
    // Must be going to the target location
    if (!destination.includes(locationPattern) && !atPort.includes(locationPattern)) {
      return false;
    }
    
    // For Thunder Horse and Mad Dog, check if it's drilling fluid
    if (action.isDrillingFluid || 
        action.bulkType?.toLowerCase().includes('drilling') ||
        action.bulkType?.toLowerCase().includes('mud') ||
        action.bulkType?.toLowerCase().includes('brine')) {
      return true;
    }
    
    // Try to match to a drilling voyage by vessel and time
    const matchingVoyage = voyages.find(voyage => {
      const actionVessel = action.vesselName?.toLowerCase().trim() || '';
      const voyageVessel = voyage.vessel?.toLowerCase().trim() || '';
      
      if (actionVessel !== voyageVessel) return false;
      
      const timeDiff = Math.abs(action.startDate.getTime() - voyage.startDate.getTime());
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      
      return timeDiff <= threeDaysInMs;
    });
    
    if (!matchingVoyage) return false;
    
    return drillingVoyageIds.has(matchingVoyage.standardizedVoyageId);
  });
  
  return drillingBulkActions;
};

/**
 * Filter cost allocations to drilling-only for Thunder Horse and Mad Dog
 */
export const filterCostAllocationsToDrillingOnly = (
  costAllocations: CostAllocation[],
  locationFilter: string
): CostAllocation[] => {
  
  // Only apply filtering for Thunder Horse and Mad Dog drilling
  if (!locationFilter.includes('Thunder Horse (Drilling)') && 
      !locationFilter.includes('Mad Dog (Drilling)')) {
    return costAllocations; // Return all allocations for other locations
  }
  
  const locationPattern = locationFilter.includes('Thunder Horse') ? 'thunder horse' : 'mad dog';
  
  // Filter cost allocations to drilling-only
  const drillingCostAllocations = costAllocations.filter(ca => {
    // Check if location matches
    const locationRef = ca.locationReference?.toLowerCase() || '';
    const rigLocation = ca.rigLocation?.toLowerCase() || '';
    const description = ca.description?.toLowerCase() || '';
    
    const matchesLocation = locationRef.includes(locationPattern) ||
                           rigLocation.includes(locationPattern) ||
                           description.includes(locationPattern);
    
    if (!matchesLocation) return false;
    
    // Check if it's drilling-specific
    return ca.projectType === 'Drilling' ||
           ca.projectType === 'Completions' ||
           ca.department === 'Drilling' ||
           locationRef.includes('drilling') ||
           rigLocation.includes('drilling') ||
           description.includes('drilling');
  });
  
  return drillingCostAllocations;
};

/**
 * Apply drilling-only filtering to all data sources
 */
export const applyDrillingOnlyFiltering = (
  manifests: VesselManifest[],
  voyageEvents: VoyageEvent[],
  bulkActions: BulkAction[],
  costAllocations: CostAllocation[],
  voyages: VoyageList[],
  locationFilter: string
): DrillingOnlyFilterResult => {
  
  const originalCounts = {
    manifests: manifests.length,
    voyageEvents: voyageEvents.length,
    bulkActions: bulkActions.length,
    costAllocations: costAllocations.length
  };
  
  // Apply drilling-only filtering
  const filteredManifests = filterManifestsToDrillingOnly(manifests, voyages, locationFilter);
  const filteredVoyageEvents = filterVoyageEventsToDrillingOnly(voyageEvents, voyages, manifests, locationFilter);
  const filteredBulkActions = filterBulkActionsToDrillingOnly(bulkActions, voyages, manifests, locationFilter);
  const filteredCostAllocations = filterCostAllocationsToDrillingOnly(costAllocations, locationFilter);
  
  const stats = {
    manifestsFiltered: {
      original: originalCounts.manifests,
      drillingOnly: filteredManifests.length,
      removed: originalCounts.manifests - filteredManifests.length
    },
    voyageEventsFiltered: {
      original: originalCounts.voyageEvents,
      drillingOnly: filteredVoyageEvents.length,
      removed: originalCounts.voyageEvents - filteredVoyageEvents.length
    },
    bulkActionsFiltered: {
      original: originalCounts.bulkActions,
      drillingOnly: filteredBulkActions.length,
      removed: originalCounts.bulkActions - filteredBulkActions.length
    },
    costAllocationsFiltered: {
      original: originalCounts.costAllocations,
      drillingOnly: filteredCostAllocations.length,
      removed: originalCounts.costAllocations - filteredCostAllocations.length
    }
  };
  
  // Log filtering results for Thunder Horse and Mad Dog only
  if (locationFilter.includes('Thunder Horse (Drilling)') || 
      locationFilter.includes('Mad Dog (Drilling)')) {
    console.log(`🎯 DRILLING-ONLY DATA FILTERING for ${locationFilter}:`, {
      manifests: `${stats.manifestsFiltered.original} → ${stats.manifestsFiltered.drillingOnly} (removed ${stats.manifestsFiltered.removed})`,
      voyageEvents: `${stats.voyageEventsFiltered.original} → ${stats.voyageEventsFiltered.drillingOnly} (removed ${stats.voyageEventsFiltered.removed})`,
      bulkActions: `${stats.bulkActionsFiltered.original} → ${stats.bulkActionsFiltered.drillingOnly} (removed ${stats.bulkActionsFiltered.removed})`,
      costAllocations: `${stats.costAllocationsFiltered.original} → ${stats.costAllocationsFiltered.drillingOnly} (removed ${stats.costAllocationsFiltered.removed})`
    });
  }
  
  return {
    manifests: filteredManifests,
    voyageEvents: filteredVoyageEvents,
    bulkActions: filteredBulkActions,
    costAllocations: filteredCostAllocations,
    stats
  };
};