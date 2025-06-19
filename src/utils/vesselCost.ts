import { VoyageEvent } from '../types';

/**
 * Vessel cost calculation utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Vessel cost rates by date range
 * Updated to match confirmed data range: Jan 1, 2024 - May 31, 2025
 */
const VESSEL_COST_RATES = [
  {
    startDate: new Date('2024-01-01'),    // January 1, 2024
    endDate: new Date('2025-04-01'),      // April 1, 2025 (inclusive of March 31)
    dailyRate: 33000, // $33,000 per day
    description: 'Jan 2024 - Mar 2025 Rate'
  },
  {
    startDate: new Date('2025-04-01'),    // April 1, 2025
    endDate: new Date('2025-06-01'),      // June 1, 2025 (inclusive of May 31)
    dailyRate: 37800, // $37,800 per day
    description: 'Apr-May 2025 Rate'
  }
];

/**
 * Calculate vessel daily cost rate for a given date
 */
export const getVesselDailyRate = (eventDate: Date): { dailyRate: number; description: string } => {
  for (const rate of VESSEL_COST_RATES) {
    if (eventDate >= rate.startDate && eventDate <= rate.endDate) {
      return {
        dailyRate: rate.dailyRate,
        description: rate.description
      };
    }
  }
  
  // Fallback to most recent rate if date is beyond configured ranges
  const latestRate = VESSEL_COST_RATES[VESSEL_COST_RATES.length - 1];
  console.warn(`⚠️ Date ${eventDate.toISOString()} is outside configured cost rate ranges. Using latest rate: $${latestRate.dailyRate}/day`);
  return {
    dailyRate: latestRate.dailyRate,
    description: `${latestRate.description} (Fallback)`
  };
};

/**
 * Calculate total vessel cost for an event based on hours and date
 */
export const calculateVesselCost = (eventDate: Date, hours: number): { 
  totalCost: number; 
  dailyRate: number; 
  hourlyRate: number; 
  rateDescription: string 
} => {
  const { dailyRate, description } = getVesselDailyRate(eventDate);
  const hourlyRate = dailyRate / 24; // Convert daily rate to hourly
  const totalCost = hourlyRate * hours;
  
  return {
    totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
    dailyRate,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    rateDescription: description
  };
};

/**
 * Calculate vessel cost metrics for a collection of voyage events
 */
export const calculateVesselCostMetrics = (events: VoyageEvent[]): {
  totalVesselCost: number;
  averageVesselCostPerHour: number;
  averageVesselCostPerDay: number;
  vesselCostByDepartment: Record<string, { cost: number; hours: number; events: number }>;
  vesselCostByActivity: Record<string, { cost: number; hours: number; events: number }>;
  vesselCostRateBreakdown: Record<string, { cost: number; hours: number; events: number }>;
} => {
  // Calculate costs on-the-fly if not already populated
  let totalVesselCost = 0;
  let totalHours = 0;
  
  // First pass: calculate costs and populate totals
  for (const event of events) {
    const hours = event.finalHours || 0;
    totalHours += hours;
    
    // Use existing cost if available, otherwise calculate it
    if (event.vesselCostTotal) {
      totalVesselCost += event.vesselCostTotal;
    } else if (hours > 0 && event.eventDate) {
      // Calculate cost on-the-fly using vessel cost rates
      const costData = calculateVesselCost(event.eventDate, hours);
      totalVesselCost += costData.totalCost;
    }
  }

  // Calculate average costs
  const averageVesselCostPerHour = totalHours > 0 ? totalVesselCost / totalHours : 0;
  const averageVesselCostPerDay = averageVesselCostPerHour * 24;

  // Cost breakdown by department
  const vesselCostByDepartment = events.reduce((acc, event) => {
    const dept = event.department || 'Unknown';
    if (!acc[dept]) {
      acc[dept] = { cost: 0, hours: 0, events: 0 };
    }
    
    const hours = event.finalHours || 0;
    let eventCost = event.vesselCostTotal || 0;
    
    // Calculate cost if not already populated
    if (!eventCost && hours > 0 && event.eventDate) {
      const costData = calculateVesselCost(event.eventDate, hours);
      eventCost = costData.totalCost;
    }
    
    acc[dept].cost += eventCost;
    acc[dept].hours += hours;
    acc[dept].events += 1;
    return acc;
  }, {} as Record<string, { cost: number; hours: number; events: number }>);

  // Cost breakdown by activity
  const vesselCostByActivity = events.reduce((acc, event) => {
    const activity = event.activityCategory || 'Unknown';
    if (!acc[activity]) {
      acc[activity] = { cost: 0, hours: 0, events: 0 };
    }
    
    const hours = event.finalHours || 0;
    let eventCost = event.vesselCostTotal || 0;
    
    // Calculate cost if not already populated
    if (!eventCost && hours > 0 && event.eventDate) {
      const costData = calculateVesselCost(event.eventDate, hours);
      eventCost = costData.totalCost;
    }
    
    acc[activity].cost += eventCost;
    acc[activity].hours += hours;
    acc[activity].events += 1;
    return acc;
  }, {} as Record<string, { cost: number; hours: number; events: number }>);

  // Cost breakdown by rate period
  const vesselCostRateBreakdown = events.reduce((acc, event) => {
    const hours = event.finalHours || 0;
    let eventCost = event.vesselCostTotal || 0;
    let rateDesc = event.vesselCostRateDescription || 'Unknown Rate';
    
    // Calculate cost and rate description if not already populated
    if (!eventCost && hours > 0 && event.eventDate) {
      const costData = calculateVesselCost(event.eventDate, hours);
      eventCost = costData.totalCost;
      rateDesc = costData.rateDescription;
    }
    
    if (!acc[rateDesc]) {
      acc[rateDesc] = { cost: 0, hours: 0, events: 0 };
    }
    
    acc[rateDesc].cost += eventCost;
    acc[rateDesc].hours += hours;
    acc[rateDesc].events += 1;
    return acc;
  }, {} as Record<string, { cost: number; hours: number; events: number }>);

  // Debug logging for vessel cost calculations
  if (totalVesselCost === 0 && events.length > 0) {
    console.warn('⚠️ Vessel cost calculation resulted in $0', {
      eventsCount: events.length,
      totalHours,
      sampleEvent: events[0] ? {
        eventDate: events[0].eventDate,
        finalHours: events[0].finalHours,
        vesselCostTotal: events[0].vesselCostTotal
      } : null
    });
  } else {
    console.log(`✅ Vessel cost calculated: $${totalVesselCost.toLocaleString()} for ${events.length} events`);
  }

  return {
    totalVesselCost,
    averageVesselCostPerHour,
    averageVesselCostPerDay,
    vesselCostByDepartment,
    vesselCostByActivity,
    vesselCostRateBreakdown
  };
}; 