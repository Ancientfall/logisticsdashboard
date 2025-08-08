/**
 * Vessel Forecast Dashboard - Management-Ready TypeScript Interfaces
 * 
 * Simplified, presentation-focused interfaces for executive decision making.
 * Every interface designed for transparency and shareability.
 */

// ==================== FOUNDATIONAL DATA TYPES ====================

/**
 * Core rig activity from CSV schedule
 */
export interface RigActivity {
  id: string;
  rigName: string;
  activityType: 'RSU' | 'DRL' | 'CPL' | 'RM' | 'WWP' | 'WS' | 'P&A' | 'MOB' | 'WWI' | 'TAR';
  activityName: string;
  asset: string; // GOM.Atlantis, GOM.ThunderHorse, GOM.MadDog
  startDate: Date;
  endDate: Date;
  durationDays: number;
  scenario: 'MEAN' | 'EARLY';
}

/**
 * Activity type configuration with demand multipliers and rationale
 */
export interface ActivityProfile {
  code: 'RSU' | 'DRL' | 'CPL' | 'RM' | 'WWP' | 'WS' | 'P&A' | 'MOB' | 'WWI' | 'TAR';
  name: string;
  demandMultiplier: number; // Applied to 8.2 baseline deliveries/rig/month
  rationale: string; // Business justification for multiplier
  category: 'Drilling' | 'Completion' | 'Support' | 'Workover' | 'Mobilization';
  intensity: 'Low' | 'Standard' | 'High' | 'Critical';
}

/**
 * Monthly vessel demand calculation for a specific rig
 */
export interface RigVesselDemand {
  rigName: string;
  month: string; // YYYY-MM format
  activities: RigActivity[];
  totalDemandDeliveries: number; // Sum of all activity demands
  requiredVessels: number; // Demand ÷ 6.5 deliveries/vessel/month
  utilizationHours: number;
  criticalActivities: string[]; // Activities driving peak demand
  riskLevel: 'Low' | 'Medium' | 'High'; // Based on vessel requirements
}

// ==================== MANAGEMENT SUMMARY TYPES ====================

/**
 * Executive summary for management decision making
 */
export interface VesselForecastExecutiveSummary {
  // Key Decision
  recommendation: string; // "Charter 2 additional vessels for Q2-Q3 2025"
  businessRationale: string; // Why this decision is necessary
  
  // Current vs Required
  currentFleetSize: number;
  peakVesselsNeeded: number;
  additionalVesselsRequired: number;
  peakDemandMonth: string;
  
  // Financial Impact
  estimatedCostImpact: number; // Monthly cost of additional vessels
  operationalRiskWithoutAction: string; // Risk of not acting
  
  // Confidence & Data Quality
  confidenceLevel: 'High' | 'Medium' | 'Low';
  dataQualityScore: number; // 0-100
  keyAssumptions: string[]; // Critical assumptions made
}

/**
 * Scenario comparison for management understanding
 */
export interface ScenarioComparison {
  meanCase: {
    totalVesselsNeeded: number;
    peakMonth: string;
    averageUtilization: number;
    costEstimate: number;
  };
  earlyCase: {
    totalVesselsNeeded: number;
    peakMonth: string;
    averageUtilization: number;
    costEstimate: number;
  };
  delta: {
    vesselDifference: number;
    timelineDifference: string; // "2 months earlier"
    costDifference: number;
    riskAssessment: string;
  };
  recommendation: 'Plan for MEAN case' | 'Plan for EARLY case' | 'Flexible capacity strategy';
}

/**
 * Rig-by-rig breakdown for management visibility
 */
export interface RigAnalysis {
  rigName: string;
  asset: string;
  totalActivities: number;
  peakVesselsRequired: number;
  peakMonth: string;
  averageMonthlyDemand: number;
  criticalPeriods: Array<{
    month: string;
    vesselsNeeded: number;
    activities: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
  }>;
  businessImpact: string; // What happens if this rig doesn't get vessel support
}

// ==================== DECISION SUPPORT TYPES ====================

/**
 * Peak demand analysis for vessel planning
 */
export interface PeakDemandAnalysis {
  month: string;
  totalVesselsNeeded: number;
  currentCapacity: number;
  shortfall: number;
  contributingRigs: Array<{
    rigName: string;
    vesselsNeeded: number;
    criticalActivities: string[];
  }>;
  mitigationOptions: string[]; // Charter, optimize schedule, delay activities
  costOfInaction: number;
}

/**
 * Management recommendation with full justification
 */
export interface ManagementRecommendation {
  id: string;
  title: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  
  // The Decision
  recommendation: string;
  timeline: string;
  estimatedCost: number;
  
  // The Justification
  businessRationale: string;
  supportingData: string[];
  riskOfInaction: string;
  alternativeOptions: string[];
  
  // Decision Support
  confidenceLevel: number; // 0-100
  stakeholders: string[];
  nextSteps: string[];
  reviewDate: Date;
}

/**
 * Data foundation transparency for audit trail
 */
export interface DataFoundation {
  // Source Data
  csvFilesProcessed: string[];
  totalActivitiesAnalyzed: number;
  dataValidationStatus: 'Clean' | 'Minor Issues' | 'Needs Review';
  
  // Key Baselines
  rigDemandBaseline: {
    value: 8.2;
    unit: 'deliveries/rig/month';
    source: 'Historical analysis from vesselRequirementCalculator.ts';
    lastUpdated: Date;
  };
  vesselCapabilityBaseline: {
    value: 6.5;
    unit: 'deliveries/vessel/month';
    source: 'Fleet performance analysis';
    lastUpdated: Date;
  };
  
  // Calculation Methodology
  calculationSteps: string[];
  assumptionsUsed: string[];
  dataQualityIssues: string[];
  validationChecks: Array<{
    check: string;
    result: 'Pass' | 'Fail' | 'Warning';
    details: string;
  }>;
}

// ==================== PRESENTATION & EXPORT TYPES ====================

/**
 * Complete vessel forecast result for management presentation
 */
export interface VesselForecastResult {
  // Executive Summary
  executiveSummary: VesselForecastExecutiveSummary;
  
  // Scenario Analysis
  scenarioComparison: ScenarioComparison;
  
  // Detailed Analysis
  rigAnalyses: RigAnalysis[];
  monthlyForecast: Array<{
    month: string;
    totalDemand: number;
    vesselsNeeded: number;
    utilization: number;
    riskLevel: 'Low' | 'Medium' | 'High';
  }>;
  
  // Peak Periods
  peakDemandPeriods: PeakDemandAnalysis[];
  
  // Recommendations
  recommendations: ManagementRecommendation[];
  
  // Data Transparency
  dataFoundation: DataFoundation;
  
  // Metadata
  generatedAt: Date;
  forecastHorizon: string; // "18 months"
  analysisBy: string;
  version: string;
}

/**
 * Export configuration for different presentation formats
 */
export interface ExportConfiguration {
  format: 'executive-summary' | 'detailed-analysis' | 'presentation-deck' | 'data-export';
  includeCharts: boolean;
  includeDataFoundation: boolean;
  includeRecommendations: boolean;
  confidentialityLevel: 'Public' | 'Internal' | 'Restricted';
  recipient: string; // For customized messaging
}

/**
 * Calculation transparency for showing the math
 */
export interface CalculationBreakdown {
  step: number;
  description: string;
  formula: string;
  inputs: Record<string, number>;
  result: number;
  reasoning: string;
}

/**
 * Risk assessment for decision making
 */
export interface RiskAssessment {
  riskType: 'Operational' | 'Financial' | 'Timeline' | 'Strategic';
  description: string;
  probability: number; // 0-100
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigationStrategies: string[];
  costOfMitigation: number;
  decisionThreshold: string;
}

// ==================== LOCATION-BASED FORECAST TYPES ====================

/**
 * Monthly vessel demand by offshore location (Excel table format)
 */
export interface LocationVesselDemand {
  locationName: string;
  locationDisplayName: string;
  facilityType: 'Drilling' | 'Production' | 'Support';
  monthlyDemand: Record<string, number>; // month -> vessel count
  totalAnnualDemand: number;
  peakMonth: string;
  peakDemand: number;
}

/**
 * Vessel forecast assumptions (top section of Excel)
 */
export interface VesselForecastAssumptions {
  lastUpdated: string;
  vesselDeliveryCapability: number; // deliveries per month
  wellsDeliveryDemand: number; // deliveries per month
  paleogeneTransitFactor: number; // % increase
  kaskidaTiberFactor: number; // multiplier
  multiZoneCompletionFactor: number; // multiplier
  lwiDemandFactor: number; // % of other wells
  productionDemandInternal: number; // vessel equivalent for Fantasy Island
  productionDemandOutsourced: number; // AT and NK from Chevron
}

/**
 * Complete tabular vessel forecast result
 */
export interface TabularVesselForecast {
  assumptions: VesselForecastAssumptions;
  locationDemands: LocationVesselDemand[];
  monthlyColumns: string[]; // Jan-26, Feb-26, etc.
  totals: {
    internalFleet: Record<string, number>; // month -> total internal fleet needed
    externallySourced: Record<string, number>; // month -> externally sourced vessels
    totalDemand: Record<string, number>; // month -> total demand
  };
  dataFoundation: DataFoundation;
  generatedAt: Date;
}