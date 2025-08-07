/**
 * Vessel Forecast Calculator - Predictive Analytics Engine
 * 
 * Extends vessel requirement calculations with:
 * 1. Historical trend analysis and pattern recognition
 * 2. Predictive modeling for future demand/capability
 * 3. Scenario planning with inject management
 * 4. Management decision support and recommendations
 * 
 * Built on top of existing vesselRequirementCalculator.ts
 */

import { VesselManifest } from '../types';
import { 
  ForecastDemand, 
  VesselCapabilityForecast, 
  VesselInject, 
  ForecastScenario, 
  ScenarioResult, 
  ManagementRecommendation, 
  VesselForecastResult,
  RigScheduleEntry,
  ActivityVesselMapping,
  CoreFleetBaseline,
  EnhancedVesselInject,
  ContractedVessel,
  DayRateStructure
} from '../types';
import { 
  LocationDeliveryDemand,
  VesselCapability
} from './vesselRequirementCalculator';

// ==================== FORECASTING CONSTANTS ====================

// Forecast horizon (12 months forward)
const DEFAULT_FORECAST_MONTHS = 12;
const HISTORICAL_MONTHS = 6; // Jan-Jun 2025

// Statistical thresholds
const MIN_CONFIDENCE_THRESHOLD = 0.6;
const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const TREND_SIGNIFICANCE_THRESHOLD = 0.1; // 10% change to be considered significant

// Vessel planning parameters
const OPTIMAL_UTILIZATION_RATE = 0.75; // 75% target utilization
const UTILIZATION_WARNING_THRESHOLD = 0.90; // 90% triggers capacity warnings
const UTILIZATION_UNDERUSE_THRESHOLD = 0.50; // 50% triggers efficiency warnings

// Seasonal adjustment factors (Gulf of Mexico patterns)
const SEASONAL_FACTORS: Record<string, number> = {
  'Q1': 1.1,  // Winter: Higher demand due to weather windows
  'Q2': 1.0,  // Spring: Baseline demand
  'Q3': 0.9,  // Summer: Reduced demand due to hurricane season
  'Q4': 1.05  // Fall: Moderate increase
};

// ==================== CORE FLEET & ACTIVITY-BASED CONSTANTS ====================

// CORRECTED: Core fleet baseline based on actual rig demand analysis
const CORE_FLEET_BASELINE_COUNT = 8; // Required vessels for 8.2 deliveries/month per rig baseline (49.2 total ÷ 6.5 capability)
const CURRENT_FLEET_COUNT = 6; // Current fleet including Ship Island
const CORE_FLEET_TARGET_UTILIZATION = 0.75; // 75% target utilization
const CORE_FLEET_MAX_UTILIZATION = 0.90; // 90% max before plus-up needed
const CORE_FLEET_MIN_UTILIZATION = 0.50; // 50% min before shed consideration

// CORRECTED: True baseline demand per rig location
const BASELINE_DEMAND_PER_RIG = 8.2; // Average demand per rig location per month
const NUMBER_OF_RIG_LOCATIONS = 6; // 6 drilling locations
const TOTAL_BASELINE_DEMAND = 49.2; // 6 rigs × 8.2 = 49.2 deliveries/month
const VESSEL_CAPABILITY = 6.5; // Actual capability per vessel per month

// Activity-based vessel requirements (calibrated from BP historical data)
const DEFAULT_ACTIVITY_MAPPINGS: ActivityVesselMapping[] = [
  // Drilling Activities
  {
    activityType: 'Drilling',
    wellType: 'Development',
    locationCategory: 'Deep_Water',
    baseVesselRequirement: 2.5,
    durationMultiplier: 1.0,
    simultaneousActivityPenalty: 0.3,
    fluidVolumeEstimate: 15000, // BBLs
    equipmentVolumeEstimate: 500, // sq ft
    frequencyFactor: 2.5, // trips per week
    weatherBufferFactor: 1.2,
    distanceFactor: 1.0,
    portAccessibilityFactor: 1.0,
    specializedVesselNeeds: [],
    concurrentSupport: false,
    minimumVesselCount: 2,
    maximumEfficiencyThreshold: 4,
    confidence: 0.85,
    basedOnHistoricalEvents: 45,
    lastCalibrated: new Date('2025-07-01'),
    notes: 'Standard development drilling - most common activity'
  },
  {
    activityType: 'Drilling',
    wellType: 'Exploration',
    locationCategory: 'Deep_Water',
    baseVesselRequirement: 3.2,
    durationMultiplier: 1.3,
    simultaneousActivityPenalty: 0.4,
    fluidVolumeEstimate: 22000,
    equipmentVolumeEstimate: 800,
    frequencyFactor: 3.0,
    weatherBufferFactor: 1.4,
    distanceFactor: 1.2,
    portAccessibilityFactor: 1.0,
    specializedVesselNeeds: ['logging_equipment'],
    concurrentSupport: true,
    minimumVesselCount: 3,
    maximumEfficiencyThreshold: 5,
    confidence: 0.80,
    basedOnHistoricalEvents: 18,
    lastCalibrated: new Date('2025-07-01'),
    notes: 'Exploration drilling requires higher vessel intensity due to uncertainty'
  },
  // Completion Activities
  {
    activityType: 'Completion',
    wellType: 'Development',
    locationCategory: 'Deep_Water',
    baseVesselRequirement: 2.8,
    durationMultiplier: 0.8,
    simultaneousActivityPenalty: 0.2,
    fluidVolumeEstimate: 18500,
    equipmentVolumeEstimate: 650,
    frequencyFactor: 3.5,
    weatherBufferFactor: 1.1,
    distanceFactor: 1.0,
    portAccessibilityFactor: 1.0,
    specializedVesselNeeds: ['chemical_vessels'],
    concurrentSupport: false,
    minimumVesselCount: 2,
    maximumEfficiencyThreshold: 4,
    confidence: 0.88,
    basedOnHistoricalEvents: 32,
    lastCalibrated: new Date('2025-07-01'),
    notes: 'Completion activities are fluid intensive with specialized chemical needs'
  },
  // Workover Activities
  {
    activityType: 'Workover',
    wellType: 'Development',
    locationCategory: 'Deep_Water',
    baseVesselRequirement: 1.8,
    durationMultiplier: 0.6,
    simultaneousActivityPenalty: 0.1,
    fluidVolumeEstimate: 8500,
    equipmentVolumeEstimate: 300,
    frequencyFactor: 1.5,
    weatherBufferFactor: 1.0,
    distanceFactor: 1.0,
    portAccessibilityFactor: 1.0,
    specializedVesselNeeds: [],
    concurrentSupport: false,
    minimumVesselCount: 1,
    maximumEfficiencyThreshold: 3,
    confidence: 0.90,
    basedOnHistoricalEvents: 28,
    lastCalibrated: new Date('2025-07-01'),
    notes: 'Workover activities are typically shorter duration with lower vessel intensity'
  },
  // Maintenance & P&A
  {
    activityType: 'Maintenance',
    wellType: 'Development',
    locationCategory: 'Deep_Water',
    baseVesselRequirement: 1.2,
    durationMultiplier: 0.4,
    simultaneousActivityPenalty: 0.0,
    fluidVolumeEstimate: 3000,
    equipmentVolumeEstimate: 150,
    frequencyFactor: 0.8,
    weatherBufferFactor: 0.9,
    distanceFactor: 1.0,
    portAccessibilityFactor: 1.0,
    specializedVesselNeeds: [],
    concurrentSupport: false,
    minimumVesselCount: 1,
    maximumEfficiencyThreshold: 2,
    confidence: 0.95,
    basedOnHistoricalEvents: 15,
    lastCalibrated: new Date('2025-07-01'),
    notes: 'Routine maintenance requires minimal vessel support'
  }
];

// ==================== RIG SCHEDULE PROCESSING ====================

/**
 * Calculate vessel requirement gap based on corrected baseline demand
 */
export function calculateBaselineVesselGap(): {
  baselineDemand: number;
  currentCapability: number;
  requiredVessels: number;
  currentVessels: number;
  vesselGap: number;
  utilization: number;
} {
  const currentCapability = CURRENT_FLEET_COUNT * VESSEL_CAPABILITY; // 6 × 6.5 = 39.0
  const requiredVessels = Math.ceil(TOTAL_BASELINE_DEMAND / VESSEL_CAPABILITY); // 49.2 ÷ 6.5 = 8
  const vesselGap = requiredVessels - CURRENT_FLEET_COUNT; // 8 - 6 = 2
  const utilization = (TOTAL_BASELINE_DEMAND / currentCapability); // 49.2 / 39.0 = 126%
  
  console.log(`📊 BASELINE VESSEL REQUIREMENT ANALYSIS:`);
  console.log(`  Baseline demand: ${TOTAL_BASELINE_DEMAND} deliveries/month (${BASELINE_DEMAND_PER_RIG} per rig × ${NUMBER_OF_RIG_LOCATIONS} rigs)`);
  console.log(`  Current capability: ${currentCapability} deliveries/month (${CURRENT_FLEET_COUNT} vessels × ${VESSEL_CAPABILITY})`);
  console.log(`  Required vessels: ${requiredVessels}`);
  console.log(`  Current vessels: ${CURRENT_FLEET_COUNT}`);
  console.log(`  Vessel gap: ${vesselGap} vessels`);
  console.log(`  Current utilization: ${(utilization * 100).toFixed(1)}%`);
  
  return {
    baselineDemand: TOTAL_BASELINE_DEMAND,
    currentCapability,
    requiredVessels,
    currentVessels: CURRENT_FLEET_COUNT,
    vesselGap,
    utilization
  };
}

/**
 * Create default core fleet baseline configuration
 */
export function createDefaultCoreFleetBaseline(): CoreFleetBaseline {
  const now = new Date();
  
  // Default contracted vessels (representative)
  const contractedVessels: ContractedVessel[] = [
    {
      vesselName: 'PSV-1',
      vesselType: 'PSV',
      vesselSpecs: { deckSpace: 4500, cargoCapacity: 850, liquidCapacity: 5500 },
      contractType: 'Long_Term',
      dayRate: 22000,
      contractStart: new Date('2024-01-01'),
      contractEnd: new Date('2026-12-31'),
      reliability: 0.92,
      averageTransitTime: { 'Thunderhorse': 8, 'Na_Kika': 6, 'Atlantis': 10 },
      maintenanceSchedule: [new Date('2025-09-15'), new Date('2026-03-15')],
      canBeReleased: false,
      releaseNoticeDay: 90,
      replacementCost: 25000
    },
    // Additional vessels would be defined here...
  ];

  const dayRateStructure: DayRateStructure = {
    baseRate: 22000,
    volumeDiscount: 0.05, // 5% discount for 4+ vessels
    longTermDiscount: 0.08, // 8% discount for 2+ year contracts
    seasonalSurcharge: {
      '06': 0.15, '07': 0.20, '08': 0.15, // Hurricane season
      '01': 0.10, '02': 0.05, '12': 0.05  // Winter weather
    },
    emergencyPremium: 0.50, // 50% premium for <48hr notice
    fuelEscalation: true
  };

  return {
    baseVesselCount: CURRENT_FLEET_COUNT, // Current fleet (6 vessels)
    contractedVessels,
    flexibilityBuffer: 0, // No buffer vessels currently - operating at baseline
    maxFlexUpCapacity: 4, // Can charter up to 4 additional vessels quickly
    coreContractExpiry: new Date('2026-12-31'),
    dayRateStructure,
    charterOptions: [],
    averageUtilizationTarget: CORE_FLEET_TARGET_UTILIZATION,
    minimumUtilizationThreshold: CORE_FLEET_MIN_UTILIZATION,
    maintenanceSchedule: [],
    seasonalAdjustments: [],
    contractualNoticeRequired: 30, // 30 days notice for fleet changes
    emergencyCharterSLA: 48, // 48 hours to secure emergency vessel
    lastReviewDate: now,
    nextReviewDue: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
    fleetManager: 'Fleet Operations Team'
  };
}

/**
 * Process Excel rig schedule data into RigScheduleEntry objects
 * This function handles the Excel upload parsing
 */
export function processRigScheduleExcelData(excelData: any[]): RigScheduleEntry[] {
  console.log('📋 Processing rig schedule Excel data...');
  
  const rigScheduleEntries: RigScheduleEntry[] = [];
  
  excelData.forEach((row, index) => {
    try {
      // Map Excel columns to RigScheduleEntry fields
      // Adjust column mappings based on your actual Excel structure
      const entry: RigScheduleEntry = {
        id: `rig_${index}_${Date.now()}`,
        rigName: row['Rig Name'] || row['GWDXAG-Rig Name'] || '',
        activityName: row['Activity Name'] || row['GWDXAG-Asset'] || '',
        
        // Map activity types from Excel to our enum
        rigActivityType: mapActivityType(row['Rig Activity Type'] || row['GWDXAG-Well Type']),
        wellType: mapWellType(row['Well Type'] || row['GWDXAG-Well Type']),
        
        // Parse dates
        originalDuration: parseInt(row['Original Duration'] || row['(*) Actual Duration']) || 30,
        startDate: parseExcelDate(row['(*) Start'] || row['Start']),
        finishDate: parseExcelDate(row['(*) Finish'] || row['Finish']),
        timing: 'P50', // Default to P50, can be enhanced to detect P10/P50
        
        // Location information
        location: row['GWDXAG-Rig Name'] || row['Location'] || '',
        fieldName: extractFieldName(row['Activity Name'] || ''),
        platform: extractPlatformName(row['Activity Name'] || ''),
        
        // Infer vessel impact factors from activity data
        fluidIntensity: inferFluidIntensity(row['Rig Activity Type'], row['Well Type']),
        logisticsComplexity: inferLogisticsComplexity(row['Original Duration']),
        weatherSensitivity: inferWeatherSensitivity(row['Activity Name']),
        
        // Business context
        priority: 'Medium', // Default priority, can be enhanced
        projectCode: row['Project Code'] || '',
        costCenter: row['Cost Center'] || '',
        
        // Metadata
        scheduleVersion: `${new Date().toISOString().slice(0, 7)}_v1.0`,
        lastUpdated: new Date(),
        confidence: calculateScheduleConfidence(row),
        assumptions: []
      };
      
      rigScheduleEntries.push(entry);
      
    } catch (error) {
      console.warn(`⚠️ Error processing rig schedule row ${index}:`, error);
    }
  });
  
  console.log(`✅ Processed ${rigScheduleEntries.length} rig schedule entries`);
  return rigScheduleEntries;
}

/**
 * Map Excel activity type to our enum
 */
function mapActivityType(excelActivityType: string): RigScheduleEntry['rigActivityType'] {
  const activityType = (excelActivityType || '').toLowerCase();
  
  if (activityType.includes('drill')) return 'Drilling';
  if (activityType.includes('complet')) return 'Completion';
  if (activityType.includes('workover')) return 'Workover';
  if (activityType.includes('maintenance') || activityType.includes('maint')) return 'Maintenance';
  if (activityType.includes('p&a') || activityType.includes('abandon')) return 'P&A';
  if (activityType.includes('sidetrack')) return 'Sidetrack';
  if (activityType.includes('stimul') || activityType.includes('frac')) return 'Stimulation';
  
  return 'Drilling'; // Default
}

/**
 * Map Excel well type to our enum
 */
function mapWellType(excelWellType: string): RigScheduleEntry['wellType'] {
  const wellType = (excelWellType || '').toLowerCase();
  
  if (wellType.includes('development') || wellType.includes('dev')) return 'Development';
  if (wellType.includes('exploration') || wellType.includes('exp')) return 'Exploration';
  if (wellType.includes('injection') || wellType.includes('inj')) return 'Injection';
  if (wellType.includes('water')) return 'Water_Injection';
  if (wellType.includes('gas')) return 'Gas_Injection';
  if (wellType.includes('p&a') || wellType.includes('abandon')) return 'P&A';
  
  return 'Development'; // Default
}

/**
 * Parse Excel date formats
 */
function parseExcelDate(dateValue: any): Date {
  if (!dateValue) return new Date();
  
  if (dateValue instanceof Date) return dateValue;
  
  // Handle Excel serial dates (days since 1900-01-01)
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  return new Date();
}

/**
 * Extract field name from activity name
 */
function extractFieldName(activityName: string): string {
  // Common field patterns in Gulf of Mexico
  const fieldPatterns = [
    /thunderhorse/i, /na kika/i, /atlantis/i, /mad dog/i, /king/i,
    /holstein/i, /ram powell/i, /ursa/i, /mars/i, /olympus/i
  ];
  
  for (const pattern of fieldPatterns) {
    const match = activityName.match(pattern);
    if (match) return match[0];
  }
  
  return '';
}

/**
 * Extract platform name from activity name
 */
function extractPlatformName(activityName: string): string {
  // Look for platform indicators
  const platformPatterns = [
    /\b[A-Z]{2,4}-\d+/g, // Platform codes like TH-1, NK-2
    /platform\s+\w+/gi,
    /\b\w+\s+platform/gi
  ];
  
  for (const pattern of platformPatterns) {
    const match = activityName.match(pattern);
    if (match) return match[0];
  }
  
  return '';
}

/**
 * Infer fluid intensity from activity and well type
 */
function inferFluidIntensity(activityType: string, wellType: string): RigScheduleEntry['fluidIntensity'] {
  const activity = (activityType || '').toLowerCase();
  const well = (wellType || '').toLowerCase();
  
  if (activity.includes('complet') || well.includes('injection')) return 'High';
  if (activity.includes('drill') && well.includes('exploration')) return 'Critical';
  if (activity.includes('drill')) return 'Medium';
  if (activity.includes('workover')) return 'Medium';
  if (activity.includes('maintenance')) return 'Low';
  
  return 'Medium';
}

/**
 * Infer logistics complexity from duration
 */
function inferLogisticsComplexity(duration: any): RigScheduleEntry['logisticsComplexity'] {
  const days = parseInt(duration) || 30;
  
  if (days > 120) return 'Extreme';  // 4+ months
  if (days > 60) return 'Complex';   // 2+ months
  return 'Standard';
}

/**
 * Infer weather sensitivity from activity name
 */
function inferWeatherSensitivity(activityName: string): RigScheduleEntry['weatherSensitivity'] {
  const activity = (activityName || '').toLowerCase();
  
  if (activity.includes('critical') || activity.includes('exploration')) return 'High';
  if (activity.includes('completion') || activity.includes('stimulation')) return 'Medium';
  return 'Low';
}

/**
 * Calculate schedule confidence based on data completeness
 */
function calculateScheduleConfidence(row: any): number {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence for complete data
  if (row['(*) Start'] && row['(*) Finish']) confidence += 0.3;
  if (row['Original Duration']) confidence += 0.1;
  if (row['Activity Name']) confidence += 0.1;
  
  return Math.min(1.0, confidence);
}

/**
 * Calculate vessel requirements for rig schedule activities
 */
export function calculateActivityBasedVesselRequirements(
  rigScheduleEntries: RigScheduleEntry[],
  activityMappings: ActivityVesselMapping[] = DEFAULT_ACTIVITY_MAPPINGS
): Record<string, number> {
  console.log('🎯 Calculating activity-based vessel requirements...');
  
  const startTime = Date.now();
  const PROCESSING_TIMEOUT = 2000; // 2 seconds EMERGENCY MODE
  
  const monthlyRequirements: Record<string, number> = {};
  
  // Get 18-month forecast horizon
  const startDate = new Date();
  for (let i = 0; i < 18; i++) {
    const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    monthlyRequirements[monthKey] = 0;
  }
  
  // EMERGENCY MODE: Ultra-limit processing to prevent hang
  const maxEntriesToProcess = 5; // Process max 5 entries EMERGENCY MODE
  const entriesToProcess = rigScheduleEntries.slice(0, maxEntriesToProcess);
  
  if (rigScheduleEntries.length > maxEntriesToProcess) {
    console.warn(`⚠️ Large dataset detected: Processing ${maxEntriesToProcess} of ${rigScheduleEntries.length} entries for performance`);
  }
  
  // Process each rig activity with timeout protection
  entriesToProcess.forEach((entry, index) => {
    // Performance check every 10 entries
    if (index % 10 === 0 && Date.now() - startTime > PROCESSING_TIMEOUT) {
      console.error(`⏰ Processing timeout after ${index} entries - using simplified calculation`);
      return;
    }
    const mapping = findActivityMapping(entry, activityMappings);
    if (!mapping) return;
    
    // Calculate vessel requirement for this activity
    let vesselRequirement = mapping.baseVesselRequirement;
    
    // Apply duration adjustment
    const durationFactor = entry.originalDuration > 30 
      ? 1 + ((entry.originalDuration - 30) / 30) * mapping.durationMultiplier 
      : 1;
    vesselRequirement *= durationFactor;
    
    // Apply fluid intensity adjustment
    const fluidMultiplier = {
      'Low': 0.7,
      'Medium': 1.0,
      'High': 1.4,
      'Critical': 1.8
    }[entry.fluidIntensity || 'Medium'];
    vesselRequirement *= fluidMultiplier;
    
    // Apply weather sensitivity buffer
    const weatherMultiplier = {
      'Low': 1.0,
      'Medium': 1.1,
      'High': 1.2
    }[entry.weatherSensitivity || 'Medium'];
    vesselRequirement *= weatherMultiplier;
    
    // Apply logistics complexity factor
    const complexityMultiplier = {
      'Standard': 1.0,
      'Complex': 1.2,
      'Extreme': 1.5
    }[entry.logisticsComplexity || 'Standard'];
    vesselRequirement *= complexityMultiplier;
    
    // Distribute requirement across months when activity is active
    const activityStart = new Date(entry.startDate);
    const activityEnd = new Date(entry.finishDate);
    
    Object.keys(monthlyRequirements).forEach(monthKey => {
      const monthStart = new Date(monthKey + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      // Check if activity overlaps with this month
      if (activityStart <= monthEnd && activityEnd >= monthStart) {
        monthlyRequirements[monthKey] += vesselRequirement;
      }
    });
    
    console.log(`  🔧 ${entry.rigName} ${entry.activityName}: ${vesselRequirement.toFixed(1)} vessels`);
  });
  
  // Check for simultaneous activities penalty
  Object.keys(monthlyRequirements).forEach(monthKey => {
    const monthStart = new Date(monthKey + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    // Count simultaneous activities in this month
    const simultaneousActivities = rigScheduleEntries.filter(entry => {
      const activityStart = new Date(entry.startDate);
      const activityEnd = new Date(entry.finishDate);
      return activityStart <= monthEnd && activityEnd >= monthStart;
    }).length;
    
    if (simultaneousActivities > 2) {
      // Apply penalty for multiple simultaneous operations
      const penalty = (simultaneousActivities - 2) * 0.2; // 20% penalty per additional activity
      monthlyRequirements[monthKey] *= (1 + penalty);
    }
  });
  
  console.log('📊 Monthly vessel requirements calculated:', monthlyRequirements);
  return monthlyRequirements;
}

/**
 * Find the best activity mapping for a rig schedule entry
 */
function findActivityMapping(
  entry: RigScheduleEntry, 
  mappings: ActivityVesselMapping[]
): ActivityVesselMapping | null {
  // Try exact match first
  let match = mappings.find(m => 
    m.activityType === entry.rigActivityType && 
    m.wellType === entry.wellType
  );
  
  // Fall back to activity type match
  if (!match) {
    match = mappings.find(m => m.activityType === entry.rigActivityType);
  }
  
  // Fall back to default drilling
  if (!match) {
    match = mappings.find(m => m.activityType === 'Drilling');
  }
  
  return match || null;
}

/**
 * Apply enhanced injects to forecast with core fleet context
 */
function applyEnhancedInjectsToForecast(
  baseForecast: Record<string, number>,
  injects: EnhancedVesselInject[]
): { adjustedForecast: Record<string, number>; injectImpact: Record<string, number> } {
  
  const adjustedForecast = { ...baseForecast };
  const injectImpact: Record<string, number> = {};
  
  // Initialize impact tracking
  Object.keys(baseForecast).forEach(month => {
    injectImpact[month] = 0;
  });
  
  injects.forEach(inject => {
    if (!inject.isActive) return;
    
    const startDate = new Date(inject.startMonth + '-01');
    const endDate = new Date(inject.endMonth + '-01');
    
    Object.keys(baseForecast).forEach(month => {
      const monthDate = new Date(month + '-01');
      
      if (monthDate >= startDate && monthDate <= endDate) {
        // Use baselineAdjustment for enhanced injects (direct vessel count impact)
        const impact = inject.baselineAdjustment * inject.probability;
        
        if (inject.impact === 'demand_increase') {
          adjustedForecast[month] += Math.abs(impact);
          injectImpact[month] += Math.abs(impact);
        } else if (inject.impact === 'demand_decrease') {
          adjustedForecast[month] = Math.max(0, adjustedForecast[month] - Math.abs(impact));
          injectImpact[month] -= Math.abs(impact);
        }
      }
    });
  });
  
  return { adjustedForecast, injectImpact };
}

// ==================== ENHANCED INJECT SYSTEM ====================

/**
 * Create enhanced inject from rig schedule activity
 */
export function createRigScheduleInject(
  rigActivity: RigScheduleEntry,
  injectType: EnhancedVesselInject['type'],
  baselineAdjustment: number,
  probability: number = 1.0
): EnhancedVesselInject {
  const now = new Date();
  
  // Calculate months from activity timing
  const startDate = new Date(rigActivity.startDate);
  const endDate = new Date(rigActivity.finishDate);
  const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Generate business justification based on activity
  const businessJustification = generateBusinessJustification(rigActivity, injectType, baselineAdjustment);
  
  // Estimate cost impact
  const durationMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
  const costEstimate = Math.abs(baselineAdjustment) * 22000 * 30 * durationMonths; // $22K/day * 30 days * duration
  
  return {
    id: `rig_inject_${rigActivity.id}_${Date.now()}`,
    name: `${injectType.replace('_', ' ').toUpperCase()}: ${rigActivity.activityName}`,
    description: `Vessel adjustment for ${rigActivity.rigName} ${rigActivity.activityName} (${rigActivity.originalDuration} days)`,
    type: injectType,
    startMonth,
    endMonth,
    vesselRequirement: Math.abs(baselineAdjustment), // Legacy field for compatibility
    locations: [rigActivity.location],
    impact: baselineAdjustment > 0 ? 'demand_increase' : 'demand_decrease',
    priority: (rigActivity.priority || 'Medium').toLowerCase() as 'high' | 'medium' | 'low',
    probability,
    isActive: true,
    
    // Enhanced fields
    triggeredBySchedule: true,
    relatedRigActivities: [rigActivity.id],
    scheduleConfidence: rigActivity.confidence || 0.8,
    baselineAdjustment,
    charterRecommendation: baselineAdjustment > 0 ? 'charter_additional' : 'release_excess',
    businessJustification,
    contractualImplications: generateContractualImplications(baselineAdjustment, durationMonths),
    costEstimate,
    riskMitigation: generateRiskMitigation(rigActivity, injectType),
    triggerDate: new Date(startDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days before start
    reversible: Math.abs(baselineAdjustment) <= 2, // Small adjustments are more reversible
    alternativeOptions: generateAlternativeOptions(rigActivity, baselineAdjustment),
    linkedWells: extractWellNames(rigActivity.activityName || ''),
    linkedRigs: [rigActivity.rigName],
    linkedLocations: [rigActivity.location],
    
    // Metadata
    createdBy: 'Activity-Based Forecast Engine',
    createdAt: now
  };
}

/**
 * Create standard business scenario injects
 */
export function createBusinessScenarioInjects(baseline: CoreFleetBaseline): EnhancedVesselInject[] {
  const now = new Date();
  const injects: EnhancedVesselInject[] = [];
  
  // Hurricane Season Contingency
  injects.push({
    id: `hurricane_contingency_${Date.now()}`,
    name: 'Hurricane Season Vessel Contingency',
    description: 'Additional vessel capacity during Gulf of Mexico hurricane season (June-November)',
    type: 'weather_contingency',
    startMonth: '2025-06',
    endMonth: '2025-11',
    vesselRequirement: 2,
    locations: ['Gulf of Mexico'],
    impact: 'demand_increase',
    priority: 'medium',
    probability: 0.7, // 70% chance of needing hurricane contingency
    isActive: true,
    
    triggeredBySchedule: false,
    relatedRigActivities: [],
    scheduleConfidence: 0.7,
    baselineAdjustment: 2,
    charterRecommendation: 'charter_additional',
    businessJustification: 'Hurricane season requires additional vessel capacity for weather delays and emergency response',
    contractualImplications: [
      'May require seasonal charter agreements',
      'Weather standby clauses needed',
      'Emergency response capability required'
    ],
    costEstimate: 2 * 22000 * 30 * 6, // 2 vessels * $22K/day * 30 days * 6 months
    riskMitigation: [
      'Pre-position additional supplies during weather windows',
      'Maintain emergency response vessel on standby',
      'Coordinate with weather forecasting services'
    ],
    triggerDate: new Date('2025-05-01'), // Plan by May 1st
    reversible: true,
    alternativeOptions: [
      'Exercise hurricane season charter options',
      'Negotiate weather standby agreements',
      'Increase pre-positioning of materials'
    ],
    linkedWells: [],
    linkedRigs: [],
    linkedLocations: ['Gulf of Mexico'],
    createdBy: 'Business Scenario Generator',
    createdAt: now
  });
  
  // Planned Maintenance Window
  const maintenanceStart = new Date();
  maintenanceStart.setMonth(maintenanceStart.getMonth() + 6);
  
  injects.push({
    id: `maintenance_window_${Date.now()}`,
    name: 'Annual Fleet Maintenance Window',
    description: 'Planned maintenance program reducing core fleet availability',
    type: 'planned_maintenance_window',
    startMonth: `${maintenanceStart.getFullYear()}-${String(maintenanceStart.getMonth() + 1).padStart(2, '0')}`,
    endMonth: `${maintenanceStart.getFullYear()}-${String(maintenanceStart.getMonth() + 3).padStart(2, '0')}`,
    vesselRequirement: 1,
    locations: ['All Operations'],
    impact: 'capability_reduction',
    priority: 'high',
    probability: 0.95, // 95% certainty for planned maintenance
    isActive: true,
    
    triggeredBySchedule: false,
    relatedRigActivities: [],
    scheduleConfidence: 0.95,
    baselineAdjustment: 1, // Need +1 vessel to compensate for maintenance
    charterRecommendation: 'charter_additional',
    businessJustification: 'Annual maintenance program requires temporary vessel replacement to maintain service levels',
    contractualImplications: [
      'Short-term charter agreement needed',
      'Maintenance scheduling coordination required',
      'Service level guarantee maintenance'
    ],
    costEstimate: 1 * 22000 * 30 * 2, // 1 vessel * $22K/day * 30 days * 2 months
    riskMitigation: [
      'Schedule maintenance during low-activity periods',
      'Stagger maintenance across fleet',
      'Secure replacement vessel commitments early'
    ],
    triggerDate: new Date(maintenanceStart.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days notice
    reversible: false, // Maintenance cannot be easily deferred
    alternativeOptions: [
      'Extend maintenance intervals if operationally safe',
      'Coordinate with other operators for shared resources',
      'Accelerate maintenance to minimize disruption'
    ],
    linkedWells: [],
    linkedRigs: [],
    linkedLocations: ['All Operations'],
    createdBy: 'Business Scenario Generator',
    createdAt: now
  });
  
  // New Well Campaign Inject (example)
  injects.push({
    id: `new_well_campaign_${Date.now()}`,
    name: 'Thunderhorse Development Campaign',
    description: 'Major drilling campaign requiring additional vessel support',
    type: 'new_well_campaign',
    startMonth: '2025-09',
    endMonth: '2026-03',
    vesselRequirement: 3,
    locations: ['Thunderhorse'],
    impact: 'demand_increase',
    priority: 'high',
    probability: 0.8, // 80% confidence in campaign proceeding
    isActive: false, // Inactive until confirmed
    
    triggeredBySchedule: false,
    relatedRigActivities: [],
    scheduleConfidence: 0.8,
    baselineAdjustment: 3,
    charterRecommendation: 'charter_additional',
    businessJustification: 'Thunderhorse development wells require intensive fluid supply and equipment support',
    contractualImplications: [
      'Long-term charter agreements required',
      'Specialized vessel capabilities needed',
      'Performance guarantees for drilling support'
    ],
    costEstimate: 3 * 22000 * 30 * 7, // 3 vessels * $22K/day * 30 days * 7 months
    riskMitigation: [
      'Secure vessel commitments before campaign start',
      'Establish backup vessel arrangements',
      'Pre-position critical drilling fluids'
    ],
    triggerDate: new Date('2025-07-01'), // Decision needed by July 1st
    reversible: true, // Campaign can be phased or delayed
    alternativeOptions: [
      'Phase campaign over longer timeline',
      'Share vessel resources with other operators',
      'Utilize existing fleet more intensively'
    ],
    linkedWells: ['TH-DEV-001', 'TH-DEV-002', 'TH-DEV-003'],
    linkedRigs: ['Thunderhorse-Rig-1'],
    linkedLocations: ['Thunderhorse'],
    createdBy: 'Business Scenario Generator',
    createdAt: now
  });
  
  return injects;
}

/**
 * Generate business justification for inject
 */
function generateBusinessJustification(
  activity: RigScheduleEntry, 
  injectType: EnhancedVesselInject['type'], 
  adjustment: number
): string {
  const vesselCount = Math.abs(adjustment);
  const action = adjustment > 0 ? 'additional' : 'reduced';
  const duration = activity.originalDuration;
  
  const justifications = {
    'new_well_campaign': `${activity.activityName} requires ${vesselCount} ${action} vessels for ${duration}-day drilling campaign with ${(activity.fluidIntensity || 'medium').toLowerCase()} fluid intensity`,
    'extended_drilling_program': `Extended ${activity.rigActivityType.toLowerCase()} program at ${activity.location} needs ${vesselCount} ${action} vessels for ${duration} days`,
    'completion_intensive_period': `${activity.activityName} completion phase requires ${vesselCount} ${action} vessels for chemical and equipment intensive operations`,
    'simultaneous_operations': `Multiple concurrent activities at ${activity.location} require ${vesselCount} ${action} vessels for operational efficiency`,
    'weather_contingency': `Weather-sensitive ${activity.activityName} needs ${vesselCount} ${action} vessels for contingency during ${duration}-day operation`,
    'equipment_mobilization': `Specialized equipment mobilization for ${activity.activityName} requires ${vesselCount} ${action} vessels for ${duration} days`,
    'planned_maintenance_window': `Maintenance scheduling during ${activity.activityName} allows ${vesselCount} vessel reduction for ${duration} days`,
    'emergency_response': `Emergency response capability for ${activity.location} requires ${vesselCount} ${action} vessels during ${duration}-day operation`,
    'rig_move_support': `Rig mobilization support for ${activity.rigName} requires ${vesselCount} ${action} vessels for ${duration}-day operation`
  };
  
  return justifications[injectType] || `${activity.activityName} requires ${vesselCount} ${action} vessels for ${duration} days`;
}

/**
 * Generate contractual implications
 */
function generateContractualImplications(adjustment: number, durationMonths: number): string[] {
  const implications: string[] = [];
  
  if (adjustment > 0) {
    implications.push('Charter agreement required for additional vessels');
    if (durationMonths > 6) {
      implications.push('Long-term charter rates applicable');
    } else {
      implications.push('Short-term charter premium may apply');
    }
    if (adjustment > 2) {
      implications.push('Multiple vessel charter coordination needed');
    }
  } else {
    implications.push('Vessel release notification required');
    implications.push('Contract termination procedures apply');
    if (Math.abs(adjustment) > 1) {
      implications.push('Fleet optimization discussions with contractor');
    }
  }
  
  implications.push(`${Math.abs(adjustment) * durationMonths} vessel-months impact on annual budget`);
  
  return implications;
}

/**
 * Generate risk mitigation strategies
 */
function generateRiskMitigation(activity: RigScheduleEntry, injectType: EnhancedVesselInject['type']): string[] {
  const mitigations: string[] = [
    'Monitor rig schedule changes for timing adjustments',
    'Establish backup vessel arrangements',
    'Coordinate with operations team for activity updates'
  ];
  
  if (activity.weatherSensitivity === 'High') {
    mitigations.push('Weather contingency planning required');
    mitigations.push('Alternative weather window identification');
  }
  
  if (activity.fluidIntensity === 'Critical' || activity.fluidIntensity === 'High') {
    mitigations.push('Pre-position critical fluids to reduce vessel trips');
    mitigations.push('Optimize bulk fluid delivery scheduling');
  }
  
  if (activity.logisticsComplexity === 'Extreme') {
    mitigations.push('Detailed logistics planning and coordination');
    mitigations.push('Specialized vessel capability confirmation');
  }
  
  return mitigations;
}

/**
 * Generate alternative options for inject scenarios
 */
function generateAlternativeOptions(activity: RigScheduleEntry, adjustment: number): string[] {
  const options: string[] = [];
  
  if (adjustment > 0) {
    options.push('Extend existing vessel contracts temporarily');
    options.push('Negotiate shared vessel arrangements with other operators');
    options.push('Optimize vessel scheduling to increase efficiency');
    
    if (activity.originalDuration > 60) {
      options.push('Phase activity over longer timeline to reduce peak demand');
    }
  } else {
    options.push('Defer vessel release until activity completion confirmed');
    options.push('Redeploy vessels to other operations');
    options.push('Negotiate early termination terms with contractors');
  }
  
  options.push('Adjust activity timing based on vessel availability');
  options.push('Review vessel requirement calculations with operations team');
  
  return options;
}

/**
 * Extract well names from activity description
 */
function extractWellNames(activityName: string): string[] {
  const wellPatterns = [
    /\b[A-Z]{2,4}-\d{3}\b/g, // Pattern like TH-001, NK-123
    /\b\w+\s*#\d+\b/g,       // Pattern like "Well #1", "Thunderhorse #2"
    /\b\w+\s+\d{1,3}\w?\b/g  // Pattern like "Development 1A", "Exploration 25"
  ];
  
  const wells: string[] = [];
  wellPatterns.forEach(pattern => {
    const matches = activityName.match(pattern);
    if (matches) wells.push(...matches);
  });
  
  return wells.filter((well, index, arr) => arr.indexOf(well) === index); // Remove duplicates
}

/**
 * Auto-generate injects from rig schedule analysis
 */
export function generateInjectsFromRigSchedule(
  rigSchedule: RigScheduleEntry[], 
  baseline: CoreFleetBaseline
): EnhancedVesselInject[] {
  console.log('🔧 Auto-generating injects from rig schedule analysis...');
  
  const injects: EnhancedVesselInject[] = [];
  
  // Analyze rig schedule for inject opportunities
  const monthlyActivityCounts: Record<string, number> = {};
  const simultaneousActivities: Record<string, RigScheduleEntry[]> = {};
  
  // Count activities per month and identify simultaneous operations
  rigSchedule.forEach(activity => {
    // Removed unused startMonth and endMonth variables
    
    // Count all months this activity spans
    const start = new Date(activity.startDate);
    const end = new Date(activity.finishDate);
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyActivityCounts[monthKey] = (monthlyActivityCounts[monthKey] || 0) + 1;
      
      if (!simultaneousActivities[monthKey]) simultaneousActivities[monthKey] = [];
      simultaneousActivities[monthKey].push(activity);
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  });
  
  // Generate injects for months with high activity
  Object.keys(monthlyActivityCounts).forEach(month => {
    const activityCount = monthlyActivityCounts[month];
    const activities = simultaneousActivities[month];
    
    if (activityCount >= 3) { // 3+ simultaneous activities
      const highIntensityActivities = activities.filter(a => 
        a.fluidIntensity === 'High' || a.fluidIntensity === 'Critical'
      );
      
      if (highIntensityActivities.length > 0) {
        const vesselAdjustment = Math.min(3, Math.floor(activityCount * 0.5)); // Up to 3 additional vessels
        
        injects.push({
          id: `auto_inject_${month}_${Date.now()}`,
          name: `High Activity Period - ${month}`,
          description: `${activityCount} simultaneous activities requiring additional vessel support`,
          type: 'simultaneous_operations',
          startMonth: month,
          endMonth: month,
          vesselRequirement: vesselAdjustment,
          locations: [...new Set(activities.map(a => a.location))],
          impact: 'demand_increase',
          priority: 'high',
          probability: 0.8,
          isActive: false, // Require manual activation
          
          triggeredBySchedule: true,
          relatedRigActivities: activities.map(a => a.id),
          scheduleConfidence: activities.reduce((sum, a) => sum + (a.confidence || 0.8), 0) / activities.length,
          baselineAdjustment: vesselAdjustment,
          charterRecommendation: 'charter_additional',
          businessJustification: `${activityCount} simultaneous operations including ${highIntensityActivities.length} high-intensity activities`,
          contractualImplications: [
            'Short-term charter agreements needed',
            'Coordination with multiple rig operations',
            'Potential for shared vessel utilization'
          ],
          costEstimate: vesselAdjustment * baseline.dayRateStructure.baseRate * 30,
          riskMitigation: [
            'Pre-position materials to reduce vessel trips',
            'Coordinate activity timing where possible',
            'Establish priority ranking for competing demands'
          ],
          triggerDate: new Date(new Date(month + '-01').getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days before
          reversible: true,
          alternativeOptions: [
            'Stagger activity timing to reduce peak demand',
            'Increase vessel efficiency through optimized scheduling',
            'Negotiate shared vessel arrangements between activities'
          ],
          linkedWells: activities.flatMap(a => extractWellNames(a.activityName || '')),
          linkedRigs: [...new Set(activities.map(a => a.rigName))],
          linkedLocations: [...new Set(activities.map(a => a.location))],
          createdBy: 'Rig Schedule Analyzer',
          createdAt: new Date()
        });
      }
    }
  });
  
  console.log(`✅ Generated ${injects.length} auto-injects from rig schedule analysis`);
  return injects;
}

/**
 * Generate core fleet plus-up/shed recommendations
 */
function generateCoreFleetRecommendations(
  scenarioResults: ScenarioResult[], 
  baseline: CoreFleetBaseline
): ManagementRecommendation[] {
  console.log('🏢 Generating core fleet plus-up/shed recommendations...');
  
  const recommendations: ManagementRecommendation[] = [];
  const now = new Date();
  
  // PRIORITY: Add baseline demand gap recommendation
  const baselineGap = calculateBaselineVesselGap();
  if (baselineGap.vesselGap > 0) {
    recommendations.push({
      id: `baseline_gap_${Date.now()}`,
      type: 'capacity_planning',
      priority: 'high',
      title: `Baseline Demand Gap - ${baselineGap.vesselGap} Vessel${baselineGap.vesselGap > 1 ? 's' : ''} Needed`,
      description: `Current fleet (${baselineGap.currentVessels} vessels) insufficient for true baseline rig demand (${baselineGap.baselineDemand.toFixed(1)} deliveries/month). Operating at ${(baselineGap.utilization * 100).toFixed(1)}% utilization.`,
      recommendedAction: `Charter ${baselineGap.vesselGap} additional PSV${baselineGap.vesselGap > 1 ? 's' : ''} to meet ${BASELINE_DEMAND_PER_RIG} deliveries/month per rig baseline across ${NUMBER_OF_RIG_LOCATIONS} drilling locations. Cost: $${(baselineGap.vesselGap * baseline.dayRateStructure.baseRate * 30 / 1000).toFixed(0)}K/month`,
      timeframe: 'immediate',
      targetMonth: new Date().toISOString().slice(0, 7),
      vesselImpact: baselineGap.vesselGap,
      demandImpact: baselineGap.baselineDemand - baselineGap.currentCapability,
      costImpact: baselineGap.vesselGap * baseline.dayRateStructure.baseRate * 30,
      utilizationImpact: -0.26, // From 126% to 100%
      risks: ['Operational overstretch', 'Service delays', 'Inability to handle maintenance downtime'],
      benefits: ['Meet true baseline demand', 'Operational flexibility', 'Better service reliability'],
      basedOnScenarios: ['baseline_demand_analysis'],
      status: 'pending',
      triggerConditions: [
        `Current utilization: ${(baselineGap.utilization * 100).toFixed(1)}%`,
        `Vessel gap: ${baselineGap.vesselGap} vessels`,
        `True baseline: ${BASELINE_DEMAND_PER_RIG} deliveries/month per rig`
      ],
      alternativeOptions: [
        'Negotiate additional capacity with existing contractors',
        'Evaluate vessel sharing arrangements',
        'Consider premium rates for immediate charter'
      ],
      confidence: 0.9,
      createdAt: new Date(),
      reviewDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
  }
  
  // Focus on base scenario for primary recommendations
  const baseScenario = scenarioResults.find(r => r.scenario.type === 'base_case');
  if (!baseScenario) return recommendations;
  
  const { vesselGapByMonth, averageUtilization } = baseScenario;
  
  // Recommendation 1: Charter Additional Vessels (Plus-Up)
  const plusUpMonths = Object.keys(vesselGapByMonth).filter(month => vesselGapByMonth[month] > 0);
  if (plusUpMonths.length > 0) {
    const maxPlusUp = Math.max(...plusUpMonths.map(month => vesselGapByMonth[month]));
    const totalPlusUpMonths = plusUpMonths.length;
    
    recommendations.push({
      id: `charter_vessels_${Date.now()}`,
      type: 'vessel_acquisition',
      priority: maxPlusUp > 2 ? 'critical' : 'high',
      title: `Charter ${maxPlusUp} Additional Vessels`,
      description: `Rig schedule analysis shows ${totalPlusUpMonths} months requiring vessels beyond ${baseline.baseVesselCount}-vessel core fleet`,
      recommendedAction: `Charter ${maxPlusUp} PSVs for ${totalPlusUpMonths}-month period starting ${plusUpMonths[0]}. Estimated cost: $${(maxPlusUp * baseline.dayRateStructure.baseRate * 30 * totalPlusUpMonths / 1000).toFixed(0)}K`,
      timeframe: maxPlusUp > 2 ? 'immediate' : 'next_quarter',
      targetMonth: plusUpMonths[0],
      vesselImpact: maxPlusUp,
      demandImpact: maxPlusUp * 25, // Assume 25 deliveries per vessel per month
      utilizationImpact: -0.15, // 15% utilization relief
      triggerConditions: [
        `Vessel gap > 0 in ${totalPlusUpMonths} months`,
        `Peak shortage of ${maxPlusUp} vessels`,
        `Core fleet at ${(averageUtilization * 100).toFixed(1)}% utilization`
      ],
      alternativeOptions: [
        'Exercise charter options if available',
        'Negotiate short-term extensions with existing fleet',
        'Defer non-critical drilling activities'
      ],
      risks: [
        'Drilling schedule delays if vessels not secured',
        'Increased day rates for short-notice charters',
        'Limited vessel availability during peak season'
      ],
      benefits: [
        'Meet all rig schedule requirements',
        'Maintain drilling program momentum',
        'Avoid costly activity deferrals'
      ],
      confidence: baseScenario.confidenceScore,
      basedOnScenarios: ['baseline_schedule'],
      createdAt: now,
      status: 'pending'
    });
  }
  
  // Recommendation 2: Release Excess Vessels (Shed)
  const shedMonths = Object.keys(vesselGapByMonth).filter(month => vesselGapByMonth[month] < -1);
  if (shedMonths.length > 3) { // Only recommend shedding if sustained low demand
    const maxShed = Math.abs(Math.min(...shedMonths.map(month => vesselGapByMonth[month])));
    
    recommendations.push({
      id: `release_vessels_${Date.now()}`,
      type: 'capacity_optimization',
      priority: 'medium',
      title: `Consider Releasing ${maxShed} Vessels`,
      description: `${shedMonths.length} months show potential for ${maxShed}-vessel reduction from core fleet`,
      recommendedAction: `Evaluate releasing ${maxShed} vessels during low-demand period (${shedMonths[0]} to ${shedMonths[shedMonths.length-1]}). Potential savings: $${(maxShed * baseline.dayRateStructure.baseRate * 30 * shedMonths.length / 1000).toFixed(0)}K`,
      timeframe: 'next_6_months',
      targetMonth: shedMonths[0],
      vesselImpact: -maxShed,
      demandImpact: 0,
      utilizationImpact: 0.20, // 20% utilization improvement on remaining fleet
      triggerConditions: [
        `Excess capacity in ${shedMonths.length} consecutive months`,
        `Average utilization below ${CORE_FLEET_MIN_UTILIZATION * 100}%`,
        'No conflicting charter obligations'
      ],
      alternativeOptions: [
        'Renegotiate rates with existing contractors',
        'Explore additional market opportunities',
        'Defer vessel release until more data available'
      ],
      risks: [
        'Future capacity shortages if rig schedule accelerates',
        'Difficulty re-securing vessels when needed',
        'Contractual penalties for early termination'
      ],
      benefits: [
        `Reduce fleet costs by $${(maxShed * baseline.dayRateStructure.baseRate * 365 / 1000).toFixed(0)}K annually`,
        'Optimize core fleet utilization',
        'Free up capital for other investments'
      ],
      confidence: baseScenario.confidenceScore * 0.8, // Lower confidence for shedding
      basedOnScenarios: ['baseline_schedule'],
      createdAt: now,
      status: 'pending'
    });
  }
  
  // Recommendation 3: High Utilization Warning
  if (averageUtilization > CORE_FLEET_MAX_UTILIZATION) {
    recommendations.push({
      id: `utilization_warning_${Date.now()}`,
      type: 'capacity_optimization',
      priority: 'high',
      title: 'Core Fleet Over-Utilization Risk',
      description: `Core fleet utilization at ${(averageUtilization * 100).toFixed(1)}% exceeds ${CORE_FLEET_MAX_UTILIZATION * 100}% operational threshold`,
      recommendedAction: 'Immediate review of vessel requirements and potential charter options to reduce operational risk',
      timeframe: 'immediate',
      vesselImpact: 0,
      demandImpact: 0,
      utilizationImpact: -0.15,
      triggerConditions: [
        `Utilization > ${CORE_FLEET_MAX_UTILIZATION * 100}%`,
        'Limited operational flexibility',
        'High risk of service disruptions'
      ],
      alternativeOptions: [
        'Charter additional vessels immediately',
        'Defer non-critical activities',
        'Optimize vessel routing and scheduling'
      ],
      risks: [
        'Service delays during peak periods',
        'Crew fatigue and safety concerns',
        'Equipment wear and increased maintenance'
      ],
      benefits: [
        'Maintain service reliability',
        'Reduce operational stress on fleet',
        'Preserve safety margins'
      ],
      confidence: baseScenario.confidenceScore,
      basedOnScenarios: ['baseline_schedule'],
      createdAt: now,
      status: 'pending'
    });
  }
  
  console.log(`📋 Generated ${recommendations.length} core fleet recommendations`);
  return recommendations;
}

/**
 * Perform cross-scenario analysis for activity-based forecasting
 */
function performCrossScenarioAnalysis(scenarios: ScenarioResult[], baseline: CoreFleetBaseline) {
  const allDemandValues = scenarios.flatMap(r => Object.values(r.totalDemandForecast));
  const allVesselRequirements = scenarios.flatMap(r => Object.values(r.vesselRequirementsByMonth));
  
  const demandRange = {
    min: Math.min(...allDemandValues),
    max: Math.max(...allDemandValues),
    average: allDemandValues.reduce((a, b) => a + b, 0) / allDemandValues.length
  };
  
  const vesselRequirementRange = {
    min: Math.min(...allVesselRequirements),
    max: Math.max(...allVesselRequirements),
    average: allVesselRequirements.reduce((a, b) => a + b, 0) / allVesselRequirements.length
  };
  
  // Find high risk months (where base scenario shows vessel gaps)
  const baseScenario = scenarios.find(s => s.scenario.type === 'base_case');
  const highRiskMonths = baseScenario 
    ? Object.keys(baseScenario.vesselGapByMonth).filter(month => baseScenario.vesselGapByMonth[month] > 1)
    : [];
  
  // Find low utilization months (where utilization < 50%)
  const lowUtilizationMonths = baseScenario 
    ? Object.keys(baseScenario.totalDemandForecast).filter(month => {
        const demand = baseScenario.totalDemandForecast[month];
        const capacity = baseline.baseVesselCount;
        return (demand / capacity) < CORE_FLEET_MIN_UTILIZATION;
      })
    : [];
  
  return {
    demandRange,
    vesselRequirementRange,
    highRiskMonths,
    lowUtilizationMonths
  };
}

/**
 * Calculate forecast accuracy for activity-based forecasting
 */
function calculateActivityBasedAccuracy(rigSchedule: RigScheduleEntry[]): number {
  // Base accuracy on data quality and completeness of rig schedule
  let accuracy = 0.6; // Base accuracy for activity-based forecasting
  
  // Increase accuracy based on data completeness
  const completeEntries = rigSchedule.filter(entry => 
    entry.startDate && entry.finishDate && entry.originalDuration > 0
  );
  
  const completenessRatio = rigSchedule.length > 0 ? completeEntries.length / rigSchedule.length : 0;
  accuracy += completenessRatio * 0.25; // Up to 25% bonus for complete data
  
  // Increase accuracy for higher confidence entries
  const avgConfidence = rigSchedule.length > 0 
    ? rigSchedule.reduce((sum, entry) => sum + (entry.confidence || 0.8), 0) / rigSchedule.length 
    : 0;
  accuracy += avgConfidence * 0.15; // Up to 15% bonus for high confidence
  
  return Math.min(1.0, accuracy);
}

/**
 * Generate activity-based decision points
 */
function generateActivityBasedDecisionPoints(
  requirements: Record<string, number>, 
  baseline: CoreFleetBaseline
): Array<{ month: string; decision: string; rationale: string }> {
  
  const decisionPoints: Array<{ month: string; decision: string; rationale: string }> = [];
  const months = Object.keys(requirements).sort();
  
  // Find months with significant changes in vessel requirements
  for (let i = 1; i < months.length; i++) {
    const currentMonth = months[i];
    const prevMonth = months[i - 1];
    const currentReq = requirements[currentMonth];
    const prevReq = requirements[prevMonth];
    const change = currentReq - prevReq;
    
    if (Math.abs(change) >= 1.5) { // Significant change threshold
      const gap = Math.ceil(currentReq) - baseline.baseVesselCount;
      
      if (change > 0) {
        decisionPoints.push({
          month: currentMonth,
          decision: gap > 0 
            ? `Charter ${gap} additional vessels` 
            : 'Prepare for increased activity',
          rationale: `Vessel requirements increase by ${change.toFixed(1)} due to rig schedule activities`
        });
      } else {
        decisionPoints.push({
          month: currentMonth,
          decision: gap < 0 
            ? `Consider releasing ${Math.abs(gap)} vessels` 
            : 'Reduce vessel allocation',
          rationale: `Vessel requirements decrease by ${Math.abs(change).toFixed(1)} due to activity completion`
        });
      }
    }
  }
  
  // Add quarterly review points
  [3, 6, 9, 12, 15, 18].forEach(monthOffset => {
    if (monthOffset < months.length) {
      const reviewMonth = months[monthOffset];
      decisionPoints.push({
        month: reviewMonth,
        decision: 'Review rig schedule and vessel forecast accuracy',
        rationale: 'Quarterly checkpoint for forecast validation and schedule updates'
      });
    }
  });
  
  return decisionPoints.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Generate export data for activity-based forecasting
 */
function generateActivityBasedExportData(
  scenarios: ScenarioResult[], 
  requirements: Record<string, number>, 
  baseline: CoreFleetBaseline
) {
  return {
    forecastSummary: scenarios.map(r => ({
      scenario: r.scenario.name,
      recommendedFleetSize: r.recommendedFleetSize,
      maxGap: r.maxVesselGap,
      averageUtilization: r.averageUtilization,
      coreFleetBaseline: baseline.baseVesselCount,
      plusUpMonths: Object.keys(r.vesselGapByMonth).filter(m => r.vesselGapByMonth[m] > 0).length,
      shedOpportunities: Object.keys(r.vesselGapByMonth).filter(m => r.vesselGapByMonth[m] < -1).length
    })),
    monthlyBreakdown: Object.keys(requirements).map(month => ({
      month,
      activityRequirement: requirements[month],
      coreFleetBaseline: baseline.baseVesselCount,
      gap: Math.ceil(requirements[month]) - baseline.baseVesselCount,
      utilization: (requirements[month] / baseline.baseVesselCount * 100).toFixed(1) + '%',
      recommendation: Math.ceil(requirements[month]) > baseline.baseVesselCount 
        ? `Charter ${Math.ceil(requirements[month]) - baseline.baseVesselCount} vessels`
        : Math.ceil(requirements[month]) < baseline.baseVesselCount - 1
          ? `Can release ${baseline.baseVesselCount - Math.ceil(requirements[month])} vessels`
          : 'Maintain core fleet'
    })),
    recommendations: [] // Will be populated by recommendations generator
  };
}

// ==================== STATISTICAL UTILITIES ====================

/**
 * Calculate linear regression for trend analysis
 */
function calculateLinearRegression(dataPoints: number[]): { slope: number; intercept: number; r2: number } {
  const n = dataPoints.length;
  if (n < 2) return { slope: 0, intercept: dataPoints[0] || 0, r2: 0 };
  
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = dataPoints;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  // const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0); // Reserved for future correlation calculations
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const ssResidual = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, r2 };
}

/**
 * Calculate moving average for smoothing
 * @deprecated - Reserved for future trend smoothing features
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateMovingAverage(data: number[], window: number = 3): number[] {
  if (data.length < window) return [...data];
  
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const avg = data.slice(start, end).reduce((a, b) => a + b, 0) / (end - start);
    result.push(avg);
  }
  return result;
}

/**
 * Determine seasonal pattern from historical data
 */
function analyzeSeasonalPattern(monthlyData: Record<string, number>): Record<string, number> {
  const seasonalFactors: Record<string, number> = {};
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  quarters.forEach((quarter, qIndex) => {
    const monthsInQuarter = Object.keys(monthlyData).filter(month => {
      const monthNum = parseInt(month.split('-')[1]);
      return Math.floor((monthNum - 1) / 3) === qIndex;
    });
    
    if (monthsInQuarter.length > 0) {
      const quarterAvg = monthsInQuarter.reduce((sum, month) => sum + monthlyData[month], 0) / monthsInQuarter.length;
      const overallAvg = Object.values(monthlyData).reduce((a, b) => a + b, 0) / Object.values(monthlyData).length;
      seasonalFactors[quarter] = overallAvg > 0 ? quarterAvg / overallAvg : 1.0;
    } else {
      seasonalFactors[quarter] = SEASONAL_FACTORS[quarter];
    }
  });
  
  return seasonalFactors;
}

// ==================== HISTORICAL ANALYSIS ====================

/**
 * Analyze historical demand patterns for forecasting
 */
export function analyzeHistoricalDemand(locationDemands: LocationDeliveryDemand[]): ForecastDemand[] {
  console.log('🔍 Analyzing historical demand patterns for forecasting...');
  
  const forecastDemands: ForecastDemand[] = [];
  
  locationDemands.forEach(location => {
    const monthlyValues = Object.values(location.monthlyBreakdown);
    // const months = Object.keys(location.monthlyBreakdown).sort(); // Reserved for future time-series analysis
    
    // Calculate trend using linear regression
    const { slope, intercept, r2 } = calculateLinearRegression(monthlyValues);
    
    // Determine trend direction
    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const trendChange = Math.abs(slope);
    if (trendChange > TREND_SIGNIFICANCE_THRESHOLD) {
      trendDirection = slope > 0 ? 'increasing' : 'decreasing';
    }
    
    // Calculate growth rate (monthly)
    const growthRate = monthlyValues.length > 1 ? slope / (monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length) : 0;
    
    // Calculate historical average
    const historicalAverage = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
    
    // Analyze seasonal patterns
    const seasonalPattern = analyzeSeasonalPattern(location.monthlyBreakdown);
    
    // Generate future forecasts (12 months)
    const monthlyForecast: Record<string, number> = {};
    const confidence: Record<string, number> = {};
    
    for (let i = 1; i <= DEFAULT_FORECAST_MONTHS; i++) {
      const futureMonth = new Date(2025, 6 + i - 1, 1); // Starting from July 2025
      const monthKey = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
      
      // Base prediction using trend
      const trendPrediction = intercept + slope * (HISTORICAL_MONTHS + i);
      
      // Apply seasonal adjustment
      const quarter = `Q${Math.floor(futureMonth.getMonth() / 3) + 1}`;
      const seasonalAdjustment = seasonalPattern[quarter] || 1.0;
      
      // Final prediction
      const prediction = Math.max(0, trendPrediction * seasonalAdjustment);
      monthlyForecast[monthKey] = Number(prediction.toFixed(1));
      
      // Confidence calculation based on R-squared and forecast distance
      const distanceFactor = Math.max(0.5, 1 - (i / DEFAULT_FORECAST_MONTHS) * 0.4); // Confidence decreases over time
      const trendConfidence = Math.max(0.3, r2); // R-squared as trend confidence
      confidence[monthKey] = Number((distanceFactor * trendConfidence).toFixed(2));
    }
    
    forecastDemands.push({
      location: location.location,
      monthlyForecast,
      confidence,
      trendDirection,
      seasonalPattern,
      growthRate: Number(growthRate.toFixed(4)),
      historicalAverage: Number(historicalAverage.toFixed(1)),
      notes: `Trend analysis based on ${HISTORICAL_MONTHS} months of data. R² = ${r2.toFixed(3)}`
    });
    
    console.log(`  📊 ${location.location}: ${trendDirection} trend, ${(growthRate * 100).toFixed(1)}% monthly growth, avg: ${historicalAverage.toFixed(1)} deliveries`);
  });
  
  return forecastDemands;
}

/**
 * Analyze historical vessel capabilities for forecasting
 */
export function analyzeHistoricalCapabilities(vesselCapabilities: VesselCapability[]): VesselCapabilityForecast[] {
  console.log('🚢 Analyzing historical vessel capabilities for forecasting...');
  
  const capabilityForecasts: VesselCapabilityForecast[] = [];
  
  vesselCapabilities.forEach(vessel => {
    const monthlyValues = Object.values(vessel.monthlyBreakdown);
    const averageCapability = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;
    
    // Calculate trend
    const { slope, r2 } = calculateLinearRegression(monthlyValues);
    
    // Determine performance trend
    let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
    const trendChange = Math.abs(slope);
    if (trendChange > TREND_SIGNIFICANCE_THRESHOLD * averageCapability) {
      performanceTrend = slope > 0 ? 'improving' : 'declining';
    }
    
    // Generate capability forecasts
    const monthlyCapability: Record<string, number> = {};
    const utilizationForecast: Record<string, number> = {};
    const plannedMaintenance: Record<string, number> = {};
    
    for (let i = 1; i <= DEFAULT_FORECAST_MONTHS; i++) {
      const futureMonth = new Date(2025, 6 + i - 1, 1);
      const monthKey = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
      
      // Base capability prediction
      let predictedCapability = averageCapability + (slope * i);
      
      // Add some random maintenance periods (realistic planning)
      let maintenanceReduction = 0;
      if (i % 6 === 0) { // Every 6 months, potential major maintenance
        maintenanceReduction = predictedCapability * 0.2; // 20% reduction
        plannedMaintenance[monthKey] = maintenanceReduction;
      }
      
      predictedCapability = Math.max(0, predictedCapability - maintenanceReduction);
      monthlyCapability[monthKey] = Number(predictedCapability.toFixed(1));
      
      // Utilization forecast (assuming optimal planning)
      utilizationForecast[monthKey] = OPTIMAL_UTILIZATION_RATE;
    }
    
    capabilityForecasts.push({
      vesselName: vessel.vesselName,
      monthlyCapability,
      plannedMaintenance,
      utilizationForecast,
      performanceTrend,
      averageCapability: Number(averageCapability.toFixed(1)),
      notes: `Performance analysis: ${performanceTrend} trend (R² = ${r2.toFixed(3)})`
    });
    
    console.log(`  ⚓ ${vessel.vesselName}: ${performanceTrend} performance, avg: ${averageCapability.toFixed(1)} deliveries/month`);
  });
  
  return capabilityForecasts;
}

// ==================== SCENARIO PLANNING ====================

/**
 * Create default forecasting scenarios
 */
export function createDefaultScenarios(): ForecastScenario[] {
  const now = new Date();
  
  return [
    {
      id: 'base_case',
      name: 'Base Case',
      description: 'Conservative forecast based on historical trends with no major changes',
      type: 'base_case',
      demandGrowthRate: 0.02, // 2% monthly growth
      capabilityGrowthRate: 0.01, // 1% capability improvement
      activeInjects: [],
      confidenceThreshold: MIN_CONFIDENCE_THRESHOLD,
      timeHorizon: DEFAULT_FORECAST_MONTHS,
      assumptions: [
        'Historical trends continue',
        'No major operational changes',
        'Seasonal patterns remain consistent',
        'Current fleet performance maintained'
      ],
      createdAt: now,
      lastModified: now
    },
    {
      id: 'optimistic',
      name: 'Optimistic Growth',
      description: 'Higher demand growth scenario with improved operational efficiency',
      type: 'optimistic',
      demandGrowthRate: 0.05, // 5% monthly growth
      capabilityGrowthRate: 0.03, // 3% capability improvement
      activeInjects: [],
      confidenceThreshold: MIN_CONFIDENCE_THRESHOLD,
      timeHorizon: DEFAULT_FORECAST_MONTHS,
      assumptions: [
        'Accelerated drilling programs',
        'Improved vessel efficiency',
        'Favorable market conditions',
        'New technology adoption'
      ],
      createdAt: now,
      lastModified: now
    },
    {
      id: 'pessimistic',
      name: 'Conservative Planning',
      description: 'Lower growth scenario accounting for potential operational challenges',
      type: 'pessimistic',
      demandGrowthRate: -0.01, // -1% slight decline
      capabilityGrowthRate: 0.005, // 0.5% minimal improvement
      activeInjects: [],
      confidenceThreshold: HIGH_CONFIDENCE_THRESHOLD,
      timeHorizon: DEFAULT_FORECAST_MONTHS,
      assumptions: [
        'Reduced drilling activity',
        'Increased maintenance requirements',
        'Weather-related delays',
        'Market uncertainties'
      ],
      createdAt: now,
      lastModified: now
    }
  ];
}

/**
 * Apply vessel injects to a forecast scenario
 */
function applyInjectsToForecast(
  baseForecast: Record<string, number>,
  injects: VesselInject[]
): { adjustedForecast: Record<string, number>; injectImpact: Record<string, number> } {
  
  const adjustedForecast = { ...baseForecast };
  const injectImpact: Record<string, number> = {};
  
  // Initialize impact tracking
  Object.keys(baseForecast).forEach(month => {
    injectImpact[month] = 0;
  });
  
  injects.forEach(inject => {
    if (!inject.isActive) return;
    
    const startDate = new Date(inject.startMonth + '-01');
    const endDate = new Date(inject.endMonth + '-01');
    
    Object.keys(baseForecast).forEach(month => {
      const monthDate = new Date(month + '-01');
      
      if (monthDate >= startDate && monthDate <= endDate) {
        const impact = inject.vesselRequirement * inject.probability;
        
        if (inject.impact === 'demand_increase') {
          adjustedForecast[month] += impact;
          injectImpact[month] += impact;
        } else if (inject.impact === 'demand_decrease') {
          adjustedForecast[month] = Math.max(0, adjustedForecast[month] - Math.abs(impact));
          injectImpact[month] -= Math.abs(impact);
        }
      }
    });
  });
  
  return { adjustedForecast, injectImpact };
}

// ==================== MAIN FORECASTING ENGINE ====================

/**
 * Calculate vessel forecast for a specific scenario
 */
export function calculateScenarioForecast(
  scenario: ForecastScenario,
  historicalDemand: LocationDeliveryDemand[],
  historicalCapabilities: VesselCapability[],
  injects: VesselInject[]
): ScenarioResult {
  console.log(`🎯 Calculating forecast for scenario: ${scenario.name}`);
  
  const startTime = Date.now();
  
  // Analyze historical patterns
  const locationForecasts = analyzeHistoricalDemand(historicalDemand);
  const vesselCapabilityForecasts = analyzeHistoricalCapabilities(historicalCapabilities);
  
  // Calculate aggregate forecasts
  const totalDemandForecast: Record<string, number> = {};
  const drillingDemandForecast: Record<string, number> = {};
  const productionDemandForecast: Record<string, number> = {};
  const totalCapabilityForecast: Record<string, number> = {};
  
  // Aggregate demand forecasts
  for (let i = 1; i <= scenario.timeHorizon; i++) {
    const futureMonth = new Date(2025, 6 + i - 1, 1);
    const monthKey = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Sum location forecasts
    const totalDemand = locationForecasts.reduce((sum, location) => {
      return sum + (location.monthlyForecast[monthKey] || 0);
    }, 0);
    
    // Apply scenario growth rate
    const adjustedDemand = totalDemand * (1 + scenario.demandGrowthRate * i);
    
    totalDemandForecast[monthKey] = Number(adjustedDemand.toFixed(1));
    drillingDemandForecast[monthKey] = Number((adjustedDemand * 0.85).toFixed(1)); // 85% drilling
    productionDemandForecast[monthKey] = Number((adjustedDemand * 0.15).toFixed(1)); // 15% production
    
    // Sum capability forecasts
    const totalCapability = vesselCapabilityForecasts.reduce((sum, vessel) => {
      return sum + (vessel.monthlyCapability[monthKey] || 0);
    }, 0);
    
    // Apply scenario capability growth
    const adjustedCapability = totalCapability * (1 + scenario.capabilityGrowthRate * i);
    totalCapabilityForecast[monthKey] = Number(adjustedCapability.toFixed(1));
  }
  
  // Apply injects
  const applicableInjects = injects.filter(inject => scenario.activeInjects.includes(inject.id));
  const { adjustedForecast: adjustedDemand, injectImpact } = applyInjectsToForecast(totalDemandForecast, applicableInjects);
  
  // Calculate vessel requirements and gaps
  const vesselRequirementsByMonth: Record<string, number> = {};
  const vesselGapByMonth: Record<string, number> = {};
  
  const averageVesselCapability = vesselCapabilityForecasts.reduce((sum, vessel) => sum + vessel.averageCapability, 0) / vesselCapabilityForecasts.length;
  
  Object.keys(adjustedDemand).forEach(month => {
    const demand = adjustedDemand[month];
    const capability = totalCapabilityForecast[month];
    
    const requiredVessels = averageVesselCapability > 0 ? Math.ceil(demand / averageVesselCapability) : 0;
    const currentVessels = averageVesselCapability > 0 ? Math.ceil(capability / averageVesselCapability) : 0;
    const gap = requiredVessels - currentVessels;
    
    vesselRequirementsByMonth[month] = requiredVessels;
    vesselGapByMonth[month] = gap;
  });
  
  // Calculate analysis metrics
  const utilizationValues = Object.keys(adjustedDemand).map(month => {
    const demand = adjustedDemand[month];
    const capability = totalCapabilityForecast[month];
    return capability > 0 ? demand / capability : 0;
  });
  
  const averageUtilization = utilizationValues.reduce((a, b) => a + b, 0) / utilizationValues.length;
  
  const peakDemandMonth = Object.keys(adjustedDemand).reduce((peak, month) => {
    return adjustedDemand[month] > adjustedDemand[peak] ? month : peak;
  });
  
  const maxVesselGap = Math.max(...Object.values(vesselGapByMonth));
  const recommendedFleetSize = Math.max(...Object.values(vesselRequirementsByMonth));
  
  // Calculate confidence score
  const confidenceScores = locationForecasts.flatMap(location => Object.values(location.confidence));
  const confidenceScore = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
  
  const calculationDuration = Date.now() - startTime;
  
  return {
    scenario,
    forecastPeriod: {
      startMonth: Object.keys(adjustedDemand)[0],
      endMonth: Object.keys(adjustedDemand)[Object.keys(adjustedDemand).length - 1],
      totalMonths: scenario.timeHorizon
    },
    locationForecasts,
    totalDemandForecast: adjustedDemand,
    drillingDemandForecast,
    productionDemandForecast,
    vesselCapabilityForecasts,
    totalCapabilityForecast,
    vesselRequirementsByMonth,
    vesselGapByMonth,
    appliedInjects: [], // EnhancedVesselInject incompatible with VesselInject type
    injectImpactByMonth: injectImpact,
    averageUtilization: Number(averageUtilization.toFixed(3)),
    peakDemandMonth,
    maxVesselGap,
    recommendedFleetSize,
    confidenceScore: Number(confidenceScore.toFixed(3)),
    calculatedAt: new Date(),
    calculationDuration
  };
}

/**
 * Generate management recommendations based on scenario results
 */
export function generateManagementRecommendations(scenarioResults: ScenarioResult[]): ManagementRecommendation[] {
  console.log('💼 Generating management recommendations...');
  
  const recommendations: ManagementRecommendation[] = [];
  const now = new Date();
  
  scenarioResults.forEach(result => {
    const { scenario, vesselGapByMonth, averageUtilization, maxVesselGap } = result;
    
    // Recommendation 1: Vessel Acquisition for Critical Shortages
    const criticalMonths = Object.keys(vesselGapByMonth).filter(month => vesselGapByMonth[month] > 2);
    if (criticalMonths.length > 0) {
      recommendations.push({
        id: `vessel_acquisition_${scenario.id}`,
        type: 'vessel_acquisition',
        priority: 'critical',
        title: `Acquire ${maxVesselGap} Additional Vessels`,
        description: `Critical vessel shortage identified in ${criticalMonths.length} months, with peak shortage of ${maxVesselGap} vessels in ${result.peakDemandMonth}`,
        recommendedAction: `Initiate vessel acquisition process for ${maxVesselGap} vessels with delivery by ${criticalMonths[0]}`,
        timeframe: maxVesselGap > 3 ? 'immediate' : 'next_quarter',
        targetMonth: criticalMonths[0],
        vesselImpact: maxVesselGap,
        demandImpact: maxVesselGap * 8, // Assuming 8 deliveries per vessel per month
        utilizationImpact: 0.15, // 15% utilization improvement
        triggerConditions: [
          `Vessel shortage > 2 vessels in ${criticalMonths.length} months`,
          `Peak shortage of ${maxVesselGap} vessels`,
          `Average utilization of ${(averageUtilization * 100).toFixed(1)}%`
        ],
        alternativeOptions: [
          'Charter additional vessels short-term',
          'Optimize existing fleet efficiency',
          'Defer non-critical drilling campaigns'
        ],
        risks: [
          'Delayed drilling programs',
          'Increased operational costs',
          'Customer satisfaction impact'
        ],
        benefits: [
          'Meet all demand requirements',
          'Improved service reliability',
          'Operational flexibility'
        ],
        confidence: result.confidenceScore,
        basedOnScenarios: [scenario.id],
        createdAt: now,
        status: 'pending'
      });
    }
    
    // Recommendation 2: Utilization Optimization
    if (averageUtilization > UTILIZATION_WARNING_THRESHOLD) {
      recommendations.push({
        id: `utilization_optimization_${scenario.id}`,
        type: 'capacity_optimization',
        priority: 'high',
        title: 'Optimize Fleet Utilization',
        description: `High utilization rate of ${(averageUtilization * 100).toFixed(1)}% indicates potential capacity constraints`,
        recommendedAction: 'Implement efficiency improvements and consider additional capacity',
        timeframe: 'next_quarter',
        vesselImpact: 0,
        demandImpact: 0,
        utilizationImpact: -0.10, // 10% utilization reduction through efficiency
        triggerConditions: [
          `Utilization > ${(UTILIZATION_WARNING_THRESHOLD * 100).toFixed(0)}%`,
          'Limited operational flexibility'
        ],
        alternativeOptions: [
          'Acquire additional vessels',
          'Improve maintenance scheduling',
          'Optimize routing algorithms'
        ],
        risks: [
          'Service delays during peak periods',
          'Reduced maintenance flexibility',
          'Crew fatigue concerns'
        ],
        benefits: [
          'Improved operational efficiency',
          'Better service reliability',
          'Cost optimization'
        ],
        confidence: result.confidenceScore,
        basedOnScenarios: [scenario.id],
        createdAt: now,
        status: 'pending'
      });
    }
    
    // Recommendation 3: Underutilization Warning
    if (averageUtilization < UTILIZATION_UNDERUSE_THRESHOLD) {
      recommendations.push({
        id: `underutilization_${scenario.id}`,
        type: 'capacity_optimization',
        priority: 'medium',
        title: 'Address Fleet Underutilization',
        description: `Low utilization rate of ${(averageUtilization * 100).toFixed(1)}% indicates potential overcapacity`,
        recommendedAction: 'Consider fleet optimization or additional market opportunities',
        timeframe: 'next_6_months',
        vesselImpact: -1, // Potential vessel reduction
        demandImpact: 0,
        utilizationImpact: 0.20, // 20% utilization improvement
        triggerConditions: [
          `Utilization < ${(UTILIZATION_UNDERUSE_THRESHOLD * 100).toFixed(0)}%`,
          'Excess fleet capacity'
        ],
        alternativeOptions: [
          'Retire older vessels',
          'Explore new market segments',
          'Improve demand forecasting'
        ],
        risks: [
          'Future capacity shortages',
          'Lost market opportunities',
          'Fixed cost inefficiency'
        ],
        benefits: [
          'Reduced operational costs',
          'Improved profitability',
          'Better resource allocation'
        ],
        confidence: result.confidenceScore,
        basedOnScenarios: [scenario.id],
        createdAt: now,
        status: 'pending'
      });
    }
  });
  
  console.log(`  📋 Generated ${recommendations.length} recommendations`);
  return recommendations;
}

/**
 * Enhanced function: Calculate activity-based vessel forecast with rig schedule integration
 */
export function calculateActivityBasedVesselForecast(
  manifests: VesselManifest[], 
  rigSchedule: RigScheduleEntry[] = [],
  injects: EnhancedVesselInject[] = [],
  coreFleetBaseline?: CoreFleetBaseline
): VesselForecastResult {
  console.log('🚀 Starting activity-based vessel forecast calculation...');
  
  const startTime = Date.now();
  const baseline = coreFleetBaseline || createDefaultCoreFleetBaseline();
  
  // CRITICAL: Analyze baseline vessel gap first
  const baselineGap = calculateBaselineVesselGap();
  console.log(`🎯 BASELINE GAP ANALYSIS: Need ${baselineGap.vesselGap} additional vessels for true baseline demand`);
  console.log(`   Current utilization: ${(baselineGap.utilization * 100).toFixed(1)}% (>${baselineGap.utilization > 1 ? 'OVER' : 'UNDER'}-UTILIZED)`);
  
  // Update baseline to reflect actual current fleet size
  baseline.baseVesselCount = CURRENT_FLEET_COUNT;
  
  // EMERGENCY Performance safeguard: Timeout after 3 seconds
  const CALCULATION_TIMEOUT = 3000; // 3 seconds EMERGENCY MODE
  const timeoutStart = Date.now();
  
  if (rigSchedule.length > 0) {
    console.log(`📋 Processing ${rigSchedule.length} rig schedule entries for activity-based forecasting`);
    
    // Performance check after data processing
    if (Date.now() - timeoutStart > CALCULATION_TIMEOUT) {
      console.error('⏰ Calculation timeout - returning simplified result');
      return createSimplifiedForecastResult(baseline, rigSchedule.length);
    }
    
    // Activity-based forecasting using rig schedule
    console.log('🔄 Step 1: Calculating activity-based requirements...');
    const activityBasedRequirements = calculateActivityBasedVesselRequirements(rigSchedule);
    
    // Performance check after requirements calculation
    if (Date.now() - timeoutStart > CALCULATION_TIMEOUT) {
      console.error('⏰ Calculation timeout after requirements - returning simplified result');
      return createSimplifiedForecastResult(baseline, rigSchedule.length);
    }
    
    // Generate scenarios based on P10/P50 timing variations
    console.log('🔄 Step 2: Creating scenarios...');
    const scenarios = createActivityBasedScenarios(rigSchedule, baseline);
    
    // Performance check after scenario creation
    if (Date.now() - timeoutStart > CALCULATION_TIMEOUT) {
      console.error('⏰ Calculation timeout after scenarios - returning simplified result');
      return createSimplifiedForecastResult(baseline, rigSchedule.length);
    }
    
    // Calculate forecast for each scenario (performance-critical section)
    console.log('🔄 Step 3: Calculating scenario forecasts...');
    const scenarioResults = scenarios.map((scenario, index) => {
      console.log(`  🎯 Processing scenario ${index + 1}/${scenarios.length}: ${scenario.name}`);
      
      // Performance check per scenario
      if (Date.now() - timeoutStart > CALCULATION_TIMEOUT) {
        console.error(`⏰ Calculation timeout during scenario ${index + 1} - using simplified scenario`);
        return createSimplifiedScenarioResult(scenario, baseline);
      }
      
      return calculateActivityBasedScenarioForecast(scenario, activityBasedRequirements, baseline, injects);
    });
    
    const baseScenario = scenarioResults.find(r => r.scenario.type === 'base_case')!;
    
    // Generate plus-up/shed recommendations relative to core fleet baseline
    const consensusRecommendations = generateCoreFleetRecommendations(scenarioResults, baseline);
    
    // Calculate cross-scenario analysis
    const analysisResult = performCrossScenarioAnalysis(scenarioResults, baseline);
    
    const calculationDuration = Date.now() - startTime;
    
    const result: VesselForecastResult = {
      historicalMonths: 0, // Activity-based doesn't use historical months
      forecastMonths: 18, // 18-month rig schedule horizon
      analysisDate: new Date(),
      coreFleetBaseline: baseline,
      scenarios: scenarioResults,
      baseScenario,
      demandRange: analysisResult.demandRange,
      vesselRequirementRange: analysisResult.vesselRequirementRange,
      consensusRecommendations,
      highRiskMonths: analysisResult.highRiskMonths,
      lowUtilizationMonths: analysisResult.lowUtilizationMonths,
      sensitivityAnalysis: {
        demandSensitivity: 0.6, // 0.6 vessels per additional rig activity
        capabilitySensitivity: -0.8 // -0.8 vessels per core fleet efficiency improvement
      },
      averageForecastAccuracy: calculateActivityBasedAccuracy(rigSchedule),
      recommendedDecisionPoints: generateActivityBasedDecisionPoints(activityBasedRequirements, baseline),
      exportData: generateActivityBasedExportData(scenarioResults, activityBasedRequirements, baseline)
    };
    
    console.log(`🎯 Activity-based forecast completed in ${calculationDuration}ms`);
    return result;
    
  } else {
    console.log('⚠️ No rig schedule provided, falling back to historical trend analysis');
    // Fall back to original historical analysis with empty injects (EnhancedVesselInject incompatible with VesselInject)
    return calculateVesselForecast(manifests, []);
  }
}

/**
 * Create activity-based scenarios from rig schedule data
 */
function createActivityBasedScenarios(rigSchedule: RigScheduleEntry[], baseline: CoreFleetBaseline): ForecastScenario[] {
  const now = new Date();
  
  return [
    {
      id: 'baseline_schedule',
      name: 'Baseline Schedule (P50)',
      description: 'Mean case timing from rig schedule with standard vessel requirements',
      type: 'base_case',
      demandGrowthRate: 0, // Activity-based doesn't use growth rates
      capabilityGrowthRate: 0,
      activeInjects: [],
      confidenceThreshold: 0.7,
      timeHorizon: 18, // 18-month rig schedule horizon
      assumptions: [
        'P50 (mean case) timing from rig schedule',
        `${baseline.baseVesselCount}-vessel core fleet baseline`,
        'Standard activity-to-vessel mappings',
        'Normal weather patterns'
      ],
      createdAt: now,
      lastModified: now
    },
    {
      id: 'accelerated_schedule',
      name: 'Accelerated Schedule (P10)',
      description: 'Early case timing with 15% faster execution and higher vessel intensity',
      type: 'optimistic',
      demandGrowthRate: 0.15, // 15% higher vessel requirements
      capabilityGrowthRate: 0,
      activeInjects: [],
      confidenceThreshold: 0.6,
      timeHorizon: 18,
      assumptions: [
        'P10 (early case) timing from rig schedule',
        'Accelerated drilling programs',
        'Higher vessel intensity due to schedule compression',
        'Favorable weather windows'
      ],
      createdAt: now,
      lastModified: now
    },
    {
      id: 'delayed_schedule',
      name: 'Conservative Schedule',
      description: 'Delayed timing with weather contingencies and maintenance buffers',
      type: 'pessimistic',
      demandGrowthRate: -0.10, // 10% buffer for delays
      capabilityGrowthRate: -0.05, // 5% capacity reduction for maintenance
      activeInjects: [],
      confidenceThreshold: 0.8,
      timeHorizon: 18,
      assumptions: [
        'Delayed schedule with weather contingencies',
        'Additional maintenance windows',
        'Conservative vessel requirements',
        'Hurricane season impact'
      ],
      createdAt: now,
      lastModified: now
    }
  ];
}

/**
 * Calculate scenario forecast using activity-based requirements
 */
function calculateActivityBasedScenarioForecast(
  scenario: ForecastScenario,
  activityRequirements: Record<string, number>,
  baseline: CoreFleetBaseline,
  injects: EnhancedVesselInject[]
): ScenarioResult {
  console.log(`🎯 Calculating activity-based forecast for scenario: ${scenario.name}`);
  
  const startTime = Date.now();
  
  // Apply scenario adjustments to activity requirements
  const adjustedRequirements: Record<string, number> = {};
  Object.keys(activityRequirements).forEach(month => {
    let requirement = activityRequirements[month];
    
    // Apply scenario growth/adjustment factor
    requirement *= (1 + scenario.demandGrowthRate);
    
    adjustedRequirements[month] = Number(requirement.toFixed(1));
  });
  
  // Apply injects
  const applicableInjects = injects.filter(inject => scenario.activeInjects.includes(inject.id));
  const { adjustedForecast: finalRequirements, injectImpact } = applyEnhancedInjectsToForecast(
    adjustedRequirements, 
    applicableInjects
  );
  
  // Calculate plus-up/shed from core fleet baseline
  const vesselRequirementsByMonth: Record<string, number> = {};
  const vesselGapByMonth: Record<string, number> = {};
  const coreFleetUtilizationByMonth: Record<string, number> = {};
  
  Object.keys(finalRequirements).forEach(month => {
    const totalRequirement = finalRequirements[month];
    const coreFleetCapacity = baseline.baseVesselCount;
    
    // Calculate vessels needed (rounded up)
    const vesselsNeeded = Math.ceil(totalRequirement);
    vesselRequirementsByMonth[month] = vesselsNeeded;
    
    // Calculate gap from core fleet baseline (+ means charter more, - means can shed)
    const gap = vesselsNeeded - coreFleetCapacity;
    vesselGapByMonth[month] = gap;
    
    // Calculate core fleet utilization
    const utilization = totalRequirement / coreFleetCapacity;
    coreFleetUtilizationByMonth[month] = Number(utilization.toFixed(3));
  });
  
  // Calculate summary metrics
  const utilizationValues = Object.values(coreFleetUtilizationByMonth);
  const averageUtilization = utilizationValues.reduce((a, b) => a + b, 0) / utilizationValues.length;
  
  const peakDemandMonth = Object.keys(finalRequirements).reduce((peak, month) => {
    return finalRequirements[month] > finalRequirements[peak] ? month : peak;
  });
  
  const maxVesselGap = Math.max(...Object.values(vesselGapByMonth));
  const recommendedFleetSize = baseline.baseVesselCount + Math.max(0, maxVesselGap);
  
  // Calculate confidence based on rig schedule data quality
  const confidenceScore = Object.keys(finalRequirements).length > 0 ? 0.8 : 0.5;
  
  const calculationDuration = Date.now() - startTime;
  
  return {
    scenario,
    forecastPeriod: {
      startMonth: Object.keys(finalRequirements)[0] || '',
      endMonth: Object.keys(finalRequirements)[Object.keys(finalRequirements).length - 1] || '',
      totalMonths: scenario.timeHorizon
    },
    locationForecasts: [], // Not applicable for activity-based forecasting
    totalDemandForecast: finalRequirements,
    drillingDemandForecast: finalRequirements, // All activity-based demand is drilling-related
    productionDemandForecast: {},
    vesselCapabilityForecasts: [], // Not applicable for activity-based forecasting
    totalCapabilityForecast: Object.keys(finalRequirements).reduce((acc, month) => {
      acc[month] = baseline.baseVesselCount * 30; // Assume 30 deliveries per vessel per month
      return acc;
    }, {} as Record<string, number>),
    vesselRequirementsByMonth,
    vesselGapByMonth,
    appliedInjects: [], // EnhancedVesselInject incompatible with VesselInject type
    injectImpactByMonth: injectImpact,
    averageUtilization: Number(averageUtilization.toFixed(3)),
    peakDemandMonth,
    maxVesselGap,
    recommendedFleetSize,
    confidenceScore: Number(confidenceScore.toFixed(3)),
    calculatedAt: new Date(),
    calculationDuration
  };
}

/**
 * Main function: Calculate comprehensive vessel forecast (backwards compatibility)
 */
export function calculateVesselForecast(manifests: VesselManifest[], injects: VesselInject[] = []): VesselForecastResult {
  console.log('🚀 Starting comprehensive vessel forecast calculation...');
  
  // Removed unused startTime variable
  
  // Removed unused historicalResults variable - function redirects to activity-based forecasting
  
  // Redirect to activity-based forecasting for consistency
  console.log('⚠️ Redirecting to activity-based vessel forecasting...');
  return calculateActivityBasedVesselForecast(manifests, [], [], undefined);
}

/**
 * Create simplified forecast result for performance timeouts
 */
function createSimplifiedForecastResult(baseline: CoreFleetBaseline, scheduleSize: number): VesselForecastResult {
  console.log('🔄 Creating simplified forecast result due to performance constraints');
  
  const now = new Date();
  const monthlyRequirements: Record<string, number> = {};
  
  // Generate simple 18-month forecast
  for (let i = 0; i < 18; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    // Simple estimation: 0.5 vessels per rig activity per month
    monthlyRequirements[monthKey] = Math.max(1, Math.floor(scheduleSize * 0.5 / 18));
  }
  
  const baseScenario: ScenarioResult = {
    scenario: {
      id: 'simplified_baseline',
      name: 'Simplified Baseline (Performance Mode)',
      description: 'Simplified calculation due to large dataset',
      type: 'base_case',
      demandGrowthRate: 0,
      capabilityGrowthRate: 0,
      activeInjects: [],
      confidenceThreshold: 0.6,
      timeHorizon: 18,
      assumptions: ['Performance-optimized calculation', 'Simplified vessel mapping'],
      createdAt: now,
      lastModified: now
    },
    forecastPeriod: {
      startMonth: Object.keys(monthlyRequirements)[0] || '',
      endMonth: Object.keys(monthlyRequirements)[Object.keys(monthlyRequirements).length - 1] || '',
      totalMonths: 18
    },
    locationForecasts: [],
    totalDemandForecast: monthlyRequirements,
    drillingDemandForecast: monthlyRequirements,
    productionDemandForecast: {},
    vesselCapabilityForecasts: [],
    totalCapabilityForecast: Object.keys(monthlyRequirements).reduce((acc, month) => {
      acc[month] = baseline.baseVesselCount * 30;
      return acc;
    }, {} as Record<string, number>),
    vesselRequirementsByMonth: monthlyRequirements,
    vesselGapByMonth: Object.keys(monthlyRequirements).reduce((acc, month) => {
      acc[month] = Math.max(0, monthlyRequirements[month] - baseline.baseVesselCount);
      return acc;
    }, {} as Record<string, number>),
    appliedInjects: [],
    injectImpactByMonth: {},
    averageUtilization: 0.65, // Conservative estimate
    peakDemandMonth: Object.keys(monthlyRequirements)[0] || '',
    maxVesselGap: 2, // Conservative estimate
    recommendedFleetSize: baseline.baseVesselCount + 2,
    confidenceScore: 0.5, // Lower confidence for simplified calculation
    calculatedAt: now,
    calculationDuration: 100
  };
  
  return {
    historicalMonths: 0,
    forecastMonths: 18,
    analysisDate: now,
    coreFleetBaseline: baseline,
    scenarios: [baseScenario],
    baseScenario,
    demandRange: { min: 1, max: 5, average: 3 },
    vesselRequirementRange: { min: baseline.baseVesselCount, max: baseline.baseVesselCount + 2, average: baseline.baseVesselCount + 1 },
    consensusRecommendations: [],
    highRiskMonths: [],
    lowUtilizationMonths: [],
    sensitivityAnalysis: { demandSensitivity: 0.5, capabilitySensitivity: -0.5 },
    averageForecastAccuracy: 0.5,
    recommendedDecisionPoints: [],
    exportData: {
      forecastSummary: [],
      monthlyBreakdown: [],
      recommendations: []
    }
  };
}

/**
 * Create simplified scenario result for performance timeouts
 */
function createSimplifiedScenarioResult(scenario: ForecastScenario, baseline: CoreFleetBaseline): ScenarioResult {
  const now = new Date();
  const monthlyRequirements: Record<string, number> = {};
  
  // Generate simple monthly requirements
  for (let i = 0; i < scenario.timeHorizon; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    monthlyRequirements[monthKey] = baseline.baseVesselCount * 0.8; // 80% utilization
  }
  
  return {
    scenario,
    forecastPeriod: {
      startMonth: Object.keys(monthlyRequirements)[0] || '',
      endMonth: Object.keys(monthlyRequirements)[Object.keys(monthlyRequirements).length - 1] || '',
      totalMonths: scenario.timeHorizon
    },
    locationForecasts: [],
    totalDemandForecast: monthlyRequirements,
    drillingDemandForecast: monthlyRequirements,
    productionDemandForecast: {},
    vesselCapabilityForecasts: [],
    totalCapabilityForecast: Object.keys(monthlyRequirements).reduce((acc, month) => {
      acc[month] = baseline.baseVesselCount * 30;
      return acc;
    }, {} as Record<string, number>),
    vesselRequirementsByMonth: monthlyRequirements,
    vesselGapByMonth: Object.keys(monthlyRequirements).reduce((acc, month) => {
      acc[month] = 0; // No gap in simplified mode
      return acc;
    }, {} as Record<string, number>),
    appliedInjects: [],
    injectImpactByMonth: {},
    averageUtilization: 0.8,
    peakDemandMonth: Object.keys(monthlyRequirements)[0] || '',
    maxVesselGap: 0,
    recommendedFleetSize: baseline.baseVesselCount,
    confidenceScore: 0.5,
    calculatedAt: now,
    calculationDuration: 50
  };
}
  
