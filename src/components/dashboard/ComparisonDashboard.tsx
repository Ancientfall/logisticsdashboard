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
  Factory,
  Package,
  Cloud
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatDaysWhole, formatSmartCurrency } from '../../utils/formatters';
import { calculateAllEnhancedKPIs } from '../../utils/enhancedKPICalculation';
import { calculateEnhancedBulkFluidMetrics } from '../../utils/metricsCalculation';

interface ComparisonDashboardProps {
  onNavigateToUpload?: () => void;
}

type ComparisonType = 'months' | 'locations' | 'departments' | 'projectTypes';
type MetricType = 'logisticsCost' | 'cargoTons' | 'liftsPerHour' | 'vesselVisits' | 'utilization' | 'fluidVolume' | 'sharedVisitsPercent' | 'roundTrippedLifts' | 'totalOSVHours' | 'productiveHours' | 'waitingTime' | 'weatherDowntime';

interface ComparisonData {
  label: string;
  logisticsCost: number;
  cargoTons: number;
  liftsPerHour: number;
  vesselVisits: number;
  utilization: number;
  fluidVolume: number;
  sharedVisitsPercent: number;
  roundTrippedLifts: number;
  totalOSVHours: number;
  productiveHours: number;
  waitingTime: number; // in days for display
  waitingTimeHours: number; // in hours for calculations
  weatherDowntime: number; // in days for display
  weatherDowntimeHours: number; // in hours for calculations
  monthlyTrend?: Array<{
    month: string;
    value: number;
  }>;
}

const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({ onNavigateToUpload }) => {
  const { costAllocation, voyageEvents, voyageList, vesselManifests, bulkActions, isDataReady } = useData();
  
  const [comparisonType, setComparisonType] = useState<ComparisonType>('months');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('logisticsCost');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Time filtering states
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [isYTD, setIsYTD] = useState<boolean>(true);

  // Get available years from actual data
  const availableYears = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) return [];
    
    const years = [...new Set(costAllocation
      .filter(cost => cost.costAllocationDate instanceof Date)
      .map(cost => cost.costAllocationDate!.getFullYear())
    )].sort((a, b) => b - a); // Most recent first
    
    return years;
  }, [costAllocation]);

  // Get available months for selected year
  const availableMonths = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) return [];
    
    const months = [...new Set(costAllocation
      .filter(cost => 
        cost.costAllocationDate instanceof Date && 
        cost.costAllocationDate.getFullYear() === filterYear
      )
      .map(cost => cost.costAllocationDate!.getMonth())
    )].sort((a, b) => a - b);
    
    return months;
  }, [costAllocation, filterYear]);

  // Set default year to the most recent year with data
  React.useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(filterYear)) {
      setFilterYear(availableYears[0]);
    }
  }, [availableYears, filterYear]);

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
    if (!costAllocation || selectedItems.length === 0 || !voyageEvents || !vesselManifests || !bulkActions) return [];

    return selectedItems.map(item => {
      // Determine time and location filters based on comparison type
      let timeMonth = undefined;
      let timeYear = undefined;
      let locationFilter = undefined;
      let filteredCostAllocation = costAllocation;
      
      if (comparisonType === 'months') {
        // For month comparison, parse the month/year from the item
        const [monthName, yearStr] = item.split(' ');
        const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
        timeMonth = monthIndex;
        timeYear = parseInt(yearStr);
        
        // Filter cost allocation to match the selected month
        filteredCostAllocation = costAllocation.filter(cost => {
          if (!cost.costAllocationDate) return false;
          const monthYear = `${cost.costAllocationDate.toLocaleString('en-US', { month: 'long' })} ${cost.costAllocationDate.getFullYear()}`;
          return monthYear === item;
        });
      } else {
        // For location/department/project comparisons, use global time filters
        timeMonth = isYTD ? undefined : filterMonth;
        timeYear = filterYear;
        
        // Apply time filtering to cost allocation
        filteredCostAllocation = costAllocation.filter(cost => {
          if (!cost.costAllocationDate) return false;
          
          // Apply time filter
          let timeMatch = true;
          if (isYTD) {
            timeMatch = cost.costAllocationDate.getFullYear() === filterYear;
          } else if (filterMonth !== undefined) {
            timeMatch = cost.costAllocationDate.getFullYear() === filterYear && 
                      cost.costAllocationDate.getMonth() === filterMonth;
          }
          
          if (!timeMatch) return false;
          
          // Apply comparison type filter
          switch (comparisonType) {
            case 'locations':
              return cost.rigLocation === item || cost.locationReference === item;
            case 'departments':
              return cost.department === item;
            case 'projectTypes':
              return cost.projectType === item;
            default:
              return true;
          }
        });
        
        // Set location filter for KPI functions
        if (comparisonType === 'locations') {
          locationFilter = item === 'All Locations' ? undefined : item;
        }
      }

      console.log(`🔍 KPI Calculation for ${item}:`, {
        comparisonType,
        timeMonth,
        timeYear,
        locationFilter,
        filteredCostAllocationCount: filteredCostAllocation.length,
        isYTD,
        filterMonth,
        filterYear,
        sampleCostAllocation: filteredCostAllocation.slice(0, 2).map(cost => ({
          costAllocationDate: cost.costAllocationDate,
          rigLocation: cost.rigLocation,
          department: cost.department,
          projectType: cost.projectType,
          totalCost: cost.totalCost
        }))
      });

      // Calculate drilling metrics using the same function as DrillingDashboard
      const drillingKPIs = calculateAllEnhancedKPIs(
        voyageEvents,
        vesselManifests,
        filteredCostAllocation, // Use filtered cost allocation
        'Drilling',
        timeMonth,
        timeYear,
        locationFilter
      );

      // Calculate production metrics using the same function as ProductionDashboard
      const productionKPIs = calculateAllEnhancedKPIs(
        voyageEvents,
        vesselManifests,
        filteredCostAllocation, // Use filtered cost allocation
        'Production',
        timeMonth,
        timeYear,
        locationFilter
      );

      // Calculate bulk fluid metrics separately (not included in main KPIs)
      const drillingBulkMetrics = calculateEnhancedBulkFluidMetrics(
        bulkActions,
        timeMonth,
        timeYear,
        'Drilling',
        locationFilter
      );

      const productionBulkMetrics = calculateEnhancedBulkFluidMetrics(
        bulkActions,
        timeMonth,
        timeYear,
        'Production',
        locationFilter
      );

      // Combine metrics from both drilling and production where applicable
      // Note: Cost calculation needs to be done separately as the KPI functions don't return cost data
      let combinedLogisticsCost = 0; // Will need to calculate from cost allocation directly
      
      const combinedCargoTons = (drillingKPIs.cargoTons?.totalCargoTons || 0) + (productionKPIs.cargoTons?.totalCargoTons || 0);
      const combinedFluidVolume = (drillingBulkMetrics.totalFluidVolume || 0) + (productionBulkMetrics.totalFluidVolume || 0);
      const combinedOSVHours = (drillingKPIs.productiveHours?.totalOSVHours || 0) + (productionKPIs.productiveHours?.totalOSVHours || 0);
      const combinedProductiveHours = (drillingKPIs.productiveHours?.productiveHours || 0) + (productionKPIs.productiveHours?.productiveHours || 0);
      
      // Calculate vessel visits from filtered cost allocation data
      // Each cost allocation record roughly represents vessel activity
      const combinedVesselVisits = filteredCostAllocation.length;
      
      // Calculate averages for rate-based metrics (simple average since we can't easily weight by department)
      const combinedLiftsPerHour = ((drillingKPIs.liftsPerHour?.liftsPerHour || 0) + (productionKPIs.liftsPerHour?.liftsPerHour || 0)) / 2;
      const combinedUtilization = ((drillingKPIs.utilization?.vesselUtilization || 0) + (productionKPIs.utilization?.vesselUtilization || 0)) / 2;
        
      // Calculate cost from cost allocation data
      combinedLogisticsCost = filteredCostAllocation.reduce((sum, cost) => 
        sum + (cost.budgetedVesselCost || cost.totalCost || 0), 0
      );

      // Calculate waiting time and weather downtime from KPI results (keep in hours)
      const waitingTimeHours = (drillingKPIs.waitingTime?.waitingTimeOffshore || 0) + (productionKPIs.waitingTime?.waitingTimeOffshore || 0);
      const weatherDowntimeHours = (drillingKPIs.waitingTime?.weatherExcludedHours || 0) + (productionKPIs.waitingTime?.weatherExcludedHours || 0);
      
      // Convert to days only for display purposes
      const waitingTime = waitingTimeHours / 24;
      const weatherDowntime = weatherDowntimeHours / 24;
      
      console.log(`⏱️ Time Calculation for ${item}:`, {
        drillingWaitingHours: drillingKPIs.waitingTime?.waitingTimeOffshore || 0,
        productionWaitingHours: productionKPIs.waitingTime?.waitingTimeOffshore || 0,
        totalWaitingHours: waitingTimeHours,
        totalWaitingDays: waitingTime,
        drillingProductiveHours: drillingKPIs.productiveHours?.productiveHours || 0,
        productionProductiveHours: productionKPIs.productiveHours?.productiveHours || 0,
        totalProductiveHours: combinedProductiveHours
      });

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
              case 'logisticsCost':
                valueToAdd = cost.budgetedVesselCost || cost.totalCost || 0;
                break;
              case 'cargoTons':
              case 'vesselVisits':
              case 'fluidVolume':
                // These require complex calculations from vessel data
                // Use allocated days as a proxy for now
                valueToAdd = cost.totalAllocatedDays || 0;
                break;
              case 'liftsPerHour':
                // Rate-based metric - use a base rate approximation
                valueToAdd = (cost.totalAllocatedDays || 0) * 1.5; // Approximate lifts per day
                break;
              case 'utilization':
                valueToAdd = cost.totalAllocatedDays || 0; // Will calculate percentage later
                break;
              case 'sharedVisitsPercent':
              case 'roundTrippedLifts':
                // Production-specific metrics
                if (cost.department === 'Production' || cost.projectType === 'Production') {
                  valueToAdd = (cost.totalAllocatedDays || 0) * 0.3; // Estimate
                }
                break;
              case 'totalOSVHours':
              case 'productiveHours':
                valueToAdd = (cost.totalAllocatedDays || 0) * 24; // Days to hours
                break;
              case 'waitingTime':
              case 'weatherDowntime':
                // Use a smaller percentage for downtime
                valueToAdd = (cost.totalAllocatedDays || 0) * 0.1; // 10% estimate
                break;
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
        logisticsCost: combinedLogisticsCost,
        cargoTons: combinedCargoTons,
        liftsPerHour: combinedLiftsPerHour,
        vesselVisits: combinedVesselVisits,
        utilization: combinedUtilization,
        fluidVolume: combinedFluidVolume,
        sharedVisitsPercent: 0, // Placeholder - would need separate calculation
        roundTrippedLifts: productionKPIs.cargoTons?.totalRTTons || 0,
        totalOSVHours: combinedOSVHours,
        productiveHours: combinedProductiveHours,
        waitingTime,
        waitingTimeHours, // Keep hours version for calculations
        weatherDowntime,
        weatherDowntimeHours, // Keep hours version for calculations
        monthlyTrend
      };
    });
  }, [costAllocation, voyageEvents, voyageList, vesselManifests, bulkActions, comparisonType, selectedItems, selectedMetric, filterYear, filterMonth, isYTD]);

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
      case 'logisticsCost':
        return data.logisticsCost;
      case 'cargoTons':
        return data.cargoTons;
      case 'liftsPerHour':
        return data.liftsPerHour;
      case 'vesselVisits':
        return data.vesselVisits;
      case 'utilization':
        return data.utilization;
      case 'fluidVolume':
        return data.fluidVolume;
      case 'sharedVisitsPercent':
        return data.sharedVisitsPercent;
      case 'roundTrippedLifts':
        return data.roundTrippedLifts;
      case 'totalOSVHours':
        return data.totalOSVHours;
      case 'productiveHours':
        return data.productiveHours;
      case 'waitingTime':
        return data.waitingTime;
      case 'weatherDowntime':
        return data.weatherDowntime;
      default:
        return 0;
    }
  };

  // Format metric value
  const formatMetricValue = (value: number) => {
    switch (selectedMetric) {
      case 'logisticsCost':
        return formatSmartCurrency(value);
      case 'cargoTons':
        return `${Math.round(value).toLocaleString()} tons`;
      case 'liftsPerHour':
        return `${value.toFixed(2)} lifts/hr`;
      case 'vesselVisits':
        return `${Math.round(value).toLocaleString()} visits`;
      case 'utilization':
      case 'sharedVisitsPercent':
        return `${value.toFixed(1)}%`;
      case 'fluidVolume':
        return `${Math.round(value).toLocaleString()} bbls`;
      case 'roundTrippedLifts':
        return `${Math.round(value).toLocaleString()} lifts`;
      case 'totalOSVHours':
      case 'productiveHours':
        return `${Math.round(value).toLocaleString()} hrs`;
      case 'waitingTime':
      case 'weatherDowntime':
        return formatDaysWhole(value);
      default:
        return value.toString();
    }
  };

  // Get metric icon
  const getMetricIcon = () => {
    switch (selectedMetric) {
      case 'logisticsCost':
        return <DollarSign className="w-4 h-4" />;
      case 'cargoTons':
        return <Package className="w-4 h-4" />;
      case 'liftsPerHour':
        return <TrendingUp className="w-4 h-4" />;
      case 'vesselVisits':
        return <Ship className="w-4 h-4" />;
      case 'utilization':
      case 'sharedVisitsPercent':
        return <Percent className="w-4 h-4" />;
      case 'fluidVolume':
        return <Factory className="w-4 h-4" />;
      case 'roundTrippedLifts':
        return <TrendingDown className="w-4 h-4" />;
      case 'totalOSVHours':
      case 'productiveHours':
        return <Activity className="w-4 h-4" />;
      case 'waitingTime':
        return <Clock className="w-4 h-4" />;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Time Filtering - Only show when not comparing by months */}
            {comparisonType !== 'months' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Period</label>
                <div className="space-y-2">
                  {/* Year Selection */}
                  <div>
                    <select 
                      value={filterYear} 
                      onChange={(e) => setFilterYear(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* YTD vs Monthly Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsYTD(true);
                        setFilterMonth(undefined);
                      }}
                      className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all ${
                        isYTD 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      YTD
                    </button>
                    <button
                      onClick={() => setIsYTD(false)}
                      className={`flex-1 px-3 py-2 text-xs rounded-md border transition-all ${
                        !isYTD 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                  
                  {/* Month Selection - Only show when not YTD */}
                  {!isYTD && (
                    <select 
                      value={filterMonth ?? ''} 
                      onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Month</option>
                      {availableMonths.map(monthValue => {
                        const monthNames = [
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ];
                        return (
                          <option key={monthValue} value={monthValue}>
                            {monthNames[monthValue]}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Metric Selection */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Metric to Compare</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { metric: 'logisticsCost' as MetricType, label: 'Logistics Cost' },
                  { metric: 'cargoTons' as MetricType, label: 'Cargo Tons' },
                  { metric: 'liftsPerHour' as MetricType, label: 'Lifts/Hour' },
                  { metric: 'vesselVisits' as MetricType, label: 'Vessel Visits' },
                  { metric: 'utilization' as MetricType, label: 'Utilization' },
                  { metric: 'fluidVolume' as MetricType, label: 'Fluid Volume' },
                  { metric: 'sharedVisitsPercent' as MetricType, label: 'Shared Visits %' },
                  { metric: 'roundTrippedLifts' as MetricType, label: 'RT Lifts' },
                  { metric: 'totalOSVHours' as MetricType, label: 'OSV Hours' },
                  { metric: 'productiveHours' as MetricType, label: 'Productive Hours' },
                  { metric: 'waitingTime' as MetricType, label: 'Waiting Time' },
                  { metric: 'weatherDowntime' as MetricType, label: 'Weather Delay' }
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
                          <p className="font-bold text-gray-900">{formatSmartCurrency(data.logisticsCost)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Cargo</span>
                          <p className="font-bold text-gray-900">{Math.round(data.cargoTons).toLocaleString()}t</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Lifts/Hr</span>
                          <p className="font-bold text-gray-900">{data.liftsPerHour.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Visits</span>
                          <p className="font-bold text-gray-900">{Math.round(data.vesselVisits).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Utilization</span>
                          <p className="font-bold text-gray-900">{data.utilization.toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Fluid Vol</span>
                          <p className="font-bold text-gray-900">{Math.round(data.fluidVolume).toLocaleString()}b</p>
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
                    {selectedMetric === 'logisticsCost' ? 'Logistics Cost' :
                     selectedMetric === 'cargoTons' ? 'Cargo Tonnage' :
                     selectedMetric === 'liftsPerHour' ? 'Lifts per Hour' :
                     selectedMetric === 'vesselVisits' ? 'Vessel Visits' :
                     selectedMetric === 'utilization' ? 'Vessel Utilization' :
                     selectedMetric === 'fluidVolume' ? 'Fluid Volume' :
                     selectedMetric === 'sharedVisitsPercent' ? 'Shared Visits %' :
                     selectedMetric === 'roundTrippedLifts' ? 'Round-Tripped Lifts' :
                     selectedMetric === 'totalOSVHours' ? 'Total OSV Hours' :
                     selectedMetric === 'productiveHours' ? 'Productive Hours' :
                     selectedMetric === 'waitingTime' ? 'Waiting Time' :
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
                    {selectedMetric === 'logisticsCost' ? 'Monthly Cost' :
                     selectedMetric === 'cargoTons' ? 'Monthly Cargo Tons' :
                     selectedMetric === 'liftsPerHour' ? 'Monthly Lifts/Hr' :
                     selectedMetric === 'vesselVisits' ? 'Monthly Visits' :
                     selectedMetric === 'utilization' ? 'Monthly Utilization' :
                     selectedMetric === 'fluidVolume' ? 'Monthly Fluid Volume' :
                     selectedMetric === 'totalOSVHours' ? 'Monthly OSV Hours' :
                     selectedMetric === 'productiveHours' ? 'Monthly Productive Hours' :
                     'Monthly Values'}
                  </span>
                </div>
                
                
                <div className="h-72 relative mb-8">
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
                    
                    {/* Bar chart */}
                    <div className="relative h-full">
                      {/* Get max value across all data */}
                      {(() => {
                        const maxValue = Math.max(...comparisonData.flatMap(d => d.monthlyTrend?.map(t => t.value) || [0]), 1);
                        const monthCount = comparisonData[0]?.monthlyTrend?.length || 6;
                        const barGroupWidth = 100 / monthCount; // Percentage width per month group
                        const barWidth = barGroupWidth / comparisonData.length * 0.8; // Width per bar within group
                        
                        return (
                          <div className="absolute inset-0">
                            {/* Render bars for each month */}
                            {comparisonData[0]?.monthlyTrend?.map((_, monthIndex) => (
                              <div key={monthIndex} className="absolute bottom-0 flex items-end" style={{
                                left: `${monthIndex * barGroupWidth}%`,
                                width: `${barGroupWidth}%`,
                                height: '100%'
                              }}>
                                {/* Bars for each data series in this month */}
                                {comparisonData.map((data, dataIndex) => {
                                  if (!data.monthlyTrend || !data.monthlyTrend[monthIndex]) return null;
                                  
                                  const colors = ['blue', 'green', 'purple', 'orange'];
                                  const color = colors[dataIndex % colors.length];
                                  const colorClasses: Record<string, string> = {
                                    blue: 'bg-blue-500 hover:bg-blue-600',
                                    green: 'bg-green-500 hover:bg-green-600', 
                                    purple: 'bg-purple-500 hover:bg-purple-600',
                                    orange: 'bg-orange-500 hover:bg-orange-600'
                                  };
                                  
                                  const value = data.monthlyTrend[monthIndex].value;
                                  const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                  
                                  console.log(`📊 Bar chart - ${data.label} Month ${monthIndex}:`, {
                                    value,
                                    maxValue,
                                    heightPercent
                                  });
                                  
                                  return (
                                    <div
                                      key={`${data.label}-${monthIndex}`}
                                      className={`transition-all duration-300 ${colorClasses[color]} rounded-t-sm mx-0.5 group relative`}
                                      style={{
                                        width: `${barWidth}%`,
                                        height: `${Math.max(heightPercent, 2)}%`,
                                        minHeight: value > 0 ? '2px' : '0px'
                                      }}
                                      title={`${data.label}: ${formatMetricValue(value)}`}
                                    >
                                      {/* Value label on hover */}
                                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {formatMetricValue(value)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute -bottom-20 left-0 right-0 flex justify-between text-xs text-gray-500">
                      {comparisonData[0]?.monthlyTrend?.map((point, i) => (
                        <div 
                          key={i} 
                          className="text-center whitespace-nowrap overflow-hidden" 
                          style={{ 
                            transform: 'rotate(-45deg)', 
                            transformOrigin: 'center',
                            maxWidth: '70px',
                            fontSize: '10px',
                            lineHeight: '1.2'
                          }}
                        >
                          {point.month}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-4 mt-24 justify-center">
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
            {['waitingTime', 'productiveHours', 'totalOSVHours'].includes(selectedMetric) && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Performance Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {comparisonData.map((data, index) => {
                    const colors = ['blue', 'green', 'purple', 'orange'];
                    const color = colors[index % colors.length];
                    const totalTime = data.waitingTimeHours + data.productiveHours; // Both already in hours
                    
                    console.log(`📊 Operational Breakdown for ${data.label}:`, {
                      waitingTimeHours: data.waitingTimeHours,
                      productiveHours: data.productiveHours,
                      totalTime,
                      productivePercentage: totalTime > 0 ? ((data.productiveHours / totalTime) * 100).toFixed(1) : 0,
                      waitingPercentage: totalTime > 0 ? ((data.waitingTimeHours / totalTime) * 100).toFixed(1) : 0
                    });
                    
                    return (
                      <div key={data.label} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className={`text-sm font-medium text-${color}-600 mb-3`}>{data.label}</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Total Time</span>
                            <span className="text-sm font-bold">{Math.round(totalTime).toLocaleString()} hrs</span>
                          </div>
                          <div className="relative w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div 
                              className={`absolute left-0 top-0 h-full bg-green-500 transition-all duration-500`}
                              style={{ width: `${totalTime > 0 ? (data.productiveHours / totalTime) * 100 : 0}%` }}
                            />
                            <div 
                              className={`absolute top-0 h-full bg-orange-500 transition-all duration-500`}
                              style={{ 
                                left: `${totalTime > 0 ? (data.productiveHours / totalTime) * 100 : 0}%`,
                                width: `${totalTime > 0 ? (data.waitingTimeHours / totalTime) * 100 : 0}%` 
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {totalTime > 0 ? ((data.productiveHours / totalTime) * 100).toFixed(0) : 0}% productive
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span className="text-gray-600">Productive: {Math.round(data.productiveHours).toLocaleString()}h</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-orange-500 rounded"></div>
                              <span className="text-gray-600">Waiting: {Math.round(data.waitingTimeHours).toLocaleString()}h</span>
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
                    const baseValue = getMetricValue(baseData);
                    const percentageChange = baseValue > 0 
                      ? ((getMetricValue(data) - baseValue) / baseValue) * 100 
                      : 0;
                    const isPositive = selectedMetric === 'logisticsCost' ? variance < 0 : variance > 0;
                    
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
                          {selectedMetric === 'logisticsCost' ? 'Cost ' : 
                           selectedMetric === 'cargoTons' ? 'Cargo ' :
                           selectedMetric === 'liftsPerHour' ? 'Efficiency ' :
                           selectedMetric === 'vesselVisits' ? 'Visits ' :
                           selectedMetric === 'utilization' ? 'Utilization ' :
                           selectedMetric === 'fluidVolume' ? 'Fluid volume ' :
                           selectedMetric === 'sharedVisitsPercent' ? 'Shared visits ' :
                           selectedMetric === 'roundTrippedLifts' ? 'RT lifts ' :
                           selectedMetric === 'totalOSVHours' ? 'OSV hours ' :
                           selectedMetric === 'productiveHours' ? 'Productive time ' :
                           selectedMetric === 'waitingTime' ? 'Wait time ' :
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