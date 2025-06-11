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
  Percent
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
type MetricType = 'totalCost' | 'vesselDays' | 'avgDailyRate' | 'utilization';

interface ComparisonData {
  label: string;
  totalCost: number;
  vesselDays: number;
  avgDailyRate: number;
  utilization: number;
  voyageCount: number;
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

      const totalCost = filteredData.reduce((sum, cost) => sum + (cost.budgetedVesselCost || cost.totalCost || 0), 0);
      const vesselDays = filteredData.reduce((sum, cost) => sum + (cost.totalAllocatedDays || 0), 0);
      const avgDailyRate = vesselDays > 0 ? totalCost / vesselDays : 0;
      const utilization = filteredData.length > 0 ? (vesselDays / (filteredData.length * 30)) * 100 : 0;

      return {
        label: item,
        totalCost,
        vesselDays,
        avgDailyRate,
        utilization,
        voyageCount: filteredData.length
      };
    });
  }, [costAllocation, comparisonType, selectedItems]);

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
      default:
        return null;
    }
  };

  // Calculate max value for chart scaling
  const maxValue = Math.max(...comparisonData.map(d => getMetricValue(d)), 1);

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
                { metric: 'totalCost' as MetricType, label: 'Total Cost' },
                { metric: 'vesselDays' as MetricType, label: 'Vessel Days' },
                { metric: 'avgDailyRate' as MetricType, label: 'Daily Rate' },
                { metric: 'utilization' as MetricType, label: 'Utilization' }
              ].map(({ metric, label }) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                    selectedMetric === metric
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
              const colors = ['blue', 'green', 'purple', 'orange'];
              const color = colors[index % colors.length];
              const bgColor = `bg-${color}-50`;
              const borderColor = `border-${color}-200`;
              const textColor = `text-${color}-600`;
              
              return (
                <div key={data.label} className={`bg-white rounded-lg border-2 ${borderColor} p-4`}>
                  <div className={`inline-flex items-center gap-2 px-2 py-1 ${bgColor} rounded-md mb-3`}>
                    <div className={`w-3 h-3 bg-${color}-500 rounded-full`}></div>
                    <span className={`text-sm font-medium ${textColor}`}>{data.label}</span>
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
                      <span className="text-xs text-gray-500">Voyages</span>
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
                   selectedMetric === 'avgDailyRate' ? 'Average Daily Rate' : 'Utilization Rate'} Comparison
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {comparisonData.map((data, index) => {
                const value = getMetricValue(data);
                const percentage = (value / maxValue) * 100;
                const colors = ['blue', 'green', 'purple', 'orange'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={data.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{data.label}</span>
                      <span className="text-sm font-bold text-gray-900">{formatMetricValue(value)}</span>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out bg-${color}-500`}
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
          </div>

          {/* Variance Analysis */}
          {comparisonData.length >= 2 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Variance Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparisonData.slice(1).map((data, index) => {
                  const baseData = comparisonData[0];
                  const variance = getMetricValue(data) - getMetricValue(baseData);
                  const percentageChange = baseData.totalCost > 0 
                    ? ((getMetricValue(data) - getMetricValue(baseData)) / getMetricValue(baseData)) * 100 
                    : 0;
                  const isPositive = selectedMetric === 'totalCost' ? variance < 0 : variance > 0;
                  
                  return (
                    <div key={data.label} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {baseData.label} vs {data.label}
                        </span>
                        <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          <span className="text-sm font-bold">{Math.abs(percentageChange).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {variance > 0 ? '+' : ''}{formatMetricValue(Math.abs(variance))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedMetric === 'totalCost' ? 'Cost ' : 
                         selectedMetric === 'vesselDays' ? 'Days ' :
                         selectedMetric === 'avgDailyRate' ? 'Rate ' : 'Utilization '}
                        difference
                      </div>
                    </div>
                  );
                })}
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