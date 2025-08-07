import { RigScheduleEntry } from '../../types';
import { parseDate } from '../dateUtils';
import { safeNumeric } from '../helpers';

/**
 * Rig Schedule Data Processor
 * Processes vessel schedule Excel files for the vessel forecast dashboard
 */

// Raw rig schedule interface - matches expected Excel column structure
interface RawRigScheduleEntry {
  // Core identifiers
  "Rig Name": string;
  "Activity Name": string;
  "Activity Type": string;
  "Well Type"?: string;
  
  // Timing information
  "Start Date": string;
  "Finish Date": string;
  "Original Duration": number;
  "Actual Duration"?: number;
  "Timing": string; // P10 or P50
  
  // Location information
  "Location": string;
  "Field Name"?: string;
  "Platform"?: string;
  "Water Depth"?: number;
  
  // Vessel impact factors
  "Fluid Intensity": string;
  "Logistics Complexity": string;
  "Weather Sensitivity"?: string;
  
  // Business context
  "Priority": string;
  "Project Code"?: string;
  "Cost Center"?: string;
  
  // Metadata
  "Schedule Version": string;
  "Last Updated"?: string;
  "Confidence": number;
  "Assumptions"?: string;
}

/**
 * Validate and normalize activity type
 */
const normalizeActivityType = (activityType: string): RigScheduleEntry['rigActivityType'] => {
  if (!activityType) return 'Drilling';
  
  const normalized = activityType.trim().toLowerCase();
  
  if (normalized.includes('drill')) return 'Drilling';
  if (normalized.includes('completion') || normalized.includes('complete')) return 'Completion';
  if (normalized.includes('workover') || normalized.includes('work over')) return 'Workover';
  if (normalized.includes('maintenance') || normalized.includes('maint')) return 'Maintenance';
  if (normalized.includes('p&a') || normalized.includes('plug') || normalized.includes('abandon')) return 'P&A';
  if (normalized.includes('sidetrack') || normalized.includes('side track')) return 'Sidetrack';
  if (normalized.includes('stimulation') || normalized.includes('stim') || normalized.includes('frac')) return 'Stimulation';
  
  // Default to drilling for unknown types
  return 'Drilling';
};

/**
 * Validate and normalize well type
 */
const normalizeWellType = (wellType: string): RigScheduleEntry['wellType'] => {
  if (!wellType) return 'Development';
  
  const normalized = wellType.trim().toLowerCase();
  
  if (normalized.includes('development') || normalized.includes('dev')) return 'Development';
  if (normalized.includes('exploration') || normalized.includes('exp') || normalized.includes('explore')) return 'Exploration';
  if (normalized.includes('injection') || normalized.includes('inject')) {
    if (normalized.includes('water')) return 'Water_Injection';
    if (normalized.includes('gas')) return 'Gas_Injection';
    return 'Injection';
  }
  if (normalized.includes('p&a') || normalized.includes('plug') || normalized.includes('abandon')) return 'P&A';
  
  // Default to development for unknown types
  return 'Development';
};

/**
 * Validate and normalize fluid intensity
 */
const normalizeFluidIntensity = (intensity: string): RigScheduleEntry['fluidIntensity'] => {
  if (!intensity) return 'Medium';
  
  const normalized = intensity.trim().toLowerCase();
  
  if (normalized.includes('low')) return 'Low';
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('critical') || normalized.includes('extreme')) return 'Critical';
  
  return 'Medium';
};

/**
 * Validate and normalize logistics complexity
 */
const normalizeLogisticsComplexity = (complexity: string): RigScheduleEntry['logisticsComplexity'] => {
  if (!complexity) return 'Standard';
  
  const normalized = complexity.trim().toLowerCase();
  
  if (normalized.includes('standard') || normalized.includes('normal')) return 'Standard';
  if (normalized.includes('complex') || normalized.includes('difficult')) return 'Complex';
  if (normalized.includes('extreme') || normalized.includes('critical')) return 'Extreme';
  
  return 'Standard';
};

/**
 * Validate and normalize weather sensitivity
 */
const normalizeWeatherSensitivity = (sensitivity: string): RigScheduleEntry['weatherSensitivity'] => {
  if (!sensitivity) return 'Medium';
  
  const normalized = sensitivity.trim().toLowerCase();
  
  if (normalized.includes('low')) return 'Low';
  if (normalized.includes('high') || normalized.includes('critical')) return 'High';
  
  return 'Medium';
};

/**
 * Validate and normalize priority
 */
const normalizePriority = (priority: string): RigScheduleEntry['priority'] => {
  if (!priority) return 'Medium';
  
  const normalized = priority.trim().toLowerCase();
  
  if (normalized.includes('critical') || normalized.includes('urgent')) return 'Critical';
  if (normalized.includes('high')) return 'High';
  if (normalized.includes('low')) return 'Low';
  
  return 'Medium';
};

/**
 * Validate and normalize timing
 */
const normalizeTiming = (timing: string): RigScheduleEntry['timing'] => {
  if (!timing) return 'P50';
  
  const normalized = timing.trim().toUpperCase();
  
  if (normalized.includes('P10') || normalized.includes('EARLY')) return 'P10';
  if (normalized.includes('P50') || normalized.includes('MEAN') || normalized.includes('BASE')) return 'P50';
  
  return 'P50';
};

/**
 * Generate unique ID for rig schedule entry
 */
const generateRigScheduleId = (rigName: string, activityName: string, startDate: Date): string => {
  const rigCode = rigName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  const activityCode = activityName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  const dateCode = startDate.toISOString().substring(0, 10).replace(/-/g, '');
  
  return `RIG_${rigCode}_${activityCode}_${dateCode}`.toUpperCase();
};

/**
 * Process rig schedule data from Excel format to RigScheduleEntry format
 */
export const processRigSchedule = (
  rawScheduleData: RawRigScheduleEntry[]
): RigScheduleEntry[] => {
  
  console.log(`🗓️ Processing ${rawScheduleData.length} rig schedule entries...`);
  
  const processedEntries: RigScheduleEntry[] = [];
  const errors: string[] = [];
  
  rawScheduleData.forEach((raw, index) => {
    try {
      // Validate required fields
      if (!raw["Rig Name"] || !raw["Activity Name"] || !raw["Start Date"] || !raw["Finish Date"]) {
        errors.push(`Row ${index + 1}: Missing required fields (Rig Name, Activity Name, Start Date, or Finish Date)`);
        return;
      }
      
      // Parse dates
      const startDate = parseDate(raw["Start Date"]);
      const finishDate = parseDate(raw["Finish Date"]);
      
      if (!startDate || !finishDate) {
        errors.push(`Row ${index + 1}: Invalid date format for ${raw["Rig Name"]} - ${raw["Activity Name"]}`);
        return;
      }
      
      // Validate date order
      if (finishDate <= startDate) {
        errors.push(`Row ${index + 1}: Finish date must be after start date for ${raw["Rig Name"]} - ${raw["Activity Name"]}`);
        return;
      }
      
      // Calculate duration if not provided
      const originalDuration = raw["Original Duration"] || 
        Math.ceil((finishDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Generate unique ID
      const id = generateRigScheduleId(raw["Rig Name"], raw["Activity Name"], startDate);
      
      // Parse assumptions (comma-separated string to array)
      const assumptions = raw["Assumptions"] ? 
        raw["Assumptions"].split(',').map(a => a.trim()).filter(a => a.length > 0) : [];
      
      // Create processed entry
      const processedEntry: RigScheduleEntry = {
        // Identifiers
        id,
        rigName: raw["Rig Name"].trim(),
        activityName: raw["Activity Name"].trim(),
        
        // Activity Classification
        rigActivityType: normalizeActivityType(raw["Activity Type"]),
        wellType: normalizeWellType(raw["Well Type"] || ''),
        
        // Timing Information
        originalDuration,
        actualDuration: raw["Actual Duration"] ? safeNumeric(raw["Actual Duration"]) : undefined,
        startDate,
        finishDate,
        timing: normalizeTiming(raw["Timing"] || 'P50'),
        
        // Location & Context
        location: raw["Location"].trim(),
        fieldName: raw["Field Name"]?.trim(),
        platform: raw["Platform"]?.trim(),
        waterDepth: raw["Water Depth"] ? safeNumeric(raw["Water Depth"]) : undefined,
        
        // Vessel Impact Factors
        fluidIntensity: normalizeFluidIntensity(raw["Fluid Intensity"] || ''),
        logisticsComplexity: normalizeLogisticsComplexity(raw["Logistics Complexity"] || ''),
        weatherSensitivity: normalizeWeatherSensitivity(raw["Weather Sensitivity"] || ''),
        
        // Business Context
        priority: normalizePriority(raw["Priority"] || ''),
        projectCode: raw["Project Code"]?.trim(),
        costCenter: raw["Cost Center"]?.trim(),
        
        // Metadata
        scheduleVersion: raw["Schedule Version"]?.trim() || 'Unknown',
        lastUpdated: raw["Last Updated"] ? parseDate(raw["Last Updated"]) || new Date() : new Date(),
        confidence: Math.max(0, Math.min(1, safeNumeric(raw["Confidence"]) || 0.8)),
        assumptions
      };
      
      processedEntries.push(processedEntry);
      
    } catch (error) {
      errors.push(`Row ${index + 1}: Processing error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`Error processing row ${index + 1}:`, error);
    }
  });
  
  // Log results
  console.log(`✅ Successfully processed ${processedEntries.length} rig schedule entries`);
  
  if (errors.length > 0) {
    console.warn(`⚠️ ${errors.length} errors encountered during processing:`);
    errors.forEach(error => console.warn(`  - ${error}`));
  }
  
  // Sort by start date for better organization
  processedEntries.sort((a, b) => {
    const aDate = new Date(a.startDate);
    const bDate = new Date(b.startDate);
    return aDate.getTime() - bDate.getTime();
  });
  
  // Log summary statistics
  const activityTypes = processedEntries.reduce((acc, entry) => {
    acc[entry.rigActivityType] = (acc[entry.rigActivityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const locations = processedEntries.reduce((acc, entry) => {
    acc[entry.location] = (acc[entry.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('📊 Rig Schedule Summary:');
  console.log(`  Total Activities: ${processedEntries.length}`);
  console.log(`  Activity Types:`, Object.entries(activityTypes)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', '));
  console.log(`  Locations:`, Object.entries(locations)
    .slice(0, 5) // Show top 5 locations
    .map(([location, count]) => `${location}: ${count}`)
    .join(', '));
  
  if (processedEntries.length > 0) {
    const dateRange = {
      start: new Date(processedEntries[0].startDate).toISOString().substring(0, 10),
      end: new Date(processedEntries[processedEntries.length - 1].finishDate).toISOString().substring(0, 10)
    };
    console.log(`  Date Range: ${dateRange.start} to ${dateRange.end}`);
  }
  
  return processedEntries;
};

/**
 * Validate rig schedule data for common issues
 */
export const validateRigScheduleData = (scheduleData: RigScheduleEntry[]): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  if (scheduleData.length === 0) {
    errors.push('No rig schedule data found');
    return { isValid: false, warnings, errors };
  }
  
  // Check for duplicate activities
  const activityIds = new Set<string>();
  const duplicates: string[] = [];
  
  scheduleData.forEach(entry => {
    if (activityIds.has(entry.id)) {
      duplicates.push(`${entry.rigName} - ${entry.activityName}`);
    } else {
      activityIds.add(entry.id);
    }
  });
  
  if (duplicates.length > 0) {
    warnings.push(`Found ${duplicates.length} duplicate activities: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}`);
  }
  
  // Check for overlapping activities on same rig
  const rigActivities = scheduleData.reduce((acc, entry) => {
    if (!acc[entry.rigName]) acc[entry.rigName] = [];
    acc[entry.rigName].push(entry);
    return acc;
  }, {} as Record<string, RigScheduleEntry[]>);
  
  Object.entries(rigActivities).forEach(([rigName, activities]) => {
    activities.sort((a, b) => {
      const aDate = new Date(a.startDate);
      const bDate = new Date(b.startDate);
      return aDate.getTime() - bDate.getTime();
    });
    
    for (let i = 0; i < activities.length - 1; i++) {
      const current = activities[i];
      const next = activities[i + 1];
      
      if (current.finishDate > next.startDate) {
        warnings.push(`Overlapping activities on ${rigName}: ${current.activityName} and ${next.activityName}`);
      }
    }
  });
  
  // Check for very old or future dates
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const threeYearsFromNow = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
  
  const oldActivities = scheduleData.filter(entry => entry.finishDate < twoYearsAgo);
  const farFutureActivities = scheduleData.filter(entry => entry.startDate > threeYearsFromNow);
  
  if (oldActivities.length > 0) {
    warnings.push(`${oldActivities.length} activities with finish dates older than 2 years`);
  }
  
  if (farFutureActivities.length > 0) {
    warnings.push(`${farFutureActivities.length} activities with start dates more than 3 years in the future`);
  }
  
  // Check confidence levels
  const lowConfidenceActivities = scheduleData.filter(entry => entry.confidence !== undefined && entry.confidence < 0.5);
  if (lowConfidenceActivities.length > 0) {
    warnings.push(`${lowConfidenceActivities.length} activities with low confidence (<50%)`);
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
};