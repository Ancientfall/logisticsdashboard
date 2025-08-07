/**
 * Location-Based Capacity Planning Component
 * 
 * Visualizes transit time impact on vessel capacity and provides detailed
 * location-based capacity planning insights for operational optimization.
 */

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Ship,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Route,
  Compass,
  BarChart3
} from 'lucide-react';
import { ProcessedRigScheduleData } from '../../utils/processors/rigScheduleCSVProcessor';
import { 
  getLocationProfile, 
  LOCATION_CAPABILITY_PROFILES,
  VESSEL_CAPABILITY_BASELINES 
} from '../../utils/locationVesselCapability';

interface LocationCapacityPlanningProps {
  rigScheduleData: ProcessedRigScheduleData[];
  selectedScenario: string;
  className?: string;
}

interface LocationCapacityAnalysis {
  location: string;
  transitCategory: 'SHORT' | 'LONG';
  transitTime: string;
  vesselDeliveriesPerMonth: number;
  totalActivities: number;
  demandPerMonth: number;
  utilizationRate: number;
  vesselRequirement: number;
  capacityGap: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  peakMonths: string[];
  efficiency: number;
  transitImpact: string;
}

interface TransitComparisonData {
  category: 'SHORT' | 'LONG';
  locations: number;
  averageCapacity: number;
  totalDemand: number;
  utilizationRate: number;
  vesselRequirement: number;
  efficiency: number;
}

const LocationCapacityPlanning: React.FC<LocationCapacityPlanningProps> = ({
  rigScheduleData,
  selectedScenario,
  className = ""
}) => {
  const [locationAnalyses, setLocationAnalyses] = useState<LocationCapacityAnalysis[]>([]);
  const [transitComparison, setTransitComparison] = useState<TransitComparisonData[]>([]);
  const [selectedView, setSelectedView] = useState<'capacity' | 'transit' | 'optimization'>('capacity');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (rigScheduleData.length > 0) {
      analyzeLocationCapacity();
    }
  }, [rigScheduleData, selectedScenario]);

  /**
   * Analyze location-based capacity and transit impacts
   */
  const analyzeLocationCapacity = async () => {
    setIsAnalyzing(true);

    try {
      // Filter data for selected scenario
      const scenarioData = rigScheduleData.find(data => 
        data.metadata.scenarios.includes(selectedScenario)
      );

      if (!scenarioData) {
        console.warn(`No data found for scenario: ${selectedScenario}`);
        return;
      }

      // Group activities by location
      const locationStats: Record<string, {
        activities: any[];
        monthlyDemand: Record<string, number>;
        totalDemand: number;
      }> = {};

      for (const activity of scenarioData.rigScheduleData) {
        const location = activity.location;
        const activityMonth = new Date(activity.startDate).toISOString().substring(0, 7);
        const demandContribution = 8.2 * 0.8; // Simplified demand calculation

        if (!locationStats[location]) {
          locationStats[location] = {
            activities: [],
            monthlyDemand: {},
            totalDemand: 0
          };
        }

        locationStats[location].activities.push(activity);
        locationStats[location].monthlyDemand[activityMonth] = 
          (locationStats[location].monthlyDemand[activityMonth] || 0) + demandContribution;
        locationStats[location].totalDemand += demandContribution;
      }

      // Generate location capacity analyses
      const analyses: LocationCapacityAnalysis[] = Object.entries(locationStats).map(([location, stats]) => {
        const locationProfile = getLocationProfile(location);
        const monthlyCapacity = locationProfile.vesselDeliveriesPerMonth;
        const averageDemandPerMonth = stats.totalDemand / Object.keys(stats.monthlyDemand).length;
        const utilizationRate = averageDemandPerMonth / monthlyCapacity;
        const vesselRequirement = Math.ceil(averageDemandPerMonth / monthlyCapacity);
        const capacityGap = Math.max(0, averageDemandPerMonth - monthlyCapacity);

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (utilizationRate > 0.85) riskLevel = 'high';
        else if (utilizationRate > 0.70) riskLevel = 'medium';

        // Find peak months
        const peakMonths = Object.entries(stats.monthlyDemand)
          .filter(([_, demand]) => demand > averageDemandPerMonth * 1.2)
          .map(([month]) => month)
          .slice(0, 3);

        // Calculate efficiency (capacity utilization)
        const efficiency = Math.min(100, utilizationRate * 100);

        // Generate recommendations
        const recommendations: string[] = [];
        if (riskLevel === 'high') {
          recommendations.push('Consider additional vessel capacity');
          recommendations.push('Optimize activity scheduling');
        }
        if (locationProfile.transitCategory === 'LONG') {
          recommendations.push('Evaluate closer supply bases');
          recommendations.push('Consider bulk delivery strategies');
        }
        if (efficiency < 60) {
          recommendations.push('Consolidate activities with nearby locations');
        }
        if (peakMonths.length > 0) {
          recommendations.push('Plan for peak demand periods');
        }

        return {
          location,
          transitCategory: locationProfile.transitCategory,
          transitTime: locationProfile.transitCategory === 'LONG' ? '24+ hours' : '13 hours',
          vesselDeliveriesPerMonth: monthlyCapacity,
          totalActivities: stats.activities.length,
          demandPerMonth: averageDemandPerMonth,
          utilizationRate,
          vesselRequirement,
          capacityGap,
          riskLevel,
          recommendations: recommendations.slice(0, 2), // Limit to top 2
          peakMonths,
          efficiency,
          transitImpact: locationProfile.transitCategory === 'LONG' ? 
            '-25% capacity efficiency' : 'Optimal capacity efficiency'
        };
      });

      // Generate transit comparison data
      const shortTransitAnalyses = analyses.filter(a => a.transitCategory === 'SHORT');
      const longTransitAnalyses = analyses.filter(a => a.transitCategory === 'LONG');

      const comparison: TransitComparisonData[] = [
        {
          category: 'SHORT',
          locations: shortTransitAnalyses.length,
          averageCapacity: shortTransitAnalyses.length > 0 ? 
            shortTransitAnalyses.reduce((sum, a) => sum + a.vesselDeliveriesPerMonth, 0) / shortTransitAnalyses.length : 0,
          totalDemand: shortTransitAnalyses.reduce((sum, a) => sum + a.demandPerMonth, 0),
          utilizationRate: shortTransitAnalyses.length > 0 ?
            shortTransitAnalyses.reduce((sum, a) => sum + a.utilizationRate, 0) / shortTransitAnalyses.length : 0,
          vesselRequirement: shortTransitAnalyses.reduce((sum, a) => sum + a.vesselRequirement, 0),
          efficiency: shortTransitAnalyses.length > 0 ?
            shortTransitAnalyses.reduce((sum, a) => sum + a.efficiency, 0) / shortTransitAnalyses.length : 0
        },
        {
          category: 'LONG',
          locations: longTransitAnalyses.length,
          averageCapacity: longTransitAnalyses.length > 0 ? 
            longTransitAnalyses.reduce((sum, a) => sum + a.vesselDeliveriesPerMonth, 0) / longTransitAnalyses.length : 0,
          totalDemand: longTransitAnalyses.reduce((sum, a) => sum + a.demandPerMonth, 0),
          utilizationRate: longTransitAnalyses.length > 0 ?
            longTransitAnalyses.reduce((sum, a) => sum + a.utilizationRate, 0) / longTransitAnalyses.length : 0,
          vesselRequirement: longTransitAnalyses.reduce((sum, a) => sum + a.vesselRequirement, 0),
          efficiency: longTransitAnalyses.length > 0 ?
            longTransitAnalyses.reduce((sum, a) => sum + a.efficiency, 0) / longTransitAnalyses.length : 0
        }
      ];

      // Sort analyses by utilization rate (highest risk first)
      analyses.sort((a, b) => b.utilizationRate - a.utilizationRate);

      setLocationAnalyses(analyses);
      setTransitComparison(comparison);

      console.log(`✅ Location capacity analysis completed: ${analyses.length} locations`);
      console.log(`🚀 Short transit locations: ${shortTransitAnalyses.length}, Long transit: ${longTransitAnalyses.length}`);
      console.log(`⚡ Highest utilization: ${analyses[0]?.location} (${(analyses[0]?.utilizationRate * 100).toFixed(1)}%)`);

    } catch (error) {
      console.error('❌ Error analyzing location capacity:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Render capacity overview
   */
  const renderCapacityView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationAnalyses.slice(0, 9).map((analysis) => (
          <div key={analysis.location} className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {analysis.location.split('.').pop() || analysis.location}
              </h4>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  analysis.transitCategory === 'LONG' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {analysis.transitTime}
                </span>
                {analysis.riskLevel === 'high' && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-medium">{analysis.vesselDeliveriesPerMonth.toFixed(1)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Demand:</span>
                <span className="font-medium">{analysis.demandPerMonth.toFixed(1)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilization:</span>
                <span className={`font-medium ${
                  analysis.utilizationRate > 0.85 ? 'text-red-600' :
                  analysis.utilizationRate > 0.70 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {(analysis.utilizationRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Activities:</span>
                <span className="font-medium">{analysis.totalActivities}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx}>• {rec}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Utilization Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Location Capacity Utilization
        </h3>
        <div className="space-y-3">
          {locationAnalyses.slice(0, 10).map((analysis) => {
            const utilizationPercent = analysis.utilizationRate * 100;
            
            return (
              <div key={analysis.location} className="flex items-center space-x-3">
                <div className="w-28 text-sm font-medium text-gray-700 truncate">
                  {analysis.location.split('.').pop() || analysis.location}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        utilizationPercent > 85 ? 'bg-red-500' :
                        utilizationPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {utilizationPercent.toFixed(1)}%
                </div>
                <div className="w-12 text-xs text-gray-500">
                  {analysis.transitCategory}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /**
   * Render transit comparison view
   */
  const renderTransitView = () => (
    <div className="space-y-6">
      {/* Transit Category Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {transitComparison.map((category) => (
          <div key={category.category} className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {category.category === 'SHORT' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Clock className="w-5 h-5 text-red-600" />
                )}
                {category.category} Transit Locations
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                category.category === 'SHORT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {category.locations} locations
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Avg Capacity</div>
                <div className="font-semibold text-lg">{category.averageCapacity.toFixed(1)}</div>
                <div className="text-xs text-gray-500">deliveries/month/vessel</div>
              </div>
              <div>
                <div className="text-gray-600">Total Demand</div>
                <div className="font-semibold text-lg">{category.totalDemand.toFixed(1)}</div>
                <div className="text-xs text-gray-500">deliveries/month</div>
              </div>
              <div>
                <div className="text-gray-600">Utilization</div>
                <div className={`font-semibold text-lg ${
                  category.utilizationRate > 0.8 ? 'text-red-600' :
                  category.utilizationRate > 0.6 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {(category.utilizationRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">average across locations</div>
              </div>
              <div>
                <div className="text-gray-600">Vessels Required</div>
                <div className="font-semibold text-lg">{category.vesselRequirement}</div>
                <div className="text-xs text-gray-500">total across locations</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm">
                <div className="text-gray-600">Efficiency Rating</div>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        category.efficiency > 80 ? 'bg-green-500' :
                        category.efficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${category.efficiency}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{category.efficiency.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transit Impact Analysis */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Route className="w-5 h-5 text-purple-600" />
          Transit Time Impact Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth}
            </div>
            <div className="text-sm text-green-800 font-medium">Short Transit</div>
            <div className="text-xs text-green-600">deliveries/month</div>
            <div className="text-xs text-gray-600 mt-1">13 hour round trip</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.deliveriesPerMonth}
            </div>
            <div className="text-sm text-red-800 font-medium">Long Transit</div>
            <div className="text-xs text-red-600">deliveries/month</div>
            <div className="text-xs text-gray-600 mt-1">24+ hour round trip</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {(((VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth - VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.deliveriesPerMonth) / VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-purple-800 font-medium">Capacity Impact</div>
            <div className="text-xs text-purple-600">reduction from transit</div>
            <div className="text-xs text-gray-600 mt-1">long vs short transit</div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Key Transit Impact Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-800 mb-2">Capacity Efficiency:</div>
              <ul className="space-y-1 text-gray-600">
                <li>• Short transit locations: {VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth} deliveries/month</li>
                <li>• Long transit locations: {VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.deliveriesPerMonth} deliveries/month</li>
                <li>• Efficiency loss: {((VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth - VESSEL_CAPABILITY_BASELINES.LONG_TRANSIT.deliveriesPerMonth) / VESSEL_CAPABILITY_BASELINES.SHORT_TRANSIT.deliveriesPerMonth * 100).toFixed(0)}% reduction</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-gray-800 mb-2">Strategic Implications:</div>
              <ul className="space-y-1 text-gray-600">
                <li>• Long transit requires 1.33x vessel capacity</li>
                <li>• Bulk deliveries more critical for distant locations</li>
                <li>• Supply base optimization opportunities exist</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render optimization recommendations
   */
  const renderOptimizationView = () => {
    const highUtilizationLocations = locationAnalyses.filter(l => l.utilizationRate > 0.8);
    const longTransitLocations = locationAnalyses.filter(l => l.transitCategory === 'LONG');
    const underutilizedLocations = locationAnalyses.filter(l => l.utilizationRate < 0.4);

    return (
      <div className="space-y-6">
        {/* Priority Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              High Priority ({highUtilizationLocations.length})
            </h3>
            <div className="space-y-3">
              {highUtilizationLocations.slice(0, 3).map((location) => (
                <div key={location.location} className="text-sm">
                  <div className="font-medium text-red-900">
                    {location.location.split('.').pop()}
                  </div>
                  <div className="text-red-700">
                    {(location.utilizationRate * 100).toFixed(0)}% utilization
                  </div>
                  <div className="text-red-600 text-xs">
                    {location.recommendations[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Long Transit ({longTransitLocations.length})
            </h3>
            <div className="space-y-3">
              {longTransitLocations.slice(0, 3).map((location) => (
                <div key={location.location} className="text-sm">
                  <div className="font-medium text-yellow-900">
                    {location.location.split('.').pop()}
                  </div>
                  <div className="text-yellow-700">
                    {location.transitImpact}
                  </div>
                  <div className="text-yellow-600 text-xs">
                    {location.recommendations[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Optimization ({underutilizedLocations.length})
            </h3>
            <div className="space-y-3">
              {underutilizedLocations.slice(0, 3).map((location) => (
                <div key={location.location} className="text-sm">
                  <div className="font-medium text-blue-900">
                    {location.location.split('.').pop()}
                  </div>
                  <div className="text-blue-700">
                    {(location.utilizationRate * 100).toFixed(0)}% utilization
                  </div>
                  <div className="text-blue-600 text-xs">
                    Consolidation opportunity
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-purple-600" />
            Strategic Capacity Optimization Plan
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Immediate Actions (0-3 months)</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Review high-utilization locations for additional vessel support
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Optimize scheduling for long transit locations
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Implement bulk delivery strategies where applicable
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Monitor capacity utilization weekly
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Medium-term Strategy (3-12 months)</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Route className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  Evaluate supply base locations for long transit optimization
                </li>
                <li className="flex items-start gap-2">
                  <Route className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  Consider regional consolidation opportunities
                </li>
                <li className="flex items-start gap-2">
                  <Route className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  Develop flexible charter arrangements for peak periods
                </li>
                <li className="flex items-start gap-2">
                  <Route className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  Implement predictive capacity planning models
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>Key Performance Indicators to Monitor:</strong>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>Location utilization rates</div>
                <div>Transit time efficiency</div>
                <div>Vessel requirement trends</div>
                <div>Capacity gap analysis</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isAnalyzing) {
    return (
      <div className={`bg-white p-8 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <MapPin className="w-5 h-5 animate-pulse text-blue-600" />
          <span className="text-gray-600">Analyzing location capacity and transit impacts...</span>
        </div>
      </div>
    );
  }

  if (locationAnalyses.length === 0) {
    return (
      <div className={`bg-white p-8 rounded-lg border border-gray-200 ${className}`}>
        <div className="text-center text-gray-600">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No location capacity data available for analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <MapPin className="w-8 h-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Location Capacity Planning</h2>
              <p className="text-gray-600">Transit time impact visualization ({selectedScenario.toUpperCase()} Case)</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setSelectedView('capacity')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'capacity' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Ship className="w-4 h-4 inline mr-2" />
            Capacity Analysis
          </button>
          <button
            onClick={() => setSelectedView('transit')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'transit' 
                ? 'bg-white text-red-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Transit Impact
          </button>
          <button
            onClick={() => setSelectedView('optimization')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'optimization' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Compass className="w-4 h-4 inline mr-2" />
            Optimization
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Total Locations</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{locationAnalyses.length}</div>
          <div className="text-xs text-gray-500">Active drilling locations</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-gray-700">Long Transit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {locationAnalyses.filter(l => l.transitCategory === 'LONG').length}
          </div>
          <div className="text-xs text-gray-500">24+ hour round trips</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">High Utilization</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {locationAnalyses.filter(l => l.utilizationRate > 0.8).length}
          </div>
          <div className="text-xs text-gray-500">Above 80% utilization</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Ship className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Avg Efficiency</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(locationAnalyses.reduce((sum, l) => sum + l.efficiency, 0) / locationAnalyses.length).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Capacity utilization</div>
        </div>
      </div>

      {/* Main Content */}
      {selectedView === 'capacity' && renderCapacityView()}
      {selectedView === 'transit' && renderTransitView()}
      {selectedView === 'optimization' && renderOptimizationView()}
    </div>
  );
};

export default LocationCapacityPlanning;