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
 * Data Range: January 1, 2024 to April 30, 2025
 */
export const parseDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  
  try {
    // Handle YYYY-MM-DD HH:MM format (standard for most sheets)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Validate the date is in expected range (Jan 1, 2024 - Apr 30, 2025)
      const minDate = new Date(2024, 0, 1);  // January 1, 2024
      const maxDate = new Date(2025, 3, 30); // April 30, 2025
      
      if (date >= minDate && date <= maxDate) {
        return date;
      } else {
        console.warn(`⚠️ Parsed date ${date.toISOString()} from "${dateStr}" is outside expected data range (Jan 1, 2024 - Apr 30, 2025). This may indicate a data quality issue.`);
        // Return the parsed date anyway but log the warning
        return date;
      }
    }
    
    console.warn(`⚠️ Could not parse date: "${dateStr}", using current date`);
    return new Date();
  } catch (error) {
    console.warn(`⚠️ Error parsing date: ${dateStr}`, error);
    return new Date();
  }
};

/**
 * Enhanced Date Parser for Cost Allocation Month-Year column
 * Handles multiple formats including:
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
  if (monthYearStr === null || monthYearStr === undefined) {
    throw new Error(`Invalid Month-Year value: ${monthYearStr}`);
  }
  
  // Handle Excel Date objects first
  if (Object.prototype.toString.call(monthYearStr) === '[object Date]') {
    const date = monthYearStr as Date;
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
      
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
    // Excel serial date calculation (accounting for Excel's 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + monthYearStr * 24 * 60 * 60 * 1000);
    
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthYear = `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`;
      
      // Validate the converted date is within our data range
      const minDate = new Date(2024, 0, 1);   // January 1, 2024
      const maxDate = new Date(2025, 3, 30);  // April 30, 2025
      
      if (date < minDate || date > maxDate) {
        console.warn(`⚠️ Excel serial date ${monthYearStr} converts to ${date.toISOString()} which is outside data range (Jan 2024 - Apr 2025). This may indicate incorrect data.`);
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
      
      // Parse 2-digit year - Updated for 2024-2025 data range
      const yearNum = parseInt(yearPart, 10);
      let fullYear: number;
      
      if (yearNum >= 0 && yearNum <= 99) {
        // Smart year conversion for 2024-2025 data range:
        // 24-25 = 2024-2025, 00-23 = 2000-2023 (legacy data), 26-99 = 1926-1999 (very old data)
        if (yearNum >= 24 && yearNum <= 25) {
          fullYear = 2000 + yearNum; // 24 -> 2024, 25 -> 2025
        } else if (yearNum >= 0 && yearNum <= 23) {
          fullYear = 2000 + yearNum; // 00-23 -> 2000-2023 (for any legacy data)
        } else {
          fullYear = 1900 + yearNum; // 26-99 -> 1926-1999 (very old data, unlikely)
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