import { CostAllocation } from '../../types';
import { parseCostAllocationMonthYear } from '../dateUtils';
import { getVesselDailyRate } from '../vesselCost';
import { extractRigLocationFromDescription } from '../departmentInference';

/**
 * Debug version of cost allocation processor with relaxed validation
 * This version will process records even with date issues
 */

// Raw cost allocation interface
interface RawCostAllocation {
  "LC Number": string;
  "Location Reference"?: string;
  "Rig Reference"?: string;
  Description?: string;
  "Cost Element"?: string;
  "Month-Year"?: string | number | Date;
  Mission?: string;
  "Project Type"?: string;
  "Total Allocated Days"?: number;
  "Alloc (days)"?: number;
  "Allocated Days"?: number;
  "Days"?: number;
  "Average Vessel Cost Per Day"?: number;
  "Total Cost"?: number;
  "Amount"?: number;
  "Cost Per Hour"?: number;
  "Rig Location"?: string;
  "Rig Type"?: string;
  "Water Depth"?: number;
}

export const processCostAllocationDebug = (rawCostAllocation: RawCostAllocation[]): CostAllocation[] => {
  console.log(`🔍 DEBUG PROCESSOR: Processing ${rawCostAllocation.length} raw cost allocation records...`);
  
  if (!rawCostAllocation || rawCostAllocation.length === 0) {
    console.warn('⚠️ No cost allocation data provided');
    return [];
  }

  const processed: CostAllocation[] = [];
  const skippedRecords: any[] = [];

  rawCostAllocation.forEach((costAlloc, index) => {
    try {
      let lcNumber = String(costAlloc["LC Number"] || '').trim();
      
      // Parse allocated days
      const allocatedDaysRaw = 
        costAlloc["Alloc (days)"] ||
        costAlloc["Total Allocated Days"] ||
        costAlloc["Allocated Days"] ||
        costAlloc["Days"] ||
        undefined;
      
      const totalAllocatedDays = allocatedDaysRaw !== undefined ? Number(allocatedDaysRaw) : undefined;
      const finalTotalAllocatedDays = totalAllocatedDays !== undefined && !isNaN(totalAllocatedDays) && totalAllocatedDays >= 0 ? totalAllocatedDays : undefined;
      
      // Generate LC number if missing
      if (!lcNumber) {
        lcNumber = `UNKNOWN_${index + 1}`;
      }

      // Parse Month-Year with fallback
      let month: number | undefined;
      let year: number | undefined;
      let monthYear: string | undefined;
      let costAllocationDate: Date | undefined;

      if (costAlloc["Month-Year"]) {
        try {
          const parsed = parseCostAllocationMonthYear(costAlloc["Month-Year"]);
          year = parsed.year;
          month = parsed.month;
          monthYear = parsed.monthYear;
          costAllocationDate = parsed.costAllocationDate;
        } catch (error) {
          console.warn(`⚠️ Date parse failed for LC ${lcNumber}, using default: Jan 2024`);
          // Use default date instead of skipping
          year = 2024;
          month = 1;
          monthYear = "01-24";
          costAllocationDate = new Date(2024, 0, 15);
        }
      } else {
        // Use default date instead of skipping
        console.warn(`⚠️ No Month-Year for LC ${lcNumber}, using default: Jan 2024`);
        year = 2024;
        month = 1;
        monthYear = "01-24";
        costAllocationDate = new Date(2024, 0, 15);
      }

      // Get vessel daily rate
      const vesselRateInfo = costAllocationDate ? getVesselDailyRate(costAllocationDate) : { dailyRate: 33000, description: 'Default rate' };

      // Parse costs
      const totalCost = costAlloc["Total Cost"] || costAlloc["Amount"] || undefined;
      
      let costPerHour: number | undefined;
      if (totalCost && finalTotalAllocatedDays) {
        costPerHour = totalCost / (finalTotalAllocatedDays * 24);
      }

      let budgetedVesselCost: number | undefined;
      if (finalTotalAllocatedDays && vesselRateInfo.dailyRate) {
        budgetedVesselCost = finalTotalAllocatedDays * vesselRateInfo.dailyRate;
      }

      // Process rig location
      const locationInfo = processRigLocation(costAlloc);
      
      const processedRecord: CostAllocation = {
        lcNumber,
        locationReference: locationInfo.rigLocation,
        description: costAlloc.Description ? String(costAlloc.Description).trim() : undefined,
        costElement: costAlloc["Cost Element"] ? String(costAlloc["Cost Element"]).trim() : undefined,
        projectType: costAlloc["Project Type"] as any,
        monthYear,
        month,
        year,
        costAllocationDate,
        totalAllocatedDays: finalTotalAllocatedDays,
        averageVesselCostPerDay: costAlloc["Average Vessel Cost Per Day"],
        totalCost,
        costPerHour,
        budgetedVesselCost,
        vesselDailyRateUsed: vesselRateInfo.dailyRate,
        vesselRateDescription: vesselRateInfo.description,
        rigLocation: locationInfo.rigLocation,
        rigType: costAlloc["Rig Type"] ? String(costAlloc["Rig Type"]).trim() : undefined,
        waterDepth: costAlloc["Water Depth"],
        mission: costAlloc.Mission ? String(costAlloc.Mission).trim() : undefined,
        department: locationInfo.department,
        isActive: true,
        isDrilling: locationInfo.isDrilling,
        isThunderHorse: locationInfo.isThunderHorse,
        isMadDog: locationInfo.isMadDog
      };

      processed.push(processedRecord);
    } catch (error) {
      console.error(`❌ Error processing record ${index + 1}:`, error);
      skippedRecords.push({ index: index + 1, record: costAlloc, error });
    }
  });

  console.log(`✅ DEBUG PROCESSOR: Successfully processed ${processed.length} records`);
  console.log(`❌ DEBUG PROCESSOR: Skipped ${skippedRecords.length} records`);
  
  if (skippedRecords.length > 0) {
    console.log('📋 Skipped records:', skippedRecords.slice(0, 5));
  }

  return processed;
};

// Reuse the same processRigLocation function
const processRigLocation = (costAlloc: RawCostAllocation): {
  rigLocation: string;
  isDrilling: boolean;
  isThunderHorse: boolean;
  isMadDog: boolean;
  department: 'Drilling' | 'Production' | 'Logistics' | undefined;
} => {
  const rigLocation = String(costAlloc["Rig Location"] || '').trim();
  const locationReference = String(costAlloc["Location Reference"] || '').trim();
  const rigReference = String(costAlloc["Rig Reference"] || '').trim();
  const description = String(costAlloc.Description || '').trim();
  
  const allLocationFields = [rigLocation, locationReference, rigReference, description]
    .filter(Boolean)
    .map(field => field.toLowerCase());
  
  const isThunderHorse = allLocationFields.some(field => 
    field.includes('thunder horse') || field.includes('thunderhorse') || field.includes('thr')
  );
  
  const isMadDog = allLocationFields.some(field => 
    field.includes('mad dog') || field.includes('maddog')
  );
  
  const isDrilling = allLocationFields.some(field => 
    field.includes('drilling') || field.includes('drill')
  );
  
  let department: 'Drilling' | 'Production' | 'Logistics' | undefined;
  
  if (isThunderHorse || isMadDog) {
    if (isDrilling) {
      department = 'Drilling';
    } else if (allLocationFields.some(field => field.includes('prod'))) {
      department = 'Production';
    } else {
      department = 'Logistics';
    }
  } else if (isDrilling) {
    department = 'Drilling';
  } else if (allLocationFields.some(field => field.includes('prod'))) {
    department = 'Production';
  }
  
  let finalRigLocation = rigLocation || locationReference || rigReference || 'Unknown';
  
  if (isThunderHorse) {
    finalRigLocation = isDrilling ? 'Thunder Horse Drilling' : 'Thunder Horse Prod';
  } else if (isMadDog) {
    finalRigLocation = isDrilling ? 'Mad Dog Drilling' : 'Mad Dog Prod';
  }
  
  return {
    rigLocation: finalRigLocation,
    isDrilling,
    isThunderHorse,
    isMadDog,
    department
  };
};