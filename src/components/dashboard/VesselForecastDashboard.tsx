import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Clock,
  Printer
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  
  // Tooltip state
  const [hoveredPoint, setHoveredPoint] = useState<{index: number, data: any} | null>(null);
  
  // Ref for PDF capture
  const tableRef = useRef<HTMLDivElement>(null);

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
      
      // Generate forecast horizon starting from current month
      const months: string[] = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start of current month
      
      // Generate 60 months from current month forward (5 years of forecast)
      for (let i = 0; i < 60; i++) {
        const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const monthStr = `${month.toLocaleDateString('en-US', { month: 'short' })}-${String(month.getFullYear()).slice(-2)}`;
        months.push(monthStr);
      }
      
      console.log(`🔍 Calculating forecast for ${selectedScenario} case with ${filteredActivities.length} activities`);
      console.log(`📅 Forecast period: ${months[0]} to ${months[months.length - 1]} (${months.length} months)`);
      
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

  const handlePrintToPDF = async () => {
    if (!tableRef.current) return;
    
    try {
      // Show loading state
      setLoadingStep('Generating PDF...');
      
      // Create canvas from the table
      const canvas = await html2canvas(tableRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      } as any);
      
      // Create PDF in landscape format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions for landscape A4 (297mm x 210mm)
      const pdfWidth = 297;
      const pdfHeight = 210;
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      // Calculate image dimensions maintaining aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      let finalWidth = availableWidth;
      let finalHeight = availableWidth / ratio;
      
      // If height is too large, scale by height instead
      if (finalHeight > availableHeight) {
        finalHeight = availableHeight;
        finalWidth = availableHeight * ratio;
      }
      
      // Center the image
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;
      
      // Add title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 117, 79); // BP green
      pdf.text('BP Offshore Location Vessel Requirements', margin, margin + 5);
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`${selectedScenario} Case - Generated ${new Date().toLocaleDateString()}`, margin, margin + 12);
      
      // Add the table image
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', xOffset, yOffset + 15, finalWidth, finalHeight - 15);
      
      // Save the PDF
      const filename = `BP_Vessel_Requirements_${selectedScenario}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
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
  
  // Enhanced Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm p-10 rounded-2xl shadow-2xl max-w-lg w-full border border-white/20">
          {/* Loading Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-[#00754F] to-[#6EC800] p-4 rounded-2xl inline-block mb-4">
              <Ship className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Vessel Forecast</h2>
            <p className="text-gray-600">Analyzing offshore operations data</p>
          </div>
          
          {/* Loading Animation */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-[#00754F] rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-[#00754F] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-[#00754F] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-gray-700 font-semibold">{loadingStep}</span>
          </div>
          
          {/* Enhanced Progress Bar */}
          {processingProgress > 0 && (
            <div className="space-y-4">
              <div className="relative">
                <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-[#00754F] via-[#4B8B5C] to-[#6EC800] h-4 rounded-full transition-all duration-1000 relative shadow-lg" 
                    style={{ width: `${processingProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="absolute -top-8 right-0">
                  <div className="bg-[#00754F] text-white text-xs px-2 py-1 rounded font-bold">
                    {processingProgress}%
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Processing vessel forecast analysis
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing VPS server data...</span>
                </div>
              </div>
              
              {/* Process Steps Indicator */}
              <div className="grid grid-cols-4 gap-2 mt-6">
                <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
                  processingProgress >= 25 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-3 h-3 rounded-full mb-1 ${
                    processingProgress >= 25 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-xs font-medium">Load Data</span>
                </div>
                <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
                  processingProgress >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-3 h-3 rounded-full mb-1 ${
                    processingProgress >= 50 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-xs font-medium">Process</span>
                </div>
                <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
                  processingProgress >= 75 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-3 h-3 rounded-full mb-1 ${
                    processingProgress >= 75 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-xs font-medium">Calculate</span>
                </div>
                <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 ${
                  processingProgress >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-3 h-3 rounded-full mb-1 ${
                    processingProgress >= 100 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-xs font-medium">Complete</span>
                </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/20">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-[#00754F] via-[#00754F] to-[#6EC800] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <Ship className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-md">
                  Vessel Forecast Dashboard
                </h1>
                <p className="text-[#E8F5E8] font-medium">
                  BP Logistics - Offshore Location-Based Vessel Requirements
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white font-medium">
                    Real-time Analytics
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white font-medium">
                    VPS Server Data
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrintToPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Printer className="w-4 h-4" />
                <span className="font-medium">Print PDF</span>
              </button>
              
              <button 
                onClick={handleExportSummary}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span className="font-medium">Export</span>
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 border shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  showSettings 
                    ? 'bg-white text-[#00754F] border-white/20' 
                    : 'bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20'
                }`}
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
                <span className="font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Enhanced Control Panel */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-[#00754F] to-[#6EC800] text-white px-2 py-1 rounded-lg text-xs font-bold">
                  SCENARIO
                </div>
                <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1.5 shadow-inner">
                  <button
                    onClick={() => handleScenarioToggle('MEAN')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      selectedScenario === 'MEAN'
                        ? 'bg-gradient-to-r from-[#00754F] to-[#4B8B5C] text-white shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedScenario === 'MEAN' ? 'bg-white' : 'bg-gray-400'}`}></div>
                      MEAN Case (P50)
                    </div>
                  </button>
                  <button
                    onClick={() => handleScenarioToggle('EARLY')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      selectedScenario === 'EARLY'
                        ? 'bg-gradient-to-r from-[#00754F] to-[#4B8B5C] text-white shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedScenario === 'EARLY' ? 'bg-white' : 'bg-gray-400'}`}></div>
                      EARLY Case (P10)
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-[#0099D4] to-[#6EC800] text-white px-2 py-1 rounded-lg text-xs font-bold">
                  VIEW
                </div>
                <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1.5 shadow-inner">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                      viewMode === 'table'
                        ? 'bg-white text-[#00754F] shadow-md transform scale-105 ring-2 ring-[#00754F]/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <Table className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                      viewMode === 'chart'
                        ? 'bg-white text-[#00754F] shadow-md transform scale-105 ring-2 ring-[#00754F]/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                      viewMode === 'timeline'
                        ? 'bg-white text-[#00754F] shadow-md transform scale-105 ring-2 ring-[#00754F]/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {tabularForecast ? `${tabularForecast.monthlyColumns.length}` : '60'} months forecast
                </span>
              </div>
            </div>
            
            <button
              onClick={() => loadVesselForecast()}
              disabled={isLoading}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#00754F] to-[#4B8B5C] text-white rounded-xl hover:from-[#4B8B5C] hover:to-[#00754F] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="font-semibold">Refresh Data</span>
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
      
      {/* Enhanced Summary Statistics */}
      {summaryStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Net Fleet</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{summaryStats.totalFleet}</p>
                  <p className="text-xs text-blue-600 font-medium">total vessels</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Ship className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl shadow-lg border border-emerald-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                    <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Drilling Fleet</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{summaryStats.drillingFleet}</p>
                  <p className="text-xs text-emerald-600 font-medium">@ 6.5 del/mo each</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-xl">
                  <Ship className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-emerald-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full" style={{ width: `${(Number(summaryStats.drillingFleet) / Number(summaryStats.totalFleet)) * 100}%` }}></div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-2xl shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Avg Demand</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{summaryStats.avgVessels}</p>
                  <p className="text-xs text-green-600 font-medium">vessels per month</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-green-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: `${Math.min((Number(summaryStats.avgVessels) / 15) * 100, 100)}%` }}></div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-amber-50 p-6 rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                    <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Avg External</p>
                  </div>
                  <p className="text-3xl font-bold text-amber-800 mb-1">+{summaryStats.avgAdditional}</p>
                  <p className="text-xs text-amber-600 font-medium">beyond drilling fleet</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-amber-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full" style={{ width: `${Math.min((Number(summaryStats.avgAdditional) / 10) * 100, 100)}%` }}></div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-red-50 p-6 rounded-2xl shadow-lg border border-red-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105 ring-2 ring-red-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                    <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Peak Risk</p>
                  </div>
                  <p className="text-3xl font-bold text-red-800 mb-1">+{summaryStats.peakAdditional}</p>
                  <p className="text-xs text-red-600 font-medium">{summaryStats.peakMonth}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-red-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full animate-pulse" style={{ width: `${Math.min((Number(summaryStats.peakAdditional) / 10) * 100, 100)}%` }}></div>
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
          <div ref={tableRef} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-r from-[#00754F]/5 to-[#6EC800]/5 p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-gradient-to-r from-[#00754F] to-[#6EC800] p-2 rounded-xl">
                    <Ship className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div>Offshore Location Vessel Requirements</div>
                    <div className="text-sm font-medium text-[#00754F] mt-1">{selectedScenario} Case Scenario</div>
                  </div>
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
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-gradient-to-r from-[#0099D4] to-[#6EC800] p-2 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div>Vessel Demand Trend Analysis</div>
                  <div className="text-sm font-medium text-[#0099D4] mt-1">{selectedScenario} Case Scenario</div>
                </div>
              </h2>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#00754F] rounded opacity-80"></div>
                    <span className="text-sm font-medium text-blue-900">Internal Fleet</span>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl px-4 py-2 border border-orange-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded opacity-70"></div>
                    <span className="text-sm font-medium text-orange-900">External Sourcing</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Data overview */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="flex items-center justify-between">
                <span>Analysis Period: <span className="font-semibold">{tabularForecast.monthlyColumns.length} months</span></span>
                <span>Active Rigs: <span className="font-semibold">{tabularForecast.rigDemands.length}</span></span>
                <span>Peak Demand: <span className="font-semibold text-[#00754F]">{Math.max(...tabularForecast.monthlyColumns.map(m => 
                  tabularForecast.rigDemands.reduce((sum, rig) => sum + getVesselValue(rig.rigName, m), 0)
                )).toFixed(1)} vessels</span></span>
              </div>
            </div>
            
            <div className="h-96 relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200/50 p-6 shadow-inner">
              {/* Horizontal scroll instructions */}
              <div className="text-xs text-gray-500 mb-2 text-center">
                ← Scroll horizontally to view all {tabularForecast.monthlyColumns.length} months →
              </div>
              
              {/* Horizontally Scrollable Chart Container */}
              <div className="overflow-x-auto overflow-y-hidden h-full" style={{scrollBehavior: 'smooth'}}>
                {tabularForecast.monthlyColumns.length > 0 && (() => {
                  // Calculate vessel demands and positions
                  const dataPoints = tabularForecast.monthlyColumns.map((month, index) => {
                    const totalVessels = tabularForecast.rigDemands.reduce((sum, rig) => {
                      return sum + getVesselValue(rig.rigName, month);
                    }, 0);
                    const internalUsed = Math.min(totalVessels, 6.5);
                    const externalNeeded = Math.max(0, totalVessels - 6.5);
                    
                    // Check for batch operations in this month
                    const batchRigs = tabularForecast.rigDemands.filter(rig => 
                      rig.batchOperations && rig.batchOperations[month] && getVesselValue(rig.rigName, month) > 0
                    );
                    const hasBatchOps = batchRigs.length > 0;
                    const batchDetails = batchRigs.map(rig => ({
                      rigName: rig.rigDisplayName || rig.rigName,
                      activityType: getActivityType(rig.rigName, month),
                      vessels: getVesselValue(rig.rigName, month)
                    }));

                    // Check for Deepwater Invictus and Ocean Black Hornet both in the same ultra-deep location
                    const activeRigs = tabularForecast.rigDemands.filter(rig => getVesselValue(rig.rigName, month) > 0);
                    const monthDate = new Date(month + '-01');
                    const ultraDeepLocations = ['GOM.Tiber', 'GOM.Kaskida', 'GOM.Paleogene'];
                    
                    // Helper function to get rig location for a specific month
                    const getRigLocationForMonth = (rigName: string, targetMonth: Date) => {
                      const rigActivitiesForMonth = rigActivities.filter(activity => {
                        const activityStartMonth = new Date(activity.startDate.getFullYear(), activity.startDate.getMonth(), 1);
                        const activityEndMonth = new Date(activity.endDate.getFullYear(), activity.endDate.getMonth(), 1);
                        return activity.rigName.toLowerCase().includes(rigName.toLowerCase()) &&
                               targetMonth >= activityStartMonth && targetMonth <= activityEndMonth;
                      });
                      return rigActivitiesForMonth.map(activity => activity.asset);
                    };
                    
                    const invictusLocations = getRigLocationForMonth('deepwater invictus', monthDate);
                    const blackhornetLocations = getRigLocationForMonth('ocean blackhornet', monthDate);
                    
                    // Find if both rigs are in the same ultra-deep location
                    const invictusUltraDeepLocations = invictusLocations.filter(loc => ultraDeepLocations.includes(loc));
                    const blackhornetUltraDeepLocations = blackhornetLocations.filter(loc => ultraDeepLocations.includes(loc));
                    
                    const sharedUltraDeepLocation = invictusUltraDeepLocations.find(loc => 
                      blackhornetUltraDeepLocations.includes(loc)
                    );
                    
                    const bothRigsInSameUltraDeep = !!sharedUltraDeepLocation;
                    const invictusInUltraDeep = activeRigs.find(rig => 
                      rig.rigName.toLowerCase().includes('deepwater invictus') && invictusUltraDeepLocations.length > 0
                    );
                    const blackhornetInUltraDeep = activeRigs.find(rig => 
                      rig.rigName.toLowerCase().includes('ocean blackhornet') && blackhornetUltraDeepLocations.length > 0
                    );
                    
                    return {
                      month,
                      total: totalVessels,
                      internal: internalUsed,
                      external: externalNeeded,
                      hasBatchOps,
                      batchDetails,
                      bothRigsInSameUltraDeep,
                      sharedUltraDeepLocation,
                      invictusInUltraDeep,
                      blackhornetInUltraDeep,
                      invictusUltraDeepLocations,
                      blackhornetUltraDeepLocations,
                      index
                    };
                  });
                  
                  const maxVessels = Math.max(...dataPoints.map(d => d.total), 16);
                  const chartHeight = 300; // Fixed pixel height for SVG
                  
                  // Make chart much wider for better readability - give each month more space
                  const monthWidth = 100; // 100px per month for much better spacing
                  const chartWidth = dataPoints.length * monthWidth + 80; // Scale with data plus padding
                  const padding = 40; // More padding for labels
                
                // Convert data to SVG coordinates - evenly spaced with better month spacing
                const svgPoints = dataPoints.map((point, index) => ({
                  ...point,
                  x: padding + (index * monthWidth) + (monthWidth / 2), // Center each point in its month slot
                  yTotal: chartHeight - padding - ((point.total / maxVessels) * (chartHeight - 2 * padding)),
                  yInternal: chartHeight - padding - ((point.internal / maxVessels) * (chartHeight - 2 * padding)),
                  yBaseline: chartHeight - padding
                }));
                
                // Create SVG paths
                const internalAreaPath = [
                  `M ${svgPoints[0].x} ${chartHeight - padding}`, // Start at bottom
                  ...svgPoints.map(p => `L ${p.x} ${p.yInternal}`), // Line to internal level
                  `L ${svgPoints[svgPoints.length - 1].x} ${chartHeight - padding}`, // Line to bottom right
                  'Z' // Close path
                ].join(' ');
                
                const externalAreaPath = [
                  `M ${svgPoints[0].x} ${svgPoints[0].yInternal}`, // Start at internal level
                  ...svgPoints.map(p => `L ${p.x} ${p.yTotal}`), // Line to total level
                  ...svgPoints.slice().reverse().map(p => `L ${p.x} ${p.yInternal}`), // Back down to internal
                  'Z' // Close path
                ].join(' ');
                
                // Fleet capacity line position
                const fleetCapacityY = chartHeight - padding - ((6.5 / maxVessels) * (chartHeight - 2 * padding));
                
                return (
                  <div className="relative w-full h-full">
                    {/* React state-based tooltip */}
                    {hoveredPoint && (
                      <div
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: `${(svgPoints[hoveredPoint.index].x / chartWidth) * 100}%`,
                          top: `${(svgPoints[hoveredPoint.index].yTotal / chartHeight) * 100}%`,
                          transform: 'translate(-50%, -120%)'
                        }}
                      >
                        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm whitespace-nowrap">
                          <div className="font-bold text-center mb-1">{hoveredPoint.data.total.toFixed(1)} vessels total</div>
                          <div className="text-green-400 text-xs">✓ {hoveredPoint.data.internal.toFixed(1)} from internal fleet</div>
                          <div className="text-orange-400 text-xs">+ {hoveredPoint.data.external.toFixed(1)} external sourcing</div>
                          
                          {hoveredPoint.data.bothRigsInSameUltraDeep && (
                            <>
                              <div className="border-t border-gray-700 mt-2 pt-2">
                                <div className="text-red-400 text-xs font-semibold">🚨 SAME ULTRA-DEEP LOCATION</div>
                                <div className="text-red-300 text-xs">
                                  Both Deepwater Invictus & Ocean Black Hornet in {hoveredPoint.data.sharedUltraDeepLocation?.replace('GOM.', '')}
                                </div>
                                <div className="text-red-200 text-xs">
                                  Critical vessel coordination required
                                </div>
                              </div>
                            </>
                          )}
                          
                          {hoveredPoint.data.hasBatchOps && (
                            <>
                              <div className="border-t border-gray-700 mt-2 pt-2">
                                <div className="text-yellow-400 text-xs font-semibold">⚡ BATCH OPERATIONS</div>
                                <div className="text-yellow-300 text-xs">
                                  {hoveredPoint.data.batchDetails.length} rig{hoveredPoint.data.batchDetails.length > 1 ? 's' : ''}: {hoveredPoint.data.batchDetails.map((b: any) => `${b.rigName} (${b.activityType}B)`).join(', ')}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible" style={{minWidth: chartWidth}}>
                      {/* Internal fleet area (green) */}
                      <path
                        d={internalAreaPath}
                        fill="#00754F"
                        opacity="0.8"
                        className="transition-opacity duration-200 hover:opacity-90"
                        style={{
                          filter: 'drop-shadow(0 2px 8px rgba(0,117,79,0.2))'
                        }}
                      />
                      
                      {/* External fleet area (orange) */}
                      <path
                        d={externalAreaPath}
                        fill="#f97316"
                        opacity="0.7"
                        className="transition-opacity duration-200 hover:opacity-85"
                        style={{
                          filter: 'drop-shadow(0 2px 8px rgba(249,115,22,0.2))'
                        }}
                      />
                      
                      {/* Fleet capacity baseline */}
                      <line
                        x1={padding}
                        x2={chartWidth - padding}
                        y1={fleetCapacityY}
                        y2={fleetCapacityY}
                        stroke="#dc2626"
                        strokeWidth="3"
                        strokeDasharray="8,4"
                      />
                      <text
                        x={chartWidth - padding}
                        y={fleetCapacityY - 8}
                        fill="#dc2626"
                        fontSize="12"
                        textAnchor="end"
                        fontWeight="700"
                      >
                        6.5 Fleet Capacity
                      </text>
                      
                      {/* Data points with React state tooltip triggers */}
                      {svgPoints.map((point, index) => (
                        <g key={index}>
                          {/* Invisible hover trigger area */}
                          <circle
                            cx={point.x}
                            cy={point.yTotal}
                            r="15"
                            fill="transparent"
                            className="cursor-pointer hover:fill-blue-200 hover:fill-opacity-20"
                            style={{ pointerEvents: 'all' }}
                            onMouseEnter={() => setHoveredPoint({ index, data: point })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          
                          {/* Visible data point circle - highlighted for same ultra-deep location operations */}
                          <circle
                            cx={point.x}
                            cy={point.yTotal}
                            r={point.bothRigsInSameUltraDeep ? "7" : "5"}
                            fill={point.bothRigsInSameUltraDeep ? "#DC2626" : "#374151"}
                            stroke={point.bothRigsInSameUltraDeep ? "#FEE2E2" : "white"}
                            strokeWidth={point.bothRigsInSameUltraDeep ? "3" : "2"}
                            style={{
                              filter: point.bothRigsInSameUltraDeep 
                                ? 'drop-shadow(0 0 8px rgba(220,38,38,0.6))' 
                                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                              pointerEvents: 'none'
                            }}
                          />
                          
                          {/* Warning indicator for same ultra-deep location operations */}
                          {point.bothRigsInSameUltraDeep && (
                            <text
                              x={point.x + 12}
                              y={point.yTotal - 8}
                              fill="#DC2626"
                              fontSize="12"
                              fontWeight="700"
                              style={{ pointerEvents: 'none' }}
                            >
                              🚨
                            </text>
                          )}
                          
                          {/* Value label */}
                          <text
                            x={point.x}
                            y={point.yTotal - 12}
                            fill="#374151"
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="600"
                            style={{ pointerEvents: 'none' }}
                          >
                            {point.total.toFixed(1)}
                          </text>
                        </g>
                      ))}
                      
                      {/* Month labels - improved spacing and readability */}
                      {svgPoints.map((point, index) => (
                        <text
                          key={index}
                          x={point.x}
                          y={chartHeight - 10}
                          fill="#000000"
                          fontSize="12"
                          textAnchor="middle"
                          fontWeight="600"
                        >
                          {point.month}
                        </text>
                      ))}
                    </svg>
                  </div>
                );
              })()}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200/50">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-[#00754F] to-[#6EC800] rounded-full"></div>
                Chart Elements Guide
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-[#00754F] opacity-80 rounded shadow-sm"></div>
                    Internal Fleet
                  </h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">Capacity from our 6.5 vessel drilling fleet</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <h4 className="text-sm font-bold text-orange-900 flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-orange-500 opacity-70 rounded shadow-sm"></div>
                    External Sourcing
                  </h4>
                  <p className="text-xs text-orange-700 leading-relaxed">Additional vessels needed beyond internal fleet</p>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-gray-600 rounded-full border-2 border-white shadow-sm"></div>
                    Demand Points
                  </h4>
                  <p className="text-xs text-gray-700 leading-relaxed">Total vessel requirement per month</p>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <h4 className="text-sm font-bold text-red-900 flex items-center gap-2 mb-2">
                    <div className="w-4 h-1 border-t-2 border-dashed border-red-600 bg-transparent rounded"></div>
                    Fleet Baseline
                  </h4>
                  <p className="text-xs text-red-700 leading-relaxed">6.5 vessel internal capacity threshold</p>
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
        
        {/* Enhanced Data Foundation */}
        <div className="mt-6 bg-gradient-to-br from-white/95 to-blue-50/30 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="bg-gradient-to-r from-[#00754F] to-[#6EC800] p-2 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div>Data Foundation & Quality</div>
              <div className="text-sm font-medium text-[#00754F] mt-1">VPS Server Real-time Source</div>
            </div>
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
        
        {/* Enhanced Activity Type Legend */}
        <div className="mt-6 bg-gradient-to-br from-white/95 to-emerald-50/30 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
            <div className="bg-gradient-to-r from-[#00754F] to-[#6EC800] p-2 rounded-xl">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div>Activity Type Reference</div>
              <div className="text-sm font-medium text-[#00754F] mt-1">Color coding and demand multipliers</div>
            </div>
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