/**
 * Advanced Duplicate Detection Utility
 * Provides sophisticated duplicate detection with proper handling of missing data
 * and detailed reporting for data quality analysis
 */

import { VoyageEvent } from '../types';

export interface DuplicateDetectionResult {
  totalDuplicates: number;
  duplicateGroups: DuplicateGroup[];
  recordsWithoutVoyageNumbers: number;
  voyageNumberAnalysis: VoyageNumberAnalysis;
  summary: string[];
}

export interface DuplicateGroup {
  signature: string;
  count: number;
  records: DuplicateRecord[];
  severityLevel: 'High' | 'Medium' | 'Low';
  explanation: string;
}

export interface DuplicateRecord {
  index: number;
  vessel: string;
  voyageNumber: string;
  event: string;
  parentEvent: string;
  location: string;
  eventDate: string;
  hours: string;
  mission: string;
}

export interface VoyageNumberAnalysis {
  totalRecords: number;
  recordsWithVoyageNumbers: number;
  recordsWithoutVoyageNumbers: number;
  percentageWithoutVoyage: number;
  sampleRecordsWithoutVoyage: Array<{
    vessel: string;
    event: string;
    parentEvent: string;
    location: string;
    mission: string;
    eventType: 'maintenance' | 'port_activity' | 'off_hire' | 'unknown';
  }>;
}

/**
 * Classify the type of event for records without voyage numbers
 */
const classifyEventType = (event: VoyageEvent): 'maintenance' | 'port_activity' | 'off_hire' | 'unknown' => {
  const mission = (event.mission || '').toLowerCase();
  const parentEvent = (event.parentEvent || '').toLowerCase();
  const eventName = (event.event || '').toLowerCase();
  const location = (event.location || '').toLowerCase();
  
  // Maintenance indicators
  if (
    mission.includes('maintenance') ||
    parentEvent.includes('maintenance') ||
    eventName.includes('maintenance') ||
    eventName.includes('repair') ||
    eventName.includes('service') ||
    parentEvent.includes('repair')
  ) {
    return 'maintenance';
  }
  
  // Port/base activity indicators
  if (
    location.includes('fourchon') ||
    location.includes('port') ||
    location.includes('base') ||
    parentEvent.includes('port') ||
    eventName.includes('fuel') ||
    eventName.includes('provisioning') ||
    event.portType === 'base'
  ) {
    return 'port_activity';
  }
  
  // Off-hire indicators
  if (
    mission.includes('offhire') ||
    mission.includes('off-hire') ||
    parentEvent.includes('offhire') ||
    eventName.includes('offhire') ||
    eventName.includes('standby')
  ) {
    return 'off_hire';
  }
  
  return 'unknown';
};

/**
 * Determine the severity level of a duplicate group
 */
const determineSeverityLevel = (group: DuplicateRecord[]): 'High' | 'Medium' | 'Low' => {
  // High severity: Multiple records with voyage numbers that are identical
  const hasVoyageNumbers = group.some(record => record.voyageNumber && record.voyageNumber !== 'undefined');
  const allSameHours = group.every(record => record.hours === group[0].hours);
  const allSameDate = group.every(record => record.eventDate === group[0].eventDate);
  
  if (hasVoyageNumbers && allSameHours && allSameDate && group.length > 2) {
    return 'High';
  }
  
  // Medium severity: Some discrepancies but likely duplicates
  if (group.length > 1 && allSameDate) {
    return 'Medium';
  }
  
  return 'Low';
};

/**
 * Generate explanation for duplicate group
 */
const generateExplanation = (group: DuplicateRecord[]): string => {
  const hasVoyageNumbers = group.some(record => record.voyageNumber && record.voyageNumber !== 'undefined');
  const uniqueHours = [...new Set(group.map(r => r.hours))];
  const uniqueDates = [...new Set(group.map(r => r.eventDate))];
  
  if (!hasVoyageNumbers) {
    return 'Records without voyage numbers - may be legitimate maintenance or port activities';
  }
  
  if (uniqueHours.length === 1 && uniqueDates.length === 1) {
    return 'Identical records detected - likely true duplicates that should be investigated';
  }
  
  if (uniqueDates.length === 1 && uniqueHours.length > 1) {
    return 'Same event on same date with different hours - possible data entry variations';
  }
  
  return 'Similar records detected - review for potential consolidation';
};

/**
 * Advanced duplicate detection for voyage events
 */
export const detectDuplicates = (voyageEvents: VoyageEvent[]): DuplicateDetectionResult => {
  const signatures = new Set<string>();
  const duplicateGroups = new Map<string, DuplicateRecord[]>();
  let recordsWithoutVoyageNumbers = 0;
  
  // First pass: build signatures and identify duplicates
  voyageEvents.forEach((event, index) => {
    // Check for voyage number presence
    const hasVoyageNumber = event.voyageNumber && 
                           event.voyageNumber !== 'undefined' && 
                           event.voyageNumber.trim() !== '';
    
    if (!hasVoyageNumber) {
      recordsWithoutVoyageNumbers++;
    }
    
    // Create normalized fields
    const vessel = (event.vessel || '').trim();
    const voyageNumber = hasVoyageNumber ? event.voyageNumber.trim() : 'NO_VOYAGE';
    const eventName = (event.event || '').trim();
    const parentEvent = (event.parentEvent || '').trim();
    const location = (event.location || '').trim();
    const eventDate = event.eventDate ? event.eventDate.toISOString().split('T')[0] : 'NO_DATE';
    const hours = Number(event.hours || event.finalHours || 0).toFixed(2);
    
    // Create signature
    const signature = `${vessel}|${voyageNumber}|${eventName}|${parentEvent}|${eventDate}|${location}|${hours}`;
    
    const duplicateRecord: DuplicateRecord = {
      index,
      vessel,
      voyageNumber: hasVoyageNumber ? event.voyageNumber : 'undefined',
      event: eventName,
      parentEvent,
      location,
      eventDate,
      hours,
      mission: event.mission || ''
    };
    
    if (signatures.has(signature)) {
      if (!duplicateGroups.has(signature)) {
        duplicateGroups.set(signature, []);
      }
      duplicateGroups.get(signature)!.push(duplicateRecord);
    } else {
      signatures.add(signature);
      // Store the first occurrence
      duplicateGroups.set(signature, [duplicateRecord]);
    }
  });
  
  // Second pass: process duplicate groups and remove single-record groups
  const realDuplicateGroups: DuplicateGroup[] = [];
  let totalDuplicates = 0;
  
  duplicateGroups.forEach((records, signature) => {
    if (records.length > 1) {
      totalDuplicates += records.length - 1; // Don't count the original
      
      const severityLevel = determineSeverityLevel(records);
      const explanation = generateExplanation(records);
      
      realDuplicateGroups.push({
        signature,
        count: records.length,
        records,
        severityLevel,
        explanation
      });
    }
  });
  
  // Sort duplicate groups by severity and count
  realDuplicateGroups.sort((a, b) => {
    const severityOrder = { High: 3, Medium: 2, Low: 1 };
    if (severityOrder[a.severityLevel] !== severityOrder[b.severityLevel]) {
      return severityOrder[b.severityLevel] - severityOrder[a.severityLevel];
    }
    return b.count - a.count;
  });
  
  // Analyze records without voyage numbers
  const samplesWithoutVoyage = voyageEvents
    .filter(e => !e.voyageNumber || e.voyageNumber === 'undefined' || e.voyageNumber.trim() === '')
    .slice(0, 10)
    .map(e => ({
      vessel: e.vessel || '',
      event: e.event || '',
      parentEvent: e.parentEvent || '',
      location: e.location || '',
      mission: e.mission || '',
      eventType: classifyEventType(e)
    }));
  
  const voyageNumberAnalysis: VoyageNumberAnalysis = {
    totalRecords: voyageEvents.length,
    recordsWithVoyageNumbers: voyageEvents.length - recordsWithoutVoyageNumbers,
    recordsWithoutVoyageNumbers,
    percentageWithoutVoyage: (recordsWithoutVoyageNumbers / voyageEvents.length) * 100,
    sampleRecordsWithoutVoyage: samplesWithoutVoyage
  };
  
  // Generate summary
  const summary = [
    `Total voyage events analyzed: ${voyageEvents.length.toLocaleString()}`,
    `Duplicate records found: ${totalDuplicates} (${((totalDuplicates / voyageEvents.length) * 100).toFixed(2)}%)`,
    `Duplicate groups identified: ${realDuplicateGroups.length}`,
    `High severity duplicates: ${realDuplicateGroups.filter(g => g.severityLevel === 'High').length}`,
    `Medium severity duplicates: ${realDuplicateGroups.filter(g => g.severityLevel === 'Medium').length}`,
    `Low severity duplicates: ${realDuplicateGroups.filter(g => g.severityLevel === 'Low').length}`,
    `Records without voyage numbers: ${recordsWithoutVoyageNumbers} (${voyageNumberAnalysis.percentageWithoutVoyage.toFixed(1)}%)`
  ];
  
  return {
    totalDuplicates,
    duplicateGroups: realDuplicateGroups,
    recordsWithoutVoyageNumbers,
    voyageNumberAnalysis,
    summary
  };
};

/**
 * Generate a comprehensive duplicate detection report
 */
export const generateDuplicateReport = (result: DuplicateDetectionResult): string => {
  const lines = [
    '🔍 DUPLICATE DETECTION ANALYSIS REPORT',
    '='.repeat(60),
    '',
    '📊 SUMMARY:',
    ...result.summary.map(line => `  • ${line}`),
    '',
    '🧭 VOYAGE NUMBER ANALYSIS:',
    `  • Records with voyage numbers: ${result.voyageNumberAnalysis.recordsWithVoyageNumbers.toLocaleString()}`,
    `  • Records without voyage numbers: ${result.voyageNumberAnalysis.recordsWithoutVoyageNumbers.toLocaleString()} (${result.voyageNumberAnalysis.percentageWithoutVoyage.toFixed(1)}%)`,
    '',
    '🔍 SAMPLE RECORDS WITHOUT VOYAGE NUMBERS:',
    ...result.voyageNumberAnalysis.sampleRecordsWithoutVoyage.slice(0, 5).map(record => 
      `  • ${record.vessel} - ${record.parentEvent} - ${record.location} (${record.eventType})`
    ),
    ''
  ];
  
  if (result.duplicateGroups.length > 0) {
    lines.push('🚨 DUPLICATE GROUPS (Top 10):');
    result.duplicateGroups.slice(0, 10).forEach((group, index) => {
      lines.push(`  ${index + 1}. ${group.severityLevel} Severity - ${group.count} records`);
      lines.push(`     ${group.explanation}`);
      lines.push(`     Example: ${group.records[0].vessel} - ${group.records[0].event} - ${group.records[0].location}`);
      lines.push('');
    });
  } else {
    lines.push('✅ No duplicate groups detected');
  }
  
  return lines.join('\n');
};

export default {
  detectDuplicates,
  generateDuplicateReport
};