import React from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';

interface CostAllocationFiltersProps {
  selectedMonth: string;
  selectedLocation: string;
  selectedProjectType: string;
  onMonthChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onClearFilters: () => void;
  onDataQualityCheck: () => void;
  filterOptions: {
    months: string[];
    locations: string[];
    projectTypes: string[];
  };
  dateRange: {
    display: string;
  };
  totalAllocations: number;
  filteredAllocations: number;
}

export const CostAllocationFilters: React.FC<CostAllocationFiltersProps> = ({
  selectedMonth,
  selectedLocation,
  selectedProjectType,
  onMonthChange,
  onLocationChange,
  onProjectTypeChange,
  onClearFilters,
  onDataQualityCheck,
  filterOptions,
  dateRange,
  totalAllocations,
  filteredAllocations,
}) => {
  const hasActiveFilters = selectedMonth !== 'all' || selectedLocation !== 'all' || selectedProjectType !== 'all';

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Cost Analysis Filters</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={onDataQualityCheck}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
          >
            <AlertTriangle size={16} />
            Data Quality Check
          </button>
          <div className="text-sm text-gray-500">
            Showing {filteredAllocations} of {totalAllocations} allocations
          </div>
        </div>
      </div>
      
      {/* Date Range Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            <span className="text-sm font-medium text-blue-900">Data Range: {dateRange.display}</span>
          </div>
          <span className="text-xs text-blue-600">
            {totalAllocations > 0 
              ? `${totalAllocations.toLocaleString()} total records`
              : 'No data loaded'
            }
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Time Period</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <option value="all">All Months</option>
            {filterOptions.months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rig Location</label>
          <select 
            value={selectedLocation} 
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <option value="all">All Rig Locations</option>
            {filterOptions.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Project Type</label>
          <select 
            value={selectedProjectType} 
            onChange={(e) => onProjectTypeChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            <option value="all">All Project Types</option>
            {filterOptions.projectTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="w-full px-4 py-2 bg-gray-100/80 text-gray-700 rounded-lg hover:bg-gray-200/80 transition-all duration-200 text-sm backdrop-blur-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};