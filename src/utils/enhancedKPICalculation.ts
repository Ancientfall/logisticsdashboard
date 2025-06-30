/**
 * Enhanced KPI Calculation Utilities
 * Fixes all major KPI issues by using CostAllocation.xlsx as master data source
 * Implements proper vessel codes classification and LC-based filtering
 */

import { VoyageEvent, VesselManifest, CostAllocation } from '../types';
import { 
  getDrillingCostAllocations, 
  getProductionCostAllocations
} from './costAllocationProcessor';
import { classifyEventWithVesselCodes, isProductiveEvent, isCargoOperationEvent } from './vesselCodesProcessor';
import { getAllDrillingCapableLocations, mapCostAllocationLocation } from '../data/masterFacilities';

// ==================== ENHANCED KPI INTERFACES ====================

export interface EnhancedKPIMetrics {
  // Cargo Metrics (Fixed)
  cargoTons: {
    totalCargoTons: number;
    totalDeckTons: number;
    totalRTTons: number;
    cargoTonnagePerVisit: number;
    validationRate: number;
    drillingOnlyTons: number;
    completionFluidTons: number;
  };
  
  // Lifts/Hr Metrics (Fixed)
  liftsPerHour: {
    totalLifts: number;
    cargoOperationHours: number;
    liftsPerHour: number;
    validatedCargoOpsHours: number;
    lcValidationRate: number;
  };
  
  // OSV Productive Hours (Fixed)
  productiveHours: {
    totalOSVHours: number;
    productiveHours: number;
    nonProductiveHours: number;
    productivePercentage: number;
    vesselCodesCoverage: number;
  };
  
  // Waiting Time Offshore (Enhanced)
  waitingTime: {
    waitingTimeOffshore: number;
    waitingPercentage: number;
    weatherExcludedHours: number;
    installationWaitingHours: number;
  };
  
  // Vessel Utilization (Enhanced)
  utilization: {
    vesselUtilization: number;
    transitTimeHours: number;
    atLocationHours: number;
    totalOffshoreTime: number;
    utilizationConfidence: 'High' | 'Medium' | 'Low';
  };
  
  // Data Quality Metrics
  dataQuality: {
    lcCoverage: number;
    vesselCodesCoverage: number;
    costAllocationValidation: number;
    departmentClassificationAccuracy: number;
  };
}

// ==================== COST ALLOCATION MASTER DATA FUNCTIONS ====================

/**
 * Filter cost allocations by selected location
 */
export function filterCostAllocationsByLocation(
  costAllocations: CostAllocation[],
  selectedLocation?: string
): CostAllocation[] {
  if (!selectedLocation || selectedLocation === 'All Locations') {
    return costAllocations;
  }

  // Find the selected facility
  const selectedFacility = getAllDrillingCapableLocations().find(
    f => f.displayName === selectedLocation
  );

  if (!selectedFacility) {
    console.warn(`⚠️ LOCATION FILTER: Selected location "${selectedLocation}" not found in master facilities`);
    return costAllocations;
  }

  // Filter cost allocations that match the selected location
  const filteredAllocations = costAllocations.filter(allocation => {
    const mappedLocation = mapCostAllocationLocation(
      allocation.rigLocation,
      allocation.locationReference
    );
    
    return mappedLocation && mappedLocation.displayName === selectedLocation;
  });

  console.log(`🎯 LOCATION FILTER: ${selectedLocation} -> ${filteredAllocations.length}/${costAllocations.length} cost allocations match`);
  return filteredAllocations;
}

/**
 * Get authoritative drilling LC numbers from CostAllocation.xlsx
 */
export function getAuthoritativeDrillingLCs(costAllocations: CostAllocation[]): Set<string> {
  const drillingLCs = new Set<string>();
  
  // Get drilling cost allocations using enhanced processor
  const drillingCostAllocations = getDrillingCostAllocations(costAllocations);
  
  drillingCostAllocations.forEach(ca => {
    if (ca.lcNumber) {
      drillingLCs.add(ca.lcNumber.trim());
    }
  });
  
  console.log(`🏗️ AUTHORITATIVE DRILLING LCs: Found ${drillingLCs.size} drilling LC numbers from cost allocation`);
  return drillingLCs;
}

/**
 * Get authoritative production LC numbers from CostAllocation.xlsx
 */
export function getAuthoritativeProductionLCs(costAllocations: CostAllocation[]): Set<string> {
  const productionLCs = new Set<string>();
  
  // Get production cost allocations using enhanced processor
  const productionCostAllocations = getProductionCostAllocations(costAllocations);
  
  productionCostAllocations.forEach(ca => {
    if (ca.lcNumber) {
      productionLCs.add(ca.lcNumber.trim());
    }
  });
  
  console.log(`🏭 AUTHORITATIVE PRODUCTION LCs: Found ${productionLCs.size} production LC numbers from cost allocation`);
  return productionLCs;
}

/**
 * Validate event against cost allocation using LC number
 */
export function validateEventAgainstCostAllocation(
  event: VoyageEvent,
  authoritativeLCs: Set<string>
): boolean {
  if (!event.lcNumber) {
    return false;
  }
  
  return authoritativeLCs.has(event.lcNumber.trim());
}

/**
 * Validate manifest against cost allocation using cost code
 */
export function validateManifestAgainstCostAllocation(
  manifest: VesselManifest,
  authoritativeLCs: Set<string>
): boolean {
  if (!manifest.costCode) {
    return false;
  }
  
  return authoritativeLCs.has(manifest.costCode.trim());
}

// ==================== FIXED CARGO TONS KPI ====================

/**
 * FIXED: Cargo Tons KPI with proper drilling-only filtering using cost allocation LC numbers
 */
export function calculateFixedCargoTonsKPI(
  vesselManifests: VesselManifest[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' = 'Drilling',
  month?: number,
  year?: number,
  selectedLocation?: string
): EnhancedKPIMetrics['cargoTons'] {
  console.log(`🚚 FIXED CARGO TONS KPI: Starting calculation for ${department} department, location: ${selectedLocation || 'All Locations'}`);
  
  // CRITICAL FIX: Apply location filtering to cost allocations first
  const locationFilteredCostAllocations = filterCostAllocationsByLocation(costAllocations, selectedLocation);
  
  // Get authoritative LC numbers from location-filtered cost allocation
  const authoritativeLCs = department === 'Drilling' 
    ? getAuthoritativeDrillingLCs(locationFilteredCostAllocations)
    : getAuthoritativeProductionLCs(locationFilteredCostAllocations);
  
  // Filter manifests by time period if specified
  let filteredManifests = vesselManifests;
  if (month !== undefined && year !== undefined) {
    filteredManifests = vesselManifests.filter(manifest => 
      manifest.manifestDate.getMonth() === month && 
      manifest.manifestDate.getFullYear() === year
    );
  }
  
  // CRITICAL FIX: Filter manifests using cost allocation LC numbers as master source
  const validatedManifests = filteredManifests.filter(manifest => 
    validateManifestAgainstCostAllocation(manifest, authoritativeLCs)
  );
  
  // Calculate drilling-only cargo tons
  const totalDeckTons = validatedManifests.reduce((sum, manifest) => sum + manifest.deckTons, 0);
  const totalRTTons = validatedManifests.reduce((sum, manifest) => sum + manifest.rtTons, 0);
  const totalCargoTons = totalDeckTons + totalRTTons;
  
  // Enhanced metrics with drilling fluid differentiation
  const drillingOnlyTons = department === 'Drilling' ? totalCargoTons : 0;
  const completionFluidTons = department === 'Drilling' 
    ? validatedManifests
        .filter(m => m.cargoType?.toLowerCase().includes('completion') || 
                    m.remarks?.toLowerCase().includes('completion'))
        .reduce((sum, manifest) => sum + manifest.deckTons + manifest.rtTons, 0)
    : 0;
  
  // Calculate visits for tonnage per visit
  const uniqueManifests = new Set(validatedManifests.map(m => m.manifestNumber)).size;
  const cargoTonnagePerVisit = uniqueManifests > 0 ? totalCargoTons / uniqueManifests : 0;
  
  // Validation rate
  const validationRate = filteredManifests.length > 0 
    ? (validatedManifests.length / filteredManifests.length) * 100 
    : 0;
  
  console.log(`✅ FIXED CARGO TONS: ${totalCargoTons} tons (${validatedManifests.length}/${filteredManifests.length} manifests, ${validationRate.toFixed(1)}% validation rate)`);
  
  return {
    totalCargoTons,
    totalDeckTons,
    totalRTTons,
    cargoTonnagePerVisit,
    validationRate,
    drillingOnlyTons,
    completionFluidTons
  };
}

// ==================== FIXED LIFTS/HR KPI ====================

/**
 * FIXED: Lifts/Hr KPI with proper LC number validation and cost allocation location matching
 */
export function calculateFixedLiftsPerHourKPI(
  vesselManifests: VesselManifest[],
  voyageEvents: VoyageEvent[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' = 'Drilling',
  month?: number,
  year?: number,
  selectedLocation?: string
): EnhancedKPIMetrics['liftsPerHour'] {
  console.log(`🏗️ FIXED LIFTS/HR KPI: Starting calculation for ${department} department, location: ${selectedLocation || 'All Locations'}`);
  
  // CRITICAL FIX: Apply location filtering to cost allocations first
  const locationFilteredCostAllocations = filterCostAllocationsByLocation(costAllocations, selectedLocation);
  
  // Get authoritative LC numbers from location-filtered cost allocation
  const authoritativeLCs = department === 'Drilling' 
    ? getAuthoritativeDrillingLCs(locationFilteredCostAllocations)
    : getAuthoritativeProductionLCs(locationFilteredCostAllocations);
  
  // Filter manifests by time period and validate against cost allocation
  let filteredManifests = vesselManifests;
  if (month !== undefined && year !== undefined) {
    filteredManifests = vesselManifests.filter(manifest => 
      manifest.manifestDate.getMonth() === month && 
      manifest.manifestDate.getFullYear() === year
    );
  }
  
  const validatedManifests = filteredManifests.filter(manifest => 
    validateManifestAgainstCostAllocation(manifest, authoritativeLCs)
  );
  
  // Calculate total lifts from validated manifests
  const totalLifts = validatedManifests.reduce((sum, manifest) => sum + manifest.lifts, 0);
  
  // CRITICAL FIX: Calculate cargo operation hours using vessel codes and LC validation
  let filteredEvents = voyageEvents;
  if (month !== undefined && year !== undefined) {
    filteredEvents = voyageEvents.filter(event => 
      event.eventDate.getMonth() === month && 
      event.eventDate.getFullYear() === year
    );
  }
  
  // Filter events using cost allocation LC numbers as master source
  const validatedEvents = filteredEvents.filter(event => 
    validateEventAgainstCostAllocation(event, authoritativeLCs)
  );
  
  // Use vessel codes to identify cargo operations (replacing hardcoded strings)
  const cargoOperationEvents = validatedEvents.filter(event => 
    isCargoOperationEvent(event.parentEvent, event.event || '')
  );
  
  // Calculate cargo operation hours with proper LC percentage allocation
  const cargoOperationHours = cargoOperationEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  // Enhanced cargo ops hours calculation with vessel codes validation
  const validatedCargoOpsHours = cargoOperationEvents.filter(event => {
    const classification = classifyEventWithVesselCodes(event.parentEvent, event.event || '');
    return classification.confidence === 'High' || classification.confidence === 'Medium';
  }).reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  // Calculate lifts per hour
  const liftsPerHour = cargoOperationHours > 0 ? totalLifts / cargoOperationHours : 0;
  
  // Calculate validation rates
  const lcValidationRate = filteredEvents.length > 0 
    ? (validatedEvents.length / filteredEvents.length) * 100 
    : 0;
  
  console.log(`✅ FIXED LIFTS/HR: ${liftsPerHour.toFixed(2)} lifts/hr (${totalLifts} lifts ÷ ${cargoOperationHours.toFixed(1)} hrs, ${lcValidationRate.toFixed(1)}% LC validation)`);
  
  return {
    totalLifts,
    cargoOperationHours,
    liftsPerHour,
    validatedCargoOpsHours,
    lcValidationRate
  };
}

// ==================== FIXED OSV PRODUCTIVE HOURS KPI ====================

/**
 * FIXED: OSV Productive Hours using vessel codes classification and cost allocation filtering
 */
export function calculateFixedOSVProductiveHoursKPI(
  voyageEvents: VoyageEvent[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' = 'Drilling',
  month?: number,
  year?: number,
  selectedLocation?: string
): EnhancedKPIMetrics['productiveHours'] {
  console.log(`⚙️ FIXED OSV PRODUCTIVE HOURS: Starting calculation for ${department} department, location: ${selectedLocation || 'All Locations'}`);
  
  // CRITICAL FIX: Apply location filtering to cost allocations first
  const locationFilteredCostAllocations = filterCostAllocationsByLocation(costAllocations, selectedLocation);
  
  // Get authoritative LC numbers from location-filtered cost allocation
  const authoritativeLCs = department === 'Drilling' 
    ? getAuthoritativeDrillingLCs(locationFilteredCostAllocations)
    : getAuthoritativeProductionLCs(locationFilteredCostAllocations);
  
  // Filter events by time period and validate against cost allocation
  let filteredEvents = voyageEvents;
  if (month !== undefined && year !== undefined) {
    filteredEvents = voyageEvents.filter(event => 
      event.eventDate.getMonth() === month && 
      event.eventDate.getFullYear() === year
    );
  }
  
  const validatedEvents = filteredEvents.filter(event => 
    validateEventAgainstCostAllocation(event, authoritativeLCs)
  );
  
  // CRITICAL FIX: Use vessel codes for productive/non-productive classification
  const productiveEvents = validatedEvents.filter(event => 
    isProductiveEvent(event.parentEvent, event.event || '', event.portType)
  );
  
  const nonProductiveEvents = validatedEvents.filter(event => {
    const classification = classifyEventWithVesselCodes(event.parentEvent, event.event || '', event.portType);
    return classification.activityCategory === 'Non-Productive';
  });
  
  // Calculate productive hours with proper LC percentage allocation
  const productiveHours = productiveEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  const nonProductiveHours = nonProductiveEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  const totalOSVHours = productiveHours + nonProductiveHours;
  const productivePercentage = totalOSVHours > 0 ? (productiveHours / totalOSVHours) * 100 : 0;
  
  // Calculate vessel codes coverage
  const eventsWithVesselCodes = validatedEvents.filter(event => {
    const classification = classifyEventWithVesselCodes(event.parentEvent, event.event || '');
    return classification.source === 'VesselCodes';
  });
  
  const vesselCodesCoverage = validatedEvents.length > 0 
    ? (eventsWithVesselCodes.length / validatedEvents.length) * 100 
    : 0;
  
  console.log(`✅ FIXED OSV PRODUCTIVE HOURS: ${productivePercentage.toFixed(1)}% (${productiveHours.toFixed(1)}/${totalOSVHours.toFixed(1)} hrs, ${vesselCodesCoverage.toFixed(1)}% vessel codes coverage)`);
  
  return {
    totalOSVHours,
    productiveHours,
    nonProductiveHours,
    productivePercentage,
    vesselCodesCoverage
  };
}

// ==================== ENHANCED WAITING TIME OFFSHORE KPI ====================

/**
 * ENHANCED: Waiting Time Offshore with vessel codes classification and cost allocation validation
 */
export function calculateEnhancedWaitingTimeKPI(
  voyageEvents: VoyageEvent[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' = 'Drilling',
  month?: number,
  year?: number,
  selectedLocation?: string
): EnhancedKPIMetrics['waitingTime'] {
  console.log(`⏱️ ENHANCED WAITING TIME: Starting calculation for ${department} department, location: ${selectedLocation || 'All Locations'}`);
  
  // CRITICAL FIX: Apply location filtering to cost allocations first
  const locationFilteredCostAllocations = filterCostAllocationsByLocation(costAllocations, selectedLocation);
  
  // Get authoritative LC numbers from location-filtered cost allocation
  const authoritativeLCs = department === 'Drilling' 
    ? getAuthoritativeDrillingLCs(locationFilteredCostAllocations)
    : getAuthoritativeProductionLCs(locationFilteredCostAllocations);
  
  // Filter events by time period and validate against cost allocation
  let filteredEvents = voyageEvents;
  if (month !== undefined && year !== undefined) {
    filteredEvents = voyageEvents.filter(event => 
      event.eventDate.getMonth() === month && 
      event.eventDate.getFullYear() === year
    );
  }
  
  const validatedEvents = filteredEvents.filter(event => 
    validateEventAgainstCostAllocation(event, authoritativeLCs)
  );
  
  // Enhanced waiting time calculation using vessel codes
  const waitingEvents = validatedEvents.filter(event => {
    const classification = classifyEventWithVesselCodes(event.parentEvent, event.event || '');
    return classification.activityCategory === 'Non-Productive' && 
           !classification.vesselCode?.isWeatherRelated &&
           event.portType === 'rig';
  });
  
  const waitingTimeOffshore = waitingEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  // Calculate weather excluded hours
  const weatherEvents = validatedEvents.filter(event => {
    const classification = classifyEventWithVesselCodes(event.parentEvent, event.event || '');
    return classification.vesselCode?.isWeatherRelated || false;
  });
  
  const weatherExcludedHours = weatherEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  // Installation waiting hours
  const installationWaitingHours = validatedEvents
    .filter(event => event.parentEvent === 'Waiting on Installation' && event.portType === 'rig')
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);
  
  // Calculate total offshore time for percentage
  const totalOffshoreTime = validatedEvents
    .filter(event => event.portType === 'rig')
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);
  
  const waitingPercentage = totalOffshoreTime > 0 ? (waitingTimeOffshore / totalOffshoreTime) * 100 : 0;
  
  console.log(`✅ ENHANCED WAITING TIME: ${waitingTimeOffshore.toFixed(1)} hrs (${waitingPercentage.toFixed(1)}%, weather excluded: ${weatherExcludedHours.toFixed(1)} hrs)`);
  
  return {
    waitingTimeOffshore,
    waitingPercentage,
    weatherExcludedHours,
    installationWaitingHours
  };
}

// ==================== ENHANCED VESSEL UTILIZATION KPI ====================

/**
 * ENHANCED: Vessel Utilization with proper transit time inclusion and cost allocation validation
 */
export function calculateEnhancedVesselUtilizationKPI(
  voyageEvents: VoyageEvent[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' = 'Drilling',
  month?: number,
  year?: number,
  selectedLocation?: string
): EnhancedKPIMetrics['utilization'] {
  console.log(`📊 ENHANCED VESSEL UTILIZATION: Starting calculation for ${department} department, location: ${selectedLocation || 'All Locations'}`);
  
  // CRITICAL FIX: Apply location filtering to cost allocations first
  const locationFilteredCostAllocations = filterCostAllocationsByLocation(costAllocations, selectedLocation);
  
  // Get authoritative LC numbers from location-filtered cost allocation
  const authoritativeLCs = department === 'Drilling' 
    ? getAuthoritativeDrillingLCs(locationFilteredCostAllocations)
    : getAuthoritativeProductionLCs(locationFilteredCostAllocations);
  
  // Filter events by time period and validate against cost allocation
  let filteredEvents = voyageEvents;
  if (month !== undefined && year !== undefined) {
    filteredEvents = voyageEvents.filter(event => 
      event.eventDate.getMonth() === month && 
      event.eventDate.getFullYear() === year
    );
  }
  
  const validatedEvents = filteredEvents.filter(event => 
    validateEventAgainstCostAllocation(event, authoritativeLCs)
  );
  
  // Calculate productive hours using vessel codes
  const productiveEvents = validatedEvents.filter(event => 
    isProductiveEvent(event.parentEvent, event.event || '', event.portType)
  );
  
  const productiveHours = productiveEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  // Enhanced transit time calculation (both directions)
  const transitEvents = validatedEvents.filter(event => {
    const classification = classifyEventWithVesselCodes(event.parentEvent, event.event || '');
    return classification.vesselCode?.isTransitOperation || 
           event.parentEvent.toLowerCase().includes('transit') ||
           event.parentEvent.toLowerCase().includes('steam');
  });
  
  const transitTimeHours = transitEvents.reduce((sum, event) => {
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    return sum + (event.finalHours * percentage);
  }, 0);
  
  // At location hours (rig activities)
  const atLocationHours = validatedEvents
    .filter(event => event.portType === 'rig')
    .reduce((sum, event) => {
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);
  
  // Total offshore time = rig activities + transit time
  const totalOffshoreTime = atLocationHours + transitTimeHours;
  
  // Calculate vessel utilization with proper bounds
  const rawUtilization = totalOffshoreTime > 0 ? (productiveHours / totalOffshoreTime) * 100 : 0;
  const vesselUtilization = Math.min(Math.max(rawUtilization, 0), 100); // Bound between 0-100%
  
  // Determine confidence based on data quality
  let utilizationConfidence: 'High' | 'Medium' | 'Low' = 'High';
  if (transitTimeHours === 0 && validatedEvents.length > 0) {
    utilizationConfidence = 'Medium';
  }
  if (validatedEvents.length < 10) {
    utilizationConfidence = 'Low';
  }
  
  console.log(`✅ ENHANCED VESSEL UTILIZATION: ${vesselUtilization.toFixed(1)}% (${productiveHours.toFixed(1)}/${totalOffshoreTime.toFixed(1)} hrs, ${utilizationConfidence} confidence)`);
  
  return {
    vesselUtilization,
    transitTimeHours,
    atLocationHours,
    totalOffshoreTime,
    utilizationConfidence
  };
}

// ==================== COMPREHENSIVE ENHANCED KPI CALCULATION ====================

/**
 * Calculate all enhanced KPIs with proper cost allocation and vessel codes integration
 */
export function calculateAllEnhancedKPIs(
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' = 'Drilling',
  month?: number,
  year?: number,
  selectedLocation?: string
): EnhancedKPIMetrics {
  console.log(`🎯 CALCULATING ALL ENHANCED KPIs for ${department} department, location: ${selectedLocation || 'All Locations'}`);
  
  // Calculate all fixed KPIs with location filtering
  const cargoTons = calculateFixedCargoTonsKPI(vesselManifests, costAllocations, department, month, year, selectedLocation);
  const liftsPerHour = calculateFixedLiftsPerHourKPI(vesselManifests, voyageEvents, costAllocations, department, month, year, selectedLocation);
  const productiveHours = calculateFixedOSVProductiveHoursKPI(voyageEvents, costAllocations, department, month, year, selectedLocation);
  const waitingTime = calculateEnhancedWaitingTimeKPI(voyageEvents, costAllocations, department, month, year, selectedLocation);
  const utilization = calculateEnhancedVesselUtilizationKPI(voyageEvents, costAllocations, department, month, year, selectedLocation);
  
  // Calculate data quality metrics with location filtering
  const locationFilteredCostAllocations = filterCostAllocationsByLocation(costAllocations, selectedLocation);
  const authoritativeLCs = department === 'Drilling' 
    ? getAuthoritativeDrillingLCs(locationFilteredCostAllocations)
    : getAuthoritativeProductionLCs(locationFilteredCostAllocations);
  
  const totalEvents = voyageEvents.filter(event => 
    month === undefined || year === undefined ||
    (event.eventDate.getMonth() === month && event.eventDate.getFullYear() === year)
  );
  
  const eventsWithLC = totalEvents.filter(event => event.lcNumber);
  const validatedEvents = totalEvents.filter(event => 
    validateEventAgainstCostAllocation(event, authoritativeLCs)
  );
  
  const lcCoverage = totalEvents.length > 0 ? (eventsWithLC.length / totalEvents.length) * 100 : 0;
  const costAllocationValidation = totalEvents.length > 0 ? (validatedEvents.length / totalEvents.length) * 100 : 0;
  
  const dataQuality = {
    lcCoverage,
    vesselCodesCoverage: productiveHours.vesselCodesCoverage,
    costAllocationValidation,
    departmentClassificationAccuracy: Math.min(lcCoverage, costAllocationValidation)
  };
  
  console.log(`✅ ALL ENHANCED KPIs CALCULATED: Data quality ${dataQuality.departmentClassificationAccuracy.toFixed(1)}%`);
  
  return {
    cargoTons,
    liftsPerHour,
    productiveHours,
    waitingTime,
    utilization,
    dataQuality
  };
}