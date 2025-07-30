import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Ship, Anchor, BarChart3, TrendingUp, Settings } from 'lucide-react';
import KPICard from './KPICard';
import StatusDashboard from './StatusDashboard';
import SmartFilterBar from './SmartFilterBar';
import { 
  calculateVesselRequirements, 
  generateVesselRequirementReport,
  VesselRequirementSummary
} from '../../utils/vesselRequirementCalculator';

interface VesselRequirementDashboardProps {
  className?: string;
  onNavigateToUpload?: () => void;
}

// Core fleet baseline - BP's standard operational fleet
const CORE_FLEET_BASELINE = 9;

const VesselRequirementDashboard: React.FC<VesselRequirementDashboardProps> = ({ className, onNavigateToUpload }) => {
  const { voyageList, vesselManifests, voyageEvents, isDataReady } = useData();
  const [summary, setSummary] = useState<VesselRequirementSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Filters state - matching the drilling dashboard pattern
  const [filters, setFilters] = useState(() => ({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations',
    capacityMode: 'REALISTIC' as 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC'
  }));

  // Get filter options using the same pattern as drilling dashboard
  const filterOptions = useMemo(() => {
    // Create month options with proper chronological sorting from actual data
    const monthMap = new Map<string, string>();
    
    // Add months from voyage list
    voyageList.forEach(voyage => {
      if (voyage.startDate && voyage.startDate instanceof Date && !isNaN(voyage.startDate.getTime())) {
        const monthKey = `${voyage.startDate.getFullYear()}-${String(voyage.startDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = voyage.startDate.toLocaleString('en-US', { month: 'long' });
        const label = `${monthName} ${voyage.startDate.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });
    
    // Add months from vessel manifests
    vesselManifests.forEach(manifest => {
      if (manifest.manifestDate && manifest.manifestDate instanceof Date && !isNaN(manifest.manifestDate.getTime())) {
        const manifestDate = manifest.manifestDate;
        const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = manifestDate.toLocaleString('en-US', { month: 'long' });
        const label = `${monthName} ${manifestDate.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });

    // Sort months chronologically
    const sortedMonths = Array.from(monthMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([_, label]) => label);

    // Location options - extracted from voyage list destinations
    const locationSet = new Set<string>();
    voyageList.forEach(voyage => {
      voyage.locationList.forEach(location => {
        if (location && location.toLowerCase() !== 'fourchon' && !location.toLowerCase().includes('port')) {
          locationSet.add(location.trim());
        }
      });
    });

    return {
      months: ['All Months', 'YTD', ...sortedMonths],
      locations: ['All Locations', ...Array.from(locationSet).sort()]
    };
  }, [voyageList, vesselManifests]);

  // Calculate vessel requirements when data is available or filters change
  useEffect(() => {
    if (isDataReady && voyageList.length > 0 && vesselManifests.length > 0 && voyageEvents.length > 0) {
      setIsCalculating(true);
      try {
        // Prepare date filter based on selected month
        let dateFilter: { startDate?: Date; endDate?: Date; monthFilter?: number } | undefined;
        
        if (filters.selectedMonth === 'YTD') {
          // YTD filter
          dateFilter = {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-06-30')
          };
        } else if (filters.selectedMonth === 'All Months') {
          // Default to YTD 2025 for vessel requirements analysis
          dateFilter = {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-06-30')
          };
        } else {
          // Parse specific month
          const [monthName, year] = filters.selectedMonth.split(' ');
          if (monthName && year) {
            const monthNum = new Date(`${monthName} 1, ${year}`).getMonth();
            dateFilter = { monthFilter: monthNum + 1 }; // Convert to 1-based month
          }
        }
          
        const result = calculateVesselRequirements(
          voyageList, 
          vesselManifests, 
          voyageEvents, 
          dateFilter, 
          filters.capacityMode
        );
        setSummary(result);
      } catch (error) {
        console.error('Error calculating vessel requirements:', error);
      } finally {
        setIsCalculating(false);
      }
    }
  }, [voyageList, vesselManifests, voyageEvents, isDataReady, filters]);

  // Calculate record counts for filter bar
  const recordCounts = useMemo(() => {
    const totalRecords = voyageList.length + vesselManifests.length + voyageEvents.length;
    
    // Apply filters to calculate filtered record count
    let filteredVoyages = voyageList;
    let filteredManifests = vesselManifests;
    let filteredEvents = voyageEvents;

    // Filter by month
    if (filters.selectedMonth && filters.selectedMonth !== 'All Months') {
      const isYTD = filters.selectedMonth === 'YTD';
      const currentYear = new Date().getFullYear();
      
      if (isYTD) {
        filteredVoyages = voyageList.filter(voyage => 
          voyage.startDate && voyage.startDate.getFullYear() === currentYear
        );
        filteredManifests = vesselManifests.filter(manifest => 
          manifest.manifestDate && manifest.manifestDate.getFullYear() === currentYear
        );
        filteredEvents = voyageEvents.filter(event => 
          event.eventDate && event.eventDate.getFullYear() === currentYear
        );
      } else {
        // Parse month from format "January 2024"
        const [monthName, yearStr] = filters.selectedMonth.split(' ');
        const year = parseInt(yearStr);
        const month = new Date(`${monthName} 1, ${year}`).getMonth();
        
        filteredVoyages = voyageList.filter(voyage => {
          if (!voyage.startDate) return false;
          return voyage.startDate.getFullYear() === year && voyage.startDate.getMonth() === month;
        });
        
        filteredManifests = vesselManifests.filter(manifest => {
          if (!manifest.manifestDate) return false;
          return manifest.manifestDate.getFullYear() === year && manifest.manifestDate.getMonth() === month;
        });
        
        filteredEvents = voyageEvents.filter(event => {
          if (!event.eventDate) return false;
          return event.eventDate.getFullYear() === year && event.eventDate.getMonth() === month;
        });
      }
    }

    // Filter by location
    if (filters.selectedLocation && filters.selectedLocation !== 'All Locations') {
      filteredVoyages = filteredVoyages.filter(voyage => 
        voyage.locationList.some(loc => loc && loc.toLowerCase().includes(filters.selectedLocation.toLowerCase()))
      );
      filteredManifests = filteredManifests.filter(manifest => 
        manifest.offshoreLocation && manifest.offshoreLocation.toLowerCase().includes(filters.selectedLocation.toLowerCase())
      );
      filteredEvents = filteredEvents.filter(event => 
        event.location && event.location.toLowerCase().includes(filters.selectedLocation.toLowerCase())
      );
    }

    const filteredRecords = filteredVoyages.length + filteredManifests.length + filteredEvents.length;
    
    return {
      totalRecords,
      filteredRecords
    };
  }, [voyageList, vesselManifests, voyageEvents, filters]);

  // Export functions
  const handleExportReport = () => {
    if (!summary) return;
    
    const report = generateVesselRequirementReport(summary);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vessel-requirement-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (!isDataReady || isCalculating) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Vessel Requirements</h3>
          <p className="text-gray-600">Analyzing vessel capacity and demand patterns...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
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

  // Calculate metrics for KPI cards
  const baselineGap = summary.totalRecommendedVessels - CORE_FLEET_BASELINE;
  const utilizationRate = summary.overallUtilization;
  const sharingEfficiency = summary.vesselSharingAnalysis.vesselSharingEfficiency.efficiencyGain;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Smart Filter Bar */}
        <SmartFilterBar
          timeFilter={filters.selectedMonth}
          locationFilter={filters.selectedLocation}
          onTimeChange={(value: string) => setFilters(prev => ({ ...prev, selectedMonth: value }))}
          onLocationChange={(value: string) => setFilters(prev => ({ ...prev, selectedLocation: value }))}
          timeOptions={filterOptions.months.map(month => ({ value: month, label: month }))}
          locationOptions={filterOptions.locations.map(location => ({ value: location, label: location }))}
          totalRecords={recordCounts.totalRecords}
          filteredRecords={recordCounts.filteredRecords}
        />

        {/* Enhanced Status Dashboard */}
        <StatusDashboard
          title="Vessel Requirements Analysis" 
          subtitle="Data-driven fleet sizing based on operational demand and manifest patterns"
          overallStatus={
            baselineGap > 2 ? 'poor' :
            baselineGap > 0 ? 'fair' : 
            utilizationRate < 70 ? 'good' : 'excellent'
          }
          heroMetrics={[
            {
              title: "Current Fleet",
              value: summary.currentVesselCount,
              unit: "vessels",
              trend: 0,
              isPositive: true,
              contextualHelp: "Current number of active PSV/OSV vessels identified from voyage data. Based on contract vessel filtering to show only BP-contracted fleet."
            },
            {
              title: "Recommended Fleet",
              value: summary.totalRecommendedVessels,
              unit: "vessels",
              trend: baselineGap > 0 ? ((baselineGap / CORE_FLEET_BASELINE) * 100) : 0,
              isPositive: baselineGap <= 0,
              contextualHelp: `Recommended fleet size based on actual delivery capacity demand using ${filters.capacityMode.toLowerCase()} assumptions (${summary.deliveryCapacityRequirements.capacityAssumptions.voyagesPerMonth} voyages/month per vessel). Calculated from ${summary.actualVoyageCount} actual voyages and ${summary.totalVoyages} port calls.`
            },
            {
              title: "Fleet Utilization",
              value: utilizationRate.toFixed(1),
              unit: "%",
              target: 75,
              trend: 0,
              isPositive: utilizationRate >= 70,
              contextualHelp: "Overall fleet utilization based on vessel-hours used versus available capacity. Higher utilization indicates more efficient fleet deployment."
            },
            {
              title: "Vessel Sharing Efficiency",
              value: sharingEfficiency.toFixed(1),
              unit: "%",
              trend: 0,
              isPositive: sharingEfficiency > 0,
              contextualHelp: `${summary.vesselSharingAnalysis.sharingPercentage.toFixed(1)}% of voyages serve multiple locations. Multi-location voyages reduce total vessel requirements by ${sharingEfficiency.toFixed(1)}%.`
            },
            {
              title: "Active Rigs",
              value: summary.totalRigs,
              unit: "locations",
              trend: 0,
              isPositive: true,
              contextualHelp: `Number of active rig locations with vessel activity during ${summary.analysisDateRange.periodDescription}. Includes drilling and production facilities.`
            }
          ]}
          onViewDetails={onNavigateToUpload}
        />

        {/* Fleet Size Comparison - Visual Overview */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Fleet Size Analysis</h3>
              <p className="text-sm text-gray-600">
                Delivery capacity-based fleet sizing using {summary.analysisDateRange.periodDescription} operational data
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Core Baseline: {CORE_FLEET_BASELINE} vessels</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Current Fleet"
              value={summary.currentVesselCount}
              unit="vessels"
              color="blue"
              variant="secondary"
              contextualHelp="Active PSV/OSV vessels from contract fleet analysis. Based on actual vessel activity in voyage data."
            />
            
            <KPICard
              title="Core Baseline"
              value={CORE_FLEET_BASELINE}
              unit="vessels"
              color="green"
              variant="secondary"
              contextualHelp="BP's standard operational fleet size for GoA operations. Used as reference point for capacity planning."
            />
            
            <KPICard
              title="Recommended"
              value={summary.totalRecommendedVessels}
              unit="vessels"
              color={baselineGap > 0 ? "orange" : baselineGap < 0 ? "blue" : "green"}
              trend={baselineGap !== 0 ? ((baselineGap / CORE_FLEET_BASELINE) * 100) : 0}
              isPositive={baselineGap <= 0}
              variant="secondary"
              contextualHelp={`Delivery capacity-based recommendation using actual operational demand (${summary.actualVoyageCount} voyages, ${summary.totalVoyages} port calls) with ${filters.capacityMode.toLowerCase()} vessel capacity assumptions. ${baselineGap > 0 ? `${baselineGap.toFixed(1)} vessels above baseline` : baselineGap < 0 ? `${Math.abs(baselineGap).toFixed(1)} vessels below baseline` : 'Matches baseline'}.`}
            />
          </div>

          {/* Gap Analysis Summary */}
          <div className={`mt-6 p-4 rounded-lg ${
            baselineGap > 0 ? 'bg-orange-50 border border-orange-200' : 
            baselineGap < 0 ? 'bg-blue-50 border border-blue-200' : 
            'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                baselineGap > 0 ? 'bg-orange-100' : 
                baselineGap < 0 ? 'bg-blue-100' : 
                'bg-green-100'
              }`}>
                <TrendingUp className={`w-4 h-4 ${
                  baselineGap > 0 ? 'text-orange-600' : 
                  baselineGap < 0 ? 'text-blue-600' : 
                  'text-green-600'
                }`} />
              </div>
              <div>
                <h4 className={`font-semibold ${
                  baselineGap > 0 ? 'text-orange-700' : 
                  baselineGap < 0 ? 'text-blue-700' : 
                  'text-green-700'
                }`}>
                  {baselineGap > 0 ? 'Additional Capacity Needed' : 
                   baselineGap < 0 ? 'Potential Overcapacity' : 
                   'Optimal Fleet Size'}
                </h4>
                <p className="text-sm text-gray-600">
                  {baselineGap > 0 ? `Recommend adding ${baselineGap.toFixed(1)} vessel${baselineGap > 1 ? 's' : ''} to meet operational demand` : 
                   baselineGap < 0 ? `Current fleet may be ${Math.abs(baselineGap).toFixed(1)} vessel${Math.abs(baselineGap) > 1 ? 's' : ''} above requirement` : 
                   'Current recommended fleet size aligns with baseline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators - FIXED: Clear distinction between voyages and deliveries */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            title="Actual Voyages"
            value={summary.actualVoyageCount}
            subtitle="Unique voyages (no double counting)"
            color="blue"
            variant="secondary"
            contextualHelp={`Total number of unique PSV/OSV voyages from ${summary.analysisDateRange.periodDescription}. Each voyage counted once regardless of multiple locations served.`}
          />

          <KPICard
            title="Delivery Capability"
            value={summary.totalVoyages}
            subtitle="Total offshore port calls"
            color="green"
            variant="secondary"
            contextualHelp={`Total offshore delivery capability: ${summary.totalVoyages} port calls from ${summary.actualVoyageCount} voyages. Higher than voyage count when vessels serve multiple locations per trip.`}
          />

          <KPICard
            title="Fleet Efficiency"
            value={`${summary.deliveryCapability.fleetEfficiencyVsBaseline}%`}
            subtitle="vs 9-vessel baseline"
            color="orange"
            variant="secondary"
            contextualHelp={`Current fleet efficiency compared to 9-vessel baseline. ${summary.deliveryCapability.totalActiveVessels} active vessels averaging ${summary.deliveryCapability.actualAverageDeliveriesPerVessel} deliveries each vs theoretical ${summary.deliveryCapability.theoreticalDeliveriesPerVessel}.`}
          />

          <KPICard
            title="Multi-Delivery Rate"
            value={`${((summary.deliveryCapability.multiDeliveryVoyages / summary.actualVoyageCount) * 100).toFixed(1)}%`}
            subtitle={`${summary.deliveryCapability.multiDeliveryVoyages} of ${summary.actualVoyageCount} voyages`}
            color="purple"
            variant="secondary"
            contextualHelp={`Percentage of voyages that deliver to multiple offshore locations. Multi-location voyages improve overall delivery efficiency without requiring additional vessels.`}
          />
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Analysis Configuration</h3>
              <p className="text-sm text-gray-600">Adjust capacity assumptions and view analysis options</p>
            </div>
            <Settings className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capacity Mode</label>
              <select 
                value={filters.capacityMode}
                onChange={(e) => setFilters(prev => ({ ...prev, capacityMode: e.target.value as 'CONSERVATIVE' | 'REALISTIC' | 'OPTIMISTIC' }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="CONSERVATIVE">Conservative (5.5 voyages/month)</option>
                <option value="REALISTIC">Realistic (6.0 voyages/month)</option>
                <option value="OPTIMISTIC">Optimistic (6.5 voyages/month)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Options</label>
              <button
                onClick={handleExportReport}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Export Report
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Details</label>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Period: {summary.analysisDateRange.periodDescription}</div>
                <div>Actual Voyages: {summary.actualVoyageCount}</div>
                <div>Port Calls: {summary.totalVoyages}</div>
                <div>Locations: {summary.totalRigs}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Capacity-Based Requirements - UPDATED */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delivery Capacity-Based Requirements</h3>
            <p className="text-sm text-gray-600">
              Vessel requirements calculated from actual operational demand and delivery patterns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Voyage-Based Need"
              value={summary.deliveryCapacityRequirements.vesselsNeededForVoyages}
              unit="vessels"
              subtitle={`${summary.deliveryCapacityRequirements.weeklyVoyages} voyages/week`}
              color="blue"
              variant="secondary"
              contextualHelp={`Vessels needed to handle ${summary.deliveryCapacityRequirements.weeklyVoyages} voyages per week based on ${summary.deliveryCapacityRequirements.voyagesPerVesselPerWeek} voyages per vessel per week capacity.`}
            />
            
            <KPICard
              title="Delivery-Based Need"
              value={summary.deliveryCapacityRequirements.vesselsNeededForDeliveries}
              unit="vessels"
              subtitle={`${summary.deliveryCapacityRequirements.weeklyDeliveries} deliveries/week`}
              color="purple"
              variant="secondary"
              contextualHelp={`Vessels needed for ${summary.deliveryCapacityRequirements.weeklyDeliveries} weekly deliveries, accounting for ${summary.deliveryCapacityRequirements.deliveriesPerVoyage} deliveries per voyage efficiency.`}
            />
            
            <KPICard
              title="Projected Utilization"
              value={`${summary.deliveryCapacityRequirements.projectedUtilization}%`}
              subtitle="With recommended fleet"
              color="green"
              variant="secondary"
              contextualHelp={`Expected fleet utilization if using ${summary.deliveryCapacityRequirements.recommendedVessels} vessels to meet current demand levels.`}
            />
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">Recommended Fleet Size (Data-Driven)</h4>
                <p className="text-sm text-green-700">
                  Based on actual delivery capacity: {summary.totalVoyages} port calls from {summary.actualVoyageCount} voyages
                  <br />
                  Capacity: {summary.deliveryCapacityRequirements.capacityAssumptions.voyagesPerMonth} voyages/month per vessel ({filters.capacityMode.toLowerCase()})
                </p>
              </div>
              <div className="text-3xl font-bold text-green-800">
                {summary.deliveryCapacityRequirements.recommendedVessels}
                <span className="text-lg font-normal text-green-600 ml-1">vessels</span>
              </div>
            </div>
          </div>
          
          {/* Comparison with Contract-Based */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mt-0.5">
                <span className="text-xs text-white font-bold">i</span>
              </div>
              <div className="text-sm text-amber-800">
                <p className="font-medium">Comparison with Contract-Based Estimate</p>
                <p className="text-xs mt-1">
                  Contract-based: {summary.contractRequirements.totalCalculatedRequirement} vessels | 
                  Delivery capacity-based: {summary.deliveryCapacityRequirements.recommendedVessels} vessels | 
                  Difference: {(summary.deliveryCapacityRequirements.recommendedVessels - summary.contractRequirements.totalCalculatedRequirement).toFixed(1)} vessels
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Locations Driving Requirements - FIXED: Clarified voyage counting */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Top Locations by Activity</h3>
              <p className="text-sm text-gray-600">
                Location visits by vessels (multi-location voyages counted per location served)
              </p>
            </div>
            <Anchor className="w-5 h-5 text-gray-400" />
          </div>
          
          {/* Warning about double counting */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center mt-0.5">
                <span className="text-xs text-white font-bold">!</span>
              </div>
              <div className="text-sm text-amber-800">
                <p className="font-medium">Location Visit Counting</p>
                <p className="text-xs mt-1">
                  Visits shown represent vessel stops at each location. Multi-location voyages are counted separately for each rig served, 
                  so totals may exceed the actual number of unique voyages ({summary.actualVoyageCount} total voyages).
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.rigAnalysis.slice(0, 6).map((rig, index) => {
              // Calculate activity percentage relative to actual voyages (not inflated totals)
              const activityPercentage = summary.actualVoyageCount > 0 
                ? ((rig.totalVoyages / summary.actualVoyageCount) * 100).toFixed(1)
                : '0.0';
              
              return (
                <div key={rig.rigCode} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{rig.rigCode}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {rig.totalVoyages} visits
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activityPercentage}% of fleet
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">{rig.rigLocation}</div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Vessels:</span>
                      <span className="font-medium ml-1">{rig.vesselCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Per Week:</span>
                      <span className="font-medium ml-1">{rig.weeklyVoyages.toFixed(1)}</span>
                    </div>
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

export default VesselRequirementDashboard;