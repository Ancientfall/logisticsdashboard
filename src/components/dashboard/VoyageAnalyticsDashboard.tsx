import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';

interface VoyageAnalyticsDashboardProps {
  onNavigateToUpload?: () => void;
}

const VoyageAnalyticsDashboard: React.FC<VoyageAnalyticsDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageList, 
    // voyageEvents, // Available for future cross-table analysis
    // vesselManifests, // Available for future cargo analysis
    isDataReady
  } = useData();

  // Filters state
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedVoyagePurpose: 'All Purposes',
    selectedVesselType: 'All Vessels'
  });

  // Calculate voyage analytics directly from data
  const voyageAnalytics = useMemo(() => {
    if (!voyageList || voyageList.length === 0) {
      return null;
    }

    // Filter data based on selected filters
    const filterByDate = (date: Date) => {
      if (filters.selectedMonth === 'All Months') return true;
      const itemDate = new Date(date);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    };

    const filteredVoyages = voyageList.filter(voyage => 
      filterByDate(voyage.voyageDate) &&
      (filters.selectedVoyagePurpose === 'All Purposes' || voyage.voyagePurpose === filters.selectedVoyagePurpose)
    );

    // Calculate basic voyage metrics
    const totalVoyages = filteredVoyages.length;
    const totalDurationHours = filteredVoyages.reduce((sum, voyage) => sum + (voyage.durationHours || 0), 0);
    const averageVoyageDuration = totalVoyages > 0 ? totalDurationHours / totalVoyages : 0;
    
    // Purpose distribution
    const voyagePurposeDistribution = filteredVoyages.reduce((dist, voyage) => {
      const purpose = voyage.voyagePurpose || 'Other';
      dist[purpose] = (dist[purpose] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const drillingVoyages = voyagePurposeDistribution['Drilling'] || 0;
    const drillingVoyagePercentage = totalVoyages > 0 ? (drillingVoyages / totalVoyages) * 100 : 0;
    const mixedVoyageEfficiency = totalVoyages > 0 ? ((voyagePurposeDistribution['Mixed'] || 0) / totalVoyages) * 100 : 0;

    // Route complexity
    const totalStops = filteredVoyages.reduce((sum, voyage) => sum + voyage.stopCount, 0);
    const averageStopsPerVoyage = totalVoyages > 0 ? totalStops / totalVoyages : 0;
    const multiStopVoyages = filteredVoyages.filter(voyage => voyage.stopCount > 2).length;
    const multiStopPercentage = totalVoyages > 0 ? (multiStopVoyages / totalVoyages) * 100 : 0;
    const routeEfficiencyScore = averageVoyageDuration > 0 ? averageStopsPerVoyage / (averageVoyageDuration / 24) : 0;

    // Vessel utilization
    const uniqueVessels = new Set(filteredVoyages.map(voyage => voyage.vessel));
    const activeVesselsThisMonth = uniqueVessels.size;
    const voyagesPerVessel = activeVesselsThisMonth > 0 ? totalVoyages / activeVesselsThisMonth : 0;

    // Origin analysis
    const fourchonDepartures = filteredVoyages.filter(voyage => 
      voyage.originPort === 'Fourchon' || 
      voyage.locations.toLowerCase().includes('fourchon') ||
      (voyage.locationList.length > 0 && voyage.locationList[0].toLowerCase().includes('fourchon'))
    ).length;
    const routeConcentration = totalVoyages > 0 ? (fourchonDepartures / totalVoyages) * 100 : 0;

    // Popular destinations
    const destinationCounts = filteredVoyages.reduce((counts, voyage) => {
      const destination = voyage.mainDestination || 'Unknown';
      counts[destination] = (counts[destination] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const popularDestinations = Object.entries(destinationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count, percentage: (count / totalVoyages) * 100 }));

    // Calculate additional analytics for charts
    const routeComplexityData = [
      { name: 'Simple Routes (≤2 stops)', value: filteredVoyages.filter(v => v.stopCount <= 2).length, color: 'bg-green-500' },
      { name: 'Medium Routes (3 stops)', value: filteredVoyages.filter(v => v.stopCount === 3).length, color: 'bg-yellow-500' },
      { name: 'Complex Routes (≥4 stops)', value: filteredVoyages.filter(v => v.stopCount >= 4).length, color: 'bg-red-500' }
    ];

    const purposeDistributionData = Object.entries(voyagePurposeDistribution).map(([purpose, count]) => ({
      name: purpose,
      value: count,
      percentage: totalVoyages > 0 ? (count / totalVoyages) * 100 : 0
    }));

    const durationDistributionData = [
      { name: '< 24 hours', value: filteredVoyages.filter(v => (v.durationHours || 0) < 24).length, color: 'bg-blue-500' },
      { name: '24-48 hours', value: filteredVoyages.filter(v => (v.durationHours || 0) >= 24 && (v.durationHours || 0) < 48).length, color: 'bg-purple-500' },
      { name: '48-72 hours', value: filteredVoyages.filter(v => (v.durationHours || 0) >= 48 && (v.durationHours || 0) < 72).length, color: 'bg-orange-500' },
      { name: '> 72 hours', value: filteredVoyages.filter(v => (v.durationHours || 0) >= 72).length, color: 'bg-red-500' }
    ];

    return {
      totalVoyages,
      averageVoyageDuration,
      avgVoyageDurationMoMChange: 0, // Would need historical data
      drillingVoyagePercentage,
      mixedVoyageEfficiency,
      averageStopsPerVoyage,
      multiStopPercentage,
      routeEfficiencyScore,
      activeVesselsThisMonth,
      voyagesPerVessel,
      routeConcentration,
      onTimeVoyagePercentage: 85, // Mock value
      averageExecutionEfficiency: 0.92, // Mock value
      consolidationBenefit: 2.3, // Mock value
      peakSeasonIndicator: "📊 Normal",
      voyagePurposeDistribution,
      popularDestinations,
      filteredVoyages,
      routeComplexityData,
      purposeDistributionData,
      durationDistributionData
    };
  }, [voyageList, filters]);

  // Get filter options
  const filterOptions = useMemo(() => {
    const monthMap = new Map<string, string>();
    
    voyageList.forEach(voyage => {
      if (voyage.voyageDate) {
        const date = new Date(voyage.voyageDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'long' });
        const label = `${monthName} ${date.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });
    
    const months = ['All Months', ...Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value))
      .map(item => item.label)];
    
    const purposes = ['All Purposes', ...new Set(voyageList.map(v => v.voyagePurpose))];
    const vesselTypes = ['All Vessels', ...new Set(voyageList.map(v => v.vessel))];

    return { months, purposes, vesselTypes };
  }, [voyageList]);

  if (!isDataReady || !voyageAnalytics) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voyage analytics data...</p>
        </div>
      </div>
    );
  }

  const KPICard: React.FC<{
    title: string;
    value: string | number;
    trend?: number | null;
    isPositive?: boolean | null;
    unit?: string;
    subtitle?: string;
  }> = ({ title, value, trend, isPositive, unit, subtitle }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
          <div className="flex items-baseline gap-1">
            {trend !== null && trend !== undefined && (
              <div className="flex items-center gap-1 mr-2">
                {isPositive ? (
                  <svg className="w-3 h-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900">
            {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">VOYAGE ANALYTICS</h2>
          <p className="text-lg text-gray-600 font-medium">STRATEGIC ROUTE PLANNING & EXECUTION</p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Upload
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">MONTH</label>
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent min-w-[120px]"
              value={filters.selectedMonth}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
            >
              {filterOptions.months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">PURPOSE</label>
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent min-w-[120px]"
              value={filters.selectedVoyagePurpose}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedVoyagePurpose: e.target.value }))}
            >
              {filterOptions.purposes.map(purpose => (
                <option key={purpose} value={purpose}>{purpose}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {voyageAnalytics.peakSeasonIndicator}
        </div>
      </div>

      {/* Core Voyage KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <KPICard 
          title="Total Voyages" 
          value={voyageAnalytics.totalVoyages}
          subtitle="This Month"
        />
        <KPICard 
          title="Avg Duration" 
          value={voyageAnalytics.averageVoyageDuration.toFixed(1)}
          unit="hours"
          trend={voyageAnalytics.avgVoyageDurationMoMChange}
          isPositive={voyageAnalytics.avgVoyageDurationMoMChange < 0} // Shorter is better
        />
        <KPICard 
          title="Active Vessels" 
          value={voyageAnalytics.activeVesselsThisMonth}
          subtitle="Unique vessels"
        />
        <KPICard 
          title="Voyages/Vessel" 
          value={voyageAnalytics.voyagesPerVessel.toFixed(1)}
          subtitle="Utilization rate"
        />
        <KPICard 
          title="Multi-Stop %" 
          value={voyageAnalytics.multiStopPercentage.toFixed(1)}
          unit="%"
          subtitle="≥3 stops"
        />
        <KPICard 
          title="On-Time %" 
          value={voyageAnalytics.onTimeVoyagePercentage.toFixed(1)}
          unit="%"
          subtitle="±2 hours"
        />
      </div>

      {/* Route Performance KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard 
          title="Route Efficiency" 
          value={voyageAnalytics.routeEfficiencyScore.toFixed(2)}
          subtitle="Stops per day"
        />
        <KPICard 
          title="Drilling Voyages" 
          value={voyageAnalytics.drillingVoyagePercentage.toFixed(1)}
          unit="%"
          subtitle="Purpose distribution"
        />
        <KPICard 
          title="Mixed Efficiency" 
          value={voyageAnalytics.mixedVoyageEfficiency.toFixed(1)}
          unit="%"
          subtitle="Multi-purpose trips"
        />
        <KPICard 
          title="Fourchon Routes" 
          value={voyageAnalytics.routeConcentration.toFixed(1)}
          unit="%"
          subtitle="Origin concentration"
        />
        <KPICard 
          title="Consolidation Benefit" 
          value={voyageAnalytics.consolidationBenefit.toFixed(2)}
          subtitle="Tons/hour gain"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voyage Purpose Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Voyage Purpose Distribution</h3>
            <div className="text-sm text-gray-500">OPERATIONAL FOCUS</div>
          </div>
          <div className="h-64">
            {voyageAnalytics.purposeDistributionData.length > 0 ? (
              <div className="space-y-4 h-full flex flex-col justify-center">
                {voyageAnalytics.purposeDistributionData.map((item: { name: string; value: number; percentage: number }, index: number) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                        <span>{item.name}</span>
                        <span>{item.value} voyages ({item.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div 
                          className={`${colors[index % colors.length]} h-6 rounded-full flex items-center justify-end pr-3 text-white text-xs font-medium`}
                          style={{ width: `${Math.max(10, item.percentage)}%` }}
                        >
                          {item.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No voyage purpose data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Route Complexity Analysis */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Route Complexity</h3>
            <div className="text-sm text-gray-500">STOP COUNT ANALYSIS</div>
          </div>
          <div className="h-64">
            <div className="space-y-4 h-full flex flex-col justify-center">
              {voyageAnalytics.routeComplexityData.map((item: { name: string; value: number; color: string }, index: number) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>{item.name}</span>
                    <span>{item.value} voyages</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className={`${item.color} h-6 rounded-full flex items-center justify-end pr-3 text-white text-xs font-medium`}
                      style={{ width: `${Math.max(10, (item.value / voyageAnalytics.totalVoyages) * 100)}%` }}
                    >
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Popular Destinations</h3>
            <div className="text-sm text-gray-500">TOP 5 ROUTES</div>
          </div>
          <div className="h-64">
            {voyageAnalytics.popularDestinations.length > 0 ? (
              <div className="space-y-3 h-full flex flex-col justify-center">
                {voyageAnalytics.popularDestinations.map((destination: { destination: string; count: number; percentage: number }, index: number) => (
                  <div key={destination.destination} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">{destination.destination}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{destination.count}</div>
                      <div className="text-xs text-gray-500">{destination.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No destination data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Voyage Duration Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Duration Distribution</h3>
            <div className="text-sm text-gray-500">TRIP LENGTH ANALYSIS</div>
          </div>
          <div className="h-64">
            <div className="space-y-4 h-full flex flex-col justify-center">
              {voyageAnalytics.durationDistributionData.map((item: { name: string; value: number; color: string }, index: number) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>{item.name}</span>
                    <span>{item.value} voyages</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-5">
                    <div 
                      className={`${item.color} h-5 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium`}
                      style={{ width: `${Math.max(8, (item.value / voyageAnalytics.totalVoyages) * 100)}%` }}
                    >
                      {item.value > 0 ? item.value : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Performance Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Voyage Execution Performance</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              Planning vs Execution Analysis
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Execution Efficiency</div>
            <div className="text-2xl font-bold text-blue-600">
              {(voyageAnalytics.averageExecutionEfficiency * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Planned vs Actual</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Average Stops</div>
            <div className="text-2xl font-bold text-green-600">
              {voyageAnalytics.averageStopsPerVoyage.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Stops per voyage</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Route Efficiency</div>
            <div className="text-2xl font-bold text-purple-600">
              {voyageAnalytics.routeEfficiencyScore.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Stops per day</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">On-Time Performance</div>
            <div className="text-2xl font-bold text-orange-600">
              {voyageAnalytics.onTimeVoyagePercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Within 2 hours</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoyageAnalyticsDashboard; 