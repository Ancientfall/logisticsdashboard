/**
 * Date parsing utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Parse date strings from different Excel sheet formats
 * - Voyage Events: 'From'/'To' in YYYY-MM-DD HH:MM format
 * - Voyage List: 'Start Date'/'End Date' in YYYY-MM-DD HH:MM format  
 * - Vessel Manifests: 'Manifest Date' in YYYY-MM-DD HH:MM format
 * - Cost Allocation: handled separately with MM-YY format
 * 
 * Data Range: January 1, 2023 to December 31, 2025
 */
export const parseDate = (dateStr: string | null | undefined): Date => {
  // Default to January 1, 2024 for missing dates (middle of data range)
  const defaultDate = new Date(2024, 0, 1);
  
  if (!dateStr) {
    console.warn(`⚠️ Empty date value provided, using default date: ${defaultDate.toISOString()}`);
    return defaultDate;
  }
  
  try {
    // Handle YYYY-MM-DD HH:MM format (standard for most sheets)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Validate the date is in expected range (Jan 1, 2023 - Dec 31, 2025)
      const minDate = new Date(2023, 0, 1);  // January 1, 2023
      const maxDate = new Date(2025, 11, 31); // December 31, 2025
      
      if (date >= minDate && date <= maxDate) {
        return date;
      } else {
        console.warn(`⚠️ Parsed date ${date.toISOString()} from "${dateStr}" is outside expected data range (Jan 1, 2023 - Dec 31, 2025). This may indicate a data quality issue.`);
        // Return the parsed date anyway but log the warning
        return date;
      }
    }
    
    console.warn(`⚠️ Could not parse date: "${dateStr}", using default date: ${defaultDate.toISOString()}`);
    return defaultDate;
  } catch (error) {
    console.warn(`⚠️ Error parsing date: ${dateStr}`, error);
    return defaultDate;
  }
};

/**
 * Enhanced Date Parser for Cost Allocation Month-Year column
 * Handles multiple formats including:
 * - M/D/YY format: "1/1/24" -> January 2024
 * - MM-YY format: "01-24" -> January 2024
 * - YYYY-MM-DD format: "2019-12-31" -> December 2019  
 * - YYYY-MM format: "2019-12" -> December 2019
 * - Excel serial dates: 44927 -> December 2022
 * - Excel Date objects from XLSX parsing
 */
export const parseCostAllocationMonthYear = (monthYearStr: string | number | Date): {
  year: number;
  month: number;
  monthYear: string;
  costAllocationDate: Date;
} => {
  console.log('🔍 DATE PARSING DEBUG - Input:', {
    value: monthYearStr,
    type: typeof monthYearStr,
    isDate: Object.prototype.toString.call(monthYearStr) === '[object Date]',
    stringValue: String(monthYearStr),
    isSmallNumber: typeof monthYearStr === 'number' && monthYearStr >= 19 && monthYearStr <= 25
  });
  
  if (monthYearStr === null || monthYearStr === undefined) {
    throw new Error(`Invalid Month-Year value: ${monthYearStr}`);
  }
  
  // Handle Excel Date objects first
  if (Object.prototype.toString.call(monthYearStr) === '[object Date]') {
    const date = monthYearStr as Date;
    console.log('📅 DATE OBJECT PARSING:', {
      dateString: date.toString(),
      isoString: date.toISOString(),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    });
    
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
      
      console.log('📅 DATE OBJECT RESULT:', { year, month, monthYear });
      
      return {
        year,
        month,
        monthYear,
        costAllocationDate: new Date(year, month - 1, 15)
      };
    }
  }
  
  // Handle Excel serial numbers (days since 1900-01-01)
  if (typeof monthYearStr === 'number') {
    console.log('📅 EXCEL SERIAL NUMBER DETECTED:', monthYearStr);
    
    // Excel serial date calculation (accounting for Excel's 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + monthYearStr * 24 * 60 * 60 * 1000);
    
    console.log('📅 EXCEL SERIAL CONVERSION:', {
      serialNumber: monthYearStr,
      convertedDate: date.toString(),
      isoString: date.toISOString(),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    });
    
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      // CRITICAL FIX: Check if this could be a misinterpreted year
      // Only interpret as years if they're in the expected range (23-25 for 2023-2025)
      if (monthYearStr >= 23 && monthYearStr <= 25) {
        console.warn(`⚠️ POSSIBLE YEAR MISINTERPRETATION: Number ${monthYearStr} might be year 20${monthYearStr}`);
        // Don't convert as serial, return as year
        const interpretedYear = 2000 + monthYearStr;
        console.log(`📅 Interpreting ${monthYearStr} as year ${interpretedYear}, defaulting to January`);
        return {
          year: interpretedYear,
          month: 1,
          monthYear: `01-${String(monthYearStr).padStart(2, '0')}`,
          costAllocationDate: new Date(interpretedYear, 0, 15)
        };
      }
      
      // For numbers 19-22, these are likely Excel serial numbers, not years
      // since the user's data is from 2023-2025
      if (monthYearStr >= 19 && monthYearStr <= 22) {
        console.warn(`⚠️ Ignoring number ${monthYearStr} - likely not a year (data range is 2023-2025)`);
        // Continue with Excel serial number conversion below
      }
      
      // Also check for 4-digit years that got stored as numbers
      if (monthYearStr >= 2019 && monthYearStr <= 2025) {
        console.warn(`⚠️ YEAR AS NUMBER: ${monthYearStr} detected, defaulting to January`);
        return {
          year: monthYearStr,
          month: 1,
          monthYear: `01-${String(monthYearStr).slice(-2)}`,
          costAllocationDate: new Date(monthYearStr, 0, 15)
        };
      }
      
      const monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
      
      // Validate the converted date is within our data range
      const minDate = new Date(2019, 0, 1);   // January 1, 2019 (expanded range)
      const maxDate = new Date(2025, 11, 31);  // December 31, 2025
      
      if (date < minDate || date > maxDate) {
        console.warn(`⚠️ Excel serial date ${monthYearStr} converts to ${date.toISOString()} which is outside data range (Jan 2019 - Dec 2025). This may indicate incorrect data.`);
      }
      
      console.log(`📅 Excel serial date converted: ${monthYearStr} -> ${date.toISOString()} -> ${monthYear}`);
      
      return {
        year,
        month,
        monthYear,
        costAllocationDate: new Date(year, month - 1, 15)
      };
    }
  }
  
  // Handle string formats
  if (typeof monthYearStr === 'string') {
    const trimmed = monthYearStr.trim();
    
    // Handle M/D/YYYY format (e.g., 1/1/2024, 12/31/2024)
    const mdyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyyyyMatch) {
      const [, month, day, year] = mdyyyyMatch;
      console.log('📅 M/D/YYYY MATCH:', { month, day, year });
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (!isNaN(parsedDate.getTime())) {
        const parsedYear = parsedDate.getFullYear();
        const parsedMonth = parsedDate.getMonth() + 1;
        const monthYear = `${String(parsedMonth).padStart(2, '0')}-${String(parsedYear).slice(-2)}`;
        
        console.log('📅 M/D/YYYY RESULT:', { parsedYear, parsedMonth, monthYear });
        
        return {
          year: parsedYear,
          month: parsedMonth,
          monthYear,
          costAllocationDate: new Date(parsedYear, parsedMonth - 1, 15)
        };
      }
    }
    
    // Handle M/D/YY format (e.g., 1/1/24, 12/31/24)
    const mdyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (mdyyMatch) {
      const [, month, day, yearShort] = mdyyMatch;
      console.log('📅 M/D/YY MATCH:', { month, day, yearShort });
      
      // Handle 2-digit years: 19-25 for 2019-2025
      const yearNum = parseInt(yearShort);
      // Expanded range to handle 2019-2025
      const fullYear = 2000 + yearNum;
      console.log('📅 M/D/YY YEAR CONVERSION:', { yearShort, yearNum, fullYear });
      
      const parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;
        const monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
        
        console.log('📅 M/D/YY RESULT:', { year, month, monthYear });
        
        return {
          year,
          month,
          monthYear,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Handle full date formats (YYYY-MM-DD, YYYY-MM-DD HH:MM, etc.)
    if (trimmed.includes('-') && trimmed.length > 7) {
      // Try parsing as ISO date first
      let parsedDate = new Date(trimmed);
      
      // If that fails, try other common formats
      if (isNaN(parsedDate.getTime())) {
        // Try MM/DD/YYYY format
        const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyyMatch) {
          const [, month, day, year] = mmddyyyyMatch;
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // Try DD/MM/YYYY format
        if (isNaN(parsedDate.getTime())) {
          const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmmyyyyMatch) {
            const [, day, month, year] = ddmmyyyyMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
        
        // Try YYYY-MM format
        if (isNaN(parsedDate.getTime())) {
          const yyyymmMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
          if (yyyymmMatch) {
            const [, year, month] = yyyymmMatch;
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, 15);
          }
        }
      }
      
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;
        const monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
        
        return {
          year,
          month,
          monthYear,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Handle MM-YY format (expected primary format)
    if (trimmed.includes('-') && trimmed.length <= 5) {
      const [monthPart, yearPart] = trimmed.split('-');
      
      // Parse month (should be 01-12)
      const monthNum = parseInt(monthPart, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new Error(`Invalid month in MM-YY format: ${monthPart} from "${trimmed}"`);
      }
      
      // Parse 2-digit year - Updated for 2019-2025 data range
      const yearNum = parseInt(yearPart, 10);
      let fullYear: number;
      
      if (yearNum >= 0 && yearNum <= 99) {
        // Convert 2-digit year to 4-digit year
        fullYear = 2000 + yearNum;
        console.log(`📅 MM-YY YEAR PARSING: "${trimmed}" -> yearNum=${yearNum} -> fullYear=${fullYear}`);
        
        // Special handling for common misinterpretations
        if (yearNum >= 19 && yearNum <= 25) {
          console.log(`✅ Year ${fullYear} is within expected range 2019-2025`);
        } else if (yearNum < 19) {
          console.warn(`⚠️ Year ${fullYear} is before 2019 - this might be incorrect`);
        }
      } else {
        console.warn(`⚠️ Invalid 2-digit year: ${yearNum} from "${trimmed}". Defaulting to 2024.`);
        fullYear = 2024;
      }
      
      return {
        year: fullYear,
        month: monthNum,
        monthYear: trimmed,
        costAllocationDate: new Date(fullYear, monthNum - 1, 15)
      };
    }
    
    // Handle month names (like "December 2019", "Dec 2019", etc.)
    const monthNameMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthNameMatch) {
      const [, monthName, year] = monthNameMatch;
      const monthNum = getMonthNumber(monthName);
      const yearNum = parseInt(year);
      const monthYear = `${String(monthNum).padStart(2, '0')}-${String(yearNum).slice(-2)}`;
      
      return {
        year: yearNum,
        month: monthNum,
        monthYear,
        costAllocationDate: new Date(yearNum, monthNum - 1, 15)
      };
    }
  }
  
  console.error('🚫 DATE PARSING FAILED:', {
    input: monthYearStr,
    type: typeof monthYearStr,
    stringValue: String(monthYearStr)
  });
  throw new Error(`Unsupported Month-Year format: "${monthYearStr}" (type: ${typeof monthYearStr}). Expected MM-YY, YYYY-MM-DD, Excel date, or month name format.`);
};

/**
 * Convert month name to number for Voyage List MMM format
 * Examples: "Jan" -> 1, "Feb" -> 2, "December" -> 12
 */
export const getMonthNumber = (month: string): number => {
  if (!month || typeof month !== 'string') {
    console.warn(`⚠️ Invalid month value: ${month}, defaulting to 1`);
    return 1;
  }
  
  const monthLower = month.toLowerCase().trim();
  
  // Handle full month names and abbreviations
  const monthMap: {[key: string]: number} = {
    // 3-letter abbreviations (primary format for Voyage List)
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    
    // Full month names (backup)
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'june': 6, 'july': 7, 'august': 8, 'september': 9,
    'october': 10, 'november': 11, 'december': 12
  };
  
  // Try exact match first
  if (monthMap[monthLower]) {
    return monthMap[monthLower];
  }
  
  // Try partial match for longer month names
  for (const [key, value] of Object.entries(monthMap)) {
    if (monthLower.startsWith(key) || key.startsWith(monthLower.substring(0, 3))) {
      return value;
    }
  }
  
  console.warn(`⚠️ Could not parse month: "${month}", defaulting to 1 (January)`);
  return 1;
};

/**
 * Get the week number for a given date
 */
export const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}; 