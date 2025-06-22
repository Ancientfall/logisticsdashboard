import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  ArrowLeft,
  BarChart3,
  Building2,
  PieChart,
  Ship,
  Filter
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { 
  formatLargeCurrency,
  formatCurrencyWhole
} from '../../utils/formatters';
import { useCostAnalysisRedesigned } from './cost-allocation/hooks/useCostAnalysis';
import { useFilteredCostAllocation } from './cost-allocation/hooks/useFilteredCostAllocation';
import KPICard from './KPICard';
import SmartFilterBar from './SmartFilterBar';

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



  // Filters state - matching DrillingDashboard style
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations',
    selectedProjectType: 'All Types'
  });

  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

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
      months: ['All Months', 'YTD', ...uniqueMonths],
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



  // Calculate cost metrics
  const costMetrics = useCostAnalysisRedesigned(
    filteredCostAllocation,
    voyageEvents,
    vesselManifests,
    voyageList
  );


  // Loading state
  if (!isDataReady || !costAllocation || costAllocation.length === 0) {
    // Bypass if we have data but isDataReady is false
    if (costAllocation && costAllocation.length > 0 && !isDataReady) {
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


  return (
    <div className="space-y-6">
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Cost Allocation Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Real-time budget performance & cost analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{formatLargeCurrency(costMetrics.totalAllocatedCost || 0)}</div>
                <div className="text-sm text-gray-500">Total Spend</div>
              </div>
              <button
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-all duration-200"
              >
                <ArrowLeft size={16} />
                Back to Upload
              </button>
            </div>
          </div>
        </div>

        {/* Smart Filter Bar */}
        <SmartFilterBar
          timeFilter={filters.selectedMonth}
          locationFilter={filters.selectedLocation}
          onTimeChange={(value) => {
            console.log('🔄 CostAllocation: Time filter changed to:', value);
            console.log('🔄 Available time options:', filterOptions.months);
            setFilters(prev => ({ ...prev, selectedMonth: value }));
          }}
          onLocationChange={(value) => {
            console.log('🔄 CostAllocation: Location filter changed to:', value);
            setFilters(prev => ({ ...prev, selectedLocation: value }));
          }}
          timeOptions={filterOptions.months.map(month => ({ value: month, label: month }))}
          locationOptions={filterOptions.locations.map(location => ({ value: location, label: location }))}
          totalRecords={costAllocation.length}
          filteredRecords={filteredCostAllocation.length}
          showPresets={true}
        />

        {/* Dashboard Content */}
            {/* Enhanced Debug Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 font-semibold mb-2">Filter Debug Info:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <p><strong>Current Filters:</strong></p>
                  <p>• Month: {filters.selectedMonth}</p>
                  <p>• Location: {filters.selectedLocation}</p>
                  <p>• Project Type: {filters.selectedProjectType}</p>
                </div>
                <div>
                  <p><strong>Data Status:</strong></p>
                  <p>• Original Records: {costAllocation.length}</p>
                  <p>• Filtered Records: {filteredCostAllocation.length}</p>
                  <p>• YTD Available: {filterOptions.months.includes('YTD') ? 'Yes' : 'No'}</p>
                  <p>• Has Metrics: {(costMetrics.totalAllocatedCost > 0 || costMetrics.totalBudget > 0) ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {filteredCostAllocation.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-sm text-blue-700">
                    <strong>Sample Filtered Record:</strong> LC {filteredCostAllocation[0]?.lcNumber}, 
                    Cost: ${filteredCostAllocation[0]?.totalCost || filteredCostAllocation[0]?.budgetedVesselCost || 0}, 
                    Date: {filteredCostAllocation[0]?.costAllocationDate?.toISOString().split('T')[0] || 'No Date'}
                  </p>
                </div>
              )}
            </div>
            {/* Core Financial KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard 
            title="Total Spend" 
            value={formatLargeCurrency(costMetrics.totalAllocatedCost || 0)}
            color="blue"
            variant="secondary"
            contextualHelp="Total spend across all allocations in the selected period"
            status="good"
          />
          <KPICard 
            title="Avg Cost per Voyage" 
            value={formatLargeCurrency(costMetrics.avgCostPerVoyage)}
            color="purple"
            variant="secondary"
            contextualHelp="Average cost per voyage in the selected period"
            target={50000}
            status={costMetrics.avgCostPerVoyage <= 50000 ? 'good' : costMetrics.avgCostPerVoyage <= 75000 ? 'warning' : 'critical'}
          />
          <KPICard 
            title="Voyages Covered" 
            value={filteredCostAllocation.length.toLocaleString()}
            color="green"
            variant="secondary"
            contextualHelp="Number of cost allocation records in the current view"
            status="neutral"
          />
          <KPICard 
            title="Active Departments" 
            value={costMetrics.departmentBreakdown.length.toLocaleString()}
            color="orange"
            variant="secondary"
            contextualHelp="Number of unique departments with cost allocations in the selected period"
            status="neutral"
          />
        </div>

            {/* Operational Performance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Project Types" 
            value={costMetrics.projectTypeBreakdown.length.toLocaleString()}
            color="red"
            variant="secondary"
            contextualHelp="Number of different project types identified in cost allocations"
            status="neutral"
          />
          <KPICard 
            title="Avg Cost per Day" 
            value={formatCurrencyWhole(costMetrics.avgCostPerDay)}
            color="pink"
            variant="secondary"
            contextualHelp="Average cost per allocated vessel day (Total Spend ÷ Total Days)"
            target={5000}
            status={costMetrics.avgCostPerDay <= 5000 ? 'good' : costMetrics.avgCostPerDay <= 7500 ? 'warning' : 'critical'}
          />
          <KPICard 
            title="Top Location" 
            value={costMetrics.locationBreakdown[0]?.location || 'N/A'}
            color="indigo"
            variant="secondary"
            contextualHelp="Location with the highest total spend in the selected period"
            status="neutral"
          />
          <KPICard 
            title="Top Department" 
            value={costMetrics.departmentBreakdown[0]?.department || 'N/A'}
            color="yellow"
            variant="secondary"
            contextualHelp="Department with the highest total spend in the selected period"
            status="neutral"
          />
        </div>

            {/* Cost Performance Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Cost Performance Summary
                  </h2>
                  <p className="text-sm text-gray-600">Budget allocation and spending analysis</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-800">Total Spend</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 mb-1">
                    {formatLargeCurrency(costMetrics.totalAllocatedCost || 0)}
                  </div>
                  <div className="text-xs text-gray-600">in selected period</div>
                </div>
                
                <div className="p-4 rounded-lg border bg-purple-50 border-purple-200 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-800">Avg Cost per Voyage</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700 mb-1">
                    {formatLargeCurrency(costMetrics.avgCostPerVoyage)}
                  </div>
                  <div className="text-xs text-gray-600">average per trip</div>
                </div>
                
                <div className="p-4 rounded-lg border bg-green-50 border-green-200 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-800">Active Departments</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 mb-1">
                    {costMetrics.departmentBreakdown.length}
                  </div>
                  <div className="text-xs text-gray-600">active departments</div>
                </div>
                
                <div className="p-4 rounded-lg border bg-orange-50 border-orange-200 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"></div>
                    <span className="text-sm font-semibold text-gray-800">Project Types</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-700 mb-1">
                    {costMetrics.projectTypeBreakdown.length}
                  </div>
                  <div className="text-xs text-gray-600">different types</div>
                </div>
              </div>
            </div>

            {/* Analytics Dashboard Section */}
            <div className="space-y-6">
          {/* Department Cost Analysis & Location Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Cost Analysis - Modern Design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Department Cost Analysis
                    </h2>
                    <p className="text-sm text-gray-600">Budget allocation by department • {costMetrics.departmentBreakdown.length} departments</p>
                  </div>
                </div>
              
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {costMetrics.departmentBreakdown.slice(0, 6).map((dept, index) => {
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
                      <div key={dept.department} className={`p-4 rounded-lg border ${color.bg} ${color.border} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 bg-gradient-to-r ${color.gradient} rounded-full`}></div>
                          <span className="text-sm font-semibold text-gray-800">{dept.department}</span>
                        </div>
                        <div className={`text-xl font-bold ${color.text} mb-1`}>{formatLargeCurrency(dept.cost)}</div>
                        <div className="text-xs text-gray-600">{dept.percentage.toFixed(1)}% of total</div>
                        
                        {/* Mini trend bar */}
                        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.max(2, dept.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Location Cost Breakdown - Modern Design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        Location Cost Analysis
                      </h2>
                      <p className="text-sm text-gray-600">Top spending locations by cost</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    TOP 5
                  </span>
                </div>
                
                <div className="space-y-3">
                  {costMetrics.locationBreakdown.slice(0, 5).map((loc, index) => {
                    const rankings = [
                      { position: '#1', gradient: 'from-yellow-500 to-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
                      { position: '#2', gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
                      { position: '#3', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                      { position: '#4', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                      { position: '#5', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' }
                    ];
                    const ranking = rankings[index] || rankings[4];
                    
                    return (
                      <div key={loc.location} className={`flex items-center justify-between p-4 rounded-lg ${ranking.bg} border ${ranking.border} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 bg-gradient-to-r ${ranking.gradient} rounded-lg flex items-center justify-center`}>
                            <span className="text-xs font-bold text-white">{ranking.position}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{loc.location}</div>
                            <div className="text-xs text-gray-500">{loc.percentage.toFixed(1)}% of total spend</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${ranking.text}`}>{formatLargeCurrency(loc.cost)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Project Type Analysis & Monthly Trend Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Type Distribution - Modern Design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Project Type Distribution
                    </h2>
                    <p className="text-sm text-gray-600">Cost allocation by project category</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {costMetrics.projectTypeBreakdown.slice(0, 6).map((project, index) => {
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
                      <div key={project.projectType} className={`p-4 rounded-lg border ${color.bg} ${color.border} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 bg-gradient-to-r ${color.gradient} rounded-full`}></div>
                          <span className="text-sm font-semibold text-gray-800">{project.projectType}</span>
                        </div>
                        <div className={`text-xl font-bold ${color.text} mb-1`}>{formatLargeCurrency(project.cost)}</div>
                        <div className="text-xs text-gray-600">{project.percentage.toFixed(1)}% of total</div>
                        
                        {/* Mini trend bar */}
                        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${color.gradient} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.max(2, project.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Monthly Cost Trend - Modern Design */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Monthly Cost Trend
                    </h2>
                    <p className="text-sm text-gray-600">Last 6 months performance analysis</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {costMetrics.monthlyTrend.slice(-6).map((month, index, array) => {
                    const isLatest = index === array.length - 1;
                    const isActive = hoveredMonth === month.month || (!hoveredMonth && isLatest);
                    const colors = [
                      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
                      { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                      { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
                      { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div
                        key={month.month}
                        className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                          isActive ? `${color.bg} ${color.border}` : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onMouseEnter={() => setHoveredMonth(month.month)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-semibold ${isActive ? color.text : 'text-gray-900'}`}>{month.month}</div>
                            <div className="text-xs text-gray-500">{Math.round(month.days)} days allocated</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${isActive ? color.text : 'text-gray-900'}`}>{formatLargeCurrency(month.cost)}</div>
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
    </div>
  );
};

export default CostAllocationManagerRedesigned;