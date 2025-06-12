import React, { useState, useMemo } from 'react';
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                onChange={(e) => setSelectedDateRange([new Date(e.target.value), selectedDateRange[1]])}
              />
              <input
                type="date"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                onChange={(e) => setSelectedDateRange([selectedDateRange[0], new Date(e.target.value)])}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vessel</label>
            <select
              value={selectedVessel}
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Vessels</option>
              {vessels.map(vessel => (
                <option key={vessel} value={vessel}>{vessel}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Type</label>
            <select
              value={selectedBulkType}
              onChange={(e) => setSelectedBulkType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              {bulkTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Origins</option>
              {origins.map(origin => (
                <option key={origin} value={origin}>{origin}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Destinations</option>
              {destinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Top Transfer Routes
        </h2>
        <div className="grid gap-4">
          {transferRoutes.slice(0, 5).map((route, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">{route.route.split(' → ')[0]}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">{route.route.split(' → ')[1]}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Transfers:</span>
                  <span className="ml-2 font-semibold">{route.count}</span>
                </div>
                <div>
                  <span className="text-gray-500">Volume:</span>
                  <span className="ml-2 font-semibold">{formatNumberWhole(route.volume)} bbls</span>
                </div>
                <div>
                  <span className="text-gray-500">Types:</span>
                  <span className="ml-2 text-xs">{route.types.join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Transfer Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bulk Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (bbls)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBulkActions.slice(0, 20).map((action) => (
                <tr key={action.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {action.startDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {action.vesselName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      action.action.toLowerCase().includes('load') ? 'bg-green-100 text-green-800' : 
                      action.action.toLowerCase().includes('discharge') ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {action.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {action.bulkType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {action.bulkDescription || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {action.standardizedOrigin}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {action.standardizedDestination || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatNumberWhole(action.qty)} {action.unit}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatNumberWhole(action.volumeBbls)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBulkActions.length > 20 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing 20 of {filteredBulkActions.length} transfers
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