import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';

interface DrillingDashboardProps {
  onNavigateToUpload?: () => void;
}

const DrillingDashboard: React.FC<DrillingDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    isDataReady
  } = useData();

  // Filters state - matching PowerBI layout
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations'
  });

  // Calculate drilling-specific KPIs
  const drillingMetrics = useMemo(() => {
    // Filter data based on selected filters
    const filterByDate = (date: Date) => {
      if (filters.selectedMonth === 'all' || filters.selectedMonth === 'All Months') return true;
      const itemDate = new Date(date);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    };

    const filterByLocation = (location: string) => {
      if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') return true;
      return location === filters.selectedLocation;
    };

    // Apply filters to data
    const filteredVoyageEvents = voyageEvents.filter(event => 
      event.department === 'Drilling' &&
      filterByDate(event.eventDate) &&
      filterByLocation(event.location)
    );

    const filteredVesselManifests = vesselManifests.filter(manifest => 
      manifest.finalDepartment === 'Drilling' &&
      filterByDate(manifest.manifestDate) &&
      filterByLocation(manifest.mappedLocation)
    );

    console.log('🔧 Drilling Dashboard Filtered Data:', {
      totalVoyageEvents: voyageEvents.length,
      filteredVoyageEvents: filteredVoyageEvents.length,
      totalManifests: vesselManifests.length,
      filteredManifests: filteredVesselManifests.length,
      selectedMonth: filters.selectedMonth,
      selectedLocation: filters.selectedLocation
    });

    // Calculate KPIs based on filtered data
    
    // 1. Cargo Tons - Total cargo moved
    const cargoTons = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.deckTons || 0), 0);
    
    // 2. Lifts/Hr - Efficiency metric
    const totalLifts = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.lifts || 0), 0);
    const cargoOpsEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Cargo Ops' ||
      event.event?.toLowerCase().includes('cargo') ||
      event.event?.toLowerCase().includes('loading') ||
      event.event?.toLowerCase().includes('offloading')
    );
    const cargoOpsHours = cargoOpsEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const liftsPerHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
    
    // 3. OSV Productive Hours
    const productiveEvents = filteredVoyageEvents.filter(event => 
      event.activityCategory === 'Productive' ||
      (event.event && !event.event.toLowerCase().includes('waiting') && 
       !event.event.toLowerCase().includes('standby'))
    );
    const osvProductiveHours = productiveEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 4. Waiting Time Offshore
    const waitingEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Waiting on Installation' ||
      event.event?.toLowerCase().includes('waiting') ||
      event.event?.toLowerCase().includes('standby') ||
      (event.portType === 'rig' && event.activityCategory === 'Non-Productive')
    );
    const waitingTimeOffshore = waitingEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 5. RT Cargo (Return Transport Cargo)
    const rtCargoTons = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.rtTons || 0), 0);
    
    // 6. Fluid Movement (calculated from specific cargo types)
    const fluidManifests = filteredVesselManifests.filter(manifest => 
      manifest.cargoType === 'Liquid Bulk' ||
      manifest.remarks?.toLowerCase().includes('fluid') ||
      manifest.remarks?.toLowerCase().includes('water') ||
      manifest.remarks?.toLowerCase().includes('mud') ||
      manifest.remarks?.toLowerCase().includes('brine')
    );
    const fluidMovement = fluidManifests.reduce((sum, manifest) => sum + (manifest.deckTons || 0), 0);
    
    // 7. Vessel Utilization
    const totalHours = filteredVoyageEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const vesselUtilization = totalHours > 0 ? (osvProductiveHours / totalHours) * 100 : 0;
    
    // 8. FSV Runs (unique voyages)
    const uniqueVoyages = new Set(filteredVoyageEvents.map(event => event.voyageNumber));
    const fsvRuns = uniqueVoyages.size;
    
    // 9. Vessel Visits (unique vessel visits to locations)
    const vesselVisits = filteredVesselManifests.length;
    
    // 10. Maneuvering Hours
    const maneuveringEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Maneuvering' ||
      event.event?.toLowerCase().includes('maneuvering') ||
      event.event?.toLowerCase().includes('positioning')
    );
    const maneuveringHours = maneuveringEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);

    // NEW METRICS FOR UPDATED KPI CARDS
    
    // 11. Total Cost (YTD) - Sum of all drilling-related costs for the year
    const currentYear = new Date().getFullYear();
    const drillingCosts = costAllocation.filter(cost => 
      cost.department === 'Drilling' &&
      cost.year === currentYear
    );
    // Mock calculation since totalCost is not in the interface - using count * average cost estimate
    const totalCostYTD = drillingCosts.length * 50000; // Mock: $50k per cost allocation entry
    
    // 12. Average Monthly Cost - Total cost divided by months elapsed in year
    const monthsElapsed = new Date().getMonth() + 1; // Current month (1-12)
    const avgMonthlyCost = monthsElapsed > 0 ? totalCostYTD / monthsElapsed : 0;
    
    // 13. Vessel Visits per Week - Calculate based on filtered data
    const dateRange = (() => {
      const dates = filteredVesselManifests.map(m => new Date(m.manifestDate)).filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return { start: new Date(), end: new Date() };
      return {
        start: new Date(Math.min(...dates.map(d => d.getTime()))),
        end: new Date(Math.max(...dates.map(d => d.getTime())))
      };
    })();
    const weeksDiff = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const vesselVisitsPerWeek = vesselVisits / weeksDiff;
    
    // 14. Allocated Days - Mock calculation since allocatedDays is not in the interface
    const allocatedDays = drillingCosts.length * 30; // Mock: 30 days per cost allocation entry

    // Calculate trends (mock data for now - in production, compare with previous period)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    // Mock previous period data (would come from actual historical data)
    const mockPreviousPeriod = {
      cargoTons: (cargoTons || 0) * 0.85,
      liftsPerHour: (liftsPerHour || 0) * 1.1,
      osvProductiveHours: (osvProductiveHours || 0) * 0.92,
      waitingTime: (waitingTimeOffshore || 0) * 1.15,
      rtCargoTons: (rtCargoTons || 0) * 1.08,
      fluidMovement: (fluidMovement || 0) * 0.88,
      vesselUtilization: (vesselUtilization || 0) * 0.98,
      fsvRuns: (fsvRuns || 0) * 0.91,
      vesselVisits: (vesselVisits || 0) * 0.95,
      maneuveringHours: (maneuveringHours || 0) * 1.12,
      totalCostYTD: totalCostYTD * 0.93,
      avgMonthlyCost: avgMonthlyCost * 0.96,
      vesselVisitsPerWeek: vesselVisitsPerWeek * 0.89,
      allocatedDays: allocatedDays * 1.05
    };

    return {
      cargoTons: { 
        value: Math.round(cargoTons), 
        trend: Number(calculateTrend(cargoTons, mockPreviousPeriod.cargoTons).toFixed(1)), 
        isPositive: cargoTons > mockPreviousPeriod.cargoTons 
      },
      liftsPerHour: { 
        value: Number((Number(liftsPerHour) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(liftsPerHour) || 0, mockPreviousPeriod.liftsPerHour).toFixed(1)), 
        isPositive: (Number(liftsPerHour) || 0) > mockPreviousPeriod.liftsPerHour 
      },
      osvProductiveHours: { 
        value: Math.round(osvProductiveHours), 
        trend: Number(calculateTrend(osvProductiveHours, mockPreviousPeriod.osvProductiveHours).toFixed(1)), 
        isPositive: osvProductiveHours > mockPreviousPeriod.osvProductiveHours 
      },
      waitingTime: { 
        value: Math.round(waitingTimeOffshore), 
        trend: Number(calculateTrend(waitingTimeOffshore, mockPreviousPeriod.waitingTime).toFixed(1)), 
        isPositive: waitingTimeOffshore < mockPreviousPeriod.waitingTime // Lower waiting time is better
      },
      rtCargoTons: { 
        value: Number((Number(rtCargoTons) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(rtCargoTons) || 0, mockPreviousPeriod.rtCargoTons).toFixed(1)), 
        isPositive: (Number(rtCargoTons) || 0) < mockPreviousPeriod.rtCargoTons // Lower RT cargo might be better
      },
      fluidMovement: { 
        value: fluidMovement > 0 ? Math.round(fluidMovement) : 'N/A', 
        trend: fluidMovement > 0 ? Number(calculateTrend(fluidMovement, mockPreviousPeriod.fluidMovement).toFixed(1)) : null, 
        isPositive: fluidMovement > 0 ? fluidMovement > mockPreviousPeriod.fluidMovement : null 
      },
      vesselUtilization: { 
        value: Math.round(Number(vesselUtilization) || 0), 
        trend: Number(calculateTrend(Number(vesselUtilization) || 0, mockPreviousPeriod.vesselUtilization).toFixed(1)), 
        isPositive: (Number(vesselUtilization) || 0) > mockPreviousPeriod.vesselUtilization 
      },
      fsvRuns: { 
        value: fsvRuns, 
        trend: Number(calculateTrend(fsvRuns, mockPreviousPeriod.fsvRuns).toFixed(1)), 
        isPositive: fsvRuns > mockPreviousPeriod.fsvRuns 
      },
      vesselVisits: { 
        value: vesselVisits, 
        trend: Number(calculateTrend(vesselVisits, mockPreviousPeriod.vesselVisits).toFixed(1)), 
        isPositive: vesselVisits > mockPreviousPeriod.vesselVisits 
      },
      maneuveringHours: { 
        value: Number((Number(maneuveringHours) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(maneuveringHours) || 0, mockPreviousPeriod.maneuveringHours).toFixed(1)), 
        isPositive: (Number(maneuveringHours) || 0) < mockPreviousPeriod.maneuveringHours // Lower maneuvering time is better
      },
      // NEW METRICS FOR UPDATED KPI CARDS
      totalCostYTD: {
        value: Math.round(totalCostYTD),
        trend: Number(calculateTrend(totalCostYTD, mockPreviousPeriod.totalCostYTD).toFixed(1)),
        isPositive: totalCostYTD < mockPreviousPeriod.totalCostYTD // Lower cost is better
      },
      avgMonthlyCost: {
        value: Math.round(avgMonthlyCost),
        trend: Number(calculateTrend(avgMonthlyCost, mockPreviousPeriod.avgMonthlyCost).toFixed(1)),
        isPositive: avgMonthlyCost < mockPreviousPeriod.avgMonthlyCost // Lower cost is better
      },
      vesselVisitsPerWeek: {
        value: Number(vesselVisitsPerWeek.toFixed(1)),
        trend: Number(calculateTrend(vesselVisitsPerWeek, mockPreviousPeriod.vesselVisitsPerWeek).toFixed(1)),
        isPositive: vesselVisitsPerWeek > mockPreviousPeriod.vesselVisitsPerWeek // More visits is better
      },
      allocatedDays: {
        value: Math.round(allocatedDays),
        trend: Number(calculateTrend(allocatedDays, mockPreviousPeriod.allocatedDays).toFixed(1)),
        isPositive: allocatedDays > mockPreviousPeriod.allocatedDays // More allocated days might be better
      },
      // Additional metrics for charts
      totalEvents: filteredVoyageEvents.length,
      totalManifests: filteredVesselManifests.length,
      totalHours,
      cargoOpsHours,
      nonProductiveHours: totalHours - osvProductiveHours,
      
      // Vessel type breakdown
      vesselTypeData: (() => {
        const vessels = [...new Set(filteredVoyageEvents.map(event => event.vessel))];
        const vesselCounts = vessels.reduce((acc, vessel) => {
          // Simple vessel type detection based on naming patterns
          let type = 'OSV';
          if (vessel.toLowerCase().includes('fsv') || vessel.toLowerCase().includes('supply')) {
            type = 'FSV';
          } else if (vessel.toLowerCase().includes('msv') || vessel.toLowerCase().includes('multi')) {
            type = 'MSV';
          } else if (vessel.toLowerCase().includes('ahts') || vessel.toLowerCase().includes('tug')) {
            type = 'AHTS';
          }
          
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(vesselCounts).map(([type, count]) => ({
          type,
          count,
          percentage: vessels.length > 0 ? (count / vessels.length) * 100 : 0
        }));
      })(),
      
      // Activity breakdown
      activityData: (() => {
        const activities = [
          { name: 'Cargo Operations', hours: cargoOpsHours, color: 'bg-blue-500' },
          { name: 'Waiting Time', hours: waitingTimeOffshore, color: 'bg-orange-500' },
          { name: 'Maneuvering', hours: maneuveringHours, color: 'bg-purple-500' },
          { name: 'Other Productive', hours: Math.max(0, osvProductiveHours - cargoOpsHours), color: 'bg-green-500' },
          { name: 'Non-Productive', hours: Math.max(0, totalHours - osvProductiveHours - waitingTimeOffshore), color: 'bg-red-500' }
        ].filter(activity => activity.hours > 0);
        
        return activities.sort((a, b) => b.hours - a.hours);
      })()
    };
  }, [voyageEvents, vesselManifests, costAllocation, filters]);

  // Get filter options
  const filterOptions = useMemo(() => {
    // Create month options with proper chronological sorting
    const monthMap = new Map<string, string>();
    
    voyageEvents.forEach(event => {
      if (event.eventDate) {
        const date = new Date(event.eventDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'long' });
        const label = `${monthName} ${date.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });
    
    const months = ['All Months', ...Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value)) // Sort chronologically
      .map(item => item.label)]; // Extract just the labels for the current format
    
    const locations = ['All Locations', ...Array.from(new Set(voyageEvents
      .filter(ve => ve.department === 'Drilling')
      .map(ve => ve.location)
    )).sort()];

    return { months, locations };
  }, [voyageEvents]);

  if (!isDataReady || voyageEvents.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drilling dashboard data...</p>
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
  }> = ({ title, value, trend, isPositive, unit }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            {trend !== null && (
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
                  {trend}%
                </span>
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900">{value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">GoA WELLS PERFORMANCE</h2>
          <p className="text-lg text-gray-600 font-medium">LOGISTICS DASHBOARD</p>
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

      {/* Filter Bar - Matching PowerBI Layout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">CURRENT MONTH</label>
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent min-w-[120px]"
              value={filters.selectedMonth}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
            >
              {filterOptions.months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">DRILLING LOCATION</label>
          <select 
            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent min-w-[160px]"
            value={filters.selectedLocation}
            onChange={(e) => setFilters(prev => ({ ...prev, selectedLocation: e.target.value }))}
          >
            {filterOptions.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid - Matching PowerBI Layout */}
      <div className="grid grid-cols-5 gap-4">
        {/* First Row - Updated KPI Cards */}
        <KPICard 
          title="Total Cost (YTD)" 
          value={`$${(drillingMetrics.totalCostYTD.value / 1000000).toFixed(1)}M`}
          trend={drillingMetrics.totalCostYTD.trend}
          isPositive={drillingMetrics.totalCostYTD.isPositive}
        />
        <KPICard 
          title="Avg Monthly Cost" 
          value={`$${(drillingMetrics.avgMonthlyCost.value / 1000).toFixed(0)}K`}
          trend={drillingMetrics.avgMonthlyCost.trend}
          isPositive={drillingMetrics.avgMonthlyCost.isPositive}
        />
        <KPICard 
          title="Vessel Visits per Week" 
          value={drillingMetrics.vesselVisitsPerWeek.value}
          trend={drillingMetrics.vesselVisitsPerWeek.trend}
          isPositive={drillingMetrics.vesselVisitsPerWeek.isPositive}
        />
        <KPICard 
          title="Allocated Days" 
          value={drillingMetrics.allocatedDays.value}
          trend={drillingMetrics.allocatedDays.trend}
          isPositive={drillingMetrics.allocatedDays.isPositive}
        />
        <KPICard 
          title="RT Cargo (Tons)" 
          value={drillingMetrics.rtCargoTons.value}
          trend={drillingMetrics.rtCargoTons.trend}
          isPositive={drillingMetrics.rtCargoTons.isPositive}
        />
        
        {/* Second Row */}
        <KPICard 
          title="Fluid Movement" 
          value={drillingMetrics.fluidMovement.value}
          trend={drillingMetrics.fluidMovement.trend}
          isPositive={drillingMetrics.fluidMovement.isPositive}
        />
        <KPICard 
          title="Vessel Utilization" 
          value={drillingMetrics.vesselUtilization.value}
          trend={drillingMetrics.vesselUtilization.trend}
          isPositive={drillingMetrics.vesselUtilization.isPositive}
          unit="%"
        />
        <KPICard 
          title="FSV Runs" 
          value={drillingMetrics.fsvRuns.value}
          trend={drillingMetrics.fsvRuns.trend}
          isPositive={drillingMetrics.fsvRuns.isPositive}
        />
        <KPICard 
          title="Vessel Visits" 
          value={drillingMetrics.vesselVisits.value}
          trend={drillingMetrics.vesselVisits.trend}
          isPositive={drillingMetrics.vesselVisits.isPositive}
        />
        <KPICard 
          title="Maneuvering Hours" 
          value={drillingMetrics.maneuveringHours.value}
          trend={drillingMetrics.maneuveringHours.trend}
          isPositive={drillingMetrics.maneuveringHours.isPositive}
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              {drillingMetrics.totalEvents} events | {drillingMetrics.totalManifests} manifests
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Efficiency Score</div>
            <div className="text-2xl font-bold text-green-600">
              {((drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Productive vs Total Hours</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Cargo Efficiency</div>
            <div className="text-2xl font-bold text-blue-600">
              {drillingMetrics.liftsPerHour.value}
            </div>
            <div className="text-xs text-gray-500">Lifts per Cargo Hour</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Average per Visit</div>
            <div className="text-2xl font-bold text-purple-600">
              {drillingMetrics.vesselVisits.value > 0 ? (drillingMetrics.cargoTons.value / drillingMetrics.vesselVisits.value).toFixed(1) : '0'}
            </div>
            <div className="text-xs text-gray-500">Tons per Vessel Visit</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluid Movements Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Fluid Movements</h3>
            <div className="text-sm text-gray-500">MONTH OVER MONTH</div>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Fluid Movements Chart</p>
              <p className="text-sm text-gray-500 mt-2">Coming in Phase 3</p>
            </div>
          </div>
        </div>

        {/* Productive & Non-Productive Vessel Time */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Productive & Non-Productive Vessel Time</h3>
            <div className="text-sm text-gray-500">{drillingMetrics.totalHours.toFixed(0)} Total Hours</div>
          </div>
          <div className="h-64">
            {/* Simple horizontal bar chart */}
            <div className="space-y-4 h-full flex flex-col justify-center">
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Productive Hours</span>
                  <span>{drillingMetrics.osvProductiveHours.value} hrs ({((drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-green-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {drillingMetrics.osvProductiveHours.value}h
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Non-Productive Hours</span>
                  <span>{drillingMetrics.nonProductiveHours} hrs ({((drillingMetrics.nonProductiveHours / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-red-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.nonProductiveHours / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {drillingMetrics.nonProductiveHours}h
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Cargo Operations</span>
                  <span>{drillingMetrics.cargoOpsHours} hrs ({((drillingMetrics.cargoOpsHours / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.cargoOpsHours / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {drillingMetrics.cargoOpsHours}h
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Waiting Time</span>
                  <span>{drillingMetrics.waitingTime.value} hrs ({((drillingMetrics.waitingTime.value / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-orange-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.waitingTime.value / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {drillingMetrics.waitingTime.value}h
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vessels Split by Type */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">VESSELS</h3>
            <div className="text-sm text-gray-500">SPLIT BY TYPE</div>
          </div>
          <div className="h-64">
            {drillingMetrics.vesselTypeData.length > 0 ? (
              <div className="space-y-4 h-full flex flex-col justify-center">
                {drillingMetrics.vesselTypeData.map((item, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                        <span>{item.type}</span>
                        <span>{item.count} vessels ({item.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div 
                          className={`${colors[index % colors.length]} h-6 rounded-full flex items-center justify-end pr-3 text-white text-xs font-medium`}
                          style={{ width: `${Math.max(10, item.percentage)}%` }}
                        >
                          {item.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 17v4m-4 0h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p className="text-gray-600 font-medium">No vessel data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Breakdown Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">ACTIVITY BREAKDOWN</h3>
            <div className="text-sm text-gray-500">BY HOURS</div>
          </div>
          <div className="h-64">
            {drillingMetrics.activityData.length > 0 ? (
              <div className="space-y-3 h-full flex flex-col justify-center">
                {drillingMetrics.activityData.map((activity, index) => (
                  <div key={activity.name}>
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>{activity.name}</span>
                      <span>{activity.hours.toFixed(1)} hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`${activity.color} h-4 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium`}
                        style={{ width: `${Math.max(5, (activity.hours / drillingMetrics.totalHours) * 100)}%` }}
                      >
                        {activity.hours > 10 ? activity.hours.toFixed(0) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-gray-600 font-medium">No activity data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillingDashboard;