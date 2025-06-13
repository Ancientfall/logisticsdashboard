import React, { useMemo, useEffect } from 'react';
import { BulkAction } from '../../types';
import { Droplet, AlertCircle, MapPin } from 'lucide-react';

// Helper function to format numbers without decimals
const formatWholeNumber = (value: number): string => {
  return Math.round(value).toLocaleString('en-US');
};

// Helper function to normalize location names for comparison
const normalizeLocationForComparison = (location: string): string => {
  if (!location) return '';
  
  let norm = location
    .replace(/\s*\(Drilling\)\s*/i, '')
    .replace(/\s*\(Production\)\s*/i, '')
    .replace(/\s*Drilling\s*/i, '')
    .replace(/\s*Production\s*/i, '')
    .replace(/\s*PQ\s*/i, '') // Remove PQ suffix
    .replace(/\s*Prod\s*/i, '') // Remove Prod suffix
    .trim()
    .toLowerCase();

  // Thunder Horse variations
  if (norm === 'thunder horse pdq' || norm === 'thunder horse prod' || 
      norm === 'thunder horse production' || norm === 'thunderhorse' || 
      norm === 'thunder horse') {
    return 'thunder horse';
  }
  
  // Mad Dog variations  
  if (norm === 'mad dog pdq' || norm === 'mad dog prod' || 
      norm === 'mad dog production' || norm === 'maddog' || 
      norm === 'mad dog') {
    return 'mad dog';
  }
  
  // Atlantis variations
  if (norm === 'atlantis pq' || norm === 'atlantis') {
    return 'atlantis';
  }
  
  // Na Kika variations
  if (norm === 'na kika' || norm === 'nakika') {
    return 'na kika';
  }
  
  return norm;
};

// Production fluid types
const PRODUCTION_FLUID_TYPES = [
  'Asphaltene Inhibitor',
  'Calcium Nitrate (Petrocare 45)',
  'Methanol',
  'Xylene',
  'Corrosion Inhibitor',
  'Scale Inhibitor',
  'LDHI',
  'Subsea 525'
];

interface ProductionBulkInsightsProps {
  bulkActions: BulkAction[];
  selectedVessel?: string;
  selectedLocation?: string;
  dateRange?: [Date | null, Date | null];
}

const ProductionBulkInsights: React.FC<ProductionBulkInsightsProps> = ({
  bulkActions,
  selectedVessel,
  selectedLocation,
  dateRange
}) => {
  // Debug logging
  useEffect(() => {
    console.log('🔍 ProductionBulkInsights - Total bulk actions:', bulkActions.length);
    if (bulkActions.length > 0) {
      // Log a few sample bulk actions
      console.log('📋 Sample bulk actions:', bulkActions.slice(0, 5).map(a => ({
        bulkType: a.bulkType,
        description: a.bulkDescription,
        volumeGals: a.volumeGals,
        fluidCategory: a.fluidCategory,
        fluidSpecificType: a.fluidSpecificType,
        isDrillingFluid: a.isDrillingFluid,
        isCompletionFluid: a.isCompletionFluid
      })));
      
      // Count different types
      const drillingCount = bulkActions.filter(a => a.isDrillingFluid).length;
      const completionCount = bulkActions.filter(a => a.isCompletionFluid).length;
      const otherCount = bulkActions.filter(a => !a.isDrillingFluid && !a.isCompletionFluid).length;
      
      console.log('📊 Bulk action breakdown:', {
        total: bulkActions.length,
        drilling: drillingCount,
        completion: completionCount,
        other: otherCount
      });
    }
  }, [bulkActions]);

  // Filter bulk actions based on props
  const filteredBulkActions = useMemo(() => {
    console.log('🔍 Filtering production bulk actions:', {
      totalActions: bulkActions.length,
      selectedVessel,
      selectedLocation,
      normalizedLocation: selectedLocation ? normalizeLocationForComparison(selectedLocation) : null,
      dateRange
    });
    
    // First filter for production fluids - only include specific production fluid types
    const productionFluids = bulkActions.filter(action => {
      // Exclude drilling and completion fluids
      if (action.isDrillingFluid || action.isCompletionFluid) {
        return false;
      }
      
      // Check if it's one of our specific production fluid types
      const isProductionFluid = PRODUCTION_FLUID_TYPES.some(type => 
        action.fluidSpecificType?.toLowerCase().includes(type.toLowerCase()) ||
        action.bulkDescription?.toLowerCase().includes(type.toLowerCase()) ||
        action.bulkType?.toLowerCase().includes(type.toLowerCase())
      );
      
      return isProductionFluid;
    });
    
    console.log('📊 Production fluids found:', productionFluids.length);
    
    // Debug: Show unique production fluid types
    if (productionFluids.length > 0) {
      const uniqueTypes = new Set<string>();
      const uniqueDestinations = new Set<string>();
      const uniqueOrigins = new Set<string>();
      
      productionFluids.forEach(action => {
        if (action.fluidSpecificType) uniqueTypes.add(action.fluidSpecificType);
        if (action.standardizedDestination) uniqueDestinations.add(action.standardizedDestination);
        if (action.standardizedOrigin) uniqueOrigins.add(action.standardizedOrigin);
      });
      
      console.log('🧪 Unique production fluid types:', Array.from(uniqueTypes));
      console.log('📍 Unique destinations in bulk actions:', Array.from(uniqueDestinations));
      console.log('📍 Unique origins in bulk actions:', Array.from(uniqueOrigins));
      
      // Check specifically for Na Kika and Atlantis variations
      const naKikaDestinations = Array.from(uniqueDestinations).filter(dest => 
        dest.toLowerCase().includes('na kika') || dest.toLowerCase().includes('nakika')
      );
      const atlantisDestinations = Array.from(uniqueDestinations).filter(dest => 
        dest.toLowerCase().includes('atlantis')
      );
      
      if (naKikaDestinations.length > 0) {
        console.log('🔍 Na Kika destinations found:', naKikaDestinations);
      }
      if (atlantisDestinations.length > 0) {
        console.log('🔍 Atlantis destinations found:', atlantisDestinations);
      }
    }
    
    const filtered = productionFluids.filter(action => {
      // Apply filters
      if (selectedVessel && selectedVessel !== 'all' && action.vesselName !== selectedVessel) return false;
      if (selectedLocation && selectedLocation !== 'all' && selectedLocation !== 'All Locations') {
        const normalizedSelected = normalizeLocationForComparison(selectedLocation);
        const normalizedDestination = normalizeLocationForComparison(action.standardizedDestination || '');
        const normalizedOrigin = normalizeLocationForComparison(action.standardizedOrigin || '');
        
        // Debug logging for Na Kika and Atlantis
        if (selectedLocation === 'Na Kika' || selectedLocation === 'Atlantis') {
          console.log(`🧪 Bulk fluid location filtering for ${selectedLocation}:`, {
            actionId: action.id,
            vesselName: action.vesselName,
            bulkType: action.bulkType,
            originalDestination: action.standardizedDestination,
            originalOrigin: action.standardizedOrigin,
            normalizedSelected,
            normalizedDestination,
            normalizedOrigin,
            destinationMatch: normalizedDestination === normalizedSelected,
            originMatch: normalizedOrigin === normalizedSelected,
            willPass: normalizedDestination === normalizedSelected || normalizedOrigin === normalizedSelected
          });
        }
        
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

  // Calculate production fluid metrics
  const productionFluidMetrics = useMemo(() => {
    const metrics = {
      totalVolume: 0,
      byType: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      transfers: filteredBulkActions.length,
      loadOperations: 0,
      dischargeOperations: 0,
      returns: 0
    };
    
    filteredBulkActions.forEach(action => {
      // Use gallons for production fluids
      const volume = action.volumeGals || 0;
      metrics.totalVolume += volume;
      
      // By type
      const type = action.fluidSpecificType || action.bulkType || 'Other Production Fluid';
      metrics.byType[type] = (metrics.byType[type] || 0) + volume;
      
      // By location
      const location = action.standardizedDestination || action.standardizedOrigin || 'Unknown';
      metrics.byLocation[location] = (metrics.byLocation[location] || 0) + volume;
      
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
      if (action.standardizedDestination && action.standardizedOrigin) {
        const route = `${action.standardizedOrigin} → ${action.standardizedDestination}`;
        if (!acc[route]) {
          acc[route] = { 
            count: 0, 
            volume: 0,
            types: new Set<string>() 
          };
        }
        acc[route].count++;
        acc[route].volume += action.volumeGals || 0;
        acc[route].types.add(action.fluidSpecificType || action.bulkType || 'Unknown');
      }
      return acc;
    }, {} as Record<string, { count: number; volume: number; types: Set<string> }>);

    return Object.entries(routes)
      .map(([route, data]) => ({
        route,
        count: data.count,
        volume: data.volume,
        types: Array.from(data.types)
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [filteredBulkActions]);

  // Calculate recent trends
  // NOTE: Commented out as it's not currently used in the UI
  /* const recentTrends = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const last30Days = filteredBulkActions.filter(a => {
      const actionDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      return !isNaN(actionDate.getTime()) && actionDate >= thirtyDaysAgo;
    });
    const previous30Days = filteredBulkActions.filter(a => {
      const actionDate = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      return !isNaN(actionDate.getTime()) && actionDate >= sixtyDaysAgo && actionDate < thirtyDaysAgo;
    });
    
    const currentVolume = last30Days.reduce((sum, a) => sum + (a.volumeGals || 0), 0);
    const previousVolume = previous30Days.reduce((sum, a) => sum + (a.volumeGals || 0), 0);
    
    const volumeChange = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : (currentVolume > 0 ? 100 : 0);
    
    // Calculate daily volumes for the trend graph
    const dailyVolumes = Array(30).fill(0);
    
    // Debug logging
    console.log('📊 ProductionBulkInsights: Calculating daily volumes:', {
      totalFiltered: filteredBulkActions.length,
      last30Days: last30Days.length,
      currentVolume,
      sampleAction: last30Days[0]
    });
    
    last30Days.forEach(action => {
      const actionDate = action.startDate instanceof Date ? action.startDate : new Date(action.startDate);
      if (!isNaN(actionDate.getTime())) {
        const dayIndex = Math.floor((now.getTime() - actionDate.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 30) {
          dailyVolumes[29 - dayIndex] += action.volumeGals || 0;
        }
      }
    });
    
    // If no data, generate some sample variation for visualization
    const hasData = dailyVolumes.some(v => v > 0);
    if (!hasData && currentVolume > 0) {
      // Generate realistic daily variations
      const avgDaily = currentVolume / 30;
      for (let i = 0; i < 30; i++) {
        // Add some random variation (-50% to +50% of average)
        const variation = 0.5 + Math.random();
        dailyVolumes[i] = Math.round(avgDaily * variation);
      }
      console.log('🎲 ProductionBulkInsights: Generated sample daily volumes for visualization');
    }
    
    return {
      currentVolume,
      previousVolume,
      volumeChange,
      currentTransfers: last30Days.length,
      previousTransfers: previous30Days.length,
      dailyVolumes
    };
  }, [filteredBulkActions]); */

  return (
    <div className="space-y-6">
      {/* Summary Cards - Matching Drilling Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Production Fluids Card */}
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-900">
            {formatWholeNumber(productionFluidMetrics.totalVolume)}
          </div>
          <div className="text-xs text-green-700 mt-1">Production Fluids (Gallons)</div>
        </div>

        {/* Total Transfers Card */}
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">
            {productionFluidMetrics.transfers}
          </div>
          <div className="text-xs text-blue-700 mt-1">Total Transfers</div>
        </div>

        {/* Fluid Types Card */}
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">
            {Object.keys(productionFluidMetrics.byType).length}
          </div>
          <div className="text-xs text-purple-700 mt-1">Fluid Types</div>
        </div>
      </div>

      {/* Fluid Type Breakdown - Enhanced Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Droplet className="h-5 w-5 text-white" />
            </div>
            Production Fluids by Type
          </h3>
        </div>
        <div className="p-6">
          {Object.entries(productionFluidMetrics.byType).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(productionFluidMetrics.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, volume], index) => {
                  const percentage = (volume / productionFluidMetrics.totalVolume) * 100;
                  const colors = [
                    { bg: 'bg-green-500', light: 'bg-green-50', ring: 'ring-green-200' },
                    { bg: 'bg-emerald-500', light: 'bg-emerald-50', ring: 'ring-emerald-200' },
                    { bg: 'bg-teal-500', light: 'bg-teal-50', ring: 'ring-teal-200' },
                    { bg: 'bg-lime-500', light: 'bg-lime-50', ring: 'ring-lime-200' },
                    { bg: 'bg-cyan-500', light: 'bg-cyan-50', ring: 'ring-cyan-200' }
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
                          <span className="text-xs text-gray-500 ml-1">gals</span>
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
              <p className="text-gray-500">No production fluid data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Transfer Routes - Enhanced */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            Top Production Fluid Routes
          </h3>
        </div>
        <div className="p-6">
          {topTransferRoutes.length > 0 ? (
            <div className="space-y-4">
              {topTransferRoutes.map((route, index) => (
                <div key={index} className="p-5 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-8 rounded-full ${index === 0 ? 'bg-gradient-to-b from-indigo-600 to-blue-600' : index === 1 ? 'bg-gradient-to-b from-indigo-500 to-blue-500' : 'bg-gradient-to-b from-indigo-400 to-blue-400'}`}></div>
                      <span className="font-semibold text-gray-900">{route.route}</span>
                    </div>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">
                      {route.count} transfers
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{formatWholeNumber(route.volume)}</p>
                      <p className="text-xs text-gray-600 mt-1">Total Gallons</p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">{formatWholeNumber(route.volume / route.count)}</p>
                      <p className="text-xs text-gray-600 mt-1">Avg per Transfer</p>
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
              <h4 className="text-base font-semibold text-amber-900 mb-1">No production fluid transfers found</h4>
              <p className="text-sm text-amber-700">Try adjusting your filters or date range to see production fluid activity. Make sure the bulk actions data has been uploaded and contains production chemical information.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionBulkInsights;