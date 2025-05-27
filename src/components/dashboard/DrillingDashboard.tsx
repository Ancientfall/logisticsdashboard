import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';

const DrillingDashboard: React.FC = () => {
  const { 
    voyageEvents, 
    vesselManifests, 
    isDataReady,
    resetToUpload
  } = useData();

  // Filters state - matching PowerBI layout
  const [filters, setFilters] = useState({
    selectedMonth: 'Apr-25',
    selectedLocation: 'Ocean BlackLion'
  });

  // Calculate drilling-specific KPIs
  const drillingMetrics = useMemo(() => {
    // Filter for drilling department only
    const drillingEvents = voyageEvents.filter(event => event.department === 'Drilling');
    const drillingManifests = vesselManifests.filter(manifest => manifest.finalDepartment === 'Drilling');
    
    // Calculate Lifts/Hr
    const totalLifts = drillingManifests.reduce((sum, manifest) => sum + manifest.lifts, 0);
    const cargoOpsHours = drillingEvents
      .filter(event => event.parentEvent === 'Cargo Ops')
      .reduce((sum, event) => sum + event.finalHours, 0);
    const liftsPerHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
    
    // Calculate Waiting Time Offshore
    const waitingEvents = drillingEvents.filter(event => 
      event.parentEvent === 'Waiting on Installation' && event.portType === 'rig'
    );
    const waitingTimeOffshore = waitingEvents.reduce((sum, event) => sum + event.finalHours, 0);
    
    // Calculate FSV Runs (unique voyages)
    const uniqueVoyages = new Set(drillingEvents.map(event => event.voyageNumber));
    const fsvRuns = uniqueVoyages.size;
    
    // Calculate Maneuvering Hours
    const maneuveringHours = drillingEvents
      .filter(event => event.parentEvent === 'Maneuvering')
      .reduce((sum, event) => sum + event.finalHours, 0);
    
    // Calculate Vessel Visits
    const vesselVisits = drillingManifests.length;
    
    // Calculate Cargo Tons
    const cargoTons = drillingManifests.reduce((sum, manifest) => sum + manifest.deckTons, 0);
    
    // Calculate OSV Productive Hours
    const productiveHours = drillingEvents
      .filter(event => event.activityCategory === 'Productive')
      .reduce((sum, event) => sum + event.finalHours, 0);
    
    // Calculate RT Cargo (Tons)
    const rtCargoTons = drillingManifests.reduce((sum, manifest) => sum + manifest.rtTons, 0);
    
    // Calculate Vessel Utilization
    const totalHours = drillingEvents.reduce((sum, event) => sum + event.finalHours, 0);
    const vesselUtilization = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    
    // Mock trend calculations (in real implementation, compare with previous month)
    return {
      cargoTons: { value: Math.round(cargoTons), trend: 44.5, isPositive: true },
      liftsPerHour: { value: Number(liftsPerHour.toFixed(2)), trend: 15.9, isPositive: false },
      osvProductiveHours: { value: Math.round(productiveHours), trend: 26.7, isPositive: true },
      waitingTime: { value: Math.round(waitingTimeOffshore), trend: 95.6, isPositive: true },
      rtCargoTons: { value: Number(rtCargoTons.toFixed(2)), trend: 62.9, isPositive: false },
      fluidMovement: { value: 'N/A', trend: null, isPositive: null },
      vesselUtilization: { value: Math.round(vesselUtilization), trend: 1.0, isPositive: false },
      fsvRuns: { value: fsvRuns, trend: 33.3, isPositive: false },
      vesselVisits: { value: vesselVisits, trend: null, isPositive: null },
      maneuveringHours: { value: Number(maneuveringHours.toFixed(2)), trend: 24.4, isPositive: true }
    };
  }, [voyageEvents, vesselManifests]);

  // Get filter options
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(voyageEvents.map(ve => ve.monthName))).sort();
    const locations = Array.from(new Set(voyageEvents
      .filter(ve => ve.department === 'Drilling')
      .map(ve => ve.location)
    )).sort();

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
          onClick={resetToUpload}
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
        {/* First Row */}
        <KPICard 
          title="Cargo Tons" 
          value={drillingMetrics.cargoTons.value}
          trend={drillingMetrics.cargoTons.trend}
          isPositive={drillingMetrics.cargoTons.isPositive}
        />
        <KPICard 
          title="Lifts/Hr" 
          value={drillingMetrics.liftsPerHour.value}
          trend={drillingMetrics.liftsPerHour.trend}
          isPositive={drillingMetrics.liftsPerHour.isPositive}
        />
        <KPICard 
          title="OSV Prod. Hrs" 
          value={drillingMetrics.osvProductiveHours.value}
          trend={drillingMetrics.osvProductiveHours.trend}
          isPositive={drillingMetrics.osvProductiveHours.isPositive}
        />
        <KPICard 
          title="Waiting Time" 
          value={drillingMetrics.waitingTime.value}
          trend={drillingMetrics.waitingTime.trend}
          isPositive={drillingMetrics.waitingTime.isPositive}
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

      {/* Charts Section - Placeholder for now */}
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
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Time Analysis Chart</p>
              <p className="text-sm text-gray-500 mt-2">Visualization pending</p>
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
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M9 17v4m6-4v4M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Vessel Type Distribution</p>
              <p className="text-sm text-gray-500 mt-2">Chart coming soon</p>
            </div>
          </div>
        </div>

        {/* Offshore Hours by Key Activities */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Offshore Hours by Key Activities</h3>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Activity Breakdown</p>
              <p className="text-sm text-gray-500 mt-2">Bar chart pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillingDashboard; 