import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  MapPin, 
  Calendar, 
  ChevronRight,
  BarChart3,
  Building2,
  Target,
  PieChart,
  Ship,
  Filter
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { 
  formatLargeCurrency,
  formatCurrencyWhole,
  formatDaysWhole
} from '../../utils/formatters';
import { useCostAnalysisRedesigned } from './cost-allocation/hooks/useCostAnalysis';
import { useFilteredCostAllocation } from './cost-allocation/hooks/useFilteredCostAllocation';
import { TabNavigation } from './cost-allocation/TabNavigation';
import { COST_ALLOCATION_TABS, TabId } from './cost-allocation/constants';

interface CostAllocationManagerRedesignedProps {
  onNavigateToUpload?: () => void;
}

const CostAllocationManagerRedesigned: React.FC<CostAllocationManagerRedesignedProps> = ({ onNavigateToUpload }) => {
  const { 
    costAllocation, 
    voyageEvents,
    vesselManifests,
    voyageList,
    isDataReady
  } = useData();

  // Debug logging
  console.log('🔍 CostAllocationDashboard Debug:', {
    isDataReady,
    costAllocationCount: costAllocation?.length || 0,
    costAllocationSample: costAllocation?.slice(0, 3),
    voyageEventsCount: voyageEvents?.length || 0,
    vesselManifestsCount: vesselManifests?.length || 0,
    voyageListCount: voyageList?.length || 0
  });

  // Debug cost allocation dates
  if (costAllocation && costAllocation.length > 0) {
    console.log('📅 Cost Allocation Date Check:', {
      firstRecord: costAllocation[0],
      hasDate: costAllocation[0].costAllocationDate instanceof Date,
      dateValue: costAllocation[0].costAllocationDate,
      monthYear: costAllocation[0].monthYear,
      totalCost: costAllocation[0].totalCost,
      budgetedVesselCost: costAllocation[0].budgetedVesselCost
    });
  }

  // Filters state - matching DrillingDashboard style
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations',
    selectedProjectType: 'All Types'
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Get unique filter options
  const filterOptions = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) {
      return {
        months: ['All Months'],
        locations: ['All Locations'],
        projectTypes: ['All Types']
      };
    }

    // Get unique months
    const uniqueMonths = [...new Set(costAllocation
      .filter(cost => cost.costAllocationDate instanceof Date && !isNaN(cost.costAllocationDate.getTime()))
      .map(cost => {
        const date = cost.costAllocationDate!;
        return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
      }))].sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      });

    // Get unique locations
    const uniqueLocations = [...new Set(costAllocation
      .map(cost => cost.rigLocation || cost.locationReference || 'Unknown')
      .filter(loc => loc !== 'Unknown'))].sort();

    // Get unique project types
    const uniqueProjectTypes = [...new Set(costAllocation
      .map(cost => cost.projectType || 'Other')
      .filter(Boolean))].sort();

    return {
      months: ['All Months', ...uniqueMonths],
      locations: ['All Locations', ...uniqueLocations],
      projectTypes: ['All Types', ...uniqueProjectTypes]
    };
  }, [costAllocation]);

  // Filter cost allocation data
  const filteredCostAllocation = useFilteredCostAllocation(
    costAllocation,
    filters.selectedMonth,
    filters.selectedLocation,
    filters.selectedProjectType
  );

  // Debug filtered data
  console.log('🔍 Filtered CostAllocation:', {
    originalCount: costAllocation?.length || 0,
    filteredCount: filteredCostAllocation?.length || 0,
    filters,
    filteredSample: filteredCostAllocation?.slice(0, 3)
  });

  // Calculate cost metrics
  const costMetrics = useCostAnalysisRedesigned(
    filteredCostAllocation,
    voyageEvents,
    vesselManifests,
    voyageList
  );

  // Debug metrics
  console.log('📊 Cost Metrics:', {
    totalAllocatedCost: costMetrics.totalAllocatedCost,
    totalBudget: costMetrics.totalBudget,
    departmentBreakdown: costMetrics.departmentBreakdown,
    projectTypeBreakdown: costMetrics.projectTypeBreakdown,
    locationBreakdown: costMetrics.locationBreakdown,
    hasData: costMetrics.totalAllocatedCost > 0 || costMetrics.totalBudget > 0
  });

  // Loading state - temporarily modified to show data status
  if (!isDataReady || !costAllocation || costAllocation.length === 0) {
    console.log('⚠️ Loading state triggered:', {
      isDataReady,
      hasCostAllocation: !!costAllocation,
      costAllocationLength: costAllocation?.length || 0
    });
    
    // Temporarily bypass if we have data but isDataReady is false
    if (costAllocation && costAllocation.length > 0 && !isDataReady) {
      console.warn('⚠️ Data exists but isDataReady is false - showing dashboard anyway');
      // Continue to render dashboard
    } else {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">
              {!isDataReady ? 'Waiting for data to be ready...' : 
               !costAllocation ? 'Loading cost allocation data...' :
               'No cost allocation data available'}
            </p>
          </div>
        </div>
      );
    }
  }

  // KPI Card component
  const KPICard: React.FC<{
    title: string;
    value: string | number;
    trend?: number | null;
    isPositive?: boolean | null;
    unit?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink' | 'yellow';
  }> = ({ title, value, trend, isPositive, unit, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      indigo: 'bg-indigo-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500'
    };
    
    return (
      <div className="relative overflow-hidden bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            {trend !== null && trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-gray-900">{value}</p>
            {unit && <span className="text-sm font-normal text-gray-500">{unit}</span>}
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClasses[color]}`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Modern Header with Gradient */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Cost Allocation Dashboard
                </h1>
              </div>
              <p className="text-gray-600 ml-14">Real-time Budget Performance & Cost Analytics</p>
            </div>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Upload
            </button>
          </div>
        </div>

        {/* Modern Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Time Period</label>
                  <select 
                    className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[180px]"
                    value={filters.selectedMonth}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
                  >
                    {filterOptions.months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</label>
                  <select 
                    className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 min-w-[200px]"
                    value={filters.selectedLocation}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedLocation: e.target.value }))}
                  >
                    {filterOptions.locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Project Type</label>
                  <select 
                    className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 min-w-[150px]"
                    value={filters.selectedProjectType}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedProjectType: e.target.value }))}
                  >
                    {filterOptions.projectTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>{filteredCostAllocation.length} allocations</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <TabNavigation
            tabs={COST_ALLOCATION_TABS}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as TabId)}
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Debug Info - Temporary */}
            {costMetrics.totalAllocatedCost === 0 && costMetrics.totalBudget === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-semibold mb-2">Debug Info:</p>
                <p className="text-sm text-yellow-700">
                  Original Records: {costAllocation.length} | 
                  Filtered Records: {filteredCostAllocation.length} | 
                  Has Metrics: {(costMetrics.totalAllocatedCost > 0 || costMetrics.totalBudget > 0) ? 'Yes' : 'No'}
                </p>
                {filteredCostAllocation.length > 0 && (
                  <p className="text-sm text-yellow-700 mt-1">
                    Sample: LC {filteredCostAllocation[0]?.lcNumber}, 
                    Cost: ${filteredCostAllocation[0]?.totalCost || 0}, 
                    Budget: ${filteredCostAllocation[0]?.budgetedVesselCost || 0}
                  </p>
                )}
              </div>
            )}
            {/* KPI Cards Grid - First Row (Financial Overview) */}
            <div className="grid grid-cols-3 gap-4">
          <KPICard 
            title="Total Cost" 
            value={formatLargeCurrency(costMetrics.totalAllocatedCost || 0)}
            trend={costMetrics.costTrend}
            isPositive={costMetrics.costTrend < 0}
            color="blue"
          />
          <KPICard 
            title="Efficiency Score" 
            value={costMetrics.costEfficiency.toFixed(1)}
            trend={null}
            isPositive={costMetrics.costEfficiency > 90}
            unit="%"
            color="purple"
          />
          <KPICard 
            title="Active Locations" 
            value={costMetrics.activeRigs}
            trend={null}
            unit="sites"
            color="orange"
          />
        </div>

            {/* KPI Cards Grid - Second Row (Operational Metrics) */}
            <div className="grid grid-cols-5 gap-4">
          <KPICard 
            title="Total Days" 
            value={formatDaysWhole(costMetrics.totalAllocatedDays)}
            trend={null}
            unit="days"
            color="green"
          />
          <KPICard 
            title="Cost per Day" 
            value={formatCurrencyWhole(costMetrics.avgCostPerDay)}
            trend={costMetrics.dailyCostTrend}
            isPositive={costMetrics.dailyCostTrend < 0}
            color="pink"
          />
          <KPICard 
            title="Daily Rate (Avg)" 
            value={formatCurrencyWhole(costMetrics.avgDailyRate)}
            trend={null}
            color="yellow"
          />
          <KPICard 
            title="Utilization Rate" 
            value={costMetrics.utilizationRate.toFixed(1)}
            trend={costMetrics.utilizationTrend}
            isPositive={costMetrics.utilizationTrend > 0}
            unit="%"
            color="blue"
          />
          <KPICard 
            title="Voyages Covered" 
            value={filteredCostAllocation.length}
            trend={null}
            unit={filters.selectedLocation !== 'All Locations' || filters.selectedMonth !== 'All Months' ? 'filtered' : 'total'}
            color="red"
          />
        </div>

            {/* Budget Performance Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Budget Performance Overview</h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                {costMetrics.budgetVariance < 0 ? 'Under Budget' : 'Over Budget'} by {formatLargeCurrency(Math.abs(costMetrics.budgetVariance))}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-gray-600">Budget Utilization</div>
              <div className="text-2xl font-bold text-blue-600">
                {costMetrics.totalBudget > 0 ? ((costMetrics.totalAllocatedCost / costMetrics.totalBudget) * 100).toFixed(1) : '0'}%
              </div>
              <div className="text-xs text-gray-500">of total budget</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-gray-600">Cost per Voyage</div>
              <div className="text-2xl font-bold text-purple-600">
                {formatLargeCurrency(costMetrics.avgCostPerVoyage)}
              </div>
              <div className="text-xs text-gray-500">average per trip</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-gray-600">Department Count</div>
              <div className="text-2xl font-bold text-green-600">
                {costMetrics.departmentBreakdown.length}
              </div>
              <div className="text-xs text-gray-500">active departments</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-gray-600">Project Types</div>
              <div className="text-2xl font-bold text-orange-600">
                {costMetrics.projectTypeBreakdown.length}
              </div>
              <div className="text-xs text-gray-500">different types</div>
            </div>
          </div>
        </div>

            {/* Analytics Dashboard Section */}
            <div className="space-y-6">
          {/* Department Cost Analysis & Location Breakdown Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Department Cost Analysis */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Department Cost Analysis</h3>
                      <p className="text-sm text-blue-100 mt-0.5">Budget allocation by department</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{costMetrics.departmentBreakdown.length}</div>
                    <div className="text-xs text-blue-100">Departments</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {costMetrics.departmentBreakdown.slice(0, 5).map((dept, index) => {
                    const colors = ['blue', 'green', 'purple', 'orange', 'red'];
                    const color = colors[index % colors.length];
                    return (
                      <div key={dept.department} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ring-4 ring-opacity-30 ${
                              color === 'blue' ? 'bg-blue-500' :
                              color === 'green' ? 'bg-green-500' :
                              color === 'purple' ? 'bg-purple-500' :
                              color === 'orange' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`} style={{ boxShadow: `0 0 0 4px ${
                              color === 'blue' ? '#3b82f630' :
                              color === 'green' ? '#10b98130' :
                              color === 'purple' ? '#8b5cf630' :
                              color === 'orange' ? '#f5970030' :
                              '#ef444430'
                            }` }}></div>
                            <span className="text-sm font-semibold text-gray-800">{dept.department}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{formatLargeCurrency(dept.cost)}</div>
                            <div className="text-xs text-gray-500">{dept.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                          <div 
                            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out ${
                              color === 'blue' ? 'bg-blue-500' :
                              color === 'green' ? 'bg-green-500' :
                              color === 'purple' ? 'bg-purple-500' :
                              color === 'orange' ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(2, dept.percentage)}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-xs font-medium text-white">{dept.percentage.toFixed(1)}%</span>
                            {dept.percentage > 20 && (
                              <span className="text-xs font-medium text-white">
                                {formatLargeCurrency(dept.cost)}
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

            {/* Location Cost Breakdown */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Location Cost Analysis</h3>
                      <p className="text-sm text-green-100 mt-0.5">Top spending locations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{costMetrics.activeRigs}</div>
                    <div className="text-xs text-green-100">Active Sites</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {costMetrics.locationBreakdown.slice(0, 5).map((loc, index) => (
                    <div key={loc.location} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm font-bold text-green-700">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{loc.location}</div>
                          <div className="text-xs text-gray-500">{loc.percentage.toFixed(1)}% of total</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatLargeCurrency(loc.cost)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Project Type Analysis & Monthly Trend Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Project Type Distribution */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Project Type Distribution</h3>
                      <p className="text-sm text-purple-100 mt-0.5">Cost allocation by project category</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {costMetrics.projectTypeBreakdown.slice(0, 6).map((project) => {
                    const iconColors = {
                      'Drilling': 'text-blue-600 bg-blue-100',
                      'Completions': 'text-green-600 bg-green-100',
                      'Production': 'text-purple-600 bg-purple-100',
                      'Maintenance': 'text-orange-600 bg-orange-100',
                      'P&A': 'text-red-600 bg-red-100',
                      'Other': 'text-gray-600 bg-gray-100'
                    };
                    const style = iconColors[project.projectType as keyof typeof iconColors] || iconColors['Other'];
                    
                    return (
                      <div key={project.projectType} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style}`}>
                            <Target className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{project.projectType}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">{formatLargeCurrency(project.cost)}</div>
                        <div className="text-xs text-gray-500">{project.percentage.toFixed(1)}% of total</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Monthly Cost Trend */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Monthly Cost Trend</h3>
                      <p className="text-sm text-orange-100 mt-0.5">Last 6 months performance</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {costMetrics.monthlyTrend.slice(-6).map((month, index, array) => {
                    const isLatest = index === array.length - 1;
                    return (
                      <div key={month.month} className={`p-3 rounded-lg transition-colors ${isLatest ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{month.month}</div>
                            <div className="text-xs text-gray-500">{Math.round(month.days)} days allocated</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">{formatLargeCurrency(month.cost)}</div>
                            {month.trend !== null && (
                              <div className={`flex items-center justify-end gap-1 text-xs font-medium ${
                                month.trend < 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {month.trend < 0 ? (
                                  <TrendingDown className="w-3 h-3" />
                                ) : (
                                  <TrendingUp className="w-3 h-3" />
                                )}
                                <span>{Math.abs(month.trend).toFixed(0)}%</span>
                              </div>
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

          {/* Location Deep Dive Chart - Shows when location filter is applied */}
          {filters.selectedLocation !== 'All Locations' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Filter className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Location Deep Dive: {filters.selectedLocation}</h3>
                      <p className="text-sm text-indigo-100 mt-0.5">6-month cost and vessel days analysis</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Calculate location-specific monthly data */}
                {(() => {
                  // Calculate location monthly data inside the component
                  const locationData = costAllocation.filter(cost => 
                    (cost.rigLocation === filters.selectedLocation || cost.locationReference === filters.selectedLocation)
                  );
                  
                  console.log('🔍 Location Deep Dive Debug:', {
                    selectedLocation: filters.selectedLocation,
                    locationDataCount: locationData.length,
                    sampleRecord: locationData[0],
                    totalCostCheck: locationData[0]?.totalCost,
                    allocatedDaysCheck: locationData[0]?.totalAllocatedDays
                  });
                  
                  // Group by month
                  const monthlyMap = new Map<string, { cost: number; days: number; count: number }>();
                  
                  locationData.forEach(cost => {
                    if (cost.costAllocationDate instanceof Date && !isNaN(cost.costAllocationDate.getTime())) {
                      const monthKey = `${cost.costAllocationDate.toLocaleString('en-US', { month: 'short' })} ${cost.costAllocationDate.getFullYear()}`;
                      const existing = monthlyMap.get(monthKey) || { cost: 0, days: 0, count: 0 };
                      
                      // Debug individual record
                      if (existing.count === 0) {
                        console.log(`📊 Processing ${monthKey}:`, {
                          totalCost: cost.totalCost,
                          budgetedVesselCost: cost.budgetedVesselCost,
                          totalAllocatedDays: cost.totalAllocatedDays,
                          allProps: Object.keys(cost)
                        });
                      }
                      
                      monthlyMap.set(monthKey, {
                        cost: existing.cost + (cost.budgetedVesselCost || cost.totalCost || 0),
                        days: existing.days + (cost.totalAllocatedDays || 0),
                        count: existing.count + 1
                      });
                    }
                  });
                  
                  // Convert to array and sort by date
                  const locationMonthlyData = Array.from(monthlyMap.entries())
                    .map(([month, data]) => ({ month, ...data }))
                    .sort((a, b) => {
                      const dateA = new Date(a.month);
                      const dateB = new Date(b.month);
                      return dateA.getTime() - dateB.getTime();
                    })
                    .slice(-6); // Last 6 months
                  
                  console.log('📈 Location Monthly Data:', locationMonthlyData);
                  
                  const maxCost = Math.max(...locationMonthlyData.map(d => d.cost), 1);
                  const maxDays = Math.max(...locationMonthlyData.map(d => d.days), 1);
                  
                  console.log('📏 Max values:', { maxCost, maxDays });
                  console.log('📉 Bar heights for last 6 months:', locationMonthlyData.map(d => ({
                    month: d.month,
                    cost: d.cost,
                    days: d.days,
                    costHeight: `${Math.max((d.cost / maxCost) * 90, 10)}%`,
                    daysHeight: `${Math.max((d.days / maxDays) * 90, 10)}%`
                  })));
                  
                  return (
                    <div className="space-y-6">
                      {/* Chart */}
                      <div className="h-64 bg-gray-50 rounded-lg p-4">
                        <div className="h-full flex items-end justify-between gap-3">
                          {locationMonthlyData.map((month) => {
                            const costHeight = (month.cost / maxCost) * 100;
                            const daysHeight = (month.days / maxDays) * 100;
                            
                            return (
                              <div key={month.month} className="flex-1 flex flex-col items-center gap-2 h-full">
                                {/* Bars container */}
                                <div className="flex-1 w-full flex items-end gap-1">
                                  {/* Cost bar */}
                                  <div 
                                    className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-500 hover:from-indigo-700 hover:to-indigo-500 relative group"
                                    style={{ 
                                      height: `${costHeight}%`,
                                      minHeight: '20px'
                                    }}
                                  >
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                      {formatLargeCurrency(month.cost)}
                                    </div>
                                  </div>
                                  {/* Days bar */}
                                  <div 
                                    className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-700 hover:to-blue-500 relative group"
                                    style={{ 
                                      height: `${daysHeight}%`,
                                      minHeight: '20px'
                                    }}
                                  >
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                      {Math.round(month.days)} days
                                    </div>
                                  </div>
                                </div>
                                {/* Month label */}
                                <div className="text-xs font-medium text-gray-600 whitespace-nowrap">{month.month}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Legend and Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded"></div>
                            <span className="text-sm font-medium text-gray-700">Total Cost</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded"></div>
                            <span className="text-sm font-medium text-gray-700">Vessel Days</span>
                          </div>
                        </div>
                        
                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-medium text-indigo-600 uppercase">6-Month Total</span>
                          </div>
                          <div className="text-lg font-bold text-indigo-900">
                            {formatLargeCurrency(locationMonthlyData.reduce((sum, m) => sum + m.cost, 0))}
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Ship className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600 uppercase">Total Vessel Days</span>
                          </div>
                          <div className="text-lg font-bold text-blue-900">
                            {Math.round(locationMonthlyData.reduce((sum, m) => sum + m.days, 0))} days
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
            </div>
          </>
        )}


        {/* Other tabs placeholder */}
        {activeTab === 'rigs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-gray-500 text-center py-12">Rigs tab - Coming soon</div>
          </div>
        )}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-gray-500 text-center py-12">Projects tab - Coming soon</div>
          </div>
        )}
        {activeTab === 'monthly' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-gray-500 text-center py-12">Monthly Tracking tab - Coming soon</div>
          </div>
        )}
        {activeTab === 'trends' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-gray-500 text-center py-12">Monthly Trends tab - Coming soon</div>
          </div>
        )}
        {activeTab === 'export' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-gray-500 text-center py-12">Export & Templates tab - Coming soon</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostAllocationManagerRedesigned;