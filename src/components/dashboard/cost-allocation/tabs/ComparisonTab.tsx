import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Building2,
  Target,
  DollarSign,
  Ship,
  BarChart3,
  GitCompare,
  Percent,
  Filter,
  Clock,
  Activity,
  Anchor,
  Gauge,
  LineChart,
  PieChart,
  Download,
  Info
} from 'lucide-react';
import { CostAllocation } from '../../../../types';
import { formatLargeCurrency, formatCurrencyWhole, formatDaysWhole } from '../../../../utils/formatters';

interface ComparisonTabProps {
  costAllocation: CostAllocation[];
  selectedMonth: string;
  selectedLocation: string;
  selectedProjectType: string;
}

type ComparisonType = 'months' | 'locations' | 'departments' | 'projectTypes';
type MetricType = 'totalCost' | 'vesselDays' | 'avgDailyRate' | 'utilization' | 'avgWaitingTime' | 'efficiencyRatio' | 'costPerActivity' | 'voyageFrequency';
type ChartType = 'bar' | 'line' | 'radar' | 'pie';

interface ComparisonData {
  label: string;
  totalCost: number;
  vesselDays: number;
  avgDailyRate: number;
  utilization: number;
  voyageCount: number;
  avgWaitingTime: number;
  efficiencyRatio: number;
  costPerActivity: number;
  voyageFrequency: number;
  vesselTypes: string[];
  activities: string[];
  monthlyData?: { month: string; value: number }[];
}

interface FilterOptions {
  vesselClass?: string;
  activityType?: string;
  dateRange?: { start: Date; end: Date };
  minCost?: number;
  maxCost?: number;
}

export const ComparisonTab: React.FC<ComparisonTabProps> = ({
  costAllocation,
  selectedMonth,
  selectedLocation,
  selectedProjectType,
}) => {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('months');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('totalCost');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});

  // Get available options based on comparison type
  const availableOptions = useMemo(() => {
    switch (comparisonType) {
      case 'months':
        return [...new Set(costAllocation
          .filter(cost => cost.costAllocationDate instanceof Date)
          .map(cost => {
            const date = cost.costAllocationDate!;
            return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
          }))].sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateB.getTime() - dateA.getTime();
          });
      
      case 'locations':
        return [...new Set(costAllocation
          .map(cost => cost.rigLocation || cost.locationReference || 'Unknown')
          .filter(loc => loc !== 'Unknown'))].sort();
      
      case 'departments':
        return [...new Set(costAllocation
          .map(cost => cost.department || 'Unknown')
          .filter(dept => dept !== 'Unknown'))].sort();
      
      case 'projectTypes':
        return [...new Set(costAllocation
          .map(cost => cost.projectType || 'Other')
          .filter(Boolean))].sort();
      
      default:
        return [];
    }
  }, [costAllocation, comparisonType]);

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (selectedItems.length === 0) return [];

    return selectedItems.map(item => {
      let filteredData: CostAllocation[] = [];

      switch (comparisonType) {
        case 'months':
          filteredData = costAllocation.filter(cost => {
            if (!cost.costAllocationDate) return false;
            const monthYear = `${cost.costAllocationDate.toLocaleString('en-US', { month: 'long' })} ${cost.costAllocationDate.getFullYear()}`;
            return monthYear === item;
          });
          break;
        
        case 'locations':
          filteredData = costAllocation.filter(cost => 
            cost.rigLocation === item || cost.locationReference === item
          );
          break;
        
        case 'departments':
          filteredData = costAllocation.filter(cost => cost.department === item);
          break;
        
        case 'projectTypes':
          filteredData = costAllocation.filter(cost => cost.projectType === item);
          break;
      }

      // Apply filters
      if (filters.vesselClass) {
        // Filter by vessel type from the vessel cost rate description
        filteredData = filteredData.filter(cost => 
          cost.vesselRateDescription?.includes(filters.vesselClass!)
        );
      }
      if (filters.activityType) {
        // Filter by project type which is the closest to activity type
        filteredData = filteredData.filter(cost => cost.projectType === filters.activityType);
      }
      if (filters.dateRange) {
        filteredData = filteredData.filter(cost => {
          if (!cost.costAllocationDate) return false;
          return cost.costAllocationDate >= filters.dateRange!.start && 
                 cost.costAllocationDate <= filters.dateRange!.end;
        });
      }
      if (filters.minCost !== undefined) {
        filteredData = filteredData.filter(cost => 
          (cost.budgetedVesselCost || cost.totalCost || 0) >= filters.minCost!
        );
      }
      if (filters.maxCost !== undefined) {
        filteredData = filteredData.filter(cost => 
          (cost.budgetedVesselCost || cost.totalCost || 0) <= filters.maxCost!
        );
      }

      const totalCost = filteredData.reduce((sum, cost) => sum + (cost.budgetedVesselCost || cost.totalCost || 0), 0);
      const vesselDays = filteredData.reduce((sum, cost) => sum + (cost.totalAllocatedDays || 0), 0);
      const avgDailyRate = vesselDays > 0 ? totalCost / vesselDays : 0;
      const utilization = filteredData.length > 0 ? (vesselDays / (filteredData.length * 30)) * 100 : 0;
      
      // Calculate new metrics
      // Since waiting time is not available in CostAllocation, use a placeholder
      const avgWaitingTime = 0; // This would need to be calculated from voyage events
      
      const totalActivities = filteredData.length; // Use record count as proxy for activities
      const efficiencyRatio = vesselDays > 0 ? 0.85 : 0; // Placeholder efficiency ratio
      const costPerActivity = totalActivities > 0 ? totalCost / totalActivities : 0;
      
      // Calculate voyage frequency (voyages per month)
      const uniqueMonths = new Set(filteredData.map(cost => {
        if (!cost.costAllocationDate) return null;
        return `${cost.costAllocationDate.getFullYear()}-${cost.costAllocationDate.getMonth()}`;
      }).filter(Boolean));
      const voyageFrequency = uniqueMonths.size > 0 ? filteredData.length / uniqueMonths.size : 0;
      
      // Get unique vessel types and activities
      const vesselTypes: string[] = [];
      const activities = [...new Set(filteredData.map(cost => cost.projectType).filter(Boolean))] as string[];
      
      // Calculate monthly trend data for line charts
      const monthlyData = comparisonType === 'months' ? undefined : 
        (Array.from(new Set(filteredData.map(cost => {
          if (!cost.costAllocationDate) return null;
          return `${cost.costAllocationDate.getFullYear()}-${String(cost.costAllocationDate.getMonth() + 1).padStart(2, '0')}`;
        }).filter(Boolean))) as string[]).sort().map(month => {
          const monthData = filteredData.filter(cost => {
            if (!cost.costAllocationDate) return false;
            const costMonth = `${cost.costAllocationDate.getFullYear()}-${String(cost.costAllocationDate.getMonth() + 1).padStart(2, '0')}`;
            return costMonth === month;
          });
          const value = monthData.reduce((sum, cost) => {
            switch (selectedMetric) {
              case 'totalCost':
                return sum + (cost.budgetedVesselCost || cost.totalCost || 0);
              case 'vesselDays':
                return sum + (cost.totalAllocatedDays || 0);
              case 'avgWaitingTime':
                return 0; // Waiting time data not available in CostAllocation
              default:
                return sum;
            }
          }, 0);
          return { month, value };
        });

      return {
        label: item,
        totalCost,
        vesselDays,
        avgDailyRate,
        utilization,
        voyageCount: filteredData.length,
        avgWaitingTime,
        efficiencyRatio,
        costPerActivity,
        voyageFrequency,
        vesselTypes,
        activities,
        monthlyData
      };
    });
  }, [costAllocation, comparisonType, selectedItems, filters, selectedMetric]);

  // Toggle item selection
  const toggleItemSelection = (item: string) => {
    setSelectedItems(prev => {
      if (prev.includes(item)) {
        return prev.filter(i => i !== item);
      } else if (prev.length < 4) { // Limit to 4 items for comparison
        return [...prev, item];
      }
      return prev;
    });
  };

  // Get metric value
  const getMetricValue = (data: ComparisonData) => {
    switch (selectedMetric) {
      case 'totalCost':
        return data.totalCost;
      case 'vesselDays':
        return data.vesselDays;
      case 'avgDailyRate':
        return data.avgDailyRate;
      case 'utilization':
        return data.utilization;
      case 'avgWaitingTime':
        return data.avgWaitingTime;
      case 'efficiencyRatio':
        return data.efficiencyRatio * 100;
      case 'costPerActivity':
        return data.costPerActivity;
      case 'voyageFrequency':
        return data.voyageFrequency;
      default:
        return 0;
    }
  };

  // Format metric value
  const formatMetricValue = (value: number) => {
    switch (selectedMetric) {
      case 'totalCost':
        return formatLargeCurrency(value);
      case 'vesselDays':
        return formatDaysWhole(value);
      case 'avgDailyRate':
        return formatCurrencyWhole(value);
      case 'utilization':
        return `${value.toFixed(1)}%`;
      case 'avgWaitingTime':
        return `${value.toFixed(1)} days`;
      case 'efficiencyRatio':
        return `${value.toFixed(1)}%`;
      case 'costPerActivity':
        return formatCurrencyWhole(value);
      case 'voyageFrequency':
        return `${value.toFixed(1)}/mo`;
      default:
        return value.toString();
    }
  };

  // Get metric icon
  const getMetricIcon = () => {
    switch (selectedMetric) {
      case 'totalCost':
        return <DollarSign className="w-4 h-4" />;
      case 'vesselDays':
        return <Ship className="w-4 h-4" />;
      case 'avgDailyRate':
        return <BarChart3 className="w-4 h-4" />;
      case 'utilization':
        return <Percent className="w-4 h-4" />;
      case 'avgWaitingTime':
        return <Clock className="w-4 h-4" />;
      case 'efficiencyRatio':
        return <Gauge className="w-4 h-4" />;
      case 'costPerActivity':
        return <Activity className="w-4 h-4" />;
      case 'voyageFrequency':
        return <Anchor className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get available filters
  const availableFilters = useMemo(() => {
    // Extract vessel types from vessel rate descriptions
    const vesselTypes = new Set<string>();
    costAllocation.forEach(cost => {
      if (cost.vesselRateDescription) {
        // Extract vessel type from description like "FSV", "OSV", etc.
        const vesselMatch = cost.vesselRateDescription.match(/\b(FSV|OSV|PSV|Support|Specialty)\b/);
        if (vesselMatch) {
          vesselTypes.add(vesselMatch[1]);
        }
      }
    });
    
    return {
      vesselClasses: Array.from(vesselTypes).sort(),
      activities: [...new Set(costAllocation.map(cost => cost.projectType).filter(Boolean))].sort()
    };
  }, [costAllocation]);

  // Calculate max value for chart scaling
  const maxValue = Math.max(...comparisonData.map(d => getMetricValue(d)), 1);

  // Color style helper
  const getColorStyles = (index: number) => {
    const colorMap = [
      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', main: 'bg-blue-500', text900: 'text-blue-900' },
      { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', main: 'bg-green-500', text900: 'text-green-900' },
      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', main: 'bg-purple-500', text900: 'text-purple-900' },
      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', main: 'bg-orange-500', text900: 'text-orange-900' }
    ];
    return colorMap[index % colorMap.length];
  };

  // Get color values for SVG
  const getColorValue = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316']; // blue-500, green-500, purple-500, orange-500
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <GitCompare className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cost Comparison Analysis</h2>
            <p className="text-sm text-gray-600">Compare performance across different dimensions</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Comparison Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Compare By</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'months' as ComparisonType, label: 'Months', icon: Calendar },
                { type: 'locations' as ComparisonType, label: 'Locations', icon: MapPin },
                { type: 'departments' as ComparisonType, label: 'Departments', icon: Building2 },
                { type: 'projectTypes' as ComparisonType, label: 'Project Types', icon: Target }
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    setComparisonType(type);
                    setSelectedItems([]);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    comparisonType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Metric to Compare</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { metric: 'totalCost' as MetricType, label: 'Total Cost', icon: DollarSign },
                { metric: 'vesselDays' as MetricType, label: 'Vessel Days', icon: Ship },
                { metric: 'avgDailyRate' as MetricType, label: 'Daily Rate', icon: BarChart3 },
                { metric: 'utilization' as MetricType, label: 'Utilization', icon: Percent },
                { metric: 'avgWaitingTime' as MetricType, label: 'Waiting Time', icon: Clock },
                { metric: 'efficiencyRatio' as MetricType, label: 'Efficiency', icon: Gauge },
                { metric: 'costPerActivity' as MetricType, label: 'Cost/Activity', icon: Activity },
                { metric: 'voyageFrequency' as MetricType, label: 'Frequency', icon: Anchor }
              ].map(({ metric, label, icon: Icon }) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                    selectedMetric === metric
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Type and Filter Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Chart Type:</label>
            <div className="flex gap-2">
              {[
                { type: 'bar' as ChartType, icon: BarChart3 },
                { type: 'line' as ChartType, icon: LineChart },
                { type: 'radar' as ChartType, icon: Activity },
                { type: 'pie' as ChartType, icon: PieChart }
              ].map(({ type, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`p-2 rounded-lg border transition-all ${
                    chartType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                  title={type.charAt(0).toUpperCase() + type.slice(1) + ' Chart'}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            {Object.keys(filters).length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Vessel Class Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Vessel Class</label>
              <select
                value={filters.vesselClass || ''}
                onChange={(e) => setFilters({ ...filters, vesselClass: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Vessels</option>
                {availableFilters.vesselClasses.map(vc => (
                  <option key={vc} value={vc}>{vc}</option>
                ))}
              </select>
            </div>

            {/* Project Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Project Type</label>
              <select
                value={filters.activityType || ''}
                onChange={(e) => setFilters({ ...filters, activityType: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Project Types</option>
                {availableFilters.activities.map(activity => (
                  <option key={activity} value={activity}>{activity}</option>
                ))}
              </select>
            </div>

            {/* Cost Range Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Cost Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minCost || ''}
                  onChange={(e) => setFilters({ ...filters, minCost: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxCost || ''}
                  onChange={(e) => setFilters({ ...filters, maxCost: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Selection Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select {comparisonType === 'months' ? 'Months' : 
                 comparisonType === 'locations' ? 'Locations' :
                 comparisonType === 'departments' ? 'Departments' : 'Project Types'} to Compare
          <span className="text-sm font-normal text-gray-500 ml-2">(Max 4 items)</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableOptions.slice(0, 20).map(option => (
            <button
              key={option}
              onClick={() => toggleItemSelection(option)}
              disabled={!selectedItems.includes(option) && selectedItems.length >= 4}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                selectedItems.includes(option)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : selectedItems.length >= 4
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonData.map((data, index) => {
              const style = getColorStyles(index);
              
              return (
                <div key={data.label} className={`bg-white rounded-lg border-2 ${style.border} p-4`}>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 ${style.bg} rounded-md mb-3`}>
                    <div className={`w-3 h-3 ${style.main} rounded-full`}></div>
                    <span className={`text-sm font-medium ${style.text}`}>{data.label}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Total Cost</span>
                      <span className="text-sm font-bold text-gray-900">{formatLargeCurrency(data.totalCost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Vessel Days</span>
                      <span className="text-sm font-bold text-gray-900">{formatDaysWhole(data.vesselDays)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Daily Rate</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrencyWhole(data.avgDailyRate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Records</span>
                      <span className="text-sm font-bold text-gray-900">{data.voyageCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {getMetricIcon()}
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMetric === 'totalCost' ? 'Total Cost' :
                   selectedMetric === 'vesselDays' ? 'Vessel Days' :
                   selectedMetric === 'avgDailyRate' ? 'Average Daily Rate' : 
                   selectedMetric === 'utilization' ? 'Utilization Rate' :
                   selectedMetric === 'avgWaitingTime' ? 'Average Waiting Time' :
                   selectedMetric === 'efficiencyRatio' ? 'Efficiency Ratio' :
                   selectedMetric === 'costPerActivity' ? 'Cost per Activity' : 'Voyage Frequency'} Comparison
                </h3>
              </div>
              <button
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download chart data"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {/* Bar Chart */}
            {chartType === 'bar' && (
              <div className="space-y-4">
                {comparisonData.map((data, index) => {
                  const value = getMetricValue(data);
                  const percentage = (value / maxValue) * 100;
                  const style = getColorStyles(index);
                  
                  return (
                    <div key={data.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{data.label}</span>
                        <span className="text-sm font-bold text-gray-900">{formatMetricValue(value)}</span>
                      </div>
                      <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out ${style.main}`}
                          style={{ width: `${Math.max(2, percentage)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3">
                          {percentage > 15 && (
                            <span className="text-xs font-medium text-white">
                              {formatMetricValue(value)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Line Chart */}
            {chartType === 'line' && comparisonData.some(d => d.monthlyData) && (
              <div className="h-64 relative">
                <div className="absolute inset-0 flex items-end justify-between gap-1">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between h-full w-16 text-xs text-gray-500">
                    {[100, 75, 50, 25, 0].map(pct => (
                      <div key={pct} className="text-right pr-2">
                        {formatMetricValue((maxValue * pct) / 100)}
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart area */}
                  <div className="flex-1 h-full relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      {[0, 25, 50, 75, 100].map(pct => (
                        <div
                          key={pct}
                          className="absolute w-full border-t border-gray-200"
                          style={{ bottom: `${pct}%` }}
                        />
                      ))}
                    </div>
                    
                    {/* Lines */}
                    <svg className="absolute inset-0 w-full h-full">
                      {comparisonData.map((data, index) => {
                        if (!data.monthlyData || data.monthlyData.length === 0) return null;
                        const color = getColorValue(index);
                        
                        const points = data.monthlyData.map((point, i) => {
                          const x = (i / (data.monthlyData!.length - 1)) * 100;
                          const y = 100 - ((point.value / maxValue) * 100);
                          return `${x}%,${y}%`;
                        }).join(' ');
                        
                        return (
                          <polyline
                            key={data.label}
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Data points */}
                    {comparisonData.map((data, index) => {
                      if (!data.monthlyData || data.monthlyData.length === 0) return null;
                      const style = getColorStyles(index);
                      
                      return data.monthlyData.map((point, i) => {
                        const x = (i / (data.monthlyData!.length - 1)) * 100;
                        const y = 100 - ((point.value / maxValue) * 100);
                        
                        return (
                          <div
                            key={`${data.label}-${i}`}
                            className={`absolute w-2 h-2 ${style.main} rounded-full transform -translate-x-1/2 -translate-y-1/2`}
                            style={{ left: `${x}%`, bottom: `${100 - y}%` }}
                            title={`${point.month}: ${formatMetricValue(point.value)}`}
                          />
                        );
                      });
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                  {comparisonData.map((data, index) => {
                    const style = getColorStyles(index);
                    
                    return (
                      <div key={data.label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 ${style.main} rounded-full`} />
                        <span className="text-sm text-gray-600">{data.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pie Chart */}
            {chartType === 'pie' && (
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-64">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {(() => {
                      let cumulativePercentage = 0;
                      const total = comparisonData.reduce((sum, d) => sum + getMetricValue(d), 0);
                      
                      return comparisonData.map((data, index) => {
                        const value = getMetricValue(data);
                        const percentage = (value / total) * 100;
                        const color = getColorValue(index);
                        
                        const startAngle = (cumulativePercentage * 360) / 100;
                        const endAngle = ((cumulativePercentage + percentage) * 360) / 100;
                        
                        const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                        const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                        const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                        const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                        
                        const largeArcFlag = percentage > 50 ? 1 : 0;
                        
                        cumulativePercentage += percentage;
                        
                        return (
                          <path
                            key={data.label}
                            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                            fill={color}
                            className="hover:opacity-80 transition-opacity"
                          />
                        );
                      });
                    })()}
                  </svg>
                  
                  {/* Center hole for donut effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-white rounded-full shadow-inner" />
                  </div>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {comparisonData.length}
                    </div>
                    <div className="text-sm text-gray-500">Items</div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="ml-8 space-y-2">
                  {comparisonData.map((data, index) => {
                    const value = getMetricValue(data);
                    const total = comparisonData.reduce((sum, d) => sum + getMetricValue(d), 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    const style = getColorStyles(index);
                    
                    return (
                      <div key={data.label} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${style.main} rounded-full`} />
                          <span className="text-sm text-gray-700">{data.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{formatMetricValue(value)}</div>
                          <div className="text-xs text-gray-500">{percentage}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Radar Chart */}
            {chartType === 'radar' && comparisonData.length >= 3 && (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-gray-500">
                  Radar chart visualization coming soon
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Variance Analysis */}
          {comparisonData.length >= 2 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Variance Analysis</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Info className="w-4 h-4" />
                  <span>Comparing against {comparisonData[0].label}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisonData.slice(1).map((data, index) => {
                  const baseData = comparisonData[0];
                  const metrics = [
                    { key: 'totalCost', label: 'Total Cost', getValue: (d: ComparisonData) => d.totalCost, format: formatLargeCurrency, inverse: true },
                    { key: 'vesselDays', label: 'Vessel Days', getValue: (d: ComparisonData) => d.vesselDays, format: formatDaysWhole, inverse: false },
                    { key: 'avgDailyRate', label: 'Daily Rate', getValue: (d: ComparisonData) => d.avgDailyRate, format: formatCurrencyWhole, inverse: true },
                    { key: 'efficiencyRatio', label: 'Efficiency', getValue: (d: ComparisonData) => d.efficiencyRatio, format: (v: number) => `${(v * 100).toFixed(1)}%`, inverse: false },
                    { key: 'avgWaitingTime', label: 'Waiting Time', getValue: (d: ComparisonData) => d.avgWaitingTime, format: (v: number) => `${v.toFixed(1)} days`, inverse: true },
                    { key: 'voyageFrequency', label: 'Frequency', getValue: (d: ComparisonData) => d.voyageFrequency, format: (v: number) => `${v.toFixed(1)}/mo`, inverse: false }
                  ];
                  
                  return (
                    <div key={data.label} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-900">{data.label}</h4>
                        <p className="text-xs text-gray-500">vs {baseData.label}</p>
                      </div>
                      
                      <div className="space-y-3">
                        {metrics.map(metric => {
                          const baseValue = metric.getValue(baseData);
                          const currentValue = metric.getValue(data);
                          const variance = currentValue - baseValue;
                          const percentageChange = baseValue > 0 ? (variance / baseValue) * 100 : 0;
                          const isPositive = metric.inverse ? variance < 0 : variance > 0;
                          
                          return (
                            <div key={metric.key} className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">{metric.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-900">
                                  {metric.format(currentValue)}
                                </span>
                                <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  <span className="text-xs font-medium">{Math.abs(percentageChange).toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Overall Performance Score */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">Overall Score</span>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const positiveMetrics = metrics.filter(metric => {
                                const baseValue = metric.getValue(baseData);
                                const currentValue = metric.getValue(data);
                                const variance = currentValue - baseValue;
                                return metric.inverse ? variance < 0 : variance > 0;
                              }).length;
                              const score = (positiveMetrics / metrics.length) * 100;
                              const scoreColor = score >= 66 ? '#10B981' : score >= 33 ? '#F59E0B' : '#EF4444';
                              const textColor = score >= 66 ? 'text-green-600' : score >= 33 ? 'text-yellow-600' : 'text-red-600';
                              
                              return (
                                <>
                                  <div className={`w-24 bg-gray-200 rounded-full h-2 overflow-hidden`}>
                                    <div
                                      className={`h-full transition-all duration-500`}
                                      style={{ width: `${score}%`, backgroundColor: scoreColor }}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold ${textColor}`}>
                                    {score.toFixed(0)}%
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trend Analysis */}
          {comparisonData.length > 0 && comparisonType !== 'months' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <LineChart className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend Summary */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Monthly Performance Trends</h4>
                  {comparisonData.map((data, index) => {
                    if (!data.monthlyData || data.monthlyData.length < 2) return null;
                    
                    const firstMonth = data.monthlyData[0];
                    const lastMonth = data.monthlyData[data.monthlyData.length - 1];
                    const change = ((lastMonth.value - firstMonth.value) / firstMonth.value) * 100;
                    const avgValue = data.monthlyData.reduce((sum, m) => sum + m.value, 0) / data.monthlyData.length;
                    
                    const style = getColorStyles(index);
                    
                    return (
                      <div key={data.label} className={`p-4 ${style.bg} rounded-lg border ${style.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className={`text-sm font-semibold ${style.text900}`}>{data.label}</h5>
                          <div className={`flex items-center gap-1 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="text-sm font-bold">{Math.abs(change).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-600">Period</span>
                            <p className="font-medium text-gray-900">{firstMonth.month} to {lastMonth.month}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Average {selectedMetric === 'totalCost' ? 'Cost' : 'Value'}</span>
                            <p className="font-medium text-gray-900">{formatMetricValue(avgValue)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Key Insights */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Key Insights</h4>
                  <div className="space-y-3">
                    {/* Best Performer */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Best Performance</span>
                      </div>
                      <p className="text-xs text-green-700">
                        {(() => {
                          const best = comparisonData.reduce((best, current) => {
                            const currentValue = getMetricValue(current);
                            const bestValue = getMetricValue(best);
                            if (selectedMetric === 'totalCost' || selectedMetric === 'avgDailyRate' || selectedMetric === 'avgWaitingTime') {
                              return currentValue < bestValue ? current : best;
                            }
                            return currentValue > bestValue ? current : best;
                          });
                          return `${best.label} with ${formatMetricValue(getMetricValue(best))}`;
                        })()}
                      </p>
                    </div>
                    
                    {/* Highest Variability */}
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-900">Highest Variability</span>
                      </div>
                      <p className="text-xs text-yellow-700">
                        {(() => {
                          const variability = comparisonData.map(data => {
                            if (!data.monthlyData || data.monthlyData.length < 2) return { label: data.label, cv: 0 };
                            const values = data.monthlyData.map(m => m.value);
                            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                            const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
                            const stdDev = Math.sqrt(variance);
                            const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
                            return { label: data.label, cv };
                          }).sort((a, b) => b.cv - a.cv)[0];
                          return `${variability.label} with ${variability.cv.toFixed(1)}% coefficient of variation`;
                        })()}
                      </p>
                    </div>
                    
                    {/* Average Performance */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Average Performance</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        {(() => {
                          const total = comparisonData.reduce((sum, data) => sum + getMetricValue(data), 0);
                          const avg = total / comparisonData.length;
                          return `${formatMetricValue(avg)} across all ${comparisonType}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {selectedItems.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Selected</h3>
          <p className="text-gray-600">
            Select up to 4 {comparisonType === 'months' ? 'months' : 
                           comparisonType === 'locations' ? 'locations' :
                           comparisonType === 'departments' ? 'departments' : 'project types'} to compare their performance metrics.
          </p>
        </div>
      )}
    </div>
  );
};