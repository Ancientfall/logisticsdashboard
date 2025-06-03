import React from 'react';
import { FileSpreadsheet, DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { CostAllocation } from '../../../../types';
import { 
  formatLargeCurrencyWhole, 
  formatCurrencyWhole
} from '../../../../utils/formatters';
import { validateCostAllocationData } from '../../../../utils/costAnalysis';
import { 
  getProjectIcon, 
  getProjectColorClasses 
} from '../../../../utils/projectTypeUtils';

interface DashboardTabProps {
  costAnalysis: any;
  filteredCostAllocation: CostAllocation[];
  selectedMonth: string;
  dateRange: { display: string };
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  costAnalysis,
  filteredCostAllocation,
  selectedMonth,
  dateRange,
}) => {
  return (
    <div className="space-y-6">
      {/* Data Quality Alert */}
      {costAnalysis && (
        (() => {
          const { validRecords, duplicates, issues } = validateCostAllocationData(filteredCostAllocation);
          if (issues.length > 0) {
            return (
              <div className="bg-gradient-to-r from-yellow-50/50 to-red-50/50 backdrop-blur-md border border-yellow-200/50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-yellow-200 rounded-lg p-2">
                    <AlertCircle className="text-yellow-700" size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-yellow-900">Data Quality Issues Detected</h4>
                    <p className="text-yellow-700">Found {issues.length} issues in your cost allocation data</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600">Total Issues</p>
                    <p className="text-2xl font-bold text-red-600">{issues.length}</p>
                    <p className="text-xs text-gray-500">Records with problems</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600">Valid Records</p>
                    <p className="text-2xl font-bold text-green-600">{validRecords.length}</p>
                    <p className="text-xs text-gray-500">Clean data records</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-gray-600">Duplicates</p>
                    <p className="text-2xl font-bold text-orange-600">{duplicates.length}</p>
                    <p className="text-xs text-gray-500">Potential duplicate entries</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Check the browser console</strong> for detailed breakdown of data quality issues. 
                    Common issues include excessive allocated days (&gt;31/month), missing rig locations, and duplicate entries.
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/50 backdrop-blur-md rounded-xl p-6 border border-blue-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-semibold uppercase tracking-wide">Total Projects</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {costAnalysis.totalAllocations.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                {selectedMonth !== 'all' ? selectedMonth : dateRange.display}
              </p>
            </div>
            <div className="bg-blue-200 rounded-lg p-3">
              <FileSpreadsheet className="text-blue-700" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50/50 to-green-100/50 backdrop-blur-md rounded-xl p-6 border border-green-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-semibold uppercase tracking-wide">Total Vessel Cost</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {formatLargeCurrencyWhole(costAnalysis.totalBudgetedCost)}
              </p>
              <p className="text-xs text-green-600 mt-2">
                Budgeted vessel operations
              </p>
            </div>
            <div className="bg-green-200 rounded-lg p-3">
              <DollarSign className="text-green-700" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50/50 to-purple-100/50 backdrop-blur-md rounded-xl p-6 border border-purple-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-semibold uppercase tracking-wide">Allocated Days</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {costAnalysis.totalAllocatedDays.toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-2">
                Total rig operation days
              </p>
            </div>
            <div className="bg-purple-200 rounded-lg p-3">
              <Calendar className="text-purple-700" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50/50 to-orange-100/50 backdrop-blur-md rounded-xl p-6 border border-orange-200/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-700 text-sm font-semibold uppercase tracking-wide">Daily Rate</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">
                {formatCurrencyWhole(costAnalysis.avgCostPerDay)}
              </p>
              <p className="text-xs text-orange-600 mt-2">
                Average cost per day
              </p>
            </div>
            <div className="bg-orange-200 rounded-lg p-3">
              <TrendingUp className="text-orange-700" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Project Type Analysis */}
      {Object.keys(costAnalysis.projectTypeBreakdown).length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Project Type Cost Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(costAnalysis.projectTypeBreakdown)
              .sort(([,a], [,b]) => (b as any).cost - (a as any).cost)
              .map(([projectType, data]: [string, any]) => {
                const Icon = getProjectIcon(projectType);
                const colorClasses = getProjectColorClasses(projectType);
                return (
                  <div key={projectType} className={`bg-gradient-to-br from-${colorClasses.bg} to-${colorClasses.bg}-100 rounded-xl p-6 border border-${colorClasses.border}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`bg-${colorClasses.iconBg} rounded-lg p-3`}>
                        <Icon className={`text-${colorClasses.iconText}`} size={24} />
                      </div>
                      <div className="text-right">
                        <p className={`text-${colorClasses.text} text-sm font-semibold`}>{projectType}</p>
                        <p className="text-xs text-gray-600">{data.count} projects</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Total Cost</p>
                        <p className={`text-2xl font-bold text-${colorClasses.text}`}>
                          {formatLargeCurrencyWhole(data.cost)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Days</p>
                          <p className="font-semibold">{data.days.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg/Day</p>
                          <p className="font-semibold">{formatCurrencyWhole(data.avgCostPerDay)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Active Locations: {data.locations?.size || 0}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Cost Efficiency Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Cost Efficiency</h4>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Most Efficient Project Type</p>
              <p className="text-xl font-bold text-green-600">
                {costAnalysis.costEfficiencyMetrics.mostEfficientProjectType}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Cost per Project</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatLargeCurrencyWhole(costAnalysis.costEfficiencyMetrics.avgCostPerProject)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Utilization Rate</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.round(costAnalysis.costEfficiencyMetrics.utilizationRate)}%
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cost Trends</h4>
          <div className="space-y-3">
            {Object.entries(costAnalysis.monthlyTrends)
              .sort(([a], [b]) => {
                const parseMonthYear = (monthYear: string) => {
                  if (monthYear === 'Unknown') return new Date(2024, 0, 1);
                  const parts = monthYear.split('-');
                  if (parts.length === 2) {
                    const month = parseInt(parts[0], 10);
                    const yearNum = parseInt(parts[1], 10);
                    const fullYear = 2000 + yearNum;
                    return new Date(fullYear, month - 1, 1);
                  }
                  return new Date(2024, 0, 1);
                };
                const dateA = parseMonthYear(a);
                const dateB = parseMonthYear(b);
                return dateA.getTime() - dateB.getTime();
              })
              .slice(-6)
              .map(([month, data]: [string, any]) => {
                const formatMonth = (monthYear: string) => {
                  if (monthYear === 'Unknown') return 'Unknown';
                  const parts = monthYear.split('-');
                  if (parts.length === 2) {
                    const monthNum = parseInt(parts[0], 10);
                    const yearNum = parseInt(parts[1], 10);
                    const fullYear = 2000 + yearNum;
                    const date = new Date(fullYear, monthNum - 1, 1);
                    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                  }
                  return monthYear;
                };
                
                return (
                  <div key={month} className="flex items-center justify-between p-3 bg-gray-50/50 backdrop-blur-sm rounded-lg border border-gray-100/50">
                    <div>
                      <p className="font-medium text-gray-900">{formatMonth(month)}</p>
                      <p className="text-sm text-gray-600">{data.count} projects • {data.days} days</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatLargeCurrencyWhole(data.cost)}</p>
                      <p className="text-sm text-gray-600">${data.avgRate.toLocaleString()}/day</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};