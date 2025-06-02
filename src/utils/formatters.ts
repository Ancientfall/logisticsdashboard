// Utility functions for consistent formatting across the application
// All decimal places standardized to hundredths (2 decimal places)
// Cost Allocation Dashboard uses whole numbers only

/**
 * Format numbers to 2 decimal places consistently
 */
export const formatToTwoDecimals = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00';
  return Number(value).toFixed(2);
};

/**
 * Format currency with 2 decimal places
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format large currency values with M/K suffixes but maintain 2 decimal precision
 */
export const formatLargeCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }
  return formatCurrency(amount);
};

/**
 * Format percentages to 2 decimal places
 */
export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00%';
  return `${Number(value).toFixed(2)}%`;
};

/**
 * Format days to 2 decimal places
 */
export const formatDays = (days: number | undefined | null): string => {
  if (days === undefined || days === null || isNaN(days)) return '0.00';
  return Number(days).toFixed(2);
};

/**
 * Format rates (per day, per hour) to 2 decimal places
 */
export const formatRate = (rate: number | undefined | null, unit: string = ''): string => {
  if (rate === undefined || rate === null || isNaN(rate)) return `0.00${unit ? ' ' + unit : ''}`;
  return `${Number(rate).toFixed(2)}${unit ? ' ' + unit : ''}`;
};

/**
 * Format numbers for display with thousands separators and 2 decimal places
 */
export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Format efficiency scores and utilization rates
 */
export const formatEfficiency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00%';
  return `${Math.min(100, Math.max(0, Number(value))).toFixed(2)}%`;
};

/**
 * Ensure a value is a valid number for calculations
 */
export const ensureNumber = (value: any): number => {
  if (value === undefined || value === null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Calculate trend percentage between two values
 */
export const calculateTrendPercentage = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Safe division with fallback
 */
export const safeDivide = (numerator: number, denominator: number, fallback: number = 0): number => {
  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) return fallback;
  return numerator / denominator;
};

/**
 * Format date consistently across the application
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date for display in tables and cards
 */
export const formatShortDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid';
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });
};

/**
 * Format month-year for Cost Allocation displays (MM-YY format)
 */
export const formatMonthYear = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid';
  
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  return `${month}-${year}`;
};

/**
 * Format month name for display
 */
export const formatMonthName = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid';
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Format datetime for detailed displays
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid DateTime';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format duration in hours to days/hours format
 */
export const formatDuration = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined || isNaN(hours)) return '0.00 hrs';
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
      return `${days}d ${remainingHours.toFixed(2)}h`;
    }
  }
  
  return `${hours.toFixed(2)} hrs`;
};

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export const formatRelativeTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  
  if (Math.abs(diffDays) >= 1) {
    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    }
  } else if (diffHours >= 1) {
    if (diffMs > 0) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
  } else {
    return 'just now';
  }
};

/**
 * Get standardized date range text
 */
export const formatDateRange = (startDate: Date | string | null | undefined, endDate: Date | string | null | undefined): string => {
  if (!startDate && !endDate) return 'No date range';
  if (!startDate) return `Until ${formatDate(endDate)}`;
  if (!endDate) return `From ${formatDate(startDate)}`;
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Whole number formatters for Cost Allocation Dashboard

/**
 * Format currency as whole numbers (no decimals)
 */
export const formatCurrencyWhole = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount));
};

/**
 * Format large currency values with M/K suffixes (no decimals)
 */
export const formatLargeCurrencyWhole = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  
  const rounded = Math.round(amount);
  if (rounded >= 1000000) {
    return `$${Math.round(rounded / 1000000)}M`;
  } else if (rounded >= 1000) {
    return `$${Math.round(rounded / 1000)}K`;
  }
  return formatCurrencyWhole(rounded);
};

/**
 * Format numbers as whole numbers with thousands separators
 */
export const formatNumberWhole = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
};

/**
 * Format days as whole numbers
 */
export const formatDaysWhole = (days: number | undefined | null): string => {
  if (days === undefined || days === null || isNaN(days)) return '0';
  return Math.round(days).toString();
};

/**
 * Format percentages as whole numbers
 */
export const formatPercentageWhole = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
}; 