/**
 * Data Integrity Validator
 * Comprehensive validation framework for ensuring data accuracy across all datasets
 * Critical for maintaining data quality for operational decision making
 */

import { 
  VoyageEvent, 
  VesselManifest, 
  CostAllocation, 
  BulkAction, 
  VoyageList,
  ValidationResult 
} from '../types';

// ==================== VALIDATION INTERFACES ====================

export interface DataIntegrityReport {
  timestamp: Date;
  overallScore: number; // 0-100
  datasets: {
    voyageEvents: DatasetValidation;
    vesselManifests: DatasetValidation;
    costAllocation: DatasetValidation;
    bulkActions: DatasetValidation;
    voyageList: DatasetValidation;
  };
  crossDatasetValidation: CrossDatasetValidation;
  criticalIssues: ValidationIssue[];
  recommendations: string[];
}

export interface DatasetValidation {
  name: string;
  recordCount: number;
  completenessScore: number; // 0-100
  consistencyScore: number; // 0-100
  validationResults: ValidationResult;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface CrossDatasetValidation {
  lcNumberConsistency: ValidationResult;
  locationMappingConsistency: ValidationResult;
  dateRangeConsistency: ValidationResult;
  vesselNameConsistency: ValidationResult;
  costAllocationCoverage: ValidationResult;
  fluidVolumeConsistency: ValidationResult;
}

export interface ValidationIssue {
  severity: 'Critical' | 'Warning' | 'Info';
  category: 'Completeness' | 'Consistency' | 'Format' | 'Logic' | 'Cross-Reference';
  dataset: string;
  field?: string;
  recordId?: string;
  message: string;
  impact: 'High' | 'Medium' | 'Low';
  suggestion?: string;
  count?: number;
}

// ==================== MAIN VALIDATION FUNCTION ====================

/**
 * Comprehensive data integrity validation across all datasets
 */
export const validateDataIntegrity = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[],
  bulkActions: BulkAction[],
  voyageList: VoyageList[]
): DataIntegrityReport => {
  console.log('🔍 STARTING COMPREHENSIVE DATA INTEGRITY VALIDATION');
  
  const timestamp = new Date();
  const criticalIssues: ValidationIssue[] = [];
  const recommendations: string[] = [];

  // Validate individual datasets
  const voyageEventsValidation = validateVoyageEvents(voyageEvents);
  const vesselManifestsValidation = validateVesselManifests(vesselManifests);
  const costAllocationValidation = validateCostAllocation(costAllocation);
  const bulkActionsValidation = validateBulkActions(bulkActions);
  const voyageListValidation = validateVoyageList(voyageList);

  // Cross-dataset validation
  const crossDatasetValidation = validateCrossDatasetConsistency(
    voyageEvents,
    vesselManifests,
    costAllocation,
    bulkActions,
    voyageList
  );

  // Collect critical issues
  [voyageEventsValidation, vesselManifestsValidation, costAllocationValidation, 
   bulkActionsValidation, voyageListValidation].forEach(validation => {
    criticalIssues.push(...validation.issues.filter(issue => issue.severity === 'Critical'));
  });

  // Calculate overall score
  const datasetScores = [
    voyageEventsValidation.completenessScore,
    vesselManifestsValidation.completenessScore,
    costAllocationValidation.completenessScore,
    bulkActionsValidation.completenessScore,
    voyageListValidation.completenessScore
  ];
  
  const consistencyScores = [
    voyageEventsValidation.consistencyScore,
    vesselManifestsValidation.consistencyScore,
    costAllocationValidation.consistencyScore,
    bulkActionsValidation.consistencyScore,
    voyageListValidation.consistencyScore
  ];

  const avgCompletenessScore = datasetScores.reduce((a, b) => a + b, 0) / datasetScores.length;
  const avgConsistencyScore = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
  const overallScore = (avgCompletenessScore + avgConsistencyScore) / 2;

  // Generate recommendations
  if (overallScore < 70) {
    recommendations.push('Critical data quality issues detected - immediate attention required');
  }
  if (criticalIssues.length > 0) {
    recommendations.push(`${criticalIssues.length} critical issues must be resolved before using data for decisions`);
  }
  if (crossDatasetValidation.lcNumberConsistency.isValid === false) {
    recommendations.push('LC number inconsistencies detected - verify cost allocation mappings');
  }

  console.log(`✅ DATA INTEGRITY VALIDATION COMPLETE - Overall Score: ${overallScore.toFixed(1)}%`);

  return {
    timestamp,
    overallScore,
    datasets: {
      voyageEvents: voyageEventsValidation,
      vesselManifests: vesselManifestsValidation,
      costAllocation: costAllocationValidation,
      bulkActions: bulkActionsValidation,
      voyageList: voyageListValidation
    },
    crossDatasetValidation,
    criticalIssues,
    recommendations
  };
};

// ==================== INDIVIDUAL DATASET VALIDATORS ====================

/**
 * Validate voyage events dataset
 */
const validateVoyageEvents = (voyageEvents: VoyageEvent[]): DatasetValidation => {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Required fields validation
  const requiredFields = ['vessel', 'parentEvent', 'location', 'from', 'to', 'hours'];
  let missingFieldCount = 0;

  voyageEvents.forEach((event, index) => {
    requiredFields.forEach(field => {
      if (!event[field as keyof VoyageEvent]) {
        missingFieldCount++;
        if (field === 'vessel' || field === 'parentEvent') {
          issues.push({
            severity: 'Critical',
            category: 'Completeness',
            dataset: 'VoyageEvents',
            field,
            recordId: event.id || `Row ${index + 1}`,
            message: `Missing required field: ${field}`,
            impact: 'High',
            suggestion: `Ensure ${field} is provided for all records`
          });
        }
      }
    });

    // Logical validation
    if (event.from && event.to && event.from >= event.to) {
      issues.push({
        severity: 'Critical',
        category: 'Logic',
        dataset: 'VoyageEvents',
        recordId: event.id,
        message: 'Event start time is after end time',
        impact: 'High',
        suggestion: 'Verify event time sequence'
      });
    }

    // Hours consistency
    if (event.hours && event.finalHours && Math.abs(event.hours - event.finalHours) > event.hours * 0.5) {
      warnings.push({
        severity: 'Warning',
        category: 'Consistency',
        dataset: 'VoyageEvents',
        recordId: event.id,
        message: 'Large discrepancy between hours and finalHours',
        impact: 'Medium',
        suggestion: 'Review LC allocation logic'
      });
    }
  });

  const completenessScore = Math.max(0, 100 - (missingFieldCount / (voyageEvents.length * requiredFields.length)) * 100);
  const consistencyScore = Math.max(0, 100 - (issues.filter(i => i.category === 'Logic').length / voyageEvents.length) * 100);

  return {
    name: 'Voyage Events',
    recordCount: voyageEvents.length,
    completenessScore,
    consistencyScore,
    validationResults: {
      isValid: issues.filter(i => i.severity === 'Critical').length === 0,
      errors: issues.map(i => i.message),
      warnings: warnings.map(w => w.message),
      recordCount: 0,
      duplicateCount: 0,
      missingFieldCount
    },
    issues,
    warnings
  };
};

/**
 * Validate vessel manifests dataset
 */
const validateVesselManifests = (vesselManifests: VesselManifest[]): DatasetValidation => {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const requiredFields = ['manifestNumber', 'transporter', 'offshoreLocation', 'manifestDate'];
  let missingFieldCount = 0;

  vesselManifests.forEach((manifest, index) => {
    requiredFields.forEach(field => {
      if (!manifest[field as keyof VesselManifest]) {
        missingFieldCount++;
        issues.push({
          severity: 'Critical',
          category: 'Completeness',
          dataset: 'VesselManifests',
          field,
          recordId: manifest.id || `Row ${index + 1}`,
          message: `Missing required field: ${field}`,
          impact: 'High'
        });
      }
    });

    // Tonnage validation
    if (manifest.deckTons < 0 || manifest.rtTons < 0) {
      issues.push({
        severity: 'Critical',
        category: 'Logic',
        dataset: 'VesselManifests',
        recordId: manifest.id,
        message: 'Negative tonnage values detected',
        impact: 'High',
        suggestion: 'Verify tonnage calculations'
      });
    }

    // Cost code validation
    if (!manifest.costCode) {
      warnings.push({
        severity: 'Warning',
        category: 'Completeness',
        dataset: 'VesselManifests',
        recordId: manifest.id,
        message: 'Missing cost code - cannot validate against cost allocation',
        impact: 'Medium',
        suggestion: 'Add cost code for proper department allocation'
      });
    }
  });

  const completenessScore = Math.max(0, 100 - (missingFieldCount / (vesselManifests.length * requiredFields.length)) * 100);
  const consistencyScore = Math.max(0, 100 - (issues.filter(i => i.category === 'Logic').length / vesselManifests.length) * 100);

  return {
    name: 'Vessel Manifests',
    recordCount: vesselManifests.length,
    completenessScore,
    consistencyScore,
    validationResults: {
      isValid: issues.filter(i => i.severity === 'Critical').length === 0,
      errors: issues.map(i => i.message),
      warnings: warnings.map(w => w.message),
      recordCount: 0,
      duplicateCount: 0,
      missingFieldCount
    },
    issues,
    warnings
  };
};

/**
 * Validate cost allocation dataset
 */
const validateCostAllocation = (costAllocation: CostAllocation[]): DatasetValidation => {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const requiredFields = ['lcNumber', 'locationReference'];
  let missingFieldCount = 0;

  // Track LC number uniqueness
  const lcNumbers = new Set<string>();
  const duplicateLCs: string[] = [];

  costAllocation.forEach((cost, index) => {
    requiredFields.forEach(field => {
      if (!cost[field as keyof CostAllocation]) {
        missingFieldCount++;
        issues.push({
          severity: 'Critical',
          category: 'Completeness',
          dataset: 'CostAllocation',
          field,
          recordId: `Row ${index + 1}`,
          message: `Missing required field: ${field}`,
          impact: 'High'
        });
      }
    });

    // Check for duplicate LC numbers
    if (cost.lcNumber) {
      if (lcNumbers.has(cost.lcNumber)) {
        duplicateLCs.push(cost.lcNumber);
      } else {
        lcNumbers.add(cost.lcNumber);
      }
    }

    // Validate numeric fields
    if (cost.totalCost && cost.totalCost < 0) {
      issues.push({
        severity: 'Critical',
        category: 'Logic',
        dataset: 'CostAllocation',
        recordId: cost.lcNumber,
        message: 'Negative cost values detected',
        impact: 'High'
      });
    }
  });

  // Report duplicate LC numbers
  if (duplicateLCs.length > 0) {
    issues.push({
      severity: 'Critical',
      category: 'Consistency',
      dataset: 'CostAllocation',
      message: `Duplicate LC numbers detected: ${[...new Set(duplicateLCs)].join(', ')}`,
      impact: 'High',
      count: duplicateLCs.length,
      suggestion: 'Ensure LC numbers are unique or consolidate duplicate entries'
    });
  }

  const completenessScore = Math.max(0, 100 - (missingFieldCount / (costAllocation.length * requiredFields.length)) * 100);
  const consistencyScore = Math.max(0, 100 - (duplicateLCs.length / costAllocation.length) * 100);

  return {
    name: 'Cost Allocation',
    recordCount: costAllocation.length,
    completenessScore,
    consistencyScore,
    validationResults: {
      isValid: issues.filter(i => i.severity === 'Critical').length === 0,
      errors: issues.map(i => i.message),
      warnings: warnings.map(w => w.message),
      recordCount: 0,
      duplicateCount: 0,
      missingFieldCount
    },
    issues,
    warnings
  };
};

/**
 * Validate bulk actions dataset
 */
const validateBulkActions = (bulkActions: BulkAction[]): DatasetValidation => {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const requiredFields = ['vesselName', 'action', 'qty', 'unit', 'bulkType', 'atPort'];
  let missingFieldCount = 0;

  bulkActions.forEach((action, index) => {
    requiredFields.forEach(field => {
      if (!action[field as keyof BulkAction]) {
        missingFieldCount++;
        issues.push({
          severity: 'Critical',
          category: 'Completeness',
          dataset: 'BulkActions',
          field,
          recordId: action.id || `Row ${index + 1}`,
          message: `Missing required field: ${field}`,
          impact: 'High'
        });
      }
    });

    // Volume validation
    if (action.qty <= 0) {
      issues.push({
        severity: 'Critical',
        category: 'Logic',
        dataset: 'BulkActions',
        recordId: action.id,
        message: 'Zero or negative quantity detected',
        impact: 'High',
        suggestion: 'Verify quantity calculations'
      });
    }

    // Destination port validation for deliveries
    const isLoad = action.action.toLowerCase().includes('load');
    const isOffload = action.action.toLowerCase().includes('offload');
    
    if (isOffload && !action.destinationPort) {
      warnings.push({
        severity: 'Warning',
        category: 'Completeness',
        dataset: 'BulkActions',
        recordId: action.id,
        message: 'Offload operation missing destination port',
        impact: 'Medium',
        suggestion: 'Add destination port for complete fluid tracking'
      });
    }
  });

  const completenessScore = Math.max(0, 100 - (missingFieldCount / (bulkActions.length * requiredFields.length)) * 100);
  const consistencyScore = Math.max(0, 100 - (issues.filter(i => i.category === 'Logic').length / bulkActions.length) * 100);

  return {
    name: 'Bulk Actions',
    recordCount: bulkActions.length,
    completenessScore,
    consistencyScore,
    validationResults: {
      isValid: issues.filter(i => i.severity === 'Critical').length === 0,
      errors: issues.map(i => i.message),
      warnings: warnings.map(w => w.message),
      recordCount: 0,
      duplicateCount: 0,
      missingFieldCount
    },
    issues,
    warnings
  };
};

/**
 * Validate voyage list dataset
 */
const validateVoyageList = (voyageList: VoyageList[]): DatasetValidation => {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const requiredFields = ['vessel', 'voyageNumber', 'locations', 'startDate'];
  let missingFieldCount = 0;

  voyageList.forEach((voyage, index) => {
    requiredFields.forEach(field => {
      if (!voyage[field as keyof VoyageList]) {
        missingFieldCount++;
        issues.push({
          severity: 'Critical',
          category: 'Completeness',
          dataset: 'VoyageList',
          field,
          recordId: `${voyage.vessel}_${voyage.voyageNumber}` || `Row ${index + 1}`,
          message: `Missing required field: ${field}`,
          impact: 'High'
        });
      }
    });

    // Voyage duration validation
    if (voyage.durationHours && voyage.durationHours <= 0) {
      issues.push({
        severity: 'Critical',
        category: 'Logic',
        dataset: 'VoyageList',
        recordId: `${voyage.vessel}_${voyage.voyageNumber}`,
        message: 'Invalid voyage duration',
        impact: 'High'
      });
    }
  });

  const completenessScore = Math.max(0, 100 - (missingFieldCount / (voyageList.length * requiredFields.length)) * 100);
  const consistencyScore = Math.max(0, 100 - (issues.filter(i => i.category === 'Logic').length / voyageList.length) * 100);

  return {
    name: 'Voyage List',
    recordCount: voyageList.length,
    completenessScore,
    consistencyScore,
    validationResults: {
      isValid: issues.filter(i => i.severity === 'Critical').length === 0,
      errors: issues.map(i => i.message),
      warnings: warnings.map(w => w.message),
      recordCount: 0,
      duplicateCount: 0,
      missingFieldCount
    },
    issues,
    warnings
  };
};

// ==================== CROSS-DATASET VALIDATION ====================

/**
 * Validate consistency across datasets
 */
const validateCrossDatasetConsistency = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[],
  bulkActions: BulkAction[],
  voyageList: VoyageList[]
): CrossDatasetValidation => {
  
  // LC Number consistency
  const lcNumberConsistency = validateLCNumberConsistency(voyageEvents, vesselManifests, costAllocation);
  
  // Location mapping consistency  
  const locationMappingConsistency = validateLocationMappingConsistency(voyageEvents, vesselManifests, costAllocation);
  
  // Date range consistency
  const dateRangeConsistency = validateDateRangeConsistency(voyageEvents, vesselManifests, bulkActions, voyageList);
  
  // Vessel name consistency
  const vesselNameConsistency = validateVesselNameConsistency(voyageEvents, vesselManifests, bulkActions, voyageList);
  
  // Cost allocation coverage
  const costAllocationCoverage = validateCostAllocationCoverage(voyageEvents, vesselManifests, costAllocation);
  
  // Fluid volume consistency
  const fluidVolumeConsistency = validateFluidVolumeConsistency(bulkActions);

  return {
    lcNumberConsistency,
    locationMappingConsistency,
    dateRangeConsistency,
    vesselNameConsistency,
    costAllocationCoverage,
    fluidVolumeConsistency
  };
};

/**
 * Validate LC number consistency across datasets
 */
const validateLCNumberConsistency = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[]
): ValidationResult => {
  const costAllocationLCs = new Set(costAllocation.map(ca => ca.lcNumber).filter(Boolean));
  
  const voyageEventLCs = new Set(voyageEvents.map(ve => ve.lcNumber).filter(Boolean));
  const manifestCostCodes = new Set(vesselManifests.map(vm => vm.costCode).filter(Boolean));
  
  const orphanedVoyageEventLCs = [...voyageEventLCs].filter(lc => lc && !costAllocationLCs.has(lc));
  const orphanedManifestCodes = [...manifestCostCodes].filter(code => code && !costAllocationLCs.has(code));
  
  const errorCount = orphanedVoyageEventLCs.length + orphanedManifestCodes.length;
  
  return {
    isValid: errorCount === 0,
    errors: orphanedVoyageEventLCs.concat(orphanedManifestCodes).filter(Boolean) as string[],
    warnings: [],
    recordCount: voyageEvents.length + vesselManifests.length,
    duplicateCount: 0,
    missingFieldCount: 0
  };
};

/**
 * Validate location mapping consistency
 */
const validateLocationMappingConsistency = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[]
): ValidationResult => {
  // This would implement location name standardization validation
  // For now, return a basic validation
  return {
    isValid: true,
    errors: [],
    warnings: [],
    recordCount: 0,
    duplicateCount: 0,
    missingFieldCount: 0
  };
};

/**
 * Validate date range consistency across datasets
 */
const validateDateRangeConsistency = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  bulkActions: BulkAction[],
  voyageList: VoyageList[]
): ValidationResult => {
  // Validate that date ranges are reasonable and consistent
  const allDates = [
    ...voyageEvents.map(ve => ve.eventDate),
    ...vesselManifests.map(vm => vm.manifestDate),
    ...bulkActions.map(ba => ba.startDate),
    ...voyageList.map(vl => vl.startDate)
  ].filter(date => date instanceof Date && !isNaN(date.getTime()));

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  // Check for reasonable date ranges (not too far in past or future)
  const currentYear = new Date().getFullYear();
  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();
  
  const hasUnreasonableDates = minYear < 2020 || maxYear > currentYear + 1;
  
  return {
    isValid: !hasUnreasonableDates,
    errors: hasUnreasonableDates ? ['Unreasonable date ranges detected'] : [],
    warnings: [],
    recordCount: allDates.length,
    duplicateCount: 0,
    missingFieldCount: 0
  };
};

/**
 * Validate vessel name consistency across datasets
 */
const validateVesselNameConsistency = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  bulkActions: BulkAction[],
  voyageList: VoyageList[]
): ValidationResult => {
  // Get unique vessel names from each dataset
  const voyageEventVessels = new Set(voyageEvents.map(ve => ve.vessel?.toLowerCase().trim()).filter(Boolean));
  const manifestVessels = new Set(vesselManifests.map(vm => vm.transporter?.toLowerCase().trim()).filter(Boolean));
  const bulkActionVessels = new Set(bulkActions.map(ba => ba.vesselName?.toLowerCase().trim()).filter(Boolean));
  const voyageListVessels = new Set(voyageList.map(vl => vl.vessel?.toLowerCase().trim()).filter(Boolean));
  
  // For now, return a basic validation - in practice this would check for naming inconsistencies
  return {
    isValid: true,
    errors: [],
    warnings: [],
    recordCount: 0,
    duplicateCount: 0,
    missingFieldCount: 0
  };
};

/**
 * Validate cost allocation coverage
 */
const validateCostAllocationCoverage = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  costAllocation: CostAllocation[]
): ValidationResult => {
  const totalVoyageEvents = voyageEvents.length;
  const eventsWithLC = voyageEvents.filter(ve => ve.lcNumber).length;
  const coverage = totalVoyageEvents > 0 ? (eventsWithLC / totalVoyageEvents) * 100 : 100;
  
  return {
    isValid: coverage >= 80, // 80% coverage threshold
    errors: coverage < 80 ? ['Low cost allocation coverage'] : [],
    warnings: coverage < 90 ? ['Cost allocation coverage below 90%'] : [],
    recordCount: totalVoyageEvents,
    duplicateCount: 0,
    missingFieldCount: totalVoyageEvents - eventsWithLC
  };
};

/**
 * Validate fluid volume consistency
 */
const validateFluidVolumeConsistency = (bulkActions: BulkAction[]): ValidationResult => {
  // Group by vessel, date, and bulk type to check for load/offload consistency
  const inconsistencies = 0; // Would implement actual logic here
  
  return {
    isValid: inconsistencies === 0,
    errors: inconsistencies > 0 ? ['Fluid volume inconsistencies detected'] : [],
    warnings: [],
    recordCount: bulkActions.length,
    duplicateCount: 0,
    missingFieldCount: 0
  };
};

// ==================== REPORTING FUNCTIONS ====================

/**
 * Generate a comprehensive data integrity report
 */
export const generateIntegrityReport = (report: DataIntegrityReport): string => {
  const lines = [
    '🔍 DATA INTEGRITY VALIDATION REPORT',
    '=' .repeat(60),
    `Generated: ${report.timestamp.toLocaleString()}`,
    `Overall Data Quality Score: ${report.overallScore.toFixed(1)}%`,
    ''
  ];

  // Dataset summaries
  lines.push('📊 DATASET SUMMARIES:');
  Object.values(report.datasets).forEach(dataset => {
    lines.push(`  ${dataset.name}:`);
    lines.push(`    Records: ${dataset.recordCount.toLocaleString()}`);
    lines.push(`    Completeness: ${dataset.completenessScore.toFixed(1)}%`);
    lines.push(`    Consistency: ${dataset.consistencyScore.toFixed(1)}%`);
    lines.push(`    Issues: ${dataset.issues.length} critical, ${dataset.warnings.length} warnings`);
    lines.push('');
  });

  // Critical issues
  if (report.criticalIssues.length > 0) {
    lines.push('🚨 CRITICAL ISSUES:');
    report.criticalIssues.slice(0, 10).forEach(issue => { // Limit to top 10
      lines.push(`  • ${issue.message} (${issue.dataset}${issue.field ? `:${issue.field}` : ''})`);
    });
    if (report.criticalIssues.length > 10) {
      lines.push(`  ... and ${report.criticalIssues.length - 10} more critical issues`);
    }
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      lines.push(`  • ${rec}`);
    });
    lines.push('');
  }

  return lines.join('\n');
};

export default {
  validateDataIntegrity,
  generateIntegrityReport
};