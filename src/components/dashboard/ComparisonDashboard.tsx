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
  ChevronRight,
  Clock,
  Activity,
  Anchor,
  Factory,
  Package,
  Cloud
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatLargeCurrency, formatDaysWhole } from '../../utils/formatters';

interface ComparisonDashboardProps {
  onNavigateToUpload?: () => void;
}

type ComparisonType = 'months' | 'locations' | 'departments' | 'projectTypes';
type MetricType = 'totalCost' | 'vesselDays' | 'utilization' | 'waitingTime' | 'productiveTime' | 'avgVoyageDuration' | 'drillingDays' | 'productionDays' | 'cargoOps' | 'weatherDowntime';

interface ComparisonData {
  label: string;
  totalCost: number;
  vesselDays: number;
  utilization: number;
  voyageCount: number;
  waitingTime: number;
  productiveTime: number;
  avgVoyageDuration: number;
  drillingDays: number;
  productionDays: number;
  cargoOps: number;
  weatherDowntime: number;
  monthlyTrend?: Array<{
    month: string;
    value: number;
  }>;
}

const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({ onNavigateToUpload }) => {
  const { costAllocation, voyageEvents, voyageList, isDataReady } = useData();
  
  const [comparisonType, setComparisonType] = useState<ComparisonType>('months');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('totalCost');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Get available options based on comparison type
  const availableOptions = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) return [];

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
    if (!costAllocation || selectedItems.length === 0) return [];

    return selectedItems.map(item => {
      let filteredData = costAllocation;

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
      const rawUtilization = filteredData.length > 0 ? (vesselDays / (filteredData.length * 30)) * 100 : 0;
      const utilization = Math.min(rawUtilization, 100); // Cap at 100%

      // Calculate drilling and production days from cost allocation
      const drillingDays = filteredData
        .filter(cost => cost.department === 'Drilling' || cost.projectType === 'Drilling')
        .reduce((sum, cost) => sum + (cost.totalAllocatedDays || 0), 0);
      
      const productionDays = filteredData
        .filter(cost => cost.department === 'Production' || cost.projectType === 'Production')
        .reduce((sum, cost) => sum + (cost.totalAllocatedDays || 0), 0);

      // Calculate operational metrics from voyage events
      let waitingTime = 0;
      let productiveTime = 0;
      let cargoOps = 0;
      let weatherDowntime = 0;
      let totalVoyageDuration = 0;

      // Get related voyage events for this filtered data by matching LC numbers
      const relatedLCNumbers = [...new Set(filteredData.map(cost => cost.lcNumber).filter(Boolean))];
      const relatedVoyages = voyageEvents.filter(voyage => 
        voyage.lcNumber && relatedLCNumbers.includes(voyage.lcNumber)
      );

      relatedVoyages.forEach(voyage => {
        // Calculate productive vs non-productive time based on activity category
        if (voyage.activityCategory === 'Productive') {
          productiveTime += voyage.hours || 0;
        } else if (voyage.activityCategory === 'Non-Productive') {
          waitingTime += voyage.hours || 0;
        }

        // Identify specific event types
        const parentEventUpper = voyage.parentEvent?.toUpperCase() || '';
        
        // Weather-related downtime
        if (parentEventUpper.includes('WEATHER') || parentEventUpper.includes('WOW')) {
          weatherDowntime += voyage.hours || 0;
        }
        
        // Cargo operations
        if (parentEventUpper.includes('CARGO') || parentEventUpper.includes('LOAD') || 
            parentEventUpper.includes('DISCHARGE') || parentEventUpper.includes('BACKLOAD')) {
          cargoOps += voyage.hours || 0;
        }
        
        // General waiting events
        const waitingEvents = ['WAITING', 'WAIT', 'STANDBY'];
        if (waitingEvents.some(w => parentEventUpper.includes(w)) && !parentEventUpper.includes('WEATHER')) {
          waitingTime += voyage.hours || 0;
        }
      });

      // Get voyage-level information from voyageList
      const relatedVoyageNumbers = [...new Set(relatedVoyages.map(v => v.voyageNumber).filter(Boolean))];
      const relatedVoyageListItems = voyageList.filter(v => 
        relatedVoyageNumbers.includes(v.voyageNumber.toString())
      );

      relatedVoyageListItems.forEach(voyage => {
        // Calculate average voyage duration
        if (voyage.durationHours) {
          totalVoyageDuration += voyage.durationHours;
        }
      });

      // Convert hours to days
      waitingTime = waitingTime / 24;
      productiveTime = productiveTime / 24;
      cargoOps = cargoOps / 24;
      weatherDowntime = weatherDowntime / 24;
      const avgVoyageDuration = relatedVoyageListItems.length > 0 ? (totalVoyageDuration / 24) / relatedVoyageListItems.length : 0;

      // Calculate 6-month trend if needed
      let monthlyTrend: Array<{ month: string; value: number }> = [];
      if (comparisonType !== 'months') {
        // Get all cost allocation data (not just filtered)
        const allItemData = costAllocation.filter(cost => {
          switch (comparisonType) {
            case 'locations':
              return cost.rigLocation === item || cost.locationReference === item;
            case 'departments':
              return cost.department === item;
            case 'projectTypes':
              return cost.projectType === item;
            default:
              return false;
          }
        });

        console.log(`📊 Trend calculation for ${item}:`, {
          comparisonType,
          totalRecords: allItemData.length,
          selectedMetric,
          sampleData: allItemData.slice(0, 3),
          availableFields: allItemData.length > 0 ? Object.keys(allItemData[0]) : []
        });
        
        // Get last 6 months of data
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyData = new Map<string, number>();
        
        // Initialize last 6 months with 0 values
        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
          monthlyData.set(monthKey, 0);
        }
        
        allItemData.forEach(cost => {
          // Try multiple date fields and formats
          let costDate = cost.costAllocationDate;
          
          // If no costAllocationDate, try to parse monthYear
          if (!costDate && cost.monthYear) {
            // Handle various monthYear formats like "January 2024", "Jan 2024", "01/2024", etc.
            const monthYearStr = cost.monthYear.toString();
            
            // Try parsing as "Month Year" format
            const parsed = new Date(monthYearStr);
            if (!isNaN(parsed.getTime())) {
              costDate = parsed;
            } else {
              // Try parsing "MM/YYYY" or "MM-YYYY" format
              const parts = monthYearStr.split(/[/-]/);
              if (parts.length === 2) {
                const month = parseInt(parts[0]) - 1; // JavaScript months are 0-indexed
                const year = parseInt(parts[1]);
                if (!isNaN(month) && !isNaN(year)) {
                  costDate = new Date(year, month, 1);
                }
              }
            }
          }
          
          console.log(`📅 Date parsing for record:`, {
            costAllocationDate: cost.costAllocationDate,
            monthYear: cost.monthYear,
            parsedDate: costDate,
            isValid: costDate && !isNaN(costDate.getTime())
          });
          
          if (costDate && !isNaN(costDate.getTime()) && costDate >= sixMonthsAgo) {
            const monthKey = `${costDate.toLocaleString('en-US', { month: 'short' })} ${costDate.getFullYear()}`;
            const currentValue = monthlyData.get(monthKey) || 0;
            
            // Add value based on selected metric
            let valueToAdd = 0;
            switch (selectedMetric) {
              case 'totalCost':
                valueToAdd = cost.budgetedVesselCost || cost.totalCost || 0;
                break;
              case 'vesselDays':
                valueToAdd = cost.totalAllocatedDays || 0;
                break;
              case 'drillingDays':
              case 'productionDays':
                valueToAdd = cost.totalAllocatedDays || 0;
                break;
              case 'waitingTime':
              case 'productiveTime':
              case 'cargoOps':
              case 'weatherDowntime':
                // These need to be calculated from voyage events
                // For now, use a placeholder calculation
                valueToAdd = (cost.totalAllocatedDays || 0) * 0.2; // 20% estimate
                break;
              case 'utilization':
                valueToAdd = cost.totalAllocatedDays || 0; // Will calculate percentage later
                break;
              case 'avgVoyageDuration':
                valueToAdd = cost.totalAllocatedDays || 0;
                break;
            }
            
            // Apply filters for specific metrics
            if (selectedMetric === 'drillingDays' && !(cost.department === 'Drilling' || cost.projectType === 'Drilling')) {
              valueToAdd = 0;
            }
            if (selectedMetric === 'productionDays' && !(cost.department === 'Production' || cost.projectType === 'Production')) {
              valueToAdd = 0;
            }
            
            monthlyData.set(monthKey, currentValue + valueToAdd);
          }
        });
        
        console.log(`📈 Monthly data for ${item}:`, Array.from(monthlyData.entries()));
        
        // Convert to array and sort by date
        monthlyTrend = Array.from(monthlyData.entries())
          .map(([month, value]) => ({ month, value }))
          .sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(-6); // Ensure we only have last 6 months
          
        // For utilization, convert to percentage
        if (selectedMetric === 'utilization') {
          monthlyTrend = monthlyTrend.map(item => ({
            ...item,
            value: item.value > 0 ? (item.value / 30) * 100 : 0 // Assuming 30 days per month
          }));
        }
      }

      return {
        label: item,
        totalCost,
        vesselDays,
        utilization,
        voyageCount: filteredData.length,
        waitingTime,
        productiveTime,
        avgVoyageDuration,
        drillingDays,
        productionDays,
        cargoOps,
        weatherDowntime,
        monthlyTrend
      };
    });
  }, [costAllocation, voyageEvents, voyageList, comparisonType, selectedItems, selectedMetric]);

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
      case 'utilization':
        return data.utilization;
      case 'waitingTime':
        return data.waitingTime;
      case 'productiveTime':
        return data.productiveTime;
      case 'avgVoyageDuration':
        return data.avgVoyageDuration;
      case 'drillingDays':
        return data.drillingDays;
      case 'productionDays':
        return data.productionDays;
      case 'cargoOps':
        return data.cargoOps;
      case 'weatherDowntime':
        return data.weatherDowntime;
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
      case 'waitingTime':
      case 'productiveTime':
      case 'avgVoyageDuration':
      case 'drillingDays':
      case 'productionDays':
      case 'cargoOps':
      case 'weatherDowntime':
        return formatDaysWhole(value);
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
      case 'avgVoyageDuration':
        return <Ship className="w-4 h-4" />;
      case 'waitingTime':
        return <Clock className="w-4 h-4" />;
      case 'productiveTime':
        return <Activity className="w-4 h-4" />;
      case 'utilization':
        return <Percent className="w-4 h-4" />;
      case 'drillingDays':
        return <Anchor className="w-4 h-4" />;
      case 'productionDays':
        return <Factory className="w-4 h-4" />;
      case 'cargoOps':
        return <Package className="w-4 h-4" />;
      case 'weatherDowntime':
        return <Cloud className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  // Calculate max value for chart scaling
  const maxValue = Math.max(...comparisonData.map(d => getMetricValue(d)), 1);

  // Loading state
  if (!isDataReady || !costAllocation || costAllocation.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <GitCompare className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Comparison Dashboard
                  </h1>
                </div>
                <p className="text-gray-600 ml-14">Compare performance metrics across different dimensions</p>
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <GitCompare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Please upload cost allocation data to use the comparison features.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <GitCompare className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Comparison Dashboard
                </h1>
              </div>
              <p className="text-gray-600 ml-14">Compare performance metrics across different dimensions</p>
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

        {/* Controls */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
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
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Metric to Compare</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { metric: 'totalCost' as MetricType, label: 'Total Cost' },
                  { metric: 'vesselDays' as MetricType, label: 'Vessel Days' },
                  { metric: 'drillingDays' as MetricType, label: 'Drilling Days' },
                  { metric: 'productionDays' as MetricType, label: 'Production Days' },
                  { metric: 'utilization' as MetricType, label: 'Utilization' },
                  { metric: 'waitingTime' as MetricType, label: 'Waiting Time' },
                  { metric: 'productiveTime' as MetricType, label: 'Productive Time' },
                  { metric: 'cargoOps' as MetricType, label: 'Cargo Ops' },
                  { metric: 'weatherDowntime' as MetricType, label: 'Weather Delay' },
                  { metric: 'avgVoyageDuration' as MetricType, label: 'Avg Voyage' }
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
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Cost</span>
                          <p className="font-bold text-gray-900">{formatLargeCurrency(data.totalCost)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Vessel Days</span>
                          <p className="font-bold text-gray-900">{formatDaysWhole(data.vesselDays)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Drilling</span>
                          <p className="font-bold text-gray-900">{formatDaysWhole(data.drillingDays)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Production</span>
                          <p className="font-bold text-gray-900">{formatDaysWhole(data.productionDays)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Wait Time</span>
                          <p className="font-bold text-gray-900">{formatDaysWhole(data.waitingTime)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Utilization</span>
                          <p className="font-bold text-gray-900">{data.utilization.toFixed(1)}%</p>
                        </div>
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
                     selectedMetric === 'utilization' ? 'Utilization Rate' :
                     selectedMetric === 'waitingTime' ? 'Waiting Time' :
                     selectedMetric === 'productiveTime' ? 'Productive Time' :
                     selectedMetric === 'avgVoyageDuration' ? 'Average Voyage Duration' :
                     selectedMetric === 'drillingDays' ? 'Drilling Days' :
                     selectedMetric === 'productionDays' ? 'Production Days' :
                     selectedMetric === 'cargoOps' ? 'Cargo Operations' :
                     'Weather Downtime'} Comparison
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

            {/* 6-Month Trend Chart - Shows when not comparing months */}
            {comparisonType !== 'months' && comparisonData.some(d => d.monthlyTrend && d.monthlyTrend.length > 0) && (() => {
              console.log('📊 Trend Chart Data:', comparisonData.map(d => ({
                label: d.label,
                trendLength: d.monthlyTrend?.length,
                trendData: d.monthlyTrend
              })));
              return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">6-Month Trend Analysis</h3>
                  <span className="text-sm text-gray-500">
                    {selectedMetric === 'totalCost' ? 'Monthly Cost' :
                     selectedMetric === 'vesselDays' ? 'Monthly Vessel Days' :
                     selectedMetric === 'drillingDays' ? 'Monthly Drilling Days' :
                     selectedMetric === 'productionDays' ? 'Monthly Production Days' :
                     'Monthly Values'}
                  </span>
                </div>
                
                
                <div className="h-64 relative mb-8">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between text-xs text-gray-500">
                    {[100, 75, 50, 25, 0].map((percent) => {
                      const maxTrendValue = Math.max(...comparisonData.flatMap(d => d.monthlyTrend?.map(t => t.value) || [0]), 1);
                      const value = (maxTrendValue * percent) / 100;
                      return (
                        <div key={percent} className="text-right pr-2">
                          {formatMetricValue(value).length > 8 ? formatMetricValue(value).substring(0, 8) + '...' : formatMetricValue(value)}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Chart area */}
                  <div className="ml-24 h-full relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      {[0, 25, 50, 75, 100].map((percent) => (
                        <div
                          key={percent}
                          className="absolute w-full border-t border-gray-100"
                          style={{ top: `${100 - percent}%` }}
                        />
                      ))}
                    </div>
                    
                    {/* Line chart */}
                    <div className="relative h-full">
                      {comparisonData.map((data, index) => {
                        if (!data.monthlyTrend || data.monthlyTrend.length === 0) return null;
                        
                        const colors = ['blue', 'green', 'purple', 'orange'];
                        const color = colors[index % colors.length];
                        const maxValue = Math.max(...comparisonData.flatMap(d => d.monthlyTrend?.map(t => t.value) || [0]), 1);
                        
                        // Check if we have valid data
                        const hasData = data.monthlyTrend.some(point => point.value > 0);
                        if (!hasData) {
                          console.log(`⚠️ No data for ${data.label} trend`);
                        }
                        
                        return (
                          <div key={data.label} className="absolute inset-0">
                            {/* Line path */}
                            <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                              <polyline
                                fill="none"
                                stroke={color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#8b5cf6' : '#f59e0b'}
                                strokeWidth="2"
                                points={data.monthlyTrend.map((point, i) => {
                                  const x = data.monthlyTrend!.length > 1 ? (i / (data.monthlyTrend!.length - 1)) * 100 : 50;
                                  const y = maxValue > 0 ? 100 - ((point.value / maxValue) * 100) : 100;
                                  return `${x}%,${y}%`;
                                }).join(' ')}
                              />
                              {/* Data points */}
                              {data.monthlyTrend.map((point, i) => {
                                const x = data.monthlyTrend!.length > 1 ? (i / (data.monthlyTrend!.length - 1)) * 100 : 50;
                                const y = maxValue > 0 ? 100 - ((point.value / maxValue) * 100) : 100;
                                return (
                                  <circle
                                    key={i}
                                    cx={`${x}%`}
                                    cy={`${y}%`}
                                    r="4"
                                    fill={color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#8b5cf6' : '#f59e0b'}
                                    className="hover:r-6"
                                  />
                                );
                              })}
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-gray-500">
                      {comparisonData[0]?.monthlyTrend?.map((point, i) => (
                        <div key={i} className="text-center" style={{ transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                          {point.month}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 mt-6 justify-center">
                  {comparisonData.map((data, index) => {
                    const colors = ['blue', 'green', 'purple', 'orange'];
                    const color = colors[index % colors.length];
                    const bgColor = color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : color === 'purple' ? 'bg-purple-500' : 'bg-orange-500';
                    
                    return (
                      <div key={data.label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${bgColor}`}></div>
                        <span className="text-sm text-gray-600">{data.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })()}

            {/* Operational Metrics Breakdown - Shows when looking at time-based metrics */}
            {['waitingTime', 'productiveTime', 'avgVoyageDuration'].includes(selectedMetric) && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Performance Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {comparisonData.map((data, index) => {
                    const colors = ['blue', 'green', 'purple', 'orange'];
                    const color = colors[index % colors.length];
                    const totalTime = data.waitingTime + data.productiveTime;
                    
                    return (
                      <div key={data.label} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className={`text-sm font-medium text-${color}-600 mb-3`}>{data.label}</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Total Time</span>
                            <span className="text-sm font-bold">{formatDaysWhole(totalTime)}</span>
                          </div>
                          <div className="relative w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div 
                              className={`absolute left-0 top-0 h-full bg-green-500 transition-all duration-500`}
                              style={{ width: `${totalTime > 0 ? (data.productiveTime / totalTime) * 100 : 0}%` }}
                            />
                            <div 
                              className={`absolute top-0 h-full bg-orange-500 transition-all duration-500`}
                              style={{ 
                                left: `${totalTime > 0 ? (data.productiveTime / totalTime) * 100 : 0}%`,
                                width: `${totalTime > 0 ? (data.waitingTime / totalTime) * 100 : 0}%` 
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {totalTime > 0 ? ((data.productiveTime / totalTime) * 100).toFixed(0) : 0}% productive
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span className="text-gray-600">Productive: {formatDaysWhole(data.productiveTime)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-500 rounded"></div>
                              <span className="text-gray-600">Waiting: {formatDaysWhole(data.waitingTime)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                           selectedMetric === 'utilization' ? 'Utilization ' :
                           selectedMetric === 'waitingTime' ? 'Wait time ' :
                           selectedMetric === 'productiveTime' ? 'Productive time ' :
                           selectedMetric === 'avgVoyageDuration' ? 'Duration ' :
                           selectedMetric === 'drillingDays' ? 'Drilling days ' :
                           selectedMetric === 'productionDays' ? 'Production days ' :
                           selectedMetric === 'cargoOps' ? 'Cargo ops ' :
                           'Weather delay '}
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
    </div>
  );
};

export default ComparisonDashboard;