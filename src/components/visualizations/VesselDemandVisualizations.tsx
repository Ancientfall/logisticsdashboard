import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, Legend, ReferenceLine, Cell } from 'recharts';
import { Ship, TrendingUp, MapPin, Calendar, Zap, Target } from 'lucide-react';
import { LocationDeliveryDemand, VesselCapability } from '../../utils/vesselRequirementCalculator';

interface VesselDemandVisualizationsProps {
  locationDemands: LocationDeliveryDemand[];
  vesselCapabilities: VesselCapability[];
  totalMonthlyDemand: number;
  averageVesselCapability: number;
  currentFleetSize: number;
  requiredVessels: number;
  averageDrillingDemand?: number;
  averageProductionDemand?: number;
}

const VesselDemandVisualizations: React.FC<VesselDemandVisualizationsProps> = ({
  locationDemands,
  vesselCapabilities,
  totalMonthlyDemand,
  averageVesselCapability,
  currentFleetSize,
  requiredVessels,
  averageDrillingDemand = 0,
  averageProductionDemand = 0
}) => {
  const [activeTab, setActiveTab] = useState<'demand' | 'capability' | 'comparison'>('demand');

  // Prepare month-over-month location demand data
  const monthlyDemandData = useMemo(() => {
    const allMonths = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // Get top 6 locations by total demand
    const topLocations = locationDemands
      .slice(0, 6)
      .map(loc => loc.location);

    return allMonths.map((month, index) => {
      const dataPoint: any = {
        month: monthLabels[index],
        fullMonth: month,
        total: 0
      };

      // Add each location's demand for this month
      topLocations.forEach(location => {
        const locationData = locationDemands.find(ld => ld.location === location);
        const monthlyValue = locationData?.monthlyBreakdown[month] || 0;
        dataPoint[location] = monthlyValue;
        dataPoint.total += monthlyValue;
      });

      return dataPoint;
    });
  }, [locationDemands]);

  // Prepare vessel capability data
  const vesselCapabilityData = useMemo(() => {
    const allMonths = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // Get top 6 vessels by capability
    const topVessels = vesselCapabilities
      .slice(0, 6)
      .map(vc => vc.vesselName);

    return allMonths.map((month, index) => {
      const dataPoint: any = {
        month: monthLabels[index],
        fullMonth: month,
        fleetTotal: 0,
        targetCapability: totalMonthlyDemand
      };

      // Add each vessel's capability for this month
      topVessels.forEach(vesselName => {
        const vesselData = vesselCapabilities.find(vc => vc.vesselName === vesselName);
        const monthlyValue = vesselData?.monthlyBreakdown[month] || 0;
        dataPoint[vesselName] = monthlyValue;
        dataPoint.fleetTotal += monthlyValue;
      });

      return dataPoint;
    });
  }, [vesselCapabilities, totalMonthlyDemand]);

  // Prepare demand vs capability comparison data
  const comparisonData = useMemo(() => {
    const allMonths = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return allMonths.map((month, index) => {
      // Calculate total demand for this month
      const totalDemand = locationDemands.reduce((sum, location) => {
        return sum + (location.monthlyBreakdown[month] || 0);
      }, 0);

      // Calculate total capability for this month
      const totalCapability = vesselCapabilities.reduce((sum, vessel) => {
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
  }, [locationDemands, vesselCapabilities]);

  // Color schemes
  const locationColors = ['#00754F', '#6EC800', '#1E90FF', '#FF6B35', '#8E44AD', '#F39C12'];
  const vesselColors = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#EA580C', '#0891B2'];

  const renderLocationDemandChart = () => (
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
          <AreaChart data={monthlyDemandData}>
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
            {locationDemands.slice(0, 6).map((location, index) => (
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
              <Target className="w-5 h-5 text-green-600" />
              Demand Classification
            </h4>
            <p className="text-sm text-gray-600">Drilling vs Production demand analysis</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={comparisonData}>
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
  );

  const renderVesselCapabilityChart = () => (
    <div className="space-y-6">
      {/* Vessel Capability Trends */}
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
            Fleet Average: {averageVesselCapability.toFixed(1)} deliveries/month
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={vesselCapabilityData}>
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
              y={averageVesselCapability} 
              stroke="#374151" 
              strokeWidth={2}
              strokeDasharray="6 3" 
              label={{ value: "Fleet Average", position: "top", fill: "#374151", fontWeight: "600", fontSize: 11 }}
            />
            {vesselCapabilities.slice(0, 6).map((vessel, index) => (
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
          {vesselCapabilities.slice(0, 8).map((vessel) => (
            <React.Fragment key={vessel.vesselName}>
              <div className="p-2 font-medium text-gray-800" title={vessel.vesselName}>
                {vessel.vesselName}
              </div>
              {['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'].map(month => {
                const value = vessel.monthlyBreakdown[month] || 0;
                const intensity = value > 0 ? Math.min(1, value / (averageVesselCapability * 1.5)) : 0;
                
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
  );

  const renderComparisonChart = () => (
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
          <BarChart data={comparisonData}>
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
            <ReferenceLine y={totalMonthlyDemand} stroke="#6B7280" strokeDasharray="5 5" />
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
          <BarChart data={comparisonData} margin={{ top: 20 }}>
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
                  const monthData = comparisonData.find(d => d.month === label);
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
                                {Math.ceil(monthData.fleetShortfall / averageVesselCapability)} vessel{Math.ceil(monthData.fleetShortfall / averageVesselCapability) !== 1 ? 's' : ''}
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
            {comparisonData.map((monthData, index) => {
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
          {comparisonData.map((monthData) => {
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
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'demand', label: 'Location Demand', icon: MapPin },
              { id: 'capability', label: 'Vessel Capability', icon: Ship },
              { id: 'comparison', label: 'Demand vs Capability', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'demand' && renderLocationDemandChart()}
      {activeTab === 'capability' && renderVesselCapabilityChart()}
      {activeTab === 'comparison' && renderComparisonChart()}
    </div>
  );
};

export default VesselDemandVisualizations;