import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  FileSpreadsheet, 
  Upload, 
  AlertCircle 
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CostAllocationFilters } from './cost-allocation/CostAllocationFilters';
import { TabNavigation } from './cost-allocation/TabNavigation';
import { COST_ALLOCATION_TABS, TabId } from './cost-allocation/constants';
import { DashboardTab } from './cost-allocation/tabs/DashboardTab';
import DataQualityPopup from './DataQualityPopup';
import { useFilteredCostAllocation } from './cost-allocation/hooks/useFilteredCostAllocation';
import { useCostAnalysis } from './cost-allocation/hooks/useCostAnalysis';
import { detectProjectType } from '../../utils/projectTypeUtils';
import { performDataQualityCheck } from '../../utils/dataQualityValidation';

interface CostAllocationManagerProps {
  onNavigateToUpload: () => void;
}

const CostAllocationManagerRefactored: React.FC<CostAllocationManagerProps> = ({ onNavigateToUpload }) => {
  const { costAllocation, isDataReady } = useData();
  
  // State management
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedProjectType, setSelectedProjectType] = useState<string>('all');
  const [showDataQualityPopup, setShowDataQualityPopup] = useState(false);
  const [hasShownDataQualityWarning, setHasShownDataQualityWarning] = useState(false);

  // Auto-check data quality when data is loaded
  React.useEffect(() => {
    if (isDataReady && costAllocation && costAllocation.length > 0 && !hasShownDataQualityWarning) {
      const report = performDataQualityCheck(costAllocation);
      
      const dateIssues = report.issues.filter(issue => 
        issue.category === 'Date Format Error' || 
        (issue.message && issue.message.includes('2-digit years'))
      );
      
      const uniqueMonths = [...new Set(costAllocation.map(c => c.month).filter(Boolean))];
      const allJanuary = uniqueMonths.length === 1 && uniqueMonths[0] === 1;
      
      if (dateIssues.length > 0 || allJanuary) {
        setShowDataQualityPopup(true);
        setHasShownDataQualityWarning(true);
      }
    }
  }, [isDataReady, costAllocation, hasShownDataQualityWarning]);

  // Filter options
  const filterOptions = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) {
      return { months: [], locations: [], projectTypes: [] };
    }

    const months = [...new Set(costAllocation.map(a => a.monthYear).filter((m): m is string => Boolean(m)))].sort();
    const locations = [...new Set(costAllocation.map(a => a.rigLocation).filter((l): l is string => Boolean(l)))].sort();
    const projectTypes = [...new Set(costAllocation.map(a => 
      detectProjectType(a.description, a.costElement, a.lcNumber, a.projectType)
    ))].sort();
    
    return { months, locations, projectTypes };
  }, [costAllocation]);

  // Date range calculation
  const dateRange = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) {
      return { display: 'No data loaded' };
    }

    const monthYears = costAllocation
      .map(record => record.monthYear)
      .filter(Boolean)
      .sort();

    if (monthYears.length > 0) {
      return { display: `${monthYears[0]} - ${monthYears[monthYears.length - 1]}` };
    }

    return { display: 'No valid dates' };
  }, [costAllocation]);

  // Custom hooks
  const filteredCostAllocation = useFilteredCostAllocation(
    costAllocation,
    selectedMonth,
    selectedLocation,
    selectedProjectType
  );
  
  const costAnalysis = useCostAnalysis(filteredCostAllocation);

  // Early return for no data state
  if (!isDataReady || !costAllocation || costAllocation.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-3">Vessel Cost Analytics</h1>
                <p className="text-slate-200 text-lg">
                  Comprehensive cost analysis for offshore drilling operations
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <DollarSign size={40} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">No Cost Allocation Data Available</h3>
            <p className="text-gray-600 mb-6">
              {!isDataReady 
                ? "Loading cost allocation data..." 
                : "No cost allocation data has been uploaded yet. Please upload your cost allocation Excel file to begin analysis."
              }
            </p>
            {isDataReady && (
              <div className="space-y-4">
                <button
                  onClick={onNavigateToUpload}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md"
                >
                  <Upload size={20} />
                  Upload Cost Allocation Data
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md"
                >
                  <AlertCircle size={20} />
                  Clear Cache & Reload
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-3">Vessel Cost Analytics</h1>
              <p className="text-slate-200 text-lg">
                Comprehensive cost analysis for offshore drilling operations
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <DollarSign size={40} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Component */}
      <CostAllocationFilters
        selectedMonth={selectedMonth}
        selectedLocation={selectedLocation}
        selectedProjectType={selectedProjectType}
        onMonthChange={setSelectedMonth}
        onLocationChange={setSelectedLocation}
        onProjectTypeChange={setSelectedProjectType}
        onClearFilters={() => {
          setSelectedMonth('all');
          setSelectedLocation('all');
          setSelectedProjectType('all');
        }}
        onDataQualityCheck={() => setShowDataQualityPopup(true)}
        filterOptions={filterOptions}
        dateRange={dateRange}
        totalAllocations={costAllocation?.length || 0}
        filteredAllocations={costAnalysis.totalAllocations}
      />

      {/* Tab Navigation and Content */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50">
        <TabNavigation
          tabs={COST_ALLOCATION_TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabId)}
        />

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <DashboardTab
              costAnalysis={costAnalysis}
              filteredCostAllocation={filteredCostAllocation}
              selectedMonth={selectedMonth}
              dateRange={dateRange}
            />
          )}
          
        </div>
      </div>

      {/* Data Quality Popup */}
      {showDataQualityPopup && costAllocation && (() => {
        const dataQualityReport = performDataQualityCheck(costAllocation);
        return (
          <DataQualityPopup
            isOpen={showDataQualityPopup}
            onClose={() => setShowDataQualityPopup(false)}
            issues={dataQualityReport.issues}
            totalRecords={dataQualityReport.totalRecords}
            validRecords={dataQualityReport.validRecordCount}
          />
        );
      })()}
    </div>
  );
};

export default CostAllocationManagerRefactored;