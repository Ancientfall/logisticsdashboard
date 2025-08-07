// src/utils/processors/rigScheduleCSVProcessor.ts
import { RigScheduleEntry } from '../../types';
import { 
  calculateActivityDemand, 
  getActivityProfile, 
  isValidActivityType,
  BASE_RIG_DEMAND_RATE 
} from '../rigActivityDemandProfiles';
import { 
  calculateLocationVesselCapacity, 
  getLocationProfile, 
  isValidAssetCode 
} from '../locationVesselCapability';

export interface RigScheduleCSVRow {
  'Activity ID': string;
  'Activity Status': string;
  'WBS Code': string;
  '(*)WBS Name': string;
  'Activity Name': string;
  'GWDXAU-Activity Short Name': string;
  'GWDXAU-Reports': string;
  '(*)Start': string;
  '(*)Finish': string;
  'Original Duration(h)': string;
  '(*)Actual Duration(h)': string;
  'GWDXAG-Asset': string;
  'GWDXAG-Rig Name': string;
  'GWDXAG-Region': string;
  'GWDXAG-Well Type': string;
  'GWDXAG-Rig Activity Type': string;
  'GWDXAG-FM Status': string;
  'GWDXAG-Rig Contractor': string;
  'GWDXAG-Rig Type': string;
  'GWDXAG-Plan': string;
  'GWDXAG-Estimate': string;
  'GWDXAG-Event Type': string;
  'GWDXAG-Wellhead Type': string;
  'GMDXAG-NWcp Stage': string;
  '(*)BL1 Start': string;
  '(*)BL1 Finish': string;
  '(*)BL1 Duration(h)': string;
  'Delete This Row': string;
}

export interface ProcessedRigScheduleData {
  rigScheduleData: RigScheduleEntry[];
  vesselDemandAnalysis: {
    totalDemandByMonth: Record<string, number>; // YYYY-MM format
    demandByActivityType: Record<string, number>;
    demandByLocation: Record<string, number>;
    locationCapabilityAnalysis: Record<string, {
      asset: string;
      transitCategory: 'SHORT' | 'LONG';
      deliveriesPerMonth: number;
      activitiesCount: number;
    }>;
  };
  metadata: {
    totalRecords: number;
    scenarios: string[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    rigs: string[];
    processingTime: number;
    // Enhanced metadata
    activityTypes: string[];
    locations: string[];
    validationWarnings: string[];
    demandSummary: {
      totalVesselDemandsPerMonth: number;
      averageDemandPerRig: number;
      shortTransitActivities: number;
      longTransitActivities: number;
    };
  };
}

/**
 * CSV Processor for Rig Schedule Data
 * Processes both Early Case and Mean Case scenarios
 */
export class RigScheduleCSVProcessor {
  
  /**
   * Parse CSV text into structured data
   */
  static parseCSV(csvText: string): RigScheduleCSVRow[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: RigScheduleCSVRow[] = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line with proper comma handling
      const values = this.parseCSVLine(line);
      
      if (values.length >= headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim().replace(/"/g, '') || '';
        });
        rows.push(row as RigScheduleCSVRow);
      }
    }

    return rows;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Process CSV data into RigScheduleEntry format with vessel demand analysis
   */
  static processRigScheduleCSV(csvText: string, scenario: 'early' | 'mean'): ProcessedRigScheduleData {
    const startTime = performance.now();
    
    try {
      const rows = this.parseCSV(csvText);
      console.log(`📊 Processing ${rows.length} rig schedule rows for ${scenario} case`);

      const rigScheduleData: RigScheduleEntry[] = [];
      const rigs = new Set<string>();
      const scenarios = new Set<string>();
      const activityTypes = new Set<string>();
      const locations = new Set<string>();
      const validationWarnings: string[] = [];
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      // Vessel demand analysis tracking
      const totalDemandByMonth: Record<string, number> = {};
      const demandByActivityType: Record<string, number> = {};
      const demandByLocation: Record<string, number> = {};
      const locationCapabilityAnalysis: Record<string, any> = {};

      for (const row of rows) {
        // Skip empty or invalid rows
        if (!row['GWDXAG-Rig Name'] || !row['(*)Start'] || !row['(*)Finish']) {
          continue;
        }

        // Parse dates
        const startDate = this.parseDate(row['(*)Start']);
        const finishDate = this.parseDate(row['(*)Finish']);
        
        if (!startDate || !finishDate) {
          const warning = `Invalid dates for activity ${row['Activity ID']}: start="${row['(*)Start']}", finish="${row['(*)Finish']}"`;
          validationWarnings.push(warning);
          console.warn(`⚠️ ${warning}`);
          continue;
        }

        // Track date range
        if (!minDate || startDate < minDate) minDate = startDate;
        if (!maxDate || finishDate > maxDate) maxDate = finishDate;

        // Parse duration and convert to days
        const originalDurationHours = parseFloat(row['Original Duration(h)']) || 0;
        const originalDurationDays = originalDurationHours / 24;
        
        // Extract key business fields
        const assetCode = row['GWDXAG-Asset'] || row['GWDXAG-Region'] || 'Unknown';
        const activityType = row['GWDXAG-Rig Activity Type'] || 'Unknown';
        const rigName = row['GWDXAG-Rig Name'];

        // Validate activity type and location
        if (!isValidActivityType(activityType)) {
          validationWarnings.push(`Unknown activity type: ${activityType} for rig ${rigName}`);
        }
        
        if (!isValidAssetCode(assetCode)) {
          validationWarnings.push(`Unknown asset code: ${assetCode} for rig ${rigName}`);
        }

        // Get business logic profiles
        const activityProfile = getActivityProfile(activityType);
        const locationProfile = getLocationProfile(assetCode);

        // Calculate vessel demand for this activity
        const vesselDemand = calculateActivityDemand(activityType, originalDurationDays, 1);

        // Track monthly demand (distribute across months activity spans)
        const monthsSpanned = this.getMonthsSpannedByActivity(startDate, finishDate);
        for (const monthKey of monthsSpanned) {
          totalDemandByMonth[monthKey] = (totalDemandByMonth[monthKey] || 0) + 
            (vesselDemand / monthsSpanned.length); // Distribute demand across months
        }

        // Aggregate demand by activity type
        demandByActivityType[activityType] = (demandByActivityType[activityType] || 0) + vesselDemand;

        // Aggregate demand by location
        demandByLocation[assetCode] = (demandByLocation[assetCode] || 0) + vesselDemand;

        // Track location capability analysis
        if (!locationCapabilityAnalysis[assetCode]) {
          locationCapabilityAnalysis[assetCode] = {
            asset: assetCode,
            transitCategory: locationProfile.transitCategory,
            deliveriesPerMonth: locationProfile.vesselDeliveriesPerMonth,
            activitiesCount: 0
          };
        }
        locationCapabilityAnalysis[assetCode].activitiesCount++;
        
        // Create RigScheduleEntry with enhanced data
        const entry: RigScheduleEntry = {
          id: row['Activity ID'] || `${scenario}-${rigScheduleData.length}`,
          rigName,
          location: assetCode,
          startDate: startDate.toISOString(),
          finishDate: finishDate.toISOString(),
          originalDuration: originalDurationHours,
          rigActivityType: activityType,
          activityName: row['Activity Name'] || '',
          activityStatus: row['Activity Status'] || 'Unknown',
          projectCode: row['WBS Code'] || '',
          scenario: scenario,
          wellType: row['GWDXAG-Well Type'] || '',
          rigContractor: row['GWDXAG-Rig Contractor'] || '',
          rigType: row['GWDXAG-Rig Type'] || '',
          plan: row['GWDXAG-Plan'] || '',
          estimate: row['GWDXAG-Estimate'] || '',
          eventType: row['GWDXAG-Event Type'] || '',
          wellheadType: row['GWDXAG-Wellhead Type'] || '',
          region: row['GWDXAG-Region'] || '',
          
          // Enhanced fields with business logic
          fieldName: locationProfile.fieldName,
          fluidIntensity: activityProfile.vesselSupport.fluidIntensive ? 'High' : 'Low',
          logisticsComplexity: activityProfile.characteristics.logisticsIntensity === 'Critical' ? 'Complex' : 'Standard',
          weatherSensitivity: locationProfile.characteristics.weatherExposure,
          confidence: activityProfile.characteristics.logisticsIntensity === 'Critical' ? 0.9 : 0.7
        };

        rigScheduleData.push(entry);
        rigs.add(entry.rigName);
        scenarios.add(scenario);
        activityTypes.add(activityType);
        locations.add(assetCode);
      }

      // Calculate summary statistics
      const totalVesselDemandsPerMonth = Object.values(totalDemandByMonth).reduce((sum, demand) => sum + demand, 0);
      const averageDemandPerRig = rigs.size > 0 ? totalVesselDemandsPerMonth / rigs.size : 0;
      
      const shortTransitActivities = rigScheduleData.filter(entry => 
        getLocationProfile(entry.location).transitCategory === 'SHORT'
      ).length;
      
      const longTransitActivities = rigScheduleData.filter(entry => 
        getLocationProfile(entry.location).transitCategory === 'LONG'
      ).length;

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const result: ProcessedRigScheduleData = {
        rigScheduleData,
        vesselDemandAnalysis: {
          totalDemandByMonth,
          demandByActivityType,
          demandByLocation,
          locationCapabilityAnalysis
        },
        metadata: {
          totalRecords: rigScheduleData.length,
          scenarios: Array.from(scenarios),
          dateRange: { start: minDate, end: maxDate },
          rigs: Array.from(rigs),
          processingTime,
          activityTypes: Array.from(activityTypes),
          locations: Array.from(locations),
          validationWarnings,
          demandSummary: {
            totalVesselDemandsPerMonth,
            averageDemandPerRig,
            shortTransitActivities,
            longTransitActivities
          }
        }
      };

      // Enhanced logging
      console.log(`✅ Processed ${rigScheduleData.length} rig schedule entries in ${processingTime.toFixed(0)}ms`);
      console.log(`📅 Date range: ${minDate?.toLocaleDateString()} to ${maxDate?.toLocaleDateString()}`);
      console.log(`🚢 Rigs: ${Array.from(rigs).length} rigs`);
      console.log(`🎯 Activity types: ${Array.from(activityTypes).length} types`);
      console.log(`📍 Locations: ${Array.from(locations).length} locations`);
      console.log(`⚡ Total vessel demand: ${totalVesselDemandsPerMonth.toFixed(1)} deliveries/month`);
      console.log(`📊 Average per rig: ${averageDemandPerRig.toFixed(1)} deliveries/month`);
      console.log(`🚤 Transit mix: ${shortTransitActivities} short / ${longTransitActivities} long transit activities`);
      
      if (validationWarnings.length > 0) {
        console.warn(`⚠️  ${validationWarnings.length} validation warnings - check metadata.validationWarnings`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error processing rig schedule CSV for ${scenario} case:`, error);
      return {
        rigScheduleData: [],
        vesselDemandAnalysis: {
          totalDemandByMonth: {},
          demandByActivityType: {},
          demandByLocation: {},
          locationCapabilityAnalysis: {}
        },
        metadata: {
          totalRecords: 0,
          scenarios: [scenario],
          dateRange: { start: null, end: null },
          rigs: [],
          processingTime: performance.now() - startTime,
          activityTypes: [],
          locations: [],
          validationWarnings: ['Processing failed - check console for details'],
          demandSummary: {
            totalVesselDemandsPerMonth: 0,
            averageDemandPerRig: 0,
            shortTransitActivities: 0,
            longTransitActivities: 0
          }
        }
      };
    }
  }

  /**
   * Get months spanned by an activity (YYYY-MM format)
   */
  private static getMonthsSpannedByActivity(startDate: Date, finishDate: Date): string[] {
    const months: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(finishDate.getFullYear(), finishDate.getMonth(), 1);

    while (current <= end) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthKey);
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Parse date from various formats
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;

    // Try parsing common formats
    const formats = [
      // MM/dd/yyyy HH:mm format
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/,
      // MM/dd/yyyy format
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // ISO format
      /^\d{4}-\d{2}-\d{2}/
    ];

    // Try direct Date parsing first
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try MM/dd/yyyy HH:mm format
    const match1 = dateStr.match(formats[0]);
    if (match1) {
      const [, month, day, year, hour, minute] = match1;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
      if (!isNaN(date.getTime())) return date;
    }

    // Try MM/dd/yyyy format
    const match2 = dateStr.match(formats[1]);
    if (match2) {
      const [, month, day, year] = match2;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    console.warn(`⚠️ Could not parse date: ${dateStr}`);
    return null;
  }

  /**
   * Combine multiple scenario data with aggregated vessel demand analysis
   */
  static combineScenarios(...datasets: ProcessedRigScheduleData[]): ProcessedRigScheduleData {
    const combined: RigScheduleEntry[] = [];
    const allRigs = new Set<string>();
    const allScenarios = new Set<string>();
    const allActivityTypes = new Set<string>();
    const allLocations = new Set<string>();
    const allValidationWarnings: string[] = [];
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    let totalProcessingTime = 0;

    // Combined vessel demand analysis
    const combinedTotalDemandByMonth: Record<string, number> = {};
    const combinedDemandByActivityType: Record<string, number> = {};
    const combinedDemandByLocation: Record<string, number> = {};
    const combinedLocationCapabilityAnalysis: Record<string, any> = {};

    let totalVesselDemandsPerMonth = 0;
    let shortTransitActivities = 0;
    let longTransitActivities = 0;

    for (const dataset of datasets) {
      // Combine rig schedule data
      combined.push(...dataset.rigScheduleData);
      dataset.metadata.rigs.forEach(rig => allRigs.add(rig));
      dataset.metadata.scenarios.forEach(scenario => allScenarios.add(scenario));
      dataset.metadata.activityTypes.forEach(type => allActivityTypes.add(type));
      dataset.metadata.locations.forEach(location => allLocations.add(location));
      allValidationWarnings.push(...dataset.metadata.validationWarnings);
      totalProcessingTime += dataset.metadata.processingTime;

      // Combine vessel demand analysis
      Object.entries(dataset.vesselDemandAnalysis.totalDemandByMonth).forEach(([month, demand]) => {
        combinedTotalDemandByMonth[month] = (combinedTotalDemandByMonth[month] || 0) + demand;
      });

      Object.entries(dataset.vesselDemandAnalysis.demandByActivityType).forEach(([type, demand]) => {
        combinedDemandByActivityType[type] = (combinedDemandByActivityType[type] || 0) + demand;
      });

      Object.entries(dataset.vesselDemandAnalysis.demandByLocation).forEach(([location, demand]) => {
        combinedDemandByLocation[location] = (combinedDemandByLocation[location] || 0) + demand;
      });

      Object.entries(dataset.vesselDemandAnalysis.locationCapabilityAnalysis).forEach(([location, analysis]) => {
        if (!combinedLocationCapabilityAnalysis[location]) {
          combinedLocationCapabilityAnalysis[location] = { ...analysis, activitiesCount: 0 };
        }
        combinedLocationCapabilityAnalysis[location].activitiesCount += analysis.activitiesCount;
      });

      // Aggregate summary statistics
      totalVesselDemandsPerMonth += dataset.metadata.demandSummary.totalVesselDemandsPerMonth;
      shortTransitActivities += dataset.metadata.demandSummary.shortTransitActivities;
      longTransitActivities += dataset.metadata.demandSummary.longTransitActivities;

      // Track date range
      if (dataset.metadata.dateRange.start) {
        if (!minDate || dataset.metadata.dateRange.start < minDate) {
          minDate = dataset.metadata.dateRange.start;
        }
      }
      if (dataset.metadata.dateRange.end) {
        if (!maxDate || dataset.metadata.dateRange.end > maxDate) {
          maxDate = dataset.metadata.dateRange.end;
        }
      }
    }

    const averageDemandPerRig = allRigs.size > 0 ? totalVesselDemandsPerMonth / allRigs.size : 0;

    console.log(`🔄 Combined ${datasets.length} scenario datasets:`);
    console.log(`  📊 Total activities: ${combined.length}`);
    console.log(`  🚢 Total rigs: ${allRigs.size}`);
    console.log(`  🎯 Scenarios: ${Array.from(allScenarios).join(', ')}`);
    console.log(`  ⚡ Combined vessel demand: ${totalVesselDemandsPerMonth.toFixed(1)} deliveries/month`);

    return {
      rigScheduleData: combined,
      vesselDemandAnalysis: {
        totalDemandByMonth: combinedTotalDemandByMonth,
        demandByActivityType: combinedDemandByActivityType,
        demandByLocation: combinedDemandByLocation,
        locationCapabilityAnalysis: combinedLocationCapabilityAnalysis
      },
      metadata: {
        totalRecords: combined.length,
        scenarios: Array.from(allScenarios),
        dateRange: { start: minDate, end: maxDate },
        rigs: Array.from(allRigs),
        processingTime: totalProcessingTime,
        activityTypes: Array.from(allActivityTypes),
        locations: Array.from(allLocations),
        validationWarnings: allValidationWarnings,
        demandSummary: {
          totalVesselDemandsPerMonth,
          averageDemandPerRig,
          shortTransitActivities,
          longTransitActivities
        }
      }
    };
  }
}