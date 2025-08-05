import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Ship, TrendingUp } from 'lucide-react';
import KPICard from './KPICard';
import VesselDemandVisualizations from '../visualizations/VesselDemandVisualizations';
import { 
  calculateManifestBasedVesselRequirements,
  ManifestBasedVesselRequirementResult
} from '../../utils/vesselRequirementCalculator';

interface VesselRequirementDashboardProps {
  className?: string;
  onNavigateToUpload?: () => void;
}

const VesselRequirementDashboard: React.FC<VesselRequirementDashboardProps> = ({ className, onNavigateToUpload }) => {
  const { vesselManifests, isDataReady } = useData();
  const [manifestSummary, setManifestSummary] = useState<ManifestBasedVesselRequirementResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate vessel requirements when data is available
  useEffect(() => {
    if (isDataReady && vesselManifests.length > 0) {
      setIsCalculating(true);
      try {
        console.log('🚀 Using MANIFEST-BASED approach for vessel requirements');
        const manifestResult = calculateManifestBasedVesselRequirements(vesselManifests);
        setManifestSummary(manifestResult);
      } catch (error) {
        console.error('Error calculating vessel requirements:', error);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [vesselManifests, isDataReady]);

  // Loading state
  if (!isDataReady || isCalculating) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Vessel Requirements</h3>
          <p className="text-gray-600">Analyzing vessel capacity and demand patterns using manifest-based approach...</p>
        </div>
      </div>
    );
  }

  if (!manifestSummary) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Ship className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-600">No vessel requirement data available for the selected filters.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Ship className="w-8 h-8 text-blue-600" />
                Vessel Requirements Analysis
              </h1>
              <p className="text-gray-600 mt-2">
                Manifest-based approach using VesselManifests.xlsx with finalDepartment classification showing TOTAL monthly demand across all 6 drilling locations
              </p>
            </div>
          </div>
        </div>

        {/* Manifest-Based Results Section */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Vessel Demand Breakdown</h3>
              <p className="text-sm text-gray-600">
                Complete breakdown of vessel requirements by demand type: drilling operations, internal production, outsourced services, and warehouse operations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                Analysis Period: {manifestSummary.analysisDateRange.startDate} to {manifestSummary.analysisDateRange.endDate}
              </span>
            </div>
          </div>

          {/* Vessel Demand Breakdown KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <KPICard
              title="Total Drilling Demand"
              value={manifestSummary.totalDrillingDemand.toFixed(1)}
              unit="deliveries/month"
              color="blue"
              variant="secondary"
              contextualHelp={`${manifestSummary.totalDrillingDemand.toFixed(1)} total monthly deliveries across all 6 drilling locations based on actual manifest data`}
            />
            
            <KPICard
              title="Production Demand"
              value="1.50"
              unit="vessels/month"
              color="green"
              variant="secondary"
              contextualHelp={`Total production requirement: 1.5 vessels/month (minus 0.25 outsourced = ${manifestSummary.internalProductionDemand.toFixed(2)} internal)`}
            />
            
            <KPICard
              title="Outsourced Production"
              value={manifestSummary.outsourcedProduction.toFixed(2)}
              unit="vessels/month"
              color="orange"
              variant="secondary"
              contextualHelp={`Chevron delivering Atlantis cargo: ${manifestSummary.outsourcedProduction} vessels per month (handled externally)`}
            />
            
            <KPICard
              title="Mad Dog Warehouse"
              value={manifestSummary.madDogWarehouse.toFixed(1)}
              unit="vessels/month"
              color="purple"
              variant="secondary"
              contextualHelp={`Mad Dog Warehouse operations: ${manifestSummary.madDogWarehouse} vessel per month dedicated requirement`}
            />
            
            <KPICard
              title="Recommended Total Vessels"
              value={manifestSummary.recommendedTotalVessels.toFixed(1)}
              unit="vessels/month"
              color="red"
              variant="secondary"
              contextualHelp={`Total vessels needed: ${Math.ceil(manifestSummary.totalDrillingDemand / manifestSummary.averageVesselCapability)} drilling + ${Math.ceil(manifestSummary.totalProductionDemand / manifestSummary.averageVesselCapability)} production + ${Math.ceil(manifestSummary.madDogWarehouse / manifestSummary.averageVesselCapability)} Mad Dog = ${manifestSummary.recommendedTotalVessels} vessels (based on ${manifestSummary.averageVesselCapability.toFixed(1)} deliveries/vessel capability, excludes ${manifestSummary.outsourcedProduction} outsourced)`}
            />
          </div>

          {/* Requirements Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-blue-800">Drilling Vessels Needed</h5>
                  <p className="text-2xl font-bold text-blue-900">{manifestSummary.drillingVesselsNeeded}</p>
                  <p className="text-xs text-blue-700">vessels</p>
                </div>
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-700" />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">For {manifestSummary.totalDrillingDemand.toFixed(1)} total deliveries/month across 6 drilling locations</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-green-800">Production Vessels Needed</h5>
                  <p className="text-2xl font-bold text-green-900">{manifestSummary.productionVesselsNeeded}</p>
                  <p className="text-xs text-green-700">vessels</p>
                </div>
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                  <Ship className="w-4 h-4 text-green-700" />
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">For {manifestSummary.internalProductionDemand.toFixed(1)} internal vessels/month</p>
            </div>

            <div className={`rounded-lg p-4 border ${manifestSummary.vesselGap > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h5 className={`font-medium ${manifestSummary.vesselGap > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    {manifestSummary.vesselGap > 0 ? 'Additional Needed' : 'Current Status'}
                  </h5>
                  <p className={`text-2xl font-bold ${manifestSummary.vesselGap > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {manifestSummary.vesselGap > 0 ? `+${manifestSummary.vesselGap}` : 'Sufficient'}
                  </p>
                  <p className={`text-xs ${manifestSummary.vesselGap > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {manifestSummary.vesselGap > 0 ? 'vessels' : 'capacity'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${manifestSummary.vesselGap > 0 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <TrendingUp className={`w-4 h-4 ${manifestSummary.vesselGap > 0 ? 'text-red-700' : 'text-green-700'}`} />
                </div>
              </div>
              <p className={`text-xs mt-2 ${manifestSummary.vesselGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {manifestSummary.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Analysis Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Data Source</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Total manifests analyzed: {manifestSummary.totalManifests}</li>
                <li>• Drilling manifests: {manifestSummary.drillingManifests}</li>
                <li>• Production manifests: {manifestSummary.productionManifests}</li>
                <li>• Analysis period: {manifestSummary.analysisDateRange.monthsCovered} months</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Key Findings</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Total drilling demand (6 locations): {manifestSummary.totalDrillingDemand.toFixed(1)} deliveries/month</li>
                <li>• Average per drilling location: {(manifestSummary.totalDrillingDemand / 6).toFixed(1)} deliveries/month</li>
                <li>• Production demand: {manifestSummary.totalProductionDemand.toFixed(1)} deliveries/month</li>
                <li>• Current active vessels: {manifestSummary.currentActiveVessels}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enhanced Visualizations Section */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Advanced Analytics & Visualizations
              </h3>
              <p className="text-sm text-gray-600">
                Interactive charts and analysis based on manifest-driven demand and capability data
              </p>
            </div>
          </div>

          <VesselDemandVisualizations
            locationDemands={manifestSummary.locationDemands}
            vesselCapabilities={manifestSummary.vesselCapabilities}
            totalMonthlyDemand={manifestSummary.totalDrillingDemand}
            averageVesselCapability={manifestSummary.averageVesselCapability}
            currentFleetSize={manifestSummary.currentActiveVessels}
            requiredVessels={manifestSummary.totalVesselsNeeded}
            averageDrillingDemand={manifestSummary.totalDrillingDemand}
            averageProductionDemand={manifestSummary.actualProductionDemand}
          />
        </div>

      </div>
    </div>
  );
};

export default VesselRequirementDashboard;