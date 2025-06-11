import React, { useMemo, useEffect } from 'react';
import { BulkAction } from '../../types';
import { } from '../../utils/bulkFluidClassification';
import { Droplet, Beaker, AlertCircle, TrendingUp, TrendingDown, Building, MapPin } from 'lucide-react';
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
    console.log('🔍 Filtering bulk actions:', {
      totalActions: bulkActions.length,
      selectedVessel,
      selectedLocation,
      normalizedLocation: selectedLocation ? normalizeLocationForComparison(selectedLocation) : null,
      dateRange
    });
    
    const drillingAndCompletionFluids = bulkActions.filter(action => 
      action.isDrillingFluid || action.isCompletionFluid
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
      // Only include drilling and completion fluids
      if (!action.isDrillingFluid && !action.isCompletionFluid) return false;
      
      // Apply filters
      if (selectedVessel && selectedVessel !== 'all' && action.vesselName !== selectedVessel) return false;
      if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== 'All Locations') {
        const normalizedSelected = normalizeLocationForComparison(selectedLocation);
        const normalizedDestination = normalizeLocationForComparison(action.standardizedDestination || '');
        const normalizedOrigin = normalizeLocationForComparison(action.standardizedOrigin || '');
        
        if (normalizedDestination !== normalizedSelected && normalizedOrigin !== normalizedSelected) return false;
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        if (action.startDate < dateRange[0] || action.startDate > dateRange[1]) return false;
      }
      
      return true;
    });
    
    console.log('✅ Filtered results:', filtered.length);
    return filtered;
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

  // Calculate recent trends
  const recentTrends = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const last30Days = filteredBulkActions.filter(a => a.startDate >= thirtyDaysAgo);
    const previous30Days = filteredBulkActions.filter(a => a.startDate >= sixtyDaysAgo && a.startDate < thirtyDaysAgo);
    
    const currentVolume = last30Days.reduce((sum, a) => sum + a.volumeBbls, 0);
    const previousVolume = previous30Days.reduce((sum, a) => sum + a.volumeBbls, 0);
    
    const volumeChange = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;
    
    return {
      currentVolume,
      previousVolume,
      volumeChange,
      currentTransfers: last30Days.length,
      previousTransfers: previous30Days.length
    };
  }, [filteredBulkActions]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Drilling Fluids Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Drilling Fluids</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatWholeNumber(drillingFluidMetrics.totalVolume)}</p>
              <p className="text-sm text-gray-600">Total BBLs</p>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-600">{drillingFluidMetrics.transfers} transfers</p>
              <p className="text-sm text-gray-600">{Object.keys(drillingFluidMetrics.byType).length} fluid types</p>
            </div>
          </div>
        </div>

        {/* Completion Fluids Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Completion Fluids</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatWholeNumber(completionFluidMetrics.totalVolume)}</p>
              <p className="text-sm text-gray-600">Total BBLs</p>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-600">{completionFluidMetrics.transfers} transfers</p>
              <p className="text-sm text-gray-600">{Object.keys(completionFluidMetrics.byType).length} fluid types</p>
            </div>
          </div>
        </div>

        {/* Operations Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Operations</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Load Operations</span>
              <span className="text-sm font-medium">{drillingFluidMetrics.loadOperations + completionFluidMetrics.loadOperations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Discharge Operations</span>
              <span className="text-sm font-medium">{drillingFluidMetrics.dischargeOperations + completionFluidMetrics.dischargeOperations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Returns</span>
              <span className="text-sm font-medium">{drillingFluidMetrics.returns + completionFluidMetrics.returns}</span>
            </div>
          </div>
        </div>

        {/* Trends Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {recentTrends.volumeChange >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <h3 className="font-semibold text-gray-900">30-Day Trend</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {recentTrends.volumeChange >= 0 ? '+' : ''}{Math.round(recentTrends.volumeChange)}%
              </p>
              <p className="text-sm text-gray-600">Volume Change</p>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-600">{formatWholeNumber(recentTrends.currentVolume)} BBLs current</p>
              <p className="text-sm text-gray-600">{recentTrends.currentTransfers} transfers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fluid Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drilling Fluids by Type */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blue-600" />
            Drilling Fluids by Type
          </h3>
          <div className="space-y-3">
            {Object.entries(drillingFluidMetrics.byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, volume], index) => {
                const percentage = (volume / drillingFluidMetrics.totalVolume) * 100;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'];
                const colorClass = colors[index % colors.length];
                return (
                  <div key={type} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                        <span className="font-medium text-gray-900">{type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{formatWholeNumber(volume)}</span>
                        <span className="text-xs text-gray-500 ml-1">BBLs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="relative w-full bg-gray-100 rounded-lg h-8 overflow-hidden">
                          <div 
                            className={`absolute top-0 left-0 h-full ${colorClass} rounded-lg transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          >
                            <div className="h-full flex items-center justify-end pr-3">
                              <span className="text-white text-xs font-semibold drop-shadow">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Completion Fluids by Type */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-600" />
            Completion Fluids by Type
          </h3>
          <div className="space-y-3">
            {Object.entries(completionFluidMetrics.byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, volume], index) => {
                const percentage = (volume / completionFluidMetrics.totalVolume) * 100;
                const colors = ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-yellow-500'];
                const colorClass = colors[index % colors.length];
                return (
                  <div key={type} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                        <span className="font-medium text-gray-900">{type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{formatWholeNumber(volume)}</span>
                        <span className="text-xs text-gray-500 ml-1">BBLs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="relative w-full bg-gray-100 rounded-lg h-8 overflow-hidden">
                          <div 
                            className={`absolute top-0 left-0 h-full ${colorClass} rounded-lg transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          >
                            <div className="h-full flex items-center justify-end pr-3">
                              <span className="text-white text-xs font-semibold drop-shadow">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Top Transfer Routes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-600" />
          Top Drilling & Completion Fluid Routes
        </h3>
        <div className="space-y-3">
          {topTransferRoutes.map((route, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{route.route}</span>
                <span className="text-sm text-gray-600">{route.count} transfers</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Volume:</span>
                  <span className="ml-2 font-medium">{formatWholeNumber(route.volume)} BBLs</span>
                </div>
                <div>
                  <span className="text-gray-500">Drilling:</span>
                  <span className="ml-2 font-medium">{formatWholeNumber(route.drillingVolume)} BBLs</span>
                </div>
                <div>
                  <span className="text-gray-500">Completion:</span>
                  <span className="ml-2 font-medium">{formatWholeNumber(route.completionVolume)} BBLs</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-500">Types: {route.types.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert for low activity */}
      {filteredBulkActions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">No drilling or completion fluid transfers found</p>
            <p className="text-sm text-yellow-700">Try adjusting your filters or date range to see bulk fluid activity.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillingBulkInsights;