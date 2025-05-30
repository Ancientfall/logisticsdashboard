import { CostAllocation } from '../types';
import { ensureNumber, safeDivide, calculateTrendPercentage } from './formatters';

export interface MonthlyRigCost {
  rigLocation: string;
  month: string;
  year: number;
  monthYear: string;
  totalCost: number;
  budgetedCost: number;
  allocatedDays: number;
  dailyRate: number;
  projectCount: number;
  costPerDay: number;
  projectTypes: string[];
  lcNumbers: string[];
}

export interface RigCostTrend {
  rigLocation: string;
  monthlyData: MonthlyRigCost[];
  averageMonthlyCost: number;
  totalCost: number;
  totalDays: number;
  averageDailyRate: number;
  costTrend: number; // percentage change over time
  projectedNextMonthCost: number;
  yearOverYearComparison: {
    currentYear: number;
    previousYear: number;
    variance: number;
    variancePercentage: number;
  };
}

export interface CostAnalysisResult {
  rigTrends: Record<string, RigCostTrend>;
  monthlyOverview: Record<string, {
    totalCost: number;
    totalDays: number;
    rigCount: number;
    averageCostPerRig: number;
    averageDailyRate: number;
  }>;
  yearlyComparison: Record<number, {
    totalCost: number;
    totalDays: number;
    averageMonthlyCost: number;
    rigCount: number;
  }>;
  projections: {
    nextMonthTotalCost: number;
    nextQuarterCost: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    confidenceLevel: number;
  };
}

/**
 * Validate and clean cost allocation data to prevent double counting
 */
export const validateCostAllocationData = (costAllocations: CostAllocation[]): {
  validRecords: CostAllocation[];
  duplicates: CostAllocation[];
  issues: string[];
} => {
  const issues: string[] = [];
  const duplicates: CostAllocation[] = [];
  const validRecords: CostAllocation[] = [];
  const seenRecords = new Set<string>();

  // Track potential duplicates by creating a unique key
  costAllocations.forEach((record, index) => {
    const recordKey = `${record.lcNumber}_${record.monthYear}_${record.rigLocation}_${ensureNumber(record.totalAllocatedDays)}`;
    
    // Validate allocated days
    const days = ensureNumber(record.totalAllocatedDays);
    if (days <= 0) {
      issues.push(`Record ${index + 1} (LC: ${record.lcNumber}): Invalid allocated days (${record.totalAllocatedDays})`);
      return;
    }

    // Check for excessive allocated days (more than 31 days per month is suspicious)
    if (days > 31) {
      issues.push(`Record ${index + 1} (LC: ${record.lcNumber}): Excessive allocated days (${days}) - possible data entry error`);
    }

    // Check for potential duplicates
    if (seenRecords.has(recordKey)) {
      duplicates.push(record);
      issues.push(`Record ${index + 1} (LC: ${record.lcNumber}): Potential duplicate detected`);
    } else {
      seenRecords.add(recordKey);
      validRecords.push(record);
    }

    // Validate rig location
    if (!record.rigLocation || record.rigLocation.trim() === '') {
      issues.push(`Record ${index + 1} (LC: ${record.lcNumber}): Missing rig location`);
    }

    // Validate month/year
    if (!record.monthYear || !record.year || !record.month) {
      issues.push(`Record ${index + 1} (LC: ${record.lcNumber}): Missing or invalid date information`);
    }
  });

  return { validRecords, duplicates, issues };
};

/**
 * Process cost allocation data into monthly rig costs
 */
export const processMonthlyRigCosts = (costAllocations: CostAllocation[]): MonthlyRigCost[] => {
  const { validRecords, issues } = validateCostAllocationData(costAllocations);
  
  if (issues.length > 0) {
    console.warn('🔍 Cost Allocation Data Issues Found:', issues);
  }

  // Group by rig location and month
  const monthlyGroups = validRecords.reduce((acc, record) => {
    if (!record.rigLocation || !record.monthYear) return acc;

    const key = `${record.rigLocation}_${record.monthYear}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(record);
    return acc;
  }, {} as Record<string, CostAllocation[]>);

  // Process each group into monthly summary
  const monthlyRigCosts: MonthlyRigCost[] = [];

  Object.entries(monthlyGroups).forEach(([key, records]) => {
    const firstRecord = records[0];
    const rigLocation = firstRecord.rigLocation!;
    const monthYear = firstRecord.monthYear!;
    const year = firstRecord.year!;
    const month = firstRecord.month!;

    // CRITICAL: Prevent double counting by ensuring we don't sum duplicate LCs
    const uniqueLCs = new Map<string, CostAllocation>();
    records.forEach(record => {
      const lcKey = record.lcNumber;
      if (!uniqueLCs.has(lcKey)) {
        uniqueLCs.set(lcKey, record);
      } else {
        console.warn(`⚠️ Skipping duplicate LC ${lcKey} in ${rigLocation} for ${monthYear}`);
      }
    });

    const uniqueRecords = Array.from(uniqueLCs.values());

    // Calculate aggregated values
    const totalCost = uniqueRecords.reduce((sum, r) => sum + ensureNumber(r.totalCost), 0);
    const budgetedCost = uniqueRecords.reduce((sum, r) => sum + ensureNumber(r.budgetedVesselCost), 0);
    const allocatedDays = uniqueRecords.reduce((sum, r) => sum + ensureNumber(r.totalAllocatedDays), 0);
    const dailyRate = uniqueRecords.find(r => r.vesselDailyRateUsed)?.vesselDailyRateUsed || 0;
    const costPerDay = safeDivide(budgetedCost || totalCost, allocatedDays);

    // Extract metadata
    const projectTypes = [...new Set(uniqueRecords.map(r => r.projectType).filter(Boolean))] as string[];
    const lcNumbers = [...new Set(uniqueRecords.map(r => r.lcNumber))];

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    monthlyRigCosts.push({
      rigLocation,
      month: monthName,
      year,
      monthYear,
      totalCost,
      budgetedCost,
      allocatedDays,
      dailyRate: ensureNumber(dailyRate),
      projectCount: uniqueRecords.length,
      costPerDay,
      projectTypes,
      lcNumbers
    });

    // Debug log for first few entries
    if (monthlyRigCosts.length <= 5) {
      console.log(`📊 Processed ${rigLocation} ${monthYear}:`, {
        originalRecords: records.length,
        uniqueRecords: uniqueRecords.length,
        allocatedDays,
        cost: budgetedCost || totalCost,
        lcNumbers
      });
    }
  });

  return monthlyRigCosts.sort((a, b) => {
    // Sort by rig location, then by year, then by month
    if (a.rigLocation !== b.rigLocation) {
      return a.rigLocation.localeCompare(b.rigLocation);
    }
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.month.localeCompare(b.month);
  });
};

/**
 * Analyze cost trends for each rig location
 */
export const analyzeCostTrends = (monthlyRigCosts: MonthlyRigCost[]): Record<string, RigCostTrend> => {
  const rigGroups = monthlyRigCosts.reduce((acc, monthly) => {
    if (!acc[monthly.rigLocation]) {
      acc[monthly.rigLocation] = [];
    }
    acc[monthly.rigLocation].push(monthly);
    return acc;
  }, {} as Record<string, MonthlyRigCost[]>);

  const rigTrends: Record<string, RigCostTrend> = {};

  Object.entries(rigGroups).forEach(([rigLocation, monthlyData]) => {
    // Sort by year and month
    const sortedData = monthlyData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month.localeCompare(b.month);
    });

    // Calculate totals and averages
    const totalCost = sortedData.reduce((sum, m) => sum + m.budgetedCost || m.totalCost, 0);
    const totalDays = sortedData.reduce((sum, m) => sum + m.allocatedDays, 0);
    const averageMonthlyCost = safeDivide(totalCost, sortedData.length);
    const averageDailyRate = safeDivide(totalCost, totalDays);

    // Calculate trend (linear regression on cost over time)
    const costTrend = calculateCostTrend(sortedData);

    // Project next month cost
    const projectedNextMonthCost = projectNextMonthCost(sortedData);

    // Year-over-year comparison
    const yearOverYearComparison = calculateYearOverYearComparison(sortedData);

    rigTrends[rigLocation] = {
      rigLocation,
      monthlyData: sortedData,
      averageMonthlyCost,
      totalCost,
      totalDays,
      averageDailyRate,
      costTrend,
      projectedNextMonthCost,
      yearOverYearComparison
    };
  });

  return rigTrends;
};

/**
 * Calculate cost trend using linear regression
 */
const calculateCostTrend = (monthlyData: MonthlyRigCost[]): number => {
  if (monthlyData.length < 2) return 0;

  const costs = monthlyData.map(m => m.budgetedCost || m.totalCost);
  const n = costs.length;
  
  // Simple linear regression: calculate slope
  const sumX = (n * (n + 1)) / 2; // sum of indices 1,2,3...n
  const sumY = costs.reduce((sum, cost) => sum + cost, 0);
  const sumXY = costs.reduce((sum, cost, index) => sum + cost * (index + 1), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // sum of squares 1²+2²+3²...n²

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Convert slope to percentage change per month
  const avgCost = sumY / n;
  return avgCost > 0 ? (slope / avgCost) * 100 : 0;
};

/**
 * Project next month cost based on trend
 */
const projectNextMonthCost = (monthlyData: MonthlyRigCost[]): number => {
  if (monthlyData.length === 0) return 0;
  if (monthlyData.length === 1) return monthlyData[0].budgetedCost || monthlyData[0].totalCost;

  const recentMonths = monthlyData.slice(-3); // Use last 3 months for projection
  const avgCost = recentMonths.reduce((sum, m) => sum + (m.budgetedCost || m.totalCost), 0) / recentMonths.length;
  const trendPercentage = calculateCostTrend(recentMonths);
  
  return avgCost * (1 + trendPercentage / 100);
};

/**
 * Calculate year-over-year comparison
 */
const calculateYearOverYearComparison = (monthlyData: MonthlyRigCost[]): RigCostTrend['yearOverYearComparison'] => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const currentYearData = monthlyData.filter(m => m.year === currentYear);
  const previousYearData = monthlyData.filter(m => m.year === previousYear);

  const currentYearCost = currentYearData.reduce((sum, m) => sum + (m.budgetedCost || m.totalCost), 0);
  const previousYearCost = previousYearData.reduce((sum, m) => sum + (m.budgetedCost || m.totalCost), 0);

  const variance = currentYearCost - previousYearCost;
  const variancePercentage = calculateTrendPercentage(currentYearCost, previousYearCost);

  return {
    currentYear: currentYearCost,
    previousYear: previousYearCost,
    variance,
    variancePercentage
  };
};

/**
 * Generate comprehensive cost analysis
 */
export const generateCostAnalysis = (costAllocations: CostAllocation[]): CostAnalysisResult => {
  const monthlyRigCosts = processMonthlyRigCosts(costAllocations);
  const rigTrends = analyzeCostTrends(monthlyRigCosts);

  // Generate monthly overview
  const monthlyOverview = monthlyRigCosts.reduce((acc, monthly) => {
    const key = monthly.monthYear;
    if (!acc[key]) {
      acc[key] = {
        totalCost: 0,
        totalDays: 0,
        rigCount: 0,
        averageCostPerRig: 0,
        averageDailyRate: 0
      };
    }

    acc[key].totalCost += monthly.budgetedCost || monthly.totalCost;
    acc[key].totalDays += monthly.allocatedDays;
    acc[key].rigCount++;

    return acc;
  }, {} as Record<string, any>);

  // Calculate averages for monthly overview
  Object.values(monthlyOverview).forEach((overview: any) => {
    overview.averageCostPerRig = safeDivide(overview.totalCost, overview.rigCount);
    overview.averageDailyRate = safeDivide(overview.totalCost, overview.totalDays);
  });

  // Generate yearly comparison
  const yearlyComparison = monthlyRigCosts.reduce((acc, monthly) => {
    if (!acc[monthly.year]) {
      acc[monthly.year] = {
        totalCost: 0,
        totalDays: 0,
        averageMonthlyCost: 0,
        rigCount: new Set()
      };
    }

    acc[monthly.year].totalCost += monthly.budgetedCost || monthly.totalCost;
    acc[monthly.year].totalDays += monthly.allocatedDays;
    (acc[monthly.year].rigCount as Set<string>).add(monthly.rigLocation);

    return acc;
  }, {} as Record<number, any>);

  // Calculate yearly averages and convert Set to count
  Object.entries(yearlyComparison).forEach(([year, data]: [string, any]) => {
    const monthsInYear = monthlyRigCosts.filter(m => m.year === parseInt(year)).length;
    data.averageMonthlyCost = safeDivide(data.totalCost, monthsInYear);
    data.rigCount = data.rigCount.size;
  });

  // Generate projections
  const allRigTrends = Object.values(rigTrends);
  const nextMonthTotalCost = allRigTrends.reduce((sum, trend) => sum + trend.projectedNextMonthCost, 0);
  const nextQuarterCost = nextMonthTotalCost * 3; // Simple 3-month projection

  const avgTrend = allRigTrends.reduce((sum, trend) => sum + trend.costTrend, 0) / allRigTrends.length;
  const trendDirection = avgTrend > 2 ? 'increasing' : avgTrend < -2 ? 'decreasing' : 'stable';
  
  const confidenceLevel = Math.min(100, Math.max(0, 100 - Math.abs(avgTrend) * 2)); // Lower confidence with higher volatility

  return {
    rigTrends,
    monthlyOverview,
    yearlyComparison,
    projections: {
      nextMonthTotalCost,
      nextQuarterCost,
      trendDirection,
      confidenceLevel
    }
  };
};

/**
 * Get summary statistics for debugging Thunder Horse and Mad Dog issues
 */
export const debugRigLocationData = (costAllocations: CostAllocation[], rigLocation: string): {
  totalRecords: number;
  uniqueLCNumbers: string[];
  monthlyBreakdown: Record<string, { records: number; totalDays: number; lcNumbers: string[] }>;
  potentialIssues: string[];
} => {
  const rigRecords = costAllocations.filter(c => 
    c.rigLocation === rigLocation || 
    c.locationReference === rigLocation ||
    (c.description && c.description.toLowerCase().includes(rigLocation.toLowerCase()))
  );

  const uniqueLCNumbers = [...new Set(rigRecords.map(r => r.lcNumber))];
  const potentialIssues: string[] = [];

  const monthlyBreakdown = rigRecords.reduce((acc, record) => {
    const monthKey = record.monthYear || 'Unknown';
    if (!acc[monthKey]) {
      acc[monthKey] = { records: 0, totalDays: 0, lcNumbers: [] };
    }

    acc[monthKey].records++;
    acc[monthKey].totalDays += ensureNumber(record.totalAllocatedDays);
    acc[monthKey].lcNumbers.push(record.lcNumber);

    // Check for suspicious patterns
    if (ensureNumber(record.totalAllocatedDays) > 31) {
      potentialIssues.push(`${record.lcNumber} in ${monthKey}: ${record.totalAllocatedDays} days (> 31)`);
    }

    return acc;
  }, {} as Record<string, { records: number; totalDays: number; lcNumbers: string[] }>);

  // Check for months with excessive total days
  Object.entries(monthlyBreakdown).forEach(([month, data]) => {
    if (data.totalDays > 100) {
      potentialIssues.push(`${month}: ${data.totalDays} total days (suspicious - multiple rigs or double counting?)`);
    }
  });

  return {
    totalRecords: rigRecords.length,
    uniqueLCNumbers,
    monthlyBreakdown,
    potentialIssues
  };
}; 