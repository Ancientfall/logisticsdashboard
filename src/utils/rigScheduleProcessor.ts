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
  
  // Convert Sets to Arrays for JSON serialization
  const serializedRigSummary = serializeRigSummary(rigSummary);
  const serializedAssetSummary = serializeAssetSummary(assetSummary);
  
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
    summaryByRig: serializedRigSummary,
    summaryByAsset: serializedAssetSummary
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
 * Serialize rig summary for JSON output (convert Sets to Arrays)
 */
function serializeRigSummary(rigSummary: Record<string, any>): Record<string, any> {
  const serialized: Record<string, any> = {};
  for (const [rigName, summary] of Object.entries(rigSummary)) {
    serialized[rigName] = {
      ...summary,
      activityTypes: summary.activityTypes instanceof Set 
        ? Array.from(summary.activityTypes) 
        : summary.activityTypes
    };
  }
  return serialized;
}

/**
 * Serialize asset summary for JSON output (convert Sets to Arrays)
 */
function serializeAssetSummary(assetSummary: Record<string, any>): Record<string, any> {
  const serialized: Record<string, any> = {};
  for (const [assetName, summary] of Object.entries(assetSummary)) {
    serialized[assetName] = {
      ...summary,
      rigsInvolved: summary.rigsInvolved instanceof Set 
        ? Array.from(summary.rigsInvolved) 
        : summary.rigsInvolved
    };
  }
  return serialized;
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
  
  // Ensure activityTypes is a Set (in case it was serialized to Array)
  if (!(rigSummary[activity.rigName].activityTypes instanceof Set)) {
    rigSummary[activity.rigName].activityTypes = new Set(rigSummary[activity.rigName].activityTypes || []);
  }
  
  rigSummary[activity.rigName].activityTypes.add(activity.activityType);
}

function updateAssetSummary(assetSummary: Record<string, any>, activity: RigActivity): void {
  if (!assetSummary[activity.asset]) {
    assetSummary[activity.asset] = {
      activitiesCount: 0,
      rigsInvolved: new Set()
    };
  }
  
  assetSummary[activity.asset].activitiesCount++;
  
  // Ensure rigsInvolved is a Set (in case it was serialized to Array)
  if (!(assetSummary[activity.asset].rigsInvolved instanceof Set)) {
    assetSummary[activity.asset].rigsInvolved = new Set(assetSummary[activity.asset].rigsInvolved || []);
  }
  
  assetSummary[activity.asset].rigsInvolved.add(activity.rigName);
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
 * Load and process both MEAN and EARLY case scenarios from XLSX files
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
  console.log('🔄 Loading both MEAN and EARLY case scenarios from XLSX files...');
  
  try {
    // Test server connectivity first
    console.log('🔍 Testing server connectivity...');
    const healthResponse = await fetch('/api/excel-files');
    if (!healthResponse.ok) {
      throw new Error(`Excel server not accessible: ${healthResponse.status} ${healthResponse.statusText}`);
    }
    console.log('✅ Excel server is accessible');
    
    // Load MEAN case from XLSX
    console.log('📥 Loading MEAN case from RigScheduleMeanCase.xlsx...');
    const meanCase = await loadRigScheduleXLSX('RigScheduleMeanCase.xlsx', 'MEAN');
    console.log(`✅ MEAN case processed: ${meanCase.activities.length} activities`);
    
    // Debug specific TBD #02 and TBD #07 activities in MEAN case
    const tbdRigNames = ['GOM.TBD #02', 'GOM.TBD #07'];
    const tbdInMeanCase = meanCase.activities.filter(a => 
      tbdRigNames.includes(a.rigName)
    );
    console.log(`🔍 TBD #02 and TBD #07 activities in MEAN case: ${tbdInMeanCase.length}`);
    
    // Check each TBD rig specifically
    tbdRigNames.forEach(tbdRigName => {
      const rigActivities = meanCase.activities.filter(a => a.rigName === tbdRigName);
      console.log(`  ${tbdRigName}: ${rigActivities.length} activities`);
      rigActivities.slice(0, 2).forEach((activity, index) => {
        console.log(`    Activity ${index + 1}: "${activity.activityName}" (${activity.asset})`);
        console.log(`      Start: ${activity.startDate.toISOString().substr(0,10)}, End: ${activity.endDate.toISOString().substr(0,10)}`);
      });
    });
    
    // Load EARLY case from XLSX
    console.log('📥 Loading EARLY case from RigScheduleEarlyCase.xlsx...');
    const earlyCase = await loadRigScheduleXLSX('RigScheduleEarlyCase.xlsx', 'EARLY');
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

/**
 * Load and process rig schedule from XLSX file
 */
async function loadRigScheduleXLSX(fileName: string, scenario: 'MEAN' | 'EARLY'): Promise<ProcessingResult> {
  console.log(`📥 Loading ${scenario} case from ${fileName}...`);
  
  const response = await fetch(`/api/excel-files/${fileName}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  console.log(`📊 ${fileName} loaded: ${arrayBuffer.byteLength} bytes`);
  
  if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
    throw new Error(`${fileName} appears to be empty or too small`);
  }
  
  // Process XLSX data
  return await processRigScheduleXLSX(arrayBuffer, fileName, scenario);
}

/**
 * Process XLSX file data and extract rig schedule activities
 */
async function processRigScheduleXLSX(
  arrayBuffer: ArrayBuffer, 
  fileName: string, 
  scenario: 'MEAN' | 'EARLY'
): Promise<ProcessingResult> {
  // Import XLSX library dynamically to avoid bundle bloat
  const XLSX = await import('xlsx');
  
  const startTime = performance.now();
  const auditTrail: AuditTrailEntry[] = [];
  const activities: RigActivity[] = [];
  let processedRows = 0;
  let validActivities = 0;
  let errors = 0;
  let warnings = 0;

  auditTrail.push({
    timestamp: new Date(),
    action: 'Start XLSX Processing',
    details: `Processing ${fileName} as ${scenario} case scenario`,
    result: 'Initiated'
  });

  console.log(`🔍 Processing XLSX file ${fileName} as ${scenario} case scenario`);

  try {
    // Read XLSX workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellText: false, cellDates: true });
    
    auditTrail.push({
      timestamp: new Date(),
      action: 'Parse XLSX Workbook',
      details: `Found ${workbook.SheetNames.length} worksheets: ${workbook.SheetNames.join(', ')}`,
      result: 'Success'
    });

    console.log(`📊 Found ${workbook.SheetNames.length} worksheets: ${workbook.SheetNames.join(', ')}`);

    // Get the first worksheet (assuming schedule data is there)
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    if (!worksheet) {
      throw new Error(`No data found in worksheet ${worksheetName}`);
    }

    // Convert worksheet to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Use array format to preserve exact headers
      raw: false, // Don't use raw values to get formatted text
      dateNF: 'yyyy-mm-dd' // Date number format
    }) as any[][];

    if (jsonData.length < 2) {
      throw new Error('XLSX file appears to be empty or contains only headers');
    }

    const headers = jsonData[0] as string[];
    console.log(`📋 Headers found: ${headers.slice(0, 5).join(', ')}...`);
    
    // Debug: Check for TBD data in raw Excel rows
    const tbdRawRows = jsonData.slice(1).filter((row, index) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((header, colIndex) => {
        rowObj[header] = row[colIndex];
      });
      return String(rowObj['GWDXAG-Rig Name'] || '').toLowerCase().includes('tbd') ||
             String(rowObj['GWDXAG-Asset'] || '').toLowerCase().includes('tbd') ||
             String(rowObj['Activity Name'] || '').toLowerCase().includes('tbd');
    });
    
    console.log(`🔍 TBD entries found in ${fileName}: ${tbdRawRows.length}`);
    tbdRawRows.slice(0, 5).forEach((row, index) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((header, colIndex) => {
        rowObj[header] = row[colIndex];
      });
      console.log(`  TBD Raw ${index + 1}:`);
      console.log(`    - Rig Name: "${rowObj['GWDXAG-Rig Name']}"`);
      console.log(`    - Asset: "${rowObj['GWDXAG-Asset']}"`);
      console.log(`    - Activity: "${rowObj['Activity Name']}"`);
      console.log(`    - Start: "${rowObj['(*)Start']}"`);
      console.log(`    - Finish: "${rowObj['(*)Finish']}"`);
    });
    
    auditTrail.push({
      timestamp: new Date(),
      action: 'Parse XLSX Headers',
      details: `Found ${headers.length} columns`,
      dataAffected: headers.slice(0, 10).join(', ') + (headers.length > 10 ? '...' : '')
    });

    // Validate required columns - updated to match actual XLSX structure
    const requiredColumns = [
      'Activity Name', 'GWDXAG-Rig Name', 
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

    for (let i = 1; i < jsonData.length; i++) {
      processedRows++;
      const rowData = jsonData[i];
      
      if (!rowData || rowData.length < headers.length) {
        console.warn(`⚠️ Row ${i + 1}: Incomplete data (${rowData?.length || 0}/${headers.length} fields)`);
        warnings++;
        continue;
      }

      // Create row object by mapping headers to values
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = rowData[index] || '';
      });

      // Skip if marked for deletion
      if (row['Delete This Row'] && String(row['Delete This Row']).toLowerCase() === 'yes') {
        auditTrail.push({
          timestamp: new Date(),
          action: 'Skip Row',
          details: `Row ${i + 1} marked for deletion`,
          dataAffected: String(row['Activity ID'])
        });
        continue;
      }

      try {
        const activity = processXLSXActivityRow(row, i + 1, scenario, validationIssues);
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
      action: 'Complete XLSX Processing',
      details: `Processed ${processedRows} rows, created ${validActivities} activities`,
      result: `${errors} errors, ${warnings} warnings`
    });

    console.log(`✅ XLSX processing completed in ${processingTimeMs.toFixed(0)}ms`);
    console.log(`📊 Results: ${validActivities}/${processedRows} activities processed successfully`);
    
    // Debug: Check TBD activities in final processed results
    const tbdProcessedActivities = activities.filter(activity => 
      activity.rigName?.toLowerCase().includes('tbd') ||
      activity.asset?.toLowerCase().includes('tbd') ||
      activity.activityName?.toLowerCase().includes('tbd')
    );
    
    console.log(`🔍 TBD activities in final processed results from ${fileName}: ${tbdProcessedActivities.length}`);
    tbdProcessedActivities.forEach((activity, index) => {
      console.log(`  TBD Activity ${index + 1}:`);
      console.log(`    - ID: "${activity.id}"`);
      console.log(`    - Rig Name: "${activity.rigName}"`);
      console.log(`    - Asset: "${activity.asset}"`);
      console.log(`    - Activity: "${activity.activityName}"`);
      console.log(`    - Start: "${activity.startDate.toISOString().substring(0, 10)}"`);
      console.log(`    - End: "${activity.endDate.toISOString().substring(0, 10)}"`);
      console.log(`    - Activity Type: "${activity.activityType}"`);
      console.log(`    - Duration Days: ${activity.durationDays} days`);
    });
    
    // Convert Sets to Arrays for JSON serialization
    const serializedRigSummary = serializeRigSummary(rigSummary);
    const serializedAssetSummary = serializeAssetSummary(assetSummary);
    
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
      summaryByRig: serializedRigSummary,
      summaryByAsset: serializedAssetSummary
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

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown XLSX processing error';
    console.error(`❌ XLSX processing error: ${errorMsg}`);
    
    auditTrail.push({
      timestamp: new Date(),
      action: 'XLSX Processing Error',
      details: errorMsg,
      result: 'Failed'
    });
    
    throw error;
  }
}

/**
 * Process individual activity row from XLSX data with enhanced validation
 */
function processXLSXActivityRow(
  row: Record<string, any>, 
  rowNumber: number, 
  scenario: 'MEAN' | 'EARLY',
  validationIssues: ValidationIssue[]
): RigActivity | null {
  
  // Debug TBD rows specifically
  const isTBDRow = String(row['GWDXAG-Rig Name'] || '').toLowerCase().includes('tbd') ||
                   String(row['GWDXAG-Asset'] || '').toLowerCase().includes('tbd') ||
                   String(row['Activity Name'] || '').toLowerCase().includes('tbd');
  
  if (isTBDRow) {
    console.log(`🔍 Processing TBD Row ${rowNumber}:`);
    console.log(`    - Rig Name: "${row['GWDXAG-Rig Name']}"`);
    console.log(`    - Asset: "${row['GWDXAG-Asset']}"`);
    console.log(`    - Activity: "${row['Activity Name']}"`);
    console.log(`    - Activity Type: "${row['GWDXAG-Rig Activity Type']}"`);
    console.log(`    - Start: "${row['(*)Start']}"`);
    console.log(`    - Finish: "${row['(*)Finish']}"`);
  }
  
  // Generate Activity ID from row number and activity name if not present
  const activityId = row['Activity ID'] || `activity_${rowNumber}_${String(row['Activity Name'] || 'unnamed').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}`;

  if (!row['GWDXAG-Rig Name']) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Rig Name',
      issue: 'Missing Rig Name',
      severity: 'Critical'
    });
    if (isTBDRow) {
      console.log(`    ❌ TBD Row ${rowNumber}: Missing Rig Name`);
    }
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
  const activityTypeRaw = String(row['GWDXAG-Rig Activity Type']);
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

  // Parse dates - handle both Date objects and string formats
  let startDate: Date;
  let endDate: Date;
  
  try {
    const startValue = row['(*)Start'];
    if (startValue instanceof Date) {
      startDate = startValue;
    } else {
      startDate = new Date(String(startValue));
    }
    if (isNaN(startDate.getTime())) throw new Error('Invalid start date format');
  } catch (error) {
    validationIssues.push({
      row: rowNumber,
      field: '(*)Start',
      issue: `Invalid start date: ${row['(*)Start']}`,
      severity: 'Critical',
      suggestedFix: 'Use valid date format'
    });
    return null;
  }

  try {
    const finishValue = row['(*)Finish'];
    if (finishValue instanceof Date) {
      endDate = finishValue;
    } else {
      endDate = new Date(String(finishValue));
    }
    if (isNaN(endDate.getTime())) throw new Error('Invalid end date format');
  } catch (error) {
    validationIssues.push({
      row: rowNumber,
      field: '(*)Finish',
      issue: `Invalid end date: ${row['(*)Finish']}`,
      severity: 'Critical',
      suggestedFix: 'Use valid date format'
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

  // Enhanced rig name processing with mapping
  const rigNameRaw = String(row['GWDXAG-Rig Name']);
  const rigName = mapRigName(rigNameRaw);
  
  // Debug specific rig mappings
  if (rigNameRaw === 'GOM.PDQ' || rigNameRaw.includes('TBD')) {
    console.log(`🔍 Rig mapping: "${rigNameRaw}" → "${rigName}"`);
  }
  
  if (!rigName) {
    validationIssues.push({
      row: rowNumber,
      field: 'GWDXAG-Rig Name',
      issue: `Unable to map rig name: ${rigNameRaw}`,
      severity: 'Warning'
    });
  }

  // Asset processing
  const asset = String(row['GWDXAG-Asset'] || 'Unknown Asset');

  // Activity name processing for batch detection
  const activityName = String(row['Activity Name'] || row['GWDXAU-Activity Short Name'] || 'Unnamed Activity');

  // Create enhanced activity object
  const activity: RigActivity & { 
    isBatchOperation?: boolean; 
    vesselCapability?: number; 
    demandMultiplier?: number;
  } = {
    id: activityId,
    rigName: rigName || rigNameRaw,
    activityType: activityType,
    activityName: activityName,
    asset: asset,
    startDate,
    endDate,
    durationDays,
    scenario,
    // Enhanced properties for vessel demand calculations
    isBatchOperation: detectBatchOperation(activityName),
    vesselCapability: getVesselCapabilityByAsset(asset),
    demandMultiplier: calculateDemandMultiplier(activityName, asset)
  };

  // Debug success for TBD activities
  if (isTBDRow) {
    console.log(`    ✅ TBD Row ${rowNumber}: Successfully created activity`);
    console.log(`        - Final Rig Name: "${activity.rigName}"`);
    console.log(`        - Final Asset: "${activity.asset}"`);
    console.log(`        - Final Activity: "${activity.activityName}"`);
    console.log(`        - Final ID: "${activity.id}"`);
    console.log(`        - Date Range: ${activity.startDate.toISOString().substring(0, 10)} to ${activity.endDate.toISOString().substring(0, 10)}`);
    console.log(`        - Batch Operation: ${activity.isBatchOperation}`);
    console.log(`        - Vessel Capability: ${activity.vesselCapability}`);
    console.log(`        - Demand Multiplier: ${activity.demandMultiplier}`);
  }

  return activity as RigActivity;
}

/**
 * Map raw rig names to standardized names
 */
function mapRigName(rawName: string): string {
  const RIG_NAME_MAPPINGS: Record<string, string> = {
    // Exact mappings from Excel GWDXAG-Rig Name column
    'Transocean.Invictus': 'Deepwater Invictus',
    'GOM.Atlas': 'Deepwater Atlas',
    'GOM.Black Hornet': 'Ocean Blackhornet',
    'GOM.BlackLion': 'Ocean BlackLion',
    'GOM.IceMax': 'Stena IceMAX',
    'GOM.LWI.ISLVEN': 'Island Venture',
    'GOM.Mad Dog SPAR': 'Mad Dog Drilling',
    'GOM.PDQ': 'Thunderhorse Drilling',
    'GOM.Q5000': 'Q5000',
    'GOM.TBD#02': 'TBD #02',
    'GOM.TBD#07': 'TBD #07',
    
    // Legacy/alternative formats for backward compatibility
    'Transocean Invictus': 'Deepwater Invictus',
    'GOM.Ice Max': 'Stena IceMAX',
    'GOM.LWI ISLVEN': 'Island Venture',
    'INVICTUS': 'Deepwater Invictus',
    'ATLAS': 'Deepwater Atlas',
    'Black Hornet': 'Ocean Blackhornet',
    'Black Lion': 'Ocean BlackLion',
    'STENA ICEMAX': 'Stena IceMAX',
    'Mad Dog Spar': 'Mad Dog Drilling',
    'TH PDQ': 'Thunderhorse Drilling',
    'TBD #7': 'TBD #07',
    'TBD #2': 'TBD #02',
    'Intervention Vessel TBD': 'Island Venture'
  };

  // Direct mapping
  if (RIG_NAME_MAPPINGS[rawName]) {
    return RIG_NAME_MAPPINGS[rawName];
  }

  // Fuzzy matching
  const normalizedInput = rawName.toLowerCase().trim();
  for (const [key, value] of Object.entries(RIG_NAME_MAPPINGS)) {
    if (normalizedInput.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalizedInput)) {
      return value;
    }
  }

  return rawName; // Return original if no mapping found
}

/**
 * Detect if activity is a batch operation
 */
function detectBatchOperation(activityName: string): boolean {
  const batchKeywords = ['batch', 'batch set'];
  const activityLower = activityName.toLowerCase();
  return batchKeywords.some(keyword => activityLower.includes(keyword));
}

/**
 * Get vessel capability based on asset location
 */
function getVesselCapabilityByAsset(asset: string): number {
  const ultraDeepAssets = ['GOM.Tiber', 'GOM.Kaskida', 'GOM.Paleogene'];
  return ultraDeepAssets.includes(asset) ? 4.9 : 6.5;
}

/**
 * Calculate demand multiplier based on batch operation and asset location
 */
function calculateDemandMultiplier(activityName: string, asset: string): number {
  const isBatch = detectBatchOperation(activityName);
  const ultraDeepAssets = ['GOM.Tiber', 'GOM.Kaskida', 'GOM.Paleogene'];
  
  if (isBatch) {
    return ultraDeepAssets.includes(asset) ? 3 : 2; // 3x for ultra-deep, 2x for standard
  }
  
  return 1; // Standard drilling demand
}