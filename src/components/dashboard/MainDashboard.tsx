// src/components/dashboard/MainDashboard.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';

const MainDashboard: React.FC = () => {
  const { 
    voyageEvents, 
    vesselManifests, 
    masterFacilities, 
    vesselClassifications,
    isDataReady,
    lastUpdated,
    resetToUpload
  } = useData();
  
  const goBackToUpload = () => {
    resetToUpload();
  };

  // Filters state
  const [filters, setFilters] = useState({
    selectedMonth: 'all',
    selectedDepartment: 'all',
    selectedVessel: 'all',
    selectedCompany: 'all'
  });

  // Compute statistics
  const statistics = useMemo(() => {
    const totalVoyageEvents = voyageEvents.length;
    const totalManifests = vesselManifests.length;
    const totalFacilities = masterFacilities.length;
    const uniqueVessels = new Set(voyageEvents.map(ve => ve.vessel)).size;
    
    const totalHours = voyageEvents.reduce((sum, event) => sum + event.finalHours, 0);
    const productiveHours = voyageEvents
      .filter(event => event.activityCategory === 'Productive')
      .reduce((sum, event) => sum + event.finalHours, 0);
    
    const utilizationRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    
    return {
      totalVoyageEvents,
      totalManifests,
      totalFacilities,
      uniqueVessels,
      totalHours: Math.round(totalHours),
      productiveHours: Math.round(productiveHours),
      utilizationRate: Math.round(utilizationRate * 10) / 10
    };
  }, [voyageEvents, vesselManifests, masterFacilities]);

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
    
    const months = Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value)) // Sort chronologically
      .map(item => item.label); // Extract just the labels for the current format
    
    const departments = Array.from(new Set(voyageEvents.map(ve => ve.department))).filter(dept => dept !== undefined) as ("Drilling" | "Production" | "Logistics")[];
    const vessels = Array.from(new Set(voyageEvents.map(ve => ve.vessel))).sort();
    const companies = Array.from(new Set(vesselClassifications.map(vc => vc.company))).sort();

    return { months, departments, vessels, companies };
  }, [voyageEvents, vesselClassifications]);

  if (!isDataReady || voyageEvents.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Operations Analytics</h2>
          <p className="text-gray-600">
            Real-time insights into offshore vessel operations and cargo logistics
          </p>
        </div>
        <button
          onClick={goBackToUpload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Upload
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <select 
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                value={filters.selectedMonth}
                onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
              >
                <option value="all">All Months</option>
                {filterOptions.months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Department:</label>
              <select 
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                value={filters.selectedDepartment}
                onChange={(e) => setFilters(prev => ({ ...prev, selectedDepartment: e.target.value }))}
              >
                <option value="all">All Departments</option>
                {filterOptions.departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Vessel Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Vessel:</label>
              <select 
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                value={filters.selectedVessel}
                onChange={(e) => setFilters(prev => ({ ...prev, selectedVessel: e.target.value }))}
              >
                <option value="all">All Vessels</option>
                {filterOptions.vessels.map(vessel => (
                  <option key={vessel} value={vessel}>{vessel}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-md transition-colors"
            onClick={() => setFilters({
              selectedMonth: 'all',
              selectedDepartment: 'all',
              selectedVessel: 'all',
              selectedCompany: 'all'
            })}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Hours KPI */}
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Hours</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.totalHours.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-green-600">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">5.2%</span>
                </div>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2v6m0 4v8m0-8a4 4 0 100 8 4 4 0 000-8zm-7 4h6m4 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Productive Hours KPI */}
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Productive Hours</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.productiveHours.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-green-600">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">3.1%</span>
                </div>
                <span className="text-xs text-gray-500">improvement</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Utilization Rate KPI */}
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Utilization Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.utilizationRate}%</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-yellow-500">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">1.8%</span>
                </div>
                <span className="text-xs text-gray-500">needs attention</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-md flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Active Vessels KPI */}
        <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Vessels</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.uniqueVessels}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-blue-600">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h2a1 1 0 100-2 2 2 0 00-2 2v11a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Stable</span>
                </div>
                <span className="text-xs text-gray-500">fleet size</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M9 17v4m6-4v4M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Activity Breakdown</h3>
            <button className="p-2 hover:bg-gray-50 rounded-md transition-colors">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Interactive Chart</p>
              <p className="text-sm text-gray-500 mt-2">Coming in Phase 3</p>
            </div>
          </div>
        </div>

        {/* Vessel Distribution Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Vessel Distribution</h3>
            <button className="p-2 hover:bg-gray-50 rounded-md transition-colors">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Fleet Overview</p>
              <p className="text-sm text-gray-500 mt-2">Visualization pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Summary Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Data Processing Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{statistics.totalVoyageEvents}</p>
              <p className="text-sm text-gray-600 mt-1">Voyage Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{statistics.totalManifests}</p>
              <p className="text-sm text-gray-600 mt-1">Vessel Manifests</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{statistics.totalFacilities}</p>
              <p className="text-sm text-gray-600 mt-1">Facilities</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{statistics.uniqueVessels}</p>
              <p className="text-sm text-gray-600 mt-1">Unique Vessels</p>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0016 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-700">
                Data successfully processed at {lastUpdated ? lastUpdated.toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;