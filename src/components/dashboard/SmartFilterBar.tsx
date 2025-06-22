import React from 'react';
import { Calendar, MapPin, RotateCcw, Clock, Filter } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface SmartFilterBarProps {
  timeFilter: string;
  locationFilter: string;
  onTimeChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  timeOptions: FilterOption[];
  locationOptions: FilterOption[];
  totalRecords?: number;
  filteredRecords?: number;
  showPresets?: boolean;
}

const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  timeFilter,
  locationFilter,
  onTimeChange,
  onLocationChange,
  timeOptions,
  locationOptions,
  totalRecords = 0,
  filteredRecords = 0,
  showPresets = true
}) => {
  // Quick preset filters
  const handlePreset = (preset: 'current-month' | 'ytd' | 'reset') => {
    const now = new Date();
    
    switch (preset) {
      case 'current-month':
        // Find the most recent month option (accounting for 1-month lag)
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1); // 1 month lag for data availability
        const recentMonth = `${lastMonth.toLocaleString('en-US', { month: 'long' })} ${lastMonth.getFullYear()}`;
        
        // Check if this month exists in timeOptions, otherwise use the latest available
        const availableMonths = timeOptions.filter(opt => opt.value !== 'All Months');
        const targetMonth = availableMonths.find(opt => opt.value === recentMonth);
        

        if (targetMonth) {
          onTimeChange(recentMonth);
        } else if (availableMonths.length > 0) {
          // Use the latest available month
          const latestMonth = availableMonths[availableMonths.length - 1].value;
          onTimeChange(latestMonth);
        } else {
          onTimeChange('All Months');
        }
        break;
      case 'ytd':
        // Smart Year to Date - check what years have data and use YTD accordingly
        const availableYtdMonths = timeOptions.filter(opt => 
          opt.value !== 'All Months' && opt.value !== 'YTD'
        );
        
        // Check if we have 2025 data
        const has2025Data = availableYtdMonths.some(opt => opt.value.includes('2025'));
        
        // Check if we have 2024 data
        const has2024Data = availableYtdMonths.some(opt => opt.value.includes('2024'));
        
        
        if (has2025Data) {
          // We have 2025 data, use proper YTD
          onTimeChange('YTD');
        } else if (has2024Data) {
          // No 2025 data, but we have 2024 - use latest 2024 months as "YTD equivalent"
          const latest2024Months = availableYtdMonths
            .filter(opt => opt.value.includes('2024'))
            .slice(-5); // Last 5 months of 2024 as YTD equivalent
          
          if (latest2024Months.length > 0) {
            const latestMonth = latest2024Months[latest2024Months.length - 1].value;
            onTimeChange(latestMonth);
          } else {
            onTimeChange('All Months');
          }
        } else {
          // Fallback to all months
          onTimeChange('All Months');
        }
        break;
      case 'reset':
        onTimeChange('All Months');
        onLocationChange('All Locations');
        break;
    }
  };

  // Calculate filter impact
  const filterImpact = totalRecords > 0 ? Math.round((filteredRecords / totalRecords) * 100) : 100;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {(timeFilter !== 'All Months' || locationFilter !== 'All Locations') && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {filterImpact}% of data ({filteredRecords.toLocaleString()} records)
            </span>
          )}
        </div>
        
        {showPresets && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Quick:</span>
            <button
              onClick={() => handlePreset('current-month')}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => handlePreset('ytd')}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              Year to Date
            </button>
            <button
              onClick={() => handlePreset('reset')}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Period Filter */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
              Time Period
            </label>
            <select 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] hover:border-gray-300 transition-all duration-200"
              value={timeFilter}
              onChange={(e) => onTimeChange(e.target.value)}
            >
              {timeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.count !== undefined && ` (${option.count})`}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Location Filter */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
              Location
            </label>
            <select 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] hover:border-gray-300 transition-all duration-200"
              value={locationFilter}
              onChange={(e) => onLocationChange(e.target.value)}
            >
              {locationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.count !== undefined && ` (${option.count})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter Summary */}
      {(timeFilter !== 'All Months' || locationFilter !== 'All Locations') && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-blue-900">
              Showing {filteredRecords.toLocaleString()} of {totalRecords.toLocaleString()} records
              {timeFilter !== 'All Months' && ` for ${timeFilter}`}
              {locationFilter !== 'All Locations' && ` at ${locationFilter}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFilterBar;