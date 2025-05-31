import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getVesselTypeFromName } from '../../data/vesselClassification';
import { getProductionFacilities } from '../../data/masterFacilities';
import KPICard from './KPICard';

interface ProductionDashboardProps {
  onNavigateToUpload?: () => void;
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    voyageList,
    isDataReady
  } = useData();

  // Filters state - matching PowerBI layout
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations'
  });

  // Calculate production-specific KPIs
  const productionMetrics = useMemo(() => {
    // Filter data based on selected filters
    const filterByDate = (date: Date) => {
      if (filters.selectedMonth === 'all' || filters.selectedMonth === 'All Months') return true;
      const itemDate = new Date(date);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    };

    const filterByLocation = (location: string) => {
      if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') return true;
      
      // Get all production facilities to map display names to location names
      const productionFacilities = getProductionFacilities();
      const selectedFacility = productionFacilities.find(f => f.displayName === filters.selectedLocation);
      
      // Check against both display name and location name
      return location === filters.selectedLocation || 
             (selectedFacility && (
               location === selectedFacility.locationName ||
               location === selectedFacility.displayName
             ));
    };

    // Apply filters to data - Enhanced logic for production locations
    const filteredVoyageEvents = voyageEvents.filter(event => {
      // For production locations, use location + time filtering primarily
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations') {
        
        // For production locations: Include ALL events at that location during the time period
        // This captures production activities regardless of department classification
        return filterByDate(event.eventDate) && filterByLocation(event.location);
      }
      
      // For non-production locations, use the original logic
      const isProductionRelated = event.department === 'Production' || 
                                 event.department === 'Logistics' ||
                                 !event.department; // Include events without department classification
      
      return isProductionRelated &&
             filterByDate(event.eventDate) &&
             filterByLocation(event.location);
    });

    const filteredVesselManifests = vesselManifests.filter(manifest => {
      // For production locations, use location + time filtering primarily
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations') {
        
        // For production locations: Include ALL manifests at that location during the time period
        // This captures production activities regardless of department classification
        return filterByDate(manifest.manifestDate) && filterByLocation(manifest.mappedLocation);
      }
      
      // For non-production locations, use the original logic
      const isProductionRelated = manifest.finalDepartment === 'Production' ||
                                 manifest.finalDepartment === 'Logistics' ||
                                 !manifest.finalDepartment; // Include manifests without department classification
      
      return isProductionRelated &&
             filterByDate(manifest.manifestDate) &&
             filterByLocation(manifest.mappedLocation);
    });

    // Calculate KPIs based on filtered data using exact PowerBI DAX logic
    
    // 1. Cargo Tons - Total cargo moved (Deck Tons + RT Tons)
    const deckTons = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.deckTons || 0), 0);
    const rtTons = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.rtTons || 0), 0);
    const cargoTons = deckTons + rtTons;
    
    // 2. Lifts/Hr - Efficiency metric using actual cargo operations hours
    const totalLifts = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.lifts || 0), 0);
    const cargoOpsHours = filteredVoyageEvents
      .filter(event => event.parentEvent === 'Cargo Ops')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const liftsPerHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
    
    // 3. Productive Hours - Time spent on productive activities
    const osvProductiveHours = filteredVoyageEvents
      .filter(event => event.activityCategory === 'Productive')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 4. Waiting Time - Non-productive time offshore
    const waitingTimeOffshore = filteredVoyageEvents
      .filter(event => event.parentEvent === 'Waiting on Weather' || event.parentEvent === 'Waiting on Installation')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 5. Vessel Utilization - Productive hours vs total offshore time
    const totalOffshoreHours = filteredVoyageEvents
      .filter(event => event.portType === 'rig')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const vesselUtilization = totalOffshoreHours > 0 ? (osvProductiveHours / totalOffshoreHours) * 100 : 0;
    
    // 6. Voyage Efficiency - Using voyage list data for better accuracy with filtering
    const productionVoyages = voyageList.filter(voyage => {
      const isProduction = voyage.voyagePurpose === 'Production' || voyage.voyagePurpose === 'Mixed';
      
      // Apply location filter if not "All Locations"
      if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
        const locationMatch = filterByLocation(voyage.mainDestination || voyage.originPort || voyage.locations || '');
        if (!locationMatch) return false;
      }
      
      // Apply date filter if not "All Months"
      if (filters.selectedMonth !== 'all' && filters.selectedMonth !== 'All Months') {
        const dateMatch = filterByDate(voyage.startDate || voyage.voyageDate || new Date());
        if (!dateMatch) return false;
      }
      
      return isProduction;
    });
    const fsvRuns = productionVoyages.length;
    
    // 7. Vessel Visits - Unique manifest entries (actual visits)
    const vesselVisits = filteredVesselManifests.length;
    
    // 8. Maneuvering Hours - Setup and positioning activities
    const maneuveringHours = filteredVoyageEvents
      .filter(event => 
        event.parentEvent === 'Maneuvering' ||
        event.event?.toLowerCase().includes('maneuvering') ||
        event.event?.toLowerCase().includes('positioning') ||
        event.event?.toLowerCase().includes('setup') ||
        event.event?.toLowerCase().includes('shifting')
      )
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 9. Non-Productive Time Analysis
    const nonProductiveHours = filteredVoyageEvents
      .filter(event => event.activityCategory === 'Non-Productive')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const totalHours = filteredVoyageEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const nptPercentage = totalHours > 0 ? (nonProductiveHours / totalHours) * 100 : 0;
    
    // 10. Weather Impact Analysis
    const weatherWaitingHours = filteredVoyageEvents
      .filter(event => event.parentEvent === 'Waiting on Weather')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const weatherImpactPercentage = totalOffshoreHours > 0 ? (weatherWaitingHours / totalOffshoreHours) * 100 : 0;

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
      rtCargoTons: (rtTons || 0) * 1.08,
      vesselUtilization: (vesselUtilization || 0) * 0.98,
      fsvRuns: (fsvRuns || 0) * 0.91,
      vesselVisits: (vesselVisits || 0) * 0.95,
      maneuveringHours: (maneuveringHours || 0) * 1.12
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
        value: Number((Number(rtTons) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(rtTons) || 0, mockPreviousPeriod.rtCargoTons).toFixed(1)), 
        isPositive: (Number(rtTons) || 0) < mockPreviousPeriod.rtCargoTons // Lower RT cargo might be better
      },
      vesselUtilization: { 
        value: Number(vesselUtilization.toFixed(1)), 
        trend: Number(calculateTrend(vesselUtilization, mockPreviousPeriod.vesselUtilization).toFixed(1)), 
        isPositive: vesselUtilization > mockPreviousPeriod.vesselUtilization 
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
        value: Math.round(maneuveringHours), 
        trend: Number(calculateTrend(maneuveringHours, mockPreviousPeriod.maneuveringHours).toFixed(1)), 
        isPositive: maneuveringHours < mockPreviousPeriod.maneuveringHours // Lower maneuvering hours is better
      },
      nptPercentage: {
        value: Number(nptPercentage.toFixed(1)),
        trend: 0, // Would need historical data for trend
        isPositive: false // Lower NPT is always better
      },
      weatherImpact: {
        value: Number(weatherImpactPercentage.toFixed(1)),
        trend: 0, // Would need historical data for trend
        isPositive: false // Lower weather impact is better
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
          // Use vessel classification data for accurate type detection
          const type = getVesselTypeFromName(vessel);
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
  }, [voyageEvents, vesselManifests, voyageList, filters]);

  // Get filter options
  const filterOptions = useMemo(() => {
    // Create month options with proper chronological sorting from actual data
    const monthMap = new Map<string, string>();
    
    // Add months from voyage events - using eventDate as primary source
    voyageEvents.forEach(event => {
      if (event.eventDate) {
        const eventDate = new Date(event.eventDate);
        if (!isNaN(eventDate.getTime())) {
          const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = eventDate.toLocaleString('default', { month: 'long' });
          const label = `${monthName} ${eventDate.getFullYear()}`;
          monthMap.set(monthKey, label);
        }
      }
    });
    
    // Add months from vessel manifests - using manifestDate 
    vesselManifests.forEach(manifest => {
      if (manifest.manifestDate) {
        const manifestDate = new Date(manifest.manifestDate);
        if (!isNaN(manifestDate.getTime())) {
          const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = manifestDate.toLocaleString('default', { month: 'long' });
          const label = `${monthName} ${manifestDate.getFullYear()}`;
          monthMap.set(monthKey, label);
        }
      }
    });
    
    // Add months from voyage list - using startDate
    voyageList.forEach(voyage => {
      if (voyage.startDate) {
        const voyageDate = new Date(voyage.startDate);
        if (!isNaN(voyageDate.getTime())) {
          const monthKey = `${voyageDate.getFullYear()}-${String(voyageDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = voyageDate.toLocaleString('default', { month: 'long' });
          const label = `${monthName} ${voyageDate.getFullYear()}`;
          monthMap.set(monthKey, label);
        }
      }
    });
    
    // Convert to sorted array and log results
    const sortedMonths = Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value)); // Sort chronologically
      
    const months = ['All Months', ...sortedMonths.map(item => item.label)];
    
    // Get production locations from master facilities data
    const productionFacilities = getProductionFacilities();
    const locations = ['All Locations', ...productionFacilities.map(facility => facility.displayName)];

    return { months, locations };
  }, [voyageEvents, vesselManifests, voyageList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">GoA PRODUCTION PERFORMANCE</h2>
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
          <label className="text-sm font-medium text-gray-700">PRODUCTION LOCATION</label>
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

      {/* KPI Cards Grid - Enhanced Production Operations */}
      <div className="grid grid-cols-5 gap-4">
        {/* First Row - Core Operational Metrics */}
        <KPICard 
          title="Cargo Tons" 
          value={productionMetrics.cargoTons.value.toLocaleString()}
          trend={productionMetrics.cargoTons.trend}
          isPositive={productionMetrics.cargoTons.isPositive}
          unit="tons"
        />
        <KPICard 
          title="Lifts per Hour" 
          value={productionMetrics.liftsPerHour.value}
          trend={productionMetrics.liftsPerHour.trend}
          isPositive={productionMetrics.liftsPerHour.isPositive}
          unit="lifts/hr"
        />
        <KPICard 
          title="Productive Hours" 
          value={productionMetrics.osvProductiveHours.value}
          trend={productionMetrics.osvProductiveHours.trend}
          isPositive={productionMetrics.osvProductiveHours.isPositive}
          unit="hrs"
        />
        <KPICard 
          title="Waiting Time" 
          value={productionMetrics.waitingTime.value}
          trend={productionMetrics.waitingTime.trend}
          isPositive={productionMetrics.waitingTime.isPositive}
          unit="hrs"
        />
        <KPICard 
          title="Vessel Utilization" 
          value={productionMetrics.vesselUtilization.value}
          trend={productionMetrics.vesselUtilization.trend}
          isPositive={productionMetrics.vesselUtilization.isPositive}
          unit="%"
        />
        
        {/* Second Row - Efficiency & Performance Metrics */}
        <KPICard 
          title="RT Cargo Tons" 
          value={productionMetrics.rtCargoTons.value.toLocaleString()}
          trend={productionMetrics.rtCargoTons.trend}
          isPositive={productionMetrics.rtCargoTons.isPositive}
          unit="tons"
        />
        <KPICard 
          title="NPT Percentage" 
          value={productionMetrics.nptPercentage?.value.toFixed(1) || '0.0'}
          trend={productionMetrics.nptPercentage?.trend}
          isPositive={productionMetrics.nptPercentage?.isPositive}
          unit="%"
        />
        <KPICard 
          title="Weather Impact" 
          value={productionMetrics.weatherImpact?.value.toFixed(1) || '0.0'}
          trend={productionMetrics.weatherImpact?.trend}
          isPositive={productionMetrics.weatherImpact?.isPositive}
          unit="%"
        />
        <KPICard 
          title="Production Voyages" 
          value={productionMetrics.fsvRuns.value}
          trend={productionMetrics.fsvRuns.trend}
          isPositive={productionMetrics.fsvRuns.isPositive}
          unit="voyages"
        />
        <KPICard 
          title="Maneuvering Hours" 
          value={productionMetrics.maneuveringHours.value}
          trend={productionMetrics.maneuveringHours.trend}
          isPositive={productionMetrics.maneuveringHours.isPositive}
          unit="hrs"
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              {productionMetrics.totalEvents.toLocaleString()} events | {productionMetrics.totalManifests.toLocaleString()} manifests | {productionMetrics.fsvRuns.value.toLocaleString()} voyages
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Efficiency Score</div>
            <div className="text-2xl font-bold text-green-600">
              {((productionMetrics.osvProductiveHours.value / productionMetrics.totalHours) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Productive vs Total Hours</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Cargo Efficiency</div>
            <div className="text-2xl font-bold text-blue-600">
              {productionMetrics.liftsPerHour.value}
            </div>
            <div className="text-xs text-gray-500">Lifts per Cargo Hour</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Vessel Utilization</div>
            <div className="text-2xl font-bold text-purple-600">
              {productionMetrics.vesselUtilization.value.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Productive vs Offshore Hours</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vessels Split by Type */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">VESSELS</h3>
            <div className="text-sm text-gray-500">SPLIT BY TYPE</div>
          </div>
          <div className="h-64">
            {productionMetrics.vesselTypeData.length > 0 ? (
              <div className="space-y-4 h-full flex flex-col justify-center">
                {productionMetrics.vesselTypeData.map((item, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                        <span>{item.type}</span>
                        <span>{item.count} vessels ({item.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`${colors[index % colors.length]} h-4 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium`}
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
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-gray-600 font-medium">No vessel data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Breakdown */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">ACTIVITY</h3>
            <div className="text-sm text-gray-500">BREAKDOWN BY TYPE</div>
          </div>
          <div className="h-64">
            {productionMetrics.activityData.length > 0 ? (
              <div className="space-y-3 h-full flex flex-col justify-center">
                {productionMetrics.activityData.map((activity, index) => (
                  <div key={activity.name}>
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>{activity.name}</span>
                      <span>{Math.round(activity.hours).toLocaleString()} hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`${activity.color} h-4 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium`}
                        style={{ width: `${Math.max(5, (activity.hours / productionMetrics.totalHours) * 100)}%` }}
                      >
                        {activity.hours > 10 ? Math.round(activity.hours).toLocaleString() : ''}
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

export default ProductionDashboard; 