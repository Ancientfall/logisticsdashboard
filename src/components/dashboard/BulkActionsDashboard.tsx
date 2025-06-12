import React, { useState, useMemo, useEffect } from 'react';
import { formatNumberWhole } from '../../utils/formatters';
import { useData } from '../../context/DataContext';
import KPICard from './KPICard';
import BulkFluidDebugPanel from '../debug/BulkFluidDebugPanel';
import { 
  Filter, 
  MapPin,
  Building,
  ArrowRight,
  BarChart3,
  PieChart,
  Bug
} from 'lucide-react';

const BulkActionsDashboard: React.FC = () => {
  const { bulkActions } = useData();
  const [selectedDateRange, setSelectedDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedVessel, setSelectedVessel] = useState<string>('all');
  const [selectedBulkType, setSelectedBulkType] = useState<string>('all');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter bulk actions
  const filteredBulkActions = useMemo(() => {
    return bulkActions.filter(action => {
      const dateMatch = !selectedDateRange[0] || !selectedDateRange[1] || 
        (action.startDate >= selectedDateRange[0] && action.startDate <= selectedDateRange[1]);
      const vesselMatch = selectedVessel === 'all' || action.vesselName === selectedVessel;
      const bulkTypeMatch = selectedBulkType === 'all' || action.bulkType === selectedBulkType;
      const originMatch = selectedOrigin === 'all' || action.standardizedOrigin === selectedOrigin;
      const destinationMatch = selectedDestination === 'all' || action.standardizedDestination === selectedDestination;
      const actionMatch = selectedAction === 'all' || action.action === selectedAction;

      return dateMatch && vesselMatch && bulkTypeMatch && originMatch && destinationMatch && actionMatch;
    });
  }, [bulkActions, selectedDateRange, selectedVessel, selectedBulkType, selectedOrigin, selectedDestination, selectedAction]);

  // Reset to page 1 if filters change
  useEffect(() => { setCurrentPage(1); }, [filteredBulkActions]);

  // Get unique values for filters
  const vessels = useMemo(() => 
    Array.from(new Set(bulkActions.map(a => a.vesselName))).sort(), 
    [bulkActions]
  );
  
  const bulkTypes = useMemo(() => 
    Array.from(new Set(bulkActions.map(a => a.bulkType))).sort(), 
    [bulkActions]
  );
  
  const origins = useMemo(() => 
    Array.from(new Set(bulkActions.map(a => a.standardizedOrigin))).sort(), 
    [bulkActions]
  );
  
  const destinations = useMemo(() => 
    Array.from(new Set(bulkActions.map(a => a.standardizedDestination).filter(Boolean))).sort(), 
    [bulkActions]
  );
  
  const actions = useMemo(() => 
    Array.from(new Set(bulkActions.map(a => a.action))).sort(), 
    [bulkActions]
  );

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalTransfers = filteredBulkActions.length;
    const totalVolumeBbls = filteredBulkActions.reduce((sum, action) => sum + action.volumeBbls, 0);
    const shorebaseToRig = filteredBulkActions.filter(a => 
      a.portType === 'base' && a.destinationPort
    ).length;
    const rigToShorebase = filteredBulkActions.filter(a => 
      a.portType === 'rig' || a.isReturn
    ).length;
    
    // Calculate drilling and completion fluid metrics
    const drillingFluids = filteredBulkActions.filter(a => a.isDrillingFluid);
    const completionFluids = filteredBulkActions.filter(a => a.isCompletionFluid);
    const drillingFluidVolume = drillingFluids.reduce((sum, a) => sum + a.volumeBbls, 0);
    const completionFluidVolume = completionFluids.reduce((sum, a) => sum + a.volumeBbls, 0);

    // Calculate volume by bulk type
    const volumeByType = filteredBulkActions.reduce((acc, action) => {
      acc[action.bulkType] = (acc[action.bulkType] || 0) + action.volumeBbls;
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
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Actions Dashboard</h1>
            <p className="text-gray-600">Track and analyze bulk material transfers between shorebase and rigs</p>
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
            {showDebugPanel ? 'Hide Debug Panel' : 'Show Debug Panel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Filter className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <p className="text-sm text-gray-500">Refine your bulk actions view</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  onChange={(e) => setSelectedDateRange([new Date(e.target.value), selectedDateRange[1]])}
                />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  onChange={(e) => setSelectedDateRange([selectedDateRange[0], new Date(e.target.value)])}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Vessel</label>
              <select
                value={selectedVessel}
                onChange={(e) => setSelectedVessel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Vessels</option>
                {vessels.map(vessel => (
                  <option key={vessel} value={vessel}>{vessel}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Bulk Type</label>
              <select
                value={selectedBulkType}
                onChange={(e) => setSelectedBulkType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Types</option>
                {bulkTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Origin</label>
              <select
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Origins</option>
                {origins.map(origin => (
                  <option key={origin} value={origin}>{origin}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Destinations</option>
                {destinations.map(dest => (
                  <option key={dest} value={dest}>{dest}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Action</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Actions</option>
                {actions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Transfers"
          value={formatNumberWhole(kpis.totalTransfers)}
          trend={0}
          color="blue"
        />
        <KPICard
          title="Total Volume"
          value={`${formatNumberWhole(kpis.totalVolumeBbls)} bbls`}
          trend={0}
          color="green"
        />
        <KPICard
          title="Shorebase to Rig"
          value={formatNumberWhole(kpis.shorebaseToRig)}
          trend={0}
          color="purple"
        />
        <KPICard
          title="Avg Transfer Size"
          value={`${formatNumberWhole(kpis.avgTransferSize)} bbls`}
          trend={0}
          color="orange"
        />
        <KPICard
          title="Drilling Fluids"
          value={`${formatNumberWhole(kpis.drillingFluidVolume)} bbls`}
          subtitle={`${kpis.drillingFluidCount} transfers`}
          trend={0}
          color="blue"
        />
        <KPICard
          title="Completion Fluids"
          value={`${formatNumberWhole(kpis.completionFluidVolume)} bbls`}
          subtitle={`${kpis.completionFluidCount} transfers`}
          trend={0}
          color="purple"
        />
      </div>

      {/* Transfer Routes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Top Transfer Routes</h2>
                <p className="text-sm text-indigo-100">Most frequent material movements</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{transferRoutes.length}</div>
              <div className="text-xs text-indigo-100">Total routes</div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-4">
            {transferRoutes.slice(0, 5).map((route, index) => {
              const typesToShow = route.types.slice(0, 4);
              const extraTypes = route.types.length - typesToShow.length;
              return (
                <div
                  key={index}
                  className="flex flex-row items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-6 py-4 min-h-[88px] hover:shadow-md transition-all duration-200"
                >
                  {/* Origin & Destination */}
                  <div className="flex items-center gap-6 min-w-[260px]">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Building className="h-5 w-5 text-indigo-600" />
                        </div>
                        <span className="font-semibold text-gray-900 truncate max-w-[100px]">{route.route.split(' → ')[0]}</span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">Origin</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Building className="h-5 w-5 text-purple-600" />
                        </div>
                        <span className="font-semibold text-gray-900 truncate max-w-[100px]">{route.route.split(' → ')[1]}</span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">Destination</span>
                    </div>
                  </div>
                  {/* Metrics */}
                  <div className="flex flex-col items-center justify-center min-w-[140px] gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-gray-900">{route.count}</span>
                      <span className="text-xs text-gray-500">Transfers</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-gray-900">{formatNumberWhole(route.volume)}</span>
                      <span className="text-xs text-gray-500">bbls</span>
                    </div>
                  </div>
                  {/* Types */}
                  <div className="flex flex-wrap gap-2 max-w-[340px] items-center">
                    {typesToShow.map((type, i) => (
                      <span
                        key={type}
                        className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium whitespace-nowrap"
                      >
                        {type}
                      </span>
                    ))}
                    {extraTypes > 0 && (
                      <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-medium whitespace-nowrap">
                        +{extraTypes} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Volume by Bulk Type - Enhanced Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Volume by Bulk Type</h3>
                  <p className="text-sm text-blue-100 mt-0.5">Material Distribution</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{formatNumberWhole(kpis.totalVolumeBbls)}</div>
                <div className="text-xs text-blue-100">Total bbls</div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(kpis.volumeByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([type, volume], index) => {
                  const percentage = (volume / kpis.totalVolumeBbls) * 100;
                  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400'];
                  
                  return (
                    <div key={type} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-semibold text-gray-800">{type}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{formatNumberWhole(volume)}</div>
                          <div className="text-xs text-gray-500">bbls</div>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full ${colors[index % colors.length]} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-medium text-white">{Math.round(percentage)}%</span>
                          {percentage > 15 && (
                            <span className="text-xs font-medium text-white">
                              {formatNumberWhole(volume)}
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Transfers by Vessel</h3>
                  <p className="text-sm text-green-100 mt-0.5">Fleet Performance</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{kpis.totalTransfers}</div>
                <div className="text-xs text-green-100">Total transfers</div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(kpis.transfersByVessel)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([vessel, count], index) => {
                  const percentage = (count / kpis.totalTransfers) * 100;
                  const colors = ['bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-green-400', 'bg-emerald-400', 'bg-teal-400', 'bg-cyan-400'];
                  
                  return (
                    <div key={vessel} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-sm font-semibold text-gray-800">{vessel}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{count}</div>
                          <div className="text-xs text-gray-500">transfers</div>
                        </div>
                      </div>
                      <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full ${colors[index % colors.length]} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-medium text-white">{Math.round(percentage)}%</span>
                          {percentage > 15 && (
                            <span className="text-xs font-medium text-white">
                              {count}
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

      {/* Detailed Transfer Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <BarChart3 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transfer Details</h2>
                <p className="text-sm text-gray-500">Detailed view of bulk material transfers</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Showing {paginatedBulkActions.length} of {filteredBulkActions.length} transfers (Page {currentPage} of {totalPages})
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
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
              {paginatedBulkActions.map((action) => (
                <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {action.startDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {action.vesselName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      action.action.toLowerCase().includes('load') ? 'bg-green-100 text-green-800' : 
                      action.action.toLowerCase().includes('discharge') ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {action.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {action.bulkType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {action.bulkDescription || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {action.standardizedOrigin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {action.standardizedDestination || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatNumberWhole(action.qty)} {action.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatNumberWhole(action.volumeBbls)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 border-t border-gray-200">
            <button
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="mt-6">
          <BulkFluidDebugPanel bulkActions={bulkActions} />
        </div>
      )}
    </div>
  );
};

export default BulkActionsDashboard;