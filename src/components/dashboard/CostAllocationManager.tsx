import React, { useState, useMemo, useCallback } from 'react';
import { 
  DollarSign, 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  MapPin,
  FileText,
  Download,
  Drill,
  Wrench,
  Anchor,
  Settings,
  Users
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { 
  generateCostAnalysis, 
  debugRigLocationData, 
  validateCostAllocationData,
  MonthlyRigCost,
  RigCostTrend
} from '../../utils/costAnalysis';
import { 
  formatCurrency, 
  formatDays,
  formatToTwoDecimals,
  formatLargeCurrency
} from '../../utils/formatters';
import { 
  generateCostAllocationTemplate, 
  generateBlankCostAllocationTemplate, 
  exportCostAllocationData, 
  generateCostAllocationSummary,
  downloadExcelFile 
} from '../../utils/excelTemplateGenerator';
import { debugLocationMapping } from '../../data/masterFacilities';

interface CostAllocationManagerProps {
  onNavigateToUpload?: () => void;
}

// Project type configuration
const PROJECT_TYPE_CONFIG = {
  'Drilling': { icon: Drill, colorClass: 'blue' },
  'Completions': { icon: Wrench, colorClass: 'green' },
  'P&A': { icon: Anchor, colorClass: 'red' },
  'Production': { icon: BarChart3, colorClass: 'purple' },
  'Maintenance': { icon: Settings, colorClass: 'orange' },
  'Operator Sharing': { icon: Users, colorClass: 'indigo' },
  'Other': { icon: BarChart3, colorClass: 'gray' }
} as const;

type ProjectType = keyof typeof PROJECT_TYPE_CONFIG;

const CostAllocationManager: React.FC<CostAllocationManagerProps> = ({ onNavigateToUpload }) => {
  const { 
    costAllocation, 
    isDataReady
  } = useData();
  
  // CRITICAL DEBUG: Log the data we're receiving
  console.log('🔍 CostAllocationManager Debug:', {
    isDataReady,
    costAllocationCount: costAllocation?.length || 0,
    costAllocationSample: costAllocation?.slice(0, 3),
    firstCostAllocation: costAllocation?.[0],
    hasDataWithValues: costAllocation?.filter(cost => 
      (cost.totalCost && cost.totalCost > 0) || 
      (cost.budgetedVesselCost && cost.budgetedVesselCost > 0) ||
      (cost.totalAllocatedDays && cost.totalAllocatedDays > 0)
    ).length || 0
  });
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rigs' | 'projects' | 'monthly' | 'trends' | 'export'>('dashboard');
  
  // Enhanced filtering state
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedProjectType, setSelectedProjectType] = useState<string>('all');

  // ADDITIONAL DEBUG: Analyze data structure and values
  React.useEffect(() => {
    if (costAllocation && costAllocation.length > 0) {
      console.log('💾 COST ALLOCATION DETAILED ANALYSIS:');
      console.log('  Sample records with all fields:', costAllocation.slice(0, 2));
      
      // Analyze data completeness
      const dataAnalysis = {
        total: costAllocation.length,
        withLCNumber: costAllocation.filter(c => c.lcNumber && c.lcNumber !== '').length,
        withMonthYear: costAllocation.filter(c => c.monthYear).length,
        withAllocatedDays: costAllocation.filter(c => c.totalAllocatedDays && c.totalAllocatedDays > 0).length,
        withBudgetedCost: costAllocation.filter(c => c.budgetedVesselCost && c.budgetedVesselCost > 0).length,
        withTotalCost: costAllocation.filter(c => c.totalCost && c.totalCost > 0).length,
        withRigLocation: costAllocation.filter(c => c.rigLocation).length,
        withLocationReference: costAllocation.filter(c => c.locationReference).length
      };
      console.log('  Data completeness analysis:', dataAnalysis);
      
      // Analyze filtering data
      const allMonths = [...new Set(costAllocation.map(c => c.monthYear).filter(Boolean))];
      const allLocations = [...new Set(costAllocation.map(c => c.rigLocation).filter(Boolean))];
      console.log('  Available months:', allMonths);
      console.log('  Available locations:', allLocations);
    }
  }, [costAllocation]);

  // Intelligent project type detection
  const detectProjectType = useCallback((description?: string, costElement?: string, lcNumber?: string, projectType?: string): ProjectType => {
    // First priority: Use the explicit Project Type from the data if available
    if (projectType && projectType in PROJECT_TYPE_CONFIG) {
      return projectType as ProjectType;
    }
    
    // Fallback: Analyze description and cost element
    const text = `${description || ''} ${costElement || ''}`.toLowerCase();
    
    // P&A Operations
    if (text.includes('p&a') || text.includes('abandon') || text.includes('plug')) {
      return 'P&A';
    }
    
    // Completions (more specific patterns)
    if (text.includes('completion') || text.includes('fracturing') || text.includes('perforation') ||
        text.includes('workover') || text.includes('stimulation') || text.includes('acidizing')) {
      return 'Completions';
    }
    
    // Drilling (broad patterns)
    if (text.includes('drill') || text.includes('spud') || text.includes('cementing') ||
        text.includes('casing') || text.includes('mud') || text.includes('logging') ||
        text.includes('wireline') || text.includes('bha')) {
      return 'Drilling';
    }
    
    // Production
    if (text.includes('production') || text.includes('facility') || text.includes('platform') ||
        text.includes('processing') || text.includes('separation') || text.includes('export')) {
      return 'Production';
    }
    
    // Maintenance
    if (text.includes('maintenance') || text.includes('repair') || text.includes('inspection') ||
        text.includes('overhaul') || text.includes('upgrade')) {
      return 'Maintenance';
    }
    
    // Operator Sharing
    if (text.includes('operator') || text.includes('sharing') || text.includes('joint') ||
        text.includes('partner') || text.includes('alliance')) {
      return 'Operator Sharing';
    }
    
    return 'Other';
  }, []);

  // Enhanced filter options
  const filterOptions = useMemo(() => {
    if (!costAllocation || costAllocation.length === 0) {
      return { months: [], locations: [], projectTypes: [] };
    }

    const months = [...new Set(costAllocation.map(a => a.monthYear).filter(Boolean))].sort();
    const locations = [...new Set(costAllocation.map(a => a.rigLocation).filter(Boolean))].sort();
    
    // Get project types from data
    const projectTypes = [...new Set(costAllocation.map(a => 
      detectProjectType(a.description, a.costElement, a.lcNumber, a.projectType)
    ))].sort();
    
    return { months, locations, projectTypes };
  }, [costAllocation, detectProjectType]);

  // Enhanced filtering with project types
  const filteredCostAllocation = useMemo(() => {
    if (!costAllocation) return [];
    
    return costAllocation.filter(allocation => {
      const monthMatch = selectedMonth === 'all' || allocation.monthYear === selectedMonth;
      const locationMatch = selectedLocation === 'all' || allocation.rigLocation === selectedLocation;
      const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
      const projectTypeMatch = selectedProjectType === 'all' || projectType === selectedProjectType;
      
      return monthMatch && locationMatch && projectTypeMatch;
    });
  }, [costAllocation, selectedMonth, selectedLocation, selectedProjectType, detectProjectType]);

  // Enhanced cost analysis with project types
  const costAnalysis = useMemo(() => {
    if (!filteredCostAllocation || filteredCostAllocation.length === 0) {
      return {
        totalAllocations: 0,
        totalBudgetedCost: 0,
        totalAllocatedDays: 0,
        avgCostPerDay: 0,
        projectTypeBreakdown: {},
        rigLocationBreakdown: {},
        monthlyTrends: {},
        costEfficiencyMetrics: {
          avgCostPerProject: 0,
          mostEfficientProjectType: 'N/A',
          utilizationRate: 0
        }
      };
    }

    const totalBudgetedCost = filteredCostAllocation.reduce((sum, allocation) => sum + (allocation.budgetedVesselCost || 0), 0);
    const totalAllocatedDays = filteredCostAllocation.reduce((sum, allocation) => sum + (allocation.totalAllocatedDays || 0), 0);
    const avgCostPerDay = totalAllocatedDays > 0 ? totalBudgetedCost / totalAllocatedDays : 0;

    // Project type analysis with enhanced metrics
    const projectTypeBreakdown = filteredCostAllocation.reduce((acc, allocation) => {
      const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
      if (!acc[projectType]) {
        acc[projectType] = { 
          cost: 0, 
          days: 0, 
          count: 0, 
          avgCostPerDay: 0,
          efficiency: 0,
          locations: new Set()
        };
      }
      acc[projectType].cost += allocation.budgetedVesselCost || 0;
      acc[projectType].days += allocation.totalAllocatedDays || 0;
      acc[projectType].count += 1;
      if (allocation.rigLocation) {
        acc[projectType].locations.add(allocation.rigLocation);
      }
      acc[projectType].avgCostPerDay = acc[projectType].days > 0 ? acc[projectType].cost / acc[projectType].days : 0;
      return acc;
    }, {} as Record<string, any>);

    // Enhanced rig location analysis with PROPER NUMBER AGGREGATION
    const rigLocationBreakdown = filteredCostAllocation
      .filter(allocation => allocation.rigLocation)
      .reduce((acc, allocation) => {
        const rig = allocation.rigLocation!;
        const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
        
        if (!acc[rig]) {
          acc[rig] = { 
            cost: 0, 
            days: 0, 
            count: 0, 
            rigType: allocation.rigType || 'Unknown',
            waterDepth: allocation.waterDepth || 0,
            avgDailyRate: 0,
            projects: {},
            efficiency: 0,
            utilizationRate: 0,
            records: [] // TRACK INDIVIDUAL RECORDS FOR DEBUGGING
          };
        }
        
        // CRITICAL FIX: Ensure proper number conversion to prevent string concatenation
        const costValue = Number(allocation.budgetedVesselCost || allocation.totalCost || 0);
        const daysValue = Number(allocation.totalAllocatedDays || 0);
        const dailyRate = Number(allocation.vesselDailyRateUsed || 0);
        
        // Debug first few records
        if (acc[rig].count === 0) {
          console.log(`💰 COST AGGREGATING ${rig}:`, {
            lcNumber: allocation.lcNumber,
            originalCost: allocation.budgetedVesselCost,
            originalDays: allocation.totalAllocatedDays,
            costValue,
            daysValue,
            types: [typeof allocation.budgetedVesselCost, typeof allocation.totalAllocatedDays]
          });
        }
        
        acc[rig].cost += costValue;
        acc[rig].days += daysValue;
        acc[rig].count += 1;
        acc[rig].avgDailyRate = dailyRate; // Use most recent daily rate
        acc[rig].records.push({
          lcNumber: allocation.lcNumber,
          days: daysValue,
          cost: costValue,
          monthYear: allocation.monthYear
        });
        
        // Project breakdown per rig
        if (!acc[rig].projects[projectType]) {
          acc[rig].projects[projectType] = { cost: 0, days: 0, count: 0 };
        }
        acc[rig].projects[projectType].cost += costValue;
        acc[rig].projects[projectType].days += daysValue;
        acc[rig].projects[projectType].count += 1;
        
        return acc;
      }, {} as Record<string, any>);
    
    // Log final aggregation results for verification
    Object.entries(rigLocationBreakdown).forEach(([rig, data]: [string, any]) => {
      console.log(`📋 FINAL RIG BREAKDOWN for ${rig}:`, {
        totalRecords: data.count,
        aggregatedDays: data.days,
        aggregatedCost: data.cost,
        individualRecords: data.records.map((r: any) => `${r.lcNumber}: ${r.days}d`).join(', ')
      });
    });

    // Monthly trends with project insights
    const monthlyTrends = filteredCostAllocation.reduce((acc, allocation) => {
      const month = allocation.monthYear || 'Unknown';
      const projectType = detectProjectType(allocation.description, allocation.costElement, allocation.lcNumber, allocation.projectType);
      
      if (!acc[month]) {
        acc[month] = { cost: 0, days: 0, count: 0, projects: {}, avgRate: 0 };
      }
      
      acc[month].cost += allocation.budgetedVesselCost || 0;
      acc[month].days += allocation.totalAllocatedDays || 0;
      acc[month].count += 1;
      acc[month].avgRate = allocation.vesselDailyRateUsed || 0;
      
      if (!acc[month].projects[projectType]) {
        acc[month].projects[projectType] = { cost: 0, days: 0 };
      }
      acc[month].projects[projectType].cost += allocation.budgetedVesselCost || 0;
      acc[month].projects[projectType].days += allocation.totalAllocatedDays || 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Cost efficiency metrics
    const costEfficiencyMetrics = {
      avgCostPerProject: Object.keys(projectTypeBreakdown).length > 0 ? 
        totalBudgetedCost / Object.keys(projectTypeBreakdown).length : 0,
      mostEfficientProjectType: Object.entries(projectTypeBreakdown)
        .sort(([,a], [,b]) => a.avgCostPerDay - b.avgCostPerDay)[0]?.[0] || 'N/A',
      utilizationRate: totalAllocatedDays > 0 ? (totalAllocatedDays / (365 * Object.keys(rigLocationBreakdown).length)) * 100 : 0
    };

    return {
      totalAllocations: filteredCostAllocation.length,
      totalBudgetedCost,
      totalAllocatedDays,
      avgCostPerDay,
      projectTypeBreakdown,
      rigLocationBreakdown,
      monthlyTrends,
      costEfficiencyMetrics
    };
  }, [filteredCostAllocation, detectProjectType]);

  // Enhanced cost analysis with monthly tracking and trends
  const comprehensiveCostAnalysis = useMemo(() => {
    if (!filteredCostAllocation || filteredCostAllocation.length === 0) {
      return null;
    }
    
    // Generate comprehensive analysis
    const analysis = generateCostAnalysis(filteredCostAllocation);
    
    // Debug Thunder Horse and Mad Dog specifically
    const thunderHorseDebug = debugRigLocationData(filteredCostAllocation, 'Thunder Horse');
    const madDogDebug = debugRigLocationData(filteredCostAllocation, 'Mad Dog');
    
    console.log('🔍 Thunder Horse Debug Analysis:', thunderHorseDebug);
    console.log('🔍 Mad Dog Debug Analysis:', madDogDebug);
    
    // Enhanced issue reporting with details
    if (thunderHorseDebug.potentialIssues.length > 0) {
      console.warn('⚠️ Thunder Horse Data Issues:', thunderHorseDebug.potentialIssues);
      console.log('📋 Thunder Horse Monthly Breakdown:', thunderHorseDebug.monthlyBreakdown);
      console.log('📝 Thunder Horse Unique LC Numbers:', thunderHorseDebug.uniqueLCNumbers);
    }
    if (madDogDebug.potentialIssues.length > 0) {
      console.warn('⚠️ Mad Dog Data Issues:', madDogDebug.potentialIssues);
      console.log('📋 Mad Dog Monthly Breakdown:', madDogDebug.monthlyBreakdown);
      console.log('📝 Mad Dog Unique LC Numbers:', madDogDebug.uniqueLCNumbers);
    }
    
    // DETAILED OVERALL DATA VALIDATION
    const { validRecords, duplicates, issues } = validateCostAllocationData(filteredCostAllocation);
    
    console.group('📊 COMPREHENSIVE DATA QUALITY REPORT');
    console.log('Total Records Processed:', filteredCostAllocation.length);
    console.log('Valid Records:', validRecords.length);
    console.log('Duplicate Records:', duplicates.length);
    console.log('Total Issues Found:', issues.length);
    
    if (issues.length > 0) {
      console.group('🚨 DETAILED ISSUE BREAKDOWN');
      
      // Categorize issues
      const issueCategories = {
        invalidDays: issues.filter((issue: string) => issue.includes('Invalid allocated days')),
        excessiveDays: issues.filter((issue: string) => issue.includes('Excessive allocated days')),
        duplicates: issues.filter((issue: string) => issue.includes('duplicate')),
        missingLocation: issues.filter((issue: string) => issue.includes('Missing rig location')),
        missingDate: issues.filter((issue: string) => issue.includes('Missing or invalid date'))
      };
      
      Object.entries(issueCategories).forEach(([category, categoryIssues]) => {
        if (categoryIssues.length > 0) {
          console.group(`📌 ${category.toUpperCase()} (${categoryIssues.length} issues)`);
          categoryIssues.slice(0, 10).forEach((issue: string) => console.log('• ' + issue));
          if (categoryIssues.length > 10) {
            console.log(`... and ${categoryIssues.length - 10} more ${category} issues`);
          }
          console.groupEnd();
        }
      });
      
      console.groupEnd(); // End detailed breakdown
    }
    
    // Rig-specific excessive days analysis
    const rigExcessiveDays = filteredCostAllocation
      .filter(record => record.totalAllocatedDays && record.totalAllocatedDays > 31)
      .reduce((acc: Record<string, any[]>, record) => {
        const rig = record.rigLocation || 'Unknown';
        if (!acc[rig]) acc[rig] = [];
        acc[rig].push({
          lcNumber: record.lcNumber,
          monthYear: record.monthYear,
          days: record.totalAllocatedDays,
          description: record.description
        });
        return acc;
      }, {} as Record<string, any[]>);
    
    if (Object.keys(rigExcessiveDays).length > 0) {
      console.group('⚠️ RIGS WITH EXCESSIVE ALLOCATED DAYS (>31/month)');
      Object.entries(rigExcessiveDays).forEach(([rig, records]) => {
        console.log(`🔴 ${rig}:`, records);
      });
      console.groupEnd();
    }
    
    console.groupEnd(); // End comprehensive report
    
    return analysis;
  }, [filteredCostAllocation]);

  const handleDownloadTemplate = useCallback((withSampleData: boolean = false) => {
    try {
      const workbook = withSampleData 
        ? generateCostAllocationTemplate() 
        : generateBlankCostAllocationTemplate();
      const filename = withSampleData 
        ? 'cost-allocation-template-with-samples.xlsx'
        : 'cost-allocation-template.xlsx';
      downloadExcelFile(workbook, filename);
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Error generating template. Please try again.');
    }
  }, []);

  const handleExportData = useCallback(() => {
    try {
      exportCostAllocationData(costAllocation);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  }, [costAllocation]);

  const handleExportSummary = useCallback(() => {
    try {
      const summaryWorkbook = generateCostAllocationSummary(costAllocation);
      downloadExcelFile(summaryWorkbook, `cost-allocation-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Error generating summary report. Please try again.');
    }
  }, [costAllocation]);

  // Add debugging logs to understand the data
  React.useEffect(() => {
    if (costAllocation && costAllocation.length > 0) {
      console.log('🔍 Cost Allocation Data Debug:');
      console.log('  Total records:', costAllocation.length);
      console.log('  Sample records:');
      costAllocation.slice(0, 3).forEach((record, index) => {
        console.log(`    Record ${index + 1}:`, record);
      });

      // Debug location mapping
      console.log('  Location Analysis:');
      const uniqueRigLocations = [...new Set(costAllocation.map(c => c.rigLocation).filter(Boolean))];
      const uniqueLocationReferences = [...new Set(costAllocation.map(c => c.locationReference).filter(Boolean))];
      console.log('    Unique Rig Locations:', uniqueRigLocations);
      console.log('    Unique Location References:', uniqueLocationReferences);
      console.log('    Sample cost allocation with locations:', costAllocation.filter(c => c.rigLocation || c.locationReference).slice(0, 5).map(c => ({
        lcNumber: c.lcNumber,
        rigLocation: c.rigLocation,
        locationReference: c.locationReference,
        description: c.description
      })));

      const uniqueMonths = [...new Set(costAllocation.map(c => c.monthYear).filter(Boolean))];
      const uniqueYears = [...new Set(costAllocation.map(c => c.year).filter(Boolean))];
      console.log('  Unique months:', uniqueMonths);
      console.log('  Unique years:', uniqueYears);

      const recordsWithBudgetedCosts = costAllocation.filter(c => c.budgetedVesselCost && c.budgetedVesselCost > 0);
      console.log('  Records with budgeted vessel costs:', recordsWithBudgetedCosts.length + '/' + costAllocation.length);

      // DEBUG: Analyze location mapping
      if (costAllocation.length > 0) {
        debugLocationMapping(costAllocation);
      }
    } else {
      console.log('🔍 No cost allocation data available');
    }
  }, [costAllocation]);

  const getProjectIcon = useCallback((projectType: string) => {
    return PROJECT_TYPE_CONFIG[projectType as ProjectType]?.icon || BarChart3;
  }, []);

  const getProjectColorClasses = useCallback((projectType: string) => {
    const colorClass = PROJECT_TYPE_CONFIG[projectType as ProjectType]?.colorClass || 'gray';
    
    // Return predefined Tailwind classes based on color
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        iconBg: 'bg-blue-200',
        iconText: 'text-blue-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        iconBg: 'bg-green-200',
        iconText: 'text-green-700'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        iconBg: 'bg-red-200',
        iconText: 'text-red-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        iconBg: 'bg-purple-200',
        iconText: 'text-purple-700'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        iconBg: 'bg-orange-200',
        iconText: 'text-orange-700'
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-800',
        iconBg: 'bg-indigo-200',
        iconText: 'text-indigo-700'
      },
      gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        iconBg: 'bg-gray-200',
        iconText: 'text-gray-700'
      }
    };
    
    return colorMap[colorClass as keyof typeof colorMap] || colorMap.gray;
  }, []);

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

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload size={20} />
                  Upload Cost Allocation Data
                </button>
                <button
                  onClick={() => {
                    console.log('🗑️ Clearing localStorage to force fresh data load...');
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <AlertCircle size={20} />
                  Clear Cache & Reload
                </button>
                <div className="text-sm text-gray-500">
                  <p>Expected format: Excel file with columns for LC Number, Location Reference, Cost Element, Project Type, etc.</p>
                  <p className="mt-2">If you've uploaded data but it's not showing, try clearing the cache first.</p>
                </div>
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
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Real-time Cost Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Project Type Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Rig Performance Metrics</span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <DollarSign size={40} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cost Analysis Filters</h3>
          <div className="text-sm text-gray-500">
            Showing {costAnalysis.totalAllocations} of {costAllocation?.length || 0} allocations
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Time Period</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              onChange={(e) => setSelectedProjectType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Project Types</option>
              {filterOptions.projectTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            {(selectedMonth !== 'all' || selectedLocation !== 'all' || selectedProjectType !== 'all') && (
              <button
                onClick={() => {
                  setSelectedMonth('all');
                  setSelectedLocation('all');
                  setSelectedProjectType('all');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'rigs', label: 'Rigs', icon: MapPin },
              { id: 'projects', label: 'Projects', icon: FileText },
              { id: 'monthly', label: 'Monthly Tracking', icon: Calendar },
              { id: 'trends', label: 'Monthly Trends', icon: TrendingUp },
              { id: 'export', label: 'Export & Templates', icon: Download }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Data Quality Alert */}
              {comprehensiveCostAnalysis && (
                (() => {
                  const { validRecords, duplicates, issues } = validateCostAllocationData(filteredCostAllocation);
                  if (issues.length > 0) {
                    return (
                      <div className="bg-gradient-to-r from-yellow-50 to-red-50 border border-yellow-200 rounded-xl p-6">
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
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-700 text-sm font-semibold uppercase tracking-wide">Total Projects</p>
                      <p className="text-3xl font-bold text-blue-900 mt-1">
                        {costAnalysis.totalAllocations.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        {selectedMonth !== 'all' ? `${selectedMonth}` : 'All periods'}
                      </p>
                    </div>
                    <div className="bg-blue-200 rounded-lg p-3">
                      <FileSpreadsheet className="text-blue-700" size={24} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-700 text-sm font-semibold uppercase tracking-wide">Total Vessel Cost</p>
                      <p className="text-3xl font-bold text-green-900 mt-1">
                        {formatLargeCurrency(costAnalysis.totalBudgetedCost)}
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
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
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
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-700 text-sm font-semibold uppercase tracking-wide">Daily Rate</p>
                      <p className="text-3xl font-bold text-orange-900 mt-1">
                        {formatCurrency(costAnalysis.avgCostPerDay)}
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
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Project Type Cost Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(costAnalysis.projectTypeBreakdown)
                      .sort(([,a], [,b]) => b.cost - a.cost)
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
                                  {formatLargeCurrency(data.cost)}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Days</p>
                                  <p className="font-semibold">{data.days.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Avg/Day</p>
                                  <p className="font-semibold">{formatCurrency(data.avgCostPerDay)}</p>
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
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
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
                        {formatLargeCurrency(costAnalysis.costEfficiencyMetrics.avgCostPerProject)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Utilization Rate</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {costAnalysis.costEfficiencyMetrics.utilizationRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cost Trends</h4>
                  <div className="space-y-3">
                    {Object.entries(costAnalysis.monthlyTrends)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(-6) // Show last 6 months
                      .map(([month, data]: [string, any]) => (
                      <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{month}</p>
                          <p className="text-sm text-gray-600">{data.count} projects • {data.days} days</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatLargeCurrency(data.cost)}</p>
                          <p className="text-sm text-gray-600">${data.avgRate.toLocaleString()}/day</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rigs Tab */}
          {activeTab === 'rigs' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Rig Performance & Cost Analysis</h3>
                
                {Object.keys(costAnalysis.rigLocationBreakdown).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(costAnalysis.rigLocationBreakdown)
                      .sort(([,a], [,b]) => b.cost - a.cost)
                      .map(([rig, data]: [string, any]) => (
                      <div key={rig} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">{rig}</h4>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                                {data.rigType}
                              </span>
                              {data.waterDepth > 0 && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium">
                                  {data.waterDepth.toLocaleString()} ft depth
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">{formatLargeCurrency(data.cost)}</p>
                            <p className="text-sm text-gray-600">Total vessel cost</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-3 border">
                            <p className="text-sm text-gray-600">Allocated Days</p>
                            <p className="text-lg font-bold text-gray-900">{data.days.toLocaleString()}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border">
                            <p className="text-sm text-gray-600">Daily Rate</p>
                            <p className="text-lg font-bold text-gray-900">${data.avgDailyRate.toLocaleString()}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border">
                            <p className="text-sm text-gray-600">Projects</p>
                            <p className="text-lg font-bold text-gray-900">{data.count}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border">
                            <p className="text-sm text-gray-600">Cost/Day</p>
                            <p className="text-lg font-bold text-gray-900">
                              {data.days > 0 ? formatCurrency(data.cost / data.days) : '$0'}
                            </p>
                          </div>
                        </div>

                        {/* Project breakdown for this rig */}
                        {data.projects && Object.keys(data.projects).length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Project Type Breakdown:</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {Object.entries(data.projects).map(([projectType, projectData]: [string, any]) => {
                                const Icon = getProjectIcon(projectType);
                                const colorClasses = getProjectColorClasses(projectType);
                                return (
                                  <div key={projectType} className={`bg-${colorClasses.bg} border border-${colorClasses.border} rounded-lg p-2`}>
                                    <div className="flex items-center gap-2">
                                      <Icon className={`text-${colorClasses.iconText}`} size={16} />
                                      <span className="text-xs font-medium text-gray-700">{projectType}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 mt-1">
                                      {formatLargeCurrency(projectData.cost)}
                                    </p>
                                    <p className="text-xs text-gray-600">{projectData.days} days</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No rig location data available</p>
                    <p className="text-sm text-gray-500">Check your filters or upload data with rig location information</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Project Type Deep Dive</h3>
                
                {Object.keys(costAnalysis.projectTypeBreakdown).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(costAnalysis.projectTypeBreakdown)
                      .sort(([,a], [,b]) => b.cost - a.cost)
                      .map(([projectType, data]: [string, any]) => {
                        const Icon = getProjectIcon(projectType);
                        const colorClasses = getProjectColorClasses(projectType);
                        const costPercentage = costAnalysis.totalBudgetedCost > 0 ? 
                          (data.cost / costAnalysis.totalBudgetedCost) * 100 : 0;
                        
                        return (
                          <div key={projectType} className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className={`bg-${colorClasses.bg} rounded-lg p-3`}>
                                  <Icon className={`text-${colorClasses.iconText}`} size={32} />
                                </div>
                                <div>
                                  <h4 className="text-2xl font-bold text-gray-900">{projectType}</h4>
                                  <p className="text-gray-600">{data.count} projects across {data.locations?.size || 0} locations</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-gray-900">{formatLargeCurrency(data.cost)}</p>
                                <p className="text-sm text-gray-600">{costPercentage.toFixed(1)}% of total cost</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-white rounded-lg p-4 border">
                                <p className="text-sm text-gray-600">Total Days</p>
                                <p className="text-xl font-bold text-gray-900">{data.days.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Project duration</p>
                              </div>
                              <div className="bg-white rounded-lg p-4 border">
                                <p className="text-sm text-gray-600">Average Cost/Day</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(data.avgCostPerDay)}</p>
                                <p className="text-xs text-gray-500 mt-1">Daily vessel cost</p>
                              </div>
                              <div className="bg-white rounded-lg p-4 border">
                                <p className="text-sm text-gray-600">Cost per Project</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {formatLargeCurrency(data.count > 0 ? data.cost / data.count : 0)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Average project cost</p>
                              </div>
                              <div className="bg-white rounded-lg p-4 border">
                                <p className="text-sm text-gray-600">Days per Project</p>
                                <p className="text-xl font-bold text-gray-900">
                                  {data.count > 0 ? Math.round(data.days / data.count) : 0}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Average duration</p>
                              </div>
                            </div>

                            {/* Project insights */}
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <h5 className="font-semibold text-blue-900 mb-2">Project Insights</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-blue-800">
                                    • {data.locations?.size || 0} active rig locations
                                  </p>
                                  <p className="text-blue-800">
                                    • ${(data.cost / (data.days || 1)).toLocaleString()}/day average rate
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-800">
                                    • {costPercentage.toFixed(1)}% of total portfolio cost
                                  </p>
                                  <p className="text-blue-800">
                                    • {data.count} active projects
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No project data available</p>
                    <p className="text-sm text-gray-500">Upload cost allocation data to see project analysis</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly Tracking Tab */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              {comprehensiveCostAnalysis ? (
                <>
                  {/* Monthly Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-700 text-sm font-semibold uppercase tracking-wide">Monthly Periods</p>
                          <p className="text-3xl font-bold text-blue-900 mt-1">
                            {Object.keys(comprehensiveCostAnalysis.monthlyOverview).length}
                          </p>
                          <p className="text-xs text-blue-600 mt-2">Active time periods</p>
                        </div>
                        <div className="bg-blue-200 rounded-lg p-3">
                          <Calendar className="text-blue-700" size={24} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-700 text-sm font-semibold uppercase tracking-wide">Total Monthly Cost</p>
                          <p className="text-3xl font-bold text-green-900 mt-1">
                            {formatLargeCurrency(Object.values(comprehensiveCostAnalysis.monthlyOverview).reduce((sum: number, month: any) => sum + month.totalCost, 0))}
                          </p>
                          <p className="text-xs text-green-600 mt-2">All rig locations</p>
                        </div>
                        <div className="bg-green-200 rounded-lg p-3">
                          <DollarSign className="text-green-700" size={24} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-700 text-sm font-semibold uppercase tracking-wide">Avg Cost/Month</p>
                          <p className="text-3xl font-bold text-purple-900 mt-1">
                            {formatLargeCurrency(Object.values(comprehensiveCostAnalysis.monthlyOverview).reduce((sum: number, month: any) => sum + month.totalCost, 0) / Math.max(1, Object.keys(comprehensiveCostAnalysis.monthlyOverview).length))}
                          </p>
                          <p className="text-xs text-purple-600 mt-2">Average monthly spend</p>
                        </div>
                        <div className="bg-purple-200 rounded-lg p-3">
                          <BarChart3 className="text-purple-700" size={24} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-700 text-sm font-semibold uppercase tracking-wide">Active Rigs</p>
                          <p className="text-3xl font-bold text-orange-900 mt-1">
                            {Object.keys(comprehensiveCostAnalysis.rigTrends).length}
                          </p>
                          <p className="text-xs text-orange-600 mt-2">Drilling locations</p>
                        </div>
                        <div className="bg-orange-200 rounded-lg p-3">
                          <MapPin className="text-orange-700" size={24} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Timeline Analysis */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">Monthly Cost Timeline</h4>
                    <div className="space-y-4">
                      {Object.entries(comprehensiveCostAnalysis.monthlyOverview)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([monthYear, data]: [string, any]) => (
                        <div key={monthYear} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 rounded-lg p-3">
                              <Calendar className="text-blue-600" size={20} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{monthYear}</p>
                              <p className="text-sm text-gray-600">
                                {data.rigCount} rigs • {formatDays(data.totalDays)} total days
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatLargeCurrency(data.totalCost)}</p>
                            <p className="text-sm text-gray-600">{formatCurrency(data.averageDailyRate)}/day avg</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rig-by-Rig Monthly Breakdown */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">Rig Location Monthly Breakdown</h4>
                    <div className="space-y-6">
                      {Object.entries(comprehensiveCostAnalysis.rigTrends)
                        .sort(([,a], [,b]) => b.totalCost - a.totalCost)
                        .map(([rigLocation, trend]: [string, RigCostTrend]) => (
                        <div key={rigLocation} className="border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="text-xl font-bold text-gray-900">{rigLocation}</h5>
                              <p className="text-gray-600">{trend.monthlyData.length} months of data</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{formatLargeCurrency(trend.totalCost)}</p>
                              <p className="text-sm text-gray-600">Total cost</p>
                            </div>
                          </div>

                          {/* Monthly data for this rig */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {trend.monthlyData.map((monthly: MonthlyRigCost) => (
                              <div key={`${monthly.monthYear}_${monthly.rigLocation}`} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium text-gray-900">{monthly.month} {monthly.year}</p>
                                  <div className="text-sm text-gray-600">{monthly.projectCount} projects</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Cost:</span>
                                    <span className="font-semibold">{formatLargeCurrency(monthly.budgetedCost || monthly.totalCost)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Days:</span>
                                    <span className="font-semibold">{formatDays(monthly.allocatedDays)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Rate:</span>
                                    <span className="font-semibold">{formatCurrency(monthly.costPerDay)}/day</span>
                                  </div>
                                  {monthly.lcNumbers.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-2">
                                      LCs: {monthly.lcNumbers.slice(0, 3).join(', ')}{monthly.lcNumbers.length > 3 ? ` +${monthly.lcNumbers.length - 3}` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Summary stats for this rig */}
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">{formatLargeCurrency(trend.averageMonthlyCost)}</p>
                              <p className="text-xs text-gray-600">Avg Monthly Cost</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{formatDays(trend.totalDays)}</p>
                              <p className="text-xs text-gray-600">Total Days</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-purple-600">{formatCurrency(trend.averageDailyRate)}</p>
                              <p className="text-xs text-gray-600">Avg Daily Rate</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-lg font-bold ${trend.costTrend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {trend.costTrend > 0 ? '+' : ''}{formatToTwoDecimals(trend.costTrend)}%
                              </p>
                              <p className="text-xs text-gray-600">Cost Trend</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No monthly cost data available</p>
                  <p className="text-sm text-gray-500">Upload cost allocation data to see monthly tracking</p>
                </div>
              )}
            </div>
          )}

          {/* Monthly Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {comprehensiveCostAnalysis ? (
                <>
                  {/* Trend Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-700 text-sm font-semibold uppercase tracking-wide">Trend Direction</p>
                          <p className="text-2xl font-bold text-blue-900 mt-1 capitalize">
                            {comprehensiveCostAnalysis.projections.trendDirection}
                          </p>
                          <p className="text-xs text-blue-600 mt-2">
                            {formatToTwoDecimals(comprehensiveCostAnalysis.projections.confidenceLevel)}% confidence
                          </p>
                        </div>
                        <div className="bg-blue-200 rounded-lg p-3">
                          {comprehensiveCostAnalysis.projections.trendDirection === 'increasing' ? (
                            <TrendingUp className="text-blue-700" size={24} />
                          ) : comprehensiveCostAnalysis.projections.trendDirection === 'decreasing' ? (
                            <TrendingDown className="text-blue-700" size={24} />
                          ) : (
                            <Activity className="text-blue-700" size={24} />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-700 text-sm font-semibold uppercase tracking-wide">Next Month Projection</p>
                          <p className="text-2xl font-bold text-green-900 mt-1">
                            {formatLargeCurrency(comprehensiveCostAnalysis.projections.nextMonthTotalCost)}
                          </p>
                          <p className="text-xs text-green-600 mt-2">Predicted cost</p>
                        </div>
                        <div className="bg-green-200 rounded-lg p-3">
                          <Calendar className="text-green-700" size={24} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-700 text-sm font-semibold uppercase tracking-wide">Next Quarter</p>
                          <p className="text-2xl font-bold text-purple-900 mt-1">
                            {formatLargeCurrency(comprehensiveCostAnalysis.projections.nextQuarterCost)}
                          </p>
                          <p className="text-xs text-purple-600 mt-2">3-month projection</p>
                        </div>
                        <div className="bg-purple-200 rounded-lg p-3">
                          <BarChart3 className="text-purple-700" size={24} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-700 text-sm font-semibold uppercase tracking-wide">Yearly Periods</p>
                          <p className="text-2xl font-bold text-orange-900 mt-1">
                            {Object.keys(comprehensiveCostAnalysis.yearlyComparison).length}
                          </p>
                          <p className="text-xs text-orange-600 mt-2">Years of data</p>
                        </div>
                        <div className="bg-orange-200 rounded-lg p-3">
                          <TrendingUp className="text-orange-700" size={24} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Year-over-Year Comparison */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">Year-over-Year Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(comprehensiveCostAnalysis.yearlyComparison)
                        .sort(([a], [b]) => parseInt(b) - parseInt(a))
                        .map(([year, data]: [string, any]) => (
                        <div key={year} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-xl font-bold text-gray-900">{year}</h5>
                            <div className="bg-blue-100 rounded-lg p-2">
                              <Calendar className="text-blue-600" size={16} />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Total Cost</p>
                              <p className="text-lg font-bold text-gray-900">{formatLargeCurrency(data.totalCost)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-600">Total Days</p>
                                <p className="font-semibold">{formatDays(data.totalDays)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Active Rigs</p>
                                <p className="font-semibold">{data.rigCount}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Avg Monthly Cost</p>
                              <p className="font-semibold text-purple-600">{formatLargeCurrency(data.averageMonthlyCost)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rig-Level Trend Analysis */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-6">Rig Cost Trends & Projections</h4>
                    <div className="space-y-6">
                      {Object.entries(comprehensiveCostAnalysis.rigTrends)
                        .sort(([,a], [,b]) => Math.abs(b.costTrend) - Math.abs(a.costTrend))
                        .map(([rigLocation, trend]: [string, RigCostTrend]) => (
                        <div key={rigLocation} className="border border-gray-200 rounded-xl p-6">
                          <div className="flex items-start justify-between mb-6">
                            <div>
                              <h5 className="text-xl font-bold text-gray-900">{rigLocation}</h5>
                              <p className="text-gray-600">{trend.monthlyData.length} months of historical data</p>
                            </div>
                            <div className="text-right">
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                trend.costTrend > 5 ? 'bg-red-100 text-red-700' :
                                trend.costTrend < -5 ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {trend.costTrend > 0 ? (
                                  <TrendingUp size={16} />
                                ) : trend.costTrend < 0 ? (
                                  <TrendingDown size={16} />
                                ) : (
                                  <Activity size={16} />
                                )}
                                {trend.costTrend > 0 ? '+' : ''}{formatToTwoDecimals(trend.costTrend)}%/month
                              </div>
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-blue-600">{formatLargeCurrency(trend.averageMonthlyCost)}</p>
                              <p className="text-xs text-blue-800">Avg Monthly</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-green-600">{formatLargeCurrency(trend.projectedNextMonthCost)}</p>
                              <p className="text-xs text-green-800">Next Month</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-purple-600">{formatCurrency(trend.averageDailyRate)}</p>
                              <p className="text-xs text-purple-800">Daily Rate</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3 text-center">
                              <p className="text-lg font-bold text-orange-600">{formatDays(trend.totalDays)}</p>
                              <p className="text-xs text-orange-800">Total Days</p>
                            </div>
                            <div className={`rounded-lg p-3 text-center ${
                              trend.yearOverYearComparison.variancePercentage > 0 ? 'bg-red-50' : 'bg-green-50'
                            }`}>
                              <p className={`text-lg font-bold ${
                                trend.yearOverYearComparison.variancePercentage > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {trend.yearOverYearComparison.variancePercentage > 0 ? '+' : ''}{formatToTwoDecimals(trend.yearOverYearComparison.variancePercentage)}%
                              </p>
                              <p className={`text-xs ${
                                trend.yearOverYearComparison.variancePercentage > 0 ? 'text-red-800' : 'text-green-800'
                              }`}>YoY Change</p>
                            </div>
                          </div>

                          {/* Historical vs Current Year */}
                          {(trend.yearOverYearComparison.currentYear > 0 || trend.yearOverYearComparison.previousYear > 0) && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h6 className="font-semibold text-gray-900 mb-3">Year-over-Year Comparison</h6>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">Current Year</p>
                                  <p className="font-bold text-gray-900">{formatLargeCurrency(trend.yearOverYearComparison.currentYear)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">Previous Year</p>
                                  <p className="font-bold text-gray-900">{formatLargeCurrency(trend.yearOverYearComparison.previousYear)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">Variance</p>
                                  <p className={`font-bold ${
                                    trend.yearOverYearComparison.variance > 0 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {trend.yearOverYearComparison.variance > 0 ? '+' : ''}{formatLargeCurrency(trend.yearOverYearComparison.variance)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Cost Projection Insights */}
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h6 className="font-semibold text-blue-900 mb-2">🔮 Cost Projections & Insights</h6>
                            <div className="text-sm text-blue-800 space-y-1">
                              <p>
                                • Based on {trend.monthlyData.length} months of data, the cost trend is{' '}
                                <span className="font-semibold">
                                  {Math.abs(trend.costTrend) < 2 ? 'stable' : trend.costTrend > 0 ? 'increasing' : 'decreasing'}
                                </span>
                                {Math.abs(trend.costTrend) >= 2 && (
                                  <span> at {formatToTwoDecimals(Math.abs(trend.costTrend))}% per month</span>
                                )}
                              </p>
                              <p>
                                • Next month projected cost: <span className="font-semibold">{formatLargeCurrency(trend.projectedNextMonthCost)}</span>
                              </p>
                              <p>
                                • Compared to last year: <span className="font-semibold">
                                  {trend.yearOverYearComparison.variancePercentage > 0 ? 'Higher' : 'Lower'} by{' '}
                                  {formatToTwoDecimals(Math.abs(trend.yearOverYearComparison.variancePercentage))}%
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overall Portfolio Projections */}
                  <div className="bg-gradient-to-br from-slate-800 to-blue-900 rounded-xl p-8 text-white">
                    <h4 className="text-xl font-bold mb-6">📈 Portfolio Cost Projections</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                        <h5 className="font-semibold mb-2">Short-term Forecast</h5>
                        <p className="text-3xl font-bold mb-2">{formatLargeCurrency(comprehensiveCostAnalysis.projections.nextMonthTotalCost)}</p>
                        <p className="text-sm opacity-90">Next month (all rigs)</p>
                        <div className="mt-3 text-xs opacity-75">
                          Based on recent trend analysis
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                        <h5 className="font-semibold mb-2">Quarterly Outlook</h5>
                        <p className="text-3xl font-bold mb-2">{formatLargeCurrency(comprehensiveCostAnalysis.projections.nextQuarterCost)}</p>
                        <p className="text-sm opacity-90">Next 3 months</p>
                        <div className="mt-3 text-xs opacity-75">
                          {formatToTwoDecimals(comprehensiveCostAnalysis.projections.confidenceLevel)}% confidence level
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                        <h5 className="font-semibold mb-2">Trend Summary</h5>
                        <p className="text-2xl font-bold mb-2 capitalize">{comprehensiveCostAnalysis.projections.trendDirection}</p>
                        <p className="text-sm opacity-90">Overall direction</p>
                        <div className="mt-3 text-xs opacity-75">
                          {comprehensiveCostAnalysis.projections.trendDirection === 'increasing' ? '⚠️ Monitor costs closely' :
                           comprehensiveCostAnalysis.projections.trendDirection === 'decreasing' ? '✅ Costs under control' :
                           '📊 Stable spending pattern'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No trend data available</p>
                  <p className="text-sm text-gray-500">Upload cost allocation data to see trend analysis</p>
                </div>
              )}
            </div>
          )}

          {/* Export & Templates Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Export Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Generation */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-200 rounded-lg p-3">
                      <FileSpreadsheet size={24} className="text-blue-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-900">Excel Templates</h3>
                      <p className="text-blue-700 text-sm">Download formatted templates for data entry</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleDownloadTemplate(false)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Download size={16} />
                      Blank Template
                    </button>
                    <button
                      onClick={() => handleDownloadTemplate(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                    >
                      <Download size={16} />
                      Template with Samples
                    </button>
                  </div>
                </div>

                {/* Data Export */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-200 rounded-lg p-3">
                      <Upload size={24} className="text-green-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900">Data Export</h3>
                      <p className="text-green-700 text-sm">Export your current cost allocation data</p>
                    </div>
                  </div>
                  {isDataReady && costAllocation.length > 0 ? (
                    <div className="space-y-3">
                      <button
                        onClick={handleExportData}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <Download size={16} />
                        Export Current Data
                      </button>
                      <button
                        onClick={handleExportSummary}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                      >
                        <BarChart3 size={16} />
                        Export Summary Report
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-2">No cost allocation data available</p>
                      <p className="text-sm text-gray-500 mb-6">Upload your Cost Allocation Excel file to see vessel cost analysis and rig location breakdowns</p>
                      
                      <div className="space-y-3">
                        <button
                          onClick={onNavigateToUpload}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Upload size={20} />
                          Upload Cost Allocation Data
                        </button>
                        
                        <div className="text-center">
                          <button
                            onClick={() => handleDownloadTemplate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors text-sm"
                          >
                            <Download size={16} />
                            Download Template with Sample Data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Statistics */}
              {isDataReady && costAllocation.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Export Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{costAnalysis.totalAllocations}</p>
                      <p className="text-gray-600 font-medium">Total Records</p>
                      <p className="text-xs text-gray-500 mt-1">Cost allocations</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{Object.keys(costAnalysis.projectTypeBreakdown).length}</p>
                      <p className="text-gray-600 font-medium">Project Types</p>
                      <p className="text-xs text-gray-500 mt-1">Drilling, completion, etc.</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-3xl font-bold text-purple-600">{Object.keys(costAnalysis.rigLocationBreakdown).length}</p>
                      <p className="text-gray-600 font-medium">Rig Locations</p>
                      <p className="text-xs text-gray-500 mt-1">Active drilling rigs</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-3xl font-bold text-orange-600">{Object.keys(costAnalysis.monthlyTrends).length}</p>
                      <p className="text-gray-600 font-medium">Time Periods</p>
                      <p className="text-xs text-gray-500 mt-1">Months with data</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Template Guide */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Template Usage Guide</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-semibold mb-3 text-gray-800">Required Columns:</h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <strong>LC Number:</strong> Location code identifier
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <strong>Description:</strong> Project/operation description
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <strong>Total Allocated Days:</strong> Number of days allocated
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <strong>Month-Year:</strong> Allocation time period
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-3 text-gray-800">Optional Columns:</h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <strong>Rig Location:</strong> Specific rig name
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <strong>Rig Type:</strong> Equipment type
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <strong>Water Depth:</strong> Depth in feet
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <strong>Cost Element:</strong> Type of cost/project phase
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                  <h5 className="font-semibold mb-2 text-gray-800">💡 Pro Tips:</h5>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Include keywords like "drill", "completion", "P&A" in descriptions for automatic project type detection</li>
                    <li>• Use consistent rig naming conventions for better location analysis</li>
                    <li>• Provide water depth data for enhanced rig performance insights</li>
                    <li>• Keep LC Numbers consistent with your existing location system</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostAllocationManager; 