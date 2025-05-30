// utils/voyageAnalytics.ts
// Voyage List Analytics - Calculate KPIs and Metrics from Voyage Data

import { VoyageList, VoyageSegment } from '../types';

// ==================== BASIC VOYAGE METRICS ====================

export function calculateBasicVoyageMetrics(voyages: VoyageList[]) {
  const totalVoyages = voyages.length;
  
  const totalDuration = voyages.reduce((sum, voyage) => 
    sum + (voyage.durationHours || 0), 0);
  const averageVoyageDuration = totalVoyages > 0 ? totalDuration / totalVoyages : 0;
  
  const totalStops = voyages.reduce((sum, voyage) => sum + voyage.stopCount, 0);
  const averageStopsPerVoyage = totalVoyages > 0 ? totalStops / totalVoyages : 0;
  
  const multiStopVoyages = voyages.filter(v => v.stopCount > 2).length;
  const multiStopPercentage = totalVoyages > 0 ? (multiStopVoyages / totalVoyages) * 100 : 0;
  
  return {
    totalVoyages,
    averageVoyageDuration: Number(averageVoyageDuration.toFixed(2)),
    averageStopsPerVoyage: Number(averageStopsPerVoyage.toFixed(2)),
    multiStopPercentage: Number(multiStopPercentage.toFixed(2))
  };
}

// ==================== VOYAGE PURPOSE DISTRIBUTION ====================

export function calculateVoyagePurposeDistribution(voyages: VoyageList[]) {
  const totalVoyages = voyages.length;
  
  const purposeCounts = voyages.reduce((counts, voyage) => {
    counts[voyage.voyagePurpose] = (counts[voyage.voyagePurpose] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const productionVoyagePercentage = totalVoyages > 0 ? 
    ((purposeCounts['Production'] || 0) / totalVoyages) * 100 : 0;
  const drillingVoyagePercentage = totalVoyages > 0 ? 
    ((purposeCounts['Drilling'] || 0) / totalVoyages) * 100 : 0;
  const mixedVoyagePercentage = totalVoyages > 0 ? 
    ((purposeCounts['Mixed'] || 0) / totalVoyages) * 100 : 0;
  const otherVoyagePercentage = totalVoyages > 0 ? 
    ((purposeCounts['Other'] || 0) / totalVoyages) * 100 : 0;
  
  const voyagePurposeDistribution = Object.keys(purposeCounts).reduce((dist, purpose) => {
    dist[purpose] = totalVoyages > 0 ? 
      Number(((purposeCounts[purpose] / totalVoyages) * 100).toFixed(2)) : 0;
    return dist;
  }, {} as Record<string, number>);
  
  return {
    productionVoyagePercentage: Number(productionVoyagePercentage.toFixed(2)),
    drillingVoyagePercentage: Number(drillingVoyagePercentage.toFixed(2)),
    mixedVoyagePercentage: Number(mixedVoyagePercentage.toFixed(2)),
    otherVoyagePercentage: Number(otherVoyagePercentage.toFixed(2)),
    voyagePurposeDistribution
  };
}

// ==================== SEGMENT PATTERN ANALYSIS ====================

export function calculatePatternAnalysis(segments: VoyageSegment[]) {
  const totalSegments = segments.length;
  
  const outboundSegments = segments.filter(s => s.voyagePattern === 'Outbound').length;
  const returnSegments = segments.filter(s => s.voyagePattern === 'Return').length;
  const offshoreTransferSegments = segments.filter(s => s.voyagePattern === 'Offshore Transfer').length;
  const roundTripSegments = segments.filter(s => s.voyagePattern === 'Round Trip').length;
  const standardPatternSegments = segments.filter(s => s.isStandardPattern).length;
  
  return {
    outboundPatternPercentage: totalSegments > 0 ? 
      Number(((outboundSegments / totalSegments) * 100).toFixed(2)) : 0,
    returnPatternPercentage: totalSegments > 0 ? 
      Number(((returnSegments / totalSegments) * 100).toFixed(2)) : 0,
    offshoreTransferPercentage: totalSegments > 0 ? 
      Number(((offshoreTransferSegments / totalSegments) * 100).toFixed(2)) : 0,
    roundTripPercentage: totalSegments > 0 ? 
      Number(((roundTripSegments / totalSegments) * 100).toFixed(2)) : 0,
    standardPatternPercentage: totalSegments > 0 ? 
      Number(((standardPatternSegments / totalSegments) * 100).toFixed(2)) : 0
  };
}

// ==================== FACILITY-SPECIFIC METRICS ====================

export function calculateFacilityMetrics(voyages: VoyageList[]) {
  const totalVoyages = voyages.length;
  
  const thunderHorseVoyages = voyages.filter(v => 
    v.locations.toLowerCase().includes('thunder horse')).length;
  const madDogVoyages = voyages.filter(v => 
    v.locations.toLowerCase().includes('mad dog')).length;
  const integratedFacilityVoyages = voyages.filter(v => 
    v.locations.includes('Thunder Horse PDQ') || 
    v.locations.includes('Thunder Horse') || 
    v.locations.includes('Mad Dog')).length;
  
  return {
    thunderHorseVoyagePercentage: totalVoyages > 0 ? 
      Number(((thunderHorseVoyages / totalVoyages) * 100).toFixed(2)) : 0,
    madDogVoyagePercentage: totalVoyages > 0 ? 
      Number(((madDogVoyages / totalVoyages) * 100).toFixed(2)) : 0,
    integratedFacilityPercentage: totalVoyages > 0 ? 
      Number(((integratedFacilityVoyages / totalVoyages) * 100).toFixed(2)) : 0
  };
}

// ==================== DEPARTMENT DISTRIBUTION ====================

export function calculateDepartmentDistribution(segments: VoyageSegment[]) {
  const totalSegments = segments.length;
  
  const drillingSegments = segments.filter(s => s.finalDepartment === 'Drilling').length;
  const productionSegments = segments.filter(s => s.finalDepartment === 'Production').length;
  const integratedSegments = segments.filter(s => s.finalDepartment === 'Integrated').length;
  const otherSegments = segments.filter(s => s.finalDepartment === 'Other').length;
  
  return {
    drillingDepartmentPercentage: totalSegments > 0 ? 
      Number(((drillingSegments / totalSegments) * 100).toFixed(2)) : 0,
    productionDepartmentPercentage: totalSegments > 0 ? 
      Number(((productionSegments / totalSegments) * 100).toFixed(2)) : 0,
    integratedDepartmentPercentage: totalSegments > 0 ? 
      Number(((integratedSegments / totalSegments) * 100).toFixed(2)) : 0,
    otherDepartmentPercentage: totalSegments > 0 ? 
      Number(((otherSegments / totalSegments) * 100).toFixed(2)) : 0
  };
}

// ==================== EFFICIENCY METRICS ====================

export function calculateEfficiencyMetrics(voyages: VoyageList[], segments: VoyageSegment[]) {
  // Mixed voyage efficiency - based on ratio of mixed voyages to total
  const mixedVoyages = voyages.filter(v => v.voyagePurpose === 'Mixed').length;
  const mixedVoyageEfficiency = voyages.length > 0 ? 
    Number(((mixedVoyages / voyages.length) * 100).toFixed(2)) : 0;
  
  // Route efficiency - based on standard patterns
  const standardPatternSegments = segments.filter(s => s.isStandardPattern).length;
  const routeEfficiencyScore = segments.length > 0 ? 
    Number(((standardPatternSegments / segments.length) * 100).toFixed(2)) : 0;
  
  // Consolidation benefit - based on multi-stop voyages
  const multiStopVoyages = voyages.filter(v => v.stopCount > 2).length;
  const consolidationBenefit = voyages.length > 0 ? 
    Number(((multiStopVoyages / voyages.length) * 100).toFixed(2)) : 0;
  
  return {
    mixedVoyageEfficiency,
    routeEfficiencyScore,
    consolidationBenefit
  };
}

// ==================== VESSEL UTILIZATION ====================

export function calculateVesselUtilization(voyages: VoyageList[]) {
  const vesselMap = voyages.reduce((map, voyage) => {
    if (!map[voyage.vessel]) {
      map[voyage.vessel] = {
        voyageCount: 0,
        totalHours: 0
      };
    }
    map[voyage.vessel].voyageCount++;
    map[voyage.vessel].totalHours += (voyage.durationHours || 0);
    return map;
  }, {} as Record<string, { voyageCount: number; totalHours: number }>);
  
  const vessels = Object.keys(vesselMap);
  const activeVesselsThisMonth = vessels.length;
  
  const totalVoyageCount = Object.values(vesselMap).reduce((sum, v) => sum + v.voyageCount, 0);
  const voyagesPerVessel = activeVesselsThisMonth > 0 ? 
    Number((totalVoyageCount / activeVesselsThisMonth).toFixed(2)) : 0;
  
  // Utilization based on average voyage frequency
  const maxPossibleVoyages = activeVesselsThisMonth * 30; // Assume 30 possible voyages per month per vessel
  const vesselUtilizationRate = maxPossibleVoyages > 0 ? 
    Number(((totalVoyageCount / maxPossibleVoyages) * 100).toFixed(2)) : 0;
  
  return {
    activeVesselsThisMonth,
    voyagesPerVessel,
    vesselUtilizationRate
  };
}

// ==================== POPULAR DESTINATIONS ====================

export function calculatePopularDestinations(segments: VoyageSegment[]) {
  const destinationMap = segments.reduce((map, segment) => {
    const dest = segment.destination;
    if (!map[dest]) {
      map[dest] = {
        count: 0,
        departments: {} as Record<string, number>
      };
    }
    map[dest].count++;
    map[dest].departments[segment.finalDepartment] = 
      (map[dest].departments[segment.finalDepartment] || 0) + 1;
    return map;
  }, {} as Record<string, { count: number; departments: Record<string, number> }>);
  
  const totalSegments = segments.length;
  
  const popularDestinations = Object.entries(destinationMap)
    .map(([destination, data]) => ({
      destination,
      count: data.count,
      percentage: totalSegments > 0 ? 
        Number(((data.count / totalSegments) * 100).toFixed(2)) : 0,
      departmentDistribution: Object.keys(data.departments).reduce((dist, dept) => {
        dist[dept] = data.count > 0 ? 
          Number(((data.departments[dept] / data.count) * 100).toFixed(2)) : 0;
        return dist;
      }, {} as Record<string, number>)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 destinations
  
  return popularDestinations;
}

// ==================== TEMPORAL ANALYSIS ====================

export function calculateTemporalAnalysis(voyages: VoyageList[]) {
  const monthlyVoyages = voyages.reduce((map, voyage) => {
    map[voyage.month] = (map[voyage.month] || 0) + 1;
    return map;
  }, {} as Record<string, number>);
  
  const totalVoyages = voyages.length;
  const monthlyVoyageDistribution = Object.keys(monthlyVoyages).reduce((dist, month) => {
    dist[month] = totalVoyages > 0 ? 
      Number(((monthlyVoyages[month] / totalVoyages) * 100).toFixed(2)) : 0;
    return dist;
  }, {} as Record<string, number>);
  
  // Determine peak season
  const maxVoyageMonth = Object.entries(monthlyVoyages)
    .reduce((max, [month, count]) => count > max.count ? { month, count } : max, 
            { month: '', count: 0 });
  
  const avgVoyages = totalVoyages / Math.max(Object.keys(monthlyVoyages).length, 1);
  const peakSeasonIndicator = maxVoyageMonth.count > avgVoyages * 1.2 ? 
    `Peak: ${maxVoyageMonth.month}` : 'Balanced';
  
  return {
    monthlyVoyageDistribution,
    peakSeasonIndicator
  };
}

// ==================== ADVANCED SEGMENT ANALYSIS ====================

export function calculateSegmentAnalysis(segments: VoyageSegment[]) {
  const totalSegments = segments.length;
  
  // Group segments by voyage to calculate averages
  const voyageSegmentMap = segments.reduce((map, segment) => {
    if (!map[segment.uniqueVoyageId]) {
      map[segment.uniqueVoyageId] = 0;
    }
    map[segment.uniqueVoyageId]++;
    return map;
  }, {} as Record<string, number>);
  
  const totalVoyages = Object.keys(voyageSegmentMap).length;
  const averageSegmentsPerVoyage = totalVoyages > 0 ? 
    Number((totalSegments / totalVoyages).toFixed(2)) : 0;
  
  const productionSegments = segments.filter(s => s.isProductionSegment).length;
  const drillingSegments = segments.filter(s => s.isDrillingSegment).length;
  const offshoreSegments = segments.filter(s => s.isOffshoreSegment).length;
  const fourchonOriginSegments = segments.filter(s => s.originIsFourchon).length;
  const fourchonDestinationSegments = segments.filter(s => s.destinationIsFourchon).length;
  
  return {
    totalSegments,
    averageSegmentsPerVoyage,
    productionSegmentPercentage: totalSegments > 0 ? 
      Number(((productionSegments / totalSegments) * 100).toFixed(2)) : 0,
    drillingSegmentPercentage: totalSegments > 0 ? 
      Number(((drillingSegments / totalSegments) * 100).toFixed(2)) : 0,
    offshoreSegmentPercentage: totalSegments > 0 ? 
      Number(((offshoreSegments / totalSegments) * 100).toFixed(2)) : 0,
    fourchonOriginPercentage: totalSegments > 0 ? 
      Number(((fourchonOriginSegments / totalSegments) * 100).toFixed(2)) : 0,
    fourchonDestinationPercentage: totalSegments > 0 ? 
      Number(((fourchonDestinationSegments / totalSegments) * 100).toFixed(2)) : 0
  };
}

// ==================== MASTER ANALYTICS FUNCTION ====================

export function calculateVoyageListMetrics(voyages: VoyageList[], segments: VoyageSegment[]) {
  const basicMetrics = calculateBasicVoyageMetrics(voyages);
  const purposeDistribution = calculateVoyagePurposeDistribution(voyages);
  const patternAnalysis = calculatePatternAnalysis(segments);
  const facilityMetrics = calculateFacilityMetrics(voyages);
  const departmentDistribution = calculateDepartmentDistribution(segments);
  const efficiencyMetrics = calculateEfficiencyMetrics(voyages, segments);
  const vesselUtilization = calculateVesselUtilization(voyages);
  const popularDestinations = calculatePopularDestinations(segments);
  const temporalAnalysis = calculateTemporalAnalysis(voyages);
  const segmentAnalysis = calculateSegmentAnalysis(segments);
  
  // Calculate some additional derived metrics
  const onTimeVoyagePercentage = 85.0; // Placeholder - would need actual vs planned data
  const averageExecutionEfficiency = efficiencyMetrics.routeEfficiencyScore;
  const routeConcentration = popularDestinations.length > 0 ? popularDestinations[0].percentage : 0;
  
  return {
    ...basicMetrics,
    ...purposeDistribution,
    ...patternAnalysis,
    ...facilityMetrics,
    ...departmentDistribution,
    ...efficiencyMetrics,
    ...vesselUtilization,
    popularDestinations,
    ...temporalAnalysis,
    onTimeVoyagePercentage,
    averageExecutionEfficiency,
    routeConcentration,
    segmentAnalysis,
    
    // Month-over-month change placeholder
    avgVoyageDurationMoMChange: 0.0 // Would need historical data to calculate
  };
}

// ==================== VALIDATION AND DEBUGGING ====================

export function debugVoyageData(voyages: VoyageList[], segments: VoyageSegment[]) {
  console.log('=== VOYAGE LIST DEBUG INFO ===');
  console.log(`Total Voyages: ${voyages.length}`);
  console.log(`Total Segments: ${segments.length}`);
  
  const purposes = voyages.reduce((map, v) => {
    map[v.voyagePurpose] = (map[v.voyagePurpose] || 0) + 1;
    return map;
  }, {} as Record<string, number>);
  console.log('Voyage Purposes:', purposes);
  
  const departments = segments.reduce((map, s) => {
    map[s.finalDepartment] = (map[s.finalDepartment] || 0) + 1;
    return map;
  }, {} as Record<string, number>);
  console.log('Segment Departments:', departments);
  
  const patterns = segments.reduce((map, s) => {
    map[s.voyagePattern] = (map[s.voyagePattern] || 0) + 1;
    return map;
  }, {} as Record<string, number>);
  console.log('Voyage Patterns:', patterns);
  
  console.log('=== END DEBUG ===');
} 