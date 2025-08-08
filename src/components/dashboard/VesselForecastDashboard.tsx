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
import { calculateTabularVesselForecast } from '../../utils/tabularVesselDemandCalculator';
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

interface TabularForecast {
  months: string[];
  rigs: {
    rigName: string;
    monthlyActivities: Record<string, {
      activityType: string;
      location: string;
      demand: number;
    }>;
  }[];
  totals: {
    monthlyDemand: Record<string, number>;
    monthlyVessels: Record<string, number>;
    currentFleetCapability: Record<string, number>;
    additionalVesselsNeeded: Record<string, number>;
  };
}

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

// Baseline assumptions from Aug 2026 Updated
const BASELINE_ASSUMPTIONS = {
  // Fleet composition
  drillingFleetSize: 6, // Base vessels available for drilling support
  productionVessels: 1.75, // 1.25 for Fantasy Island + 0.5 for Thunder Horse
  madDogWarehouse: 1, // Dedicated warehouse vessel for Mad Dog
  chevronOperatorSharing: -0.25, // Reduction due to Chevron operator sharing
  totalFleetSize: 8.5, // Total fleet (6 + 1.75 + 1 - 0.25 = 8.5)
  
  // Operational parameters
  vesselDeliveryCapability: 6.5, // deliveries per vessel per month for standard locations
  wellsDeliveryDemand: 8.3, // total deliveries required by a drilling rig per month
  
  // Location factors
  paleogeneTransitFactor: 1.25, // 25% increase to vessel demand for transit
  kaskidaTiberFactor: 3, // 3x typical monthly wells delivery demand
  multiZoneCompletionFactor: 2, // 2x typical monthly wells delivery demand
  lwiDemandFactor: 0.5, // 50% demand of other wells
};

const RIG_ACTIVITY_TYPES: Record<string, { name: string; demandMultiplier: number; color: string }> = {
  'RSU': { name: 'Rig Start Up', demandMultiplier: 0.5, color: 'bg-blue-100 text-blue-800' },
  'DRL': { name: 'Drill', demandMultiplier: 1.0, color: 'bg-green-100 text-green-800' },
  'CPL': { name: 'Completion', demandMultiplier: 1.5, color: 'bg-purple-100 text-purple-800' },
  'RM': { name: 'Rig Maintenance', demandMultiplier: 0.3, color: 'bg-gray-100 text-gray-800' },
  'WS': { name: 'White Space', demandMultiplier: 0, color: 'bg-white text-gray-400' },
  'P&A': { name: 'Plug & Abandon', demandMultiplier: 0.8, color: 'bg-red-100 text-red-800' },
  'WWP': { name: 'Well Work Production', demandMultiplier: 0.7, color: 'bg-yellow-100 text-yellow-800' },
  'MOB': { name: 'Mobilization', demandMultiplier: 0.4, color: 'bg-indigo-100 text-indigo-800' },
  'WWI': { name: 'Well Work Intervention', demandMultiplier: 0.5, color: 'bg-orange-100 text-orange-800' },
  'TAR': { name: 'Turnaround', demandMultiplier: 0.9, color: 'bg-teal-100 text-teal-800' },
  'LWI': { name: 'Light Well Intervention', demandMultiplier: 0.5, color: 'bg-pink-100 text-pink-800' }
};

// Location configurations with transit times and capabilities
const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  'GOM.Atlantis': { name: 'Atlantis', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#00754F' },
  'GOM.Nakika': { name: 'Nakika', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#6EC800' },
  'GOM.Region': { name: 'Region', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#0099D4' },
  'GOM.GOMX': { name: 'GOMX', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#FF6B35' },
  'GOM.ThunderHorse': { name: 'Thunder Horse', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#8B5CF6' },
  'GOM.Argos': { name: 'Argos', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#EC4899' },
  'GOM.MadDog': { name: 'Mad Dog', transitHours: 13, vesselCapability: 6.5, rigDemand: 8.3, color: '#F59E0B' },
  'GOM.Paleogene': { name: 'Paleogene', transitHours: 24, vesselCapability: 6.5, rigDemand: 8.3 * 1.25, color: '#DC2626' },
  'GOM.Kaskida': { name: 'Kaskida', transitHours: 24, vesselCapability: 6.5, rigDemand: 8.3 * 3, color: '#7C3AED' },
  'GOM.Tiber': { name: 'Tiber', transitHours: 24, vesselCapability: 6.5, rigDemand: 8.3 * 3, color: '#991B1B' }
};

// Rig name mappings from Excel to display names
const RIG_NAME_MAPPINGS: Record<string, string> = {
  'Transocean Invictus': 'Deepwater Invictus',
  'GOM.Atlas': 'Deepwater Atlas',
  'GOM.Black Hornet': 'Ocean Blackhornet',
  'GOM.Black Lion': 'Ocean BlackLion',
  'GOM.Ice Max': 'Stena IceMAX',
  'GOM.LWI ISLVEN': 'Island Venture',
  'GOM.Mad Dog SPAR': 'Mad Dog Drilling',
  'GOM.PDQ': 'Thunderhorse Drilling',
  'GOM.Q5000': 'Q5000',
  'GOM.TBD#02': 'TBD #02',
  'GOM.TBD#07': 'TBD #07',
  // Alternative formats
  'INVICTUS': 'Deepwater Invictus',
  'ATLAS': 'Deepwater Atlas',
  'Black Hornet': 'Ocean Blackhornet',
  'Black Lion': 'Ocean BlackLion',
  'STENA ICEMAX': 'Stena IceMAX',
  'Mad Dog Spar': 'Mad Dog Drilling',
  'TH PDQ': 'Thunderhorse Drilling',
  'TBD #7': 'TBD #07',
  'TBD #2': 'TBD #02',
  'Intervention Vessel TBD': 'Island Venture'
};

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
  
  // Processing status
  const [loadingStep, setLoadingStep] = useState<string>('Initializing...');
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // ==================== UTILITY FUNCTIONS ====================
  
  // Parse Excel dates
  const parseExcelDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const msPerDay = 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + (value - 2) * msPerDay);
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };
  
  // Find closest rig name match
  const findClosestRigName = (input: string): string => {
    const normalizedInput = input.toLowerCase().trim();
    
    for (const rigName of RIG_NAMES) {
      if (normalizedInput.includes(rigName.toLowerCase()) || 
          rigName.toLowerCase().includes(normalizedInput)) {
        return rigName;
      }
    }
    
    for (const [key, value] of Object.entries(RIG_NAME_MAPPINGS)) {
      if (normalizedInput.includes(key.toLowerCase()) || 
          key.toLowerCase().includes(normalizedInput)) {
        return value;
      }
    }
    
    return '';
  };
  
  // Calculate monthly vessel demands
  const calculateMonthlyVesselDemand = (activities: RigActivity[]): VesselDemand[] => {
    const monthlyDemands: Map<string, VesselDemand> = new Map();
    
    // Generate 18 months starting from Jan 2026
    for (let i = 0; i < 18; i++) {
      const date = new Date(2026, i, 1);
      const monthKey = `${date.toLocaleDateString('en-US', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`;
      
      monthlyDemands.set(monthKey, {
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        year: date.getFullYear(),
        totalDemand: 0,
        vesselCount: 0,
        rigActivities: [],
        locationBreakdown: {}
      });
    }
    
    // Process activities by month
    activities.forEach(activity => {
      const startMonth = new Date(activity.startDate.getFullYear(), activity.startDate.getMonth(), 1);
      const endMonth = new Date(activity.endDate.getFullYear(), activity.endDate.getMonth(), 1);
      
      let currentMonth = new Date(startMonth);
      while (currentMonth <= endMonth) {
        const monthKey = `${currentMonth.toLocaleDateString('en-US', { month: 'short' })}-${String(currentMonth.getFullYear()).slice(-2)}`;
        const demand = monthlyDemands.get(monthKey);
        
        if (demand) {
          const locationConfig = LOCATION_CONFIGS[activity.asset] || LOCATION_CONFIGS['GOM.Region'];
          const activityDemand = locationConfig.rigDemand * (RIG_ACTIVITY_TYPES[activity.activityType]?.demandMultiplier || 1);
          
          demand.totalDemand += activityDemand;
          demand.rigActivities.push(activity);
          
          if (!demand.locationBreakdown[activity.asset]) {
            demand.locationBreakdown[activity.asset] = 0;
          }
          demand.locationBreakdown[activity.asset] += activityDemand;
        }
        
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    });
    
    // Calculate vessel counts
    monthlyDemands.forEach(demand => {
      let weightedVesselCapability = 0;
      let totalWeight = 0;
      
      Object.entries(demand.locationBreakdown).forEach(([location, locationDemand]) => {
        const config = LOCATION_CONFIGS[location] || LOCATION_CONFIGS['GOM.Region'];
        weightedVesselCapability += config.vesselCapability * locationDemand;
        totalWeight += locationDemand;
      });
      
      if (totalWeight > 0) {
        const avgVesselCapability = weightedVesselCapability / totalWeight;
        demand.vesselCount = Math.ceil(demand.totalDemand / avgVesselCapability);
      }
    });
    
    return Array.from(monthlyDemands.values());
  };

  const generateTabularForecast = (activities: RigActivity[]): TabularForecast => {
    const months: string[] = [];
    for (let i = 0; i < 18; i++) {
      const date = new Date(2026, i, 1);
      months.push(`${date.toLocaleDateString('en-US', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`);
    }
    
    const rigData = RIG_NAMES.map(rigName => {
      const monthlyActivities: Record<string, { activityType: string; location: string; demand: number }> = {};
      
      activities
        .filter(a => a.rigName === rigName)
        .forEach(activity => {
          const startMonth = new Date(activity.startDate.getFullYear(), activity.startDate.getMonth(), 1);
          const endMonth = new Date(activity.endDate.getFullYear(), activity.endDate.getMonth(), 1);
          
          let currentMonth = new Date(startMonth);
          while (currentMonth <= endMonth) {
            const monthKey = `${currentMonth.toLocaleDateString('en-US', { month: 'short' })}-${String(currentMonth.getFullYear()).slice(-2)}`;
            
            if (months.includes(monthKey)) {
              const locationConfig = LOCATION_CONFIGS[activity.asset] || LOCATION_CONFIGS['GOM.Region'];
              const demand = locationConfig.rigDemand * (RIG_ACTIVITY_TYPES[activity.activityType]?.demandMultiplier || 1);
              
              monthlyActivities[monthKey] = {
                activityType: activity.activityType,
                location: locationConfig.name,
                demand
              };
            }
            
            currentMonth.setMonth(currentMonth.getMonth() + 1);
          }
        });
      
      return { rigName, monthlyActivities };
    });
    
    const totals = {
      monthlyDemand: {} as Record<string, number>,
      monthlyVessels: {} as Record<string, number>,
      currentFleetCapability: {} as Record<string, number>,
      additionalVesselsNeeded: {} as Record<string, number>
    };
    
    months.forEach(month => {
      let totalDemand = 0;
      
      rigData.forEach(rig => {
        if (rig.monthlyActivities[month]) {
          totalDemand += rig.monthlyActivities[month].demand;
        }
      });
      
      totals.monthlyDemand[month] = totalDemand;
      
      // Calculate drilling fleet capability
      const drillingFleetCapability = BASELINE_ASSUMPTIONS.drillingFleetSize * BASELINE_ASSUMPTIONS.vesselDeliveryCapability;
      totals.currentFleetCapability[month] = drillingFleetCapability;
      
      // Calculate total vessels needed
      const totalVesselsNeeded = Math.ceil(totalDemand / BASELINE_ASSUMPTIONS.vesselDeliveryCapability);
      totals.monthlyVessels[month] = totalVesselsNeeded;
      
      // Calculate additional vessels needed
      const additionalNeeded = Math.max(0, totalVesselsNeeded - BASELINE_ASSUMPTIONS.drillingFleetSize);
      totals.additionalVesselsNeeded[month] = additionalNeeded;
    });
    
    return { months, rigs: rigData, totals };
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
      const filteredActivities = selectedActivities.filter(
        a => selectedRigs.includes(a.rigName) && selectedLocations.includes(a.asset)
      );
      
      setLoadingStep('Processing selected scenario...');
      setProcessingProgress(50);
      
      // Generate 18-month forecast horizon
      const months: string[] = [];
      const startDate = new Date(2026, 0, 1);
      for (let i = 0; i < 17; i++) {
        const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const monthStr = `${month.toLocaleDateString('en-US', { month: 'short' })}-${String(month.getFullYear()).slice(-2)}`;
        months.push(monthStr);
      }
      
      console.log(`🔍 Calculating forecast for ${selectedScenario} case with ${filteredActivities.length} activities`);
      
      setLoadingStep('Mapping activities to offshore locations...');
      setProcessingProgress(70);
      
      // Calculate forecasts
      const forecast = calculateTabularVesselForecast(filteredActivities, months);
      const demands = calculateMonthlyVesselDemand(filteredActivities);
      const tabular = generateTabularForecast(filteredActivities);
      
      setLoadingStep('Finalizing analysis...');
      setProcessingProgress(90);
      
      setRigActivities(filteredActivities);
      setVesselDemands(demands);
      setTabularForecast(forecast);
      
      console.log('✅ Vessel forecast dashboard ready');
      console.log(`📍 Generated demand for ${forecast.locationDemands.length} locations`);
      console.log(`📅 Forecast horizon: ${months.length} months`);
      
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
        peakAdditional,
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
      peakAdditional,
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
                        {config.name} ({config.transitHours}h transit)
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
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Ship className="w-5 h-5 text-[#00754F]" />
                Offshore Location Vessel Requirements - {selectedScenario} Case
              </h2>
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
                  {tabularForecast.locationDemands.map((location, index) => (
                    <tr key={location.locationName} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                      <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200">
                        {location.locationDisplayName}
                      </td>
                      {tabularForecast.monthlyColumns.map((month) => {
                        const demand = location.monthlyDemand[month] || 0;
                        return (
                          <td key={month} className={`px-3 py-3 text-center border-r border-gray-200 ${
                            demand > 0 
                              ? demand === location.peakDemand 
                                ? 'bg-yellow-200 font-bold text-yellow-900' // Peak demand highlighting
                                : demand >= 1.5 
                                ? 'bg-green-100 font-semibold text-green-800' // High demand
                                : 'text-gray-900'
                              : 'text-gray-400'
                          }`}>
                            {demand > 0 ? demand.toFixed(1) : ''}
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
        
        {viewMode === 'chart' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#00754F]" />
              Vessel Demand Trend - {selectedScenario} Case
            </h2>
            
            <div className="h-64 flex items-end justify-between gap-2">
              {vesselDemands.map((demand, index) => {
                const maxVessels = Math.max(...vesselDemands.map(d => d.vesselCount));
                const height = (demand.vesselCount / maxVessels) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#00754F] rounded-t hover:bg-[#00754F]/80 transition-colors relative group"
                         style={{ height: `${height}%` }}>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-semibold text-gray-700">{demand.vesselCount}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 mt-2 rotate-45 origin-left">{demand.month.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Location Breakdown</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(LOCATION_CONFIGS).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: config.color }}></div>
                    <span>{config.name}</span>
                    <span className="text-gray-500">({config.vesselCapability} del/mo)</span>
                  </div>
                ))}
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
                  <span className="text-gray-600">Locations Mapped:</span>
                  <span className="font-semibold">{tabularForecast?.locationDemands.length || 0}</span>
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Activity Type Legend</h3>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(RIG_ACTIVITY_TYPES).map(([key, config]) => (
              <div key={key} className={`px-3 py-2 rounded text-xs font-medium ${config.color} flex items-center justify-between`}>
                <span>{key}</span>
                <span className="opacity-75">×{config.demandMultiplier}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VesselForecastDashboard;