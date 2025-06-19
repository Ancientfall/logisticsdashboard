import { CostAllocation, VoyageEvent, VesselManifest, BulkAction } from '../types';
import { getAllDrillingCapableLocations, getAllProductionLCs, mapCostAllocationLocation } from '../data/masterFacilities';

interface VesselRate {
  startDate: Date;
  endDate: Date;
  dailyRate: number;
}

const vesselRates: VesselRate[] = [
  {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    dailyRate: 33000
  },
  {
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-12-31'),
    dailyRate: 35000
  }
];

function getVesselRateForDate(date: Date, lc: CostAllocation): number {
  // If no costAllocationDate is provided, use the input date
  const effectiveDate = lc.costAllocationDate || date;
  
  // Find the applicable rate period
  const ratePeriod = vesselRates.find(rate => 
    effectiveDate >= rate.startDate && 
    effectiveDate <= rate.endDate
  );
  
  if (!ratePeriod) {
    console.warn(`No vessel rate found for date ${effectiveDate.toISOString()}`);
    return 0;
  }
  
  return ratePeriod.dailyRate;
}

export function processCostAllocation(
  events: VoyageEvent[],
  costAllocations: CostAllocation[]
): CostAllocation[] {
  // Group events by LC number
  const eventsByLC = events.reduce((acc, event) => {
    if (event.lcNumber) {
      if (!acc[event.lcNumber]) {
        acc[event.lcNumber] = [];
      }
      acc[event.lcNumber].push(event);
    }
    return acc;
  }, {} as Record<string, VoyageEvent[]>);

  // Process each cost allocation
  return costAllocations.map(lc => {
    const events = eventsByLC[lc.lcNumber] || [];
    
    // Calculate total hours
    const totalHours = events.reduce((sum, event) => sum + event.finalHours, 0);
    const totalDays = Math.round(totalHours / 24); // Round to whole days
    
    // Get vessel rate for the first event date or cost allocation date
    const firstEventDate = events[0]?.from || new Date();
    const dailyRate = getVesselRateForDate(firstEventDate, lc);
    
    // Calculate costs
    const totalCost = totalDays * dailyRate;
    
    return {
      ...lc,
      totalAllocatedDays: totalDays,
      averageVesselCostPerDay: dailyRate,
      totalCost,
      costPerHour: dailyRate / 24,
      budgetedVesselCost: totalCost,
      vesselDailyRateUsed: dailyRate,
      vesselRateDescription: `Jan 2024 - Mar 2024: $${dailyRate}/day`
    };
  });
}

export function filterDrillingLocations(costAllocations: CostAllocation[]): CostAllocation[] {
  return costAllocations.filter(lc => 
    lc.isDrilling || 
    lc.locationReference.includes('Thunder Horse') || 
    lc.locationReference.includes('Mad Dog')
  );
}

export function calculateBudgetVariance(costAllocations: CostAllocation[]): {
  totalBudgeted: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
} {
  const totalBudgeted = costAllocations.reduce((sum, lc) => sum + (lc.budgetedVesselCost || 0), 0);
  const totalActual = costAllocations.reduce((sum, lc) => sum + (lc.totalCost || 0), 0);
  const variance = totalActual - totalBudgeted;
  const variancePercentage = totalBudgeted ? (variance / totalBudgeted) * 100 : 0;

  return {
    totalBudgeted,
    totalActual,
    variance,
    variancePercentage
  };
}

// ==================== ENHANCED DUAL DASHBOARD SUPPORT ====================

/**
 * Enhanced LC validation and classification for both drilling and production
 */
export interface LCClassification {
  lcNumber: string;
  department: 'Drilling' | 'Production' | 'Integrated' | 'Unknown';
  facilityType: 'Drilling' | 'Production' | 'Integrated' | 'Logistics' | 'Unknown';
  projectType?: 'Drilling' | 'Completions' | 'Production' | 'Maintenance' | 'Operator Sharing';
  locationName: string;
  isDrillingLC: boolean;
  isProductionLC: boolean;
  isIntegratedLC: boolean;
  confidence: 'High' | 'Medium' | 'Low';
  notes?: string;
}

/**
 * Enhanced cost allocation processor with dual dashboard support
 */
export function enhancedProcessCostAllocation(
  events: VoyageEvent[],
  costAllocations: CostAllocation[],
  department: 'Drilling' | 'Production' | 'All' = 'All'
): CostAllocation[] {
  console.log(`🏭 ENHANCED COST ALLOCATION PROCESSING for ${department}`);
  
  // Get drilling and production LC mappings
  const drillingFacilities = getAllDrillingCapableLocations();
  const productionLCs = getAllProductionLCs();
  
  // Create drilling LC set
  const drillingLCSet = new Set<string>();
  drillingFacilities.forEach(facility => {
    if (facility.drillingLCs) {
      facility.drillingLCs.split(',').forEach(lc => {
        drillingLCSet.add(lc.trim());
      });
    }
  });
  
  // Create production LC set
  const productionLCSet = new Set(Object.keys(productionLCs));
  
  console.log(`📊 LC Classification: ${drillingLCSet.size} drilling LCs, ${productionLCSet.size} production LCs`);

  // Filter cost allocations by department if specified
  let filteredCostAllocations = costAllocations;
  if (department !== 'All') {
    filteredCostAllocations = costAllocations.filter(ca => {
      const classification = classifyLCNumber(ca.lcNumber, ca, drillingLCSet, productionLCSet);
      
      if (department === 'Drilling') {
        return classification.isDrillingLC || classification.department === 'Drilling';
      } else if (department === 'Production') {
        return classification.isProductionLC || classification.department === 'Production';
      }
      return true;
    });
    
    console.log(`📋 Filtered to ${filteredCostAllocations.length} ${department} cost allocations`);
  }

  // Group events by LC number
  const eventsByLC = events.reduce((acc, event) => {
    if (event.lcNumber) {
      if (!acc[event.lcNumber]) {
        acc[event.lcNumber] = [];
      }
      acc[event.lcNumber].push(event);
    }
    return acc;
  }, {} as Record<string, VoyageEvent[]>);

  // Process each cost allocation with enhanced classification
  return filteredCostAllocations.map(lc => {
    const events = eventsByLC[lc.lcNumber] || [];
    const classification = classifyLCNumber(lc.lcNumber, lc, drillingLCSet, productionLCSet);
    
    // Calculate total hours with proper allocation
    const totalHours = events.reduce((sum, event) => {
      // Use LC percentage if available, otherwise full hours
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      return sum + (event.finalHours * percentage);
    }, 0);
    
    const totalDays = Math.round(totalHours / 24);
    
    // Get vessel rate for the first event date or cost allocation date
    const firstEventDate = events[0]?.from || new Date();
    const dailyRate = getVesselRateForDate(firstEventDate, lc);
    
    // Calculate costs
    const totalCost = totalDays * dailyRate;
    
    return {
      ...lc,
      // Enhanced classification fields
      department: classification.department === 'Integrated' ? 'Drilling' : 
                 classification.department === 'Unknown' ? undefined : 
                 classification.department as 'Drilling' | 'Production' | 'Logistics',
      facilityType: classification.facilityType,
      isDrillingLC: classification.isDrillingLC,
      isProductionLC: classification.isProductionLC,
      isIntegratedLC: classification.isIntegratedLC,
      
      // Cost calculation fields
      totalAllocatedDays: totalDays,
      totalAllocatedHours: totalHours,
      averageVesselCostPerDay: dailyRate,
      totalCost,
      costPerHour: dailyRate / 24,
      budgetedVesselCost: totalCost,
      vesselDailyRateUsed: dailyRate,
      vesselRateDescription: getRateDescription(firstEventDate, dailyRate),
      
      // Validation fields
      hasEvents: events.length > 0,
      eventCount: events.length,
      classificationConfidence: classification.confidence,
      classificationNotes: classification.notes
    };
  });
}

/**
 * Classify LC number for department and facility type
 */
export function classifyLCNumber(
  lcNumber: string,
  costAllocation: CostAllocation,
  drillingLCs: Set<string>,
  productionLCs: Set<string>
): LCClassification {
  const lcNum = lcNumber?.trim();
  
  if (!lcNum) {
    return {
      lcNumber: lcNumber || '',
      department: 'Unknown',
      facilityType: 'Unknown',
      locationName: costAllocation.locationReference || '',
      isDrillingLC: false,
      isProductionLC: false,
      isIntegratedLC: false,
      confidence: 'Low',
      notes: 'Missing LC number'
    };
  }

  // Check drilling LCs
  const isDrillingLC = drillingLCs.has(lcNum);
  
  // Check production LCs
  const isProductionLC = productionLCs.has(lcNum);
  
  // Check for integrated facilities (both drilling and production)
  const isIntegratedLC = isDrillingLC && isProductionLC;
  
  // Use location mapping to determine facility type
  const mappedFacility = mapCostAllocationLocation(
    costAllocation.rigLocation, 
    costAllocation.locationReference
  );
  
  // Determine department based on classification
  let department: 'Drilling' | 'Production' | 'Integrated' | 'Unknown';
  let facilityType: 'Drilling' | 'Production' | 'Integrated' | 'Logistics' | 'Unknown';
  let confidence: 'High' | 'Medium' | 'Low';
  let notes: string | undefined;

  if (isIntegratedLC) {
    department = 'Integrated';
    facilityType = 'Integrated';
    confidence = 'High';
  } else if (isDrillingLC) {
    department = 'Drilling';
    facilityType = mappedFacility?.facilityType || 'Drilling';
    confidence = 'High';
  } else if (isProductionLC) {
    department = 'Production';
    facilityType = mappedFacility?.facilityType || 'Production';
    confidence = 'High';
  } else {
    // Fallback to cost allocation data
    if (costAllocation.department) {
      department = costAllocation.department as any;
      confidence = 'Medium';
      notes = 'Classified using cost allocation department field';
    } else if (costAllocation.projectType) {
      if (costAllocation.projectType === 'Drilling' || costAllocation.projectType === 'Completions') {
        department = 'Drilling';
        confidence = 'Medium';
        notes = 'Classified using project type';
      } else if (costAllocation.projectType === 'Production') {
        department = 'Production';
        confidence = 'Medium';
        notes = 'Classified using project type';
      } else {
        department = 'Unknown';
        confidence = 'Low';
        notes = 'Could not classify department';
      }
    } else {
      department = 'Unknown';
      confidence = 'Low';
      notes = 'No classification criteria matched';
    }
    
    facilityType = mappedFacility?.facilityType || 'Unknown';
  }

  return {
    lcNumber: lcNum,
    department,
    facilityType,
    projectType: costAllocation.projectType as any,
    locationName: mappedFacility?.displayName || costAllocation.locationReference || '',
    isDrillingLC,
    isProductionLC,
    isIntegratedLC,
    confidence,
    notes
  };
}

/**
 * Get drilling cost allocations only
 */
export function getDrillingCostAllocations(costAllocations: CostAllocation[]): CostAllocation[] {
  const drillingFacilities = getAllDrillingCapableLocations();
  const productionLCs = getAllProductionLCs();
  
  const drillingLCSet = new Set<string>();
  drillingFacilities.forEach(facility => {
    if (facility.drillingLCs) {
      facility.drillingLCs.split(',').forEach(lc => {
        drillingLCSet.add(lc.trim());
      });
    }
  });
  
  const productionLCSet = new Set(Object.keys(productionLCs));
  
  return costAllocations.filter(ca => {
    const classification = classifyLCNumber(ca.lcNumber, ca, drillingLCSet, productionLCSet);
    return classification.isDrillingLC || 
           classification.department === 'Drilling' ||
           (classification.isIntegratedLC && classification.projectType === 'Drilling');
  });
}

/**
 * Get production cost allocations only
 */
export function getProductionCostAllocations(costAllocations: CostAllocation[]): CostAllocation[] {
  const drillingFacilities = getAllDrillingCapableLocations();
  const productionLCs = getAllProductionLCs();
  
  const drillingLCSet = new Set<string>();
  drillingFacilities.forEach(facility => {
    if (facility.drillingLCs) {
      facility.drillingLCs.split(',').forEach(lc => {
        drillingLCSet.add(lc.trim());
      });
    }
  });
  
  const productionLCSet = new Set(Object.keys(productionLCs));
  
  return costAllocations.filter(ca => {
    const classification = classifyLCNumber(ca.lcNumber, ca, drillingLCSet, productionLCSet);
    return classification.isProductionLC || 
           classification.department === 'Production' ||
           (classification.isIntegratedLC && classification.projectType === 'Production');
  });
}

/**
 * Validate vessel manifests against cost allocation
 */
export function validateManifestsAgainstCostAllocation(
  manifests: VesselManifest[],
  costAllocations: CostAllocation[]
): {
  validManifests: VesselManifest[];
  invalidManifests: VesselManifest[];
  orphanedManifests: VesselManifest[];
  validationSummary: {
    totalManifests: number;
    validCount: number;
    invalidCount: number;
    orphanedCount: number;
    validationRate: number;
  };
} {
  const costAllocationLCs = new Set(costAllocations.map(ca => ca.lcNumber).filter(Boolean));
  
  const validManifests: VesselManifest[] = [];
  const invalidManifests: VesselManifest[] = [];
  const orphanedManifests: VesselManifest[] = [];
  
  manifests.forEach(manifest => {
    if (!manifest.costCode) {
      orphanedManifests.push(manifest);
    } else if (costAllocationLCs.has(manifest.costCode)) {
      validManifests.push(manifest);
    } else {
      invalidManifests.push(manifest);
    }
  });
  
  const validationRate = manifests.length > 0 ? (validManifests.length / manifests.length) * 100 : 0;
  
  return {
    validManifests,
    invalidManifests,
    orphanedManifests,
    validationSummary: {
      totalManifests: manifests.length,
      validCount: validManifests.length,
      invalidCount: invalidManifests.length,
      orphanedCount: orphanedManifests.length,
      validationRate
    }
  };
}

/**
 * Validate bulk actions against cost allocation
 */
export function validateBulkActionsAgainstCostAllocation(
  bulkActions: BulkAction[],
  costAllocations: CostAllocation[]
): {
  validatedActions: BulkAction[];
  validationSummary: {
    totalActions: number;
    actionsWithLocationMatch: number;
    actionsWithoutLocationMatch: number;
    locationMatchRate: number;
  };
} {
  const locationMap = new Map<string, CostAllocation[]>();
  
  // Build location mapping from cost allocations
  costAllocations.forEach(ca => {
    const locations = [ca.rigLocation, ca.locationReference].filter(Boolean);
    locations.forEach(location => {
      if (location) {
        const normalizedLocation = location.toLowerCase().trim();
        if (!locationMap.has(normalizedLocation)) {
          locationMap.set(normalizedLocation, []);
        }
        locationMap.get(normalizedLocation)!.push(ca);
      }
    });
  });
  
  const validatedActions: BulkAction[] = [];
  let actionsWithLocationMatch = 0;
  
  bulkActions.forEach(action => {
    let hasLocationMatch = false;
    
    // Check destination port against cost allocation locations
    if (action.destinationPort) {
      const normalizedDest = action.destinationPort.toLowerCase().trim();
      if (locationMap.has(normalizedDest)) {
        hasLocationMatch = true;
        actionsWithLocationMatch++;
      }
    }
    
    // Check at port against cost allocation locations
    if (!hasLocationMatch && action.atPort) {
      const normalizedAt = action.atPort.toLowerCase().trim();
      if (locationMap.has(normalizedAt)) {
        hasLocationMatch = true;
        actionsWithLocationMatch++;
      }
    }
    
    validatedActions.push({
      ...action,
      hasLocationMatch
    } as any);
  });
  
  const locationMatchRate = bulkActions.length > 0 ? (actionsWithLocationMatch / bulkActions.length) * 100 : 0;
  
  return {
    validatedActions,
    validationSummary: {
      totalActions: bulkActions.length,
      actionsWithLocationMatch,
      actionsWithoutLocationMatch: bulkActions.length - actionsWithLocationMatch,
      locationMatchRate
    }
  };
}

/**
 * Get rate description for a given date
 */
function getRateDescription(date: Date, rate: number): string {
  const ratePeriod = vesselRates.find(r => date >= r.startDate && date <= r.endDate);
  if (ratePeriod) {
    const startMonth = ratePeriod.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endMonth = ratePeriod.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startMonth} - ${endMonth}: $${rate.toLocaleString()}/day`;
  }
  return `$${rate.toLocaleString()}/day`;
} 