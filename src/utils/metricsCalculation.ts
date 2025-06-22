import { VoyageEvent, VesselManifest, VoyageList, CostAllocation, KPIMetrics, BulkAction } from '../types';
import { calculateTotalHours, calculateAverageTripDuration } from './helpers';
import { calculateVesselCostMetrics } from './vesselCost';
import { 
  getDrillingCostAllocations, 
  getProductionCostAllocations,
  validateManifestsAgainstCostAllocation 
} from './costAllocationProcessor';
import { isProductiveEvent, isNonProductiveEvent } from './vesselCodesProcessor';
import { deduplicateBulkActions, getDrillingFluidMovements, getProductionFluidMovements } from './bulkFluidDeduplicationEngine';

/**
 * KPI metrics calculation utilities
 * Enhanced with new infrastructure for accurate drilling/production separation
 */

// ==================== ENHANCED KPI CALCULATION FUNCTIONS ====================

/**
 * Enhanced vessel manifest metrics with proper drilling/production filtering
 */
export const calculateEnhancedManifestMetrics = (
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[],
  currentMonth?: number,
  currentYear?: number,
  department: 'Drilling' | 'Production' | 'All' = 'All',
  locationFilter?: string
) => {
  // Minimal logging for manifest metrics
  
  // Filter manifests for current month - only if month/year specified
  const currentMonthManifests = (currentMonth !== undefined && currentYear !== undefined) 
    ? vesselManifests.filter(manifest => 
        manifest.manifestDate.getMonth() === currentMonth && 
        manifest.manifestDate.getFullYear() === currentYear
      )
    : vesselManifests; // Use all manifests if no month/year filter

  // Validate manifests against cost allocation
  const validation = validateManifestsAgainstCostAllocation(currentMonthManifests, costAllocation);
  // Validation summary available in validation object

  // Filter manifests by department using cost allocation
  let filteredManifests = validation.validManifests;
  
  if (department !== 'All') {
    const departmentCostAllocations = department === 'Drilling' 
      ? getDrillingCostAllocations(costAllocation)
      : getProductionCostAllocations(costAllocation);
    
    const departmentLCs = new Set(departmentCostAllocations.map(ca => ca.lcNumber));
    
    filteredManifests = validation.validManifests.filter(manifest => 
      manifest.costCode && departmentLCs.has(manifest.costCode)
    );
    
    // Department filtering completed
  }

  // Apply location filtering if specified
  if (locationFilter && locationFilter !== 'All Locations') {
    // Enhanced location filtering for drilling vs production locations
    let locationCostAllocations: any[] = [];
    
    // Handle specific drilling location filters
    if (locationFilter === 'Thunder Horse (Drilling)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isDrilling && ca.isThunderHorse
      );
    } else if (locationFilter === 'Mad Dog (Drilling)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isDrilling && ca.isMadDog
      );
    } else if (locationFilter === 'Thunder Horse (Production)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isThunderHorse && !ca.isDrilling
      );
    } else if (locationFilter === 'Mad Dog (Production)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isMadDog && !ca.isDrilling
      );
    } else {
      // Fallback to text-based matching for other locations
      locationCostAllocations = costAllocation.filter(ca => 
        ca.locationReference?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        ca.description?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        ca.rigLocation?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber));
    
    const beforeLocationFilter = filteredManifests.length;
    filteredManifests = filteredManifests.filter(manifest => 
      manifest.costCode && locationLCs.has(manifest.costCode)
    );
    
    console.log(`📍 Location filter "${locationFilter}": Found ${locationCostAllocations.length} cost allocations, ${locationLCs.size} unique LCs, ${filteredManifests.length}/${beforeLocationFilter} manifests match`);
  }

  // Calculate enhanced cargo metrics
  const totalDeckTons = filteredManifests.reduce((sum, manifest) => sum + manifest.deckTons, 0);
  const totalRTTons = filteredManifests.reduce((sum, manifest) => sum + manifest.rtTons, 0);
  const totalOutboundTons = totalDeckTons; // Deck tons are outbound only
  const totalCargoTons = totalDeckTons + totalRTTons;
  
  const uniqueManifests = new Set(filteredManifests.map(m => m.manifestNumber)).size;
  const cargoTonnagePerVisit = uniqueManifests > 0 ? totalCargoTons / uniqueManifests : 0;

  // Enhanced RT analysis
  const rtPercentage = totalCargoTons > 0 ? (totalRTTons / totalCargoTons) * 100 : 0;
  const outboundPercentage = totalCargoTons > 0 ? (totalOutboundTons / totalCargoTons) * 100 : 0;
  
  // Lifts calculation
  const totalLifts = filteredManifests.reduce((sum, manifest) => sum + manifest.lifts, 0);
  
  // Vessel visits (unique vessels)
  const vesselVisits = new Set(filteredManifests.map(m => m.transporter)).size;

  // Cargo metrics calculated successfully

  return {
    totalDeckTons,
    totalRTTons,
    totalOutboundTons,
    totalCargoTons,
    cargoTonnagePerVisit,
    rtPercentage,
    outboundPercentage,
    totalLifts,
    vesselVisits,
    uniqueManifests,
    validationRate: validation.validationSummary.validationRate,
    invalidManifests: validation.validationSummary.invalidCount,
    orphanedManifests: validation.validationSummary.orphanedCount
  };
};

/**
 * Enhanced voyage event metrics with vessel codes integration
 */
export const calculateEnhancedVoyageEventMetrics = (
  voyageEvents: VoyageEvent[],
  costAllocation: CostAllocation[],
  currentMonth?: number,
  currentYear?: number,
  department: 'Drilling' | 'Production' | 'All' = 'All',
  locationFilter?: string
) => {
  // Enhanced voyage event metrics calculation
  
  // Filter events for current month - only if month/year specified
  const currentMonthEvents = (currentMonth !== undefined && currentYear !== undefined)
    ? voyageEvents.filter(event => 
        event.eventDate.getMonth() === currentMonth && 
        event.eventDate.getFullYear() === currentYear
      )
    : voyageEvents; // Use all events if no month/year filter

  // Filter events by department using cost allocation
  let filteredEvents = currentMonthEvents;
  
  if (department !== 'All') {
    const departmentCostAllocations = department === 'Drilling' 
      ? getDrillingCostAllocations(costAllocation)
      : getProductionCostAllocations(costAllocation);
    
    const departmentLCs = new Set(departmentCostAllocations.map(ca => ca.lcNumber));
    
    filteredEvents = currentMonthEvents.filter(event => 
      event.lcNumber && departmentLCs.has(event.lcNumber)
    );
    
    // Department filtering completed for events
  }

  // Apply location filtering if specified
  if (locationFilter && locationFilter !== 'All Locations') {
    // Enhanced location filtering for drilling vs production locations
    let locationCostAllocations: any[] = [];
    
    // Handle specific drilling location filters
    if (locationFilter === 'Thunder Horse (Drilling)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isDrilling && ca.isThunderHorse
      );
    } else if (locationFilter === 'Mad Dog (Drilling)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isDrilling && ca.isMadDog
      );
    } else if (locationFilter === 'Thunder Horse (Production)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isThunderHorse && !ca.isDrilling
      );
    } else if (locationFilter === 'Mad Dog (Production)') {
      locationCostAllocations = costAllocation.filter(ca => 
        ca.isMadDog && !ca.isDrilling
      );
    } else {
      // Fallback to text-based matching for other locations
      locationCostAllocations = costAllocation.filter(ca => 
        ca.locationReference?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        ca.description?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        ca.rigLocation?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber));
    
    const beforeLocationFilter = filteredEvents.length;
    filteredEvents = filteredEvents.filter(event => 
      (event.lcNumber && locationLCs.has(event.lcNumber)) ||
      event.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      event.mappedLocation?.toLowerCase().includes(locationFilter.toLowerCase())
    );
    
    console.log(`📍 Voyage events location filter "${locationFilter}": Found ${locationCostAllocations.length} cost allocations, ${locationLCs.size} unique LCs, ${filteredEvents.length}/${beforeLocationFilter} events match`);
  }

  // Enhanced productive/non-productive classification using vessel codes
  const productiveEvents = filteredEvents.filter(event => 
    isProductiveEvent(event.parentEvent, event.event, event.portType)
  );
  
  const nonProductiveEvents = filteredEvents.filter(event => 
    isNonProductiveEvent(event.parentEvent, event.event, event.portType)
  );

  // Calculate time metrics with proper allocation
  const productiveHours = productiveEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  const nonProductiveHours = nonProductiveEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);

  // Waiting time offshore (rig activities excluding weather)
  const waitingTimeOffshore = filteredEvents
    .filter(event => 
      event.portType === 'rig' && 
      event.parentEvent === 'Waiting on Installation'
    )
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);

  // Total offshore time (rig activities + transit time from base)
  const rigActivities = filteredEvents
    .filter(event => 
      event.portType === 'rig' && 
      event.parentEvent !== 'Waiting on Weather'
    )
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);
  
  // Calculate total transit time (both directions)
  // Outbound transit: from base (Fourchon) to rig location
  const outboundTransitTime = filteredEvents
    .filter(event => 
      event.portType === 'base' && 
      event.parentEvent === 'Transit'
    )
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);

  // Return transit: from rig location back to base (Fourchon)
  const returnTransitTime = filteredEvents
    .filter(event => 
      event.portType === 'rig' && 
      event.parentEvent === 'Transit'
    )
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);

  // Total transit time (both directions)
  const transitTime = outboundTransitTime + returnTransitTime;
  
  const totalOffshoreTime = rigActivities + transitTime;

  // Cargo operations hours
  const cargoOpsHours = filteredEvents
    .filter(event => event.parentEvent === 'Cargo Ops')
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);

  // Vessel utilization
  const totalHours = productiveHours + nonProductiveHours;
  const vesselUtilization = totalOffshoreTime > 0 ? (productiveHours / totalOffshoreTime) * 100 : 0;
  
  // Waiting time percentage
  const waitingTimePercentage = totalOffshoreTime > 0 ? (waitingTimeOffshore / totalOffshoreTime) * 100 : 0;

  // Enhanced transit time diagnostic
  if (transitTime === 0 && filteredEvents.length > 0) {
    const transitEventSamples = filteredEvents
      .filter(event => event.parentEvent?.toLowerCase().includes('transit'))
      .slice(0, 5);
    
    console.warn(`⚠️ No transit time found for ${department}`, {
      outboundTransitTime: outboundTransitTime.toFixed(1),
      returnTransitTime: returnTransitTime.toFixed(1),
      transitEventSamples: transitEventSamples.map(e => ({
        parentEvent: e.parentEvent,
        portType: e.portType,
        hours: e.finalHours
      }))
    });
  } else if (transitTime > 0) {
    console.log(`✅ Transit time calculated for ${department}:`, {
      outboundTransit: outboundTransitTime.toFixed(1),
      returnTransit: returnTransitTime.toFixed(1),
      totalTransit: transitTime.toFixed(1)
    });
  }

  // Additional debugging for Stena IceMAX activity comparison
  if (locationFilter?.toLowerCase().includes('stena')) {
    const activityBreakdown = filteredEvents.reduce((breakdown, event) => {
      const activity = event.parentEvent || 'Unknown';
      const hours = event.finalHours || 0;
      breakdown[activity] = (breakdown[activity] || 0) + hours;
      return breakdown;
    }, {} as Record<string, number>);
    
    console.log('🔍 STENA ACTIVITY BREAKDOWN (Dashboard vs Kabal):', {
      dashboardActivities: activityBreakdown,
      totalDashboardHours: Object.values(activityBreakdown).reduce((sum, hours) => sum + hours, 0),
      kabalExpectedMay: {
        'Cargo Ops': 291,
        'Waiting on Installation': 231,
        'Transit': 209,
        'Maneuvering': 71,
        'Total': 802
      },
      monthFilter: currentMonth !== undefined ? `${currentMonth + 1}/${currentYear}` : 'All Months',
      discrepancies: {
        transitDiff: `Dashboard: ${transitTime.toFixed(1)} vs Kabal: 209`,
        cargoOpsDiff: `Dashboard: ${cargoOpsHours.toFixed(1)} vs Kabal: 291`
      }
    });
  }

  return {
    productiveHours,
    nonProductiveHours,
    waitingTimeOffshore,
    totalOffshoreTime,
    transitTime,
    outboundTransitTime,
    returnTransitTime,
    cargoOpsHours,
    vesselUtilization,
    waitingTimePercentage,
    totalHours,
    filteredEventCount: filteredEvents.length
  };
};

/**
 * Enhanced bulk fluid metrics with deduplication
 */
export const calculateEnhancedBulkFluidMetrics = (
  bulkActions: BulkAction[],
  currentMonth?: number,
  currentYear?: number,
  department: 'Drilling' | 'Production' | 'All' = 'All',
  locationFilter?: string
) => {
  // Enhanced bulk fluid metrics calculation
  
  // Filter bulk actions for current month - only if month/year specified
  const currentMonthActions = (currentMonth !== undefined && currentYear !== undefined)
    ? bulkActions.filter(action => 
        action.startDate.getMonth() === currentMonth && 
        action.startDate.getFullYear() === currentYear
      )
    : bulkActions; // Use all actions if no month/year filter

  // Apply location filtering if specified
  let locationFilteredActions = currentMonthActions;
  if (locationFilter && locationFilter !== 'All Locations') {
    const beforeLocationFilter = locationFilteredActions.length;
    
    // Use Set to prevent duplicate actions from being included multiple times
    const actionIds = new Set<string>();
    locationFilteredActions = currentMonthActions.filter(action => {
      if (actionIds.has(action.id)) return false; // Prevent duplicates
      
      const includesLocation = (
        action.atPort?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        action.standardizedOrigin?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        action.destinationPort?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        action.standardizedDestination?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        action.productionPlatform?.toLowerCase().includes(locationFilter.toLowerCase())
      );
      
      if (includesLocation) {
        actionIds.add(action.id);
        return true;
      }
      return false;
    });
    
    // Specific debugging for Stena IceMAX issue
    if (locationFilter.toLowerCase().includes('stena')) {
      console.log('🔍 STENA ICEMAX BULK DEBUG:', {
        locationFilter,
        beforeLocationFilter,
        afterLocationFilter: locationFilteredActions.length,
        sampleActions: locationFilteredActions.slice(0, 5).map(a => ({
          id: a.id,
          vesselName: a.vesselName,
          atPort: a.atPort,
          destinationPort: a.destinationPort,
          volumeBbls: a.volumeBbls,
          action: a.action,
          bulkType: a.bulkType
        })),
        totalVolumeBeforeDedup: locationFilteredActions.reduce((sum, a) => sum + a.volumeBbls, 0),
        duplicateAnalysis: {
          dieselActions: locationFilteredActions.filter(a => a.bulkType?.toLowerCase().includes('diesel')).length,
          calciumChlorideActions: locationFilteredActions.filter(a => a.bulkType?.toLowerCase().includes('calcium')).length,
          totalUniqueVessels: [...new Set(locationFilteredActions.map(a => a.vesselName))].length,
          totalUniqueBulkTypes: [...new Set(locationFilteredActions.map(a => a.bulkType))].length
        }
      });
    }
  }

  // Apply deduplication logic
  const deduplicationResult = deduplicateBulkActions(locationFilteredActions, department);
  
  // Get department-specific fluid movements
  let fluidMovements = deduplicationResult.consolidatedOperations;
  
  if (department === 'Drilling') {
    fluidMovements = getDrillingFluidMovements(deduplicationResult.consolidatedOperations);
  } else if (department === 'Production') {
    fluidMovements = getProductionFluidMovements(deduplicationResult.consolidatedOperations);
  }

  // Calculate total fluid volume (deduplicated) - only count delivery operations
  const deliveryMovements = fluidMovements.filter(movement => movement.isDelivery);
  const totalFluidVolume = deliveryMovements.reduce((sum, movement) => sum + movement.totalVolumeBbls, 0);
  
  // Count delivery operations
  const deliveryOperations = fluidMovements.filter(movement => movement.isDelivery).length;
  
  // Calculate fluid movement by type
  const movementTypeBreakdown = fluidMovements.reduce((breakdown, movement) => {
    breakdown[movement.movementType] = (breakdown[movement.movementType] || 0) + movement.totalVolumeBbls;
    return breakdown;
  }, {} as Record<string, number>);

  console.log(`✅ ${department} BULK FLUID METRICS:`, {
    originalActions: deduplicationResult.originalActions,
    consolidatedOperations: deduplicationResult.consolidatedOperations.length,
    duplicatesRemoved: deduplicationResult.duplicatesRemoved,
    totalFluidVolume: totalFluidVolume.toLocaleString() + ' bbls',
    deliveryOperations
  });
  
  // Additional debugging for Stena IceMAX
  if (locationFilter?.toLowerCase().includes('stena')) {
    const allOperationsVolume = deduplicationResult.consolidatedOperations.reduce((sum, op) => sum + op.totalVolumeBbls, 0);
    const deliveryOnlyVolume = deduplicationResult.consolidatedOperations.filter(op => op.isDelivery).reduce((sum, op) => sum + op.totalVolumeBbls, 0);
    
    // Debug May 2025 specifically for bulk fluid investigation
    const may2025Actions = currentMonth === 4 && currentYear === 2025 ? locationFilteredActions : [];
    console.log('🔍 MAY 2025 STENA ICEMAX BULK FLUID DEBUG:', {
      isFilteringMay2025: currentMonth === 4 && currentYear === 2025,
      monthFilter: currentMonth,
      yearFilter: currentYear,
      originalBulkActions: bulkActions.length,
      currentMonthActions: currentMonthActions.length,
      locationFilteredActions: locationFilteredActions.length,
      may2025ActionsCount: may2025Actions.length,
      kabalExpected: '34,622 bbls',
      sampleMay2025Actions: may2025Actions.slice(0, 10).map(a => ({
        id: a.id,
        startDate: a.startDate,
        vesselName: a.vesselName,
        atPort: a.atPort,
        destinationPort: a.destinationPort,
        volumeBbls: a.volumeBbls,
        action: a.action,
        bulkType: a.bulkType
      })),
      totalVolumeRawMay2025: may2025Actions.reduce((sum, a) => sum + a.volumeBbls, 0),
      locationFilterPattern: locationFilter
    });
    console.log('🔍 STENA DEDUPLICATION RESULT:', {
      originalActions: deduplicationResult.originalActions,
      consolidatedOperations: deduplicationResult.consolidatedOperations.length,
      duplicatesRemoved: deduplicationResult.duplicatesRemoved,
      volumeReduction: `${(651274.45).toLocaleString()} → ${allOperationsVolume.toLocaleString()} bbls (all ops) → ${deliveryOnlyVolume.toLocaleString()} bbls (deliveries only)`,
      reductionPercentage: `${(((651274.45 - deliveryOnlyVolume) / 651274.45) * 100).toFixed(1)}%`,
      sampleOperations: deduplicationResult.consolidatedOperations.slice(0, 5).map(op => ({
        vesselName: op.vesselName,
        bulkType: op.bulkType,
        totalVolumeBbls: op.totalVolumeBbls,
        originLocation: op.originLocation,
        destinationLocation: op.destinationLocation,
        movementType: op.movementType,
        isDelivery: op.isDelivery
      })),
      expectedVolume: '189,529 bbls',
      actualVolume: `${deliveryOnlyVolume.toLocaleString()} bbls`,
      stillOverBy: deliveryOnlyVolume > 189529 ? `${(deliveryOnlyVolume - 189529).toLocaleString()} bbls` : 'Within target!',
      kabalActivityComparison: {
        expectedKabalMay: {
          cargoOps: 291,
          waitingOnInstallation: 231,
          transit: 209,
          maneuvering: 71,
          totalHours: 802
        },
        actualDashboard: 'See voyageEventMetrics for comparison'
      },
      movementTypeAnalysis: {
        fourchonToOffshore: deduplicationResult.consolidatedOperations.filter(op => op.movementType === 'Fourchon-to-Offshore').length,
        offshoreToOffshore: deduplicationResult.consolidatedOperations.filter(op => op.movementType === 'Offshore-to-Offshore').length,
        vesselToFacility: deduplicationResult.consolidatedOperations.filter(op => op.movementType === 'Vessel-to-Facility').length,
        other: deduplicationResult.consolidatedOperations.filter(op => op.movementType === 'Other').length,
        deliveryOperations: deduplicationResult.consolidatedOperations.filter(op => op.isDelivery).length,
        nonDeliveryOperations: deduplicationResult.consolidatedOperations.filter(op => !op.isDelivery).length,
        totalOperations: deduplicationResult.consolidatedOperations.length
      }
    });
  }

  return {
    totalFluidVolume,
    deliveryOperations,
    fluidMovements: fluidMovements.length,
    deduplicationResult,
    movementTypeBreakdown,
    originalActionCount: deduplicationResult.originalActions,
    duplicatesRemoved: deduplicationResult.duplicatesRemoved
  };
};

/**
 * Enhanced integrated KPI calculation function
 */
export const calculateEnhancedKPIMetrics = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  voyageList: VoyageList[],
  costAllocation: CostAllocation[],
  bulkActions: BulkAction[],
  department: 'Drilling' | 'Production' | 'All' = 'All',
  filterMonth?: number,
  filterYear?: number,
  locationFilter?: string
): KPIMetrics & {
  enhancedMetrics: {
    manifestMetrics: ReturnType<typeof calculateEnhancedManifestMetrics>;
    voyageEventMetrics: ReturnType<typeof calculateEnhancedVoyageEventMetrics>;
    bulkFluidMetrics: ReturnType<typeof calculateEnhancedBulkFluidMetrics>;
  };
} => {
  console.log(`🎯 CALCULATING ENHANCED KPI METRICS for ${department}`, 
    filterMonth !== undefined ? `(${filterMonth + 1}/${filterYear})` : '(All Months)'
  );
  
  // Use provided filter dates or undefined for all months
  const currentMonth = filterMonth;
  const currentYear = filterYear;

  // Calculate enhanced metrics using new infrastructure
  const manifestMetrics = calculateEnhancedManifestMetrics(
    vesselManifests, costAllocation, currentMonth, currentYear, department
  );
  
  const voyageEventMetrics = calculateEnhancedVoyageEventMetrics(
    voyageEvents, costAllocation, currentMonth, currentYear, department
  );
  
  const bulkFluidMetrics = calculateEnhancedBulkFluidMetrics(
    bulkActions, currentMonth, currentYear, department, locationFilter
  );

  // Calculate lifts per hour using enhanced data
  const liftsPerCargoHour = voyageEventMetrics.cargoOpsHours > 0 
    ? manifestMetrics.totalLifts / voyageEventMetrics.cargoOpsHours 
    : 0;

  // Use existing cost calculation logic with proper month/year and location filtering
  let filteredEvents = voyageEvents;
  
  // Apply time filtering
  if (currentMonth !== undefined && currentYear !== undefined) {
    filteredEvents = filteredEvents.filter(event => 
      event.eventDate.getMonth() === currentMonth && 
      event.eventDate.getFullYear() === currentYear
    );
  }
  
  // Apply location filtering
  if (locationFilter && locationFilter !== 'All Locations') {
    const beforeLocationFilter = filteredEvents.length;
    
    // Get cost allocation data for location-based LC filtering
    const locationCostAllocations = costAllocation.filter(ca => {
      if (locationFilter === 'Thunder Horse (Drilling)') {
        return (ca.isThunderHorse && ca.isDrilling) || ca.description?.toLowerCase().includes('thunder horse');
      } else if (locationFilter === 'Mad Dog (Drilling)') {
        return (ca.isMadDog && ca.isDrilling) || ca.description?.toLowerCase().includes('mad dog');
      } else if (locationFilter === 'Thunder Horse (Production)') {
        return (ca.isThunderHorse && !ca.isDrilling) || ca.description?.toLowerCase().includes('thunder horse');
      } else if (locationFilter === 'Mad Dog (Production)') {
        return (ca.isMadDog && !ca.isDrilling) || ca.description?.toLowerCase().includes('mad dog');
      }
      
      // Generic location filtering
      return (
        ca.locationReference?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        ca.description?.toLowerCase().includes(locationFilter.toLowerCase()) ||
        ca.rigLocation?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    });
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber).filter(Boolean));
    
    // Filter events by location-specific LCs and direct location matching
    filteredEvents = filteredEvents.filter(event => 
      (event.lcNumber && locationLCs.has(event.lcNumber)) ||
      event.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      event.mappedLocation?.toLowerCase().includes(locationFilter.toLowerCase())
    );
    
    console.log(`📍 Vessel cost location filter "${locationFilter}": Found ${locationCostAllocations.length} cost allocations, ${locationLCs.size} unique LCs, ${filteredEvents.length}/${beforeLocationFilter} events match`);
  }
    
  const vesselCostMetrics = calculateVesselCostMetrics(filteredEvents);
  
  // DETAILED COST BREAKDOWN LOGGING FOR DISCREPANCY ANALYSIS
  console.log(`💰 LOGISTICS COST KPI CALCULATION for ${department}:`, {
    filteredEventsCount: filteredEvents.length,
    locationFilter: locationFilter || 'All Locations',
    totalVesselCost: vesselCostMetrics.totalVesselCost,
    averageVesselCostPerHour: vesselCostMetrics.averageVesselCostPerHour,
    vesselCostByDepartment: vesselCostMetrics.vesselCostByDepartment
  });
  
  // DETAILED EVENT-BY-EVENT COST ANALYSIS
  let existingCostTotal = 0;
  let calculatedCostTotal = 0;
  let totalHoursWithCosts = 0;
  const costBreakdownByVessel = new Map();
  const costBreakdownByLC = new Map();
  const costBreakdownByActivity = new Map();
  
  filteredEvents.forEach(event => {
    const hours = event.finalHours || 0;
    const vesselName = event.vesselName || 'Unknown';
    const lcNumber = event.lcNumber || 'No LC';
    const parentEvent = event.parentEvent || 'Unknown Activity';
    
    let eventCost = 0;
    let costSource = '';
    
    if (event.vesselCostTotal) {
      eventCost = event.vesselCostTotal;
      costSource = 'existing';
      existingCostTotal += eventCost;
    } else if (hours > 0 && event.eventDate) {
      // Calculate cost on-the-fly using vessel cost rates
      const dailyRate = event.eventDate >= new Date('2025-04-01') ? 37800 : 33000;
      eventCost = (hours / 24) * dailyRate;
      costSource = 'calculated';
      calculatedCostTotal += eventCost;
    }
    
    if (eventCost > 0) {
      totalHoursWithCosts += hours;
      
      // Track by vessel
      if (!costBreakdownByVessel.has(vesselName)) {
        costBreakdownByVessel.set(vesselName, { cost: 0, hours: 0, events: 0 });
      }
      const vesselData = costBreakdownByVessel.get(vesselName);
      vesselData.cost += eventCost;
      vesselData.hours += hours;
      vesselData.events += 1;
      
      // Track by LC
      if (!costBreakdownByLC.has(lcNumber)) {
        costBreakdownByLC.set(lcNumber, { cost: 0, hours: 0, events: 0 });
      }
      const lcData = costBreakdownByLC.get(lcNumber);
      lcData.cost += eventCost;
      lcData.hours += hours;
      lcData.events += 1;
      
      // Track by activity
      if (!costBreakdownByActivity.has(parentEvent)) {
        costBreakdownByActivity.set(parentEvent, { cost: 0, hours: 0, events: 0 });
      }
      const activityData = costBreakdownByActivity.get(parentEvent);
      activityData.cost += eventCost;
      activityData.hours += hours;
      activityData.events += 1;
    }
  });
  
  console.log(`🔍 LOGISTICS COST DETAILED BREAKDOWN:`, {
    totalLogisticsCost: vesselCostMetrics.totalVesselCost,
    existingCostTotal,
    calculatedCostTotal,
    totalHoursWithCosts,
    costBreakdownByVessel: Array.from(costBreakdownByVessel.entries())
      .sort(([,a], [,b]) => b.cost - a.cost)
      .slice(0, 10)
      .map(([vessel, data]) => ({ 
        vessel, 
        cost: Math.round(data.cost), 
        hours: Math.round(data.hours),
        events: data.events 
      })),
    costBreakdownByLC: Array.from(costBreakdownByLC.entries())
      .sort(([,a], [,b]) => b.cost - a.cost)
      .slice(0, 10)
      .map(([lc, data]) => ({ 
        lc, 
        cost: Math.round(data.cost), 
        hours: Math.round(data.hours),
        events: data.events 
      })),
    costBreakdownByActivity: Array.from(costBreakdownByActivity.entries())
      .sort(([,a], [,b]) => b.cost - a.cost)
      .slice(0, 10)
      .map(([activity, data]) => ({ 
        activity, 
        cost: Math.round(data.cost), 
        hours: Math.round(data.hours),
        events: data.events 
      }))
  });
  
  if (vesselCostMetrics.totalVesselCost === 0 && filteredEvents.length > 0) {
    console.warn(`⚠️ No vessel cost calculated for ${department} with ${filteredEvents.length} filtered events - check cost allocation data`);
  }

  // Build enhanced KPI metrics response
  const enhancedKPIMetrics = {
    // Time Metrics (enhanced)
    totalOffshoreTime: voyageEventMetrics.totalOffshoreTime,
    totalOnshoreTime: 0, // Would need onshore calculation
    productiveHours: voyageEventMetrics.productiveHours,
    nonProductiveHours: voyageEventMetrics.nonProductiveHours,
    
    // Drilling Metrics (enhanced)
    drillingHours: department === 'Drilling' ? voyageEventMetrics.totalHours : 0,
    drillingNPTHours: department === 'Drilling' ? voyageEventMetrics.nonProductiveHours : 0,
    drillingNPTPercentage: department === 'Drilling' && voyageEventMetrics.totalHours > 0 
      ? (voyageEventMetrics.nonProductiveHours / voyageEventMetrics.totalHours) * 100 : 0,
    drillingCargoOpsHours: voyageEventMetrics.cargoOpsHours,
    
    // Waiting Time Metrics (enhanced)
    waitingTimeOffshore: voyageEventMetrics.waitingTimeOffshore,
    waitingTimePercentage: voyageEventMetrics.waitingTimePercentage,
    weatherWaitingHours: 0, // Would need weather-specific calculation
    installationWaitingHours: voyageEventMetrics.waitingTimeOffshore,
    
    // Cargo Metrics (enhanced)
    cargoOpsHours: voyageEventMetrics.cargoOpsHours,
    liftsPerCargoHour,
    totalLifts: manifestMetrics.totalLifts,
    totalDeckTons: manifestMetrics.totalDeckTons,
    totalRTTons: manifestMetrics.totalRTTons,
    cargoTonnagePerVisit: manifestMetrics.cargoTonnagePerVisit,
    
    // Vessel Metrics (enhanced)
    vesselUtilizationRate: voyageEventMetrics.vesselUtilization,
    averageTripDuration: 0, // Would use existing calculation
    
    // Cost Metrics
    totalVesselCost: vesselCostMetrics.totalVesselCost,
    averageVesselCostPerHour: vesselCostMetrics.averageVesselCostPerHour,
    averageVesselCostPerDay: vesselCostMetrics.averageVesselCostPerDay,
    vesselCostByDepartment: vesselCostMetrics.vesselCostByDepartment,
    vesselCostByActivity: vesselCostMetrics.vesselCostByActivity,
    vesselCostRateBreakdown: vesselCostMetrics.vesselCostRateBreakdown,
    
    // Placeholder for budget analysis
    budgetVsActualAnalysis: {} as any,
    
    // Voyage List Metrics (would use existing calculations)
    voyageListMetrics: {} as any,
    
    // Month-over-month changes (placeholder)
    momChanges: {
      waitingTimePercentage: 0,
      cargoOpsHours: 0,
      liftsPerCargoHour: 0,
      drillingNPTPercentage: 0,
      vesselUtilizationRate: 0,
      totalVesselCost: 0,
      averageVesselCostPerHour: 0
    },
    
    // Enhanced metrics
    enhancedMetrics: {
      manifestMetrics,
      voyageEventMetrics,
      bulkFluidMetrics
    }
  };

  console.log(`✅ ENHANCED KPI CALCULATION COMPLETE for ${department}`);
  console.log(`   Cargo Tons: ${manifestMetrics.totalCargoTons.toLocaleString()}`);
  console.log(`   Lifts/Hr: ${liftsPerCargoHour.toFixed(2)}`);
  console.log(`   Productive Hours: ${voyageEventMetrics.productiveHours.toFixed(1)}`);
  console.log(`   Vessel Utilization: ${voyageEventMetrics.vesselUtilization.toFixed(1)}%`);
  console.log(`   Fluid Volume: ${bulkFluidMetrics.totalFluidVolume.toLocaleString()} bbls`);

  return enhancedKPIMetrics;
};

/**
 * Original KPI metrics calculation utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Calculate vessel manifest KPIs using exact PowerBI DAX logic
 */
export const calculateManifestMetrics = (
  vesselManifests: VesselManifest[],
  currentMonth: number,
  currentYear: number
) => {
  // Filter manifests for current month
  const currentMonthManifests = vesselManifests.filter(manifest => 
    manifest.manifestDate.getMonth() === currentMonth && 
    manifest.manifestDate.getFullYear() === currentYear
  );

  // 1. Cargo Tonnage Per Visit (DAX: DIVIDE(SUM(Deck Tons) + SUM(RT Tons), DISTINCTCOUNT(Manifest Number), 0))
  const totalDeckTons = currentMonthManifests.reduce((sum, manifest) => sum + manifest.deckTons, 0);
  const totalRTTons = currentMonthManifests.reduce((sum, manifest) => sum + manifest.rtTons, 0);
  const totalCargoTons = totalDeckTons + totalRTTons;
  const uniqueManifests = new Set(currentMonthManifests.map(m => m.manifestNumber)).size;
  const cargoTonnagePerVisit = uniqueManifests > 0 ? totalCargoTons / uniqueManifests : 0;

  // 2. RT Tons Analysis
  const rtTons = totalRTTons;
  const rtPercentage = totalCargoTons > 0 ? (totalRTTons / totalCargoTons) * 100 : 0;
  const rtStatus = rtTons > 0 ? "⚠️ RT Present" : "✓ No RT";

  // 3. Wet Bulk Fluid Analysis (DAX: Normalize bbls + gals/42)
  const totalWetBulkBbls = currentMonthManifests.reduce((sum, manifest) => sum + manifest.wetBulkBbls, 0);
  const totalWetBulkGals = currentMonthManifests.reduce((sum, manifest) => sum + manifest.wetBulkGals, 0);
  const totalWetBulkNormalized = totalWetBulkBbls + (totalWetBulkGals / 42);

  // Fluid type breakdown based on remarks
  const fluidBreakdown = currentMonthManifests.reduce((breakdown, manifest) => {
    const remarks = (manifest.remarks || '').toLowerCase();
    const manifestWetBulk = manifest.wetBulkBbls + (manifest.wetBulkGals / 42);
    
    if (remarks.includes('fuel') || remarks.includes('diesel')) {
      breakdown.fuel += manifestWetBulk;
    } else if (remarks.includes('water') || remarks.includes('potable')) {
      breakdown.water += manifestWetBulk;
    } else if (remarks.includes('methanol')) {
      breakdown.methanol += manifestWetBulk;
    } else if (remarks.includes('mud') || remarks.includes('brine') || remarks.includes('drilling')) {
      breakdown.drillingFluid += manifestWetBulk;
    } else if (manifestWetBulk > 0) {
      breakdown.other += manifestWetBulk;
    }
    
    return breakdown;
  }, { fuel: 0, water: 0, methanol: 0, drillingFluid: 0, other: 0 });

  // Calculate fluid percentages
  const fluidPercentages = totalWetBulkNormalized > 0 ? {
    fuel: (fluidBreakdown.fuel / totalWetBulkNormalized) * 100,
    water: (fluidBreakdown.water / totalWetBulkNormalized) * 100,
    methanol: (fluidBreakdown.methanol / totalWetBulkNormalized) * 100,
    drillingFluid: (fluidBreakdown.drillingFluid / totalWetBulkNormalized) * 100,
    other: (fluidBreakdown.other / totalWetBulkNormalized) * 100
  } : { fuel: 0, water: 0, methanol: 0, drillingFluid: 0, other: 0 };

  // 4. Location Visit Frequency
  const locationVisits = currentMonthManifests.reduce((visits, manifest) => {
    const location = manifest.offshoreLocation;
    if (!visits[location]) {
      visits[location] = new Set();
    }
    visits[location].add(manifest.manifestNumber);
    return visits;
  }, {} as Record<string, Set<string>>);

  const locationVisitCounts = Object.entries(locationVisits).map(([location, manifestSet]) => ({
    location,
    visitCount: manifestSet.size,
    tonnage: currentMonthManifests
      .filter(m => m.offshoreLocation === location)
      .reduce((sum, m) => sum + m.deckTons + m.rtTons, 0)
  }));

  // 5. Vessel Type Performance Analysis (requires vessel classification data)
  const vesselTypePerformance = currentMonthManifests.reduce((performance, manifest) => {
    const vesselType = manifest.vesselType || 'Unknown';
    const cargoTons = manifest.deckTons + manifest.rtTons;
    
    if (!performance[vesselType]) {
      performance[vesselType] = { tonnage: 0, manifests: 0, lifts: 0 };
    }
    
    performance[vesselType].tonnage += cargoTons;
    performance[vesselType].manifests += 1;
    performance[vesselType].lifts += manifest.lifts;
    
    return performance;
  }, {} as Record<string, { tonnage: number; manifests: number; lifts: number }>);

  // Calculate FSV vs OSV metrics
  const fsvTonnage = vesselTypePerformance['FSV']?.tonnage || 0;
  const osvTonnage = vesselTypePerformance['OSV']?.tonnage || 0;
  const fsvVsOsvRatio = osvTonnage > 0 ? fsvTonnage / osvTonnage : 0;

  return {
    // Core metrics
    totalDeckTons,
    totalRTTons,
    totalCargoTons,
    cargoTonnagePerVisit,
    uniqueManifests,
    
    // RT Analysis
    rtTons,
    rtPercentage,
    rtStatus,
    
    // Wet Bulk Analysis
    totalWetBulkNormalized,
    fluidBreakdown,
    fluidPercentages,
    
    // Location Analysis
    locationVisitCounts,
    
    // Vessel Type Performance
    vesselTypePerformance,
    fsvTonnage,
    osvTonnage,
    fsvVsOsvRatio,
    
    // Total metrics
    totalLifts: currentMonthManifests.reduce((sum, manifest) => sum + manifest.lifts, 0),
    totalManifests: currentMonthManifests.length
  };
};

/**
 * Calculate Budget vs Actual Vessel Cost Analysis
 */
export const calculateBudgetVsActualCosts = (
  costAllocation: CostAllocation[],
  currentMonthEvents: VoyageEvent[],
  currentMonth: number,
  currentYear: number
) => {
  // Filter cost allocations for current month/year (if they have date info)
  const relevantCostAllocations = costAllocation.filter(ca => {
    if (ca.month !== undefined && ca.year !== undefined) {
      return ca.month === currentMonth + 1 && ca.year === currentYear; // Note: month is 1-based in cost allocation
    }
    return true; // Include if no date filtering available
  });

  // Calculate total budgeted vessel costs
  const totalBudgetedVesselCost = relevantCostAllocations.reduce((sum, ca) => {
    return sum + (ca.budgetedVesselCost || 0);
  }, 0);

  // Calculate total actual vessel costs for events with LC numbers
  const eventsWithLCs = currentMonthEvents.filter(event => event.lcNumber);
  const totalActualVesselCost = eventsWithLCs.reduce((sum, event) => {
    return sum + (event.vesselCostTotal || 0);
  }, 0);

  // Calculate budget vs actual by LC Number
  const lcComparison: Record<string, {
    lcNumber: string;
    budgetedCost: number;
    actualCost: number;
    variance: number;
    variancePercentage: number;
    budgetedDays: number;
    actualDays: number;
    budgetedRate: number;
    actualRate: number;
  }> = {};

  // Build budget side from cost allocation
  relevantCostAllocations.forEach(ca => {
    if (ca.lcNumber) {
      lcComparison[ca.lcNumber] = {
        lcNumber: ca.lcNumber,
        budgetedCost: ca.budgetedVesselCost || 0,
        actualCost: 0,
        variance: 0,
        variancePercentage: 0,
        budgetedDays: ca.totalAllocatedDays || 0,
        actualDays: 0,
        budgetedRate: ca.vesselDailyRateUsed || 0,
        actualRate: 0
      };
    }
  });

  // Add actual costs by LC Number
  eventsWithLCs.forEach(event => {
    if (event.lcNumber) {
      if (!lcComparison[event.lcNumber]) {
        lcComparison[event.lcNumber] = {
          lcNumber: event.lcNumber,
          budgetedCost: 0,
          actualCost: 0,
          variance: 0,
          variancePercentage: 0,
          budgetedDays: 0,
          actualDays: 0,
          budgetedRate: 0,
          actualRate: 0
        };
      }
      
      lcComparison[event.lcNumber].actualCost += event.vesselCostTotal || 0;
      lcComparison[event.lcNumber].actualDays += (event.finalHours || 0) / 24;
      lcComparison[event.lcNumber].actualRate = event.vesselDailyRate || 0;
    }
  });

  // Calculate variances
  Object.values(lcComparison).forEach(lc => {
    lc.variance = lc.actualCost - lc.budgetedCost;
    lc.variancePercentage = lc.budgetedCost > 0 ? (lc.variance / lc.budgetedCost) * 100 : 0;
  });

  // Calculate summary statistics
  const totalVariance = totalActualVesselCost - totalBudgetedVesselCost;
  const totalVariancePercentage = totalBudgetedVesselCost > 0 ? (totalVariance / totalBudgetedVesselCost) * 100 : 0;
  
  const lcCount = Object.keys(lcComparison).length;
  const lcsOverBudget = Object.values(lcComparison).filter(lc => lc.variance > 0).length;
  const lcsUnderBudget = Object.values(lcComparison).filter(lc => lc.variance < 0).length;

  console.log(`💰 BUDGET VS ACTUAL VESSEL COST ANALYSIS:`);
  console.log(`   📊 Total Budgeted: $${totalBudgetedVesselCost.toLocaleString()}`);
  console.log(`   📊 Total Actual: $${totalActualVesselCost.toLocaleString()}`);
  console.log(`   📊 Total Variance: $${totalVariance.toLocaleString()} (${totalVariancePercentage.toFixed(2)}%)`);
  console.log(`   📈 LCs Analyzed: ${lcCount}`);
  console.log(`   🔴 Over Budget: ${lcsOverBudget} LCs`);
  console.log(`   🟢 Under Budget: ${lcsUnderBudget} LCs`);

  return {
    totalBudgetedVesselCost,
    totalActualVesselCost,
    totalVariance,
    totalVariancePercentage,
    lcComparison,
    lcCount,
    lcsOverBudget,
    lcsUnderBudget
  };
};

/**
 * Calculate KPI metrics from processed data using exact PowerBI DAX logic
 */
export const calculateMetrics = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  voyageList: VoyageList[] = [],
  costAllocation: CostAllocation[] = []
): KPIMetrics => {
  // Filter for current month (you can adjust this based on your needs)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthEvents = voyageEvents.filter(event => 
    event.eventDate.getMonth() === currentMonth && 
    event.eventDate.getFullYear() === currentYear
  );
  
  // Previous month for MoM calculations
  const prevMonthEvents = voyageEvents.filter(event => {
    const date = event.eventDate;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  });

  // ===== EXACT DAX IMPLEMENTATIONS =====

  // Waiting Time Offshore (DAX: Port Type = "rig" AND Parent Event = "Waiting on Installation")
  const waitingTimeOffshore = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent === 'Waiting on Installation'
    )
  );

  // Total Offshore Time (DAX: Complex logic with rig activities + base transit)
  const rigActivitiesExcludingWeather = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent !== 'Waiting on Weather'
    )
  );
  
  const baseTransitTime = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'base' && 
      event.parentEvent === 'Transit'
    )
  );
  
  const totalOffshoreTime = rigActivitiesExcludingWeather + baseTransitTime;

  // Waiting Time Percentage (DAX: DIVIDE([Waiting Time Offshore], [Total Offshore Time], 0))
  const waitingTimePercentage = totalOffshoreTime > 0 ? 
    (waitingTimeOffshore / totalOffshoreTime) * 100 : 0;

  // Total Onshore Time (all base activities except transit)
  const totalOnshoreTime = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'base' && 
      event.parentEvent !== 'Transit'
    )
  );

  // Productive vs Non-Productive Hours
  const productiveHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.activityCategory === 'Productive')
  );
  
  const nonProductiveHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.activityCategory === 'Non-Productive')
  );

  // Drilling-specific metrics (filter by department = "Drilling")
  const drillingEvents = currentMonthEvents.filter(event => event.department === 'Drilling');
  const drillingHours = calculateTotalHours(drillingEvents);
  const drillingNPTHours = calculateTotalHours(
    drillingEvents.filter(event => event.activityCategory === 'Non-Productive')
  );
  const drillingNPTPercentage = drillingHours > 0 ? (drillingNPTHours / drillingHours) * 100 : 0;
  const drillingCargoOpsHours = calculateTotalHours(
    drillingEvents.filter(event => event.parentEvent === 'Cargo Ops')
  );

  // Weather and Installation Waiting breakdown
  const weatherWaitingHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.parentEvent === 'Waiting on Weather')
  );
  
  const installationWaitingHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.parentEvent === 'Waiting on Installation')
  );

  // Cargo Operations Hours (Parent Event = "Cargo Ops")
  const cargoOpsHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.parentEvent === 'Cargo Ops')
  );

  // Calculate manifest metrics using exact DAX formulas
  const manifestMetrics = calculateManifestMetrics(vesselManifests, currentMonth, currentYear);

  // Lifts per Cargo Hour (using manifest data and voyage event cargo hours)
  const liftsPerCargoHour = cargoOpsHours > 0 ? manifestMetrics.totalLifts / cargoOpsHours : 0;

  // Use manifest metrics for cargo calculations
  const totalLifts = manifestMetrics.totalLifts;
  const totalDeckTons = manifestMetrics.totalDeckTons;
  const totalRTTons = manifestMetrics.totalRTTons;
  const cargoTonnagePerVisit = manifestMetrics.cargoTonnagePerVisit;

  // Vessel Utilization Rate (Productive Hours / Total Hours)
  const totalHours = totalOffshoreTime + totalOnshoreTime;
  const vesselUtilizationRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

  // Average Trip Duration
  const averageTripDuration = calculateAverageTripDuration(currentMonthEvents);
  
  // VESSEL COST CALCULATIONS
  const vesselCostMetrics = calculateVesselCostMetrics(currentMonthEvents);
  const prevVesselCostMetrics = calculateVesselCostMetrics(prevMonthEvents);

  // BUDGET VS ACTUAL COST ANALYSIS (NEW)
  const budgetCostAnalysis = calculateBudgetVsActualCosts(costAllocation, currentMonthEvents, currentMonth, currentYear);

  // Previous month calculations for MoM changes
  const prevWaitingTimeOffshore = calculateTotalHours(
    prevMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent === 'Waiting on Installation'
    )
  );
  
  const prevRigActivities = calculateTotalHours(
    prevMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent !== 'Waiting on Weather'
    )
  );
  
  const prevBaseTransit = calculateTotalHours(
    prevMonthEvents.filter(event => 
      event.portType === 'base' && 
      event.parentEvent === 'Transit'
    )
  );
  
  const prevTotalOffshoreTime = prevRigActivities + prevBaseTransit;
  const prevWaitingTimePercentage = prevTotalOffshoreTime > 0 ? 
    (prevWaitingTimeOffshore / prevTotalOffshoreTime) * 100 : 0;
  
  const prevCargoOpsHours = calculateTotalHours(
    prevMonthEvents.filter(event => event.parentEvent === 'Cargo Ops')
  );

  // Month-over-month changes
  const waitingTimePercentageMoM = waitingTimePercentage - prevWaitingTimePercentage;
  const cargoOpsHoursMoM = prevCargoOpsHours > 0 ? 
    ((cargoOpsHours - prevCargoOpsHours) / prevCargoOpsHours) * 100 : 0;

  console.log('📊 KPI Calculations Summary:', {
    waitingTimeOffshore: `${waitingTimeOffshore}h`,
    totalOffshoreTime: `${totalOffshoreTime}h`,
    waitingTimePercentage: `${waitingTimePercentage.toFixed(2)}%`,
    cargoOpsHours: `${cargoOpsHours}h`,
    drillingHours: `${drillingHours}h`,
    vesselUtilizationRate: `${vesselUtilizationRate.toFixed(2)}%`,
    // Vessel cost metrics
    totalVesselCost: `$${vesselCostMetrics.totalVesselCost.toLocaleString()}`,
    averageVesselCostPerHour: `$${vesselCostMetrics.averageVesselCostPerHour.toFixed(2)}/hr`,
    averageVesselCostPerDay: `$${vesselCostMetrics.averageVesselCostPerDay.toFixed(2)}/day`,
    // Manifest metrics
    cargoTonnagePerVisit: `${cargoTonnagePerVisit.toFixed(2)} tons`,
    totalManifests: manifestMetrics.totalManifests,
    rtPercentage: `${manifestMetrics.rtPercentage.toFixed(2)}%`,
    totalWetBulk: `${manifestMetrics.totalWetBulkNormalized.toFixed(2)} bbls`,
    fsvVsOsvRatio: manifestMetrics.fsvVsOsvRatio.toFixed(2)
  });

  return {
    totalOffshoreTime,
    totalOnshoreTime,
    productiveHours,
    nonProductiveHours,
    drillingHours,
    drillingNPTHours,
    drillingNPTPercentage,
    drillingCargoOpsHours,
    waitingTimeOffshore,
    waitingTimePercentage,
    weatherWaitingHours,
    installationWaitingHours,
    cargoOpsHours,
    liftsPerCargoHour,
    totalLifts,
    totalDeckTons,
    totalRTTons,
    vesselUtilizationRate,
    averageTripDuration,
    cargoTonnagePerVisit,
    
    // Vessel Cost Metrics
    totalVesselCost: vesselCostMetrics.totalVesselCost,
    averageVesselCostPerHour: vesselCostMetrics.averageVesselCostPerHour,
    averageVesselCostPerDay: vesselCostMetrics.averageVesselCostPerDay,
    vesselCostByDepartment: vesselCostMetrics.vesselCostByDepartment,
    vesselCostByActivity: vesselCostMetrics.vesselCostByActivity,
    vesselCostRateBreakdown: vesselCostMetrics.vesselCostRateBreakdown,
    
    // Budget vs Actual Cost Analysis
    budgetVsActualAnalysis: budgetCostAnalysis,
    
    momChanges: {
      waitingTimePercentage: waitingTimePercentageMoM,
      cargoOpsHours: cargoOpsHoursMoM,
      liftsPerCargoHour: 0, // Would need previous month manifests for accurate calculation
      drillingNPTPercentage: 0, // Would need previous month drilling calculation
      vesselUtilizationRate: 0, // Would need previous month calculation
      totalVesselCost: vesselCostMetrics.totalVesselCost - prevVesselCostMetrics.totalVesselCost,
      averageVesselCostPerHour: vesselCostMetrics.averageVesselCostPerHour - prevVesselCostMetrics.averageVesselCostPerHour
    }
  };
}; 