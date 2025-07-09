import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';

interface MonthlyVesselCostChartProps {
  costAllocation: any[];
  selectedLocation: string;
  className?: string;
}

interface MonthlyData {
  month: string;
  year: number;
  cost: number;
  days: number;
  avgDayRate: number;
  allocations: number;
}

const MonthlyVesselCostChart: React.FC<MonthlyVesselCostChartProps> = ({
  costAllocation,
  selectedLocation,
  className = ""
}) => {
  
  const monthlyData = useMemo(() => {
    // Get current date and calculate last 12 months
    const now = new Date();
    const months: MonthlyData[] = [];
    
    // Generate last 12 months (including current month)
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = targetDate.toLocaleString('en-US', { month: 'long' });
      const year = targetDate.getFullYear();
      
      months.push({
        month: monthKey,
        year: year,
        cost: 0,
        days: 0,
        avgDayRate: 0,
        allocations: 0
      });
    }
    
    // Production LC numbers for filtering
    const productionLCNumbers = ['9999','9779','10027','10039','10070','10082','10106','9361','10103','10096','10071','10115','9359','9364','9367','10098','10080','10051','10021','10017','9360','10099','10081','10074','10052','9358','10097','10084','10072','10067'];
    
    // Filter cost allocation data
    const filteredAllocations = costAllocation.filter(allocation => {
      // Must be production operation
      const lcNumber = allocation.lcNumber?.toString() || '';
      if (!productionLCNumbers.includes(lcNumber)) return false;
      
      // Exclude drilling rigs from production analysis
      const location = (allocation.locationReference || '').toLowerCase();
      const isDrillingRig = location.includes('ocean black') || 
                           location.includes('blackhornet') || 
                           location.includes('stena icemax') ||
                           location.includes('steana icemax') ||
                           location.includes('deepwater') ||
                           location.includes('island venture') ||
                           location.includes('auriga') ||
                           location.includes('drilling') ||
                           location.includes('rig');
      if (isDrillingRig) return false;
      
      // Location filtering
      if (selectedLocation !== 'All Locations') {
        const locationMatch = location.includes(selectedLocation.toLowerCase()) ||
                             allocation.locationReference?.toLowerCase().includes(selectedLocation.toLowerCase());
        if (!locationMatch) return false;
      }
      
      return true;
    });
    
    // Group allocations by month
    filteredAllocations.forEach(allocation => {
      if (allocation.costAllocationDate) {
        const allocDate = new Date(allocation.costAllocationDate);
        const monthKey = allocDate.toLocaleString('en-US', { month: 'long' });
        const year = allocDate.getFullYear();
        
        // Find matching month in our 6-month window
        const monthIndex = months.findIndex(m => m.month === monthKey && m.year === year);
        if (monthIndex !== -1) {
          const allocatedDays = allocation.totalAllocatedDays || 0;
          const dayRate = allocation.vesselDailyRateUsed || allocation.averageVesselCostPerDay || 0;
          const cost = allocatedDays * dayRate;
          
          months[monthIndex].cost += cost;
          months[monthIndex].days += allocatedDays;
          months[monthIndex].allocations += 1;
        }
      }
    });
    
    // Calculate average day rates
    months.forEach(month => {
      month.avgDayRate = month.days > 0 ? month.cost / month.days : 0;
    });
    
    return months;
  }, [costAllocation, selectedLocation]);
  
  // Calculate chart dimensions and scaling
  const maxCost = Math.max(...monthlyData.map(d => d.cost), 1);
  const totalCost = monthlyData.reduce((sum, d) => sum + d.cost, 0);
  const avgMonthlyCost = totalCost / 6;
  
  // Calculate trend (comparing last 3 months vs first 3 months)
  const firstHalfCost = monthlyData.slice(0, 3).reduce((sum, d) => sum + d.cost, 0) / 3;
  const secondHalfCost = monthlyData.slice(3, 6).reduce((sum, d) => sum + d.cost, 0) / 3;
  const trendPercentage = firstHalfCost > 0 ? ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100 : 0;
  const isPositiveTrend = trendPercentage > 0;
  
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Monthly Vessel Cost Trend</h3>
              <p className="text-sm text-blue-100 mt-0.5">
                {selectedLocation === 'All Locations' ? 'All Production Facilities' : selectedLocation} - Last 6 Months
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">
              ${(totalCost / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-blue-100">Total 6-Month Cost</div>
          </div>
        </div>
      </div>
      
      {/* Chart Content */}
      <div className="p-6">
        {/* Trend Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xl font-bold text-blue-700">
              ${(avgMonthlyCost / 1000000).toFixed(2)}M
            </div>
            <div className="text-sm text-gray-600">Avg Monthly Cost</div>
            <div className="text-xs text-blue-600 mt-1">6-month average</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xl font-bold text-gray-700">
              {Math.round(monthlyData.reduce((sum, d) => sum + d.days, 0))}
            </div>
            <div className="text-sm text-gray-600">Total Days</div>
            <div className="text-xs text-gray-600 mt-1">Allocated vessel days</div>
          </div>
          <div className={`text-center p-4 rounded-lg border ${
            isPositiveTrend ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className={`flex items-center justify-center gap-1 text-xl font-bold ${
              isPositiveTrend ? 'text-red-700' : 'text-green-700'
            }`}>
              {isPositiveTrend ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(trendPercentage).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Cost Trend</div>
            <div className={`text-xs mt-1 ${isPositiveTrend ? 'text-red-600' : 'text-green-600'}`}>
              {isPositiveTrend ? 'Increasing' : 'Decreasing'}
            </div>
          </div>
        </div>
        
        {/* Sleek Line Chart */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly Cost Trend
          </h4>
          
          {/* Chart Container */}
          <div className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl p-8 border border-gray-200 shadow-inner">
            {/* Chart Area */}
            <div className="relative h-72">
              {/* Grid Lines */}
              <svg className="absolute inset-0 w-full h-full">
                {/* Horizontal Grid Lines */}
                {[0, 20, 40, 60, 80, 100].map((percentage) => (
                  <g key={percentage}>
                    <line
                      x1="0"
                      y1={`${100 - percentage}%`}
                      x2="100%"
                      y2={`${100 - percentage}%`}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                      opacity="0.6"
                    />
                    <text
                      x="-8"
                      y={`${100 - percentage}%`}
                      dy="4"
                      fontSize="10"
                      fill="#6b7280"
                      textAnchor="end"
                    >
                      ${((maxCost * percentage / 100) / 1000000).toFixed(1)}M
                    </text>
                  </g>
                ))}
                
                {/* Vertical Grid Lines */}
                {monthlyData.map((_, index) => (
                  <line
                    key={index}
                    x1={`${(index * 100) / (monthlyData.length - 1)}%`}
                    y1="0"
                    x2={`${(index * 100) / (monthlyData.length - 1)}%`}
                    y2="100%"
                    stroke="#f3f4f6"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                ))}
              </svg>
              
              {/* Line Chart SVG */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  {/* Gradient for line */}
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                  </linearGradient>
                  
                  {/* Gradient for area under line */}
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.05 }} />
                  </linearGradient>
                </defs>
                
                {/* Area under the line */}
                <path
                  d={(() => {
                    const points = monthlyData.map((month, index) => {
                      const x = (index * 100) / (monthlyData.length - 1);
                      const y = 100 - (maxCost > 0 ? (month.cost / maxCost) * 100 : 0);
                      return `${x},${y}`;
                    });
                    return `M 0,100 L ${points.join(' L ')} L 100,100 Z`;
                  })()}
                  fill="url(#areaGradient)"
                  opacity="0.4"
                />
                
                {/* Main connecting line - Bold and Visible */}
                <path
                  d={(() => {
                    const points = monthlyData.map((month, index) => {
                      const x = (index * 100) / (monthlyData.length - 1);
                      const y = 100 - (maxCost > 0 ? (month.cost / maxCost) * 100 : 0);
                      return `${x},${y}`;
                    });
                    return `M ${points.join(' L ')}`;
                  })()}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                
                {/* Secondary line for extra visibility */}
                <path
                  d={(() => {
                    const points = monthlyData.map((month, index) => {
                      const x = (index * 100) / (monthlyData.length - 1);
                      const y = 100 - (maxCost > 0 ? (month.cost / maxCost) * 100 : 0);
                      return `${x},${y}`;
                    });
                    return `M ${points.join(' L ')}`;
                  })()}
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.7"
                />
              </svg>
              
              {/* Data Points */}
              {monthlyData.map((month, index) => {
                const x = (index * 100) / (monthlyData.length - 1);
                const y = 100 - (maxCost > 0 ? (month.cost / maxCost) * 100 : 0);
                const isCurrentMonth = index === monthlyData.length - 1;
                
                return (
                  <div
                    key={`${month.month}-${month.year}-point`}
                    className="absolute group cursor-pointer"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Hover Tooltip */}
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 pointer-events-none">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{month.month} {month.year}</div>
                        <div className="text-lg font-bold text-blue-600">${(month.cost / 1000000).toFixed(2)}M</div>
                        <div className="text-xs text-gray-600">{Math.round(month.days)} days • {month.allocations} allocs</div>
                        <div className="text-xs text-gray-600">Avg: ${Math.round(month.avgDayRate).toLocaleString()}/day</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-b border-gray-200 rotate-45"></div>
                      </div>
                    </div>
                    
                    {/* Data Point Circle */}
                    <div className={`relative transition-all duration-300 ${
                      isCurrentMonth ? 'scale-125' : 'scale-100'
                    } group-hover:scale-150`}>
                      {/* Outer Ring */}
                      <div className={`w-6 h-6 rounded-full ${
                        isCurrentMonth 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse' 
                          : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                      } shadow-lg group-hover:shadow-blue-500/50`}>
                        {/* Inner Circle */}
                        <div className="w-full h-full rounded-full bg-white m-0.5 flex items-center justify-center">
                          <div className={`w-2 h-2 rounded-full ${
                            isCurrentMonth 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                              : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                          }`}></div>
                        </div>
                      </div>
                      
                      {/* Current Month Badge */}
                      {isCurrentMonth && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                          <div className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full shadow-lg font-medium">
                            Current
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* X-Axis Labels */}
            <div className="flex justify-between items-center text-xs text-gray-600 pt-4 mt-4 border-t border-gray-200">
              {monthlyData.map((month, index) => (
                <div key={`${month.month}-${month.year}-label`} className="text-center">
                  <div className="font-medium text-gray-700">{month.month.slice(0, 3)}</div>
                  <div className="text-gray-500 text-xs">{month.year}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Data Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Detailed Breakdown</h5>
            </div>
            <div className="divide-y divide-gray-200">
              {monthlyData.map((month, index) => {
                const isCurrentMonth = index === monthlyData.length - 1;
                const colors = [
                  'hover:bg-blue-50 hover:border-blue-200',
                  'hover:bg-indigo-50 hover:border-indigo-200', 
                  'hover:bg-purple-50 hover:border-purple-200',
                  'hover:bg-green-50 hover:border-green-200',
                  'hover:bg-orange-50 hover:border-orange-200',
                  'hover:bg-pink-50 hover:border-pink-200'
                ];
                const hoverColor = colors[index % colors.length];
                
                return (
                  <div key={`${month.month}-${month.year}-detail`} className={`px-4 py-3 transition-all duration-200 border border-transparent ${hoverColor} ${
                    isCurrentMonth ? 'bg-blue-50 border-blue-200' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full transition-colors ${
                          isCurrentMonth ? 'bg-blue-500' : 'bg-gray-400'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{month.month} {month.year}</div>
                          <div className="text-xs text-gray-500">{Math.round(month.days)} days • {month.allocations} allocations</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">${(month.cost / 1000000).toFixed(2)}M</div>
                        <div className="text-xs text-gray-500">${Math.round(month.avgDayRate).toLocaleString()}/day avg</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Cost Efficiency Insight */}
        <div className="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold text-gray-800">Cost Efficiency Analysis</h5>
              <p className="text-xs text-gray-600 mt-1">
                {selectedLocation === 'All Locations' 
                  ? `Total production vessel costs across all facilities showing ${
                      isPositiveTrend ? 'an increase' : 'a decrease'
                    } of ${Math.abs(trendPercentage).toFixed(1)}% over the last 12 months. `
                  : `${selectedLocation} facility costs showing ${
                      isPositiveTrend ? 'an increase' : 'a decrease'
                    } of ${Math.abs(trendPercentage).toFixed(1)}% over the last 12 months. `
                }
                Average monthly cost: ${(avgMonthlyCost / 1000000).toFixed(2)}M with total allocated vessel days of {Math.round(monthlyData.reduce((sum, d) => sum + d.days, 0))}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyVesselCostChart;