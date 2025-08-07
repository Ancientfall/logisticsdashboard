/**
 * Rig Schedule CSV Processor - Auditable with Full Traceability
 * 
 * Processes MEAN and EARLY case rig schedule CSV files with complete audit trail
 * for management transparency. Every processing step is logged and validated.
 */

import { RigActivity } from '../types/vesselForecast';

// ==================== PROCESSING INTERFACES ====================

export interface ProcessingResult {
  activities: RigActivity[];
  processingReport: ProcessingReport;
  validationResults: ValidationResults;
  auditTrail: AuditTrailEntry[];
}

export interface ProcessingReport {
  fileName: string;
  scenario: 'MEAN' | 'EARLY';
  totalRowsProcessed: number;
  validActivitiesCreated: number;
  errorsEncountered: number;
  warningsIssued: number;
  processingTimeMs: number;
  dataQualityScore: number; // 0-100
  summaryByRig: Record<string, {
    activitiesCount: number;
    totalDurationHours: number;
    activityTypes: string[];
  }>;
  summaryByAsset: Record<string, {
    activitiesCount: number;
    rigsInvolved: string[];
  }>;
}

export interface ValidationResults {
  criticalErrors: ValidationIssue[];
  warnings: ValidationIssue[];
  dataQualityChecks: Array<{
    check: string;
    result: 'Pass' | 'Fail' | 'Warning';
    details: string;
    count?: number;
  }>;
  recommendedActions: string[];
}

export interface ValidationIssue {
  row: number;
  field: string;
  issue: string;
  severity: 'Critical' | 'Warning';
  suggestedFix?: string;
}

export interface AuditTrailEntry {
  timestamp: Date;
  action: string;
  details: string;
  dataAffected?: string;
  result?: string;
}

// ==================== CSV FIELD MAPPING ====================

interface RawCSVRow {
  'Activity ID': string;
  'Activity Status': string;
  'WBS Code': string;
  '(*)WBS Name': string;
  'Activity Name': string;
  'GWDXAU-Activity Short Name': string;
  '(*)Start': string;
  '(*)Finish': string;
  'Original Duration(h)': string;
  'GWDXAG-Asset': string;
  'GWDXAG-Rig Name': string;
  'GWDXAG-Region': string;
  'GWDXAG-Well Type': string;
  'GWDXAG-Rig Activity Type': string;
  'GWDXAG-FM Status': string;
  'GWDXAG-Rig Contractor': string;
  'GWDXAG-Rig Type': string;
  'Delete This Row': string;
}

// ==================== KNOWN ACTIVITY TYPES ====================

const VALID_ACTIVITY_TYPES = ['RSU', 'DRL', 'CPL', 'RM', 'WWP', 'WS', 'P&A', 'MOB', 'WWI', 'TAR'];
const KNOWN_ASSETS = ['GOM.Atlantis', 'GOM.ThunderHorse', 'GOM.MadDog'];
const EXPECTED_RIGS = ['Rig Alpha', 'Rig Beta', 'Rig Gamma'];

// ==================== MAIN PROCESSOR FUNCTIONS ====================

/**
 * Process rig schedule CSV with full audit trail and management reporting
 */
export async function processRigScheduleCSV(
  csvContent: string, 
  fileName: string
): Promise<ProcessingResult> {
  const startTime = performance.now();
  const auditTrail: AuditTrailEntry[] = [];
  const activities: RigActivity[] = [];
  let processedRows = 0;
  let validActivities = 0;
  let errors = 0;
  let warnings = 0;

  // Determine scenario from filename
  const scenario: 'MEAN' | 'EARLY' = fileName.toLowerCase().includes('early') ? 'EARLY' : 'MEAN';
  
  auditTrail.push({
    timestamp: new Date(),
    action: 'Start Processing',
    details: `Processing ${fileName} as ${scenario} case scenario`,
    result: 'Initiated'
  });

  console.log(`🔍 Processing ${fileName} as ${scenario} case scenario`);

  // Parse CSV content
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file appears to be empty or contains only headers');
  }

  const headers = parseCSVLine(lines[0]);
  auditTrail.push({
    timestamp: new Date(),
    action: 'Parse Headers',
    details: `Found ${headers.length} columns`,
    dataAffected: headers.join(', ')
  });

  console.log(`📊 Found ${headers.length} columns in CSV`);
  console.log(`📋 Headers: ${headers.slice(0, 5).join(', ')}...`);

  // Validate required columns
  const requiredColumns = [
    'Activity ID', 'Activity Name', 'GWDXAG-Rig Name', 
    'GWDXAG-Rig Activity Type', 'GWDXAG-Asset', 
    '(*)Start', '(*)Finish'
  ];
  
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    const errorMsg = `Missing required columns: ${missingColumns.join(', ')}`;
    auditTrail.push({
      timestamp: new Date(),
      action: 'Column Validation',
      details: errorMsg,
      result: 'Failed'
    });
    throw new Error(errorMsg);
  }

  auditTrail.push({
    timestamp: new Date(),
    action: 'Column Validation',
    details: 'All required columns present',
    result: 'Passed'
  });

  // Process data rows
  const validationIssues: ValidationIssue[] = [];
  const rigSummary: Record<string, any> = {};
  const assetSummary: Record<string, any> = {};

  for (let i = 1; i < lines.length; i++) {
    processedRows++;
    const rowData = parseCSVLine(lines[i]);
    
    if (rowData.length < headers.length) {
      console.warn(`⚠️ Row ${i + 1}: Incomplete data (${rowData.length}/${headers.length} fields)`);
      warnings++;
      continue;
    }

    // Create row object
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = rowData[index] || '';
    });

    // Skip if marked for deletion
    if (row['Delete This Row'] && row['Delete This Row'].toLowerCase() === 'yes') {
      auditTrail.push({
        timestamp: new Date(),
        action: 'Skip Row',
        details: `Row ${i + 1} marked for deletion`,
        dataAffected: row['Activity ID']
      });
      continue;
    }

    try {
      const activity = processActivityRow(row as unknown as RawCSVRow, i + 1, scenario, validationIssues);
      if (activity) {
        activities.push(activity);
        validActivities++;
        
        // Update summaries
        updateRigSummary(rigSummary, activity);
        updateAssetSummary(assetSummary, activity);
        
        auditTrail.push({
          timestamp: new Date(),
          action: 'Process Activity',
          details: `Successfully processed ${activity.activityName}`,
          dataAffected: `${activity.rigName} - ${activity.activityType}`,
          result: 'Success'
        });
      }
    } catch (error) {
      errors++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Row ${i + 1} processing error: ${errorMsg}`);
      
      validationIssues.push({
        row: i + 1,
        field: 'General',
        issue: errorMsg,
        severity: 'Critical'
      });
      
      auditTrail.push({
        timestamp: new Date(),
        action: 'Process Activity',
        details: `Failed to process row ${i + 1}: ${errorMsg}`,
        result: 'Error'
      });
    }
  }

  const processingTimeMs = performance.now() - startTime;
  
  auditTrail.push({
    timestamp: new Date(),
    action: 'Complete Processing',
    details: `Processed ${processedRows} rows, created ${validActivities} activities`,
    result: `${errors} errors, ${warnings} warnings`
  });

  console.log(`✅ Processing completed in ${processingTimeMs.toFixed(0)}ms`);
  console.log(`📊 Results: ${validActivities}/${processedRows} activities processed successfully`);
  
  // Generate comprehensive results
  const processingReport: ProcessingReport = {
    fileName,
    scenario,
    totalRowsProcessed: processedRows,
    validActivitiesCreated: validActivities,
    errorsEncountered: errors,
    warningsIssued: warnings,
    processingTimeMs,
    dataQualityScore: calculateDataQualityScore(validActivities, errors, warnings, processedRows),
    summaryByRig: rigSummary,
    summaryByAsset: assetSummary
  };

  const validationResults: ValidationResults = {
    criticalErrors: validationIssues.filter(issue => issue.severity === 'Critical'),
    warnings: validationIssues.filter(issue => issue.severity === 'Warning'),
    dataQualityChecks: generateDataQualityChecks(activities, validationIssues),
    recommendedActions: generateRecommendedActions(validationIssues, processingReport)
  };

  return {
    activities,
    processingReport,
    validationResults,
    auditTrail
  };
}

/**
 * Process individual activity row with validation
 */
function processActivityRow(
  row: RawCSVRow, 
  rowNumber: number, 
  scenario: 'MEAN' | 'EARLY',
  validationIssues: ValidationIssue[]
): RigActivity | null {
  
  // Validate required fields
  if (!row['Activity ID']) {
    validationIssues.push({
      row: rowNumber,
      field: 'Activity ID',
      issue: 'Missing Activity ID',
      severity: 'Critical'
    });
    return null;
  }

  if (!row['GWDXAG-Rig Name']) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Rig Name',
      issue: 'Missing Rig Name',
      severity: 'Critical'
    });
    return null;
  }

  if (!row['GWDXAG-Rig Activity Type']) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Rig Activity Type',
      issue: 'Missing Activity Type',
      severity: 'Critical'
    });
    return null;
  }

  // Validate activity type
  const activityTypeRaw = row['GWDXAG-Rig Activity Type'];
  console.log(`  🔍 Processing activity type: "${activityTypeRaw}" for row ${rowNumber}`);
  
  if (!activityTypeRaw || !VALID_ACTIVITY_TYPES.includes(activityTypeRaw)) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Rig Activity Type',
      issue: `Invalid activity type: "${activityTypeRaw}". Expected one of: ${VALID_ACTIVITY_TYPES.join(', ')}`,
      severity: 'Critical',
      suggestedFix: `Use one of: ${VALID_ACTIVITY_TYPES.join(', ')}`
    });
    return null;
  }
  
  const activityType = activityTypeRaw as 'RSU' | 'DRL' | 'CPL' | 'RM' | 'WWP' | 'WS' | 'P&A' | 'MOB' | 'WWI' | 'TAR';

  // Parse dates
  let startDate: Date;
  let endDate: Date;
  
  try {
    startDate = new Date(row['(*)Start']);
    if (isNaN(startDate.getTime())) throw new Error('Invalid start date format');
  } catch (error) {
    validationIssues.push({
      row: rowNumber,
      field: '(*)Start',
      issue: `Invalid start date: ${row['(*)Start']}`,
      severity: 'Critical',
      suggestedFix: 'Use ISO format: YYYY-MM-DDTHH:mm:ss'
    });
    return null;
  }

  try {
    endDate = new Date(row['(*)Finish']);
    if (isNaN(endDate.getTime())) throw new Error('Invalid end date format');
  } catch (error) {
    validationIssues.push({
      row: rowNumber,
      field: '(*)Finish',
      issue: `Invalid end date: ${row['(*)Finish']}`,
      severity: 'Critical',
      suggestedFix: 'Use ISO format: YYYY-MM-DDTHH:mm:ss'
    });
    return null;
  }

  // Validate date logic
  if (startDate >= endDate) {
    validationIssues.push({
      row: rowNumber,
      field: 'Date Range',
      issue: 'Start date must be before end date',
      severity: 'Critical'
    });
    return null;
  }

  // Calculate duration
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  // Validate rig name
  if (!EXPECTED_RIGS.includes(row['GWDXAG-Rig Name'])) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Rig Name',
      issue: `Unexpected rig name: ${row['GWDXAG-Rig Name']}`,
      severity: 'Warning',
      suggestedFix: `Expected one of: ${EXPECTED_RIGS.join(', ')}`
    });
  }

  // Validate asset
  if (!KNOWN_ASSETS.includes(row['GWDXAG-Asset'])) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Asset',
      issue: `Unexpected asset: ${row['GWDXAG-Asset']}`,
      severity: 'Warning',
      suggestedFix: `Expected one of: ${KNOWN_ASSETS.join(', ')}`
    });
  }

  // Create activity object
  const activity: RigActivity = {
    id: row['Activity ID'],
    rigName: row['GWDXAG-Rig Name'],
    activityType: activityType,
    activityName: row['Activity Name'] || row['GWDXAU-Activity Short Name'] || 'Unnamed Activity',
    asset: row['GWDXAG-Asset'] || 'Unknown Asset',
    startDate,
    endDate,
    durationDays,
    scenario
  };

  return activity;
}

/**
 * Helper functions for processing
 */
function parseCSVLine(line: string): string[] {
  // Simple CSV parser - handles quoted fields
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function updateRigSummary(rigSummary: Record<string, any>, activity: RigActivity): void {
  if (!rigSummary[activity.rigName]) {
    rigSummary[activity.rigName] = {
      activitiesCount: 0,
      totalDurationHours: 0,
      activityTypes: new Set()
    };
  }
  
  rigSummary[activity.rigName].activitiesCount++;
  rigSummary[activity.rigName].totalDurationHours += activity.durationDays * 24;
  rigSummary[activity.rigName].activityTypes.add(activity.activityType);
  
  // Convert Set to Array for JSON serialization
  rigSummary[activity.rigName].activityTypes = Array.from(rigSummary[activity.rigName].activityTypes);
}

function updateAssetSummary(assetSummary: Record<string, any>, activity: RigActivity): void {
  if (!assetSummary[activity.asset]) {
    assetSummary[activity.asset] = {
      activitiesCount: 0,
      rigsInvolved: new Set()
    };
  }
  
  assetSummary[activity.asset].activitiesCount++;
  assetSummary[activity.asset].rigsInvolved.add(activity.rigName);
  
  // Convert Set to Array for JSON serialization
  assetSummary[activity.asset].rigsInvolved = Array.from(assetSummary[activity.asset].rigsInvolved);
}

function calculateDataQualityScore(valid: number, errors: number, warnings: number, total: number): number {
  const successRate = valid / total;
  const errorPenalty = (errors / total) * 50;
  const warningPenalty = (warnings / total) * 20;
  
  return Math.max(0, Math.min(100, (successRate * 100) - errorPenalty - warningPenalty));
}

function generateDataQualityChecks(activities: RigActivity[], issues: ValidationIssue[]): Array<{
  check: string;
  result: 'Pass' | 'Fail' | 'Warning';
  details: string;
  count?: number;
}> {
  const checks: Array<{
    check: string;
    result: 'Pass' | 'Fail' | 'Warning';
    details: string;
    count?: number;
  }> = [];
  
  // Check for complete data
  checks.push({
    check: 'All activities have required fields',
    result: issues.filter(i => i.severity === 'Critical').length === 0 ? 'Pass' : 'Fail',
    details: `${issues.filter(i => i.severity === 'Critical').length} critical issues found`
  });
  
  // Check activity type coverage
  const uniqueActivityTypes = new Set(activities.map(a => a.activityType));
  checks.push({
    check: 'Activity type diversity',
    result: uniqueActivityTypes.size >= 3 ? 'Pass' : 'Warning',
    details: `${uniqueActivityTypes.size} unique activity types found`,
    count: uniqueActivityTypes.size
  });
  
  // Check date range coverage
  if (activities.length > 0) {
    const startDates = activities.map(a => a.startDate.getTime());
    const endDates = activities.map(a => a.endDate.getTime());
    const rangeDays = (Math.max(...endDates) - Math.min(...startDates)) / (1000 * 60 * 60 * 24);
    
    checks.push({
      check: 'Forecast horizon coverage',
      result: rangeDays >= 365 ? 'Pass' : 'Warning',
      details: `${Math.round(rangeDays)} days of schedule coverage`,
      count: Math.round(rangeDays)
    });
  }
  
  return checks;
}

function generateRecommendedActions(issues: ValidationIssue[], report: ProcessingReport): string[] {
  const actions: string[] = [];
  
  if (report.errorsEncountered > 0) {
    actions.push(`Review and fix ${report.errorsEncountered} critical data errors before using for forecasting`);
  }
  
  if (report.warningsIssued > 5) {
    actions.push(`Consider standardizing data entry to reduce ${report.warningsIssued} validation warnings`);
  }
  
  if (report.dataQualityScore < 80) {
    actions.push('Improve data quality before making critical business decisions based on this forecast');
  }
  
  if (Object.keys(report.summaryByRig).length < 3) {
    actions.push('Verify all expected rigs are included in the schedule');
  }
  
  return actions;
}

/**
 * Load and process both MEAN and EARLY case scenarios
 */
export async function loadBothScenarios(): Promise<{
  meanCase: ProcessingResult;
  earlyCase: ProcessingResult;
  comparisonReport: {
    meanActivities: number;
    earlyActivities: number;
    activitiesDelta: number;
    dataQualityComparison: string;
  };
}> {
  console.log('🔄 Loading both MEAN and EARLY case scenarios...');
  
  try {
    // Test server connectivity first
    console.log('🔍 Testing server connectivity...');
    const healthResponse = await fetch('/api/excel-files');
    if (!healthResponse.ok) {
      throw new Error(`Excel server not accessible: ${healthResponse.status} ${healthResponse.statusText}`);
    }
    console.log('✅ Excel server is accessible');
    
    // Load MEAN case
    console.log('📥 Loading MEAN case CSV...');
    const meanResponse = await fetch('/api/excel-files/Excel Rig Schedule Data 2(MEAN CASE).csv', {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });
    
    if (!meanResponse.ok) {
      throw new Error(`Failed to load MEAN case: ${meanResponse.status} ${meanResponse.statusText}`);
    }
    
    const meanCSV = await meanResponse.text();
    console.log(`📊 MEAN CSV loaded: ${meanCSV.length} characters`);
    
    if (!meanCSV || meanCSV.length < 100) {
      throw new Error('MEAN case CSV appears to be empty or too short');
    }
    
    const meanCase = await processRigScheduleCSV(meanCSV, 'Excel Rig Schedule Data 2(MEAN CASE).csv');
    console.log(`✅ MEAN case processed: ${meanCase.activities.length} activities`);
    
    // Load EARLY case
    console.log('📥 Loading EARLY case CSV...');
    const earlyResponse = await fetch('/api/excel-files/Excel Rig Schedule Data 2(EARLY CASE).csv', {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });
    
    if (!earlyResponse.ok) {
      throw new Error(`Failed to load EARLY case: ${earlyResponse.status} ${earlyResponse.statusText}`);
    }
    
    const earlyCSV = await earlyResponse.text();
    console.log(`📊 EARLY CSV loaded: ${earlyCSV.length} characters`);
    
    if (!earlyCSV || earlyCSV.length < 100) {
      throw new Error('EARLY case CSV appears to be empty or too short');
    }
    
    const earlyCase = await processRigScheduleCSV(earlyCSV, 'Excel Rig Schedule Data 2(EARLY CASE).csv');
    console.log(`✅ EARLY case processed: ${earlyCase.activities.length} activities`);
    
    // Generate comparison report
    const comparisonReport = {
      meanActivities: meanCase.activities.length,
      earlyActivities: earlyCase.activities.length,
      activitiesDelta: earlyCase.activities.length - meanCase.activities.length,
      dataQualityComparison: meanCase.processingReport.dataQualityScore > earlyCase.processingReport.dataQualityScore 
        ? 'MEAN case has better data quality' 
        : earlyCase.processingReport.dataQualityScore > meanCase.processingReport.dataQualityScore 
        ? 'EARLY case has better data quality'
        : 'Both cases have similar data quality'
    };
    
    console.log('✅ Both scenarios loaded successfully');
    console.log(`📊 MEAN: ${meanCase.activities.length} activities, EARLY: ${earlyCase.activities.length} activities`);
    console.log(`📈 Data quality: MEAN ${meanCase.processingReport.dataQualityScore}/100, EARLY ${earlyCase.processingReport.dataQualityScore}/100`);
    
    return { meanCase, earlyCase, comparisonReport };
    
  } catch (error) {
    console.error('❌ Error loading scenarios:', error);
    
    // Provide specific error details for debugging
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('💡 Network error: This suggests the Excel server (port 5001) is not running or accessible');
      console.error('💡 Try: 1) Check if Excel server is running, 2) Check React dev server proxy configuration');
    }
    
    throw error;
  }
}