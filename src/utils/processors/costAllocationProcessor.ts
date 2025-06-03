// src/utils/processors/costAllocationProcessor.ts
import { CostAllocation } from '../../types';
import { parseCostAllocationMonthYear } from '../dateUtils';
import { getVesselDailyRate } from '../vesselCost';
import { extractRigLocationFromDescription } from '../departmentInference';

/**
 * Cost allocation data processor - Enhanced with flexible date handling
 * Includes comprehensive debugging and configurable date validation
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
  
  // Cost Information - multiple possible field names
  "Total Allocated Days"?: number;
  "Alloc (days)"?: number;
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
  
  // Allow for any other fields
  [key: string]: any;
}

/**
 * Date validation configuration
 */
interface DateValidationConfig {
  minYear?: number;
  maxYear?: number;
  warnOutsideRange?: boolean;
  skipOutsideRange?: boolean;
  expectedRangeStart?: Date;
  expectedRangeEnd?: Date;
}

// Default configuration - can be overridden
const DEFAULT_DATE_VALIDATION: DateValidationConfig = {
  minYear: 2000,
  maxYear: 2030,
  warnOutsideRange: true,
  skipOutsideRange: false
};

/**
 * Process cost allocation raw data
 */
export const processCostAllocation = (
  rawCostAllocation: RawCostAllocation[],
  dateValidation: DateValidationConfig = DEFAULT_DATE_VALIDATION
): CostAllocation[] => {
  console.log('\n========== COST ALLOCATION PROCESSING START ==========');
  console.log(`📊 Total input records: ${rawCostAllocation.length}`);
  console.log(`📅 Date validation config:`, dateValidation);
  console.log(`📋 Expected date format: Mon-YY (e.g., "Jan-24", "Feb-24")`);
  console.log(`📋 Processing with date range: ${dateValidation.minYear || 'any'} - ${dateValidation.maxYear || 'any'}`);
  
  if (!rawCostAllocation || rawCostAllocation.length === 0) {
    console.error('❌ CRITICAL: No cost allocation data provided');
    return [];
  }

  // Analyze the data structure
  console.log('\n📋 DATA STRUCTURE ANALYSIS:');
  if (rawCostAllocation[0]) {
    const firstRecord = rawCostAllocation[0];
    console.log('Column names found:', Object.keys(firstRecord));
    
    // Check for date-related fields
    console.log('\n🔍 Searching for date fields:');
    const dateFields: string[] = [];
    Object.keys(firstRecord).forEach(key => {
      if (key.toLowerCase().includes('month') || 
          key.toLowerCase().includes('date') || 
          key.toLowerCase().includes('period') ||
          key.toLowerCase().includes('year')) {
        dateFields.push(key);
        console.log(`  Found: "${key}" = ${firstRecord[key]}`);
      }
    });
    
    if (dateFields.length === 0) {
      console.warn('⚠️ No obvious date fields found!');
    }
  }

  // Analyze raw date values
  console.log('\n📊 RAW DATE VALUES FROM EXCEL:');
  const first20Dates = rawCostAllocation.slice(0, 20).map((record, idx) => {
    const monthYear = record["Month-Year"];
    return {
      row: idx + 1,
      rawValue: monthYear,
      type: typeof monthYear,
      stringified: JSON.stringify(monthYear),
      toString: String(monthYear),
      isDate: monthYear instanceof Date,
      isNumber: typeof monthYear === 'number',
      isEmpty: !monthYear
    };
  });
  console.table(first20Dates);

  const processed: CostAllocation[] = [];
  const processingResults: any[] = [];
  const dataQualityIssues: any[] = [];

  // Process each record
  rawCostAllocation.forEach((costAlloc, index) => {
    const result: any = {
      row: index + 1,
      lcNumber: costAlloc["LC Number"],
      status: 'processing'
    };

    try {
      // Extract LC Number
      let lcNumber = String(costAlloc["LC Number"] || '').trim();
      if (!lcNumber) {
        // Check if record has any meaningful data
        const hasData = costAlloc["Total Cost"] || 
                       costAlloc["Alloc (days)"] || 
                       costAlloc["Rig Reference"] ||
                       costAlloc.Description;
        
        if (!hasData) {
          result.status = 'skipped';
          result.reason = 'No meaningful data';
          processingResults.push(result);
          return;
        }
        
        lcNumber = `UNKNOWN_${index + 1}`;
        result.lcNumberGenerated = true;
      }

      // Parse allocated days
      const allocatedDaysRaw = 
        costAlloc["Alloc (days)"] || 
        costAlloc["Total Allocated Days"] || 
        costAlloc["Allocated Days"] || 
        costAlloc["Days"];
      
      const totalAllocatedDays = allocatedDaysRaw !== undefined ? Number(allocatedDaysRaw) : undefined;
      
      if (totalAllocatedDays !== undefined && isNaN(totalAllocatedDays)) {
        console.warn(`⚠️ Row ${index + 1}: Invalid allocated days value: "${allocatedDaysRaw}"`);
      }

      // ENHANCED DATE PARSING
      let month: number | undefined;
      let year: number | undefined;
      let monthYear: string = "";
      let costAllocationDate: Date | undefined;
      
      // Get the Month-Year value
      const monthYearValue = costAlloc["Month-Year"];
      
      if (index < 10) {
        console.log(`\n🔍 Row ${index + 1} - Processing Month-Year:`);
        console.log(`  Raw value: "${monthYearValue}"`);
        console.log(`  Type: ${typeof monthYearValue}`);
        console.log(`  Expected format: Mon-YY (e.g., "Jan-24")`);
      }
      
      if (monthYearValue !== null && monthYearValue !== undefined && monthYearValue !== '') {
        try {
          const parsed = parseCostAllocationMonthYear(monthYearValue);
          year = parsed.year;
          month = parsed.month;
          monthYear = parsed.monthYear;
          costAllocationDate = parsed.costAllocationDate;
          
          if (index < 10) {
            console.log(`  ✅ Successfully parsed: ${monthYear} (${month}/${year})`);
          }
          
          result.dateParsed = true;
          result.parsedDate = { year, month, monthYear };
          
          // Apply date validation if configured
          if (year && month && dateValidation) {
            // Check minimum year
            if (dateValidation.minYear && year < dateValidation.minYear) {
              const message = `Date ${monthYear} (${month}/${year}) is before minimum year ${dateValidation.minYear}`;
              
              if (dateValidation.skipOutsideRange) {
                console.warn(`⚠️ Row ${index + 1}: ${message} - Skipping record`);
                result.status = 'skipped';
                result.reason = `Year ${year} before ${dateValidation.minYear}`;
                processingResults.push(result);
                return;
              } else if (dateValidation.warnOutsideRange) {
                console.warn(`⚠️ Row ${index + 1}: ${message}`);
                dataQualityIssues.push({
                  row: index + 1,
                  field: 'Month-Year',
                  value: monthYearValue,
                  issue: message
                });
              }
            }
            
            // Check maximum year
            if (dateValidation.maxYear && year > dateValidation.maxYear) {
              const message = `Date ${monthYear} (${month}/${year}) is after maximum year ${dateValidation.maxYear}`;
              
              if (dateValidation.skipOutsideRange) {
                console.warn(`⚠️ Row ${index + 1}: ${message} - Skipping record`);
                result.status = 'skipped';
                result.reason = `Year ${year} after ${dateValidation.maxYear}`;
                processingResults.push(result);
                return;
              } else if (dateValidation.warnOutsideRange) {
                console.warn(`⚠️ Row ${index + 1}: ${message}`);
                dataQualityIssues.push({
                  row: index + 1,
                  field: 'Month-Year',
                  value: monthYearValue,
                  issue: message
                });
              }
            }
            
            // Check against expected date range if provided
            if (dateValidation.expectedRangeStart && costAllocationDate && costAllocationDate < dateValidation.expectedRangeStart) {
              console.warn(`⚠️ Row ${index + 1}: Date ${monthYear} is before expected start date`);
            }
            
            if (dateValidation.expectedRangeEnd && costAllocationDate && costAllocationDate > dateValidation.expectedRangeEnd) {
              console.warn(`⚠️ Row ${index + 1}: Date ${monthYear} is after expected end date`);
            }
          }
          
        } catch (error: any) {
          console.error(`❌ Row ${index + 1}: Failed to parse date "${monthYearValue}":`, error.message);
          
          // Try alternative parsing methods before giving up
          try {
            // If it looks like "01-24" as a string but parsing failed, try manual parsing
            if (typeof monthYearValue === 'string' && monthYearValue.includes('-')) {
              const parts = monthYearValue.split('-');
              if (parts.length === 2) {
                month = parseInt(parts[0], 10);
                year = 2000 + parseInt(parts[1], 10);
                monthYear = `${String(month).padStart(2, '0')}-${parts[1]}`;
                costAllocationDate = new Date(year, month - 1, 15);
                
                console.log(`  ✅ Manual parse successful: ${monthYear}`);
                result.dateParsed = true;
                result.parsedDate = { year, month, monthYear };
              }
            }
          } catch (fallbackError: any) {
            console.error(`  ❌ Fallback parsing also failed:`, fallbackError.message);
          }
          
          if (!month || !year) {
            result.dateParseError = error.message;
            dataQualityIssues.push({
              row: index + 1,
              field: 'Month-Year',
              value: monthYearValue,
              issue: `Date parsing failed: ${error.message}`
            });
          }
        }
      } else {
        console.warn(`⚠️ Row ${index + 1}: No Month-Year value found`);
        result.noDateFound = true;
        
        dataQualityIssues.push({
          row: index + 1,
          field: 'Month-Year',
          value: 'EMPTY',
          issue: 'No date value found'
        });
      }

      // Only use defaults if we have other meaningful data but couldn't parse the date
      if ((!year || !month) && lcNumber && lcNumber !== `UNKNOWN_${index + 1}`) {
        const hasOtherData = costAlloc["Alloc (days)"] || costAlloc["Total Cost"];
        
        if (hasOtherData) {
          console.warn(`⚠️ Row ${index + 1}: Using default date (Jan 2024) for LC: ${lcNumber}`);
          month = 1;
          year = 2024;
          monthYear = "01-24";
          costAllocationDate = new Date(2024, 0, 15);
          
          dataQualityIssues.push({
            row: index + 1,
            field: 'Month-Year',
            value: monthYearValue || 'EMPTY',
            issue: 'Could not parse date - using default Jan 2024'
          });
        } else {
          // Skip this record if no date and no meaningful data
          result.status = 'skipped';
          result.reason = 'No date and no meaningful data';
          processingResults.push(result);
          return;
        }
      }
      
      // If we still don't have a valid date, skip this record
      if (!year || !month || !costAllocationDate) {
        result.status = 'skipped';
        result.reason = 'Invalid or missing date';
        processingResults.push(result);
        return;
      }

      // Get vessel rate
      const vesselRateInfo = getVesselDailyRate(costAllocationDate);

      // Parse costs
      const totalCost = costAlloc["Total Cost"] || costAlloc["Amount"];
      
      let costPerHour: number | undefined;
      if (totalCost && totalAllocatedDays) {
        costPerHour = totalCost / (totalAllocatedDays * 24);
      }

      // Calculate budgeted vessel cost
      let budgetedVesselCost: number | undefined;
      if (totalAllocatedDays && vesselRateInfo.dailyRate) {
        budgetedVesselCost = totalAllocatedDays * vesselRateInfo.dailyRate;
      }

      // Process location info
      const locationInfo = processRigLocation(costAlloc);

      // Create the processed record
      const processedRecord: CostAllocation = {
        // Core Fields
        lcNumber,
        locationReference: locationInfo.rigLocation,
        description: costAlloc.Description?.trim(),
        costElement: costAlloc["Cost Element"]?.trim(),
        
        // Project Information
        projectType: normalizeProjectType(costAlloc["Project Type"]),
        
        // Time Information
        monthYear,
        month,
        year,
        costAllocationDate,
        
        // Cost Information
        totalAllocatedDays,
        averageVesselCostPerDay: costAlloc["Average Vessel Cost Per Day"],
        totalCost,
        costPerHour,
        
        // Budgeted Vessel Cost Information
        budgetedVesselCost,
        vesselDailyRateUsed: vesselRateInfo.dailyRate,
        vesselRateDescription: vesselRateInfo.description,
        
        // Location Information
        rigLocation: locationInfo.rigLocation,
        rigType: costAlloc["Rig Type"]?.trim(),
        waterDepth: costAlloc["Water Depth"],
        
        // Additional fields
        mission: costAlloc.Mission?.trim(),
        department: locationInfo.department,
        isActive: true,
        
        // Enhanced location flags
        isDrilling: locationInfo.isDrilling,
        isThunderHorse: locationInfo.isThunderHorse,
        isMadDog: locationInfo.isMadDog
      };

      processed.push(processedRecord);
      result.status = 'success';
      result.output = {
        lcNumber: processedRecord.lcNumber,
        monthYear: processedRecord.monthYear,
        department: processedRecord.department
      };

    } catch (error: any) {
      console.error(`❌ Row ${index + 1}: Processing error:`, error);
      result.status = 'error';
      result.error = error.message;
      
      dataQualityIssues.push({
        row: index + 1,
        field: 'General',
        value: 'N/A',
        issue: `Processing error: ${error.message}`
      });
    }

    processingResults.push(result);
  });

  // Summary Report
  console.log('\n========== PROCESSING SUMMARY ==========');
  console.log(`✅ Successfully processed: ${processed.length} records`);
  console.log(`❌ Failed/Skipped: ${rawCostAllocation.length - processed.length} records`);
  
  // Date analysis
  const dateDistribution = processed.reduce((acc, r) => {
    const key = r.monthYear || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📅 DATE DISTRIBUTION:');
  const sortedDates = Object.entries(dateDistribution)
    .sort(([a], [b]) => {
      // Sort by year then month
      const [aMonth, aYear] = a.split('-').map(n => parseInt(n) || 0);
      const [bMonth, bYear] = b.split('-').map(n => parseInt(n) || 0);
      const aFullYear = aYear < 30 ? 2000 + aYear : 1900 + aYear;
      const bFullYear = bYear < 30 ? 2000 + bYear : 1900 + bYear;
      return aFullYear - bFullYear || aMonth - bMonth;
    });
  
  sortedDates.forEach(([monthYear, count]) => {
    console.log(`  ${monthYear}: ${count} records`);
  });
  
  // Year distribution
  const yearDistribution = processed.reduce((acc, r) => {
    const key = r.year || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string | number, number>);
  
  console.log('\n📊 YEAR DISTRIBUTION:');
  console.table(yearDistribution);
  
  // Department distribution
  const deptDistribution = processed.reduce((acc, r) => {
    const key = r.department || 'Unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n🏢 DEPARTMENT DISTRIBUTION:');
  console.table(deptDistribution);
  
  // Data quality report
  if (dataQualityIssues.length > 0) {
    console.log('\n⚠️ DATA QUALITY ISSUES:');
    console.log(`Total issues: ${dataQualityIssues.length}`);
    
    // Group issues by type
    const issueTypes = dataQualityIssues.reduce((acc, issue) => {
      const type = issue.field;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nIssues by type:');
    console.table(issueTypes);
    
    console.log('\nFirst 10 issues:');
    dataQualityIssues.slice(0, 10).forEach(issue => {
      console.log(`  Row ${issue.row}: ${issue.field} = "${issue.value}" - ${issue.issue}`);
    });
  }
  
  // Processing statistics
  const successCount = processingResults.filter(r => r.status === 'success').length;
  const skippedCount = processingResults.filter(r => r.status === 'skipped').length;
  const errorCount = processingResults.filter(r => r.status === 'error').length;
  
  console.log('\n📊 PROCESSING STATISTICS:');
  console.log(`  Success: ${successCount} (${(successCount / rawCostAllocation.length * 100).toFixed(1)}%)`);
  console.log(`  Skipped: ${skippedCount} (${(skippedCount / rawCostAllocation.length * 100).toFixed(1)}%)`);
  console.log(`  Errors: ${errorCount} (${(errorCount / rawCostAllocation.length * 100).toFixed(1)}%)`);
  
  // Final validation
  if (processed.length === 0) {
    console.error('\n❌ CRITICAL: No records were successfully processed!');
    console.error('Possible causes:');
    console.error('1. Column headers don\'t match expected names');
    console.error('2. Date format is not recognized');
    console.error('3. Required fields are missing');
    console.error('4. Excel file structure is different than expected');
    console.error('5. Date validation settings are too restrictive');
  } else {
    console.log('\n✅ Sample of processed records:');
    processed.slice(0, 5).forEach((record, idx) => {
      console.log(`Record ${idx + 1}:`, {
        lcNumber: record.lcNumber,
        monthYear: record.monthYear,
        year: record.year,
        month: record.month,
        department: record.department,
        totalAllocatedDays: record.totalAllocatedDays
      });
    });
  }
  
  console.log('\n========== COST ALLOCATION PROCESSING END ==========\n');
  
  return processed;
};

/**
 * Normalize project type to valid enum values
 */
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

/**
 * Process rig location information
 */
const processRigLocation = (costAlloc: RawCostAllocation): {
  rigLocation: string;
  isDrilling: boolean;
  isThunderHorse: boolean;
  isMadDog: boolean;
  department: 'Drilling' | 'Production' | 'Logistics' | undefined;
} => {
  // Get all possible location fields
  const rigLocation = String(costAlloc["Rig Location"] || '').trim();
  const locationReference = String(costAlloc["Location Reference"] || '').trim();
  const rigReference = String(costAlloc["Rig Reference"] || '').trim();
  const description = String(costAlloc.Description || '').trim();
  
  // Combine all location fields for analysis
  const allLocationText = `${rigLocation} ${locationReference} ${rigReference} ${description}`.toLowerCase();
  
  // Check for specific locations
  const isThunderHorse = allLocationText.includes('thunder horse') || 
                        allLocationText.includes('thunderhorse') ||
                        allLocationText.includes('thr');
  
  const isMadDog = allLocationText.includes('mad dog') || 
                   allLocationText.includes('maddog');
  
  // Check for drilling activity
  const isDrilling = allLocationText.includes('drilling') || 
                    allLocationText.includes('drill');
  
  // Determine department
  let department: 'Drilling' | 'Production' | 'Logistics' | undefined;
  
  if (isDrilling) {
    department = 'Drilling';
  } else if (allLocationText.includes('prod')) {
    department = 'Production';
  } else if (allLocationText.includes('logistics') || allLocationText.includes('fourchon')) {
    department = 'Logistics';
  } else if (isThunderHorse || isMadDog) {
    // Default integrated facilities to Production if not drilling
    department = 'Production';
  }
  
  // Determine final rig location
  let finalRigLocation = rigLocation || rigReference || locationReference || '';
  
  if (isThunderHorse) {
    // Better logic for Thunder Horse location determination
    if (isDrilling || allLocationText.includes('drilling') || description.toLowerCase().includes('drill')) {
      finalRigLocation = 'Thunder Horse Drilling';
    } else if (allLocationText.includes('prod')) {
      finalRigLocation = 'Thunder Horse Prod';
    } else {
      // Default Thunder Horse to drilling if we can't determine
      finalRigLocation = 'Thunder Horse Drilling';
    }
  } else if (isMadDog) {
    // Better logic for Mad Dog location determination
    if (isDrilling || allLocationText.includes('drilling') || description.toLowerCase().includes('drill')) {
      finalRigLocation = 'Mad Dog Drilling';
    } else if (allLocationText.includes('prod')) {
      finalRigLocation = 'Mad Dog Prod';
    } else {
      // Default Mad Dog to drilling if we can't determine
      finalRigLocation = 'Mad Dog Drilling';
    }
  } else if (!finalRigLocation && description) {
    // Try to extract location from description if no explicit location provided
    const extractedLocation = extractRigLocationFromDescription(description);
    if (extractedLocation) {
      finalRigLocation = extractedLocation;
    }
  }
  
  return {
    rigLocation: finalRigLocation || 'Unknown',
    isDrilling,
    isThunderHorse,
    isMadDog,
    department
  };
};