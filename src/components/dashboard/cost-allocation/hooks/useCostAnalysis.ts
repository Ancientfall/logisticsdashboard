import { useMemo } from 'react';
import { CostAllocation } from '../../../../types';
import { detectProjectType } from '../../../../utils/projectTypeUtils';

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