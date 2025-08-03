import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Ship, Anchor, TrendingUp, MapPin, Zap, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, Legend, ReferenceLine } from 'recharts';
import KPICard from './KPICard';
import StatusDashboard from './StatusDashboard';
import { 
  calculateVesselRequirements, 
  VesselRequirementResult
} from '../../utils/vesselRequirementCalculator';

interface VesselRequirementDashboardProps {
  className?: string;
  onNavigateToUpload?: () => void;
}

// Core fleet baseline - BP's standard operational fleet (now included in current fleet count)
const CORE_FLEET_BASELINE = 9;

const VesselRequirementDashboard: React.FC<VesselRequirementDashboardProps> = ({ className, onNavigateToUpload }) => {
  const { voyageList, vesselManifests, costAllocation, isDataReady } = useData();
  const [summary, setSummary] = useState<VesselRequirementResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate vessel requirements when data is available
  useEffect(() => {
    if (isDataReady && voyageList.length > 0 && vesselManifests.length > 0) {
      setIsCalculating(true);
      try {
        // New calculator uses fixed Jan-Jun 2025 period with cost allocation cross-reference
        const result = calculateVesselRequirements(voyageList, vesselManifests, costAllocation);
        setSummary(result);
      } catch (error) {
        console.error('Error calculating vessel requirements:', error);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [voyageList, vesselManifests, costAllocation, isDataReady]);

  // Prepare visualization data
  const visualizationData = useMemo(() => {
    if (!summary) return null;

    // Prepare month-over-month location demand data
    const allMonths = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    const monthlyDemandData = allMonths.map((month, index) => {
      const dataPoint: any = {
        month: monthLabels[index],
        fullMonth: month,
        total: 0
      };

      // Add each location's demand for this month (top 6 locations)
      summary.locationDemands.slice(0, 6).forEach(location => {
        const monthlyValue = location.monthlyBreakdown[month] || 0;
        dataPoint[location.location] = monthlyValue;
        dataPoint.total += monthlyValue;
      });

      return dataPoint;
    });

    // Prepare vessel capability data
    const vesselCapabilityData = allMonths.map((month, index) => {
      const dataPoint: any = {
        month: monthLabels[index],
        fullMonth: month,
        fleetTotal: 0,
        targetCapability: summary.totalMonthlyDeliveryDemand
      };

      // Add each vessel's capability for this month (top 6 vessels)
      summary.vesselCapabilities.slice(0, 6).forEach(vessel => {
        const monthlyValue = vessel.monthlyBreakdown[month] || 0;
        dataPoint[vessel.vesselName] = monthlyValue;
        dataPoint.fleetTotal += monthlyValue;
      });

      return dataPoint;
    });

    // Prepare demand vs capability comparison data
    const comparisonData = allMonths.map((month, index) => {
      // Calculate total demand for this month
      const totalDemand = summary.locationDemands.reduce((sum, location) => {
        return sum + (location.monthlyBreakdown[month] || 0);
      }, 0);

      // Calculate total capability for this month
      const totalCapability = summary.vesselCapabilities.reduce((sum, vessel) => {
        return sum + (vessel.monthlyBreakdown[month] || 0);
      }, 0);

      // Calculate drilling vs production split
      const drillingDemand = totalDemand * 0.6; // Estimated 60% drilling
      const productionDemand = totalDemand * 0.4; // Estimated 40% production

      // Calculate capacity buffer or shortfall
      const capacityBuffer = Math.max(0, totalCapability - totalDemand);
      const fleetShortfall = Math.max(0, totalDemand - totalCapability);
      const isOverCapacity = totalDemand > totalCapability;

      return {
        month: monthLabels[index],
        fullMonth: month,
        totalDemand,
        totalCapability,
        capacityBuffer,
        fleetShortfall,
        isOverCapacity,
        drillingDemand,
        productionDemand,
        utilizationRate: totalCapability > 0 ? (totalDemand / totalCapability) * 100 : 0,
        gap: totalDemand - totalCapability
      };
    });

    return {
      monthlyDemandData,
      vesselCapabilityData,
      comparisonData
    };
  }, [summary]);

  // Color schemes for charts
  const locationColors = ['#00754F', '#6EC800', '#1E90FF', '#FF6B35', '#8E44AD', '#F39C12'];
  const vesselColors = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#EA580C', '#0891B2'];

  // Loading state
  if (!isDataReady || isCalculating) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Vessel Requirements</h3>
          <p className="text-gray-600">Analyzing vessel capacity and demand patterns...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Ship className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-600">No vessel requirement data available for the selected filters.</p>
        </div>
      </div>
    );
  }

  // Calculate metrics for KPI cards using new interface
  const baselineGap = summary.requiredVessels - CORE_FLEET_BASELINE;
  const utilizationRate = summary.utilizationPercentage;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Simple Header - No Status Dashboard */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Ship className="w-8 h-8 text-blue-600" />
                Vessel Requirements Analysis
              </h1>
              <p className="text-gray-600 mt-2">Data-driven fleet sizing based on operational demand and manifest patterns</p>
            </div>
          </div>
        </div>

        {/* Fleet Size Comparison - Visual Overview */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Fleet Size Analysis</h3>
              <p className="text-sm text-gray-600">
                Data-driven fleet sizing using {summary.analysisDateRange.startDate} to {summary.analysisDateRange.endDate} operational data
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Core Baseline: {CORE_FLEET_BASELINE} vessels</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Current Fleet"
              value={summary.currentVessels}
              unit="vessels"
              color="blue"
              variant="secondary"
              contextualHelp="Total current fleet: 9 core OSV vessels + active PSV/OSV vessels from voyage data (Fast vessels excluded)."
            />
            
            <KPICard
              title="Core Baseline"
              value={CORE_FLEET_BASELINE}
              unit="vessels"
              color="green"
              variant="secondary"
              contextualHelp="BP's standard operational fleet size for GoA operations. Used as reference point for capacity planning."
            />
            
            <KPICard
              title="Recommended"
              value={summary.requiredVessels}
              unit="vessels"
              color={baselineGap > 0 ? "orange" : baselineGap < 0 ? "blue" : "green"}
              trend={baselineGap !== 0 ? ((baselineGap / CORE_FLEET_BASELINE) * 100) : 0}
              isPositive={baselineGap <= 0}
              variant="secondary"
              contextualHelp={`BP formula: ${summary.totalMonthlyDeliveryDemand.toFixed(2)} demand/month × 9 locations - 0.5 operator sharing = ${summary.requiredVessels} vessels. ${baselineGap > 0 ? `${baselineGap} vessels above baseline` : baselineGap < 0 ? `${Math.abs(baselineGap)} vessels below baseline` : 'Matches baseline'}.`}
            />
          </div>

          {/* Gap Analysis Summary */}
          <div className={`mt-6 p-4 rounded-lg ${
            baselineGap > 0 ? 'bg-orange-50 border border-orange-200' : 
            baselineGap < 0 ? 'bg-blue-50 border border-blue-200' : 
            'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                baselineGap > 0 ? 'bg-orange-100' : 
                baselineGap < 0 ? 'bg-blue-100' : 
                'bg-green-100'
              }`}>
                <TrendingUp className={`w-4 h-4 ${
                  baselineGap > 0 ? 'text-orange-600' : 
                  baselineGap < 0 ? 'text-blue-600' : 
                  'text-green-600'
                }`} />
              </div>
              <div>
                <h4 className={`font-semibold ${
                  baselineGap > 0 ? 'text-orange-700' : 
                  baselineGap < 0 ? 'text-blue-700' : 
                  'text-green-700'
                }`}>
                  {baselineGap > 0 ? 'Additional Capacity Needed' : 
                   baselineGap < 0 ? 'Potential Overcapacity' : 
                   'Optimal Fleet Size'}
                </h4>
                <p className="text-sm text-gray-600">
                  {baselineGap > 0 ? `Recommend adding ${baselineGap.toFixed(1)} vessel${baselineGap > 1 ? 's' : ''} to meet operational demand` : 
                   baselineGap < 0 ? `Current fleet may be ${Math.abs(baselineGap).toFixed(1)} vessel${Math.abs(baselineGap) > 1 ? 's' : ''} above requirement` : 
                   'Current recommended fleet size aligns with baseline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            title="Total Offshore Demand per Month"
            value={summary.totalMonthlyDeliveryDemand}
            subtitle="Average deliveries per location-month"
            color="blue"
            variant="secondary"
            contextualHelp={`Average monthly offshore demand calculated from all location-month delivery records during ${summary.analysisDateRange.startDate} to ${summary.analysisDateRange.endDate}.`}
          />

          <KPICard
            title="Vessel Capability"
            value={summary.averageVesselCapability}
            subtitle="Port calls per vessel/month"
            color="green"
            variant="secondary"
            contextualHelp={`Average monthly port call capability per vessel. Based on analysis of ${summary.totalActiveVessels} active vessels during the analysis period.`}
          />

          <KPICard
            title="Fleet Utilization"
            value={`${summary.utilizationPercentage}%`}
            subtitle="System demand vs capacity"
            color={summary.utilizationPercentage > 100 ? "red" : summary.utilizationPercentage > 85 ? "orange" : "green"}
            variant="secondary"
            contextualHelp={`Fleet utilization shows total system demand vs fleet capacity. ${summary.utilizationPercentage}% means ${summary.utilizationPercentage > 100 ? 'demand exceeds capacity - fleet is over-utilized' : 'fleet can handle current demand'}.`}
          />

          <KPICard
            title="Active Vessels"
            value={summary.totalActiveVessels}
            subtitle="PSV/OSV vessels tracked"
            color="purple"
            variant="secondary"
            contextualHelp={`Total current fleet: 9 core OSV vessels + ${summary.totalActiveVessels} additional active PSV/OSV vessels from voyage data (Fast vessels excluded).`}
          />
        </div>

        {/* Location Demand Analysis */}
        {visualizationData && (
          <div className="space-y-6">
            {/* Month-over-Month Stacked Area Chart */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Location Demand Trends
                  </h4>
                  <p className="text-sm text-gray-600">Monthly delivery demand by offshore location (top 6 locations)</p>
                </div>
                <div className="text-sm text-gray-600">
                  Stacked by individual locations
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={visualizationData.monthlyDemandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    label={{ value: 'Deliveries', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  {summary.locationDemands.slice(0, 6).map((location, index) => (
                    <Area
                      key={location.location}
                      type="monotone"
                      dataKey={location.location}
                      stackId="1"
                      stroke={locationColors[index]}
                      fill={locationColors[index]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Drilling vs Production Demand Split */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Demand Classification
                  </h4>
                  <p className="text-sm text-gray-600">Drilling vs Production demand analysis</p>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={visualizationData.comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    label={{ value: 'Deliveries', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(1)} deliveries`,
                      name // Use the name directly from the Area component
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="drillingDemand"
                    stackId="1"
                    stroke="#00754F"
                    fill="#00754F"
                    fillOpacity={0.8}
                    name="Drilling Demand"
                  />
                  <Area
                    type="monotone"
                    dataKey="productionDemand"
                    stackId="1"
                    stroke="#6EC800"
                    fill="#6EC800"
                    fillOpacity={0.8}
                    name="Production Demand"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Vessel Capability Analysis */}
        {visualizationData && (
          <div className="space-y-6">
            {/* Vessel Performance Trends */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Ship className="w-5 h-5 text-purple-600" />
                    Vessel Performance Trends
                  </h4>
                  <p className="text-sm text-gray-600">Monthly delivery capability by vessel</p>
                </div>
                <div className="text-sm text-gray-600">
                  Fleet Average: {summary.averageVesselCapability.toFixed(1)} deliveries/month
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visualizationData.vesselCapabilityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    label={{ value: 'Port Calls', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <ReferenceLine 
                    y={summary.averageVesselCapability} 
                    stroke="#374151" 
                    strokeWidth={2}
                    strokeDasharray="6 3" 
                    label={{ value: "Fleet Average", position: "top", fill: "#374151", fontWeight: "600", fontSize: 11 }}
                  />
                  {summary.vesselCapabilities.slice(0, 6).map((vessel, index) => (
                    <Line
                      key={vessel.vesselName}
                      type="monotone"
                      dataKey={vessel.vesselName}
                      stroke={vesselColors[index]}
                      strokeWidth={2}
                      dot={{ r: 4, fill: vesselColors[index] }}
                      activeDot={{ r: 6, fill: vesselColors[index] }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Fleet Capability Heatmap */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-600" />
                    Fleet Capability Matrix
                  </h4>
                  <p className="text-sm text-gray-600">Vessel performance by month (heat intensity = capability)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-400 rounded"></div>
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>High</span>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: '180px repeat(6, 1fr)' }}>
                {/* Header */}
                <div className="font-semibold text-gray-700 p-2">Vessel</div>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(month => (
                  <div key={month} className="font-semibold text-gray-700 p-2 text-center">{month}</div>
                ))}
                
                {/* Data rows */}
                {summary.vesselCapabilities.slice(0, 8).map((vessel) => (
                  <React.Fragment key={vessel.vesselName}>
                    <div className="p-2 font-medium text-gray-800" title={vessel.vesselName}>
                      {vessel.vesselName}
                    </div>
                    {['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'].map(month => {
                      const value = vessel.monthlyBreakdown[month] || 0;
                      const intensity = value > 0 ? Math.min(1, value / (summary.averageVesselCapability * 1.5)) : 0;
                      
                      // Fire-based heat map colors: Gray -> Yellow -> Orange -> Red
                      let bgColor = 'rgba(229, 231, 235, 0.5)'; // Default gray for no data
                      let textColor = 'text-gray-600';
                      
                      if (value > 0) {
                        if (intensity <= 0.25) {
                          // Low intensity: Light yellow
                          bgColor = `rgba(254, 240, 138, ${0.4 + intensity * 2})`;
                          textColor = 'text-yellow-800';
                        } else if (intensity <= 0.5) {
                          // Medium-low intensity: Yellow to orange
                          bgColor = `rgba(251, 191, 36, ${0.5 + intensity})`;
                          textColor = 'text-orange-900';
                        } else if (intensity <= 0.75) {
                          // Medium-high intensity: Orange
                          bgColor = `rgba(249, 115, 22, ${0.6 + intensity * 0.4})`;
                          textColor = 'text-white';
                        } else {
                          // High intensity: Red
                          bgColor = `rgba(220, 38, 38, ${0.7 + intensity * 0.3})`;
                          textColor = 'text-white';
                        }
                      }
                      
                      return (
                        <div 
                          key={month} 
                          className={`p-2 text-center rounded font-medium ${textColor}`}
                          style={{ backgroundColor: bgColor }}
                          title={`${vessel.vesselName} - ${month}: ${value} deliveries (${intensity > 0.75 ? 'High' : intensity > 0.5 ? 'Medium-High' : intensity > 0.25 ? 'Medium' : intensity > 0 ? 'Low' : 'None'} intensity)`}
                        >
                          {value > 0 ? value : '-'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demand vs Capability Analysis */}
        {visualizationData && (
          <div className="space-y-6">
            {/* Demand vs Capability Comparison */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Demand vs Capability Analysis
                  </h4>
                  <p className="text-sm text-gray-600">Monthly comparison of demand vs available capacity</p>
                </div>
                <div className="text-sm text-gray-600">
                  Target Utilization: 75%
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visualizationData.comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    label={{ value: 'Deliveries', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(1)} ${name === 'utilizationRate' ? '%' : 'deliveries'}`,
                      name === 'totalDemand' ? 'Total Demand' : 
                      name === 'totalCapability' ? 'Total Capability' : 'Utilization Rate'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalDemand" fill="#EF4444" name="Total Demand" />
                  <Bar dataKey="totalCapability" fill="#22C55E" name="Total Capability" />
                  <ReferenceLine y={summary.totalMonthlyDeliveryDemand} stroke="#6B7280" strokeDasharray="5 5" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Fleet Capacity vs Demand Analysis */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Fleet Capacity vs Demand Analysis
                  </h4>
                  <p className="text-sm text-gray-600">Side-by-side comparison of available fleet capacity vs operational demand</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>Fleet Capacity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Demand Required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-amber-600" style={{borderTop: '3px dashed #F59E0B'}}></div>
                    <span>Fleet Shortage Indicator</span>
                  </div>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visualizationData.comparisonData} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    label={{ value: 'Deliveries', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const monthData = visualizationData.comparisonData.find(d => d.month === label);
                        const capacityValue = payload.find(p => p.dataKey === 'totalCapability')?.value || 0;
                        const demandValue = payload.find(p => p.dataKey === 'totalDemand')?.value || 0;
                        
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-gray-800 mb-2">
                              {monthData?.isOverCapacity ? `${label} - FLEET SHORTAGE` : label}
                            </p>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  <span>Fleet Capacity:</span>
                                </div>
                                <span className="font-medium">{Number(capacityValue).toFixed(0)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span>Demand Required:</span>
                                </div>
                                <span className="font-medium">{Number(demandValue).toFixed(0)}</span>
                              </div>
                              {monthData?.isOverCapacity && (
                                <>
                                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-red-700 rounded-full"></div>
                                      <span className="font-bold text-red-700">Shortfall:</span>
                                    </div>
                                    <span className="font-bold text-red-700">{monthData.fleetShortfall.toFixed(0)} deliveries</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                                      <span className="font-bold text-amber-700">Additional vessels needed:</span>
                                    </div>
                                    <span className="font-bold text-amber-700">
                                      {Math.ceil(monthData.fleetShortfall / summary.averageVesselCapability)} vessel{Math.ceil(monthData.fleetShortfall / summary.averageVesselCapability) !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  
                  {/* Fleet capacity bar */}
                  <Bar dataKey="totalCapability" fill="#2563EB" name="Fleet Capacity" />
                  
                  {/* Demand required bar - simple approach */}
                  <Bar dataKey="totalDemand" fill="#EF4444" name="Demand Required" />
                  
                  {/* Add visual indicators for shortage months */}
                  {visualizationData.comparisonData.map((monthData, index) => {
                    if (monthData.isOverCapacity) {
                      return (
                        <ReferenceLine 
                          key={`shortage-indicator-${index}`}
                          x={monthData.month}
                          stroke="#F59E0B"
                          strokeWidth={3}
                          strokeDasharray="6 4"
                        />
                      );
                    }
                    return null;
                  })}
                </BarChart>
              </ResponsiveContainer>
              
              {/* Summary metrics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-3">
                {visualizationData.comparisonData.map((monthData) => {
                  const buffer = monthData.totalCapability - monthData.totalDemand;
                  const utilizationRate = monthData.totalCapability > 0 ? (monthData.totalDemand / monthData.totalCapability * 100) : 0;
                  const isShortfall = monthData.isOverCapacity;
                  
                  const status = isShortfall ? 'FLEET SHORTAGE' :
                                utilizationRate < 60 ? 'Under-utilized' : 
                                utilizationRate < 85 ? 'Well-balanced' : 
                                utilizationRate < 100 ? 'High utilization' : 'At capacity';
                  const statusColor = isShortfall ? 'text-red-600' :
                                     utilizationRate < 60 ? 'text-blue-600' : 
                                     utilizationRate < 85 ? 'text-green-600' : 
                                     utilizationRate < 100 ? 'text-yellow-600' : 'text-orange-600';
                  
                  const cardBgColor = isShortfall ? 'bg-red-50 border border-red-200' : 'bg-gray-50';
                  
                  return (
                    <div key={monthData.month} className={`${cardBgColor} rounded-lg p-3 text-center`}>
                      <div className="font-semibold text-gray-800 mb-1">{monthData.month}</div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span className="font-medium text-blue-600">{monthData.totalCapability.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Demand:</span>
                          <span className="font-medium text-red-600">{monthData.totalDemand.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          {isShortfall ? (
                            <>
                              <span>Shortfall:</span>
                              <span className="font-medium text-red-700">-{monthData.fleetShortfall.toFixed(0)}</span>
                            </>
                          ) : (
                            <>
                              <span>Buffer:</span>
                              <span className="font-medium text-green-600">+{buffer.toFixed(0)}</span>
                            </>
                          )}
                        </div>
                        <div className="pt-1 border-t border-gray-200">
                          <div className={`text-xs font-medium ${statusColor}`}>
                            {utilizationRate.toFixed(0)}% utilized
                          </div>
                          <div className={`text-xs font-bold ${statusColor}`}>
                            {status}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}




      </div>
    </div>
  );
};

export default VesselRequirementDashboard;