import { CostAllocation } from '../types';
import { ensureNumber } from './formatters';

export interface DataQualityIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  affectedRecords?: number;
  details?: string[];
}

export interface DataQualityReport {
  issues: DataQualityIssue[];
  validRecords: CostAllocation[];
  invalidRecords: CostAllocation[];
  totalRecords: number;
  validRecordCount: number;
}

export const performDataQualityCheck = (costAllocations: CostAllocation[]): DataQualityReport => {
  const issues: DataQualityIssue[] = [];
  const validRecords: CostAllocation[] = [];
  const invalidRecords: CostAllocation[] = [];
  
  // Track various issue types
  const duplicateKeys = new Map<string, CostAllocation[]>();
  const missingRigLocations: string[] = [];
  const invalidDates: string[] = [];
  const invalidAllocatedDays: string[] = [];
  const excessiveDays: string[] = [];
  const missingCosts: string[] = [];
  const negativeCosts: string[] = [];
  const missingProjectTypes: string[] = [];
  const suspiciousDailyRates: string[] = [];
  const twoDigitYears: string[] = [];
  
  // Check for "all January" issue
  const monthCounts = new Map<number, number>();
  const monthYearCounts = new Map<string, number>();

  // Process each record
  costAllocations.forEach((record, index) => {
    let hasError = false;
    const recordId = `LC: ${record.lcNumber}, Row: ${index + 1}`;

    // Check for duplicates
    const rigRef = record.rigLocation || record.locationReference || 'Unknown';
    const recordKey = `${record.lcNumber}_${record.monthYear}_${rigRef}_${ensureNumber(record.totalAllocatedDays)}`;
    
    if (!duplicateKeys.has(recordKey)) {
      duplicateKeys.set(recordKey, [record]);
    } else {
      duplicateKeys.get(recordKey)!.push(record);
    }

    // Validate allocated days
    const days = ensureNumber(record.totalAllocatedDays);
    if (days <= 0) {
      invalidAllocatedDays.push(recordId);
      hasError = true;
    } else if (days > 310) { // 10 vessels * 31 days = reasonable upper limit
      excessiveDays.push(`${recordId} (${days} vessel-days)`);
    }

    // Validate rig location
    if ((!record.rigLocation || record.rigLocation.trim() === '') && 
        (!record.locationReference || record.locationReference.trim() === '')) {
      missingRigLocations.push(recordId);
      hasError = true;
    }

    // Validate dates
    if (!record.monthYear || !record.year || !record.month) {
      invalidDates.push(recordId);
      hasError = true;
    }
    
    // Check for 2-digit years
    if (record.year && record.year >= 19 && record.year <= 25) {
      twoDigitYears.push(`${recordId} (Year: ${record.year} - should be 20${record.year})`);
      hasError = true;
    }
    
    // Track month distribution
    if (record.month) {
      monthCounts.set(record.month, (monthCounts.get(record.month) || 0) + 1);
    }
    if (record.monthYear) {
      monthYearCounts.set(record.monthYear, (monthYearCounts.get(record.monthYear) || 0) + 1);
    }

    // Validate costs
    const totalCost = ensureNumber(record.totalCost);
    const budgetedCost = ensureNumber(record.budgetedVesselCost);
    
    if (totalCost === 0 && budgetedCost === 0) {
      missingCosts.push(recordId);
    } else if (totalCost < 0 || budgetedCost < 0) {
      negativeCosts.push(recordId);
      hasError = true;
    }

    // Validate project type
    if (!record.projectType || record.projectType.trim() === '') {
      missingProjectTypes.push(recordId);
    }

    // Check daily rate
    const dailyRate = ensureNumber(record.vesselDailyRateUsed);
    if (dailyRate > 0) {
      if (dailyRate < 1000) {
        suspiciousDailyRates.push(`${recordId} (Rate: $${dailyRate} - unusually low)`);
      } else if (dailyRate > 100000) {
        suspiciousDailyRates.push(`${recordId} (Rate: $${dailyRate} - unusually high)`);
      }
    }

    // Add to appropriate list
    if (hasError) {
      invalidRecords.push(record);
    } else {
      validRecords.push(record);
    }
  });

  // Create issue reports
  // Duplicates
  const duplicateGroups = Array.from(duplicateKeys.entries()).filter(([_, records]) => records.length > 1);
  if (duplicateGroups.length > 0) {
    const totalDuplicates = duplicateGroups.reduce((sum, [_, records]) => sum + records.length - 1, 0);
    issues.push({
      type: 'error',
      category: 'Duplicate Records',
      message: `Found ${duplicateGroups.length} groups of duplicate records`,
      affectedRecords: totalDuplicates,
      details: duplicateGroups.map(([key, records]) => 
        `${records.length} duplicates for: ${key.split('_').join(', ')}`
      ).slice(0, 5)
    });
  }

  // Missing rig locations
  if (missingRigLocations.length > 0) {
    issues.push({
      type: 'error',
      category: 'Missing Data',
      message: 'Records with missing rig location',
      affectedRecords: missingRigLocations.length,
      details: missingRigLocations.slice(0, 5)
    });
  }

  // Invalid dates
  if (invalidDates.length > 0) {
    issues.push({
      type: 'error',
      category: 'Invalid Data',
      message: 'Records with missing or invalid date information',
      affectedRecords: invalidDates.length,
      details: invalidDates.slice(0, 5)
    });
  }

  // Invalid allocated days
  if (invalidAllocatedDays.length > 0) {
    issues.push({
      type: 'error',
      category: 'Invalid Data',
      message: 'Records with zero or negative allocated days',
      affectedRecords: invalidAllocatedDays.length,
      details: invalidAllocatedDays.slice(0, 5)
    });
  }

  // Excessive vessel-days
  if (excessiveDays.length > 0) {
    issues.push({
      type: 'warning',
      category: 'Data Anomalies',
      message: 'Records with unusually high vessel-days (>310 days)',
      affectedRecords: excessiveDays.length,
      details: excessiveDays.slice(0, 5)
    });
  }

  // Missing costs
  if (missingCosts.length > 0) {
    issues.push({
      type: 'warning',
      category: 'Missing Data',
      message: 'Records with zero total and budgeted costs',
      affectedRecords: missingCosts.length,
      details: missingCosts.slice(0, 5)
    });
  }

  // Negative costs
  if (negativeCosts.length > 0) {
    issues.push({
      type: 'error',
      category: 'Invalid Data',
      message: 'Records with negative cost values',
      affectedRecords: negativeCosts.length,
      details: negativeCosts.slice(0, 5)
    });
  }

  // Missing project types
  if (missingProjectTypes.length > 0) {
    issues.push({
      type: 'info',
      category: 'Missing Data',
      message: 'Records without project type classification',
      affectedRecords: missingProjectTypes.length,
      details: missingProjectTypes.slice(0, 5)
    });
  }
  
  // 2-digit years
  if (twoDigitYears.length > 0) {
    issues.push({
      type: 'error',
      category: 'Date Format Error',
      message: 'Records with 2-digit years (should be 4-digit)',
      affectedRecords: twoDigitYears.length,
      details: twoDigitYears.slice(0, 5)
    });
  }

  // Suspicious daily rates
  if (suspiciousDailyRates.length > 0) {
    issues.push({
      type: 'warning',
      category: 'Data Anomalies',
      message: 'Records with unusual daily rates',
      affectedRecords: suspiciousDailyRates.length,
      details: suspiciousDailyRates.slice(0, 5)
    });
  }

  // Add summary statistics
  const dataCompleteness = Math.round((validRecords.length / costAllocations.length) * 100);
  if (dataCompleteness < 90) {
    issues.push({
      type: 'warning',
      category: 'Overall Data Quality',
      message: `Data completeness is ${dataCompleteness}% (below 90% threshold)`,
      affectedRecords: invalidRecords.length
    });
  }

  // Check for "all January" issue
  if (monthCounts.size === 1 && monthCounts.has(1) && costAllocations.length > 10) {
    issues.push({
      type: 'error',
      category: 'Critical Date Parsing Error',
      message: 'ALL dates are showing as January - Excel date parsing has failed',
      affectedRecords: costAllocations.length,
      details: [
        'The Excel file\'s date column appears to be corrupted',
        'Original dates like "1/1/24", "12/15/23" may have been reduced to just year values',
        'Recommendation: Re-export the Excel file with dates formatted as text (e.g., "01-24" for Jan 2024)',
        'Alternative: Ensure date column is formatted as Date in Excel before saving'
      ]
    });
  } else if (monthCounts.size > 0) {
    // Check for suspicious month distribution
    const totalRecordsWithMonths = Array.from(monthCounts.values()).reduce((a, b) => a + b, 0);
    const januaryCount = monthCounts.get(1) || 0;
    const januaryPercentage = (januaryCount / totalRecordsWithMonths) * 100;
    
    if (januaryPercentage > 80 && monthCounts.size > 1) {
      issues.push({
        type: 'warning',
        category: 'Date Distribution Anomaly',
        message: `${januaryPercentage.toFixed(0)}% of records show January dates`,
        affectedRecords: januaryCount,
        details: [
          'This may indicate a date parsing issue',
          'Check if Excel dates are being read correctly',
          `Other months found: ${Array.from(monthCounts.keys()).filter(m => m !== 1).map(m => m).join(', ')}`
        ]
      });
    }
  }

  // Add informational message about vessel-days
  const totalVesselDays = costAllocations.reduce((sum, record) => 
    sum + ensureNumber(record.totalAllocatedDays), 0
  );
  const avgVesselDaysPerRecord = totalVesselDays / costAllocations.length;
  
  issues.push({
    type: 'info',
    category: 'Data Context',
    message: `Total vessel-days tracked: ${totalVesselDays.toLocaleString()}`,
    details: [
      `Average vessel-days per LC: ${avgVesselDaysPerRecord.toFixed(1)}`,
      'Note: Multiple vessels can work on the same LC simultaneously',
      'Example: 3 vessels × 30 days = 90 vessel-days per month'
    ]
  });

  return {
    issues,
    validRecords,
    invalidRecords,
    totalRecords: costAllocations.length,
    validRecordCount: validRecords.length
  };
};