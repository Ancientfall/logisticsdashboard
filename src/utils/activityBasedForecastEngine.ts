/**
 * Activity-Based Vessel Forecast Engine
 * 
 * Core calculation engine that transforms rig schedule data into vessel requirements
 * using activity-based demand profiles and location-based vessel capabilities.
 * 
 * Key Algorithm:
 * 1. Process rig schedule activities using demand profiles
 * 2. Calculate monthly vessel demand based on active rigs and activity types
 * 3. Apply location-based vessel capability constraints (transit time impacts)
 * 4. Generate vessel gap analysis and recommendations
 */

import { VesselForecastResult, RigScheduleEntry, CoreFleetBaseline, ScenarioResult, ManagementRecommendation } from '../types';
import { ProcessedRigScheduleData } from './processors/rigScheduleCSVProcessor';
import { BASE_RIG_DEMAND_RATE, getActivityProfile } from './rigActivityDemandProfiles';
import { getLocationProfile, calculateLocationVesselCapacity, VESSEL_CAPABILITY_BASELINES } from './locationVesselCapability';

export interface VesselForecastInput {
  rigScheduleData: ProcessedRigScheduleData[];
  coreFleetBaseline: CoreFleetBaseline;
  forecastHorizonMonths?: number;
}

export interface MonthlyVesselAnalysis {
  month: string; // YYYY-MM
  totalDemand: number; // deliveries required
  activeRigs: number;
  activitiesByType: Record<string, number>;
  activitiesByLocation: Record<string, number>;
  vesselCapabilityByLocation: Record<string, number>;
  totalVesselCapability: number; // fleet capability considering location mix
  vesselRequirement: number; // vessels needed
  vesselGap: number; // shortage/surplus vs current fleet
  utilizationRate: number; // actual utilization percentage
  riskFactors: string[];
}

/**
 * Main forecast calculation engine
 */
export class ActivityBasedForecastEngine {
  
  /**
   * Generate comprehensive vessel forecast from rig schedule data
   */
  static calculateVesselForecast(input: VesselForecastInput): VesselForecastResult {
    console.log('🚀 Starting activity-based vessel forecast calculation...');
    const startTime = performance.now();

    const { rigScheduleData, coreFleetBaseline, forecastHorizonMonths = 18 } = input;
    
    // Combine all scenario data
    const allScheduleData = this.combineScheduleData(rigScheduleData);
    
    // Generate monthly analysis for forecast period
    const monthlyAnalyses = this.generateMonthlyAnalyses(
      allScheduleData, 
      coreFleetBaseline,
      forecastHorizonMonths
    );

    // Create scenario results for each dataset
    const scenarios = rigScheduleData.map(data => 
      this.createScenarioResult(data, monthlyAnalyses, coreFleetBaseline)
    );

    // Select base scenario (mean if available, otherwise first)
    const baseScenario = scenarios.find(s => s.scenario.name.toLowerCase().includes('mean')) || scenarios[0];

    // Generate cross-scenario analysis
    const demandRange = this.calculateDemandRange(scenarios);
    const vesselRequirementRange = this.calculateVesselRequirementRange(scenarios);
    const consensusRecommendations = this.generateConsensusRecommendations(scenarios, coreFleetBaseline);

    // Risk and opportunity analysis
    const { highRiskMonths, lowUtilizationMonths } = this.identifyRiskMonths(monthlyAnalyses);
    const sensitivityAnalysis = this.calculateSensitivityAnalysis(monthlyAnalyses);
    const recommendedDecisionPoints = this.generateDecisionPoints(monthlyAnalyses, scenarios);

    const calculationDuration = performance.now() - startTime;
    const analysisDate = new Date();

    const result: VesselForecastResult = {
      historicalMonths: 0, // Using forecast data only
      forecastMonths: forecastHorizonMonths,
      analysisDate,
      coreFleetBaseline,
      scenarios,
      baseScenario,
      demandRange,
      vesselRequirementRange,
      consensusRecommendations,
      highRiskMonths,
      lowUtilizationMonths,
      sensitivityAnalysis,
      averageForecastAccuracy: this.estimateForecastAccuracy(allScheduleData),
      recommendedDecisionPoints,
      exportData: this.generateExportData(baseScenario, monthlyAnalyses)
    };

    console.log(`✅ Vessel forecast completed in ${calculationDuration.toFixed(0)}ms`);
    console.log(`📊 Generated ${scenarios.length} scenarios over ${forecastHorizonMonths} months`);
    console.log(`⚡ Base scenario: ${baseScenario.scenario.name}`);
    console.log(`🎯 Peak demand: ${Math.max(...Object.values(baseScenario.totalDemandForecast))} deliveries in ${baseScenario.peakDemandMonth}`);
    console.log(`🚢 Recommended fleet: ${baseScenario.recommendedFleetSize} vessels`);

    return result;
  }

  /**
   * Combine multiple scenario datasets
   */
  private static combineScheduleData(rigScheduleData: ProcessedRigScheduleData[]): ProcessedRigScheduleData {
    if (rigScheduleData.length === 1) return rigScheduleData[0];
    
    const combined = rigScheduleData[0];
    for (let i = 1; i < rigScheduleData.length; i++) {
      // Keep scenarios separate but combine analysis
      combined.rigScheduleData.push(...rigScheduleData[i].rigScheduleData);
    }
    
    return combined;
  }

  /**
   * Generate monthly vessel requirement analyses
   */
  private static generateMonthlyAnalyses(
    scheduleData: ProcessedRigScheduleData,
    fleetBaseline: CoreFleetBaseline,
    horizonMonths: number
  ): MonthlyVesselAnalysis[] {
    console.log(`📅 Generating monthly analyses for ${horizonMonths} months`);
    
    const analyses: MonthlyVesselAnalysis[] = [];
    const currentDate = new Date();
    
    for (let monthOffset = 0; monthOffset < horizonMonths; monthOffset++) {
      const analysisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
      const monthKey = `${analysisMonth.getFullYear()}-${String(analysisMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const analysis = this.analyzeMonth(monthKey, scheduleData, fleetBaseline);
      analyses.push(analysis);
    }
    
    return analyses;
  }

  /**
   * Analyze vessel requirements for a specific month
   */
  private static analyzeMonth(
    monthKey: string,
    scheduleData: ProcessedRigScheduleData,
    fleetBaseline: CoreFleetBaseline
  ): MonthlyVesselAnalysis {
    const monthDate = new Date(monthKey + '-01');
    const monthStart = monthDate.getTime();
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getTime();

    // Find active activities in this month
    const activeActivities = scheduleData.rigScheduleData.filter(entry => {
      const startTime = new Date(entry.startDate).getTime();
      const endTime = new Date(entry.finishDate).getTime();
      return startTime <= monthEnd && endTime >= monthStart;
    });

    // Calculate demand by activity type and location
    let totalDemand = 0;
    const activitiesByType: Record<string, number> = {};
    const activitiesByLocation: Record<string, number> = {};
    const vesselCapabilityByLocation: Record<string, number> = {};
    const activeRigs = new Set<string>();

    for (const activity of activeActivities) {
      activeRigs.add(activity.rigName);
      
      // Get activity profile and calculate demand contribution
      const activityProfile = getActivityProfile(activity.rigActivityType);
      const durationDays = (new Date(activity.finishDate).getTime() - new Date(activity.startDate).getTime()) / (1000 * 60 * 60 * 24);
      const monthlyDemandContribution = BASE_RIG_DEMAND_RATE * activityProfile.demandFactor * Math.min(durationDays / 30, 1.0);
      
      totalDemand += monthlyDemandContribution;
      
      // Track by activity type
      activitiesByType[activity.rigActivityType] = (activitiesByType[activity.rigActivityType] || 0) + 1;
      
      // Track by location
      activitiesByLocation[activity.location] = (activitiesByLocation[activity.location] || 0) + 1;
      
      // Calculate location-based vessel capability
      const locationProfile = getLocationProfile(activity.location);
      if (!vesselCapabilityByLocation[activity.location]) {
        vesselCapabilityByLocation[activity.location] = locationProfile.vesselDeliveriesPerMonth;
      }
    }

    // Calculate total fleet capability considering location mix
    const locationWeights = Object.entries(activitiesByLocation).map(([location, count]) => ({
      location,
      weight: count / activeActivities.length,
      capability: vesselCapabilityByLocation[location] || VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth
    }));

    const weightedAverageCapability = locationWeights.reduce((sum, { weight, capability }) => 
      sum + (weight * capability), 0) || VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth;

    const totalVesselCapability = fleetBaseline.baseVesselCount * weightedAverageCapability;
    
    // Calculate vessel requirements
    const vesselRequirement = totalDemand > 0 ? Math.ceil(totalDemand / weightedAverageCapability) : 0;
    const vesselGap = Math.max(0, vesselRequirement - fleetBaseline.baseVesselCount);
    const utilizationRate = totalVesselCapability > 0 ? totalDemand / totalVesselCapability : 0;

    // Identify risk factors
    const riskFactors: string[] = [];
    if (utilizationRate > 0.9) riskFactors.push('High utilization risk');
    if (vesselGap > 0) riskFactors.push(`${vesselGap} vessel shortage`);
    if (Object.keys(activitiesByLocation).some(loc => getLocationProfile(loc).transitCategory === 'LONG')) {
      riskFactors.push('Long transit locations active');
    }
    if (totalDemand > totalVesselCapability * 0.75) riskFactors.push('Approaching capacity limits');

    return {
      month: monthKey,
      totalDemand,
      activeRigs: activeRigs.size,
      activitiesByType,
      activitiesByLocation,
      vesselCapabilityByLocation,
      totalVesselCapability,
      vesselRequirement,
      vesselGap,
      utilizationRate,
      riskFactors
    };
  }

  /**
   * Create scenario result from processed data
   */
  private static createScenarioResult(
    scheduleData: ProcessedRigScheduleData,
    monthlyAnalyses: MonthlyVesselAnalysis[],
    fleetBaseline: CoreFleetBaseline
  ): ScenarioResult {
    const scenario = scheduleData.metadata.scenarios[0] || 'unknown';
    const scenarioName = scenario.charAt(0).toUpperCase() + scenario.slice(1);
    
    // Extract monthly forecasts
    const totalDemandForecast: Record<string, number> = {};
    const vesselRequirementsByMonth: Record<string, number> = {};
    const vesselGapByMonth: Record<string, number> = {};
    
    for (const analysis of monthlyAnalyses) {
      totalDemandForecast[analysis.month] = Math.round(analysis.totalDemand);
      vesselRequirementsByMonth[analysis.month] = analysis.vesselRequirement;
      vesselGapByMonth[analysis.month] = analysis.vesselGap;
    }

    // Find peak demand month
    const peakDemandMonth = Object.entries(totalDemandForecast)
      .reduce((max, [month, demand]) => demand > max.demand ? { month, demand } : max, 
              { month: '', demand: 0 }).month;

    // Calculate averages
    const averageUtilization = monthlyAnalyses.reduce((sum, a) => sum + a.utilizationRate, 0) / monthlyAnalyses.length;
    const maxVesselGap = Math.max(...Object.values(vesselGapByMonth));
    const recommendedFleetSize = fleetBaseline.baseVesselCount + Math.ceil(maxVesselGap * 0.5); // Conservative buffer

    // Calculate confidence based on data completeness and validation warnings
    const confidenceScore = Math.max(0.5, 1.0 - (scheduleData.metadata.validationWarnings.length * 0.05));

    return {
      scenario: {
        id: `${scenario}-forecast`,
        name: `${scenarioName} Case Forecast`,
        description: `Vessel forecast based on ${scenarioName} case rig schedule`,
        type: scenario === 'early' ? 'optimistic' : 'base_case',
        demandGrowthRate: scenario === 'early' ? 0.15 : 0.05,
        capabilityGrowthRate: 0,
        activeInjects: [],
        confidenceThreshold: 0.75,
        timeHorizon: monthlyAnalyses.length,
        assumptions: [
          `${scenarioName} case timing from rig schedule`,
          `${BASE_RIG_DEMAND_RATE} deliveries per rig per month baseline`,
          `${fleetBaseline.baseVesselCount} vessel core fleet`,
          'Activity-based demand profiles',
          'Location-based capability constraints'
        ],
        createdAt: new Date(),
        lastModified: new Date()
      },
      forecastPeriod: {
        startMonth: monthlyAnalyses[0]?.month || '',
        endMonth: monthlyAnalyses[monthlyAnalyses.length - 1]?.month || '',
        totalMonths: monthlyAnalyses.length
      },
      locationForecasts: [], // Could be enhanced with detailed location breakdowns
      totalDemandForecast,
      drillingDemandForecast: totalDemandForecast, // All demand is drilling-related
      productionDemandForecast: {}, // Not applicable for drilling forecast
      vesselCapabilityForecasts: [],
      totalCapabilityForecast: Object.fromEntries(
        monthlyAnalyses.map(a => [a.month, Math.round(a.totalVesselCapability)])
      ),
      vesselRequirementsByMonth,
      vesselGapByMonth,
      appliedInjects: [],
      injectImpactByMonth: {},
      averageUtilization,
      peakDemandMonth,
      maxVesselGap,
      recommendedFleetSize,
      confidenceScore,
      calculatedAt: new Date(),
      calculationDuration: 0 // Will be updated by caller
    };
  }

  /**
   * Calculate demand range across scenarios
   */
  private static calculateDemandRange(scenarios: ScenarioResult[]): { min: number; max: number; average: number } {
    const allDemands = scenarios.flatMap(s => Object.values(s.totalDemandForecast));
    return {
      min: Math.min(...allDemands),
      max: Math.max(...allDemands),
      average: Math.round(allDemands.reduce((sum, d) => sum + d, 0) / allDemands.length)
    };
  }

  /**
   * Calculate vessel requirement range across scenarios
   */
  private static calculateVesselRequirementRange(scenarios: ScenarioResult[]): { min: number; max: number; average: number } {
    const fleetSizes = scenarios.map(s => s.recommendedFleetSize);
    return {
      min: Math.min(...fleetSizes),
      max: Math.max(...fleetSizes),
      average: Math.round(fleetSizes.reduce((sum, f) => sum + f, 0) / fleetSizes.length)
    };
  }

  /**
   * Generate consensus recommendations across scenarios
   */
  private static generateConsensusRecommendations(
    scenarios: ScenarioResult[], 
    fleetBaseline: CoreFleetBaseline
  ): ManagementRecommendation[] {
    const recommendations: ManagementRecommendation[] = [];
    const now = new Date();

    // Check if multiple scenarios suggest fleet expansion
    const expansionScenarios = scenarios.filter(s => s.recommendedFleetSize > fleetBaseline.baseVesselCount);
    
    if (expansionScenarios.length >= scenarios.length * 0.5) {
      const averageGap = expansionScenarios.reduce((sum, s) => 
        sum + (s.recommendedFleetSize - fleetBaseline.baseVesselCount), 0) / expansionScenarios.length;

      recommendations.push({
        id: 'fleet-expansion',
        type: 'vessel_acquisition',
        priority: averageGap > 2 ? 'high' : 'medium',
        title: 'Consider Fleet Expansion',
        description: `${expansionScenarios.length} of ${scenarios.length} scenarios suggest additional vessel capacity needed`,
        recommendedAction: `Evaluate adding ${Math.ceil(averageGap)} vessel(s) to core fleet`,
        timeframe: 'next_6_months',
        targetMonth: scenarios[0]?.peakDemandMonth || '',
        vesselImpact: Math.ceil(averageGap),
        costImpact: Math.ceil(averageGap) * 2000000, // Rough estimate per vessel
        demandImpact: 0,
        utilizationImpact: averageGap * 0.1,
        triggerConditions: ['Peak demand exceeding core fleet', 'Multiple scenarios show shortfall'],
        alternativeOptions: ['Spot charter during peaks', 'Extended work hours', 'Schedule optimization'],
        riskFactors: ['Market vessel availability', 'Rate volatility', 'Demand uncertainty'],
        confidence: Math.min(...expansionScenarios.map(s => s.confidenceScore)),
        dataSupport: ['Rig schedule analysis', 'Activity-based demand modeling'],
        stakeholderAlignment: 'medium',
        risks: ['Capacity shortage during peak demand', 'Increased operational costs', 'Delayed project timelines'],
        benefits: ['Improved service reliability', 'Better capacity utilization', 'Enhanced operational flexibility'],
        basedOnScenarios: expansionScenarios.map(s => s.scenario.id),
        status: 'pending',
        createdAt: now,
        reviewDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      });
    } else {
      // Current fleet appears adequate
      recommendations.push({
        id: 'maintain-fleet',
        type: 'capacity_optimization',
        priority: 'medium',
        title: 'Maintain Current Fleet Size',
        description: 'Analysis indicates current fleet size is adequate for forecasted demand',
        recommendedAction: 'Continue with current fleet configuration while monitoring utilization',
        timeframe: 'immediate',
        targetMonth: scenarios[0]?.forecastPeriod.startMonth || '',
        vesselImpact: 0,
        costImpact: 0,
        demandImpact: 0,
        utilizationImpact: 0.05,
        triggerConditions: ['Stable demand within capacity', 'Good utilization rates'],
        alternativeOptions: ['Optimize vessel assignments', 'Improve operational efficiency'],
        riskFactors: ['Unexpected demand surge', 'Vessel downtime'],
        confidence: Math.max(...scenarios.map(s => s.confidenceScore)),
        dataSupport: ['Current demand analysis', 'Fleet utilization trends'],
        stakeholderAlignment: 'high',
        risks: ['Unexpected demand increase', 'Fleet underutilization'],
        benefits: ['Stable costs', 'Efficient resource allocation', 'Proven operational capacity'],
        basedOnScenarios: scenarios.map(s => s.scenario.id),
        status: 'pending',
        createdAt: now,
        reviewDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) // 180 days
      });
    }

    return recommendations;
  }

  /**
   * Identify high-risk and low-utilization months
   */
  private static identifyRiskMonths(analyses: MonthlyVesselAnalysis[]): {
    highRiskMonths: string[];
    lowUtilizationMonths: string[];
  } {
    const highRiskMonths = analyses
      .filter(a => a.vesselGap > 0 || a.utilizationRate > 0.9)
      .map(a => a.month);
    
    const lowUtilizationMonths = analyses
      .filter(a => a.utilizationRate < 0.5 && a.totalDemand > 0)
      .map(a => a.month);

    return { highRiskMonths, lowUtilizationMonths };
  }

  /**
   * Calculate demand and capability sensitivity
   */
  private static calculateSensitivityAnalysis(analyses: MonthlyVesselAnalysis[]): {
    demandSensitivity: number;
    capabilitySensitivity: number;
  } {
    // Simplified sensitivity calculation
    const avgUtilization = analyses.reduce((sum, a) => sum + a.utilizationRate, 0) / analyses.length;
    
    return {
      demandSensitivity: avgUtilization > 0.8 ? 0.8 : 0.6, // Higher sensitivity when near capacity
      capabilitySensitivity: -0.9 // Vessel capability has strong negative correlation with requirements
    };
  }

  /**
   * Generate key decision points
   */
  private static generateDecisionPoints(
    analyses: MonthlyVesselAnalysis[],
    scenarios: ScenarioResult[]
  ): Array<{
    month: string;
    decision: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
    stakeholders: string[];
    dataRequired: string[];
    alternativeActions: string[];
  }> {
    const decisions = [];
    const highRiskPeriods = analyses.filter(a => a.vesselGap > 0);
    
    if (highRiskPeriods.length > 0) {
      const firstRisk = highRiskPeriods[0];
      const preRiskMonth = new Date(firstRisk.month + '-01');
      preRiskMonth.setMonth(preRiskMonth.getMonth() - 2);
      const decisionMonth = `${preRiskMonth.getFullYear()}-${String(preRiskMonth.getMonth() + 1).padStart(2, '0')}`;
      
      decisions.push({
        month: decisionMonth,
        decision: 'Evaluate additional vessel capacity needs',
        rationale: `Potential vessel shortfall identified in ${firstRisk.month}`,
        priority: 'high' as const,
        stakeholders: ['Operations', 'Commercial', 'Finance'],
        dataRequired: ['Updated rig schedule', 'Vessel availability', 'Market rates'],
        alternativeActions: ['Secure spot charter options', 'Optimize existing fleet', 'Reschedule non-critical activities']
      });
    }

    return decisions;
  }

  /**
   * Estimate forecast accuracy based on data quality
   */
  private static estimateForecastAccuracy(scheduleData: ProcessedRigScheduleData): number {
    const warningPenalty = scheduleData.metadata.validationWarnings.length * 0.02;
    const baseAccuracy = 0.85; // Assume 85% base accuracy for activity-based modeling
    return Math.max(0.6, Math.min(0.95, baseAccuracy - warningPenalty));
  }

  /**
   * Generate export data summary
   */
  private static generateExportData(baseScenario: ScenarioResult, analyses: MonthlyVesselAnalysis[]) {
    return {
      forecastSummary: [
        { metric: 'Average Monthly Demand', value: `${Math.round(Object.values(baseScenario.totalDemandForecast).reduce((a, b) => a + b, 0) / Object.values(baseScenario.totalDemandForecast).length)} deliveries`, scenario: baseScenario.scenario.name },
        { metric: 'Peak Demand Month', value: baseScenario.peakDemandMonth, scenario: baseScenario.scenario.name },
        { metric: 'Recommended Fleet Size', value: `${baseScenario.recommendedFleetSize} vessels`, scenario: baseScenario.scenario.name },
        { metric: 'Average Utilization', value: `${(baseScenario.averageUtilization * 100).toFixed(1)}%`, scenario: baseScenario.scenario.name }
      ],
      monthlyBreakdown: analyses.map(a => ({
        month: a.month,
        demand: Math.round(a.totalDemand),
        vessels: a.vesselRequirement,
        utilization: `${(a.utilizationRate * 100).toFixed(1)}%`,
        activeRigs: a.activeRigs,
        riskFactors: a.riskFactors.join(', ') || 'None'
      })),
      recommendations: baseScenario.recommendedFleetSize > 8 ? 
        ['Consider fleet expansion for peak periods', 'Monitor quarterly demand patterns', 'Evaluate charter options'] :
        ['Maintain current fleet size', 'Optimize vessel utilization', 'Monitor for demand changes']
    };
  }
}