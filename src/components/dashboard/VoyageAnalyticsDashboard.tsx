import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import KPICard from './KPICard';
import { Calendar, MapPin, Activity, Clock, Route, Target, Compass } from 'lucide-react';

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

      {/* Enhanced Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Time Period</label>
                <select 
                  className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[180px]"
                  value={filters.selectedMonth}
                  onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
                >
                  {filterOptions.months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Compass className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voyage Purpose</label>
                <select 
                  className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 min-w-[200px]"
                  value={filters.selectedVoyagePurpose}
                  onChange={(e) => setFilters(prev => ({ ...prev, selectedVoyagePurpose: e.target.value }))}
                >
                  {filterOptions.purposes.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4" />
            <span>{voyageAnalytics.peakSeasonIndicator}</span>
          </div>
        </div>
      </div>

      {/* Core Voyage KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <KPICard 
          title="Total Voyages" 
          value={voyageAnalytics.totalVoyages}
          color="blue"
        />
        <KPICard 
          title="Avg Duration" 
          value={voyageAnalytics.averageVoyageDuration.toFixed(2)}
          unit="hours"
          trend={voyageAnalytics.avgVoyageDurationMoMChange}
          isPositive={voyageAnalytics.avgVoyageDurationMoMChange < 0} // Shorter is better
          color="green"
        />
        <KPICard 
          title="Active Vessels" 
          value={voyageAnalytics.activeVesselsThisMonth}
          color="purple"
        />
        <KPICard 
          title="Voyages/Vessel" 
          value={voyageAnalytics.voyagesPerVessel.toFixed(2)}
          color="orange"
        />
        <KPICard 
          title="Multi-Stop %" 
          value={voyageAnalytics.multiStopPercentage.toFixed(2)}
          unit="%"
          color="red"
        />
        <KPICard 
          title="On-Time %" 
          value={voyageAnalytics.onTimeVoyagePercentage.toFixed(2)}
          unit="%"
          color="indigo"
        />
      </div>

      {/* Route Performance KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <KPICard 
          title="Route Efficiency" 
          value={voyageAnalytics.routeEfficiencyScore.toFixed(2)}
          color="pink"
        />
        <KPICard 
          title="Drilling Voyages" 
          value={voyageAnalytics.drillingVoyagePercentage.toFixed(2)}
          unit="%"
          color="yellow"
        />
        <KPICard 
          title="Mixed Efficiency" 
          value={voyageAnalytics.mixedVoyageEfficiency.toFixed(2)}
          unit="%"
          color="blue"
        />
        <KPICard 
          title="Fourchon Routes" 
          value={voyageAnalytics.routeConcentration.toFixed(2)}
          unit="%"
          color="green"
        />
        <KPICard 
          title="Consolidation Benefit" 
          value={voyageAnalytics.consolidationBenefit.toFixed(2)}
          color="purple"
        />
      </div>

      {/* Analytics Dashboard Section - Enhanced Design */}
      <div className="space-y-6">
        {/* Voyage Analytics Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Voyage Purpose Distribution - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Voyage Purpose Distribution</h3>
                    <p className="text-sm text-purple-100 mt-0.5">Operational Focus Analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{voyageAnalytics.totalVoyages}</div>
                  <div className="text-xs text-purple-100">Total Voyages</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {voyageAnalytics.purposeDistributionData.length > 0 ? (
                <div className="space-y-4">
                  {voyageAnalytics.purposeDistributionData.map((item: { name: string; value: number; percentage: number }, index: number) => {
                    const colors = [
                      { bg: 'bg-blue-500', light: 'bg-blue-50', ring: 'ring-blue-200' },
                      { bg: 'bg-green-500', light: 'bg-green-50', ring: 'ring-green-200' },
                      { bg: 'bg-purple-500', light: 'bg-purple-50', ring: 'ring-purple-200' },
                      { bg: 'bg-orange-500', light: 'bg-orange-50', ring: 'ring-orange-200' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={item.name} className={`group hover:${color.light} p-4 rounded-lg transition-all duration-200`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 ${color.bg} rounded-full ring-4 ${color.ring}`}></div>
                            <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-900">{item.value}</span>
                            <span className="text-sm text-gray-500">voyages</span>
                          </div>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div 
                            className={`${color.bg} h-4 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${Math.max(15, item.percentage)}%` }}
                          >
                            <span className="text-xs font-medium text-white">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-4 bg-purple-50 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
                      <Target className="w-10 h-10 text-purple-400" />
                    </div>
                    <p className="text-gray-700 font-semibold">No Purpose Data</p>
                    <p className="text-sm text-gray-500 mt-2">Voyage purpose information will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Route Complexity Analysis - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Route className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Route Complexity</h3>
                    <p className="text-sm text-orange-100 mt-0.5">Stop Count Analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{voyageAnalytics.averageStopsPerVoyage.toFixed(1)}</div>
                  <div className="text-xs text-orange-100">Avg Stops</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {voyageAnalytics.routeComplexityData.map((item: { name: string; value: number; color: string }, index: number) => {
                  const percentage = (item.value / voyageAnalytics.totalVoyages) * 100;
                  
                  return (
                    <div key={item.name} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-3 h-3 rounded-full ${item.color} ring-4 ring-opacity-30`} 
                               style={{ boxShadow: `0 0 0 4px ${item.color}30` }}></div>
                          <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-lg font-bold text-gray-900">{item.value}</div>
                          <div className="text-xs text-gray-500">voyages</div>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-medium text-gray-700">{percentage.toFixed(1)}%</span>
                          {percentage > 20 && (
                            <span className="text-xs font-medium text-white">
                              {item.value} voyages
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Destinations and Duration */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Popular Destinations - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Popular Destinations</h3>
                    <p className="text-sm text-blue-100 mt-0.5">Top 5 Routes</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-white/80 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  TOP 5
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {voyageAnalytics.popularDestinations.length > 0 ? (
                <div className="space-y-4">
                  {voyageAnalytics.popularDestinations.map((destination: { destination: string; count: number; percentage: number }, index: number) => {
                    const medals = [
                      { icon: '🥇', bg: 'bg-yellow-50', border: 'border-yellow-300' },
                      { icon: '🥈', bg: 'bg-gray-50', border: 'border-gray-300' },
                      { icon: '🥉', bg: 'bg-orange-50', border: 'border-orange-300' },
                      { icon: '4️⃣', bg: 'bg-blue-50', border: 'border-blue-300' },
                      { icon: '5️⃣', bg: 'bg-purple-50', border: 'border-purple-300' }
                    ];
                    const medal = medals[index] || medals[4];
                    
                    return (
                      <div key={destination.destination} className={`flex items-center justify-between p-4 rounded-lg ${medal.bg} border ${medal.border} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{medal.icon}</span>
                          <div>
                            <span className="text-sm font-semibold text-gray-800">{destination.destination}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{destination.percentage.toFixed(1)}% of voyages</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{destination.count}</div>
                          <div className="text-xs text-gray-500">voyages</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-4 bg-blue-50 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
                      <MapPin className="w-10 h-10 text-blue-400" />
                    </div>
                    <p className="text-gray-700 font-semibold">No Destination Data</p>
                    <p className="text-sm text-gray-500 mt-2">Popular destinations will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voyage Duration Distribution - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Duration Distribution</h3>
                    <p className="text-sm text-green-100 mt-0.5">Trip Length Analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{voyageAnalytics.averageVoyageDuration.toFixed(0)}</div>
                  <div className="text-xs text-green-100">Avg Hours</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {voyageAnalytics.durationDistributionData.map((item: { name: string; value: number; color: string }, index: number) => {
                  const percentage = (item.value / voyageAnalytics.totalVoyages) * 100;
                  
                  return (
                    <div key={item.name} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-3 h-3 rounded-full ${item.color} ring-4 ring-opacity-30`} 
                               style={{ boxShadow: `0 0 0 4px ${item.color}30` }}></div>
                          <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-lg font-bold text-gray-900">{item.value}</div>
                          <div className="text-xs text-gray-500">voyages</div>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-medium text-gray-700">{percentage.toFixed(1)}%</span>
                          {percentage > 15 && (
                            <span className="text-xs font-medium text-white">
                              {item.value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
              {(voyageAnalytics.averageExecutionEfficiency * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">Planned vs Actual</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Average Stops</div>
            <div className="text-2xl font-bold text-green-600">
              {voyageAnalytics.averageStopsPerVoyage.toFixed(2)}
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
              {voyageAnalytics.onTimeVoyagePercentage.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">Within 2 hours</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoyageAnalyticsDashboard;
