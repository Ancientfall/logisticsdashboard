import { CostAllocation, VoyageEvent } from '../types';

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