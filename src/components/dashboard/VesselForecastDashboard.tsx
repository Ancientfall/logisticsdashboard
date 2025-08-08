import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Ship, 
  AlertTriangle, 
  Download,
  RefreshCw,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Settings,
  BarChart3,
  Table,
  Clock
} from 'lucide-react';
import { loadBothScenarios } from '../../utils/rigScheduleProcessor';
import { 
  generateTabularVesselForecast,
  generateVesselSpottingAnalysis,
  VESSEL_DEMAND_CONSTANTS,
  RIG_ACTIVITY_TYPES
} from '../../utils/realVesselDemandCalculator';
import { 
  TabularVesselForecast,
  RigActivity
} from '../../types/vesselForecast';


// ==================== TYPE DEFINITIONS ====================

interface LocationConfig {
  name: string;
  transitHours: number;
  vesselCapability: number;
  rigDemand: number;
  color: string;
}

interface VesselDemand {
  month: string;
  year: number;
  totalDemand: number;
  vesselCount: number;
  rigActivities: RigActivity[];
  locationBreakdown: Record<string, number>;
}

// Removed unused TabularForecast interface - using TabularVesselForecast from types

// ==================== CONSTANTS & CONFIGURATION ====================

// BP Color Scheme
const BP_COLORS = {
  primary: '#00754F',
  secondary: '#6EC800',
  accent: '#0099D4',
  warning: '#FF6B35',
  error: '#DC2626',
  text: '#374151',
  textLight: '#6B7280'
};

// Updated baseline assumptions using real business logic
const BASELINE_ASSUMPTIONS = {
  // Fleet composition
  drillingFleetSize: VESSEL_DEMAND_CONSTANTS.BASELINE_DRILLING_FLEET, // Base vessels available for drilling support
  productionVessels: 1.75, // 1.25 for Fantasy Island + 0.5 for Thunder Horse
  madDogWarehouse: 1, // Dedicated warehouse vessel for Mad Dog
  chevronOperatorSharing: -0.25, // Reduction due to Chevron operator sharing
  totalFleetSize: 8.5, // Total fleet (6 + 1.75 + 1 - 0.25 = 8.5)
  
  // Operational parameters - using real business constants
  vesselDeliveryCapability: VESSEL_DEMAND_CONSTANTS.BASELINE_VESSEL_CAPABILITY, // deliveries per vessel per month for standard locations
  wellsDeliveryDemand: VESSEL_DEMAND_CONSTANTS.BASELINE_RIG_DEMAND, // total deliveries required by a drilling rig per month
  
  // Location factors - using real multipliers
  paleogeneTransitFactor: 1.25, // 25% increase to vessel demand for transit
  kaskidaTiberFactor: VESSEL_DEMAND_CONSTANTS.BATCH_ULTRA_DEEP_MULTIPLIER, // 3x for batch operations at ultra-deep locations
  multiZoneCompletionFactor: VESSEL_DEMAND_CONSTANTS.BATCH_STANDARD_MULTIPLIER, // 2x for batch operations at standard locations
  lwiDemandFactor: 0.5, // 50% demand of other wells
};

// RIG_ACTIVITY_TYPES now imported from realVesselDemandCalculator.ts

// Location configurations with transit times and capabilities - updated with real business logic
const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  'GOM.Atlantis': { name: 'Atlantis', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#00754F' },
  'GOM.Nakika': { name: 'Nakika', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#6EC800' },
  'GOM.Region': { name: 'Region', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#0099D4' },
  'GOM.GOMX': { name: 'GOMX', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#FF6B35' },
  'GOM.Thunder Horse': { name: 'Thunder Horse', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#8B5CF6' },
  'GOM.Argos': { name: 'Argos', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#EC4899' },
  'GOM.Mad Dog': { name: 'Mad Dog', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#F59E0B' },
  // Ultra-deep locations with reduced vessel capability (4.9 vs 6.5) due to 24hr transit
  'GOM.Paleogene': { name: 'Paleogene', transitHours: 24, vesselCapability: VESSEL_DEMAND_CONSTANTS.ULTRA_DEEP_CAPABILITY, rigDemand: 8.3, color: '#DC2626' },
  'GOM.Kaskida': { name: 'Kaskida', transitHours: 24, vesselCapability: VESSEL_DEMAND_CONSTANTS.ULTRA_DEEP_CAPABILITY, rigDemand: 8.3, color: '#7C3AED' },
  'GOM.Tiber': { name: 'Tiber', transitHours: 24, vesselCapability: VESSEL_DEMAND_CONSTANTS.ULTRA_DEEP_CAPABILITY, rigDemand: 8.3, color: '#991B1B' }
};

// Rig name mappings are now handled in rigScheduleProcessor.ts

const RIG_NAMES = [
  'Deepwater Invictus', 'Deepwater Atlas', 'Ocean Blackhornet', 'Ocean BlackLion',
  'Stena IceMAX', 'Island Venture', 'Mad Dog Drilling', 'Thunderhorse Drilling',
  'Q5000', 'TBD #02', 'TBD #07'
];

// ==================== INTERFACES ====================

interface VesselForecastDashboardProps {
  className?: string;
}

// ==================== MAIN COMPONENT ====================

const VesselForecastDashboard: React.FC<VesselForecastDashboardProps> = () => {
  // ==================== STATE MANAGEMENT ====================
  
  // Core data state
  const [tabularForecast, setTabularForecast] = useState<TabularVesselForecast | null>(null);
  const [rigActivities, setRigActivities] = useState<RigActivity[]>([]);
  const [vesselDemands, setVesselDemands] = useState<VesselDemand[]>([]);
  
  // Loading and UI states
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<'MEAN' | 'EARLY'>('MEAN');
  const [error, setError] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'timeline'>('table');
  const [showSettings, setShowSettings] = useState(false);
  
  // Data filtering
  const [selectedRigs, setSelectedRigs] = useState<string[]>(RIG_NAMES);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(Object.keys(LOCATION_CONFIGS));
  
  // Interactive editing
  const [editingCell, setEditingCell] = useState<{rigName: string, month: string} | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, number>>>({});
  const [editedActivityTypes, setEditedActivityTypes] = useState<Record<string, Record<string, string>>>({});
  const [tempEditValue, setTempEditValue] = useState<string>('');
  const [tempActivityType, setTempActivityType] = useState<string>('');
  
  // Processing status
  const [loadingStep, setLoadingStep] = useState<string>('Initializing...');
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // ==================== UTILITY FUNCTIONS ====================
  
  // Interactive editing functions
  const startEdit = (rigName: string, month: string, currentValue: number, currentActivityType?: string) => {
    setEditingCell({ rigName, month });
    setTempEditValue(currentValue.toString());
    setTempActivityType(currentActivityType || 'DRL'); // Default to DRL if no activity type
  };
  
  const cancelEdit = () => {
    setEditingCell(null);
    setTempEditValue('');
    setTempActivityType('');
  };
  
  const saveEdit = () => {
    if (!editingCell) return;
    
    const newValue = parseFloat(tempEditValue);
    if (isNaN(newValue) || newValue < 0) {
      cancelEdit();
      return;
    }
    
    // Update edited values
    setEditedValues(prev => ({
      ...prev,
      [editingCell.rigName]: {
        ...prev[editingCell.rigName],
        [editingCell.month]: newValue
      }
    }));
    
    // Update edited activity types if provided
    if (tempActivityType) {
      setEditedActivityTypes(prev => ({
        ...prev,
        [editingCell.rigName]: {
          ...prev[editingCell.rigName],
          [editingCell.month]: tempActivityType
        }
      }));
    }
    
    cancelEdit();
  };
  
  const getVesselValue = (rigName: string, month: string): number => {
    // Check for edited value first, then fall back to original
    const editedRigValues = editedValues[rigName];
    if (editedRigValues && editedRigValues[month] !== undefined) {
      return editedRigValues[month];
    }
    
    // Fall back to original tabular forecast data
    const rig = tabularForecast?.rigDemands.find(r => r.rigName === rigName);
    return rig?.monthlyVessels[month] || 0;
  };
  
  const getActivityType = (rigName: string, month: string): string => {
    // Check for edited activity type first, then fall back to original
    const editedRigActivityTypes = editedActivityTypes[rigName];
    if (editedRigActivityTypes && editedRigActivityTypes[month]) {
      return editedRigActivityTypes[month];
    }
    
    // Fall back to original tabular forecast data
    const rig = tabularForecast?.rigDemands.find(r => r.rigName === rigName);
    return rig?.primaryActivityTypes?.[month] || '';
  };
  
  const resetEdits = () => {
    setEditedValues({});
    setEditedActivityTypes({});
    setEditingCell(null);
  };
  
  // ==================== DATA LOADING FUNCTIONS ====================
  
  const loadVesselForecast = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load from VPS server
      setLoadingStep('Loading rig schedule data from VPS server...');
      setProcessingProgress(10);
      
      console.log('🔍 Loading both scenarios from VPS for tabular analysis...');
      const scenarios = await loadBothScenarios();
      console.log('✅ Scenarios loaded successfully from VPS server');
      
      const selectedActivities = selectedScenario === 'MEAN' 
        ? scenarios.meanCase.activities 
        : scenarios.earlyCase.activities;
      
      setLoadingStep('Generating forecast months...');
      setProcessingProgress(25);
      
      // Filter based on selected rigs and locations
      console.log(`🔍 Selected rigs:`, selectedRigs);
      console.log(`🔍 Selected locations:`, selectedLocations);
      
      // Debug specific mapped rig activities before filtering
      const mappedRigNames = ['GOM.TBD #02', 'GOM.TBD #07', 'GOM.PDQ', 'GOM.Atlas', 'GOM.LWI.ISLVEN', 'TBD #02', 'TBD #07', 'Thunderhorse Drilling', 'Deepwater Atlas', 'Island Venture']; // Check both original and mapped names
      const mappedRigsBeforeFilter = selectedActivities.filter(a => mappedRigNames.includes(a.rigName));
      console.log(`🔍 Mapped rig activities (TBD #02, #07, PDQ, Atlas, ISLVEN) before filtering: ${mappedRigsBeforeFilter.length}`);
      mappedRigsBeforeFilter.forEach(activity => {
        // Show the rig name mapping
        let rigNameForComparison = activity.rigName;
        if (activity.rigName === 'GOM.TBD #02') rigNameForComparison = 'TBD #02';
        if (activity.rigName === 'GOM.TBD #07') rigNameForComparison = 'TBD #07';
        if (activity.rigName === 'GOM.PDQ') rigNameForComparison = 'Thunderhorse Drilling';
        if (activity.rigName === 'GOM.Atlas') rigNameForComparison = 'Deepwater Atlas';
        if (activity.rigName === 'GOM.LWI.ISLVEN') rigNameForComparison = 'Island Venture';
        
        console.log(`  - ${activity.rigName} → ${rigNameForComparison} at ${activity.asset} (${activity.activityName})`);
        console.log(`    Rig selected: ${selectedRigs.includes(rigNameForComparison)}, Location selected: ${selectedLocations.includes(activity.asset)}`);
        
        // Special debugging for Atlas activities
        if (activity.rigName === 'GOM.Atlas') {
          console.log(`    🔍 ATLAS DEBUG: Checking if "Deepwater Atlas" is in selected rigs:`, selectedRigs);
          console.log(`    🔍 ATLAS DEBUG: Asset "${activity.asset}" in selected locations:`, selectedLocations.includes(activity.asset));
        }
      });
      
      // Filter with proper rig name mapping for all mapped rigs
      const filteredActivities = selectedActivities.filter(a => {
        // Map GOM rig names to standard rig names for comparison
        let rigNameForComparison = a.rigName;
        if (a.rigName === 'GOM.TBD #02') rigNameForComparison = 'TBD #02';
        if (a.rigName === 'GOM.TBD #07') rigNameForComparison = 'TBD #07';
        if (a.rigName === 'GOM.PDQ') rigNameForComparison = 'Thunderhorse Drilling';
        if (a.rigName === 'GOM.Atlas') rigNameForComparison = 'Deepwater Atlas';
        if (a.rigName === 'GOM.LWI.ISLVEN') rigNameForComparison = 'Island Venture';
        
        const rigSelected = selectedRigs.includes(rigNameForComparison);
        const locationSelected = selectedLocations.includes(a.asset);
        
        return rigSelected && locationSelected;
      });
      
      // Debug mapped rig activities after filtering
      const mappedRigsAfterFilter = filteredActivities.filter(a => mappedRigNames.includes(a.rigName));
      console.log(`🔍 Mapped rig activities after filtering: ${mappedRigsAfterFilter.length}`);
      
      setLoadingStep('Processing selected scenario...');
      setProcessingProgress(50);
      
      // Generate extended forecast horizon to include Atlas activities (2028-2030)
      const months: string[] = [];
      const startDate = new Date(2026, 0, 1);
      for (let i = 0; i < 48; i++) { // Extended from 17 to 48 months to cover 2026-2030
        const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const monthStr = `${month.toLocaleDateString('en-US', { month: 'short' })}-${String(month.getFullYear()).slice(-2)}`;
        months.push(monthStr);
      }
      
      console.log(`🔍 Calculating forecast for ${selectedScenario} case with ${filteredActivities.length} activities`);
      
      setLoadingStep('Applying real business logic for vessel demand...');
      setProcessingProgress(70);
      
      // Use real vessel demand calculator with business logic
      const forecast = generateTabularVesselForecast(filteredActivities, months);
      const vesselSpottingAnalysis = generateVesselSpottingAnalysis(filteredActivities);
      
      console.log('🔍 Vessel Spotting Analysis:', vesselSpottingAnalysis);
      console.log('🔍 Monthly Demands:', vesselSpottingAnalysis.monthlyDemands);
      
      const demands = vesselSpottingAnalysis.monthlyDemands.map(md => ({
        month: md.month,
        year: md.year,
        totalDemand: md.totalDemand,
        vesselCount: md.totalVesselsRequired,
        rigActivities: filteredActivities.filter(a => {
          // Check if activity spans this month
          const activityStartMonth = new Date(a.startDate.getFullYear(), a.startDate.getMonth(), 1);
          const activityEndMonth = new Date(a.endDate.getFullYear(), a.endDate.getMonth(), 1);
          const [monthStr, yearStr] = md.month.split('-');
          const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthStr);
          const currentMonth = new Date(2000 + parseInt(yearStr), monthIndex, 1);
          return currentMonth >= activityStartMonth && currentMonth <= activityEndMonth;
        }),
        locationBreakdown: md.rigDemands.reduce((acc, rd) => {
          acc[rd.asset] = (acc[rd.asset] || 0) + rd.vesselsRequired;
          return acc;
        }, {} as Record<string, number>)
      }));
      
      setLoadingStep('Finalizing real data analysis...');
      setProcessingProgress(90);
      
      console.log('🔍 Setting vessel demands:', demands);
      console.log('🔍 Demands array length:', demands.length);
      
      setRigActivities(filteredActivities);
      setVesselDemands(demands);
      setTabularForecast(forecast);
      
      console.log('✅ Real vessel forecast dashboard ready with business logic');
      console.log(`🔧 Generated demand for ${forecast.rigDemands.length} rigs`);
      console.log(`📅 Forecast horizon: ${months.length} months`);
      console.log(`🚢 Peak vessels needed: ${vesselSpottingAnalysis.peakVesselsNeeded} in ${vesselSpottingAnalysis.peakDemandMonth}`);
      console.log(`📈 Average additional vessels: ${vesselSpottingAnalysis.averageAdditionalVessels.toFixed(1)}`);
      
      setProcessingProgress(100);
      
    } catch (error) {
      console.error('❌ Error in vessel forecast:', error);
      setError(error instanceof Error ? error.message : 'Failed to load forecast data');
    } finally {
      setIsLoading(false);
      setProcessingProgress(0);
    }
  }, [selectedScenario, selectedRigs, selectedLocations]);

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    loadVesselForecast();
  }, [loadVesselForecast]);

  // ==================== UI HANDLERS ====================
  
  const handleScenarioToggle = (scenario: 'MEAN' | 'EARLY') => {
    setSelectedScenario(scenario);
  };

  const handlePresentationModeToggle = () => {
    setPresentationMode(!presentationMode);
  };

  const handleExportSummary = () => {
    if (!tabularForecast) return;
    
    const exportData = {
      tabularForecast,
      vesselDemands,
      rigActivities,
      scenario: selectedScenario,
      dataSource: 'vps',
      exportedAt: new Date().toISOString(),
      exportedBy: 'BP Logistics Dashboard'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vessel-forecast-vps-${selectedScenario.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };


  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!vesselDemands.length && !tabularForecast) return null;
    
    if (tabularForecast) {
      const monthlyVessels = Object.values(tabularForecast.totals.totalDemand);
      const avgDemand = monthlyVessels.reduce((sum, v) => sum + v, 0) / monthlyVessels.length;
      const avgVessels = avgDemand / BASELINE_ASSUMPTIONS.vesselDeliveryCapability;
      const additionalVessels = Object.values(tabularForecast.totals.externallySourced);
      const avgAdditional = additionalVessels.reduce((sum, v) => sum + v, 0) / additionalVessels.length;
      const peakAdditional = Math.max(...additionalVessels);
      const peakMonth = tabularForecast.monthlyColumns[additionalVessels.indexOf(peakAdditional)];
      
      return {
        totalDemand: avgDemand.toFixed(1),
        avgVessels: avgVessels.toFixed(1),
        avgAdditional: avgAdditional.toFixed(1),
        peakAdditional: peakAdditional.toFixed(1),
        peakMonth: peakMonth || 'N/A',
        drillingFleet: BASELINE_ASSUMPTIONS.drillingFleetSize,
        totalFleet: BASELINE_ASSUMPTIONS.totalFleetSize
      };
    }
    
    const totalDemand = vesselDemands.reduce((sum, d) => sum + d.totalDemand, 0);
    const avgVessels = vesselDemands.reduce((sum, d) => sum + d.vesselCount, 0) / vesselDemands.length;
    const avgAdditional = Math.max(0, avgVessels - BASELINE_ASSUMPTIONS.drillingFleetSize);
    const peakVessels = Math.max(...vesselDemands.map(d => d.vesselCount));
    const peakAdditional = Math.max(0, peakVessels - BASELINE_ASSUMPTIONS.drillingFleetSize);
    const peakMonth = vesselDemands.find(d => d.vesselCount === peakVessels)?.month || 'N/A';
    
    return {
      totalDemand: totalDemand.toFixed(1),
      avgVessels: avgVessels.toFixed(1),
      avgAdditional: avgAdditional.toFixed(1),
      peakAdditional: peakAdditional.toFixed(1),
      peakMonth,
      drillingFleet: BASELINE_ASSUMPTIONS.drillingFleetSize,
      totalFleet: BASELINE_ASSUMPTIONS.totalFleetSize
    };
  }, [vesselDemands, tabularForecast]);

  // ==================== RENDER CONDITIONS ====================
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <RefreshCw className="w-5 h-5 animate-spin text-[#00754F]" />
            <span className="text-gray-600 font-medium">{loadingStep}</span>
          </div>
          
          {processingProgress > 0 && (
            <div className="max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-[#00754F] h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <div className="text-center text-sm text-gray-500">
                Processing vessel forecast analysis ({processingProgress}%)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => loadVesselForecast()}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#00754F] text-white rounded-lg hover:bg-[#00754F]/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!tabularForecast && !vesselDemands.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center text-gray-600">
            <Ship className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="mb-4">Vessel forecast analysis not available</p>
            <button
              onClick={() => loadVesselForecast()}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#00754F] text-white rounded-lg hover:bg-[#00754F]/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN DASHBOARD UI ====================
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Ship className="w-8 h-8 text-[#00754F]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Vessel Forecast Dashboard
                  {presentationMode && <span className="text-sm font-normal text-gray-500 ml-2">(Presentation Mode)</span>}
                </h1>
                <p className="text-sm text-gray-600">BP Logistics - Offshore Location-Based Vessel Requirements</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePresentationModeToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  presentationMode 
                    ? 'bg-[#00754F] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                {presentationMode ? 'Exit' : 'Present'}
              </button>
              
              <button 
                onClick={handleExportSummary}
                className="flex items-center gap-2 px-4 py-2 bg-[#6EC800] text-white rounded-lg hover:bg-[#6EC800]/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Control Panel */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Scenario:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => handleScenarioToggle('MEAN')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedScenario === 'MEAN'
                        ? 'bg-[#00754F] text-white shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    MEAN Case (P50)
                  </button>
                  <button
                    onClick={() => handleScenarioToggle('EARLY')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedScenario === 'EARLY'
                        ? 'bg-[#00754F] text-white shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    EARLY Case (P10)
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Table className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'chart'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'timeline'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {tabularForecast ? `${tabularForecast.monthlyColumns.length} months` : '18 months'} forecast horizon
                </span>
              </div>
            </div>
            
            <button
              onClick={() => loadVesselForecast()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#00754F] text-white rounded-lg hover:bg-[#00754F]/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Active Rigs</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {RIG_NAMES.map(rig => (
                    <label key={rig} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedRigs.includes(rig)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRigs([...selectedRigs, rig]);
                          } else {
                            setSelectedRigs(selectedRigs.filter(r => r !== rig));
                          }
                        }}
                        className="rounded text-[#00754F]"
                      />
                      {rig}
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Locations</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(LOCATION_CONFIGS).map(([key, config]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations([...selectedLocations, key]);
                          } else {
                            setSelectedLocations(selectedLocations.filter(l => l !== key));
                          }
                        }}
                        className="rounded text-[#00754F]"
                      />
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" style={{ color: config.color }} />
                        <span>{config.name}</span>
                        <span className="text-xs text-gray-500">
                          ({config.transitHours}h, {config.vesselCapability}/mo)
                        </span>
                        {config.vesselCapability < 6.0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Ultra-deep
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary Statistics */}
      {summaryStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Fleet Size</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryStats.totalFleet}</p>
                  <p className="text-xs text-gray-500">total vessels</p>
                </div>
                <Ship className="w-8 h-8" style={{ color: BP_COLORS.accent }} />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available for Drilling</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryStats.drillingFleet}</p>
                  <p className="text-xs text-gray-500">vessels × 6.5 del/mo</p>
                </div>
                <Ship className="w-8 h-8 text-[#00754F]" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Total Needed</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryStats.avgVessels}</p>
                  <p className="text-xs text-gray-500">vessels per month</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#6EC800]" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Additional</p>
                  <p className="text-2xl font-bold text-green-700">+{summaryStats.avgAdditional}</p>
                  <p className="text-xs text-gray-500">beyond 6 drilling vessels</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Peak Additional</p>
                  <p className="text-2xl font-bold text-red-700">+{summaryStats.peakAdditional}</p>
                  <p className="text-xs text-gray-500">{summaryStats.peakMonth}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
          
          {/* Assumptions Section */}
          <div className="mt-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00754F]" />
                  Vessel Forecast Assumptions (VPS Server Data)
                </h3>
                <button
                  onClick={() => setShowAssumptions(!showAssumptions)}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                >
                  {showAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showAssumptions ? 'Hide' : 'Show'} Assumptions
                </button>
              </div>
              
              {showAssumptions && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-center">
                      <div className="text-xs text-red-700 font-medium">Aug 2026 Updated</div>
                      <div className="text-sm text-red-900 font-semibold">Last Updated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-900">{BASELINE_ASSUMPTIONS.vesselDeliveryCapability}</div>
                      <div className="text-xs text-red-700">deliveries per month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-900">{BASELINE_ASSUMPTIONS.wellsDeliveryDemand}</div>
                      <div className="text-xs text-red-700">deliveries per month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-900">{((BASELINE_ASSUMPTIONS.paleogeneTransitFactor - 1) * 100)}%</div>
                      <div className="text-xs text-red-700">transit component increase</div>
                    </div>
                  </div>
                  
                  {/* Fleet Composition Display */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Fleet Composition Breakdown</h4>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div className="bg-white p-3 rounded border border-blue-300">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Drilling Support</span>
                          <span className="font-bold text-blue-900">6</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Available for rig operations</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-300">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Production Support</span>
                          <span className="font-bold text-blue-900">+1.75</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">1.25 Fantasy Island + 0.5 TH</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-300">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">MD Warehouse</span>
                          <span className="font-bold text-blue-900">+1</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Dedicated warehouse vessel</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-orange-300 bg-orange-50">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Chevron Sharing</span>
                          <span className="font-bold text-orange-900">-0.25</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Operator sharing reduction</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-sm text-blue-900">
                        Total: 6 + 1.75 + 1 - 0.25 = <span className="font-bold text-lg">8.5 vessels</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {viewMode === 'table' && tabularForecast && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Ship className="w-5 h-5 text-[#00754F]" />
                  Offshore Location Vessel Requirements - {selectedScenario} Case
                </h2>
                
                {/* Interactive editing toolbar */}
                <div className="flex items-center gap-2">
                  {(Object.keys(editedValues).length > 0 || Object.keys(editedActivityTypes).length > 0) && (
                    <>
                      <span className="text-sm text-blue-600 font-medium">
                        {Object.values(editedValues).reduce((count, rigEdits) => count + Object.keys(rigEdits).length, 0) + 
                         Object.values(editedActivityTypes).reduce((count, rigEdits) => count + Object.keys(rigEdits).length, 0)} edits made
                      </span>
                      <button
                        onClick={resetEdits}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset All
                      </button>
                    </>
                  )}
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Click any cell to edit
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200">
                      Offshore Location
                    </th>
                    {tabularForecast.monthlyColumns.map((month) => (
                      <th key={month} className="px-3 py-3 text-center font-semibold text-gray-900 border-r border-gray-200 min-w-[80px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tabularForecast.rigDemands.map((rig, index) => (
                    <tr key={rig.rigName} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                      <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200">
                        {rig.rigDisplayName}
                      </td>
                      {tabularForecast.monthlyColumns.map((month) => {
                        const vesselDemand = getVesselValue(rig.rigName, month);
                        const activityType = getActivityType(rig.rigName, month);
                        const isEdited = editedValues[rig.rigName]?.[month] !== undefined;
                        const isActivityEdited = editedActivityTypes[rig.rigName]?.[month] !== undefined;
                        const isBatch = rig.batchOperations[month] || false;
                        const calculationBreakdown = rig.calculationBreakdown?.[month];
                        
                        // Get activity type configuration for coloring - use different colors for batch operations
                        const activityConfig = activityType ? RIG_ACTIVITY_TYPES[activityType as keyof typeof RIG_ACTIVITY_TYPES] : null;
                        
                        // Use different colors for batch operations
                        let activityColor = activityConfig?.color || 'bg-gray-100 text-gray-800';
                        let borderColor = activityConfig?.borderColor || 'border-l-gray-500';
                        
                        if (isBatch && activityType === 'DRL') {
                          // Use purple for batch drilling (DRL B) to distinguish from regular DRL green
                          activityColor = 'bg-purple-100 text-purple-800' as any;
                          borderColor = 'border-l-purple-500' as any;
                        }
                        // Note: Other batch operations (CPL B, etc.) use their regular colors since they don't get demand multiplication
                        
                        // Determine left border color based on activity type using imported config
                        const getBorderColor = (type: string) => {
                          return borderColor; // Use the batch-adjusted border color
                        };
                        
                        // Determine cell styling based on activity type and demand
                        const batchOutline = isBatch ? 'ring-2 ring-red-500 ring-inset' : '';
                        const editedOutline = isEdited ? 'ring-2 ring-blue-500 ring-inset' : '';
                        const cellStyling = vesselDemand > 0 
                          ? `${activityColor} font-semibold border-l-4 ${getBorderColor(activityType)} ${batchOutline} ${editedOutline}`
                          : 'text-gray-400 bg-white';
                        
                        const isEditing = editingCell?.rigName === rig.rigName && editingCell?.month === month;
                        
                        return (
                          <td 
                            key={month} 
                            className={`px-3 py-3 text-center border-r border-gray-200 ${cellStyling} relative group cursor-pointer`}
                            title={vesselDemand > 0 ? (isEdited ? 'Edited value - Click to change' : calculationBreakdown?.formula || 'Click to edit') : 'Click to add vessel demand'}
                            onClick={() => !isEditing && startEdit(rig.rigName, month, vesselDemand, activityType)}
                          >
                            {isEditing ? (
                              <div className="flex flex-col items-center bg-white p-2 rounded shadow-lg border-2 border-blue-500">
                                <input
                                  type="number"
                                  value={tempEditValue}
                                  onChange={(e) => setTempEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="w-16 text-center font-bold border rounded px-1 py-0.5 text-sm mb-2"
                                  min="0"
                                  step="0.1"
                                  autoFocus
                                  placeholder="0.00"
                                />
                                <select
                                  value={tempActivityType}
                                  onChange={(e) => setTempActivityType(e.target.value)}
                                  className="text-xs border rounded px-1 py-0.5 mb-2 w-full"
                                >
                                  <option value="">Select Activity</option>
                                  {Object.entries(RIG_ACTIVITY_TYPES).map(([code, config]) => (
                                    <option key={code} value={code}>
                                      {code} - {config.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex gap-1">
                                  <button
                                    onClick={saveEdit}
                                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : vesselDemand > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className={`font-bold ${isEdited ? 'text-blue-800' : ''}`}>
                                  {vesselDemand.toFixed(2)}
                                  {isEdited && <span className="text-blue-500 ml-1">*</span>}
                                </span>
                                <span className={`text-xs font-medium ${isActivityEdited ? 'text-blue-700' : ''}`}>
                                  {activityType}{isBatch ? ' B' : ''}
                                  {isActivityEdited && <span className="text-blue-500 ml-1">*</span>}
                                </span>
                              </div>
                            ) : (
                              <span className="text-transparent">-</span>
                            )}
                            
                            {/* Tooltip for calculation transparency */}
                            {vesselDemand > 0 && calculationBreakdown && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                                <div className="font-semibold">{activityType}: {activityConfig?.name}</div>
                                <div>{calculationBreakdown.formula}</div>
                                <div className="text-gray-300">
                                  {calculationBreakdown.isUltraDeep ? 'Ultra-deep location' : 'Standard location'}
                                </div>
                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Totals Section */}
                  <tr className="bg-blue-100 font-semibold">
                    <td className="px-4 py-3 text-gray-900 border-r border-gray-200">
                      Internal Fleet Total
                    </td>
                    {tabularForecast.monthlyColumns.map((month) => (
                      <td key={month} className="px-3 py-3 text-center border-r border-gray-200 text-blue-900">
                        {(tabularForecast.totals.internalFleet[month] || 0).toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-orange-100 font-semibold">
                    <td className="px-4 py-3 text-gray-900 border-r border-gray-200">
                      Externally Sourced
                    </td>
                    {tabularForecast.monthlyColumns.map((month) => (
                      <td key={month} className="px-3 py-3 text-center border-r border-gray-200 text-orange-900">
                        {(tabularForecast.totals.externallySourced[month] || 0).toFixed(1)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {viewMode === 'chart' && tabularForecast && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#00754F]" />
              Vessel Demand Trend - {selectedScenario} Case
            </h2>
            
            
            <div className="h-64 flex items-end justify-between gap-2">
              {tabularForecast.monthlyColumns.length > 0 ? tabularForecast.monthlyColumns.map((month, index) => {
                // Sum all rig demands for this month (using edited values if available)
                const totalVesselsNeeded = tabularForecast.rigDemands.reduce((sum, rig) => {
                  return sum + getVesselValue(rig.rigName, month);
                }, 0);
                
                // Find max for height calculation across all months (using edited values)
                const allMonthlyTotals = tabularForecast.monthlyColumns.map(m => {
                  return tabularForecast.rigDemands.reduce((sum, rig) => sum + getVesselValue(rig.rigName, m), 0);
                });
                const maxVessels = Math.max(...allMonthlyTotals, 0.1); // Ensure we don't divide by 0
                const height = (totalVesselsNeeded / maxVessels) * 100;
                
                // Calculate internal vs external (assume 8.5 internal fleet capacity)
                const internalUsed = Math.min(totalVesselsNeeded, 8.5);
                const externalNeeded = Math.max(0, totalVesselsNeeded - 8.5);
                
                return (
                  <div key={month} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#00754F] rounded-t hover:bg-[#00754F]/80 transition-colors relative group"
                         style={{ height: `${Math.max(height, 2)}%` }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        <div className="font-semibold">{totalVesselsNeeded.toFixed(1)} vessels</div>
                        <div className="text-xs text-gray-300">{internalUsed.toFixed(1)} internal + {externalNeeded.toFixed(1)} external</div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 mt-2 rotate-45 origin-left">{month.slice(0, 3)}</span>
                  </div>
                );
              }) : (
                <div className="w-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Ship className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No monthly columns found</p>
                    <p className="text-xs mt-1">Check Excel data loading</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly Vessel Requirements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="text-sm font-medium text-green-800">Internal Fleet</h4>
                  <p className="text-xs text-green-700">Up to 8.5 vessels from our fleet</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <h4 className="text-sm font-medium text-orange-800">External Sourcing</h4>
                  <p className="text-xs text-orange-700">Additional vessels needed beyond our fleet</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00754F]" />
              Rig Activity Timeline - {selectedScenario} Case
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {RIG_NAMES.map(rigName => {
                const rigActivitiesFiltered = rigActivities.filter(a => a.rigName === rigName);
                
                return (
                  <div key={rigName} className="border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{rigName}</span>
                    </div>
                    
                    <div className="ml-6 flex gap-1 flex-wrap">
                      {rigActivitiesFiltered.length > 0 ? (
                        rigActivitiesFiltered.map((activity, index) => {
                          const activityConfig = RIG_ACTIVITY_TYPES[activity.activityType];
                          const locationConfig = LOCATION_CONFIGS[activity.asset];
                          
                          return (
                            <div key={index} className={`px-2 py-1 rounded text-xs ${activityConfig?.color || 'bg-gray-100 text-gray-800'}`}>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{activity.activityType}</span>
                                <span>•</span>
                                <MapPin className="w-3 h-3" style={{ color: locationConfig?.color }} />
                                <span>{locationConfig?.name}</span>
                                <span>•</span>
                                <span>{activity.durationDays}d</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-400">No activities scheduled</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Data Foundation */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00754F]" />
            Data Foundation & Quality (VPS Server Source)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Data Sources</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#00754F] font-bold">•</span>
                  Excel Rig Schedule Data 2(MEAN CASE).csv
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00754F] font-bold">•</span>
                  Excel Rig Schedule Data 2(EARLY CASE).csv
                </li>
                <li className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200">
                  <span className="text-[#6EC800] font-bold">•</span>
                  <span className="text-xs text-gray-500">Loaded from VPS Server API</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Processing Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Activities Analyzed:</span>
                  <span className="font-semibold">{rigActivities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rigs Analyzed:</span>
                  <span className="font-semibold">{tabularForecast?.rigDemands.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Source:</span>
                  <span className="font-semibold text-green-600">VPS SERVER</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Key Baselines</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vessel Capability:</span>
                  <span className="font-semibold">{BASELINE_ASSUMPTIONS.vesselDeliveryCapability}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Generated:</span>
                  <span className="font-semibold text-xs">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity Type Legend */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Activity Type Legend
            <span className="text-xs text-gray-500 ml-2">(Table cells use these colors with left border indicators)</span>
          </h3>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {Object.entries(RIG_ACTIVITY_TYPES).map(([key, config]) => {
              return (
                <div key={key} className={`px-3 py-2 rounded text-xs font-medium ${config.color} flex items-center justify-between border-l-4 ${config.borderColor}`}>
                  <span>{key}</span>
                  <span className="opacity-75">×{config.demandMultiplier}</span>
                </div>
              );
            })}
            
            {/* Add special batch operation legend - only DRL B gets multiplication */}
            <div className="px-3 py-2 rounded text-xs font-medium bg-purple-100 text-purple-800 flex items-center justify-between border-l-4 border-l-purple-500 ring-2 ring-red-500 ring-inset">
              <span>DRL B</span>
              <span className="opacity-75">×1.5-3</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• <strong>Table Format:</strong> "1.3 DRL" = 1.3 vessels required for Drilling activity</div>
            <div>• <strong>DRL B (Batch Drilling):</strong> Only batch drilling gets demand multiplication (1.5x standard, 3x ultra-deep)</div>
            <div>• <strong>Red Outline:</strong> Batch operation cells outlined in red for visual distinction</div>
            <div>• <strong>Ultra-deep Locations:</strong> Tiber, Kaskida, Paleogene (4.9 del/mo vs 6.5 del/mo standard)</div>
            <div>• <strong>Internal Fleet:</strong> 8.5 vessels total (6 drilling + 1.75 production + 1 warehouse)</div>
            <div>• <strong>Hover cells</strong> for calculation breakdown and formula transparency</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VesselForecastDashboard;