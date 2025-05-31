import { CostAllocation } from '../../types';
import { parseCostAllocationMonthYear } from '../dateUtils';
import { getVesselDailyRate } from '../vesselCost';
import { inferDepartmentFromLCNumber, inferDepartmentFromDescription, extractRigLocationFromDescription } from '../departmentInference';

/**
 * Cost allocation data processor
 * Extracted from dataProcessing.ts to improve modularity
 */

// Raw cost allocation interface
interface RawCostAllocation {
  "LC Number": string;
  "Location Reference"?: string;  // Legacy field name
  "Rig Reference"?: string;       // UPDATED: Actual Excel header
  Description?: string;
  "Cost Element"?: string;
  "Month-Year"?: string | number | Date;  // UPDATED: Support multiple date formats
  Mission?: string;
  "Project Type"?: string;
  
  // Cost Information - multiple possible field names
  "Total Allocated Days"?: number;  // Legacy field name
  "Alloc (days)"?: number;          // UPDATED: Actual Excel header
  "Allocated Days"?: number;
  "Days"?: number;
  "Average Vessel Cost Per Day"?: number;
  "Total Cost"?: number;
  "Amount"?: number;
  "Cost Per Hour"?: number;
  
  // Rig Location Information
  "Rig Location"?: string;
  "Rig Type"?: string;
  "Water Depth"?: number;
}

/**
 * Process cost allocation raw data
 */
export const processCostAllocation = (rawCostAllocation: RawCostAllocation[]): CostAllocation[] => {
  console.log(`🔍 Processing ${rawCostAllocation.length} raw cost allocation records...`);
  console.log(`📅 CONFIRMED DATA RANGE: January 1, 2024 to April 30, 2025`);
  console.log(`📋 Expected MM-YY formats: 01-24 through 04-25 (Jan 2024 through Apr 2025)`);
  
  if (!rawCostAllocation || rawCostAllocation.length === 0) {
    console.warn('⚠️ No cost allocation data provided');
    return [];
  }

  // Debug: Log the raw data structure and look for date fields
  console.log('📋 Raw cost allocation sample:', rawCostAllocation.slice(0, 3));
  console.log('📋 Raw cost allocation keys:', Object.keys(rawCostAllocation[0] || {}));
  
  // Enhanced debugging for all field types
  if (rawCostAllocation.length > 0) {
    const sample = rawCostAllocation[0];
    console.log('📊 DETAILED FIELD ANALYSIS:');
    Object.keys(sample).forEach(field => {
      const value = sample[field as keyof typeof sample];
      console.log(`  "${field}":`, {
        value,
        type: typeof value,
        isEmpty: value === '' || value === null || value === undefined,
        isDate: Object.prototype.toString.call(value) === '[object Date]'
      });
    });
    
    // Check for potential alternative column names
    const fieldVariations = [
      { expected: 'LC Number', alternatives: ['LC_Number', 'LCNumber', 'LC', 'Cost_Code', 'Project_Code'] },
      { expected: 'Month-Year', alternatives: ['Month_Year', 'MonthYear', 'Date', 'Period', 'Month/Year'] },
      { expected: 'Alloc (days)', alternatives: ['Total Allocated Days', 'Allocated_Days', 'Days', 'Allocated Days', 'Total Days'] },
      { expected: 'Total Cost', alternatives: ['Cost', 'Amount', 'Total_Cost', 'Budgeted_Cost'] },
      { expected: 'Rig Reference', alternatives: ['Location Reference', 'Rig_Location', 'Location', 'Facility', 'Platform'] }
    ];
    
    console.log('🔍 FIELD MATCHING ANALYSIS:');
    fieldVariations.forEach(({ expected, alternatives }) => {
      const exactMatch = sample.hasOwnProperty(expected);
      const alternativeMatches = alternatives.filter(alt => sample.hasOwnProperty(alt));
      console.log(`  ${expected}: exact=${exactMatch}, alternatives=[${alternativeMatches.join(', ')}]`);
    });
  }

  const processed: CostAllocation[] = [];

  rawCostAllocation.forEach((costAlloc, index) => {
    try {
      // Debug the parsing for first few records
      if (index < 5) {
        console.log(`🔍 Processing record ${index + 1}:`, costAlloc);
      }

      let lcNumber = String(costAlloc["LC Number"] || '').trim();
      
      // Parse allocated days - check multiple possible field names and ENSURE NUMERIC CONVERSION
      const allocatedDaysRaw = 
        costAlloc["Alloc (days)"] ||           // UPDATED: Actual Excel header
        costAlloc["Total Allocated Days"] ||   // Legacy/backup
        costAlloc["Allocated Days"] ||
        costAlloc["Days"] ||
        undefined;
      
      // CRITICAL FIX: Ensure allocated days is always a number, never a string
      const totalAllocatedDays = allocatedDaysRaw !== undefined ? Number(allocatedDaysRaw) : undefined;
      
      // Validate that we got a valid number
      if (totalAllocatedDays !== undefined && (isNaN(totalAllocatedDays) || totalAllocatedDays < 0)) {
        console.warn(`⚠️ Invalid allocated days value for LC ${lcNumber}: "${allocatedDaysRaw}" (type: ${typeof allocatedDaysRaw}). Setting to undefined.`);
      } else if (index < 5 && totalAllocatedDays !== undefined) {
        console.log(`✅ Allocated days for LC ${lcNumber}: ${totalAllocatedDays} (original: "${allocatedDaysRaw}", type: ${typeof allocatedDaysRaw})`);
      }
      
      const finalTotalAllocatedDays = totalAllocatedDays !== undefined && !isNaN(totalAllocatedDays) && totalAllocatedDays >= 0 ? totalAllocatedDays : undefined;
      
      // RELAXED VALIDATION: Don't skip records just because LC Number is empty
      // Many cost allocation records might have meaningful data without LC numbers
      if (!lcNumber) {
        // Check if the record has any meaningful cost/allocation data
        const hasAllocatedDays = finalTotalAllocatedDays && finalTotalAllocatedDays > 0;
        const hasCostData = costAlloc["Total Cost"] || costAlloc["Amount"] || costAlloc["Average Vessel Cost Per Day"];
        const hasLocationData = costAlloc["Rig Reference"] || costAlloc["Location Reference"] || costAlloc["Rig Location"] || costAlloc.Description;
        
        if (!hasAllocatedDays && !hasCostData && !hasLocationData) {
          console.warn(`⚠️ Skipping record ${index + 1}: no meaningful data (no LC Number, allocated days, costs, or location data)`);
          return;
        } else {
          // Assign a default LC Number for tracking
          lcNumber = `UNKNOWN_${index + 1}`;
          console.log(`📝 Processing record ${index + 1} with generated LC Number "${lcNumber}" (original had no LC Number but contains meaningful data)`);
        }
      }

      // Parse Month-Year with specialized MM-YY format handling
      let month: number | undefined;
      let year: number | undefined;
      let monthYear: string | undefined;
      let costAllocationDate: Date | undefined;

      if (costAlloc["Month-Year"]) {
        try {
          // Handle Excel Date objects first
          const monthYearValue = costAlloc["Month-Year"];
          if (monthYearValue && Object.prototype.toString.call(monthYearValue) === '[object Date]') {
            const dateObj = monthYearValue as unknown as Date;
            year = dateObj.getFullYear();
            month = dateObj.getMonth() + 1;
            monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
            costAllocationDate = new Date(year, month - 1, 15);
            
            if (index < 5) {
              console.log(`📅 Excel Date parsed: ${dateObj.toISOString()} -> ${monthYear} (Year: ${year}, Month: ${month})`);
            }
          }
          // Handle string MM-YY format (primary format)
          else if (typeof monthYearValue === 'string') {
            const parsed = parseCostAllocationMonthYear(monthYearValue);
            year = parsed.year;
            month = parsed.month;
            monthYear = parsed.monthYear;
            costAllocationDate = parsed.costAllocationDate;
            
            if (index < 5) {
              console.log(`📅 MM-YY format parsed: "${monthYearValue}" -> Year: ${year}, Month: ${month}, Date: ${costAllocationDate.toISOString()}`);
            }
          }
          else {
            throw new Error(`Unsupported Month-Year type: ${typeof monthYearValue}`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Failed to parse Month-Year "${costAlloc["Month-Year"]}" for LC ${lcNumber}:`, error);
          // Use fallback values
          year = 2024;
          month = 1;
          monthYear = "01-24";
          costAllocationDate = new Date(2024, 0, 15);
        }
      } else {
        // No Month-Year provided - use default
        console.warn(`⚠️ No Month-Year provided for LC ${lcNumber}, using default Jan 2024`);
        year = 2024;
        month = 1;
        monthYear = "01-24";
        costAllocationDate = new Date(2024, 0, 15);
      }

      // Get the vessel daily rate for the cost allocation date
      const vesselRateInfo = costAllocationDate ? getVesselDailyRate(costAllocationDate) : { dailyRate: 33000, description: 'Default rate' };

      // Parse total cost
      const totalCost = 
        costAlloc["Total Cost"] ||
        costAlloc["Amount"] ||
        undefined;

      // Calculate cost per hour if we have both total cost and allocated days
      let costPerHour: number | undefined;
      if (totalCost && finalTotalAllocatedDays) {
        const totalHours = finalTotalAllocatedDays * 24; // Convert days to hours
        costPerHour = totalCost / totalHours;
      } else if (costAlloc["Cost Per Hour"]) {
        costPerHour = costAlloc["Cost Per Hour"];
      }

      // Calculate budgeted vessel cost
      let budgetedVesselCost: number | undefined;
      if (finalTotalAllocatedDays && vesselRateInfo.dailyRate) {
        budgetedVesselCost = finalTotalAllocatedDays * vesselRateInfo.dailyRate;
      }

      // Validate and normalize Project Type
      const normalizeProjectType = (projectType: string | undefined): 'Drilling' | 'Completions' | 'Production' | 'Maintenance' | 'Operator Sharing' | undefined => {
        if (!projectType) return undefined;
        
        const normalized = projectType.trim();
        const validTypes: ('Drilling' | 'Completions' | 'Production' | 'Maintenance' | 'Operator Sharing')[] = 
          ['Drilling', 'Completions', 'Production', 'Maintenance', 'Operator Sharing'];
        
        // Direct match
        if (validTypes.includes(normalized as any)) {
          return normalized as any;
        }
        
        // Case-insensitive match
        const lowerNormalized = normalized.toLowerCase();
        for (const type of validTypes) {
          if (type.toLowerCase() === lowerNormalized) {
            return type;
          }
        }
        
        return undefined;
      };

      // Enhanced Rig Location Information - Use Rig Reference as primary source
      let enhancedLocationReference = String(costAlloc["Rig Reference"] || costAlloc["Location Reference"] || '').trim();
      let rigLocation = costAlloc["Rig Location"] ? String(costAlloc["Rig Location"]).trim() : enhancedLocationReference;
      
      // CRITICAL FIX: Extract rig location from description when location fields are empty
      if ((!rigLocation || rigLocation === '') && costAlloc.Description) {
        const description = String(costAlloc.Description);
        const extractedLocation = extractRigLocationFromDescription(description);
        if (extractedLocation) {
          rigLocation = extractedLocation;
          if (index < 5) {
            console.log(`🗺️ Extracted rig location "${rigLocation}" from description: "${description}"`);
          }
        }
      }
      
      // If still no rig location, ensure we have at least one field populated
      if (!rigLocation && enhancedLocationReference) {
        rigLocation = enhancedLocationReference;
      }

      const processedRecord: CostAllocation = {
        // Core Fields
        lcNumber,
        locationReference: enhancedLocationReference,
        description: costAlloc.Description ? String(costAlloc.Description).trim() : undefined,
        costElement: costAlloc["Cost Element"] ? String(costAlloc["Cost Element"]).trim() : undefined,
        
        // Project Information
        projectType: normalizeProjectType(costAlloc["Project Type"]),
        
        // Time Information
        monthYear,
        month,
        year,
        costAllocationDate,
        
        // Cost Information  
        totalAllocatedDays: finalTotalAllocatedDays,
        averageVesselCostPerDay: costAlloc["Average Vessel Cost Per Day"],
        totalCost,
        costPerHour,
        
        // NEW: Budgeted Vessel Cost Information
        budgetedVesselCost,
        vesselDailyRateUsed: vesselRateInfo.dailyRate,
        vesselRateDescription: vesselRateInfo.description,
        
        // Enhanced Rig Location Information
        rigLocation,
        rigType: costAlloc["Rig Type"] ? String(costAlloc["Rig Type"]).trim() : undefined,
        waterDepth: costAlloc["Water Depth"],
        
        // Additional fields
        mission: costAlloc.Mission ? String(costAlloc.Mission).trim() : undefined,
        department: inferDepartmentFromLCNumber(lcNumber) || inferDepartmentFromDescription(costAlloc.Description),
        isActive: true
      };

      // Debug log for first few processed records
      if (index < 5) {
        console.log(`✅ Processed record ${index + 1}:`, {
          lcNumber: processedRecord.lcNumber,
          monthYear: processedRecord.monthYear,
          month: processedRecord.month,
          year: processedRecord.year,
          totalAllocatedDays: processedRecord.totalAllocatedDays,
          budgetedVesselCost: processedRecord.budgetedVesselCost,
          vesselDailyRateUsed: processedRecord.vesselDailyRateUsed,
          totalCost: processedRecord.totalCost
        });
      }

      processed.push(processedRecord);
    } catch (error) {
      console.error(`❌ Error processing cost allocation record ${index + 1}:`, error, costAlloc);
    }
  });

  console.log(`✅ Successfully processed ${processed.length} cost allocation records from ${rawCostAllocation.length} raw records`);
  
  // Summary statistics
  const recordsWithBudgetedCost = processed.filter(r => r.budgetedVesselCost && r.budgetedVesselCost > 0).length;
  const recordsWithAllocatedDays = processed.filter(r => r.totalAllocatedDays && r.totalAllocatedDays > 0).length;
  const recordsWithActualCost = processed.filter(r => r.totalCost && r.totalCost > 0).length;
  
  // DATE RANGE ANALYSIS
  const datesWithValid = processed.filter(r => r.costAllocationDate).map(r => r.costAllocationDate!);
  const uniqueMonthYears = [...new Set(processed.map(r => r.monthYear).filter(Boolean))];
  const yearMonthCounts = processed.reduce((acc, r) => {
    if (r.year && r.month) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  if (datesWithValid.length > 0) {
    const sortedDates = datesWithValid.sort((a, b) => a.getTime() - b.getTime());
    const earliestDate = sortedDates[0];
    const latestDate = sortedDates[sortedDates.length - 1];
    
    console.log(`📅 COST ALLOCATION DATE RANGE ANALYSIS:`);
    console.log(`   📊 Records with valid dates: ${datesWithValid.length}/${processed.length}`);
    console.log(`   🗓️ Date range: ${earliestDate.toISOString().split('T')[0]} to ${latestDate.toISOString().split('T')[0]}`);
    console.log(`   📋 Unique Month-Year values: ${uniqueMonthYears.length} (${uniqueMonthYears.slice(0, 5).join(', ')}${uniqueMonthYears.length > 5 ? '...' : ''})`);
    console.log(`   📈 Records per month:`, Object.entries(yearMonthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 6)
      .map(([month, count]) => `${month}: ${count}`)
      .join(', '));
  } else {
    console.warn(`⚠️ No valid dates found in cost allocation data!`);
  }
  
  console.log(`📊 Cost Allocation Processing Summary:
    💰 Records with budgeted vessel costs: ${recordsWithBudgetedCost}/${processed.length}
    📅 Records with allocated days: ${recordsWithAllocatedDays}/${processed.length}  
    💲 Records with actual costs: ${recordsWithActualCost}/${processed.length}`);

  return processed;
}; 