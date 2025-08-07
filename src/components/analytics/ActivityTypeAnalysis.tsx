/**
 * Activity Type Analysis Dashboard Component
 * 
 * Provides detailed breakdowns of vessel demand by activity type and location.
 * Shows activity-based demand patterns, location-specific requirements,
 * and strategic insights for operational planning.
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  MapPin,
  Activity,
  TrendingUp,
  Clock,
  Ship,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { ProcessedRigScheduleData } from '../../utils/processors/rigScheduleCSVProcessor';
import { getActivityProfile, RIG_ACTIVITY_PROFILES, BASE_RIG_DEMAND_RATE } from '../../utils/rigActivityDemandProfiles';
import { getLocationProfile, LOCATION_CAPABILITY_PROFILES } from '../../utils/locationVesselCapability';

interface ActivityTypeAnalysisProps {
  rigScheduleData: ProcessedRigScheduleData[];
  selectedScenario: string;
  className?: string;
}

interface ActivityAnalysis {
  activityType: string;
  totalActivities: number;
  averageDuration: number;
  totalDemand: number;
  demandPerActivity: number;
  locations: string[];
  rigs: string[];
  peakMonth: string;
  vesselRequirement: number;
}

interface LocationAnalysis {
  location: string;
  totalActivities: number;
  activityTypes: Record<string, number>;
  totalDemand: number;
  transitCategory: 'SHORT' | 'LONG';
  vesselCapability: number;
  utilizationRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

const ActivityTypeAnalysis: React.FC<ActivityTypeAnalysisProps> = ({
  rigScheduleData,
  selectedScenario,
  className = ""
}) => {
  const [activityAnalyses, setActivityAnalyses] = useState<ActivityAnalysis[]>([]);
  const [locationAnalyses, setLocationAnalyses] = useState<LocationAnalysis[]>([]);
  const [selectedView, setSelectedView] = useState<'activity' | 'location'>('activity');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (rigScheduleData.length > 0) {
      analyzeActivityTypes();
    }
  }, [rigScheduleData, selectedScenario]);

  /**
   * Analyze activity types and generate insights
   */
  const analyzeActivityTypes = async () => {
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

      // Analyze by activity type
      const activityStats: Record<string, {
        activities: any[];
        locations: Set<string>;
        rigs: Set<string>;
        totalDuration: number;
        monthlyDemand: Record<string, number>;
      }> = {};

      // Analyze by location
      const locationStats: Record<string, {
        activities: any[];
        activityTypes: Record<string, number>;
        totalDemand: number;
      }> = {};

      // Process each rig activity
      for (const activity of scenarioData.rigScheduleData) {
        const activityType = activity.rigActivityType;
        const location = activity.location;
        const duration = (new Date(activity.finishDate).getTime() - new Date(activity.startDate).getTime()) / (1000 * 60 * 60 * 24);
        const activityMonth = new Date(activity.startDate).toISOString().substring(0, 7);

        // Activity type analysis
        if (!activityStats[activityType]) {
          activityStats[activityType] = {
            activities: [],
            locations: new Set(),
            rigs: new Set(),
            totalDuration: 0,
            monthlyDemand: {}
          };
        }

        activityStats[activityType].activities.push(activity);
        activityStats[activityType].locations.add(location);
        activityStats[activityType].rigs.add(activity.rigName);
        activityStats[activityType].totalDuration += duration;

        // Calculate monthly demand contribution
        const activityProfile = getActivityProfile(activityType);
        const monthlyDemandContribution = BASE_RIG_DEMAND_RATE * activityProfile.demandFactor * Math.min(duration / 30, 1.0);
        activityStats[activityType].monthlyDemand[activityMonth] = 
          (activityStats[activityType].monthlyDemand[activityMonth] || 0) + monthlyDemandContribution;

        // Location analysis
        if (!locationStats[location]) {
          locationStats[location] = {
            activities: [],
            activityTypes: {},
            totalDemand: 0
          };
        }

        locationStats[location].activities.push(activity);
        locationStats[location].activityTypes[activityType] = 
          (locationStats[location].activityTypes[activityType] || 0) + 1;
        locationStats[location].totalDemand += monthlyDemandContribution;
      }

      // Generate activity analyses
      const activities: ActivityAnalysis[] = Object.entries(activityStats).map(([activityType, stats]) => {
        const totalDemand = Object.values(stats.monthlyDemand).reduce((sum, d) => sum + d, 0);
        const peakMonth = Object.entries(stats.monthlyDemand)
          .reduce((max, [month, demand]) => demand > max.demand ? { month, demand } : max, 
                  { month: '', demand: 0 }).month;

        const averageDemandPerMonth = totalDemand / Object.keys(stats.monthlyDemand).length;
        const vesselRequirement = Math.ceil(averageDemandPerMonth / 6.5); // Assuming average vessel capability

        return {
          activityType,
          totalActivities: stats.activities.length,
          averageDuration: stats.totalDuration / stats.activities.length,
          totalDemand,
          demandPerActivity: totalDemand / stats.activities.length,
          locations: Array.from(stats.locations),
          rigs: Array.from(stats.rigs),
          peakMonth,
          vesselRequirement
        };
      });

      // Generate location analyses
      const locations: LocationAnalysis[] = Object.entries(locationStats).map(([location, stats]) => {
        const locationProfile = getLocationProfile(location);
        const vesselCapability = locationProfile.vesselDeliveriesPerMonth;
        const utilizationRate = stats.totalDemand / vesselCapability;

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (utilizationRate > 0.8) riskLevel = 'high';
        else if (utilizationRate > 0.6) riskLevel = 'medium';

        return {
          location,
          totalActivities: stats.activities.length,
          activityTypes: stats.activityTypes,
          totalDemand: stats.totalDemand,
          transitCategory: locationProfile.transitCategory,
          vesselCapability,
          utilizationRate,
          riskLevel
        };
      });

      // Sort by demand/activity count
      activities.sort((a, b) => b.totalDemand - a.totalDemand);
      locations.sort((a, b) => b.totalActivities - a.totalActivities);

      setActivityAnalyses(activities);
      setLocationAnalyses(locations);

      console.log(`✅ Activity analysis completed: ${activities.length} activity types, ${locations.length} locations`);
      console.log(`📊 Top activity by demand: ${activities[0]?.activityType} (${activities[0]?.totalDemand.toFixed(1)} deliveries)`);
      console.log(`📍 Top location by activities: ${locations[0]?.location} (${locations[0]?.totalActivities} activities)`);

    } catch (error) {
      console.error('❌ Error analyzing activity types:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Render activity type breakdown
   */
  const renderActivityTypeView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activityAnalyses.slice(0, 6).map((analysis, index) => (
          <div key={analysis.activityType} className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 text-sm">
                {RIG_ACTIVITY_PROFILES[analysis.activityType]?.name || analysis.activityType}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                index < 2 ? 'bg-red-100 text-red-800' : 
                index < 4 ? 'bg-yellow-100 text-yellow-800' : 
                'bg-green-100 text-green-800'
              }`}>
                #{index + 1}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Activities:</span>
                <span className="font-medium">{analysis.totalActivities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Demand:</span>
                <span className="font-medium">{analysis.totalDemand.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Duration:</span>
                <span className="font-medium">{analysis.averageDuration.toFixed(0)}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vessels Req:</span>
                <span className="font-medium">{analysis.vesselRequirement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Locations:</span>
                <span className="font-medium">{analysis.locations.length}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Peak: {analysis.peakMonth}
              </div>
              <div className="text-xs text-gray-500">
                Rigs: {analysis.rigs.length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Type Demand Profile */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Activity Type Demand Profile
        </h3>
        <div className="space-y-3">
          {activityAnalyses.map((analysis, index) => {
            const maxDemand = Math.max(...activityAnalyses.map(a => a.totalDemand));
            const widthPercent = (analysis.totalDemand / maxDemand) * 100;
            
            return (
              <div key={analysis.activityType} className="flex items-center space-x-3">
                <div className="w-20 text-sm font-medium text-gray-700 truncate">
                  {analysis.activityType}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        index < 3 ? 'bg-blue-500' : 
                        index < 6 ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {analysis.totalDemand.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /**
   * Render location-based breakdown
   */
  const renderLocationView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationAnalyses.slice(0, 6).map((analysis) => (
          <div key={analysis.location} className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {analysis.location}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                analysis.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                analysis.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {analysis.transitCategory}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Activities:</span>
                <span className="font-medium">{analysis.totalActivities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Demand:</span>
                <span className="font-medium">{analysis.totalDemand.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capability:</span>
                <span className="font-medium">{analysis.vesselCapability.toFixed(1)}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilization:</span>
                <span className={`font-medium ${
                  analysis.utilizationRate > 0.8 ? 'text-red-600' :
                  analysis.utilizationRate > 0.6 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {(analysis.utilizationRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Activity Types: {Object.keys(analysis.activityTypes).length}
              </div>
              <div className="text-xs text-gray-500">
                Risk Level: {analysis.riskLevel}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Location Utilization Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Location Utilization Analysis
        </h3>
        <div className="space-y-3">
          {locationAnalyses.map((analysis) => {
            const utilizationPercent = analysis.utilizationRate * 100;
            
            return (
              <div key={analysis.location} className="flex items-center space-x-3">
                <div className="w-24 text-sm font-medium text-gray-700 truncate">
                  {analysis.location.split('.').pop() || analysis.location}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        utilizationPercent > 80 ? 'bg-red-500' :
                        utilizationPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {utilizationPercent.toFixed(1)}%
                </div>
                <div className={`w-4 h-4 ${
                  analysis.transitCategory === 'LONG' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {analysis.transitCategory === 'LONG' ? 
                    <Clock className="w-4 h-4" /> : 
                    <CheckCircle className="w-4 h-4" />
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isAnalyzing) {
    return (
      <div className={`bg-white p-8 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <Activity className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Analyzing activity types and locations...</span>
        </div>
      </div>
    );
  }

  if (activityAnalyses.length === 0 && locationAnalyses.length === 0) {
    return (
      <div className={`bg-white p-8 rounded-lg border border-gray-200 ${className}`}>
        <div className="text-center text-gray-600">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No activity or location data available for analysis.</p>
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
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Activity Type Analysis</h2>
              <p className="text-gray-600">Breakdown by activity type and location ({selectedScenario.toUpperCase()} Case)</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setSelectedView('activity')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'activity' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            By Activity Type
          </button>
          <button
            onClick={() => setSelectedView('location')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'location' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            By Location
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Activity Types</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{activityAnalyses.length}</div>
          <div className="text-xs text-gray-500">Distinct activity types</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Locations</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{locationAnalyses.length}</div>
          <div className="text-xs text-gray-500">Active locations</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <Ship className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Total Demand</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {activityAnalyses.reduce((sum, a) => sum + a.totalDemand, 0).toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">Deliveries required</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">High Risk</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {locationAnalyses.filter(l => l.riskLevel === 'high').length}
          </div>
          <div className="text-xs text-gray-500">High utilization locations</div>
        </div>
      </div>

      {/* Main Content */}
      {selectedView === 'activity' ? renderActivityTypeView() : renderLocationView()}
    </div>
  );
};

export default ActivityTypeAnalysis;