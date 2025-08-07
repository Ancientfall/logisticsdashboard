import React, { useState, useEffect, useCallback } from 'react';
import { 
  Ship, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import KPICard from './KPICard';
import { loadBothScenarios } from '../../utils/rigScheduleProcessor';
import { calculateFleetVesselDemand } from '../../utils/vesselDemandCalculator';
import { 
  VesselForecastExecutiveSummary,
  ScenarioComparison
} from '../../types/vesselForecast';

interface VesselForecastDashboardProps {
  className?: string;
}

const VesselForecastDashboard: React.FC<VesselForecastDashboardProps> = () => {
  // ==================== STATE MANAGEMENT ====================
  
  const [executiveSummary, setExecutiveSummary] = useState<VesselForecastExecutiveSummary | null>(null);
  const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparison | null>(null);
  
  // Loading and UI states
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<'MEAN' | 'EARLY'>('MEAN');
  const [error, setError] = useState<string | null>(null);
  const [showDataFoundation, setShowDataFoundation] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  
  // Processing status
  const [loadingStep, setLoadingStep] = useState<string>('Initializing...');
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // ==================== CORE DATA LOADING FUNCTION ====================
  
  const loadVesselForecast = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      setLoadingStep('Loading rig schedule data...');
      setProcessingProgress(10);
      
      // Load both scenarios with full audit trail
      console.log('🔍 About to load both scenarios...');
      let scenarios;
      try {
        scenarios = await loadBothScenarios();
        console.log('✅ Scenarios loaded successfully:', scenarios);
      } catch (error) {
        console.error('❌ Error loading scenarios:', error);
        throw new Error(`Failed to load scenarios: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      setLoadingStep('Calculating vessel demand...');
      setProcessingProgress(40);
      
      // Generate 18-month forecast horizon
      const currentDate = new Date();
      const months: string[] = [];
      for (let i = 0; i < 18; i++) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        months.push(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`);
      }
      
      setLoadingStep('Analyzing MEAN case scenario...');
      setProcessingProgress(55);
      
      // Calculate vessel demand for MEAN case
      console.log('🔍 About to calculate MEAN case demand with:', scenarios.meanCase.activities.length, 'activities');
      let meanDemandResult;
      try {
        meanDemandResult = calculateFleetVesselDemand(scenarios.meanCase.activities, months);
        console.log('✅ MEAN case calculation completed:', meanDemandResult);
      } catch (error) {
        console.error('❌ Error in MEAN case calculation:', error);
        throw new Error(`MEAN case calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      setLoadingStep('Analyzing EARLY case scenario...');
      setProcessingProgress(70);
      
      // Calculate vessel demand for EARLY case
      console.log('🔍 About to calculate EARLY case demand with:', scenarios.earlyCase.activities.length, 'activities');
      let earlyDemandResult;
      try {
        earlyDemandResult = calculateFleetVesselDemand(scenarios.earlyCase.activities, months);
        console.log('✅ EARLY case calculation completed:', earlyDemandResult);
      } catch (error) {
        console.error('❌ Error in EARLY case calculation:', error);
        throw new Error(`EARLY case calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      setLoadingStep('Generating management insights...');
      setProcessingProgress(85);
      
      // Create executive summary
      console.log('📊 Mean demand result:', meanDemandResult);
      console.log('📊 Early demand result:', earlyDemandResult);
      
      const meanTotals = Object.values(meanDemandResult.monthlyTotals);
      const earlyTotals = Object.values(earlyDemandResult.monthlyTotals);
      
      console.log('📊 Mean totals:', meanTotals);
      console.log('📊 Early totals:', earlyTotals);
      
      const peakMeanVessels = meanTotals.length > 0 ? Math.max(...meanTotals.map(m => m.totalVessels || 0)) : 0;
      const peakEarlyVessels = earlyTotals.length > 0 ? Math.max(...earlyTotals.map(m => m.totalVessels || 0)) : 0;
      const currentFleet = 8; // From historical analysis
      
      console.log(`⚡ Peak vessels: MEAN ${peakMeanVessels}, EARLY ${peakEarlyVessels}`);
      
      const summary: VesselForecastExecutiveSummary = {
        recommendation: peakEarlyVessels > currentFleet 
          ? `Charter ${peakEarlyVessels - currentFleet} additional vessels for peak periods`
          : 'Current fleet capacity appears adequate for forecasted demand',
        businessRationale: peakEarlyVessels > currentFleet
          ? `EARLY case scenario requires ${peakEarlyVessels} vessels at peak vs current ${currentFleet} vessel fleet`
          : `Peak demand of ${peakMeanVessels} vessels can be handled by current ${currentFleet} vessel fleet`,
        currentFleetSize: currentFleet,
        peakVesselsNeeded: Math.max(peakMeanVessels, peakEarlyVessels),
        additionalVesselsRequired: Math.max(0, Math.max(peakMeanVessels, peakEarlyVessels) - currentFleet),
        peakDemandMonth: Object.entries(meanDemandResult.monthlyTotals).length > 0
          ? Object.entries(meanDemandResult.monthlyTotals)
              .reduce((max, [month, data]) => (data.totalVessels || 0) > max.vessels ? { month, vessels: data.totalVessels || 0 } : max, 
                      { month: '', vessels: 0 }).month || 'N/A'
          : 'N/A',
        estimatedCostImpact: Math.max(0, Math.max(peakMeanVessels, peakEarlyVessels) - currentFleet) * 35000 * 12,
        operationalRiskWithoutAction: peakEarlyVessels > currentFleet 
          ? 'Project delays, increased costs, customer dissatisfaction' 
          : 'Minimal risk with current capacity',
        confidenceLevel: scenarios.meanCase.processingReport.dataQualityScore > 80 ? 'High' : 'Medium',
        dataQualityScore: Math.min(scenarios.meanCase.processingReport.dataQualityScore, 
                                  scenarios.earlyCase.processingReport.dataQualityScore),
        keyAssumptions: [
          'Rig demand baseline: 8.2 deliveries/rig/month',
          'Vessel capability: 6.5 deliveries/vessel/month',
          'Activity-specific demand multipliers applied',
          '18-month forecast horizon',
          'Current fleet: 8 vessels'
        ]
      };
      
      // Create scenario comparison
      const meanPeakMonth = meanTotals.length > 0 
        ? Object.entries(meanDemandResult.monthlyTotals)
            .reduce((max, [month, data]) => (data.totalVessels || 0) > max.vessels ? { month, vessels: data.totalVessels || 0 } : max, 
                    { month: '', vessels: 0 }).month || 'N/A'
        : 'N/A';
      
      const earlyPeakMonth = earlyTotals.length > 0
        ? Object.entries(earlyDemandResult.monthlyTotals)
            .reduce((max, [month, data]) => (data.totalVessels || 0) > max.vessels ? { month, vessels: data.totalVessels || 0 } : max, 
                    { month: '', vessels: 0 }).month || 'N/A'
        : 'N/A';
      
      const comparison: ScenarioComparison = {
        meanCase: {
          totalVesselsNeeded: peakMeanVessels,
          peakMonth: meanPeakMonth,
          averageUtilization: 0.75, // Placeholder - would calculate from actual data
          costEstimate: peakMeanVessels * 35000 * 12
        },
        earlyCase: {
          totalVesselsNeeded: peakEarlyVessels,
          peakMonth: earlyPeakMonth,
          averageUtilization: 0.85, // Placeholder
          costEstimate: peakEarlyVessels * 35000 * 12
        },
        delta: {
          vesselDifference: peakEarlyVessels - peakMeanVessels,
          timelineDifference: 'Activities start 2-3 months earlier',
          costDifference: (peakEarlyVessels - peakMeanVessels) * 35000 * 12,
          riskAssessment: peakEarlyVessels > peakMeanVessels ? 'Higher vessel requirements in EARLY case' : 'Similar requirements'
        },
        recommendation: peakEarlyVessels > peakMeanVessels + 1 ? 'Plan for EARLY case' : 
                        peakEarlyVessels < peakMeanVessels - 1 ? 'Plan for MEAN case' : 'Flexible capacity strategy'
      };
      
      setLoadingStep('Finalizing analysis...');
      setProcessingProgress(100);
      
      // Set all results
      setExecutiveSummary(summary);
      setScenarioComparison(comparison);
      
      console.log('✅ Vessel forecast analysis completed');
      console.log(`📊 Peak vessels needed: MEAN ${peakMeanVessels}, EARLY ${peakEarlyVessels}`);
      console.log(`🎯 Recommendation: ${summary.recommendation}`);
      
    } catch (error) {
      console.error('❌ Error in vessel forecast analysis:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setProcessingProgress(0);
    }
  }, []);

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
    if (!executiveSummary || !scenarioComparison) return;
    
    const exportData = {
      executiveSummary,
      scenarioComparison,
      exportedAt: new Date().toISOString(),
      exportedBy: 'BP Logistics Dashboard'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vessel-forecast-executive-summary-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ==================== RENDER CONDITIONS ====================
  
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
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
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadVesselForecast}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#00754F] text-white rounded-lg hover:bg-[#00754F]/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!executiveSummary || !scenarioComparison) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-gray-600">
          <Ship className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="mb-4">Vessel forecast analysis not available</p>
          <button
            onClick={loadVesselForecast}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#00754F] text-white rounded-lg hover:bg-[#00754F]/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Start Analysis
          </button>
        </div>
      </div>
    );
  }

  // ==================== MAIN DASHBOARD UI ====================
  
  return (
    <div className={`space-y-6 ${presentationMode ? 'max-w-none' : ''}`}>
      {/* Dashboard Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Ship className="w-8 h-8 text-[#00754F]" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Vessel Forecast Dashboard
                {presentationMode && <span className="text-sm font-normal text-gray-500 ml-2">(Presentation Mode)</span>}
              </h2>
              <p className="text-gray-600">18-Month Management-Ready Vessel Requirements Analysis</p>
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
              onClick={loadVesselForecast}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#00754F] text-white rounded-lg hover:bg-[#00754F]/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Scenario Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Analysis Scenario:</span>
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
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              executiveSummary.confidenceLevel === 'High' ? 'bg-green-500' : 
              executiveSummary.confidenceLevel === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500">
              {executiveSummary.confidenceLevel} Confidence ({executiveSummary.dataQualityScore}/100)
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary - Primary Decision Panel */}
      <div className="bg-gradient-to-r from-[#00754F] to-[#6EC800] text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Executive Recommendation
            </h3>
            <p className="text-lg font-medium mb-4">{executiveSummary.recommendation}</p>
            <p className="text-white/90 mb-4">{executiveSummary.businessRationale}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="text-white/80 text-sm">Current Fleet</div>
                <div className="text-2xl font-bold">{executiveSummary.currentFleetSize} vessels</div>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <div className="text-white/80 text-sm">Peak Requirement</div>
                <div className="text-2xl font-bold">{executiveSummary.peakVesselsNeeded} vessels</div>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="text-white/80 text-sm mb-1">Additional Vessels Needed</div>
              <div className="text-3xl font-bold">{executiveSummary.additionalVesselsRequired}</div>
              <div className="text-white/80 text-xs mt-1">
                Peak: {executiveSummary.peakDemandMonth}
              </div>
            </div>
          </div>
        </div>
        
        {executiveSummary.additionalVesselsRequired > 0 && (
          <div className="mt-4 p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="font-semibold">Financial Impact</span>
            </div>
            <div className="text-lg">
              Estimated annual cost: <span className="font-bold">
                ${(executiveSummary.estimatedCostImpact / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              Risk without action: {executiveSummary.operationalRiskWithoutAction}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Peak Vessels Required"
          value={`${executiveSummary.peakVesselsNeeded}`}
          trend={executiveSummary.peakVesselsNeeded - executiveSummary.currentFleetSize}
          isPositive={executiveSummary.additionalVesselsRequired === 0 ? true : null}
          color="blue"
        />
        <KPICard
          title="Current Fleet Size"
          value={`${executiveSummary.currentFleetSize} vessels`}
          trend={null}
          color="green"
        />
        <KPICard
          title="Peak Demand Month"
          value={executiveSummary.peakDemandMonth}
          trend={null}
          color="purple"
        />
        <KPICard
          title="Data Quality Score"
          value={`${executiveSummary.dataQualityScore}/100`}
          trend={executiveSummary.dataQualityScore - 80}
          isPositive={executiveSummary.dataQualityScore >= 80 ? true : false}
          color="orange"
        />
      </div>

      {/* Scenario Comparison Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00754F]" />
          MEAN vs EARLY Case Scenario Comparison
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* MEAN Case */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">MEAN Case (P50)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Vessels Needed:</span>
                <span className="font-semibold text-blue-900">{scenarioComparison.meanCase.totalVesselsNeeded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Peak Month:</span>
                <span className="font-semibold text-blue-900">{scenarioComparison.meanCase.peakMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Cost Estimate:</span>
                <span className="font-semibold text-blue-900">
                  ${(scenarioComparison.meanCase.costEstimate / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          {/* EARLY Case */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3">EARLY Case (P10)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-green-700">Vessels Needed:</span>
                <span className="font-semibold text-green-900">{scenarioComparison.earlyCase.totalVesselsNeeded}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Peak Month:</span>
                <span className="font-semibold text-green-900">{scenarioComparison.earlyCase.peakMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Cost Estimate:</span>
                <span className="font-semibold text-green-900">
                  ${(scenarioComparison.earlyCase.costEstimate / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          {/* Delta Analysis */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-3">Difference (Δ)</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-yellow-700">Vessels:</span>
                <span className={`font-semibold ${scenarioComparison.delta.vesselDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {scenarioComparison.delta.vesselDifference > 0 ? '+' : ''}{scenarioComparison.delta.vesselDifference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">Timeline:</span>
                <span className="font-semibold text-yellow-900 text-xs">
                  {scenarioComparison.delta.timelineDifference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">Cost Δ:</span>
                <span className={`font-semibold ${scenarioComparison.delta.costDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {scenarioComparison.delta.costDifference > 0 ? '+' : ''}${(scenarioComparison.delta.costDifference / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation Banner */}
        <div className={`p-4 rounded-lg border-2 ${
          scenarioComparison.recommendation === 'Plan for EARLY case' ? 'bg-red-50 border-red-200' :
          scenarioComparison.recommendation === 'Plan for MEAN case' ? 'bg-blue-50 border-blue-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-5 h-5 ${
              scenarioComparison.recommendation === 'Plan for EARLY case' ? 'text-red-600' :
              scenarioComparison.recommendation === 'Plan for MEAN case' ? 'text-blue-600' :
              'text-green-600'
            }`} />
            <span className="font-semibold text-gray-900">Strategic Recommendation:</span>
            <span className={`font-bold ${
              scenarioComparison.recommendation === 'Plan for EARLY case' ? 'text-red-700' :
              scenarioComparison.recommendation === 'Plan for MEAN case' ? 'text-blue-700' :
              'text-green-700'
            }`}>
              {scenarioComparison.recommendation}
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-2">{scenarioComparison.delta.riskAssessment}</p>
        </div>
      </div>

      {/* Data Foundation & Assumptions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00754F]" />
            Data Foundation & Assumptions
          </h3>
          <button
            onClick={() => setShowDataFoundation(!showDataFoundation)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            {showDataFoundation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDataFoundation ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {showDataFoundation && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Key Assumptions</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {executiveSummary.keyAssumptions.map((assumption, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-[#00754F] font-bold">•</span>
                      {assumption}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Analysis Quality</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Quality Score:</span>
                    <span className="font-semibold">{executiveSummary.dataQualityScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confidence Level:</span>
                    <span className="font-semibold">{executiveSummary.confidenceLevel}</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 mt-3">
                    <div className="text-xs text-gray-500 mb-1">Calculation Method:</div>
                    <div className="text-sm text-gray-700">
                      Rig Demand (8.2/month) × Activity Multipliers ÷ Vessel Capability (6.5/month)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VesselForecastDashboard;