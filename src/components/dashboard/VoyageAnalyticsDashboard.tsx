import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import KPICard from './KPICard';
import SmartFilterBar from './SmartFilterBar';
import VoyageDebugPanel from '../debug/VoyageDebugPanel';
import { Target, Route, Clock, MapPin, ArrowLeft, BarChart3, Activity, Bug } from 'lucide-react';

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

  // Debug panel state
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);

  // Calculate voyage analytics directly from data
  const voyageAnalytics = useMemo(() => {
    if (!voyageList || voyageList.length === 0) {
      console.log('❌ VOYAGE DEBUG: No voyage data available');
      return null;
    }

    console.log(`🚢 VOYAGE DEBUG: Total voyages in dataset: ${voyageList.length}`);
    console.log(`🚢 VOYAGE DEBUG: Current filters:`, filters);

    // Filter data based on selected filters
    const filterByDate = (date: Date) => {
      if (filters.selectedMonth === 'All Months') return true;
      const itemDate = new Date(date);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    };

    console.log(`🚢 VOYAGE RECORDS: Processing ${voyageList.length} voyage records`);

    // Debug: Check all May 2025 voyages before filtering
    if (filters.selectedMonth === 'May 2025') {
      const may2025Voyages = voyageList.filter(voyage => {
        const voyageDate = voyage.voyageDate;
        const itemDate = new Date(voyageDate);
        const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
        return monthLabel === 'May 2025';
      });
      
      console.log(`🗓️ MAY 2025 DEBUG: Found ${may2025Voyages.length} voyages for May 2025`);
      console.log('📊 MAY 2025 VOYAGES BREAKDOWN:');
      
      // Group by vessel (the supply vessel making the voyage)
      const vesselBreakdown = may2025Voyages.reduce((acc, voyage) => {
        acc[voyage.vessel] = (acc[voyage.vessel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(vesselBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([vessel, count]) => {
          console.log(`   ${vessel}: ${count} voyages`);
        });
      
      // Check specifically for voyages visiting Stena IceMAX
      const stenaVoyages = may2025Voyages.filter(voyage => 
        voyage.locations?.toLowerCase().includes('stena') && 
        voyage.locations?.toLowerCase().includes('icemax')
      );
      
      console.log(`🎯 STENA ICEMAX VOYAGES: ${stenaVoyages.length} voyages visited Stena IceMAX in May 2025`);
      
      if (stenaVoyages.length > 0) {
        console.log('📋 STENA VOYAGES SAMPLE:', stenaVoyages.slice(0, 5).map(v => ({
          supplyVessel: v.vessel,
          voyageNumber: v.voyageNumber,
          voyageDate: v.voyageDate?.toISOString().substring(0, 10),
          fullRoute: v.locations,
          mainDestination: v.mainDestination
        })));
      }
    }

    // Filter voyage records
    const filteredVoyages = voyageList.filter(voyage => {
      // Use voyageDate from VoyageList interface
      const voyageDate = voyage.voyageDate;
      const dateFilter = filterByDate(voyageDate);
      const purposeFilter = (filters.selectedVoyagePurpose === 'All Purposes' || 
         voyage.voyagePurpose === filters.selectedVoyagePurpose ||
         voyage.mission === filters.selectedVoyagePurpose);
      
      return dateFilter && purposeFilter;
    });

    console.log(`🎯 FILTERED VOYAGES: ${filteredVoyages.length} voyages after applying filters`);
    
    if (filters.selectedMonth === 'May 2025') {
      console.log('🔍 FILTER ANALYSIS:');
      console.log(`   Purpose filter: ${filters.selectedVoyagePurpose}`);
      
      const dateFailures = voyageList.filter(voyage => !filterByDate(voyage.voyageDate));
      const purposeFailures = voyageList.filter(voyage => {
        const dateFilter = filterByDate(voyage.voyageDate);
        const purposeFilter = (filters.selectedVoyagePurpose === 'All Purposes' || 
           voyage.voyagePurpose === filters.selectedVoyagePurpose ||
           voyage.mission === filters.selectedVoyagePurpose);
        return dateFilter && !purposeFilter;
      });
      
      console.log(`   Filtered out by date: ${dateFailures.length}`);
      console.log(`   Filtered out by purpose: ${purposeFailures.length}`);
    }

    // Debug logging for Stena IceMAX specifically
    if (filters.selectedMonth === 'May 2025') {
      const stenaVoyages = voyageList.filter(v => 
        v.vessel && v.vessel.toLowerCase().includes('stena') && v.vessel.toLowerCase().includes('icemax')
      );
      const stenaFiltered = filteredVoyages.filter(v => 
        v.locations && v.locations.toLowerCase().includes('stena') && v.locations.toLowerCase().includes('icemax')
      );
      
      console.log('🚢 STENA ICEMAX DEBUG:', {
        totalStenaVoyages: stenaVoyages.length,
        may2025StenaVoyages: stenaFiltered.length,
        selectedMonth: filters.selectedMonth,
        filterDetails: stenaVoyages.map(v => ({
          voyageNumber: v.voyageNumber,
          voyageDate: v.voyageDate?.toISOString().substring(0, 10),
          monthLabel: v.voyageDate ? `${new Date(v.voyageDate).toLocaleString('default', { month: 'long' })} ${new Date(v.voyageDate).getFullYear()}` : 'No Date',
          passesFilter: filterByDate(v.voyageDate)
        }))
      });
    }

    // Calculate basic voyage metrics using filtered voyage records
    const totalVoyages = filteredVoyages.length;
    
    const totalDurationHours = filteredVoyages.reduce((sum, voyage) => 
      sum + (voyage.durationHours || 0), 0);
    const averageVoyageDuration = totalVoyages > 0 ? totalDurationHours / totalVoyages : 0;
    
    // Purpose distribution based on voyage records
    const voyagePurposeDistribution = filteredVoyages.reduce((dist, voyage) => {
      const purpose = voyage.voyagePurpose || 'Other';
      dist[purpose] = (dist[purpose] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    // Mission type distribution using voyage records
    const missionTypeDistribution = filteredVoyages.reduce((dist, voyage) => {
      const missionType = voyage.mission || voyage.missionType || 'Unknown';
      dist[missionType] = (dist[missionType] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const supplyMissions = missionTypeDistribution['supply'] || missionTypeDistribution['Supply'] || 0;
    const projectMissions = missionTypeDistribution['project'] || missionTypeDistribution['Project'] || 0;
    const offhireMissions = missionTypeDistribution['offhire'] || missionTypeDistribution['Offhire'] || 0;

    const drillingVoyages = voyagePurposeDistribution['Drilling'] || 0;
    const drillingVoyagePercentage = totalVoyages > 0 ? (drillingVoyages / totalVoyages) * 100 : 0;
    const mixedVoyageEfficiency = totalVoyages > 0 ? ((voyagePurposeDistribution['Mixed'] || 0) / totalVoyages) * 100 : 0;

    // Route complexity - calculate from filtered voyage records
    const totalStops = filteredVoyages.reduce((sum, voyage) => {
      // Count stops from locations string (e.g., "Fourchon -> Ocean BlackLion -> Fourchon")
      const stops = (voyage.locations || '').split('->').length;
      return sum + Math.max(stops - 1, 1); // At least 1 stop
    }, 0);
    const averageStopsPerVoyage = totalVoyages > 0 ? totalStops / totalVoyages : 0;
    const multiStopVoyages = filteredVoyages.filter(voyage => 
      (voyage.locations || '').split('->').length > 2
    ).length;
    const multiStopPercentage = totalVoyages > 0 ? (multiStopVoyages / totalVoyages) * 100 : 0;
    const routeEfficiencyScore = averageVoyageDuration > 0 ? averageStopsPerVoyage / (averageVoyageDuration || 1) : 0;

    // Vessel utilization - calculate from filtered voyage records
    const uniqueVessels = new Set(filteredVoyages.map(voyage => voyage.vessel));
    const activeVesselsThisMonth = uniqueVessels.size;
    const voyagesPerVessel = activeVesselsThisMonth > 0 ? totalVoyages / activeVesselsThisMonth : 0;

    // Origin analysis - use filtered voyage records
    const fourchonDepartures = filteredVoyages.filter(voyage => 
      (voyage.originPort || '').toLowerCase().includes('fourchon') || 
      (voyage.locations || '').toLowerCase().includes('fourchon')
    ).length;
    const routeConcentration = totalVoyages > 0 ? (fourchonDepartures / totalVoyages) * 100 : 0;

    // Popular destinations - extract from voyage records
    const destinationCounts = filteredVoyages.reduce((counts, voyage) => {
      let destination = voyage.mainDestination;
      if (!destination && voyage.locations) {
        // Extract destination from locations string like "Fourchon -> Ocean BlackLion -> Fourchon"
        const parts = voyage.locations.split('->').map(p => p.trim());
        destination = parts[parts.length - 1] || 'Unknown';
      }
      destination = destination || 'Unknown';
      counts[destination] = (counts[destination] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const popularDestinations = Object.entries(destinationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count, percentage: (count / totalVoyages) * 100 }));

    // Calculate additional analytics for charts - using locations field
    const routeComplexityData = [
      { 
        name: 'Simple Routes (≤2 stops)', 
        value: filteredVoyages.filter(v => (v.locations || '').split('->').length <= 2).length, 
        color: 'bg-green-500' 
      },
      { 
        name: 'Medium Routes (3 stops)', 
        value: filteredVoyages.filter(v => (v.locations || '').split('->').length === 3).length, 
        color: 'bg-yellow-500' 
      },
      { 
        name: 'Complex Routes (≥4 stops)', 
        value: filteredVoyages.filter(v => (v.locations || '').split('->').length >= 4).length, 
        color: 'bg-red-500' 
      }
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

    const missionTypeData = [
      { name: 'Supply', value: supplyMissions, percentage: totalVoyages > 0 ? (supplyMissions / totalVoyages) * 100 : 0, color: 'bg-blue-500', description: 'Normal supply runs' },
      { name: 'Project', value: projectMissions, percentage: totalVoyages > 0 ? (projectMissions / totalVoyages) * 100 : 0, color: 'bg-purple-500', description: 'Special project work' },
      { name: 'Offhire', value: offhireMissions, percentage: totalVoyages > 0 ? (offhireMissions / totalVoyages) * 100 : 0, color: 'bg-gray-500', description: 'Off-hire/maintenance' }
    ].filter(m => m.value > 0);

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
      durationDistributionData,
      missionTypeData,
      missionTypeDistribution
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
        <div className="text-center max-w-md bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-8">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Loading voyage analytics data...</p>
          <p className="text-sm text-gray-500">Analyzing route patterns and vessel performance</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Route className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Voyage Analytics
              </h1>
              <p className="text-gray-600 mt-1">
                Strategic route planning & execution performance insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{voyageAnalytics.totalVoyages.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Voyages</div>
            </div>
            <button
              onClick={() => setIsDebugPanelOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 transition-all duration-200"
              title="Debug voyage data"
            >
              <Bug size={16} />
              Debug
            </button>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-all duration-200"
            >
              <ArrowLeft size={16} />
              Back to Upload
            </button>
          </div>
        </div>
      </div>

      {/* Smart Filter Bar */}
      <SmartFilterBar
        timeFilter={filters.selectedMonth}
        locationFilter={filters.selectedVoyagePurpose}
        onTimeChange={(value) => setFilters(prev => ({ ...prev, selectedMonth: value }))}
        onLocationChange={(value) => setFilters(prev => ({ ...prev, selectedVoyagePurpose: value }))}
        timeOptions={filterOptions.months.map(month => ({ value: month, label: month }))}
        locationOptions={filterOptions.purposes.map(purpose => ({ value: purpose, label: purpose }))}
        totalRecords={voyageList.length}
        filteredRecords={voyageAnalytics.filteredVoyages.length}
        showPresets={true}
      />

      {/* Core Voyage KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard 
          title="Total Voyages" 
          value={voyageAnalytics.totalVoyages.toLocaleString()}
          color="blue"
          variant="secondary"
          contextualHelp="Total number of voyages in the selected time period"
          status="good"
        />
        <KPICard 
          title="Avg Duration" 
          value={voyageAnalytics.averageVoyageDuration.toFixed(1)}
          unit="hrs"
          trend={voyageAnalytics.avgVoyageDurationMoMChange || 0}
          isPositive={voyageAnalytics.avgVoyageDurationMoMChange < 0}
          color="green"
          variant="secondary"
          contextualHelp="Average voyage duration from port departure to final return. Shorter durations indicate better efficiency."
          target={48}
          status={voyageAnalytics.averageVoyageDuration <= 48 ? 'good' : voyageAnalytics.averageVoyageDuration <= 72 ? 'warning' : 'critical'}
        />
        <KPICard 
          title="Active Vessels" 
          value={voyageAnalytics.activeVesselsThisMonth.toLocaleString()}
          color="purple"
          variant="secondary"
          contextualHelp="Number of unique vessels active in the selected period"
          status="neutral"
        />
        <KPICard 
          title="Voyages/Vessel" 
          value={voyageAnalytics.voyagesPerVessel.toFixed(1)}
          color="orange"
          variant="secondary"
          contextualHelp="Average number of voyages per active vessel. Higher values indicate better vessel utilization."
          target={2.5}
          status={voyageAnalytics.voyagesPerVessel >= 2.5 ? 'good' : voyageAnalytics.voyagesPerVessel >= 2.0 ? 'warning' : 'critical'}
        />
        <KPICard 
          title="Multi-Stop %" 
          value={voyageAnalytics.multiStopPercentage.toFixed(1)}
          unit="%"
          color="yellow"
          variant="secondary"
          contextualHelp="Percentage of voyages with more than 2 stops. Higher values indicate complex routes."
          status={voyageAnalytics.multiStopPercentage <= 30 ? 'good' : voyageAnalytics.multiStopPercentage <= 50 ? 'warning' : 'critical'}
        />
        <KPICard 
          title="On-Time %" 
          value={voyageAnalytics.onTimeVoyagePercentage.toFixed(1)}
          unit="%"
          color="indigo"
          variant="secondary"
          contextualHelp="Percentage of voyages completed within 2 hours of scheduled time."
          target={85}
          status={voyageAnalytics.onTimeVoyagePercentage >= 85 ? 'good' : voyageAnalytics.onTimeVoyagePercentage >= 70 ? 'warning' : 'critical'}
        />
      </div>

      {/* Route Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard 
          title="Route Efficiency" 
          value={voyageAnalytics.routeEfficiencyScore.toFixed(2)}
          color="pink"
          variant="secondary"
          contextualHelp="Stops per day ratio. Higher values indicate more efficient route planning."
          target={1.5}
          status={voyageAnalytics.routeEfficiencyScore >= 1.5 ? 'good' : voyageAnalytics.routeEfficiencyScore >= 1.0 ? 'warning' : 'critical'}
        />
        <KPICard 
          title="Drilling Voyages" 
          value={voyageAnalytics.drillingVoyagePercentage.toFixed(1)}
          unit="%"
          color="red"
          variant="secondary"
          contextualHelp="Percentage of total voyages dedicated to drilling operations."
          status="neutral"
        />
        <KPICard 
          title="Mixed Efficiency" 
          value={voyageAnalytics.mixedVoyageEfficiency.toFixed(1)}
          unit="%"
          color="blue"
          variant="secondary"
          contextualHelp="Percentage of voyages serving multiple purposes. Higher values show better trip consolidation."
          target={15}
          status={voyageAnalytics.mixedVoyageEfficiency >= 15 ? 'good' : voyageAnalytics.mixedVoyageEfficiency >= 10 ? 'warning' : 'critical'}
        />
        <KPICard 
          title="Fourchon Routes" 
          value={voyageAnalytics.routeConcentration.toFixed(1)}
          unit="%"
          color="green"
          variant="secondary"
          contextualHelp="Percentage of voyages originating from Fourchon port."
          status="neutral"
        />
        <KPICard 
          title="Consolidation Score" 
          value={voyageAnalytics.consolidationBenefit.toFixed(1)}
          color="purple"
          variant="secondary"
          contextualHelp="Efficiency gain from consolidating multiple deliveries into single voyages."
          target={2.0}
          status={voyageAnalytics.consolidationBenefit >= 2.0 ? 'good' : voyageAnalytics.consolidationBenefit >= 1.5 ? 'warning' : 'critical'}
        />
      </div>

      {/* Analytics Dashboard Section - Enhanced Design */}
      <div className="space-y-6">
        {/* Voyage Analytics Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Voyage Purpose Distribution - Modern Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Voyage Purpose Distribution
                  </h2>
                  <p className="text-sm text-gray-600">Operational focus breakdown</p>
                </div>
              </div>
              
              {voyageAnalytics.purposeDistributionData.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {voyageAnalytics.purposeDistributionData.map((item: { name: string; value: number; percentage: number }, index: number) => {
                    const colors = [
                      { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                      { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
                      { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                      { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={item.name} className={`p-4 rounded-lg border ${color.bg} ${color.border} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 bg-gradient-to-r ${color.gradient} rounded-full`}></div>
                          <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                        </div>
                        <div className={`text-2xl font-bold ${color.text} mb-1`}>{item.value}</div>
                        <div className="text-xs text-gray-600">{item.percentage.toFixed(1)}% of total</div>
                        
                        {/* Mini trend bar */}
                        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.max(2, item.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center" role="status" aria-label="No voyage purpose data available">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="w-8 h-8 text-purple-400" aria-hidden="true" />
                    </div>
                    <p className="text-gray-600 font-medium">No Purpose Data</p>
                    <p className="text-sm text-gray-500 mt-1">Voyage purpose information will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Route Complexity Analysis - Modern Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                  <Route className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Route Complexity
                  </h2>
                  <p className="text-sm text-gray-600">Stop count analysis • Avg: {voyageAnalytics.averageStopsPerVoyage.toFixed(1)} stops</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {voyageAnalytics.routeComplexityData.map((item: { name: string; value: number; color: string }, index: number) => {
                  const percentage = (item.value / voyageAnalytics.totalVoyages) * 100;
                  const colorMapping = {
                    'bg-green-500': { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
                    'bg-yellow-500': { gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
                    'bg-red-500': { gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
                  };
                  const colorClass = colorMapping[item.color as keyof typeof colorMapping] || 
                    { gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
                  
                  return (
                    <div key={item.name} className={`p-4 rounded-lg border ${colorClass.bg} ${colorClass.border} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 bg-gradient-to-r ${colorClass.gradient} rounded-full`}></div>
                        <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                      </div>
                      <div className={`text-2xl font-bold ${colorClass.text} mb-1`}>{item.value}</div>
                      <div className="text-xs text-gray-600">{percentage.toFixed(1)}% of voyages</div>
                      
                      {/* Mini trend bar */}
                      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${colorClass.gradient} transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mission Type Row - New Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Mission Type Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Mission Type Breakdown
                  </h2>
                  <p className="text-sm text-gray-600">Voyage operational categories</p>
                </div>
              </div>
              
              {voyageAnalytics.missionTypeData && voyageAnalytics.missionTypeData.length > 0 ? (
                <div className="space-y-4">
                  {voyageAnalytics.missionTypeData.map((mission: any) => (
                    <div key={mission.name} className={`p-4 rounded-lg border ${mission.color === 'bg-blue-500' ? 'bg-blue-50 border-blue-200' : mission.color === 'bg-purple-500' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${mission.color} rounded-lg flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{mission.value}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{mission.name}</div>
                            <div className="text-xs text-gray-600">{mission.description}</div>
                          </div>
                        </div>
                        <span className={`text-lg font-bold ${mission.color === 'bg-blue-500' ? 'text-blue-700' : mission.color === 'bg-purple-500' ? 'text-purple-700' : 'text-gray-700'}`}>
                          {mission.percentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${mission.color} transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.max(2, mission.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No Mission Data</p>
                    <p className="text-sm text-gray-500 mt-1">Mission type information will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mission Type Insights */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Mission Insights
                  </h2>
                  <p className="text-sm text-gray-600">Key operational metrics by mission type</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Supply Operations</div>
                      <div className="text-xs text-gray-600 mt-1">Regular supply runs to facilities</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-700">{voyageAnalytics.missionTypeDistribution['Supply'] || 0}</div>
                      <div className="text-xs text-gray-500">voyages</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Project Work</div>
                      <div className="text-xs text-gray-600 mt-1">Special projects & storage vessels</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-700">{voyageAnalytics.missionTypeDistribution['Project'] || 0}</div>
                      <div className="text-xs text-gray-500">voyages</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Off-hire Periods</div>
                      <div className="text-xs text-gray-600 mt-1">Maintenance & non-BP operations</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-700">{voyageAnalytics.missionTypeDistribution['Offhire'] || 0}</div>
                      <div className="text-xs text-gray-500">periods</div>
                    </div>
                  </div>
                </div>
                
                {/* Cost Impact Note */}
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div className="text-xs text-amber-800">
                      <span className="font-semibold">Cost Note:</span> Off-hire voyages are excluded from BP cost allocation calculations
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Destinations and Duration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Destinations - Modern Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Popular Destinations
                    </h2>
                    <p className="text-sm text-gray-600">Top voyage routes by frequency</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  TOP 5
                </span>
              </div>
              
              {voyageAnalytics.popularDestinations.length > 0 ? (
                <div className="space-y-3">
                  {voyageAnalytics.popularDestinations.map((destination: { destination: string; count: number; percentage: number }, index: number) => {
                    const rankings = [
                      { position: '#1', gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
                      { position: '#2', gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
                      { position: '#3', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                      { position: '#4', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                      { position: '#5', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' }
                    ];
                    const ranking = rankings[index] || rankings[4];
                    
                    return (
                      <div key={destination.destination} className={`flex items-center justify-between p-4 rounded-lg ${ranking.bg} border ${ranking.border} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 bg-gradient-to-r ${ranking.gradient} rounded-lg flex items-center justify-center`}>
                            <span className="text-xs font-bold text-white">{ranking.position}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{destination.destination}</div>
                            <div className="text-xs text-gray-500">{destination.percentage.toFixed(1)}% of total voyages</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${ranking.text}`}>{destination.count}</div>
                          <div className="text-xs text-gray-500">voyages</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center" role="status" aria-label="No destination data available">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-8 h-8 text-blue-400" aria-hidden="true" />
                    </div>
                    <p className="text-gray-600 font-medium">No Destination Data</p>
                    <p className="text-sm text-gray-500 mt-1">Popular destinations will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Voyage Duration Distribution - Modern Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Duration Distribution
                  </h2>
                  <p className="text-sm text-gray-600">Trip length analysis • Avg: {voyageAnalytics.averageVoyageDuration.toFixed(1)} hrs</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {voyageAnalytics.durationDistributionData.map((item: { name: string; value: number; color: string }, index: number) => {
                  const percentage = (item.value / voyageAnalytics.totalVoyages) * 100;
                  const colorMapping = {
                    'bg-blue-500': { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                    'bg-purple-500': { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                    'bg-orange-500': { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                    'bg-red-500': { gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
                  };
                  const colorClass = colorMapping[item.color as keyof typeof colorMapping] || 
                    { gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
                  
                  return (
                    <div key={item.name} className={`p-4 rounded-lg border ${colorClass.bg} ${colorClass.border} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 bg-gradient-to-r ${colorClass.gradient} rounded-full`}></div>
                        <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                      </div>
                      <div className={`text-2xl font-bold ${colorClass.text} mb-1`}>{item.value}</div>
                      <div className="text-xs text-gray-600">{percentage.toFixed(1)}% of voyages</div>
                      
                      {/* Mini trend bar */}
                      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${colorClass.gradient} transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        ></div>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Voyage Execution Performance
            </h2>
            <p className="text-sm text-gray-600">Planning vs execution analysis</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-800">Execution Efficiency</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 mb-1">
              {(voyageAnalytics.averageExecutionEfficiency * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Planned vs Actual</div>
          </div>
          
          <div className="p-4 rounded-lg border bg-green-50 border-green-200 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-800">Average Stops</span>
            </div>
            <div className="text-2xl font-bold text-green-700 mb-1">
              {voyageAnalytics.averageStopsPerVoyage.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">Stops per voyage</div>
          </div>
          
          <div className="p-4 rounded-lg border bg-purple-50 border-purple-200 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-800">Route Efficiency</span>
            </div>
            <div className="text-2xl font-bold text-purple-700 mb-1">
              {voyageAnalytics.routeEfficiencyScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">Stops per day</div>
          </div>
          
          <div className="p-4 rounded-lg border bg-orange-50 border-orange-200 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-800">On-Time Performance</span>
            </div>
            <div className="text-2xl font-bold text-orange-700 mb-1">
              {voyageAnalytics.onTimeVoyagePercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Within 2 hours</div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <VoyageDebugPanel 
        isOpen={isDebugPanelOpen} 
        onClose={() => setIsDebugPanelOpen(false)} 
      />
    </div>
  );
};

export default VoyageAnalyticsDashboard;
