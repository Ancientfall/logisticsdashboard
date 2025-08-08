// src/utils/dateUtils.ts
/**
 * Enhanced Date parsing utilities with comprehensive format support
 */

/**
 * Parse date strings/numbers from different Excel sheet formats including Excel serial dates
 */
export const parseDate = (dateValue: string | number | null | undefined): Date => {
  const defaultDate = new Date(2024, 0, 1);
  
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    console.warn(`⚠️ Empty date value provided, using default date: ${defaultDate.toISOString()}`);
    return defaultDate;
  }
  
  try {
    // Handle Excel serial numbers (numeric dates)
    if (typeof dateValue === 'number') {
      // Excel stores dates as numbers - days since January 1, 1900
      // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
      if (dateValue > 0 && dateValue < 2958466) { // Max Excel date (Dec 31, 9999)
        const excelEpoch = new Date(1899, 11, 30); // Excel's adjusted epoch (Dec 30, 1899)
        const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        
        if (!isNaN(date.getTime())) {
          console.log(`✅ Parsed Excel serial date: ${dateValue} → ${date.toISOString().substring(0, 10)}`);
          return date;
        }
      }
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const minDate = new Date(2000, 0, 1);
        const maxDate = new Date(2035, 11, 31);
        
        if (date >= minDate && date <= maxDate) {
          return date;
        } else {
          console.warn(`⚠️ Parsed date ${date.toISOString()} from "${dateValue}" is outside expected data range.`);
          return date;
        }
      }
    }
    
    console.warn(`⚠️ Could not parse date: "${dateValue}" (type: ${typeof dateValue}), using default date`);
    return defaultDate;
  } catch (error) {
    console.warn(`⚠️ Error parsing date: ${dateValue}`, error);
    return defaultDate;
  }
};

/**
 * Enhanced Date Parser for Cost Allocation Month-Year column
 * Now optimized for text-based month names (Jan-24, Feb-24, etc.)
 */
export const parseCostAllocationMonthYear = (monthYearStr: string | number | Date): {
  year: number;
  month: number;
  monthYear: string;
  costAllocationDate: Date;
} => {
  console.log('📅 parseCostAllocationMonthYear INPUT:', {
    value: monthYearStr,
    type: typeof monthYearStr,
    isNull: monthYearStr === null,
    isUndefined: monthYearStr === undefined,
    isEmpty: monthYearStr === '',
    toString: String(monthYearStr)
  });
  
  // Handle empty/null/undefined
  if (monthYearStr === null || monthYearStr === undefined || monthYearStr === '') {
    throw new Error('Empty date value');
  }
  
  // Clean up the input - remove any special characters
  let cleanedInput = monthYearStr;
  if (typeof monthYearStr === 'string') {
    // Remove any non-printable characters and trim
    cleanedInput = monthYearStr.replace(/[^\x20-\x7E]/g, '').trim();
    if (cleanedInput !== monthYearStr) {
      console.log(`🧹 Cleaned input: "${cleanedInput}" from "${monthYearStr}"`);
    }
  }
  
  // Handle Date objects
  if (monthYearStr instanceof Date && !isNaN(monthYearStr.getTime())) {
    const year = monthYearStr.getFullYear();
    const month = monthYearStr.getMonth() + 1;
    console.log(`✅ Parsed Date object: ${month}/${year}`);
    return {
      year,
      month,
      monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
      costAllocationDate: new Date(year, month - 1, 15)
    };
  }
  
  // Handle string formats
  if (typeof cleanedInput === 'string') {
    const trimmed = cleanedInput.trim();
    console.log(`🔍 Trying to parse string: "${trimmed}"`);
    
    // FIRST PRIORITY: Try Month Name format (Jan-24, Feb-24, etc.)
    // This is now the expected format since Excel column is text
    const monthNames: Record<string, number> = {
      'jan': 1, 'january': 1,
      'feb': 2, 'february': 2,
      'mar': 3, 'march': 3,
      'apr': 4, 'april': 4,
      'may': 5,
      'jun': 6, 'june': 6,
      'jul': 7, 'july': 7,
      'aug': 8, 'august': 8,
      'sep': 9, 'september': 9, 'sept': 9,
      'oct': 10, 'october': 10,
      'nov': 11, 'november': 11,
      'dec': 12, 'december': 12
    };
    
    // Try MM-YY format (06-25, 12-24, etc.) - NUMERIC MONTH FORMAT
    const numericMonthMatch = trimmed.match(/^(\d{1,2})-(\d{2})$/);
    if (numericMonthMatch) {
      const month = parseInt(numericMonthMatch[1], 10);
      const yearStr = numericMonthMatch[2];
      const year = 2000 + parseInt(yearStr, 10);
      
      // Validate month
      if (month >= 1 && month <= 12) {
        console.log(`✅ Parsed numeric MM-YY format: ${trimmed} to ${month}/${year}`);
        return {
          year,
          month,
          monthYear: `${String(month).padStart(2, '0')}-${yearStr}`,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      } else {
        console.warn(`⚠️ Invalid month in MM-YY format: ${month} (from "${trimmed}")`);
      }
    }
    
    // Try Mon-YY format (Jan-24, Feb-24, etc.)
    const monthNameMatch = trimmed.match(/^([a-zA-Z]{3,})-(\d{2})$/i);
    if (monthNameMatch) {
      const monthStr = monthNameMatch[1].toLowerCase();
      const yearStr = monthNameMatch[2];
      const month = monthNames[monthStr];
      
      if (month) {
        const year = 2000 + parseInt(yearStr, 10);
        console.log(`✅ Parsed month name format: ${trimmed} to ${month}/${year}`);
        return {
          year,
          month,
          monthYear: `${String(month).padStart(2, '0')}-${yearStr}`,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Try MM/DD/YYYY or M/D/YYYY format (12/31/2019, 01/31/2020)
    let match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      const year = parseInt(match[3], 10);
      
      // Validate month
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      
      console.log(`✅ Parsed MM/DD/YYYY format: ${trimmed} to ${month}/${year}`);
      
      return {
        year,
        month,
        monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
        costAllocationDate: new Date(year, month - 1, 15)
      };
    }
    
    // Try M/D/YY format (1/1/24)
    match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      let year = parseInt(match[2], 10);
      
      // Handle 2-digit years (00-99)
      // Assume 00-29 is 2000-2029, 30-99 is 1930-1999
      if (year <= 29) {
        year = 2000 + year;
      } else {
        year = 1900 + year;
      }
      
      // Validate month
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      
      console.log(`✅ Parsed M/D/YY format: ${trimmed} to ${month}/${year}`);
      return {
        year,
        month,
        monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
        costAllocationDate: new Date(year, month - 1, 15)
      };
    }
    
    // Try MM-YY format (01-24, 02-24, etc.)
    match = trimmed.match(/^(\d{1,2})-(\d{2})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      let year = parseInt(match[2], 10);
      
      // Handle 2-digit years
      if (year <= 29) {
        year = 2000 + year;
      } else {
        year = 1900 + year;
      }
      
      if (month >= 1 && month <= 12) {
        console.log(`✅ Parsed MM-YY format: ${trimmed} to ${month}/${year}`);
        return {
          year,
          month,
          monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Try MM/YY format (01/24, 02/24, etc.)
    match = trimmed.match(/^(\d{1,2})\/(\d{2})$/);
    if (match) {
      const month = parseInt(match[1], 10);
      let year = parseInt(match[2], 10);
      
      // Handle 2-digit years
      if (year <= 29) {
        year = 2000 + year;
      } else {
        year = 1900 + year;
      }
      
      if (month >= 1 && month <= 12) {
        console.log(`✅ Parsed MM/YY format: ${trimmed} to ${month}/${year}`);
        return {
          year,
          month,
          monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Try YYYY-MM format (2024-01)
    match = trimmed.match(/^(\d{4})-(\d{1,2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      
      if (month >= 1 && month <= 12) {
        console.log(`✅ Parsed YYYY-MM format: ${trimmed} to ${month}/${year}`);
        return {
          year,
          month,
          monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Try Month Name formats (Aug 2024, August 2024, Aug-24, etc.)
    // Now handled at the beginning of the function
    
    // Try to parse as standard date string
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      console.log(`✅ Parsed standard date: ${trimmed} to ${month}/${year}`);
      return {
        year,
        month,
        monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
        costAllocationDate: new Date(year, month - 1, 15)
      };
    }
  }
  
  // Handle Excel serial dates (numbers)
  if (typeof monthYearStr === 'number') {
    console.log(`🔢 Trying to parse number: ${monthYearStr}`);
    
    // Excel stores dates as numbers - days since 1900
    if (monthYearStr > 25569) { // After 1970-01-01
      const excelEpoch = new Date(1899, 11, 30); // Excel's epoch
      const date = new Date(excelEpoch.getTime() + monthYearStr * 24 * 60 * 60 * 1000);
      
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        console.log(`✅ Parsed Excel serial: ${monthYearStr} to ${month}/${year}`);
        return {
          year,
          month,
          monthYear: `${String(month).padStart(2, '0')}-${String(year).slice(-2)}`,
          costAllocationDate: new Date(year, month - 1, 15)
        };
      }
    }
    
    // Check if it's a year (2019-2030)
    if (monthYearStr >= 2019 && monthYearStr <= 2030) {
      console.log(`✅ Interpreting ${monthYearStr} as year, defaulting to January`);
      return {
        year: monthYearStr,
        month: 1,
        monthYear: `01-${String(monthYearStr).slice(-2)}`,
        costAllocationDate: new Date(monthYearStr, 0, 15)
      };
    }
  }
  
  // If we get here, we couldn't parse it
  console.error(`❌ Failed to parse: "${monthYearStr}" (type: ${typeof monthYearStr})`);
  throw new Error(`Unable to parse date: "${monthYearStr}" (type: ${typeof monthYearStr})`);
};

/**
 * Convert month name to number
 */
export const getMonthNumber = (month: string | undefined | null): number => {
  if (!month || typeof month !== 'string') {
    // Don't warn for undefined/null values - just return default silently
    return 1;
  }
  
  const monthLower = month.toLowerCase().trim();
  
  const monthMap: {[key: string]: number} = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'june': 6, 'july': 7, 'august': 8, 'september': 9,
    'october': 10, 'november': 11, 'december': 12
  };
  
  if (monthMap[monthLower]) {
    return monthMap[monthLower];
  }
  
  // Try partial match
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