import React, { useState, useMemo, useEffect } from 'react';
import { formatNumberWhole } from '../../utils/formatters';
import { useData } from '../../context/DataContext';
import { calculateEnhancedBulkFluidMetrics } from '../../utils/metricsCalculation';
import KPICard from './KPICard';
import SmartFilterBar from './SmartFilterBar';
import BulkFluidDebugPanel from '../debug/BulkFluidDebugPanel';
import { 
  MapPin,
  Building,
  ArrowRight,
  BarChart3,
  PieChart,
  Bug,
  ArrowLeft,
  Waves
} from 'lucide-react';

interface BulkActionsDashboardProps {
  onNavigateToUpload?: () => void;
}

const BulkActionsDashboard: React.FC<BulkActionsDashboardProps> = ({ onNavigateToUpload }) => {
  const { bulkActions } = useData();
  // Simplified filters for SmartFilterBar
  const [filters, setFilters] = useState({
    selectedVessel: 'All Vessels',
    selectedBulkType: 'All Types'
  });
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter bulk actions
  const filteredBulkActions = useMemo(() => {
    return bulkActions.filter(action => {
      const vesselMatch = filters.selectedVessel === 'All Vessels' || action.vesselName === filters.selectedVessel;
      const bulkTypeMatch = filters.selectedBulkType === 'All Types' || action.bulkType === filters.selectedBulkType;

      return vesselMatch && bulkTypeMatch;
    });
  }, [bulkActions, filters]);

  // Reset to page 1 if filters change
  useEffect(() => { setCurrentPage(1); }, [filteredBulkActions]);

  // Get filter options for SmartFilterBar
  const filterOptions = useMemo(() => {
    const vessels = Array.from(new Set(bulkActions.map(a => a.vesselName))).sort();
    const bulkTypes = Array.from(new Set(bulkActions.map(a => a.bulkType))).sort();
    
    return {
      vessels: ['All Vessels', ...vessels],
      bulkTypes: ['All Types', ...bulkTypes]
    };
  }, [bulkActions]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalTransfers = filteredBulkActions.length;
    // Use deduplication engine to prevent double-counting loads/offloads
    const bulkMetrics = calculateEnhancedBulkFluidMetrics(
      filteredBulkActions,
      undefined, // no month filter
      undefined, // no year filter  
      'All' // all departments
    );
    const totalVolumeBbls = bulkMetrics.totalFluidVolume;
    const shorebaseToRig = filteredBulkActions.filter(a => 
      a.portType === 'base' && a.destinationPort
    ).length;
    const rigToShorebase = filteredBulkActions.filter(a => 
      a.portType === 'rig' || a.isReturn
    ).length;
    
    // Calculate drilling and completion fluid metrics
    const drillingFluids = filteredBulkActions.filter(a => a.isDrillingFluid);
    const completionFluids = filteredBulkActions.filter(a => a.isCompletionFluid);
    // Use deduplication for specific fluid types
    const drillingMetrics = calculateEnhancedBulkFluidMetrics(
      drillingFluids, undefined, undefined, 'Drilling'
    );
    const completionMetrics = calculateEnhancedBulkFluidMetrics(
      completionFluids, undefined, undefined, 'Drilling'
    );
    const drillingFluidVolume = drillingMetrics.totalFluidVolume;
    const completionFluidVolume = completionMetrics.totalFluidVolume;

    // Calculate volume by bulk type using delivery operations only
    const volumeByType = bulkMetrics.deduplicationResult.consolidatedOperations
      .filter(op => op.isDelivery)
      .reduce((acc, op) => {
        acc[op.bulkType] = (acc[op.bulkType] || 0) + op.totalVolumeBbls;
        return acc;
      }, {} as Record<string, number>);

    // Calculate transfers by vessel
    const transfersByVessel = filteredBulkActions.reduce((acc, action) => {
      acc[action.vesselName] = (acc[action.vesselName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average transfer size
    const avgTransferSize = totalTransfers > 0 ? totalVolumeBbls / totalTransfers : 0;

    return {
      totalTransfers,
      totalVolumeBbls,
      shorebaseToRig,
      rigToShorebase,
      volumeByType,
      transfersByVessel,
      avgTransferSize,
      drillingFluidVolume,
      completionFluidVolume,
      drillingFluidCount: drillingFluids.length,
      completionFluidCount: completionFluids.length
    };
  }, [filteredBulkActions]);

  // Group transfers by route
  const transferRoutes = useMemo(() => {
    const routes = filteredBulkActions.reduce((acc, action) => {
      if (action.destinationPort) {
        const route = `${action.standardizedOrigin} → ${action.standardizedDestination}`;
        if (!acc[route]) {
          acc[route] = { count: 0, volume: 0, types: new Set() };
        }
        acc[route].count++;
        acc[route].volume += action.volumeBbls;
        acc[route].types.add(action.bulkType);
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
      .sort((a, b) => b.volume - a.volume);
  }, [filteredBulkActions]);

  const totalPages = Math.ceil(filteredBulkActions.length / pageSize);
  const paginatedBulkActions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBulkActions.slice(start, start + pageSize);
  }, [filteredBulkActions, currentPage]);

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Waves className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Bulk Actions Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time bulk material transfer tracking & analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{kpis.totalTransfers.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Transfers</div>
            </div>
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showDebugPanel 
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bug className="h-4 w-4" />
              {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
            </button>
            {onNavigateToUpload && (
              <button
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-all duration-200"
              >
                <ArrowLeft size={16} />
                Back to Upload
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Smart Filter Bar */}
      <SmartFilterBar
        timeFilter={filters.selectedVessel}
        locationFilter={filters.selectedBulkType}
        onTimeChange={(value) => setFilters(prev => ({ ...prev, selectedVessel: value }))}
        onLocationChange={(value) => setFilters(prev => ({ ...prev, selectedBulkType: value }))}
        timeOptions={filterOptions.vessels.map(vessel => ({ value: vessel, label: vessel }))}
        locationOptions={filterOptions.bulkTypes.map(type => ({ value: type, label: type }))}
        totalRecords={bulkActions.length}
        filteredRecords={filteredBulkActions.length}
        showPresets={true}
      />

      {/* Core Transfer KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Transfers"
          value={formatNumberWhole(kpis.totalTransfers)}
          color="blue"
          variant="secondary"
          contextualHelp="Total number of bulk material transfers in the selected period"
          status="good"
        />
        <KPICard
          title="Total Volume"
          value={formatNumberWhole(kpis.totalVolumeBbls)}
          unit="bbls"
          color="green"
          variant="secondary"
          contextualHelp="Total volume of bulk materials transferred across all operations"
          status="good"
        />
        <KPICard
          title="Shorebase to Rig"
          value={formatNumberWhole(kpis.shorebaseToRig)}
          color="purple"
          variant="secondary"
          contextualHelp="Number of transfers from shorebase facilities to offshore rigs"
          status="neutral"
        />
        <KPICard
          title="Avg Transfer Size"
          value={formatNumberWhole(kpis.avgTransferSize)}
          unit="bbls"
          color="orange"
          variant="secondary"
          contextualHelp="Average volume per bulk material transfer operation"
          target={500}
          status={kpis.avgTransferSize >= 500 ? 'good' : kpis.avgTransferSize >= 300 ? 'warning' : 'critical'}
        />
        <KPICard
          title="Drilling Fluids"
          value={formatNumberWhole(kpis.drillingFluidVolume)}
          unit="bbls"
          subtitle={`${kpis.drillingFluidCount} transfers`}
          color="indigo"
          variant="secondary"
          contextualHelp="Total volume of drilling fluid transfers supporting active drilling operations"
          status="neutral"
        />
        <KPICard
          title="Completion Fluids"
          value={formatNumberWhole(kpis.completionFluidVolume)}
          unit="bbls"
          subtitle={`${kpis.completionFluidCount} transfers`}
          color="pink"
          variant="secondary"
          contextualHelp="Total volume of completion fluid transfers for well completion activities"
          status="neutral"
        />
      </div>

      {/* Transfer Routes - Modern Design */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Top Transfer Routes
                </h2>
                <p className="text-sm text-gray-600">Most frequent material movements</p>
              </div>
            </div>
            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              TOP 5 ROUTES
            </span>
          </div>
          
          <div className="space-y-3">
            {transferRoutes.slice(0, 5).map((route, index) => {
              const rankings = [
                { position: '#1', gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
                { position: '#2', gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
                { position: '#3', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                { position: '#4', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                { position: '#5', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' }
              ];
              const ranking = rankings[index] || rankings[4];
              
              return (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${ranking.bg} border ${ranking.border} transition-all duration-200 hover:shadow-md`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 bg-gradient-to-r ${ranking.gradient} rounded-lg flex items-center justify-center`}>
                      <span className="text-xs font-bold text-white">{ranking.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-800">{route.route.split(' → ')[0]}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{route.route.split(' → ')[1]}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${ranking.text}`}>{route.count}</div>
                    <div className="text-xs text-gray-500">{formatNumberWhole(route.volume)} bbls</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume by Bulk Type - Modern Design */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Volume by Bulk Type
                </h2>
                <p className="text-sm text-gray-600">Material distribution analysis • {formatNumberWhole(kpis.totalVolumeBbls)} bbls total</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(kpis.volumeByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([type, volume], index) => {
                  const percentage = (volume / kpis.totalVolumeBbls) * 100;
                  const colors = [
                    { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                    { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
                    { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                    { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                    { gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                    { gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' }
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={type} className={`p-4 rounded-lg border ${color.bg} ${color.border} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 bg-gradient-to-r ${color.gradient} rounded-full`}></div>
                        <span className="text-sm font-semibold text-gray-800">{type}</span>
                      </div>
                      <div className={`text-xl font-bold ${color.text} mb-1`}>{formatNumberWhole(volume)}</div>
                      <div className="text-xs text-gray-600">{percentage.toFixed(1)}% of total</div>
                      
                      {/* Mini trend bar */}
                      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-1000 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Transfers by Vessel - Modern Design */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Transfers by Vessel
                </h2>
                <p className="text-sm text-gray-600">Fleet performance analysis • {kpis.totalTransfers} total transfers</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(kpis.transfersByVessel)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([vessel, count], index) => {
                  const percentage = (count / kpis.totalTransfers) * 100;
                  const colors = [
                    { gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
                    { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                    { gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
                    { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
                    { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                    { gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' }
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={vessel} className={`p-4 rounded-lg border ${color.bg} ${color.border} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 bg-gradient-to-r ${color.gradient} rounded-full`}></div>
                        <span className="text-sm font-semibold text-gray-800">{vessel}</span>
                      </div>
                      <div className={`text-xl font-bold ${color.text} mb-1`}>{count}</div>
                      <div className="text-xs text-gray-600">{percentage.toFixed(1)}% of total</div>
                      
                      {/* Mini trend bar */}
                      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-1000 ease-out`}
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

      {/* Detailed Transfer Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Transfer Details
                </h2>
                <p className="text-sm text-gray-600">Detailed view of bulk material transfers</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Showing {paginatedBulkActions.length} of {filteredBulkActions.length} transfers (Page {currentPage} of {totalPages})
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bulk Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (bbls)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedBulkActions.filter(action => action && action.id).map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {action.startDate ? new Date(action.startDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {action.vesselName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        (action.action || '').toLowerCase().includes('load') ? 'bg-green-100 text-green-800' : 
                        (action.action || '').toLowerCase().includes('discharge') ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {action.action || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {action.bulkType || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {action.bulkDescription || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {action.standardizedOrigin || action.atPort || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {action.standardizedDestination || action.atPort || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatNumberWhole(action.qty || 0)} {action.unit || 'units'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatNumberWhole(action.volumeBbls || action.qty || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6 mt-6 border-t border-gray-200">
              <button
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 px-4">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <BulkFluidDebugPanel bulkActions={bulkActions} />
        </div>
      )}
    </div>
  );
};

export default BulkActionsDashboard;