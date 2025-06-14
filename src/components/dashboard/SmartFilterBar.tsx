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
  const handlePreset = (preset: 'current-month' | 'last-30-days' | 'ytd' | 'reset') => {
    const now = new Date();
    
    switch (preset) {
      case 'current-month':
        const currentMonth = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;
        onTimeChange(currentMonth);
        break;
      case 'last-30-days':
        // Find the closest month option or use 'All Months' 
        onTimeChange('All Months');
        break;
      case 'ytd':
        onTimeChange('All Months');
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
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
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