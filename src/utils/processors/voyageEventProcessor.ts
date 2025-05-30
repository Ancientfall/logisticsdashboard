import { VoyageEvent, MasterFacility, CostAllocation } from '../../types';
import { parseDate, getWeekNumber } from '../dateUtils';
import { calculateVesselCost } from '../vesselCost';
import { classifyActivity, inferCompanyFromVessel } from '../activityClassification';
import { processLCAllocations } from '../lcAllocation';

/**
 * Voyage event data processor
 * Extracted from dataProcessing.ts to improve modularity
 */

// Raw voyage event interface
interface RawVoyageEvent {
  Mission: string;
  Event?: string | null;
  "Parent Event": string;
  Location: string;
  Quay?: string;
  Remarks?: string | null;
  "Is active?": string;
  From: string;
  To?: string;
  Hours: number;
  "Port Type": string;
  "Event Category"?: string;
  Year: number;
  "Ins. 500m"?: string;
  "Cost Dedicated to"?: string | null;
  Vessel: string;
  "Voyage #": number;
}

/**
 * Process voyage events with complex LC allocation logic
 */
export const processVoyageEvents = (
  rawEvents: RawVoyageEvent[],
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>
): VoyageEvent[] => {
  const processedEvents: VoyageEvent[] = [];
  
  // Track department assignments for summary
  const departmentStats = {
    Drilling: 0,
    Production: 0, 
    Logistics: 0,
    Unknown: 0,
    totalEvents: 0
  };

  console.log(`📊 Processing ALL ${rawEvents.length} voyage events (ignoring "Is active?" column)`);
  
  for (const event of rawEvents) {
    try {
      // Parse dates
      const from = parseDate(event.From);
      const to = event.To ? parseDate(event.To) : from;
      
      // Calculate duration
      let hours = event.Hours;
      if ((hours === 0 || !hours) && from && to) {
        hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
      }
      
      // Ensure hours is a valid number before calling toFixed
      const numericHours = Number(hours);
      if (isNaN(numericHours)) {
        console.warn('Invalid hours value for event:', event, 'Original hours:', hours, 'Setting to 0');
        hours = 0;
      } else {
        hours = Number(numericHours.toFixed(2));
      }

      // Process LC allocations
      const lcAllocations = processLCAllocations(
        event["Cost Dedicated to"],
        event.Location,
        event["Parent Event"],
        event.Event || null, // Convert undefined to null
        event.Remarks || null, // Convert undefined to null
        event["Port Type"],
        facilitiesMap,
        costAllocationMap,
        processedEvents.length < 5 // Only debug first 5 events
      );

      // Create an event for each LC allocation
      lcAllocations.forEach((allocation, allocIndex) => {
        const finalHours = hours * (allocation.percentage / 100);
        const eventDate = from || new Date();
        
        // Track department assignments
        const assignedDepartment = allocation.department || 'Unknown';
        departmentStats[assignedDepartment as keyof typeof departmentStats]++;
        departmentStats.totalEvents++;
        
        // Calculate vessel costs for this event
        const vesselCostInfo = calculateVesselCost(eventDate, finalHours);

        processedEvents.push({
          id: `${event.Vessel}-${event["Voyage #"]}-${processedEvents.length}`,
          mission: event.Mission,
          vessel: event.Vessel,
          voyageNumber: String(event["Voyage #"]),
          event: event.Event || undefined, // Convert null to undefined
          parentEvent: event["Parent Event"],
          location: event.Location,
          originalLocation: event.Location,
          mappedLocation: allocation.mappedLocation,
          quay: event.Quay,
          remarks: event.Remarks || undefined, // Convert null to undefined
          from,
          to,
          hours,
          finalHours: Number(isNaN(finalHours) ? 0 : finalHours.toFixed(2)),
          eventDate,
          eventYear: eventDate.getFullYear(),
          quarter: `Q${Math.ceil((eventDate.getMonth() + 1) / 3)}`,
          monthNumber: eventDate.getMonth() + 1,
          monthName: eventDate.toLocaleString('default', { month: 'long' }),
          weekOfYear: getWeekNumber(eventDate),
          dayOfWeek: eventDate.toLocaleString('default', { weekday: 'long' }),
          dayOfMonth: eventDate.getDate(),
          portType: event["Port Type"] as 'rig' | 'base',
          locationType: event["Port Type"] === "rig" ? "Offshore" : event["Port Type"] === "base" ? "Onshore" : "Other",
          activityCategory: classifyActivity(event["Parent Event"], event.Event || null),
          eventCategory: event["Event Category"],
          department: allocation.department || undefined, // Convert null to undefined
          costDedicatedTo: event["Cost Dedicated to"] || undefined, // Convert null to undefined
          lcNumber: allocation.lcNumber,
          originalLCLocation: allocation.originalLocation || undefined, // Convert null to undefined
          lcPercentage: allocation.percentage,
          mappingStatus: allocation.isSpecialCase ? "Special Case Mapping" : 
                         allocation.lcNumber ? "LC Mapped" : "No LC Info",
          dataIntegrity: allocation.isSpecialCase ? "Valid - Special Case" :
                         allocation.lcNumber ? "Valid" : "Missing LC",
          isActive: true, // Set all events as active since we're ignoring the "Is active?" column
          ins500m: event["Ins. 500m"],
          year: event.Year,
          company: inferCompanyFromVessel(event.Vessel),
          standardizedVoyageNumber: String(event["Voyage #"]).trim(),
          
          // Vessel Cost Information
          vesselCostTotal: vesselCostInfo.totalCost,
          vesselDailyRate: vesselCostInfo.dailyRate,
          vesselHourlyRate: vesselCostInfo.hourlyRate,
          vesselCostRateDescription: vesselCostInfo.rateDescription
        });
      });
    } catch (error) {
      console.error('Error processing voyage event:', error, event);
    }
  }

  // Log department assignment summary
  console.log(`📈 DEPARTMENT ASSIGNMENT SUMMARY:`);
  console.log(`   🔧 Drilling: ${departmentStats.Drilling} events (${(departmentStats.Drilling / departmentStats.totalEvents * 100).toFixed(1)}%)`);
  console.log(`   🏭 Production: ${departmentStats.Production} events (${(departmentStats.Production / departmentStats.totalEvents * 100).toFixed(1)}%)`);
  console.log(`   🚢 Logistics: ${departmentStats.Logistics} events (${(departmentStats.Logistics / departmentStats.totalEvents * 100).toFixed(1)}%)`);
  console.log(`   ❓ Unknown: ${departmentStats.Unknown} events (${(departmentStats.Unknown / departmentStats.totalEvents * 100).toFixed(1)}%)`);
  console.log(`   📊 Total: ${departmentStats.totalEvents} events processed`);

  console.log(`✅ Successfully processed ${processedEvents.length} voyage events from ${rawEvents.length} raw events`);
  return processedEvents;
}; 