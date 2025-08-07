/**
 * Scenario Comparison Engine
 * 
 * Compares MEAN vs EARLY case scenarios to identify differences, risks, and opportunities.
 * Provides side-by-side analysis and differential insights for decision making.
 */

import { VesselForecastResult, ScenarioResult, ManagementRecommendation } from '../types';
import { ProcessedRigScheduleData } from './processors/rigScheduleCSVProcessor';

export interface ScenarioComparison {
  scenarios: {
    mean?: ScenarioResult;
    early?: ScenarioResult;
  };
  demandComparison: {
    monthlyDifference: Record<string, number>; // YYYY-MM -> demand difference
    averageDifference: number;
    maxDifference: number;
    maxDifferenceMonth: string;
    percentageIncrease: number; // Early vs Mean
  };
  fleetComparison: {
    recommendedFleetDifference: number;
    utilizationDifference: number; // Early vs Mean
    capacityGapAnalysis: {
      monthsWithGap: string[];
      maxGap: number;
      maxGapMonth: string;
    };
  };
  riskAnalysis: {
    highRiskMonthsUnique: {
      meanOnly: string[];
      earlyOnly: string[];
      both: string[];
    };
    confidenceComparison: {
      meanConfidence: number;
      earlyConfidence: number;
      confidenceDelta: number;
    };
    criticalDecisionPoints: Array<{
      month: string;
      trigger: string;
      meanScenarioAction: string;
      earlyScenarioAction: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  };
  opportunityAnalysis: {
    costOptimizationOpportunities: Array<{
      opportunity: string;
      potentialSavings: number;
      applicableScenarios: string[];
      implementation: string;
    }>;
    flexibilityRecommendations: Array<{
      recommendation: string;
      benefit: string;
      scenarios: string[];
    }>;
  };
  consensusRecommendations: ManagementRecommendation[];
  executiveSummary: {
    keyFindings: string[];
    strategicImplications: string[];
    immediateActions: string[];
    contingencyPlans: string[];
  };
}

export interface ScenarioDataComparison {
  meanData?: ProcessedRigScheduleData;
  earlyData?: ProcessedRigScheduleData;
  activityComparison: {
    totalActivitiesDifference: number;
    rigCountDifference: number;
    locationMixChanges: Record<string, number>;
    activityTypeMixChanges: Record<string, number>;
  };
  demandDriverComparison: {
    demandByLocationDifference: Record<string, number>;
    demandByActivityTypeDifference: Record<string, number>;
    transitMixImpact: {
      shortTransitDifference: number;
      longTransitDifference: number;
      capacityImpact: number;
    };
  };
}

/**
 * Main scenario comparison engine
 */
export class ScenarioComparisonEngine {
  
  /**
   * Compare MEAN and EARLY case forecast results
   */
  static compareForecasts(
    meanForecast?: VesselForecastResult,
    earlyForecast?: VesselForecastResult
  ): ScenarioComparison {
    console.log('🔄 Starting scenario comparison analysis...');
    
    if (!meanForecast && !earlyForecast) {
      throw new Error('At least one forecast result is required for comparison');
    }

    const meanScenario = meanForecast?.baseScenario;
    const earlyScenario = earlyForecast?.baseScenario;

    // Demand comparison analysis
    const demandComparison = this.compareDemandProfiles(meanScenario, earlyScenario);
    
    // Fleet requirement comparison
    const fleetComparison = this.compareFleetRequirements(meanScenario, earlyScenario);
    
    // Risk analysis
    const riskAnalysis = this.compareRiskProfiles(
      meanForecast?.highRiskMonths || [],
      earlyForecast?.highRiskMonths || [],
      meanScenario?.confidenceScore || 0,
      earlyScenario?.confidenceScore || 0
    );
    
    // Opportunity analysis
    const opportunityAnalysis = this.identifyOpportunities(meanForecast, earlyForecast);
    
    // Generate consensus recommendations
    const consensusRecommendations = this.generateConsensusRecommendations(
      meanForecast,
      earlyForecast,
      demandComparison,
      fleetComparison
    );
    
    // Executive summary
    const executiveSummary = this.generateExecutiveSummary(
      demandComparison,
      fleetComparison,
      riskAnalysis
    );

    const comparison: ScenarioComparison = {
      scenarios: { mean: meanScenario, early: earlyScenario },
      demandComparison,
      fleetComparison,
      riskAnalysis,
      opportunityAnalysis,
      consensusRecommendations,
      executiveSummary
    };

    console.log('✅ Scenario comparison completed');
    console.log(`📊 Average demand difference: ${demandComparison.averageDifference.toFixed(1)} deliveries/month`);
    console.log(`🚢 Fleet size difference: ${fleetComparison.recommendedFleetDifference} vessels`);
    console.log(`🎯 Generated ${consensusRecommendations.length} consensus recommendations`);

    return comparison;
  }

  /**
   * Compare raw scenario data before forecasting
   */
  static compareScenarioData(
    meanData?: ProcessedRigScheduleData,
    earlyData?: ProcessedRigScheduleData
  ): ScenarioDataComparison {
    console.log('📊 Comparing raw scenario data...');
    
    const activityComparison = {
      totalActivitiesDifference: (earlyData?.metadata.totalRecords || 0) - (meanData?.metadata.totalRecords || 0),
      rigCountDifference: (earlyData?.metadata.rigs.length || 0) - (meanData?.metadata.rigs.length || 0),
      locationMixChanges: this.calculateLocationMixChanges(meanData, earlyData),
      activityTypeMixChanges: this.calculateActivityTypeMixChanges(meanData, earlyData)
    };

    const demandDriverComparison = {
      demandByLocationDifference: this.calculateDemandLocationDifferences(meanData, earlyData),
      demandByActivityTypeDifference: this.calculateDemandActivityTypeDifferences(meanData, earlyData),
      transitMixImpact: this.calculateTransitMixImpact(meanData, earlyData)
    };

    return {
      meanData,
      earlyData,
      activityComparison,
      demandDriverComparison
    };
  }

  /**
   * Compare demand profiles between scenarios
   */
  private static compareDemandProfiles(
    meanScenario?: ScenarioResult,
    earlyScenario?: ScenarioResult
  ) {
    const monthlyDifference: Record<string, number> = {};
    let totalMeanDemand = 0;
    let totalEarlyDemand = 0;
    let maxDifference = 0;
    let maxDifferenceMonth = '';

    // Calculate monthly differences
    const allMonths = new Set([
      ...Object.keys(meanScenario?.totalDemandForecast || {}),
      ...Object.keys(earlyScenario?.totalDemandForecast || {})
    ]);

    for (const month of allMonths) {
      const meanDemand = meanScenario?.totalDemandForecast[month] || 0;
      const earlyDemand = earlyScenario?.totalDemandForecast[month] || 0;
      const difference = earlyDemand - meanDemand;
      
      monthlyDifference[month] = difference;
      totalMeanDemand += meanDemand;
      totalEarlyDemand += earlyDemand;
      
      if (Math.abs(difference) > Math.abs(maxDifference)) {
        maxDifference = difference;
        maxDifferenceMonth = month;
      }
    }

    const averageDifference = allMonths.size > 0 ? 
      (totalEarlyDemand - totalMeanDemand) / allMonths.size : 0;
    
    const percentageIncrease = totalMeanDemand > 0 ? 
      ((totalEarlyDemand - totalMeanDemand) / totalMeanDemand) * 100 : 0;

    return {
      monthlyDifference,
      averageDifference,
      maxDifference,
      maxDifferenceMonth,
      percentageIncrease
    };
  }

  /**
   * Compare fleet requirements between scenarios
   */
  private static compareFleetRequirements(
    meanScenario?: ScenarioResult,
    earlyScenario?: ScenarioResult
  ) {
    const recommendedFleetDifference = (earlyScenario?.recommendedFleetSize || 0) - 
                                     (meanScenario?.recommendedFleetSize || 0);
    
    const utilizationDifference = (earlyScenario?.averageUtilization || 0) - 
                                (meanScenario?.averageUtilization || 0);

    // Analyze capacity gaps
    const monthsWithGap: string[] = [];
    let maxGap = 0;
    let maxGapMonth = '';

    const allMonths = new Set([
      ...Object.keys(earlyScenario?.vesselGapByMonth || {}),
      ...Object.keys(meanScenario?.vesselGapByMonth || {})
    ]);

    for (const month of allMonths) {
      const meanGap = meanScenario?.vesselGapByMonth[month] || 0;
      const earlyGap = earlyScenario?.vesselGapByMonth[month] || 0;
      
      if (meanGap > 0 || earlyGap > 0) {
        monthsWithGap.push(month);
        
        const maxMonthGap = Math.max(meanGap, earlyGap);
        if (maxMonthGap > maxGap) {
          maxGap = maxMonthGap;
          maxGapMonth = month;
        }
      }
    }

    return {
      recommendedFleetDifference,
      utilizationDifference,
      capacityGapAnalysis: {
        monthsWithGap,
        maxGap,
        maxGapMonth
      }
    };
  }

  /**
   * Compare risk profiles between scenarios
   */
  private static compareRiskProfiles(
    meanHighRisk: string[],
    earlyHighRisk: string[],
    meanConfidence: number,
    earlyConfidence: number
  ) {
    const meanSet = new Set(meanHighRisk);
    const earlySet = new Set(earlyHighRisk);
    
    const both = meanHighRisk.filter(month => earlySet.has(month));
    const meanOnly = meanHighRisk.filter(month => !earlySet.has(month));
    const earlyOnly = earlyHighRisk.filter(month => !meanSet.has(month));

    const confidenceDelta = earlyConfidence - meanConfidence;

    // Generate critical decision points
    const criticalDecisionPoints = this.identifyDecisionPoints(
      meanHighRisk,
      earlyHighRisk,
      meanConfidence,
      earlyConfidence
    );

    return {
      highRiskMonthsUnique: { meanOnly, earlyOnly, both },
      confidenceComparison: {
        meanConfidence,
        earlyConfidence,
        confidenceDelta
      },
      criticalDecisionPoints
    };
  }

  /**
   * Identify opportunities for optimization
   */
  private static identifyOpportunities(
    meanForecast?: VesselForecastResult,
    earlyForecast?: VesselForecastResult
  ) {
    const costOptimizationOpportunities = [];
    const flexibilityRecommendations = [];

    // Identify cost optimization opportunities
    if (meanForecast && earlyForecast) {
      const meanUtilization = meanForecast.baseScenario.averageUtilization;
      const earlyUtilization = earlyForecast.baseScenario.averageUtilization;

      if (meanUtilization < 0.6) {
        costOptimizationOpportunities.push({
          opportunity: 'Optimize fleet utilization in mean case scenario',
          potentialSavings: 500000, // Rough estimate
          applicableScenarios: ['mean'],
          implementation: 'Consolidate vessel schedules and optimize routing'
        });
      }

      if (Math.abs(earlyUtilization - meanUtilization) > 0.2) {
        flexibilityRecommendations.push({
          recommendation: 'Implement flexible charter arrangements',
          benefit: 'Adapt capacity based on which scenario materializes',
          scenarios: ['mean', 'early']
        });
      }
    }

    // Additional opportunity identification
    if (earlyForecast?.baseScenario.recommendedFleetSize && meanForecast?.baseScenario.recommendedFleetSize) {
      const fleetDifference = earlyForecast.baseScenario.recommendedFleetSize - meanForecast.baseScenario.recommendedFleetSize;
      
      if (fleetDifference > 0) {
        flexibilityRecommendations.push({
          recommendation: 'Secure contingent charter capacity',
          benefit: `Prepare for potential need of ${fleetDifference} additional vessel(s)`,
          scenarios: ['early']
        });
      }
    }

    return { costOptimizationOpportunities, flexibilityRecommendations };
  }

  /**
   * Generate consensus recommendations across scenarios
   */
  private static generateConsensusRecommendations(
    meanForecast?: VesselForecastResult,
    earlyForecast?: VesselForecastResult,
    demandComparison?: any,
    fleetComparison?: any
  ): ManagementRecommendation[] {
    const recommendations: ManagementRecommendation[] = [];
    const now = new Date();

    // Fleet sizing recommendation based on scenario comparison
    if (fleetComparison?.recommendedFleetDifference > 0) {
      recommendations.push({
        id: 'scenario-based-fleet-planning',
        type: 'capacity_planning',
        priority: 'high',
        title: 'Implement Scenario-Based Fleet Planning',
        description: `Early case requires ${fleetComparison.recommendedFleetDifference} additional vessel(s) vs mean case`,
        recommendedAction: 'Develop flexible charter options to scale based on realized scenario',
        timeframe: 'next_3_months',
        targetMonth: '',
        vesselImpact: fleetComparison.recommendedFleetDifference,
        costImpact: fleetComparison.recommendedFleetDifference * 2000000,
        demandImpact: demandComparison?.averageDifference || 0,
        utilizationImpact: fleetComparison.utilizationDifference,
        triggerConditions: ['Scenario uncertainty', 'Significant demand variation'],
        alternativeOptions: ['Spot charter market', 'Extended work schedules', 'Schedule optimization'],
        riskFactors: ['Market availability', 'Rate volatility', 'Scenario timing'],
        confidence: 0.75,
        dataSupport: ['Multi-scenario analysis', 'Demand variability assessment'],
        stakeholderAlignment: 'medium',
        risks: ['Insufficient charter capacity available', 'Higher costs during peak demand'],
        benefits: ['Flexible capacity scaling', 'Optimized cost structure', 'Risk mitigation'],
        basedOnScenarios: [meanForecast?.baseScenario.scenario.id || 'mean', earlyForecast?.baseScenario.scenario.id || 'early'],
        status: 'pending',
        createdAt: now,
        reviewDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      });
    }

    // Decision framework recommendation
    recommendations.push({
      id: 'scenario-monitoring-framework',
      type: 'operational_excellence',
      priority: 'medium',
      title: 'Establish Scenario Monitoring Framework',
      description: 'Implement early indicators to determine which scenario is materializing',
      recommendedAction: 'Track key leading indicators monthly to pivot fleet strategy',
      timeframe: 'immediate',
      targetMonth: '',
      vesselImpact: 0,
      costImpact: 50000, // Monitoring system costs
      demandImpact: 0,
      utilizationImpact: 0,
      triggerConditions: ['Scenario uncertainty', 'Need for adaptive planning'],
      alternativeOptions: ['Quarterly reviews', 'Reactive planning'],
      riskFactors: ['Indicator accuracy', 'Response time'],
      confidence: 0.85,
      dataSupport: ['Historical variance patterns', 'Leading indicator analysis'],
      stakeholderAlignment: 'high',
      risks: ['False signals from indicators', 'Delayed response to changes'],
      benefits: ['Proactive decision making', 'Optimized fleet deployment', 'Risk reduction'],
      basedOnScenarios: [meanForecast?.baseScenario.scenario.id || 'mean', earlyForecast?.baseScenario.scenario.id || 'early'],
      status: 'pending',
      createdAt: now,
      reviewDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    });

    return recommendations;
  }

  /**
   * Generate executive summary of comparison
   */
  private static generateExecutiveSummary(
    demandComparison: any,
    fleetComparison: any,
    riskAnalysis: any
  ) {
    const keyFindings = [];
    const strategicImplications = [];
    const immediateActions = [];
    const contingencyPlans = [];

    // Key findings
    if (Math.abs(demandComparison.percentageIncrease) > 10) {
      keyFindings.push(`Early case shows ${demandComparison.percentageIncrease.toFixed(1)}% demand increase vs mean case`);
    }

    if (fleetComparison.recommendedFleetDifference > 0) {
      keyFindings.push(`Early case requires ${fleetComparison.recommendedFleetDifference} additional vessel(s)`);
    }

    if (riskAnalysis.highRiskMonthsUnique.earlyOnly.length > 0) {
      keyFindings.push(`${riskAnalysis.highRiskMonthsUnique.earlyOnly.length} high-risk months unique to early case`);
    }

    // Strategic implications
    strategicImplications.push('Fleet sizing strategy must account for scenario uncertainty');
    
    if (fleetComparison.utilizationDifference > 0.15) {
      strategicImplications.push('Significant utilization variance requires flexible capacity planning');
    }

    // Immediate actions
    immediateActions.push('Implement scenario monitoring framework');
    
    if (fleetComparison.recommendedFleetDifference > 0) {
      immediateActions.push('Evaluate contingent charter options');
    }

    // Contingency plans
    contingencyPlans.push('Activate additional charter if early case indicators materialize');
    contingencyPlans.push('Optimize existing fleet utilization if mean case confirms');

    return {
      keyFindings,
      strategicImplications,
      immediateActions,
      contingencyPlans
    };
  }

  /**
   * Helper methods for detailed comparisons
   */
  
  private static calculateLocationMixChanges(
    meanData?: ProcessedRigScheduleData,
    earlyData?: ProcessedRigScheduleData
  ): Record<string, number> {
    const changes: Record<string, number> = {};
    
    if (!meanData || !earlyData) return changes;

    // Compare location demand between scenarios
    Object.keys(earlyData.vesselDemandAnalysis.demandByLocation).forEach(location => {
      const earlyDemand = earlyData.vesselDemandAnalysis.demandByLocation[location] || 0;
      const meanDemand = meanData.vesselDemandAnalysis.demandByLocation[location] || 0;
      changes[location] = earlyDemand - meanDemand;
    });

    return changes;
  }

  private static calculateActivityTypeMixChanges(
    meanData?: ProcessedRigScheduleData,
    earlyData?: ProcessedRigScheduleData
  ): Record<string, number> {
    const changes: Record<string, number> = {};
    
    if (!meanData || !earlyData) return changes;

    Object.keys(earlyData.vesselDemandAnalysis.demandByActivityType).forEach(activityType => {
      const earlyDemand = earlyData.vesselDemandAnalysis.demandByActivityType[activityType] || 0;
      const meanDemand = meanData.vesselDemandAnalysis.demandByActivityType[activityType] || 0;
      changes[activityType] = earlyDemand - meanDemand;
    });

    return changes;
  }

  private static calculateDemandLocationDifferences(
    meanData?: ProcessedRigScheduleData,
    earlyData?: ProcessedRigScheduleData
  ): Record<string, number> {
    // Same as location mix changes for now
    return this.calculateLocationMixChanges(meanData, earlyData);
  }

  private static calculateDemandActivityTypeDifferences(
    meanData?: ProcessedRigScheduleData,
    earlyData?: ProcessedRigScheduleData
  ): Record<string, number> {
    // Same as activity type mix changes for now
    return this.calculateActivityTypeMixChanges(meanData, earlyData);
  }

  private static calculateTransitMixImpact(
    meanData?: ProcessedRigScheduleData,
    earlyData?: ProcessedRigScheduleData
  ) {
    const shortTransitDifference = (earlyData?.metadata.demandSummary.shortTransitActivities || 0) -
                                  (meanData?.metadata.demandSummary.shortTransitActivities || 0);
    
    const longTransitDifference = (earlyData?.metadata.demandSummary.longTransitActivities || 0) -
                                 (meanData?.metadata.demandSummary.longTransitActivities || 0);

    // Rough capacity impact calculation (long transit reduces capacity by ~25%)
    const capacityImpact = longTransitDifference * 0.25;

    return {
      shortTransitDifference,
      longTransitDifference,
      capacityImpact
    };
  }

  private static identifyDecisionPoints(
    meanHighRisk: string[],
    earlyHighRisk: string[],
    meanConfidence: number,
    earlyConfidence: number
  ) {
    const decisionPoints = [];
    
    // Decision point for months with risk in early case only
    const earlyOnlyRisk = earlyHighRisk.filter(month => !meanHighRisk.includes(month));
    
    for (const month of earlyOnlyRisk) {
      const monthDate = new Date(month + '-01');
      const decisionMonth = new Date(monthDate.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days prior
      const decisionMonthKey = `${decisionMonth.getFullYear()}-${String(decisionMonth.getMonth() + 1).padStart(2, '0')}`;
      
      decisionPoints.push({
        month: decisionMonthKey,
        trigger: `High risk period in early case: ${month}`,
        meanScenarioAction: 'Monitor and maintain current capacity',
        earlyScenarioAction: 'Activate contingent charter capacity',
        riskLevel: 'high' as const
      });
    }

    return decisionPoints;
  }

  /**
   * Get scenario comparison summary for display
   */
  static getComparisonSummary(comparison: ScenarioComparison): {
    title: string;
    summary: string;
    keyMetrics: Array<{ label: string; value: string; delta?: string }>;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const demandIncrease = comparison.demandComparison.percentageIncrease;
    const fleetDifference = comparison.fleetComparison.recommendedFleetDifference;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (Math.abs(demandIncrease) > 20 || fleetDifference > 1) {
      riskLevel = 'high';
    } else if (Math.abs(demandIncrease) > 10 || fleetDifference > 0) {
      riskLevel = 'medium';
    }

    return {
      title: 'MEAN vs EARLY Case Scenario Comparison',
      summary: `Early case shows ${demandIncrease.toFixed(1)}% demand increase requiring ${fleetDifference} additional vessel(s)`,
      keyMetrics: [
        {
          label: 'Demand Difference',
          value: `${comparison.demandComparison.averageDifference.toFixed(1)} deliveries/month`,
          delta: `+${demandIncrease.toFixed(1)}%`
        },
        {
          label: 'Fleet Size Difference',
          value: `${fleetDifference} vessels`,
          delta: fleetDifference > 0 ? `+${fleetDifference}` : '0'
        },
        {
          label: 'Peak Difference',
          value: `${comparison.demandComparison.maxDifference.toFixed(1)} deliveries`,
          delta: comparison.demandComparison.maxDifferenceMonth
        }
      ],
      riskLevel
    };
  }
}