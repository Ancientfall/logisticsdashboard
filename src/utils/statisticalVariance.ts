import { VoyageEvent, VesselManifest, CostAllocation } from '../types';

/**
 * Statistical Variance Analysis Utilities
 * Provides variance calculations and outlier detection for operational metrics
 */

export interface VarianceAnalysis {
  mean: number;
  variance: number;
  standardDeviation: number;
  coefficientOfVariation: number; // CV = std dev / mean
  median: number;
  quartile1: number;
  quartile3: number;
  interQuartileRange: number;
  outliers: Array<{
    value: number;
    zScore: number;
    vesselName?: string;
    date?: Date;
    isLowerOutlier: boolean;
    isUpperOutlier: boolean;
  }>;
  min: number;
  max: number;
  count: number;
}

export interface DataPoint {
  value: number;
  vesselName?: string;
  date?: Date;
  identifier?: string;
}

/**
 * Calculate comprehensive statistical variance analysis
 */
export const calculateVarianceAnalysis = (dataPoints: DataPoint[]): VarianceAnalysis => {
  if (dataPoints.length === 0) {
    return {
      mean: 0,
      variance: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      median: 0,
      quartile1: 0,
      quartile3: 0,
      interQuartileRange: 0,
      outliers: [],
      min: 0,
      max: 0,
      count: 0
    };
  }

  const values = dataPoints.map(dp => dp.value);
  const sortedValues = [...values].sort((a, b) => a - b);
  const n = values.length;

  // Basic statistics
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = mean !== 0 ? (standardDeviation / mean) * 100 : 0;

  // Quartiles and median
  const median = getPercentile(sortedValues, 50);
  const quartile1 = getPercentile(sortedValues, 25);
  const quartile3 = getPercentile(sortedValues, 75);
  const interQuartileRange = quartile3 - quartile1;

  // Min/Max
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Outlier detection using both IQR and Z-score methods
  const outliers = detectOutliers(dataPoints, mean, standardDeviation, quartile1, quartile3, interQuartileRange);

  return {
    mean,
    variance,
    standardDeviation,
    coefficientOfVariation,
    median,
    quartile1,
    quartile3,
    interQuartileRange,
    outliers,
    min,
    max,
    count: n
  };
};

/**
 * Calculate percentile for sorted array
 */
const getPercentile = (sortedArray: number[], percentile: number): number => {
  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  return sortedArray[lower] * (upper - index) + sortedArray[upper] * (index - lower);
};

/**
 * Detect outliers using IQR and Z-score methods
 */
const detectOutliers = (
  dataPoints: DataPoint[], 
  mean: number, 
  standardDeviation: number,
  q1: number,
  q3: number,
  iqr: number
): VarianceAnalysis['outliers'] => {
  const outliers: VarianceAnalysis['outliers'] = [];
  
  // IQR method boundaries
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  dataPoints.forEach(dp => {
    const zScore = standardDeviation !== 0 ? Math.abs(dp.value - mean) / standardDeviation : 0;
    const isStatisticalOutlier = zScore > 2; // 2 standard deviations
    const isIQROutlier = dp.value < lowerBound || dp.value > upperBound;
    
    if (isStatisticalOutlier || isIQROutlier) {
      outliers.push({
        value: dp.value,
        zScore,
        vesselName: dp.vesselName,
        date: dp.date,
        isLowerOutlier: dp.value < mean,
        isUpperOutlier: dp.value > mean
      });
    }
  });
  
  return outliers.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
};

/**
 * Calculate operational KPI variance for drilling operations
 * Focus: Lifts/hr, Cost Analysis, Avg Visits per Week
 */
export const calculateDrillingOperationalVariance = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[],
  currentMonth?: number,
  currentYear?: number,
  locationFilter?: string
): {
  liftsPerHourVariance: VarianceAnalysis;
  costPerTonVariance: VarianceAnalysis;
  visitsPerWeekVariance: VarianceAnalysis;
  vesselOperationalData: Array<{
    vesselName: string;
    liftsPerHour: number;
    costPerTon: number;
    visitsPerWeek: number;
    totalLifts: number;
    totalCost: number;
    totalTonnage: number;
    totalVisits: number;
    cargoOpsHours: number;
    weeksActive: number;
  }>;
} => {
  // Filter for drilling operations using cost allocation
  const drillingCostAllocations = costAllocation.filter(ca => ca.isDrilling);
  const drillingLCs = new Set(drillingCostAllocations.map(ca => ca.lcNumber));

  // Filter voyage events for cargo operations
  let cargoEvents = voyageEvents.filter(event => 
    event.parentEvent === 'Cargo Ops' &&
    event.lcNumber &&
    drillingLCs.has(event.lcNumber)
  );

  // Filter manifests for drilling operations
  let drillingManifests = vesselManifests.filter(manifest =>
    manifest.costCode && drillingLCs.has(manifest.costCode)
  );

  // Apply time filtering
  if (currentMonth !== undefined && currentYear !== undefined) {
    cargoEvents = cargoEvents.filter(event =>
      event.eventDate.getMonth() === currentMonth &&
      event.eventDate.getFullYear() === currentYear
    );
    
    drillingManifests = drillingManifests.filter(manifest =>
      manifest.manifestDate.getMonth() === currentMonth &&
      manifest.manifestDate.getFullYear() === currentYear
    );
  }

  // Apply location filtering
  if (locationFilter && locationFilter !== 'All Locations') {
    let locationCostAllocations = drillingCostAllocations;
    
    if (locationFilter === 'Thunder Horse (Drilling)') {
      locationCostAllocations = drillingCostAllocations.filter(ca => ca.isThunderHorse);
    } else if (locationFilter === 'Mad Dog (Drilling)') {
      locationCostAllocations = drillingCostAllocations.filter(ca => ca.isMadDog);
    }
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber));
    
    cargoEvents = cargoEvents.filter(event => 
      event.lcNumber && locationLCs.has(event.lcNumber)
    );
    drillingManifests = drillingManifests.filter(manifest =>
      manifest.costCode && locationLCs.has(manifest.costCode)
    );
  }

  // Calculate time period for visits per week calculation
  const calculateWeeksInPeriod = () => {
    if (currentMonth !== undefined && currentYear !== undefined) {
      // Specific month: approximately 4.33 weeks per month
      return 4.33;
    } else if (currentYear !== undefined && currentMonth === undefined) {
      // Year to date: calculate weeks from start of year
      const now = new Date();
      const startOfYear = new Date(currentYear, 0, 1);
      const weeksYTD = Math.ceil((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.max(weeksYTD, 1);
    } else {
      // All data: estimate based on data range
      if (drillingManifests.length > 0) {
        const dates = drillingManifests.map(m => m.manifestDate).sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(weeks, 1);
      }
      return 52; // Default to 1 year
    }
  };

  const weeksInPeriod = calculateWeeksInPeriod();

  // Group by vessel for variance analysis
  const vesselMetrics = new Map<string, {
    cargoOpsHours: number;
    totalLifts: number;
    totalTonnage: number;
    totalCost: number;
    manifestCount: number;
    vesselVisits: Set<string>; // Track unique voyages/visits
  }>();

  // Aggregate cargo operations hours by vessel
  cargoEvents.forEach(event => {
    const vessel = event.vessel;
    const hours = event.finalHours || 0;
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    const allocatedHours = hours * percentage;

    if (!vesselMetrics.has(vessel)) {
      vesselMetrics.set(vessel, {
        cargoOpsHours: 0,
        totalLifts: 0,
        totalTonnage: 0,
        totalCost: 0,
        manifestCount: 0,
        vesselVisits: new Set()
      });
    }

    const metrics = vesselMetrics.get(vessel)!;
    metrics.cargoOpsHours += allocatedHours;
    
    // Track unique voyages for visit counting
    if (event.voyageNumber) {
      metrics.vesselVisits.add(event.voyageNumber);
    }
  });

  // Aggregate manifest data and cost information by vessel
  drillingManifests.forEach(manifest => {
    const vessel = manifest.transporter;
    const lifts = manifest.lifts || 0;
    const tonnage = (manifest.deckTons || 0) + (manifest.rtTons || 0);
    
    // Calculate cost (basic estimation: can be enhanced with actual cost data)
    const estimatedCostPerTon = 150; // Default cost per ton - can be made configurable
    const vesselCost = tonnage * estimatedCostPerTon;

    if (!vesselMetrics.has(vessel)) {
      vesselMetrics.set(vessel, {
        cargoOpsHours: 0,
        totalLifts: 0,
        totalTonnage: 0,
        totalCost: 0,
        manifestCount: 0,
        vesselVisits: new Set()
      });
    }

    const metrics = vesselMetrics.get(vessel)!;
    metrics.totalLifts += lifts;
    metrics.totalTonnage += tonnage;
    metrics.totalCost += vesselCost;
    metrics.manifestCount += 1;
    
    // Track unique manifest numbers as visits
    if (manifest.manifestNumber) {
      metrics.vesselVisits.add(manifest.manifestNumber);
    }
  });

  // Calculate operational metrics for each vessel
  const vesselOperationalData: Array<{
    vesselName: string;
    liftsPerHour: number;
    costPerTon: number;
    visitsPerWeek: number;
    totalLifts: number;
    totalCost: number;
    totalTonnage: number;
    totalVisits: number;
    cargoOpsHours: number;
    weeksActive: number;
  }> = [];

  const liftsPerHourData: DataPoint[] = [];
  const costPerTonData: DataPoint[] = [];
  const visitsPerWeekData: DataPoint[] = [];

  vesselMetrics.forEach((metrics, vesselName) => {
    const liftsPerHour = metrics.cargoOpsHours > 0 ? metrics.totalLifts / metrics.cargoOpsHours : 0;
    const costPerTon = metrics.totalTonnage > 0 ? metrics.totalCost / metrics.totalTonnage : 0;
    const totalVisits = metrics.vesselVisits.size;
    const visitsPerWeek = totalVisits / weeksInPeriod;
    
    vesselOperationalData.push({
      vesselName,
      liftsPerHour,
      costPerTon,
      visitsPerWeek,
      totalLifts: metrics.totalLifts,
      totalCost: metrics.totalCost,
      totalTonnage: metrics.totalTonnage,
      totalVisits,
      cargoOpsHours: metrics.cargoOpsHours,
      weeksActive: weeksInPeriod
    });

    if (liftsPerHour > 0) {
      liftsPerHourData.push({
        value: liftsPerHour,
        vesselName,
        identifier: vesselName
      });
    }

    if (costPerTon > 0) {
      costPerTonData.push({
        value: costPerTon,
        vesselName,
        identifier: vesselName
      });
    }

    if (visitsPerWeek > 0) {
      visitsPerWeekData.push({
        value: visitsPerWeek,
        vesselName,
        identifier: vesselName
      });
    }
  });

  return {
    liftsPerHourVariance: calculateVarianceAnalysis(liftsPerHourData),
    costPerTonVariance: calculateVarianceAnalysis(costPerTonData),
    visitsPerWeekVariance: calculateVarianceAnalysis(visitsPerWeekData),
    vesselOperationalData
  };
};

/**
 * Calculate vessel utilization variance for drilling operations
 */
export const calculateVesselUtilizationVariance = (
  voyageEvents: VoyageEvent[],
  costAllocation: CostAllocation[],
  currentMonth?: number,
  currentYear?: number,
  locationFilter?: string
): {
  utilizationVariance: VarianceAnalysis;
  productiveHoursVariance: VarianceAnalysis;
  vesselUtilizationData: Array<{
    vesselName: string;
    utilizationPercentage: number;
    productiveHours: number;
    totalOffshoreHours: number;
    waitingHours: number;
    transitHours: number;
  }>;
} => {
  // Filter for drilling operations using cost allocation
  const drillingCostAllocations = costAllocation.filter(ca => ca.isDrilling);
  const drillingLCs = new Set(drillingCostAllocations.map(ca => ca.lcNumber));

  // Filter voyage events for drilling operations
  let drillingEvents = voyageEvents.filter(event =>
    event.lcNumber && drillingLCs.has(event.lcNumber)
  );

  // Apply time filtering
  if (currentMonth !== undefined && currentYear !== undefined) {
    drillingEvents = drillingEvents.filter(event =>
      event.eventDate.getMonth() === currentMonth &&
      event.eventDate.getFullYear() === currentYear
    );
  }

  // Apply location filtering
  if (locationFilter && locationFilter !== 'All Locations') {
    let locationCostAllocations = drillingCostAllocations;
    
    if (locationFilter === 'Thunder Horse (Drilling)') {
      locationCostAllocations = drillingCostAllocations.filter(ca => ca.isThunderHorse);
    } else if (locationFilter === 'Mad Dog (Drilling)') {
      locationCostAllocations = drillingCostAllocations.filter(ca => ca.isMadDog);
    }
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber));
    drillingEvents = drillingEvents.filter(event => 
      event.lcNumber && locationLCs.has(event.lcNumber)
    );
  }

  // Group by vessel for utilization analysis
  const vesselMetrics = new Map<string, {
    productiveHours: number;
    nonProductiveHours: number;
    waitingHours: number;
    transitHours: number;
    totalHours: number;
  }>();

  // Categorize events by vessel
  drillingEvents.forEach(event => {
    const vessel = event.vessel;
    const hours = event.finalHours || 0;
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    const allocatedHours = hours * percentage;

    if (!vesselMetrics.has(vessel)) {
      vesselMetrics.set(vessel, {
        productiveHours: 0,
        nonProductiveHours: 0,
        waitingHours: 0,
        transitHours: 0,
        totalHours: 0
      });
    }

    const metrics = vesselMetrics.get(vessel)!;
    metrics.totalHours += allocatedHours;

    // Categorize event types
    if (event.parentEvent === 'Waiting on Weather' || 
        event.event?.toLowerCase().includes('waiting')) {
      metrics.waitingHours += allocatedHours;
      metrics.nonProductiveHours += allocatedHours;
    } else if (event.parentEvent === 'Transit') {
      metrics.transitHours += allocatedHours;
      metrics.productiveHours += allocatedHours; // Transit is considered productive
    } else if (event.parentEvent === 'Cargo Ops' ||
               event.parentEvent === 'Maneuvering' ||
               event.parentEvent === 'Setup') {
      metrics.productiveHours += allocatedHours;
    } else {
      metrics.nonProductiveHours += allocatedHours;
    }
  });

  // Calculate utilization metrics for each vessel
  const vesselUtilizationData: Array<{
    vesselName: string;
    utilizationPercentage: number;
    productiveHours: number;
    totalOffshoreHours: number;
    waitingHours: number;
    transitHours: number;
  }> = [];

  const utilizationData: DataPoint[] = [];
  const productiveHoursData: DataPoint[] = [];

  vesselMetrics.forEach((metrics, vesselName) => {
    const totalOffshoreHours = metrics.productiveHours + metrics.nonProductiveHours;
    const utilizationPercentage = totalOffshoreHours > 0 ? 
      (metrics.productiveHours / totalOffshoreHours) * 100 : 0;

    vesselUtilizationData.push({
      vesselName,
      utilizationPercentage,
      productiveHours: metrics.productiveHours,
      totalOffshoreHours: totalOffshoreHours,
      waitingHours: metrics.waitingHours,
      transitHours: metrics.transitHours
    });

    if (totalOffshoreHours > 0) {
      utilizationData.push({
        value: utilizationPercentage,
        vesselName,
        identifier: vesselName
      });
    }

    if (metrics.productiveHours > 0) {
      productiveHoursData.push({
        value: metrics.productiveHours,
        vesselName,
        identifier: vesselName
      });
    }
  });

  return {
    utilizationVariance: calculateVarianceAnalysis(utilizationData),
    productiveHoursVariance: calculateVarianceAnalysis(productiveHoursData),
    vesselUtilizationData
  };
};

/**
 * Calculate operational KPI variance for production operations
 * Focus: Lifts/hr, Cost Analysis, Avg Visits per Week
 */
export const calculateProductionOperationalVariance = (
  bulkActions: any[],
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[],
  currentMonth?: number,
  currentYear?: number,
  locationFilter?: string
): {
  liftsPerHourVariance: VarianceAnalysis;
  costPerTonVariance: VarianceAnalysis;
  visitsPerWeekVariance: VarianceAnalysis;
  vesselOperationalData: Array<{
    vesselName: string;
    liftsPerHour: number;
    costPerTon: number;
    visitsPerWeek: number;
    totalLifts: number;
    totalCost: number;
    totalTonnage: number;
    totalVisits: number;
    cargoOpsHours: number;
    weeksActive: number;
  }>;
} => {
  // Filter for production operations using cost allocation
  const productionCostAllocations = costAllocation.filter(ca => !ca.isDrilling);
  const productionLCs = new Set(productionCostAllocations.map(ca => ca.lcNumber));

  // Filter manifests for production operations
  let productionManifests = vesselManifests.filter(manifest =>
    manifest.costCode && productionLCs.has(manifest.costCode)
  );

  // Filter voyage events for cargo operations
  let cargoEvents = voyageEvents.filter(event => 
    event.parentEvent === 'Cargo Ops' &&
    event.lcNumber &&
    productionLCs.has(event.lcNumber)
  );

  // Apply time filtering
  if (currentMonth !== undefined && currentYear !== undefined) {
    productionManifests = productionManifests.filter(manifest =>
      manifest.manifestDate.getMonth() === currentMonth &&
      manifest.manifestDate.getFullYear() === currentYear
    );
    
    cargoEvents = cargoEvents.filter(event =>
      event.eventDate.getMonth() === currentMonth &&
      event.eventDate.getFullYear() === currentYear
    );
  }

  // Apply location filtering
  if (locationFilter && locationFilter !== 'All Locations') {
    let locationCostAllocations = productionCostAllocations;
    
    if (locationFilter === 'Thunder Horse (Production)') {
      locationCostAllocations = productionCostAllocations.filter(ca => ca.isThunderHorse);
    } else if (locationFilter === 'Mad Dog (Production)') {
      locationCostAllocations = productionCostAllocations.filter(ca => ca.isMadDog);
    }
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber));
    
    cargoEvents = cargoEvents.filter(event => 
      event.lcNumber && locationLCs.has(event.lcNumber)
    );
    productionManifests = productionManifests.filter(manifest =>
      manifest.costCode && locationLCs.has(manifest.costCode)
    );
  }

  // Calculate time period for visits per week calculation
  const calculateWeeksInPeriod = () => {
    if (currentMonth !== undefined && currentYear !== undefined) {
      return 4.33;
    } else if (currentYear !== undefined && currentMonth === undefined) {
      const now = new Date();
      const startOfYear = new Date(currentYear || now.getFullYear(), 0, 1);
      const weeksYTD = Math.ceil((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.max(weeksYTD, 1);
    } else {
      if (productionManifests.length > 0) {
        const dates = productionManifests.map(m => m.manifestDate).sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(weeks, 1);
      }
      return 52;
    }
  };

  const weeksInPeriod = calculateWeeksInPeriod();

  // Group by vessel for variance analysis
  const vesselMetrics = new Map<string, {
    cargoOpsHours: number;
    totalLifts: number;
    totalTonnage: number;
    totalCost: number;
    manifestCount: number;
    vesselVisits: Set<string>;
  }>();

  // Aggregate cargo operations hours by vessel
  cargoEvents.forEach(event => {
    const vessel = event.vessel;
    const hours = event.finalHours || 0;
    const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
    const allocatedHours = hours * percentage;

    if (!vesselMetrics.has(vessel)) {
      vesselMetrics.set(vessel, {
        cargoOpsHours: 0,
        totalLifts: 0,
        totalTonnage: 0,
        totalCost: 0,
        manifestCount: 0,
        vesselVisits: new Set()
      });
    }

    const metrics = vesselMetrics.get(vessel)!;
    metrics.cargoOpsHours += allocatedHours;
    
    if (event.voyageNumber) {
      metrics.vesselVisits.add(event.voyageNumber);
    }
  });

  // Aggregate manifest data and cost information by vessel
  productionManifests.forEach(manifest => {
    const vessel = manifest.transporter;
    const lifts = manifest.lifts || 0;
    const tonnage = (manifest.deckTons || 0) + (manifest.rtTons || 0);
    
    // Calculate cost for production operations (chemical/utility focus)
    const estimatedCostPerTon = 180; // Higher cost for production/chemical operations
    const vesselCost = tonnage * estimatedCostPerTon;

    if (!vesselMetrics.has(vessel)) {
      vesselMetrics.set(vessel, {
        cargoOpsHours: 0,
        totalLifts: 0,
        totalTonnage: 0,
        totalCost: 0,
        manifestCount: 0,
        vesselVisits: new Set()
      });
    }

    const metrics = vesselMetrics.get(vessel)!;
    metrics.totalLifts += lifts;
    metrics.totalTonnage += tonnage;
    metrics.totalCost += vesselCost;
    metrics.manifestCount += 1;
    
    if (manifest.manifestNumber) {
      metrics.vesselVisits.add(manifest.manifestNumber);
    }
  });

  // Calculate operational metrics for each vessel
  const vesselOperationalData: Array<{
    vesselName: string;
    liftsPerHour: number;
    costPerTon: number;
    visitsPerWeek: number;
    totalLifts: number;
    totalCost: number;
    totalTonnage: number;
    totalVisits: number;
    cargoOpsHours: number;
    weeksActive: number;
  }> = [];

  const liftsPerHourData: DataPoint[] = [];
  const costPerTonData: DataPoint[] = [];
  const visitsPerWeekData: DataPoint[] = [];

  vesselMetrics.forEach((metrics, vesselName) => {
    const liftsPerHour = metrics.cargoOpsHours > 0 ? metrics.totalLifts / metrics.cargoOpsHours : 0;
    const costPerTon = metrics.totalTonnage > 0 ? metrics.totalCost / metrics.totalTonnage : 0;
    const totalVisits = metrics.vesselVisits.size;
    const visitsPerWeek = totalVisits / weeksInPeriod;
    
    vesselOperationalData.push({
      vesselName,
      liftsPerHour,
      costPerTon,
      visitsPerWeek,
      totalLifts: metrics.totalLifts,
      totalCost: metrics.totalCost,
      totalTonnage: metrics.totalTonnage,
      totalVisits,
      cargoOpsHours: metrics.cargoOpsHours,
      weeksActive: weeksInPeriod
    });

    if (liftsPerHour > 0) {
      liftsPerHourData.push({
        value: liftsPerHour,
        vesselName,
        identifier: vesselName
      });
    }

    if (costPerTon > 0) {
      costPerTonData.push({
        value: costPerTon,
        vesselName,
        identifier: vesselName
      });
    }

    if (visitsPerWeek > 0) {
      visitsPerWeekData.push({
        value: visitsPerWeek,
        vesselName,
        identifier: vesselName
      });
    }
  });

  return {
    liftsPerHourVariance: calculateVarianceAnalysis(liftsPerHourData),
    costPerTonVariance: calculateVarianceAnalysis(costPerTonData),
    visitsPerWeekVariance: calculateVarianceAnalysis(visitsPerWeekData),
    vesselOperationalData
  };
};

/**
 * Calculate production support monthly cost and visits variance for production operations
 */
export const calculateProductionSupportVariance = (
  voyageEvents: VoyageEvent[],
  vesselManifests: any[],
  costAllocation: CostAllocation[],
  currentMonth?: number,
  currentYear?: number,
  locationFilter?: string
): {
  monthlyCostVariance: VarianceAnalysis;
  visitsPerWeekVariance: VarianceAnalysis;
  facilityEfficiencyData: Array<{
    facilityName: string;
    averageMonthlyCost: number; // Average monthly vessel cost
    averageVisitsPerWeek: number; // Average visits per week
    totalSupplyRuns: number;
    totalSupportHours: number;
    utilityTransfers: number;
    chemicalTransfers: number;
  }>;
} => {
  // Filter for production operations using cost allocation with explicit production LC numbers
  const productionLCNumbers = ['9999','9779','10027','10039','10070','10082','10106','9361','10103','10096','10071','10115','9359','9364','9367','10098','10080','10051','10021','10017','9360','10099','10081','10074','10052','9358','10097','10084','10072','10067'];
  
  const productionCostAllocations = costAllocation.filter(ca => {
    const lcNumber = ca.lcNumber?.toString() || '';
    if (!productionLCNumbers.includes(lcNumber)) return false;
    
    // Exclude drilling rigs from production analysis
    const location = (ca.locationReference || '').toLowerCase();
    const isDrillingRig = location.includes('ocean black') || 
                         location.includes('blackhornet') || 
                         location.includes('stena icemax') ||
                         location.includes('steana icemax') ||
                         location.includes('deepwater') ||
                         location.includes('island venture') ||
                         location.includes('auriga') ||
                         location.includes('drilling') ||
                         location.includes('rig');
    
    return !isDrillingRig;
  });
  
  const productionLCs = new Set(productionCostAllocations.map(ca => ca.lcNumber));
  
  console.log('🏭 Production Support Variance - Filtering Setup:', {
    totalCostAllocations: costAllocation.length,
    productionCostAllocations: productionCostAllocations.length,
    productionLCs: Array.from(productionLCs),
    locationFilter,
    timeFilter: { currentMonth, currentYear }
  });

  // Filter voyage events for production operations
  let productionEvents = voyageEvents.filter(event =>
    event.lcNumber && productionLCs.has(event.lcNumber)
  );

  // Filter manifests for production operations
  let productionManifests = vesselManifests.filter(manifest =>
    manifest.costCode && productionLCs.has(manifest.costCode)
  );
  
  console.log('🏭 Production Support Variance - Initial Data:', {
    totalVoyageEvents: voyageEvents.length,
    productionEvents: productionEvents.length,
    totalManifests: vesselManifests.length,
    productionManifests: productionManifests.length,
    sampleProductionEvent: productionEvents[0],
    sampleProductionManifest: productionManifests[0]
  });

  // Apply time filtering
  if (currentMonth !== undefined && currentYear !== undefined) {
    productionEvents = productionEvents.filter(event =>
      event.eventDate.getMonth() === currentMonth &&
      event.eventDate.getFullYear() === currentYear
    );
    
    productionManifests = productionManifests.filter(manifest =>
      manifest.manifestDate.getMonth() === currentMonth &&
      manifest.manifestDate.getFullYear() === currentYear
    );
  }

  // Apply location filtering
  if (locationFilter && locationFilter !== 'All Locations') {
    let locationCostAllocations = productionCostAllocations;
    
    if (locationFilter === 'Thunder Horse (Production)') {
      locationCostAllocations = productionCostAllocations.filter(ca => ca.isThunderHorse);
    } else if (locationFilter === 'Mad Dog (Production)') {
      locationCostAllocations = productionCostAllocations.filter(ca => ca.isMadDog);
    }
    
    const locationLCs = new Set(locationCostAllocations.map(ca => ca.lcNumber));
    
    productionEvents = productionEvents.filter(event => 
      event.lcNumber && locationLCs.has(event.lcNumber)
    );
    productionManifests = productionManifests.filter(manifest =>
      manifest.costCode && locationLCs.has(manifest.costCode)
    );
  }

  // Calculate time period for visits per week and monthly cost calculation
  const calculateTimeMetrics = () => {
    if (currentMonth !== undefined && currentYear !== undefined) {
      return { weeksInPeriod: 4.33, monthsInPeriod: 1 };
    } else if (currentYear !== undefined && currentMonth === undefined) {
      const now = new Date();
      const startOfYear = new Date(currentYear || now.getFullYear(), 0, 1);
      const weeksYTD = Math.ceil((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const monthsYTD = now.getMonth() + 1;
      return { weeksInPeriod: Math.max(weeksYTD, 1), monthsInPeriod: Math.max(monthsYTD, 1) };
    } else {
      if (productionEvents.length > 0) {
        const dates = productionEvents.map(e => e.eventDate).sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const weeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const months = Math.ceil((endDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
        return { weeksInPeriod: Math.max(weeks, 1), monthsInPeriod: Math.max(months, 1) };
      }
      return { weeksInPeriod: 52, monthsInPeriod: 12 };
    }
  };

  const { weeksInPeriod, monthsInPeriod } = calculateTimeMetrics();

  // Group by facility/platform for cost and visits analysis
  const facilityMetrics = new Map<string, {
    totalCost: number;
    totalVisits: number;
    totalSupplyRuns: number;
    totalSupportHours: number;
    utilityTransfers: number;
    chemicalTransfers: number;
    voyageNumbers: Set<string>;
  }>();

  // Calculate costs from cost allocation data filtered for production facilities
  const filteredCostAllocations = costAllocation.filter(ca => {
    const lcNumber = ca.lcNumber?.toString() || '';
    return productionLCs.has(lcNumber);
  });

  // Apply time filtering to cost allocations
  let timeFilteredCostAllocations = filteredCostAllocations;
  if (currentMonth !== undefined && currentYear !== undefined) {
    timeFilteredCostAllocations = filteredCostAllocations.filter(ca =>
      ca.costAllocationDate &&
      ca.costAllocationDate.getMonth() === currentMonth &&
      ca.costAllocationDate.getFullYear() === currentYear
    );
  } else if (currentYear !== undefined && currentMonth === undefined) {
    timeFilteredCostAllocations = filteredCostAllocations.filter(ca =>
      ca.costAllocationDate &&
      ca.costAllocationDate.getFullYear() === currentYear
    );
  }

  // Calculate cost and visits by facility
  timeFilteredCostAllocations.forEach(ca => {
    const facilityName = ca.locationReference || 'Unknown';
    const allocatedDays = ca.totalAllocatedDays || 0;
    const dayRate = ca.vesselDailyRateUsed || ca.averageVesselCostPerDay || 0;
    const cost = allocatedDays * dayRate;

    if (!facilityMetrics.has(facilityName)) {
      facilityMetrics.set(facilityName, {
        totalCost: 0,
        totalVisits: 0,
        totalSupplyRuns: 0,
        totalSupportHours: 0,
        utilityTransfers: 0,
        chemicalTransfers: 0,
        voyageNumbers: new Set()
      });
    }

    const metrics = facilityMetrics.get(facilityName)!;
    metrics.totalCost += cost;
  });

  // Add voyage events data for support hours and visits
  productionEvents.forEach(event => {
    const facilityName = event.location || event.mappedLocation || 'Unknown';
    
    if (!facilityMetrics.has(facilityName)) {
      facilityMetrics.set(facilityName, {
        totalCost: 0,
        totalVisits: 0,
        totalSupplyRuns: 0,
        totalSupportHours: 0,
        utilityTransfers: 0,
        chemicalTransfers: 0,
        voyageNumbers: new Set()
      });
    }

    const metrics = facilityMetrics.get(facilityName)!;
    
    // Calculate support hours (cargo ops + setup + maneuvering at facility)
    if (event.portType === 'rig' && 
        (event.parentEvent === 'Cargo Ops' || event.parentEvent === 'Setup' || event.parentEvent === 'Maneuvering')) {
      const hours = event.finalHours || 0;
      const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
      metrics.totalSupportHours += hours * percentage;
    }

    // Collect voyage numbers more comprehensively
    if (event.voyageNumber) {
      metrics.voyageNumbers.add(event.voyageNumber);
    }
    // Also try standardized voyage number or create one from vessel + date
    if (event.standardizedVoyageNumber) {
      metrics.voyageNumbers.add(event.standardizedVoyageNumber);
    }
    // Fallback: create unique identifier for visit counting
    const visitId = `${event.vessel}_${event.eventDate.getFullYear()}_${event.eventDate.getMonth()}_${event.eventDate.getDate()}`;
    metrics.voyageNumbers.add(visitId);
  });

  // Add manifest data to facility metrics
  productionManifests.forEach(manifest => {
    const facilityName = manifest.offshoreLocation || manifest.mappedLocation || manifest.from || 'Unknown';
    
    if (!facilityMetrics.has(facilityName)) {
      facilityMetrics.set(facilityName, {
        totalCost: 0,
        totalVisits: 0,
        totalSupplyRuns: 0,
        totalSupportHours: 0,
        utilityTransfers: 0,
        chemicalTransfers: 0,
        voyageNumbers: new Set()
      });
    }

    const metrics = facilityMetrics.get(facilityName)!;
    
    // Categorize transfers by type
    const manifestItems = manifest.lifts || 0;
    const cargoType = manifest.cargoType || manifest.description || '';
    
    if (cargoType.toLowerCase().includes('chemical') || 
        cargoType.toLowerCase().includes('fluid') ||
        cargoType.toLowerCase().includes('treatment')) {
      metrics.chemicalTransfers += manifestItems;
    } else {
      metrics.utilityTransfers += manifestItems;
    }

    // Count supply runs more comprehensively
    if (manifest.voyageId) {
      metrics.voyageNumbers.add(manifest.voyageId);
    }
    if (manifest.standardizedVoyageId) {
      metrics.voyageNumbers.add(manifest.standardizedVoyageId);
    }
    if (manifest.manifestNumber) {
      metrics.voyageNumbers.add(manifest.manifestNumber);
    }
    // Fallback: create unique identifier for visit counting
    const visitId = `${manifest.transporter}_${manifest.manifestDate.getFullYear()}_${manifest.manifestDate.getMonth()}_${manifest.manifestDate.getDate()}`;
    metrics.voyageNumbers.add(visitId);
  });

  // Calculate facility efficiency metrics
  const facilityEfficiencyData: Array<{
    facilityName: string;
    averageMonthlyCost: number;
    averageVisitsPerWeek: number;
    totalSupplyRuns: number;
    totalSupportHours: number;
    utilityTransfers: number;
    chemicalTransfers: number;
  }> = [];

  const monthlyCostData: DataPoint[] = [];
  const visitsPerWeekData: DataPoint[] = [];

  facilityMetrics.forEach((metrics, facilityName) => {
    // Calculate average monthly cost
    const averageMonthlyCost = monthsInPeriod > 0 ? 
      metrics.totalCost / monthsInPeriod : 0;
    
    // Calculate average visits per week
    const totalVisits = metrics.voyageNumbers.size;
    const averageVisitsPerWeek = weeksInPeriod > 0 ? 
      totalVisits / weeksInPeriod : 0;

    metrics.totalSupplyRuns = totalVisits;

    console.log(`📊 Facility ${facilityName} Variance Metrics:`, {
      totalCost: metrics.totalCost,
      monthsInPeriod,
      averageMonthlyCost,
      totalVisits,
      weeksInPeriod,
      averageVisitsPerWeek,
      voyageNumbers: Array.from(metrics.voyageNumbers).slice(0, 5), // Show first 5 for debugging
      totalVoyageNumbers: metrics.voyageNumbers.size,
      totalSupportHours: metrics.totalSupportHours,
      chemicalTransfers: metrics.chemicalTransfers,
      utilityTransfers: metrics.utilityTransfers
    });

    facilityEfficiencyData.push({
      facilityName,
      averageMonthlyCost,
      averageVisitsPerWeek,
      totalSupplyRuns: metrics.totalSupplyRuns,
      totalSupportHours: metrics.totalSupportHours,
      utilityTransfers: metrics.utilityTransfers,
      chemicalTransfers: metrics.chemicalTransfers
    });

    if (averageMonthlyCost > 0) {
      monthlyCostData.push({
        value: averageMonthlyCost,
        vesselName: facilityName,
        identifier: facilityName
      });
    }

    if (averageVisitsPerWeek > 0) {
      visitsPerWeekData.push({
        value: averageVisitsPerWeek,
        vesselName: facilityName,
        identifier: facilityName
      });
    }
  });

  console.log('🏭 Production Support Variance - Final Results:', {
    totalFacilities: facilityMetrics.size,
    facilitiesWithCost: monthlyCostData.length,
    facilitiesWithVisits: visitsPerWeekData.length,
    totalMonthlyCostDataPoints: monthlyCostData.map(d => ({ facility: d.vesselName, cost: d.value })),
    totalVisitsPerWeekDataPoints: visitsPerWeekData.map(d => ({ facility: d.vesselName, visits: d.value })),
    facilityNames: Array.from(facilityMetrics.keys())
  });

  return {
    monthlyCostVariance: calculateVarianceAnalysis(monthlyCostData),
    visitsPerWeekVariance: calculateVarianceAnalysis(visitsPerWeekData),
    facilityEfficiencyData
  };
};