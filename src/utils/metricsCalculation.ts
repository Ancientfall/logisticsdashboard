import { VoyageEvent, VesselManifest, VoyageList, CostAllocation, KPIMetrics } from '../types';
import { calculateTotalHours, calculateAverageTripDuration } from './helpers';
import { calculateVesselCostMetrics } from './vesselCost';

/**
 * KPI metrics calculation utilities
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
  console.log(`   📊 Total Variance: $${totalVariance.toLocaleString()} (${totalVariancePercentage.toFixed(1)}%)`);
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
    waitingTimePercentage: `${waitingTimePercentage.toFixed(1)}%`,
    cargoOpsHours: `${cargoOpsHours}h`,
    drillingHours: `${drillingHours}h`,
    vesselUtilizationRate: `${vesselUtilizationRate.toFixed(1)}%`,
    // Vessel cost metrics
    totalVesselCost: `$${vesselCostMetrics.totalVesselCost.toLocaleString()}`,
    averageVesselCostPerHour: `$${vesselCostMetrics.averageVesselCostPerHour.toFixed(2)}/hr`,
    averageVesselCostPerDay: `$${vesselCostMetrics.averageVesselCostPerDay.toFixed(2)}/day`,
    // Manifest metrics
    cargoTonnagePerVisit: `${cargoTonnagePerVisit.toFixed(1)} tons`,
    totalManifests: manifestMetrics.totalManifests,
    rtPercentage: `${manifestMetrics.rtPercentage.toFixed(1)}%`,
    totalWetBulk: `${manifestMetrics.totalWetBulkNormalized.toFixed(1)} bbls`,
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