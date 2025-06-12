import { useMemo } from 'react';
import { CostAllocation, VoyageEvent, VesselManifest, VoyageList } from '../../../../types';
import { detectProjectType } from '../../../../utils/projectTypeUtils';

export interface CostMetrics {
  totalAllocatedCost: number;
  totalBudget: number;
  budgetVariance: number;
  avgCostPerDay: number;
  totalAllocatedDays: number;
  activeRigs: number;
  utilizationRate: number;
  costEfficiency: number;
  avgDailyRate: number;
  totalVoyages: number;
  avgCostPerVoyage: number;
  costTrend: number;
  dailyCostTrend: number;
  utilizationTrend: number;
  departmentBreakdown: Array<{
    department: string;
    cost: number;
    percentage: number;
  }>;
  projectTypeBreakdown: Array<{
    projectType: string;
    cost: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    cost: number;
    days: number;
    trend: number | null;
  }>;
  locationBreakdown: Array<{
    location: string;
    cost: number;
    percentage: number;
  }>;
}

export interface CostAnalysisResult {
  totalAllocations: number;
  totalBudgetedCost: number;
  totalAllocatedDays: number;
  avgCostPerDay: number;
  projectTypeBreakdown: Record<string, any>;
  rigLocationBreakdown: Record<string, any>;
  monthlyTrends: Record<string, any>;
  costEfficiencyMetrics: {
    avgCostPerProject: number;
    mostEfficientProjectType: string;
    utilizationRate: number;
  };
}

export const useCostAnalysis = (filteredCostAllocation: CostAllocation[]): CostAnalysisResult => {
  return useMemo(() => {
    if (!filteredCostAllocation || filteredCostAllocation.length === 0) {
      return {
        totalAllocations: 0,
        totalBudgetedCost: 0,
        totalAllocatedDays: 0,
        avgCostPerDay: 0,
        projectTypeBreakdown: {},
        rigLocationBreakdown: {},
        monthlyTrends: {},
        costEfficiencyMetrics: {
          avgCostPerProject: 0,
          mostEfficientProjectType: 'N/A',
          utilizationRate: 0
        }
      };
    }

    const totalBudgetedCost = filteredCostAllocation.reduce((sum, allocation) => sum + (allocation.budgetedVesselCost || 0), 0);
    const totalAllocatedDays = filteredCostAllocation.reduce((sum, allocation) => sum + (allocation.totalAllocatedDays || 0), 0);
    const avgCostPerDay = totalAllocatedDays > 0 ? totalBudgetedCost / totalAllocatedDays : 0;

    // Project type analysis with enhanced metrics
    const projectTypeBreakdown = filteredCostAllocation.reduce((acc, allocation) => {
      const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
      if (!acc[projectType]) {
        acc[projectType] = { 
          cost: 0, 
          days: 0, 
          count: 0, 
          avgCostPerDay: 0,
          efficiency: 0,
          locations: new Set()
        };
      }
      acc[projectType].cost += allocation.budgetedVesselCost || 0;
      acc[projectType].days += allocation.totalAllocatedDays || 0;
      acc[projectType].count += 1;
      if (allocation.rigLocation) {
        acc[projectType].locations.add(allocation.rigLocation);
      }
      acc[projectType].avgCostPerDay = acc[projectType].days > 0 ? acc[projectType].cost / acc[projectType].days : 0;
      return acc;
    }, {} as Record<string, any>);

    // Enhanced rig location analysis with PROPER NUMBER AGGREGATION
    const rigLocationBreakdown = filteredCostAllocation
      .filter(allocation => allocation.rigLocation)
      .reduce((acc, allocation) => {
        const rig = allocation.rigLocation!;
        const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
        
        if (!acc[rig]) {
          acc[rig] = { 
            cost: 0, 
            days: 0, 
            count: 0, 
            rigType: allocation.rigType || 'Unknown',
            waterDepth: allocation.waterDepth || 0,
            avgDailyRate: 0,
            projects: {},
            efficiency: 0,
            utilizationRate: 0,
            records: []
          };
        }
        
        // CRITICAL FIX: Ensure proper number conversion to prevent string concatenation
        const costValue = Number(allocation.budgetedVesselCost || allocation.totalCost || 0);
        const daysValue = Number(allocation.totalAllocatedDays || 0);
        const dailyRate = Number(allocation.vesselDailyRateUsed || 0);
        
        acc[rig].cost += costValue;
        acc[rig].days += daysValue;
        acc[rig].count += 1;
        acc[rig].avgDailyRate = dailyRate; // Use most recent daily rate
        acc[rig].records.push({
          lcNumber: allocation.lcNumber,
          days: daysValue,
          cost: costValue,
          monthYear: allocation.monthYear
        });
        
        // Project breakdown per rig
        if (!acc[rig].projects[projectType]) {
          acc[rig].projects[projectType] = { cost: 0, days: 0, count: 0 };
        }
        acc[rig].projects[projectType].cost += costValue;
        acc[rig].projects[projectType].days += daysValue;
        acc[rig].projects[projectType].count += 1;
        
        return acc;
      }, {} as Record<string, any>);

    // Monthly trends with project insights
    const monthlyTrends = filteredCostAllocation.reduce((acc, allocation) => {
      const month = allocation.monthYear || 'Unknown';
      const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
      
      if (!acc[month]) {
        acc[month] = { cost: 0, days: 0, count: 0, projects: {}, avgRate: 0 };
      }
      
      acc[month].cost += allocation.budgetedVesselCost || 0;
      acc[month].days += allocation.totalAllocatedDays || 0;
      acc[month].count += 1;
      acc[month].avgRate = allocation.vesselDailyRateUsed || 0;
      
      if (!acc[month].projects[projectType]) {
        acc[month].projects[projectType] = { cost: 0, days: 0 };
      }
      acc[month].projects[projectType].cost += allocation.budgetedVesselCost || 0;
      acc[month].projects[projectType].days += allocation.totalAllocatedDays || 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Cost efficiency metrics
    const costEfficiencyMetrics = {
      avgCostPerProject: Object.keys(projectTypeBreakdown).length > 0 ? 
        totalBudgetedCost / Object.keys(projectTypeBreakdown).length : 0,
      mostEfficientProjectType: Object.entries(projectTypeBreakdown)
        .sort(([,a], [,b]) => (a as any).avgCostPerDay - (b as any).avgCostPerDay)[0]?.[0] || 'N/A',
      utilizationRate: totalAllocatedDays > 0 ? (totalAllocatedDays / (365 * Object.keys(rigLocationBreakdown).length)) * 100 : 0
    };

    return {
      totalAllocations: filteredCostAllocation.length,
      totalBudgetedCost,
      totalAllocatedDays,
      avgCostPerDay,
      projectTypeBreakdown,
      rigLocationBreakdown,
      monthlyTrends,
      costEfficiencyMetrics
    };
  }, [filteredCostAllocation]);
};

export function useCostAnalysisRedesigned(
  costAllocation: CostAllocation[],
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  voyageList: VoyageList[]
): CostMetrics {
  return useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) {
      return getEmptyMetrics();
    }

    // Calculate total allocated cost and budget
    // Use budgetedVesselCost as the primary cost field
    const totalAllocatedCost = costAllocation.reduce((sum, cost) => 
      sum + (cost.budgetedVesselCost || cost.totalCost || 0), 0
    );
    const totalBudget = costAllocation.reduce((sum, cost) => 
      sum + (cost.budgetedVesselCost || 0), 0
    );
    const budgetVariance = totalAllocatedCost - totalBudget;

    // Calculate total allocated days
    const totalAllocatedDays = costAllocation.reduce((sum, cost) => 
      sum + (cost.totalAllocatedDays || 0), 0
    );

    // Calculate average cost per day
    const avgCostPerDay = totalAllocatedDays > 0 ? totalAllocatedCost / totalAllocatedDays : 0;

    // Count active rigs (unique rig locations)
    const activeRigs = new Set(
      costAllocation
        .map(cost => cost.rigLocation || cost.locationReference)
        .filter(Boolean)
    ).size;

    // Calculate utilization rate (based on allocated days vs potential days)
    const potentialDays = costAllocation.length * 30; // Assuming 30 days per month
    const utilizationRate = (totalAllocatedDays / potentialDays) * 100;

    // Calculate cost efficiency (budget utilization)
    const costEfficiency = totalBudget > 0 ? 
      ((totalBudget - Math.abs(budgetVariance)) / totalBudget) * 100 : 0;

    // Calculate average daily rate
    const totalDailyRates = costAllocation.reduce((sum, cost) => 
      sum + (cost.vesselDailyRateUsed || 0), 0
    );
    const avgDailyRate = costAllocation.length > 0 ? 
      totalDailyRates / costAllocation.length : 0;

    // Calculate voyage metrics
    const uniqueVoyages = new Set(
      vesselManifests.map(m => m.voyageId).filter(Boolean)
    ).size;
    const totalVoyages = uniqueVoyages || voyageList.length;
    const avgCostPerVoyage = totalVoyages > 0 ? totalAllocatedCost / totalVoyages : 0;

    // Calculate trends (mock data for now - would need historical data)
    const costTrend = -5.2; // Example: 5.2% decrease
    const dailyCostTrend = -3.1;
    const utilizationTrend = 2.4;

    // Department breakdown
    const departmentCosts = new Map<string, number>();
    costAllocation.forEach(cost => {
      const dept = cost.department || 'Unknown';
      departmentCosts.set(dept, (departmentCosts.get(dept) || 0) + (cost.budgetedVesselCost || cost.totalCost || 0));
    });

    const departmentBreakdown = Array.from(departmentCosts.entries())
      .map(([department, cost]) => ({
        department,
        cost,
        percentage: totalAllocatedCost > 0 ? (cost / totalAllocatedCost) * 100 : 0
      }))
      .sort((a, b) => b.cost - a.cost);

    // Project type breakdown
    const projectCosts = new Map<string, number>();
    costAllocation.forEach(cost => {
      const project = detectProjectType(cost.description, cost.costElement, cost.lcNumber, cost.projectType);
      projectCosts.set(project, (projectCosts.get(project) || 0) + (cost.budgetedVesselCost || cost.totalCost || 0));
    });

    const projectTypeBreakdown = Array.from(projectCosts.entries())
      .map(([projectType, cost]) => ({
        projectType,
        cost,
        percentage: totalAllocatedCost > 0 ? (cost / totalAllocatedCost) * 100 : 0
      }))
      .sort((a, b) => b.cost - a.cost);

    // Monthly trend
    const monthlyCosts = new Map<string, { cost: number; days: number }>();
    costAllocation.forEach(cost => {
      if (cost.costAllocationDate) {
        const monthKey = `${cost.costAllocationDate.toLocaleString('en-US', { month: 'short' })} ${cost.costAllocationDate.getFullYear()}`;
        const existing = monthlyCosts.get(monthKey) || { cost: 0, days: 0 };
        monthlyCosts.set(monthKey, {
          cost: existing.cost + (cost.budgetedVesselCost || cost.totalCost || 0),
          days: existing.days + (cost.totalAllocatedDays || 0)
        });
      }
    });

    const monthlyTrend = Array.from(monthlyCosts.entries())
      .map(([month, data], index, array) => {
        const previousMonth = index > 0 ? array[index - 1][1].cost : null;
        const trend = previousMonth ? ((data.cost - previousMonth) / previousMonth) * 100 : null;
        return {
          month,
          cost: data.cost,
          days: data.days,
          trend
        };
      })
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    // Location breakdown
    const locationCosts = new Map<string, number>();
    costAllocation.forEach(cost => {
      const location = cost.rigLocation || cost.locationReference || 'Unknown';
      if (location !== 'Unknown') {
        locationCosts.set(location, (locationCosts.get(location) || 0) + (cost.budgetedVesselCost || cost.totalCost || 0));
      }
    });

    const locationBreakdown = Array.from(locationCosts.entries())
      .map(([location, cost]) => ({
        location,
        cost,
        percentage: totalAllocatedCost > 0 ? (cost / totalAllocatedCost) * 100 : 0
      }))
      .sort((a, b) => b.cost - a.cost);

    return {
      totalAllocatedCost,
      totalBudget,
      budgetVariance,
      avgCostPerDay,
      totalAllocatedDays,
      activeRigs,
      utilizationRate,
      costEfficiency,
      avgDailyRate,
      totalVoyages,
      avgCostPerVoyage,
      costTrend,
      dailyCostTrend,
      utilizationTrend,
      departmentBreakdown,
      projectTypeBreakdown,
      monthlyTrend,
      locationBreakdown
    };
  }, [costAllocation, vesselManifests, voyageList]);
}

function getEmptyMetrics(): CostMetrics {
  return {
    totalAllocatedCost: 0,
    totalBudget: 0,
    budgetVariance: 0,
    avgCostPerDay: 0,
    totalAllocatedDays: 0,
    activeRigs: 0,
    utilizationRate: 0,
    costEfficiency: 0,
    avgDailyRate: 0,
    totalVoyages: 0,
    avgCostPerVoyage: 0,
    costTrend: 0,
    dailyCostTrend: 0,
    utilizationTrend: 0,
    departmentBreakdown: [],
    projectTypeBreakdown: [],
    monthlyTrend: [],
    locationBreakdown: []
  };
}