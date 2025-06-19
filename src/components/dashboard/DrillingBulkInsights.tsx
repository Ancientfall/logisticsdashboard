import React, { useMemo, useEffect } from 'react';
import { BulkAction } from '../../types';
import { Droplet, Beaker, AlertCircle, MapPin } from 'lucide-react';
import { debugBulkFluidClassification } from '../../utils/bulkFluidDebugger';

// Helper function to format numbers without decimals
const formatWholeNumber = (value: number): string => {
  return Math.round(value).toLocaleString('en-US');
};

// Helper function to normalize location names for comparison
const normalizeLocationForComparison = (location: string): string => {
  // Remove drilling/production indicators
  return location
    .replace(/\s*\(Drilling\)\s*/i, '')
    .replace(/\s*\(Production\)\s*/i, '')
    .replace(/\s*Drilling\s*/i, '')
    .replace(/\s*Production\s*/i, '')
    .trim()
    .toLowerCase();
};

interface DrillingBulkInsightsProps {
  bulkActions: BulkAction[];
  selectedVessel?: string;
  selectedLocation?: string;
  dateRange?: [Date | null, Date | null];
}

const DrillingBulkInsights: React.FC<DrillingBulkInsightsProps> = ({
  bulkActions,
  selectedVessel,
  selectedLocation,
  dateRange
}) => {
  // Debug logging on component mount
  useEffect(() => {
    console.log('🚀 DrillingBulkInsights component mounted');
    console.log('📊 Initial bulk actions count:', bulkActions.length);
    
    if (bulkActions.length === 0) {
      console.warn('⚠️ No bulk actions provided to DrillingBulkInsights component');
    } else {
      console.log('📋 First few bulk actions:', bulkActions.slice(0, 3).map(a => ({
        date: a.startDate?.toISOString(),
        volume: a.volumeBbls,
        isDrillingFluid: a.isDrillingFluid,
        isCompletionFluid: a.isCompletionFluid
      })));
    }
  }, [bulkActions]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 DrillingBulkInsights - Total bulk actions:', bulkActions.length);
    if (bulkActions.length > 0) {
      const debugInfo = debugBulkFluidClassification(bulkActions);
      console.log('🔍 Debug Info:', debugInfo);
      
      // Log a few sample bulk actions
      console.log('📋 Sample bulk actions:', bulkActions.slice(0, 5).map(a => ({
        bulkType: a.bulkType,
        description: a.bulkDescription,
        isDrillingFluid: a.isDrillingFluid,
        isCompletionFluid: a.isCompletionFluid,
        fluidCategory: a.fluidCategory,
        fluidSpecificType: a.fluidSpecificType
      })));
    }
  }, [bulkActions]);
  // Filter bulk actions based on props
  const filteredBulkActions = useMemo(() => {
    // Ensure bulkActions is defined
    if (!bulkActions || !Array.isArray(bulkActions)) {
      console.error('❌ bulkActions is not an array:', bulkActions);
      return [];
    }

    console.log('🔍 Filtering bulk actions:', {
      totalActions: bulkActions.length,
      selectedVessel,
      selectedLocation,
      normalizedLocation: selectedLocation ? normalizeLocationForComparison(selectedLocation) : null,
      dateRange: dateRange ? [dateRange[0]?.toISOString(), dateRange[1]?.toISOString()] : null
    });
    
    // ENHANCED MAD DOG DEBUGGING
    if (selectedLocation && normalizeLocationForComparison(selectedLocation).includes('mad dog')) {
      console.log('🐕 MAD DOG DEBUGGING ACTIVE');
      
      // Check all Mad Dog related bulk actions
      const madDogActions = bulkActions.filter(action => {
        if (!action) return false;
        const destination = normalizeLocationForComparison(action.standardizedDestination || '');
        const origin = normalizeLocationForComparison(action.standardizedOrigin || '');
        return destination.includes('mad dog') || origin.includes('mad dog');
      });
      
      console.log(`🐕 Total Mad Dog bulk actions: ${madDogActions.length}`);
      
      if (madDogActions.length > 0) {
        // Analyze Mad Dog action properties
        const madDogAnalysis = {
          withDrillingFluid: madDogActions.filter(a => a.isDrillingFluid).length,
          withCompletionFluid: madDogActions.filter(a => a.isCompletionFluid).length,
          withRigPortType: madDogActions.filter(a => a.portType === 'rig').length,
          withLoadAction: madDogActions.filter(a => a.action && a.action.toLowerCase().includes('load')).length,
          withOffloadAction: madDogActions.filter(a => a.action && a.action.toLowerCase().includes('offload')).length,
          uniqueActions: [...new Set(madDogActions.map(a => a.action))],
          uniquePortTypes: [...new Set(madDogActions.map(a => a.portType))],
          uniqueBulkTypes: [...new Set(madDogActions.map(a => a.bulkType))],
          uniqueDestinations: [...new Set(madDogActions.map(a => a.standardizedDestination).filter(Boolean))]
        };
        
        console.log('🐕 Mad Dog Analysis:', madDogAnalysis);
        
        // Check which Mad Dog actions meet Enhanced Fluid Analytics criteria
        const qualifyingMadDogActions = madDogActions.filter(action => {
          return (action.isDrillingFluid || action.isCompletionFluid) &&
                 (action.action && (action.action.toLowerCase().includes('offload') || action.action.toLowerCase().includes('load'))) &&
                 (action.portType === 'rig');
        });
        
        console.log(`🐕 Mad Dog actions meeting Enhanced Fluid Analytics criteria: ${qualifyingMadDogActions.length}`);
        
        if (qualifyingMadDogActions.length > 0) {
          console.log('🐕 Sample qualifying Mad Dog actions:', qualifyingMadDogActions.slice(0, 3).map(a => ({
            bulkType: a.bulkType,
            action: a.action,
            portType: a.portType,
            isDrillingFluid: a.isDrillingFluid,
            isCompletionFluid: a.isCompletionFluid,
            destination: a.standardizedDestination,
            volumeBbls: a.volumeBbls
          })));
        } else {
          console.log('🐕 No Mad Dog actions meet criteria. Sample actions:');
          madDogActions.slice(0, 5).forEach((action, i) => {
            console.log(`  ${i + 1}. ${action.bulkType} - Action: "${action.action}", PortType: "${action.portType}", Drilling: ${action.isDrillingFluid}, Completion: ${action.isCompletionFluid}`);
          });
        }
      }
    }
    
    const drillingAndCompletionFluids = bulkActions.filter(action => 
      action && (action.isDrillingFluid || action.isCompletionFluid)
    );
    console.log('📊 Drilling/Completion fluids:', drillingAndCompletionFluids.length);
    
    // Debug: Show unique locations in bulk actions
    if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== 'All Locations') {
      const uniqueLocations = new Set<string>();
      drillingAndCompletionFluids.forEach(action => {
        if (action.standardizedDestination) uniqueLocations.add(action.standardizedDestination);
        if (action.standardizedOrigin) uniqueLocations.add(action.standardizedOrigin);
      });
      console.log('📍 Unique locations in bulk actions:', Array.from(uniqueLocations));
    }
    
    const filtered = bulkActions.filter(action => {
      // Safety check for null/undefined action
      if (!action) return false;
      
      // Only include drilling and completion fluids
      if (!action.isDrillingFluid && !action.isCompletionFluid) return false;
      
      // Apply filters
      if (selectedVessel && selectedVessel !== 'all' && action.vesselName !== selectedVessel) return false;
      if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== 'All Locations') {
        const normalizedSelected = normalizeLocationForComparison(selectedLocation);
        const normalizedDestination = normalizeLocationForComparison(action.standardizedDestination || '');
        
        // FIXED: Only count deliveries TO the location (destination), not from the location (origin)
        // This prevents double-counting the same fluid volume for both load and discharge operations
        if (normalizedDestination !== normalizedSelected) return false;
      }
      
      // Safe date range check
      if (dateRange && dateRange[0] && dateRange[1]) {
        // Ensure action.startDate is valid
        if (!action.startDate || !(action.startDate instanceof Date)) {
          console.log('📅 Invalid date:', action.startDate);
          return false;
        }
        
        try {
          if (action.startDate < dateRange[0] || action.startDate > dateRange[1]) {
            return false;
          }
        } catch (error) {
          console.error('❌ Error comparing dates:', error);
          return false;
        }
      }
      
      return true;
    });
    
    console.log('✅ Filtered results:', filtered ? filtered.length : 0);
    
    // Debug: Log sample of filtered actions
    if (filtered && filtered.length > 0) {
      console.log('📋 Sample filtered actions:', filtered.slice(0, 3).map(a => ({
        date: a.startDate ? a.startDate.toISOString() : 'no date',
        volume: a.volumeBbls || 0,
        location: a.standardizedDestination || a.standardizedOrigin || 'no location',
        isDrillingFluid: a.isDrillingFluid || false,
        isCompletionFluid: a.isCompletionFluid || false
      })));
    } else {
      console.log('❌ No filtered actions found!');
    }
    
    return filtered || [];
  }, [bulkActions, selectedVessel, selectedLocation, dateRange]);

  // Calculate drilling fluid metrics
  const drillingFluidMetrics = useMemo(() => {
    const drillingFluids = filteredBulkActions.filter(a => a.isDrillingFluid);
    
    const metrics = {
      totalVolume: 0,
      byType: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      transfers: drillingFluids.length,
      loadOperations: 0,
      dischargeOperations: 0,
      returns: 0
    };
    
    drillingFluids.forEach(action => {
      metrics.totalVolume += action.volumeBbls;
      
      // By type
      const type = action.fluidSpecificType || 'Other Drilling Fluid';
      metrics.byType[type] = (metrics.byType[type] || 0) + action.volumeBbls;
      
      // By location
      const location = action.standardizedDestination || action.standardizedOrigin;
      metrics.byLocation[location] = (metrics.byLocation[location] || 0) + action.volumeBbls;
      
      // Operation types
      const actionLower = action.action.toLowerCase();
      if (actionLower.includes('load')) metrics.loadOperations++;
      if (actionLower.includes('discharge')) metrics.dischargeOperations++;
      if (action.isReturn) metrics.returns++;
    });
    
    return metrics;
  }, [filteredBulkActions]);

  // Calculate completion fluid metrics
  const completionFluidMetrics = useMemo(() => {
    const completionFluids = filteredBulkActions.filter(a => a.isCompletionFluid);
    
    const metrics = {
      totalVolume: 0,
      byType: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      transfers: completionFluids.length,
      loadOperations: 0,
      dischargeOperations: 0,
      returns: 0
    };
    
    completionFluids.forEach(action => {
      metrics.totalVolume += action.volumeBbls;
      
      // By type
      const type = action.fluidSpecificType || 'Other Completion Fluid';
      metrics.byType[type] = (metrics.byType[type] || 0) + action.volumeBbls;
      
      // By location
      const location = action.standardizedDestination || action.standardizedOrigin;
      metrics.byLocation[location] = (metrics.byLocation[location] || 0) + action.volumeBbls;
      
      // Operation types
      const actionLower = action.action.toLowerCase();
      if (actionLower.includes('load')) metrics.loadOperations++;
      if (actionLower.includes('discharge')) metrics.dischargeOperations++;
      if (action.isReturn) metrics.returns++;
    });
    
    return metrics;
  }, [filteredBulkActions]);

  // Calculate top transfer routes
  const topTransferRoutes = useMemo(() => {
    const routes = filteredBulkActions.reduce((acc, action) => {
      if (action.standardizedDestination) {
        const route = `${action.standardizedOrigin} → ${action.standardizedDestination}`;
        if (!acc[route]) {
          acc[route] = { 
            count: 0, 
            volume: 0, 
            drillingVolume: 0, 
            completionVolume: 0,
            types: new Set<string>() 
          };
        }
        acc[route].count++;
        acc[route].volume += action.volumeBbls;
        if (action.isDrillingFluid) acc[route].drillingVolume += action.volumeBbls;
        if (action.isCompletionFluid) acc[route].completionVolume += action.volumeBbls;
        acc[route].types.add(action.fluidSpecificType || action.bulkType);
      }
      return acc;
    }, {} as Record<string, { count: number; volume: number; drillingVolume: number; completionVolume: number; types: Set<string> }>);

    return Object.entries(routes)
      .map(([route, data]) => ({
        route,
        count: data.count,
        volume: data.volume,
        drillingVolume: data.drillingVolume,
        completionVolume: data.completionVolume,
        types: Array.from(data.types)
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [filteredBulkActions]);

  // Calculate recent trends and daily data
  // NOTE: Commented out as it's not currently used in the UI
  /* const recentTrends = useMemo(() => {
    try {
      console.log('Calculating recent trends with filtered bulk actions:', filteredBulkActions.length);
      
      // Safety check
      if (!filteredBulkActions || !Array.isArray(filteredBulkActions)) {
        console.error('❌ filteredBulkActions is not an array in recentTrends calculation');
        return {
          currentVolume: 0,
          previousVolume: 0,
          volumeChange: 0,
          currentTransfers: 0,
          previousTransfers: 0,
          dailyVolumes: Array(30).fill(0),
          hasRealData: false
        };
      }
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      // Ensure we have valid dates for comparison
      const last30Days = filteredBulkActions.filter(a => a && a.startDate && a.startDate instanceof Date && a.startDate >= thirtyDaysAgo);
      const previous30Days = filteredBulkActions.filter(a => a && a.startDate && a.startDate instanceof Date && a.startDate >= sixtyDaysAgo && a.startDate < thirtyDaysAgo);
      
      console.log('Last 30 days actions:', last30Days.length);
      console.log('Previous 30 days actions:', previous30Days.length);
      
      const currentVolume = last30Days.reduce((sum, a) => sum + (a.volumeBbls || 0), 0);
      const previousVolume = previous30Days.reduce((sum, a) => sum + (a.volumeBbls || 0), 0);
      
      console.log('Current volume:', currentVolume);
      console.log('Previous volume:', previousVolume);
      
      // Calculate volume change percentage
      let volumeChange = 0;
      if (previousVolume > 0) {
        volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;
      } else if (currentVolume > 0) {
        volumeChange = 100; // If previous was 0 but current has value, show 100% increase
      } else if (currentVolume === 0 && previousVolume === 0) {
        volumeChange = 0; // Both zero, no change
      }
      
      console.log('Volume change percentage:', volumeChange);
      
      // Generate daily volume data for the last 30 days
      const dailyVolumes = Array(30).fill(0);
      
      // Populate with actual data where available
      last30Days.forEach(action => {
        if (!action || !action.startDate || !(action.startDate instanceof Date)) return;
        
        try {
          const daysAgo = Math.floor((now.getTime() - action.startDate.getTime()) / (24 * 60 * 60 * 1000));
          if (daysAgo >= 0 && daysAgo < 30) {
            dailyVolumes[29 - daysAgo] += (action.volumeBbls || 0); // Most recent day at the end of the array
          }
        } catch (error) {
          console.error('❌ Error calculating days ago:', error);
        }
      });
      
      // If we have no data at all, add some sample data to show the visualization
      const hasRealData = dailyVolumes.some(v => v > 0);
      if (!hasRealData) {
        console.log('No real data found, generating sample data');
        // Generate sample data that follows the trend direction
        const baseVolume = 100; // Base volume
        const trendFactor = volumeChange >= 0 ? 1 : -1; // Trend direction
        
        for (let i = 0; i < 30; i++) {
          // Create an upward or downward trend based on volumeChange
          const dayFactor = (i / 30) * 50 * trendFactor;
          const randomVariation = Math.random() * 30 - 15;
          dailyVolumes[i] = Math.max(10, baseVolume + dayFactor + randomVariation);
        }
      }
      
      // Ensure we have at least some data to show
      const result = {
        currentVolume: Math.max(0, currentVolume),
        previousVolume: Math.max(0, previousVolume),
        volumeChange: isNaN(volumeChange) ? 0 : volumeChange,
        currentTransfers: last30Days.length,
        previousTransfers: previous30Days.length,
        dailyVolumes,
        hasRealData
      };
      
      console.log('Final trend data:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in recentTrends calculation:', error);
      // Return safe default values
      return {
        currentVolume: 0,
        previousVolume: 0,
        volumeChange: 0,
        currentTransfers: 0,
        previousTransfers: 0,
        dailyVolumes: Array(30).fill(0),
        hasRealData: false
      };
    }
  }, [filteredBulkActions]); */

  return (
    <div className="space-y-6">
      {/* Summary Cards - Matching Fluid Movements Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Drilling Fluids Card */}
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">
            {formatWholeNumber(drillingFluidMetrics.totalVolume)}
          </div>
          <div className="text-xs text-blue-700 mt-1">Drilling Fluids (BBLs)</div>
        </div>

        {/* Completion Fluids Card */}
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">
            {formatWholeNumber(completionFluidMetrics.totalVolume)}
          </div>
          <div className="text-xs text-purple-700 mt-1">Completion Fluids (BBLs)</div>
        </div>

        {/* Total Transfers Card */}
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-900">
            {drillingFluidMetrics.transfers + completionFluidMetrics.transfers}
          </div>
          <div className="text-xs text-green-700 mt-1">Total Transfers</div>
        </div>
      </div>

      {/* Fluid Type Breakdown - Enhanced Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drilling Fluids by Type - Enhanced */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Droplet className="h-5 w-5 text-white" />
              </div>
              Drilling Fluids by Type
            </h3>
          </div>
          <div className="p-6">
            {Object.entries(drillingFluidMetrics.byType).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(drillingFluidMetrics.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, volume], index) => {
                    const percentage = (volume / drillingFluidMetrics.totalVolume) * 100;
                    const colors = [
                      { bg: 'bg-blue-500', light: 'bg-blue-50', ring: 'ring-blue-200' },
                      { bg: 'bg-cyan-500', light: 'bg-cyan-50', ring: 'ring-cyan-200' },
                      { bg: 'bg-teal-500', light: 'bg-teal-50', ring: 'ring-teal-200' },
                      { bg: 'bg-indigo-500', light: 'bg-indigo-50', ring: 'ring-indigo-200' },
                      { bg: 'bg-sky-500', light: 'bg-sky-50', ring: 'ring-sky-200' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={type} className={`group hover:${color.light} p-4 rounded-lg transition-all duration-200`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 ${color.bg} rounded-full ring-4 ${color.ring}`}></div>
                            <span className="font-semibold text-gray-800">{type}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">{formatWholeNumber(volume)}</span>
                            <span className="text-xs text-gray-500 ml-1">BBLs</span>
                          </div>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-10 overflow-hidden">
                          <div 
                            className={`${color.bg} h-10 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${Math.max(15, percentage)}%` }}
                          >
                            <span className="text-sm font-bold text-white">
                              {Math.round(percentage)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Droplet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No drilling fluid data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Completion Fluids by Type - Enhanced */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Beaker className="h-5 w-5 text-white" />
              </div>
              Completion Fluids by Type
            </h3>
          </div>
          <div className="p-6">
            {Object.entries(completionFluidMetrics.byType).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(completionFluidMetrics.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, volume], index) => {
                    const percentage = (volume / completionFluidMetrics.totalVolume) * 100;
                    const colors = [
                      { bg: 'bg-purple-500', light: 'bg-purple-50', ring: 'ring-purple-200' },
                      { bg: 'bg-pink-500', light: 'bg-pink-50', ring: 'ring-pink-200' },
                      { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-50', ring: 'ring-fuchsia-200' },
                      { bg: 'bg-violet-500', light: 'bg-violet-50', ring: 'ring-violet-200' },
                      { bg: 'bg-rose-500', light: 'bg-rose-50', ring: 'ring-rose-200' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={type} className={`group hover:${color.light} p-4 rounded-lg transition-all duration-200`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 ${color.bg} rounded-full ring-4 ${color.ring}`}></div>
                            <span className="font-semibold text-gray-800">{type}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">{formatWholeNumber(volume)}</span>
                            <span className="text-xs text-gray-500 ml-1">BBLs</span>
                          </div>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-10 overflow-hidden">
                          <div 
                            className={`${color.bg} h-10 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${Math.max(15, percentage)}%` }}
                          >
                            <span className="text-sm font-bold text-white">
                              {Math.round(percentage)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Beaker className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No completion fluid data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Transfer Routes - Enhanced */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            Top Drilling & Completion Fluid Routes
          </h3>
        </div>
        <div className="p-6">
          {topTransferRoutes.length > 0 ? (
            <div className="space-y-4">
              {topTransferRoutes.map((route, index) => (
                <div key={index} className="p-5 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-8 rounded-full ${index === 0 ? 'bg-gradient-to-b from-blue-600 to-indigo-600' : index === 1 ? 'bg-gradient-to-b from-blue-500 to-indigo-500' : 'bg-gradient-to-b from-blue-400 to-indigo-400'}`}></div>
                      <span className="font-semibold text-gray-900">{route.route}</span>
                    </div>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">
                      {route.count} transfers
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{formatWholeNumber(route.volume)}</p>
                      <p className="text-xs text-gray-600 mt-1">Total BBLs</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{formatWholeNumber(route.drillingVolume)}</p>
                      <p className="text-xs text-gray-600 mt-1">Drilling BBLs</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{formatWholeNumber(route.completionVolume)}</p>
                      <p className="text-xs text-gray-600 mt-1">Completion BBLs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium">Fluid Types:</span>
                    <div className="flex flex-wrap gap-1">
                      {route.types.slice(0, 3).map((type, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white rounded-full">
                          {type}
                        </span>
                      ))}
                      {route.types.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-200 rounded-full">
                          +{route.types.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transfer routes available</p>
            </div>
          )}
        </div>
      </div>

      {/* Alert for low activity - Enhanced */}
      {filteredBulkActions.length === 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-amber-900 mb-1">No drilling or completion fluid transfers found</h4>
              <p className="text-sm text-amber-700">Try adjusting your filters or date range to see bulk fluid activity. Make sure the bulk actions data has been uploaded and contains drilling or completion fluid information.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillingBulkInsights;