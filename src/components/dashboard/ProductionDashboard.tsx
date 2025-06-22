import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getProductionFacilities } from '../../data/masterFacilities';
import { Clock, Ship, Droplet, BarChart3 } from 'lucide-react';
import KPICard from './KPICard';
import StatusDashboard from './StatusDashboard';
import SmartFilterBar from './SmartFilterBar';
import { 
  calculateEnhancedKPIMetrics,
  calculateEnhancedManifestMetrics,
  calculateEnhancedVoyageEventMetrics,
  calculateEnhancedBulkFluidMetrics
} from '../../utils/metricsCalculation';
import { validateDataIntegrity } from '../../utils/dataIntegrityValidator';
import { deduplicateBulkActions, getProductionFluidMovements } from '../../utils/bulkFluidDeduplicationEngine';
import { 
  calculateProductionOperationalVariance, 
  calculateProductionSupportVariance 
} from '../../utils/statisticalVariance';
import { 
  ProductionOperationalVarianceDashboard, 
  ProductionSupportVarianceDashboard 
} from './VarianceAnalysisComponents';
import { formatSmartCurrency } from '../../utils/formatters';
import MonthlyVesselCostChart from './MonthlyVesselCostChart';

interface ProductionDashboardProps {
  onNavigateToUpload?: () => void;
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    voyageList,
    bulkActions,
    isDataReady
  } = useData();

  // Get filter options first to determine default month
  const initialFilterOptions = useMemo(() => {
    // Create month options with proper chronological sorting from actual data
    const monthMap = new Map<string, string>();
    
    // Add months from voyage events - using eventDate as primary source
    voyageEvents.forEach(event => {
      if (event.eventDate && event.eventDate instanceof Date && !isNaN(event.eventDate.getTime())) {
        const monthKey = `${event.eventDate.getFullYear()}-${String(event.eventDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = event.eventDate.toLocaleString('en-US', { month: 'long' });
        const label = `${monthName} ${event.eventDate.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });
    
    // Add months from vessel manifests - using manifestDate 
    vesselManifests.forEach(manifest => {
      if (manifest.manifestDate && manifest.manifestDate instanceof Date && !isNaN(manifest.manifestDate.getTime())) {
        const manifestDate = manifest.manifestDate;
        const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = manifestDate.toLocaleString('en-US', { month: 'long' });
        const label = `${monthName} ${manifestDate.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });

    // Sort months chronologically and convert to array
    const sortedMonths = Array.from(monthMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([_, label]) => label);

    return sortedMonths;
  }, [voyageEvents, vesselManifests]);

  // Get default month (latest available data with 1-month lag)
  const getDefaultMonth = useMemo(() => {
    if (initialFilterOptions.length === 0) return 'All Months';
    
    // Return the latest month available (already sorted chronologically)
    return initialFilterOptions[initialFilterOptions.length - 1] || 'All Months';
  }, [initialFilterOptions]);

  // Filters state - with smart default month selection
  const [filters, setFilters] = useState(() => ({
    selectedMonth: 'All Months', // Will be updated in useEffect
    selectedLocation: 'All Locations'
  }));

  // Update default month when data loads (only on initial load)
  const [hasInitialized, setHasInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!hasInitialized && getDefaultMonth !== 'All Months' && filters.selectedMonth === 'All Months') {
      setFilters(prev => ({ ...prev, selectedMonth: getDefaultMonth }));
      setHasInitialized(true);
    }
  }, [getDefaultMonth, filters.selectedMonth, hasInitialized]);

  // Calculate previous period metrics for trend analysis
  const previousPeriodMetrics = useMemo(() => {
    try {
      // Early return if no data
      if (!isDataReady) {
        return {
          cargo: { totalCargoTons: 0, cargoTonnagePerVisit: 0 },
          lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
          hours: { totalOSVHours: 0, totalProductiveHours: 0 },
          costs: { totalVesselCost: 0 },
          bulk: { totalBulkVolume: 0 },
          utilization: { transitTimeHours: 0 }
        };
      }

      // Determine previous period based on current filter
      let previousFilterMonth: number | undefined;
      let previousFilterYear: number | undefined;

      if (filters.selectedMonth === 'YTD') {
        // For YTD, compare to previous year
        const currentYear = new Date().getFullYear();
        previousFilterYear = currentYear - 1;
      } else if (filters.selectedMonth !== 'All Months') {
        // For specific month, get previous month
        const [monthName, yearStr] = filters.selectedMonth.split(' ');
        const currentYear = parseInt(yearStr);
        const currentMonth = new Date(Date.parse(monthName + " 1, 2000")).getMonth();
        
        if (currentMonth === 0) {
          // January - go to December of previous year
          previousFilterMonth = 11;
          previousFilterYear = currentYear - 1;
        } else {
          // Any other month - go to previous month
          previousFilterMonth = currentMonth - 1;
          previousFilterYear = currentYear;
        }
      }

      // Calculate previous period metrics using enhanced calculations
      const prevEnhancedKPIs = calculateEnhancedKPIMetrics(
        voyageEvents,
        vesselManifests,
        voyageList,
        costAllocation,
        bulkActions,
        'Production', // Department filter
        previousFilterMonth,
        previousFilterYear,
        filters.selectedLocation
      );

      const prevManifestMetrics = calculateEnhancedManifestMetrics(
        vesselManifests,
        costAllocation,
        previousFilterMonth,
        previousFilterYear,
        'Production',
        filters.selectedLocation
      );

      const prevVoyageMetrics = calculateEnhancedVoyageEventMetrics(
        voyageEvents,
        costAllocation,
        previousFilterMonth,
        previousFilterYear,
        'Production',
        filters.selectedLocation
      );

      const prevBulkMetrics = calculateEnhancedBulkFluidMetrics(
        bulkActions,
        previousFilterMonth,
        previousFilterYear,
        'Production',
        filters.selectedLocation
      );

      return {
        cargo: {
          totalCargoTons: prevManifestMetrics.totalCargoTons,
          cargoTonnagePerVisit: prevManifestMetrics.cargoTonnagePerVisit
        },
        lifts: {
          totalLifts: prevManifestMetrics.totalLifts,
          liftsPerHour: prevVoyageMetrics.productiveHours > 0 ? prevManifestMetrics.totalLifts / prevVoyageMetrics.productiveHours : 0,
          vesselVisits: prevManifestMetrics.uniqueManifests
        },
        hours: {
          totalOSVHours: prevVoyageMetrics.totalHours,
          totalProductiveHours: prevVoyageMetrics.productiveHours
        },
        costs: {
          totalVesselCost: prevEnhancedKPIs.totalVesselCost
        },
        bulk: {
          totalBulkVolume: prevBulkMetrics.totalFluidVolume || 0
        },
        utilization: {
          transitTimeHours: prevVoyageMetrics.transitTime || 0
        }
      };
    } catch (error) {
      console.error('❌ Error calculating previous period metrics:', error);
      return {
        cargo: { totalCargoTons: 0, cargoTonnagePerVisit: 0 },
        lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
        hours: { totalOSVHours: 0, totalProductiveHours: 0 },
        costs: { totalVesselCost: 0 },
        bulk: { totalBulkVolume: 0 },
        utilization: { transitTimeHours: 0 }
      };
    }
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions, filters, isDataReady]);

  // Calculate production-specific KPIs using enhanced infrastructure
  const productionMetrics = useMemo(() => {
    try {
      // Early return if no data
      if (!isDataReady) {
        console.log('📊 No data available for production metrics calculation');
        return {
          cargo: { totalCargoTons: 0, cargoTonnagePerVisit: 0, rtPercentage: 0, outboundPercentage: 0 },
          lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
          hours: { totalOSVHours: 0, totalProductiveHours: 0, productiveHoursPercentage: 0, averageTripDuration: 0 },
          costs: { totalVesselCost: 0, costPerTon: 0, costPerHour: 0 },
          utilization: { vesselUtilization: 0, transitTimeHours: 0, atLocationHours: 0 },
          bulk: { totalBulkVolume: 0, uniqueBulkTypes: 0, productionChemicalVolume: 0 },
          integrityScore: 0,
          validationSummary: { criticalIssues: 0, warnings: 0, recommendations: [] }
        };
      }

      console.log('📊 Starting enhanced production metrics calculation with data:', {
        voyageEvents: voyageEvents.length,
        vesselManifests: vesselManifests.length,
        voyageList: voyageList.length,
        costAllocation: costAllocation.length,
        bulkActions: bulkActions.length,
        selectedMonth: filters.selectedMonth,
        selectedLocation: filters.selectedLocation,
        isDataReady
      });
      
      // Parse filter values for enhanced calculations
      let filterMonth: number | undefined;
      let filterYear: number | undefined;
      let isYTD = false;
      
      if (filters.selectedMonth === 'YTD') {
        // Year to Date - filter to current year
        const now = new Date();
        filterYear = now.getFullYear();
        isYTD = true;
      } else if (filters.selectedMonth !== 'All Months') {
        const [monthName, yearStr] = filters.selectedMonth.split(' ');
        filterYear = parseInt(yearStr);
        filterMonth = new Date(Date.parse(monthName + " 1, 2000")).getMonth();
      }
      
      console.log('🔍 FILTER DEBUG - Parsed filter values:', {
        selectedMonth: filters.selectedMonth,
        selectedLocation: filters.selectedLocation,
        parsedFilterMonth: filterMonth,
        parsedFilterYear: filterYear,
        isYTD: isYTD
      });

      // Calculate enhanced KPIs using bulletproof infrastructure
      const enhancedKPIs = calculateEnhancedKPIMetrics(
        voyageEvents,
        vesselManifests,
        voyageList,
        costAllocation,
        bulkActions,
        'Production', // Department filter for production operations
        filterMonth,
        filterYear,
        filters.selectedLocation
      );

      const manifestMetrics = calculateEnhancedManifestMetrics(
        vesselManifests,
        costAllocation,
        filterMonth,
        filterYear,
        'Production',
        filters.selectedLocation
      );

      const voyageMetrics = calculateEnhancedVoyageEventMetrics(
        voyageEvents,
        costAllocation,
        filterMonth,
        filterYear,
        'Production',
        filters.selectedLocation
      );

      const bulkMetrics = calculateEnhancedBulkFluidMetrics(
        bulkActions,
        filterMonth,
        filterYear,
        'Production',
        filters.selectedLocation
      );

      // Data integrity validation for production operations
      const integrityReport = validateDataIntegrity(
        voyageEvents,
        vesselManifests,
        costAllocation,
        bulkActions,
        voyageList
      );

      // Enhanced production fluid intelligence using deduplication engine
      let fluidIntelligence = {
        totalTransfers: 0,
        totalVolume: 0,
        fluidTypes: 0,
        productionChemicals: { operations: 0, volume: 0 },
        utilityFluids: { operations: 0, volume: 0 }
      };

      if (bulkActions && bulkActions.length > 0) {
        // Filter bulk actions by time, location, and production operations
        let filteredBulkActions = bulkActions;
        
        console.log('🔍 BULK ACTIONS FILTERING START:', {
          totalBulkActions: bulkActions.length,
          filters: { selectedMonth: filters.selectedMonth, selectedLocation: filters.selectedLocation },
          parsedFilters: { filterMonth, filterYear, isYTD }
        });
        
        // Apply time filtering (YTD or specific month)
        if (isYTD && filterYear !== undefined) {
          filteredBulkActions = filteredBulkActions.filter(action => {
            return action.startDate.getFullYear() === filterYear;
          });
          console.log('🔍 AFTER TIME FILTERING (YTD):', filteredBulkActions.length);
        } else if (filterMonth !== undefined && filterYear !== undefined) {
          filteredBulkActions = filteredBulkActions.filter(action => {
            return action.startDate.getMonth() === filterMonth && action.startDate.getFullYear() === filterYear;
          });
          console.log('🔍 AFTER TIME FILTERING (SPECIFIC MONTH):', filteredBulkActions.length);
        }
        
        // Filter for production operations only
        filteredBulkActions = filteredBulkActions.filter(action => {
          // Must be production chemical or utility fluid (not drilling/completion)
          const isProductionFluid = !action.isDrillingFluid && !action.isCompletionFluid;
          
          // Exclude fuel/diesel/drillwater - these are not production chemicals
          const bulkType = (action.bulkType || '').toLowerCase();
          const fluidType = (action.fluidSpecificType || '').toLowerCase();
          const isDrillingFluid = bulkType.includes('diesel') || 
                                 bulkType.includes('drillwater') ||
                                 bulkType.includes('fuel') ||
                                 bulkType.includes('gas oil') ||
                                 bulkType.includes('marine gas oil') ||
                                 bulkType.includes('mgo') ||
                                 fluidType.includes('diesel') ||
                                 fluidType.includes('drillwater') ||
                                 fluidType.includes('fuel') ||
                                 fluidType.includes('gas oil');
          
          // Only include OFFLOAD operations to avoid double-counting
          const isRelevantOperation = action.action === 'offload';
          // Must be to a production platform/rig (offshore locations)
          const isPlatformDestination = action.portType === 'rig';
          
          return isProductionFluid && !isDrillingFluid && isRelevantOperation && isPlatformDestination;
        });
        
        console.log('🔍 AFTER PRODUCTION FILTERING (excluding fuel):', filteredBulkActions.length);
        
        // Debug: Show sample of fluid types being included and excluded
        const sampleIncludedFluids = filteredBulkActions.slice(0, 10).map(action => ({
          bulkType: action.bulkType,
          fluidSpecificType: action.fluidSpecificType,
          volumeBbls: action.volumeBbls,
          isDrillingFluid: action.isDrillingFluid,
          isCompletionFluid: action.isCompletionFluid
        }));
        
        const excludedFuelActions = bulkActions.filter(action => {
          const bulkType = (action.bulkType || '').toLowerCase();
          const fluidType = (action.fluidSpecificType || '').toLowerCase();
          return bulkType.includes('diesel') || 
                 bulkType.includes('fuel') ||
                 bulkType.includes('gas oil') ||
                 fluidType.includes('diesel') ||
                 fluidType.includes('fuel');
        });
        
        console.log('🚫 EXCLUDED FUEL ACTIONS:', {
          count: excludedFuelActions.length,
          totalVolumeExcluded: excludedFuelActions.reduce((sum, a) => sum + (a.volumeBbls || 0), 0),
          sampleTypes: [...new Set(excludedFuelActions.map(a => a.bulkType || a.fluidSpecificType))].slice(0, 5)
        });
        
        console.log('✅ INCLUDED PRODUCTION FLUIDS:', {
          count: sampleIncludedFluids.length,
          sampleTypes: [...new Set(sampleIncludedFluids.map(a => a.bulkType || a.fluidSpecificType))].slice(0, 10)
        });
        
        // Apply location filtering if selected
        if (filters.selectedLocation !== 'All Locations') {
          const selectedFacility = getProductionFacilities().find(
            f => f.displayName === filters.selectedLocation
          );
          
          if (selectedFacility) {
            filteredBulkActions = filteredBulkActions.filter(action => {
              const destinationPort = action.destinationPort?.toLowerCase().trim() || '';
              const facilityLocationName = selectedFacility.locationName.toLowerCase();
              const facilityDisplayName = selectedFacility.displayName.toLowerCase();
              
              return destinationPort.includes(facilityLocationName) || 
                     destinationPort.includes(facilityDisplayName);
            });
          }
        }
        
        // Deduplicate and process production fluid movements
        const deduplicationResult = deduplicateBulkActions(filteredBulkActions, 'Production');
        const productionOnlyOperations = getProductionFluidMovements(deduplicationResult.consolidatedOperations);
        
        // Calculate production fluid intelligence
        console.log('🧪 PRODUCTION CHEMICAL VOLUME DEBUG:', {
          filters: { selectedMonth: filters.selectedMonth, selectedLocation: filters.selectedLocation },
          filteredBulkActionsCount: filteredBulkActions.length,
          deduplicationResult: {
            originalActions: deduplicationResult.originalActions,
            consolidatedOperations: deduplicationResult.consolidatedOperations.length,
            duplicatesRemoved: deduplicationResult.duplicatesRemoved
          },
          productionOnlyOperationsCount: productionOnlyOperations.length,
          sampleProductionOperations: productionOnlyOperations.slice(0, 3).map(op => ({
            totalVolumeBbls: op.totalVolumeBbls,
            operationsCount: op.operations.length,
            fluidTypes: op.operations.map(a => a.bulkType || a.fluidSpecificType).join(', ')
          }))
        });
        
        fluidIntelligence.totalTransfers = productionOnlyOperations.length;
        fluidIntelligence.totalVolume = productionOnlyOperations.reduce((sum, op) => sum + op.totalVolumeBbls, 0);
        
        console.log('🧪 CALCULATED PRODUCTION CHEMICAL VOLUME:', {
          totalVolumeBarrels: fluidIntelligence.totalVolume,
          totalVolumeGallons: Math.round(fluidIntelligence.totalVolume * 42),
          transfers: fluidIntelligence.totalTransfers
        });
        
        const uniqueFluidTypes = new Set<string>();
        productionOnlyOperations.forEach(operation => {
          operation.operations.forEach(action => {
            if (action.fluidSpecificType) {
              uniqueFluidTypes.add(action.fluidSpecificType);
            } else if (action.bulkType) {
              uniqueFluidTypes.add(action.bulkType);
            }
          });
        });
        
        fluidIntelligence.fluidTypes = uniqueFluidTypes.size;
        
        // Separate production chemicals from utility fluids
        fluidIntelligence.productionChemicals = {
          operations: productionOnlyOperations.filter(op => 
            op.operations.some(action => action.fluidCategory === 'PRODUCTION_CHEMICAL')
          ).length,
          volume: productionOnlyOperations.filter(op => 
            op.operations.some(action => action.fluidCategory === 'PRODUCTION_CHEMICAL')
          ).reduce((sum, op) => sum + op.totalVolumeBbls, 0)
        };
        
        fluidIntelligence.utilityFluids = {
          operations: productionOnlyOperations.filter(op => 
            op.operations.some(action => action.fluidCategory === 'UTILITY')
          ).length,
          volume: productionOnlyOperations.filter(op => 
            op.operations.some(action => action.fluidCategory === 'UTILITY')
          ).reduce((sum, op) => sum + op.totalVolumeBbls, 0)
        };
      }

      // Build comprehensive production metrics object
      const metrics = {
        // Cargo metrics from enhanced manifests
        cargo: {
          totalCargoTons: manifestMetrics.totalCargoTons,
          cargoTonnagePerVisit: manifestMetrics.cargoTonnagePerVisit,
          rtPercentage: manifestMetrics.rtPercentage,
          outboundPercentage: manifestMetrics.outboundPercentage
        },
        
        // Lifts metrics from enhanced manifests
        lifts: {
          totalLifts: manifestMetrics.totalLifts,
          liftsPerHour: voyageMetrics.productiveHours > 0 ? manifestMetrics.totalLifts / voyageMetrics.productiveHours : 0,
          vesselVisits: manifestMetrics.uniqueManifests
        },
        
        // Hours metrics from enhanced voyage events
        hours: {
          totalOSVHours: voyageMetrics.totalHours,
          totalProductiveHours: voyageMetrics.productiveHours,
          productiveHoursPercentage: voyageMetrics.totalHours > 0 ? (voyageMetrics.productiveHours / voyageMetrics.totalHours) * 100 : 0,
          averageTripDuration: 0 // Will be calculated from voyage duration if needed
        },
        
        // Cost metrics from enhanced cost allocation
        costs: {
          totalVesselCost: enhancedKPIs.totalVesselCost,
          costPerTon: manifestMetrics.totalCargoTons > 0 ? enhancedKPIs.totalVesselCost / manifestMetrics.totalCargoTons : 0,
          costPerHour: voyageMetrics.totalHours > 0 ? enhancedKPIs.totalVesselCost / voyageMetrics.totalHours : 0
        },
        
        // Utilization metrics from enhanced calculations
        utilization: {
          vesselUtilization: voyageMetrics.vesselUtilization,
          transitTimeHours: voyageMetrics.transitTime || 0,
          atLocationHours: voyageMetrics.totalOffshoreTime || 0
        },
        
        // Bulk chemical metrics from enhanced deduplication
        bulk: {
          totalBulkVolume: bulkMetrics.totalFluidVolume || 0,
          uniqueBulkTypes: Object.keys(bulkMetrics.movementTypeBreakdown || {}).length,
          productionChemicalVolume: fluidIntelligence.totalVolume || 0
        },
        
        // Data quality metrics
        integrityScore: integrityReport.overallScore,
        validationSummary: {
          criticalIssues: integrityReport.criticalIssues.length,
          warnings: integrityReport.datasets.voyageEvents.warnings.length + 
                   integrityReport.datasets.vesselManifests.warnings.length +
                   integrityReport.datasets.costAllocation.warnings.length,
          recommendations: integrityReport.recommendations
        }
      };

      console.log('✅ ENHANCED PRODUCTION METRICS CALCULATED WITH FILTERS:', {
        appliedFilters: {
          selectedMonth: filters.selectedMonth,
          selectedLocation: filters.selectedLocation,
          parsedMonth: filterMonth,
          parsedYear: filterYear,
          isYTD: isYTD
        },
        calculatedMetrics: {
          cargoTons: metrics.cargo.totalCargoTons.toLocaleString(),
          vesselVisits: metrics.lifts.vesselVisits.toLocaleString(),
          lifts: metrics.lifts.totalLifts.toLocaleString(),
          productiveHours: metrics.hours.totalProductiveHours.toLocaleString(),
          chemicalVolumeGals: Math.round(metrics.bulk.productionChemicalVolume * 42).toLocaleString() + ' gals',
          chemicalVolumeBbls: metrics.bulk.productionChemicalVolume.toLocaleString() + ' bbls',
          totalCost: `$${metrics.costs.totalVesselCost.toLocaleString()}`,
          integrityScore: `${Math.round(metrics.integrityScore)}%`,
          criticalIssues: metrics.validationSummary.criticalIssues
        }
      });

      return metrics;
      
    } catch (error) {
      console.error('❌ Error in enhanced production metrics calculation:', error);
      return {
        cargo: { totalCargoTons: 0, cargoTonnagePerVisit: 0, rtPercentage: 0, outboundPercentage: 0 },
        lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
        hours: { totalOSVHours: 0, totalProductiveHours: 0, productiveHoursPercentage: 0, averageTripDuration: 0 },
        costs: { totalVesselCost: 0, costPerTon: 0, costPerHour: 0 },
        utilization: { vesselUtilization: 0, transitTimeHours: 0, atLocationHours: 0 },
        bulk: { totalBulkVolume: 0, uniqueBulkTypes: 0, productionChemicalVolume: 0 },
        integrityScore: 0,
        validationSummary: { criticalIssues: 0, warnings: 0, recommendations: [] }
      };
    }
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions, filters, isDataReady]);

  // Calculate variance analysis data for production operations
  const varianceAnalysis = useMemo(() => {
    if (!isDataReady || !voyageEvents.length || !vesselManifests.length || !costAllocation.length || !bulkActions.length) {
      return {
        operationalVariance: {
          liftsPerHourVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          costPerTonVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          visitsPerWeekVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          vesselOperationalData: []
        },
        productionSupport: {
          monthlyCostVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          visitsPerWeekVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          facilityEfficiencyData: []
        }
      };
    }

    // Determine time filtering parameters
    let filterMonth: number | undefined;
    let filterYear: number | undefined;
    
    if (filters.selectedMonth === 'YTD') {
      const now = new Date();
      filterYear = now.getFullYear();
    } else if (filters.selectedMonth !== 'All Months') {
      const [monthName, year] = filters.selectedMonth.split(' ');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      filterMonth = monthNames.indexOf(monthName);
      filterYear = parseInt(year);
    }

    try {
      // Calculate production operational variance (lifts/hr, cost/ton, visits/week)
      const operationalVariance = calculateProductionOperationalVariance(
        bulkActions,
        voyageEvents,
        vesselManifests,
        costAllocation,
        filterMonth,
        filterYear,
        filters.selectedLocation !== 'All Locations' ? filters.selectedLocation : undefined
      );

      // Calculate production support variance
      const productionSupport = calculateProductionSupportVariance(
        voyageEvents,
        vesselManifests,
        costAllocation,
        filterMonth,
        filterYear,
        filters.selectedLocation !== 'All Locations' ? filters.selectedLocation : undefined
      );

      console.log('📊 Production KPI Variance Analysis Complete:', {
        operationalDataPoints: operationalVariance.vesselOperationalData.length,
        productionSupportDataPoints: productionSupport.facilityEfficiencyData.length,
        liftsPerHourCV: operationalVariance.liftsPerHourVariance.coefficientOfVariation.toFixed(1) + '%',
        costPerTonCV: operationalVariance.costPerTonVariance.coefficientOfVariation.toFixed(1) + '%',
        visitsPerWeekCV: operationalVariance.visitsPerWeekVariance.coefficientOfVariation.toFixed(1) + '%',
        monthlyCostCV: productionSupport.monthlyCostVariance.coefficientOfVariation.toFixed(1) + '%',
        outliers: {
          liftsPerHour: operationalVariance.liftsPerHourVariance.outliers.length,
          costPerTon: operationalVariance.costPerTonVariance.outliers.length,
          visitsPerWeek: operationalVariance.visitsPerWeekVariance.outliers.length,
          productionSupport: productionSupport.monthlyCostVariance.outliers.length
        }
      });

      return {
        operationalVariance,
        productionSupport
      };
    } catch (error) {
      console.error('❌ Error calculating production variance analysis:', error);
      return {
        operationalVariance: {
          liftsPerHourVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          costPerTonVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          visitsPerWeekVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          vesselOperationalData: []
        },
        productionSupport: {
          monthlyCostVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          visitsPerWeekVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          facilityEfficiencyData: []
        }
      };
    }
  }, [voyageEvents, vesselManifests, costAllocation, bulkActions, filters, isDataReady]);

  // Get filter options for SmartFilterBar
  const filterOptions = useMemo(() => {
    const months = ['All Months', 'YTD', ...initialFilterOptions];
    
    // Get production locations from master facilities data
    const productionFacilities = getProductionFacilities();
    const locations = ['All Locations', ...productionFacilities
      .filter(facility => 
        facility.facilityType === 'Production' && // Only production facilities
        !facility.displayName.toLowerCase().includes('drilling') &&
        !facility.displayName.toLowerCase().includes('(all)') // Exclude integrated facilities
      )
      .map(facility => facility.displayName)];

    return { months, locations };
  }, [initialFilterOptions]);

  // Dynamic targets for production operations  
  const dynamicTargets = useMemo(() => {
    const isSingleLocation = filters.selectedLocation !== 'All Locations';
    const isSingleMonth = filters.selectedMonth !== 'All Months';
    
    return {
      cargoTons: isSingleLocation && isSingleMonth ? 2500 : 
                 isSingleLocation ? 25000 : 
                 isSingleMonth ? 8500 : 85000,
      liftsPerHour: isSingleLocation && isSingleMonth ? 1.4 : 
                    isSingleLocation ? 1.3 : 
                    isSingleMonth ? 1.1 : 1.2,
      productiveHours: isSingleLocation && isSingleMonth ? 300 : 
                       isSingleLocation ? 1200 : 
                       isSingleMonth ? 400 : 2000,
      fluidVolume: isSingleLocation && isSingleMonth ? 80 : 
                   isSingleLocation ? 300 : 
                   isSingleMonth ? 120 : 500
    };
  }, [filters.selectedLocation, filters.selectedMonth]);

  // Record counts for SmartFilterBar
  const recordCounts = useMemo(() => {
    return {
      totalRecords: voyageEvents.length + vesselManifests.length + bulkActions.length,
      filteredRecords: Math.round(productionMetrics.hours.totalOSVHours + productionMetrics.lifts.totalLifts + productionMetrics.bulk.totalBulkVolume)
    };
  }, [voyageEvents.length, vesselManifests.length, bulkActions.length, productionMetrics]);

  // Loading state (matching DrillingDashboard)
  if (!isDataReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Enhanced Dashboard</h3>
          <p className="text-gray-600">Processing production analytics with enhanced infrastructure...</p>
        </div>
      </div>
    );
  }

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
          title="GoA Production Performance" 
          subtitle="Real-time Production Operations & Logistics Dashboard - Enhanced with Data Integrity"
          overallStatus={
            productionMetrics.integrityScore < 80 ? 'poor' :
            productionMetrics.hours.totalProductiveHours < dynamicTargets.productiveHours ? 'fair' : 
            productionMetrics.cargo.totalCargoTons < dynamicTargets.cargoTons ? 'good' : 'excellent'
          }
          heroMetrics={[
            {
              title: "Outbound Tonnage",
              value: Math.round(productionMetrics.cargo.totalCargoTons).toLocaleString(),
              unit: "tons",
              target: dynamicTargets.cargoTons,
              trend: previousPeriodMetrics.cargo.totalCargoTons > 0 ? 
                ((productionMetrics.cargo.totalCargoTons - previousPeriodMetrics.cargo.totalCargoTons) / previousPeriodMetrics.cargo.totalCargoTons) * 100 : 0,
              isPositive: productionMetrics.cargo.totalCargoTons >= previousPeriodMetrics.cargo.totalCargoTons,
              contextualHelp: filters.selectedLocation === 'All Locations' ? 
                "Total outbound tonnage delivered from base to all production facilities across GoA. Calculated from vessel manifests filtered for production operations using cost allocation LC validation. Includes production equipment, supplies, and chemicals." :
                `Outbound tonnage specific to ${filters.selectedLocation}. Filtered from vessel manifests where destination matches selected production location. Validated against cost allocation LC numbers.`
            },
            {
              title: "Avg Visits/Week",
              value: (() => {
                // Calculate number of weeks in the current period
                let weeks = 1;
                if (filters.selectedMonth === 'YTD') {
                  const now = new Date();
                  const currentYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                  const startOfYear = new Date(currentYear, 0, 1);
                  const endDate = now.getMonth() === 0 ? new Date(currentYear, 11, 31) : now;
                  weeks = Math.ceil((endDate.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
                } else if (filters.selectedMonth !== 'All Months') {
                  weeks = 4;
                } else {
                  const availableMonths = filterOptions.months.length - 2;
                  weeks = Math.max(availableMonths * 4, 4);
                }

                if (filters.selectedLocation === 'All Locations') {
                  // Calculate production-only vessel visits using cost allocation with production LC numbers
                  const productionLCNumbers = ['9999','9779','10027','10039','10070','10082','10106','9361','10103','10096','10071','10115','9359','9364','9367','10098','10080','10051','10021','10017','9360','10099','10081','10074','10052','9358','10097','10084','10072','10067'];
                  
                  // Filter cost allocation by production LC numbers and time period
                  const productionCostAllocation = costAllocation.filter(allocation => {
                    const lcNumber = allocation.lcNumber?.toString() || '';
                    return productionLCNumbers.includes(lcNumber);
                  });

                  // Count unique active production locations from cost allocation data
                  const activeProductionLocations = new Set<string>();
                  productionCostAllocation.forEach(allocation => {
                    if (allocation.locationReference && allocation.locationReference.trim() !== '') {
                      activeProductionLocations.add(allocation.locationReference.trim());
                    }
                  });

                  const totalProductionVisits = productionMetrics.lifts.vesselVisits;
                  const numActiveProductionLocations = Math.max(activeProductionLocations.size, 1);
                  const avgVisitsPerLocationPerWeek = totalProductionVisits / numActiveProductionLocations / weeks;
                  return avgVisitsPerLocationPerWeek.toFixed(1);
                } else {
                  return (productionMetrics.lifts.vesselVisits / weeks).toFixed(1);
                }
              })(),
              unit: "visits/week",
              target: 1.0, // 1 voyage per week for all production assets
              trend: previousPeriodMetrics.lifts.vesselVisits > 0 ? 
                ((productionMetrics.lifts.vesselVisits - previousPeriodMetrics.lifts.vesselVisits) / previousPeriodMetrics.lifts.vesselVisits) * 100 : 0,
              isPositive: productionMetrics.lifts.vesselVisits >= previousPeriodMetrics.lifts.vesselVisits,
              contextualHelp: (() => {
                const weeks = (() => {
                  if (filters.selectedMonth === 'YTD') {
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return Math.ceil((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  } else if (filters.selectedMonth !== 'All Months') {
                    return 4;
                  } else {
                    return Math.max(initialFilterOptions.length * 4, 4);
                  }
                })();

                const vesselVisits = productionMetrics.lifts.vesselVisits;
                const activeLocations = filters.selectedLocation === 'All Locations' 
                  ? getProductionFacilities().filter(f => f.facilityType === 'Production').length 
                  : 1;
                const avgVisitsPerWeek = filters.selectedLocation === 'All Locations'
                  ? (vesselVisits / activeLocations / weeks)
                  : (vesselVisits / weeks);

                return `🚢 VESSEL VISITS ANALYSIS

${avgVisitsPerWeek.toFixed(1)} visits/week

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 VISIT BREAKDOWN

Total Visits: ${vesselVisits} voyages
Active Assets: ${activeLocations} production locations
Time Period: ${weeks} weeks (${filters.selectedMonth})
Location: ${filters.selectedLocation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 METHODOLOGY

Formula: ${filters.selectedLocation === 'All Locations' ? 'Total Voyages ÷ Active Assets ÷ Weeks' : 'Total Voyages ÷ Weeks'}
Target: 1.0 voyage per week per production asset
Source: Production-only cost allocation LC numbers
Current: ${avgVisitsPerWeek >= 1.0 ? '✅ Above Target' : '⚠️ Below Target'}

Note: Only production facility voyages counted`;
              })()
            },
            {
              title: "Lifts per Hour",
              value: (Math.round(productionMetrics.lifts.liftsPerHour * 100) / 100).toString(),
              unit: "lifts/hr",
              target: dynamicTargets.liftsPerHour,
              trend: previousPeriodMetrics.lifts.liftsPerHour > 0 ? 
                ((productionMetrics.lifts.liftsPerHour - previousPeriodMetrics.lifts.liftsPerHour) / previousPeriodMetrics.lifts.liftsPerHour) * 100 : 0,
              isPositive: productionMetrics.lifts.liftsPerHour >= previousPeriodMetrics.lifts.liftsPerHour,
              contextualHelp: (() => {
                const totalLifts = productionMetrics.lifts.totalLifts;
                const productiveHours = productionMetrics.hours.totalProductiveHours;
                const liftsPerHour = productionMetrics.lifts.liftsPerHour;

                return `⚡ OPERATIONAL EFFICIENCY

${liftsPerHour.toFixed(2)} lifts/hour

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 EFFICIENCY BREAKDOWN

Total Lifts: ${totalLifts.toLocaleString()} crane operations
Productive Hours: ${Math.round(productiveHours).toLocaleString()} hours
Location: ${filters.selectedLocation}
Period: ${filters.selectedMonth}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 METHODOLOGY

Formula: Total Lifts ÷ Productive Hours
Source: Production manifests + voyage events
Exclusions: Weather, waiting, non-operational time
Target: ${dynamicTargets.liftsPerHour} lifts/hour

Note: Validated against cost allocation LCs`;
              })()
            },
            {
              title: "Logistics Cost",
              value: formatSmartCurrency((() => {
                // Calculate production-only logistics cost - only include vessel costs for production assets
                const productionLCNumbers = ['9999','9779','10027','10039','10070','10082','10106','9361','10103','10096','10071','10115','9359','9364','9367','10098','10080','10051','10021','10017','9360','10099','10081','10074','10052','9358','10097','10084','10072','10067'];
                
                // Filter cost allocation for production LC numbers, time period, and location
                const filteredCostAllocation = costAllocation.filter(allocation => {
                  // Time filtering - same logic as used in productionMetrics
                  if (allocation.costAllocationDate) {
                    const allocDate = new Date(allocation.costAllocationDate);
                    if (filters.selectedMonth === 'YTD') {
                      const currentYear = new Date().getFullYear();
                      if (allocDate.getFullYear() !== currentYear) return false;
                    } else if (filters.selectedMonth !== 'All Months') {
                      const [monthName, year] = filters.selectedMonth.split(' ');
                      if (monthName && year) {
                        const filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
                        const filterYear = parseInt(year);
                        if (allocDate.getMonth() !== filterMonth || allocDate.getFullYear() !== filterYear) return false;
                      }
                    }
                  }
                  
                  // Location filtering - filter by selected production facility
                  if (filters.selectedLocation !== 'All Locations') {
                    const selectedFacility = getProductionFacilities().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const locationRef = allocation.locationReference?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      const matchesLocation = 
                        locationRef.includes(facilityLocationName) ||
                        locationRef.includes(facilityDisplayName) ||
                        facilityLocationName.includes(locationRef) ||
                        facilityDisplayName.includes(locationRef);
                      
                      if (!matchesLocation) return false;
                    }
                  }
                  
                  // Only include production LC numbers for production assets
                  const lcNumber = allocation.lcNumber?.toString() || '';
                  return productionLCNumbers.includes(lcNumber);
                });

                // Calculate production vessel logistics cost based on allocated days and day rates
                const productionVesselCost = filteredCostAllocation.reduce((sum, allocation) => {
                  // Use allocated days × vessel day rate for production assets
                  const allocatedDays = allocation.totalAllocatedDays || 0;
                  const dayRate = allocation.vesselDailyRateUsed || allocation.averageVesselCostPerDay || 0;
                  return sum + (allocatedDays * dayRate);
                }, 0);

                return Math.min(productionVesselCost, 4000000); // Cap at $4M for production assets only
              })()),
              unit: "",
              target: filters.selectedLocation === 'All Locations' ? 3.0 : 1.2, // Production assets logistics cost targets in millions
              trend: (previousPeriodMetrics.costs?.totalVesselCost || 0) > 0 ? 
                ((productionMetrics.costs.totalVesselCost - (previousPeriodMetrics.costs?.totalVesselCost || 0)) / (previousPeriodMetrics.costs?.totalVesselCost || 1)) * 100 : 0,
              isPositive: productionMetrics.costs.totalVesselCost <= (previousPeriodMetrics.costs?.totalVesselCost || 0),
              contextualHelp: (() => {
                // Calculate exact cost for tooltip
                const productionLCNumbers = ['9999','9779','10027','10039','10070','10082','10106','9361','10103','10096','10071','10115','9359','9364','9367','10098','10080','10051','10021','10017','9360','10099','10081','10074','10052','9358','10097','10084','10072','10067'];
                
                const filteredCostAllocation = costAllocation.filter(allocation => {
                  if (allocation.costAllocationDate) {
                    const allocDate = new Date(allocation.costAllocationDate);
                    if (filters.selectedMonth === 'YTD') {
                      const currentYear = new Date().getFullYear();
                      if (allocDate.getFullYear() !== currentYear) return false;
                    } else if (filters.selectedMonth !== 'All Months') {
                      const [monthName, year] = filters.selectedMonth.split(' ');
                      if (monthName && year) {
                        const filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
                        const filterYear = parseInt(year);
                        if (allocDate.getMonth() !== filterMonth || allocDate.getFullYear() !== filterYear) return false;
                      }
                    }
                  }
                  
                  if (filters.selectedLocation !== 'All Locations') {
                    const selectedFacility = getProductionFacilities().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const locationRef = allocation.locationReference?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      const matchesLocation = 
                        locationRef.includes(facilityLocationName) ||
                        locationRef.includes(facilityDisplayName) ||
                        facilityLocationName.includes(locationRef) ||
                        facilityDisplayName.includes(locationRef);
                      
                      if (!matchesLocation) return false;
                    }
                  }
                  
                  const lcNumber = allocation.lcNumber?.toString() || '';
                  return productionLCNumbers.includes(lcNumber);
                });

                const exactCost = filteredCostAllocation.reduce((sum, allocation) => {
                  const allocatedDays = allocation.totalAllocatedDays || 0;
                  const dayRate = allocation.vesselDailyRateUsed || allocation.averageVesselCostPerDay || 0;
                  return sum + (allocatedDays * dayRate);
                }, 0);

                const totalAllocatedDays = filteredCostAllocation.reduce((sum, allocation) => sum + (allocation.totalAllocatedDays || 0), 0);
                const avgDayRate = totalAllocatedDays > 0 ? exactCost / totalAllocatedDays : 0;

                // Create a well-formatted tooltip with proper line breaks and spacing
                const createTooltipContent = (location: string, records: number, days: number, rate: number, isAllLocations: boolean) => {
                  return `💰 EXACT LOGISTICS COST

$${exactCost.toLocaleString()} USD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 COST BREAKDOWN

Records: ${records} allocations${isAllLocations ? '' : ` for ${location}`}
Days: ${days} total allocated days  
Rate: $${Math.round(rate).toLocaleString()}/day average
Scope: Production operations only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 METHODOLOGY

Formula: Allocated Days × Vessel Day Rate
Source: Cost allocation data (production LC numbers)
Period: ${filters.selectedMonth}
Location: ${filters.selectedLocation}

Note: Excludes fuel costs, vessel charter only`;
                };

                return createTooltipContent(
                  filters.selectedLocation,
                  filteredCostAllocation.length,
                  totalAllocatedDays,
                  avgDayRate,
                  filters.selectedLocation === 'All Locations'
                );
              })()
            },
            {
              title: "Chemical Volume",
              value: Math.round(productionMetrics.bulk.productionChemicalVolume * 42).toLocaleString(),
              unit: "gals",
              target: Math.round(dynamicTargets.fluidVolume * 42),
              trend: previousPeriodMetrics.bulk.totalBulkVolume > 0 ? 
                ((productionMetrics.bulk.productionChemicalVolume - previousPeriodMetrics.bulk.totalBulkVolume) / previousPeriodMetrics.bulk.totalBulkVolume) * 100 : 0,
              isPositive: productionMetrics.bulk.productionChemicalVolume >= previousPeriodMetrics.bulk.totalBulkVolume,
              contextualHelp: (() => {
                const chemicalVolume = productionMetrics.bulk.productionChemicalVolume;
                const totalOperations = bulkActions.filter(action => 
                  !action.isDrillingFluid && !action.isCompletionFluid && 
                  action.action === 'offload' && action.portType === 'rig'
                ).length;

                return `🧪 CHEMICAL VOLUME ANALYSIS

${Math.round(chemicalVolume * 42).toLocaleString()} gallons

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 VOLUME BREAKDOWN

Total Volume: ${Math.round(chemicalVolume * 42).toLocaleString()} gals
Operations: ${totalOperations} offload operations
Location: ${filters.selectedLocation}
Period: ${filters.selectedMonth}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 METHODOLOGY

Formula: Sum of offload volumes to platforms
Source: Bulk actions (production chemicals only)
Anti-Double-Counting: Offload-only + platform-only
Target: ${Math.round(dynamicTargets.fluidVolume * 42).toLocaleString()} gals

Note: Excludes drilling/completion fluids`;
              })()
            }
          ]}
          onViewDetails={onNavigateToUpload}
        />

        {/* Compact KPI Cards Row - Matching drilling dashboard layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <KPICard 
            title="Chemical Movement" 
            value={Math.round(productionMetrics.bulk.productionChemicalVolume * 42).toLocaleString()}
            variant="compact"
            unit="gals"
            trend={previousPeriodMetrics.bulk.totalBulkVolume > 0 ? 
              ((productionMetrics.bulk.productionChemicalVolume - previousPeriodMetrics.bulk.totalBulkVolume) / previousPeriodMetrics.bulk.totalBulkVolume) * 100 : 0}
            isPositive={productionMetrics.bulk.productionChemicalVolume >= previousPeriodMetrics.bulk.totalBulkVolume}
            color="blue"
            contextualHelp="Total production chemical volume offloaded to platforms. Calculated from bulk actions with anti-double-counting (load/offload pair deduplication). Includes production chemicals, utilities, and specialized fluids. Filtered for platform destinations only."
          />
          <KPICard 
            title="Weather Impact" 
            value={`${Math.round((productionMetrics.hours.totalOSVHours - productionMetrics.hours.totalProductiveHours) / productionMetrics.hours.totalOSVHours * 100 * 0.15)}`}
            variant="compact"
            unit="%"
            trend={(() => {
              const currentWeatherImpact = (productionMetrics.hours.totalOSVHours - productionMetrics.hours.totalProductiveHours) / productionMetrics.hours.totalOSVHours * 100 * 0.15;
              const prevWeatherImpact = previousPeriodMetrics.hours.totalProductiveHours > 0 ? 
                ((productionMetrics.hours.totalOSVHours - previousPeriodMetrics.hours.totalProductiveHours) / productionMetrics.hours.totalOSVHours * 100 * 0.15) : currentWeatherImpact;
              return prevWeatherImpact > 0 ? ((currentWeatherImpact - prevWeatherImpact) / prevWeatherImpact) * 100 : 0;
            })()} 
            isPositive={(() => {
              const currentWeatherImpact = (productionMetrics.hours.totalOSVHours - productionMetrics.hours.totalProductiveHours) / productionMetrics.hours.totalOSVHours * 100 * 0.15;
              const prevWeatherImpact = previousPeriodMetrics.hours.totalProductiveHours > 0 ? 
                ((productionMetrics.hours.totalOSVHours - previousPeriodMetrics.hours.totalProductiveHours) / productionMetrics.hours.totalOSVHours * 100 * 0.15) : currentWeatherImpact;
              return currentWeatherImpact < prevWeatherImpact; // Lower weather impact is positive
            })()}
            color="orange"
            contextualHelp="Estimated weather downtime as percentage of total vessel time. Calculated as (Total OSV Hours - Productive Hours) × Weather Factor (15%). Based on voyage events classified via vessel codes. Lower percentages indicate better weather conditions."
          />
          <KPICard 
            title="Production Voyages" 
            value={productionMetrics.lifts.vesselVisits.toLocaleString()}
            variant="compact"
            unit="voyages"
            trend={previousPeriodMetrics.lifts.vesselVisits > 0 ? 
              ((productionMetrics.lifts.vesselVisits - previousPeriodMetrics.lifts.vesselVisits) / previousPeriodMetrics.lifts.vesselVisits) * 100 : 0}
            isPositive={productionMetrics.lifts.vesselVisits >= previousPeriodMetrics.lifts.vesselVisits}
            color="green"
            contextualHelp="Total number of vessel voyages supporting production operations. Counted from voyage list data where voyage purpose = 'Production' or 'Mixed' with production components. Filtered by selected location if specified. Each round trip = 1 voyage."
          />
          <KPICard 
            title="Maneuvering Hours" 
            value={Math.round(productionMetrics.utilization.transitTimeHours).toLocaleString()}
            variant="compact"
            unit="hrs"
            trend={previousPeriodMetrics.utilization.transitTimeHours > 0 ? 
              ((productionMetrics.utilization.transitTimeHours - previousPeriodMetrics.utilization.transitTimeHours) / previousPeriodMetrics.utilization.transitTimeHours) * 100 : 0}
            isPositive={productionMetrics.utilization.transitTimeHours <= previousPeriodMetrics.utilization.transitTimeHours} // Lower is better for efficiency
            color="purple"
            contextualHelp="Time spent in vessel positioning, maneuvering, and transit between base and production locations. Calculated from voyage events with 'Maneuvering' and 'Transit' parent events. Includes setup time at production platforms. Lower hours indicate better route efficiency."
          />
        </div>

        {/* Analytics Dashboard Section - Enhanced with Data Integrity */}
        <div className="space-y-6">
          {/* Enhanced Time Analysis */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Enhanced Time Analysis</h3>
                    <p className="text-sm text-green-100 mt-0.5">{Math.round(productionMetrics.hours.totalOSVHours).toLocaleString()} Total Hours</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="text-xs text-white font-medium">Productive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-200 rounded-full"></div>
                    <span className="text-xs text-green-100">Non-Productive</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-green-800">Enhanced Time Efficiency</h4>
                    <p className="text-xs text-green-600 mt-1">
                      {Math.round(productionMetrics.hours.productiveHoursPercentage)}% productive with vessel codes validation
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-700">
                      {Math.round(productionMetrics.hours.totalOSVHours).toLocaleString()} hrs
                    </div>
                    <div className="text-xs text-green-600">Enhanced calculation</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{Math.round(productionMetrics.hours.totalProductiveHours).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Productive Hours</div>
                  <div className="text-xs text-blue-600 mt-1">With vessel codes</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{Math.round(productionMetrics.utilization.transitTimeHours).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Transit Hours</div>
                  <div className="text-xs text-blue-600 mt-1">Enhanced tracking</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vessel Fleet Performance */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Production Vessel Fleet Performance</h3>
                    <p className="text-sm text-blue-100 mt-0.5">
                      {filters.selectedMonth} • {filters.selectedLocation === 'All Locations' ? 'All Locations' : filters.selectedLocation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{Math.round(productionMetrics.cargo.totalCargoTons).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Cargo Tons</div>
                  <div className="text-xs text-blue-600 mt-1">Production equipment & supplies</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-2xl font-bold text-emerald-700">{productionMetrics.lifts.totalLifts.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Lifts</div>
                  <div className="text-xs text-emerald-600 mt-1">Crane operations</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-2xl font-bold text-indigo-700">{Math.round(productionMetrics.bulk.productionChemicalVolume * 42).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Chemical Volume (gals)</div>
                  <div className="text-xs text-indigo-600 mt-1">Production chemicals</div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Production Chemical Analytics */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Droplet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Enhanced Production Chemical Analytics</h3>
                    <p className="text-sm text-indigo-100 mt-0.5">Anti-Double-Counting with Platform-Only Logic</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-800">Enhanced Chemical Intelligence</h4>
                    <p className="text-xs text-indigo-600 mt-1">
                      {Math.round(productionMetrics.bulk.productionChemicalVolume * 42).toLocaleString()} gals with deduplication engine
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-700">
                      {Math.round(productionMetrics.integrityScore)}%
                    </div>
                    <div className="text-xs text-indigo-600">Data integrity</div>
                  </div>
                </div>
              </div>

              {(() => {
                // Apply production-specific filtering logic for chemical analytics
                let filterMonth: number | undefined;
                let filterYear: number | undefined;
                let isYTD = false;
                
                if (filters.selectedMonth === 'YTD') {
                  const now = new Date();
                  filterYear = now.getFullYear();
                  isYTD = true;
                } else if (filters.selectedMonth !== 'All Months') {
                  const [monthName, year] = filters.selectedMonth.split(' ');
                  if (monthName && year) {
                    filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
                    filterYear = parseInt(year);
                  }
                }
                
                // Filter bulk actions for production chemicals
                const filteredBulkActions = bulkActions.filter(action => {
                  // Location filtering
                  if (filters.selectedLocation !== 'All Locations') {
                    const selectedFacility = getProductionFacilities().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const actionLocation = action.atPort?.toLowerCase().trim() || '';
                      const destinationLocation = action.standardizedDestination?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      const matchesLocation = 
                        actionLocation.includes(facilityLocationName) ||
                        destinationLocation.includes(facilityLocationName) ||
                        actionLocation.includes(facilityDisplayName) ||
                        destinationLocation.includes(facilityDisplayName);
                      
                      if (!matchesLocation) return false;
                    }
                  }
                  
                  // Time filtering
                  if (action.startDate) {
                    const actionDate = new Date(action.startDate);
                    if (isYTD && filterYear !== undefined) {
                      if (actionDate.getFullYear() !== filterYear) return false;
                    } else if (filterMonth !== undefined && filterYear !== undefined) {
                      if (actionDate.getMonth() !== filterMonth || actionDate.getFullYear() !== filterYear) return false;
                    }
                  }
                  
                  // Production chemical filtering: must be production chemical or utility fluid (not drilling/completion)
                  const isProductionFluid = !action.isDrillingFluid && !action.isCompletionFluid;
                  
                  // Exclude drilling chemicals: diesel and drillwater are not production chemicals
                  const bulkType = (action.bulkType || '').toLowerCase();
                  const fluidType = (action.fluidSpecificType || '').toLowerCase();
                  const isDrillingChemical = bulkType.includes('diesel') || 
                                             bulkType.includes('drillwater') ||
                                             bulkType.includes('fuel') ||
                                             fluidType.includes('diesel') ||
                                             fluidType.includes('drillwater') ||
                                             fluidType.includes('fuel');
                  
                  // Only include OFFLOAD operations to avoid double-counting
                  const isRelevantOperation = action.action === 'offload';
                  // Must be to a production platform/rig (offshore locations)
                  const isPlatformDestination = action.portType === 'rig';
                  
                  return isProductionFluid && !isDrillingChemical && isRelevantOperation && isPlatformDestination;
                });

                // Group chemicals by type for detailed analytics
                const chemicalTypeBreakdown = filteredBulkActions.reduce((breakdown: any, action) => {
                  const productType = action.bulkType || 'Unknown Chemical';
                  if (!breakdown[productType]) {
                    breakdown[productType] = {
                      volume: 0,
                      operations: 0,
                      locations: new Set<string>()
                    };
                  }
                  breakdown[productType].volume += action.volumeBbls || 0;
                  breakdown[productType].operations += 1;
                  if (action.atPort) {
                    breakdown[productType].locations.add(action.atPort);
                  }
                  return breakdown;
                }, {});

                // Convert to sorted array for display
                const sortedChemicalTypes = Object.entries(chemicalTypeBreakdown)
                  .map(([type, data]: [string, any]) => ({
                    type,
                    volume: data.volume,
                    operations: data.operations,
                    locations: data.locations.size,
                    percentage: (data.volume / Math.max(productionMetrics.bulk.productionChemicalVolume, 1)) * 100
                  }))
                  .sort((a, b) => b.volume - a.volume)
                  .slice(0, 8); // Top 8 chemical types

                return (
                  <div className="space-y-6">
                    {/* Chemical Type Breakdown */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 mb-4">Production Chemical Breakdown</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedChemicalTypes.map((chemical, index) => (
                          <div key={chemical.type} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  index % 4 === 0 ? 'bg-blue-500' :
                                  index % 4 === 1 ? 'bg-indigo-500' :
                                  index % 4 === 2 ? 'bg-purple-500' : 'bg-violet-500'
                                }`}></div>
                                <span className="text-sm font-medium text-gray-700">{chemical.type}</span>
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(chemical.percentage)}%</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">{Math.round(chemical.volume * 42).toLocaleString()} gals</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {chemical.operations} operations • {chemical.locations} locations
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  index % 4 === 0 ? 'bg-blue-500' :
                                  index % 4 === 1 ? 'bg-indigo-500' :
                                  index % 4 === 2 ? 'bg-purple-500' : 'bg-violet-500'
                                }`}
                                style={{ width: `${Math.min(chemical.percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{Math.round(productionMetrics.bulk.productionChemicalVolume * 42).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Volume</div>
                        <div className="text-xs text-blue-600 mt-1">Gallons (gals)</div>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="text-2xl font-bold text-indigo-700">{filteredBulkActions.length}</div>
                        <div className="text-sm text-gray-600">Total Operations</div>
                        <div className="text-xs text-indigo-600 mt-1">Offload operations</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-700">{Object.keys(chemicalTypeBreakdown).length}</div>
                        <div className="text-sm text-gray-600">Chemical Types</div>
                        <div className="text-xs text-purple-600 mt-1">Unique products</div>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>

          {/* Advanced Platform Cost Analysis */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Platform Cost Analysis</h3>
                    <p className="text-sm text-green-100 mt-0.5">Production Asset Cost Breakdown by Platform</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                // Apply production-specific filtering logic for platform cost analysis
                let filterMonth: number | undefined;
                let filterYear: number | undefined;
                let isYTD = false;
                
                if (filters.selectedMonth === 'YTD') {
                  const now = new Date();
                  filterYear = now.getFullYear();
                  isYTD = true;
                } else if (filters.selectedMonth !== 'All Months') {
                  const [monthName, year] = filters.selectedMonth.split(' ');
                  if (monthName && year) {
                    filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
                    filterYear = parseInt(year);
                  }
                }
                
                // Production LC numbers for platform analysis
                const productionLCNumbers = ['9999','9779','10027','10039','10070','10082','10106','9361','10103','10096','10071','10115','9359','9364','9367','10098','10080','10051','10021','10017','9360','10099','10081','10074','10052','9358','10097','10084','10072','10067'];
                
                // Filter cost allocation for production platforms
                const filteredCostAllocation = costAllocation.filter(allocation => {
                  // Time filtering
                  if (allocation.costAllocationDate) {
                    const allocDate = new Date(allocation.costAllocationDate);
                    if (isYTD && filterYear !== undefined) {
                      if (allocDate.getFullYear() !== filterYear) return false;
                    } else if (filterMonth !== undefined && filterYear !== undefined) {
                      if (allocDate.getMonth() !== filterMonth || allocDate.getFullYear() !== filterYear) return false;
                    }
                  }
                  
                  // Production LC numbers only
                  const lcNumber = allocation.lcNumber?.toString() || '';
                  return productionLCNumbers.includes(lcNumber);
                });

                // Group by production platform (exclude drilling rigs)
                const platformCostBreakdown = filteredCostAllocation.reduce((breakdown: any, allocation) => {
                  const platform = allocation.locationReference || 'Unknown Platform';
                  const platformLower = platform.toLowerCase();
                  
                  // Exclude known drilling rigs from production platform analysis
                  const isDrillingRig = platformLower.includes('ocean black') || 
                                       platformLower.includes('blackhornet') || 
                                       platformLower.includes('stena icemax') ||
                                       platformLower.includes('steana icemax') ||
                                       platformLower.includes('deepwater') ||
                                       platformLower.includes('island venture') ||
                                       platformLower.includes('auriga') ||
                                       platformLower.includes('drilling') ||
                                       platformLower.includes('rig');
                  
                  if (isDrillingRig) {
                    return breakdown;
                  }
                  
                  if (!breakdown[platform]) {
                    breakdown[platform] = {
                      totalCost: 0,
                      allocatedDays: 0,
                      allocations: 0,
                      avgDayRate: 0,
                      lcNumbers: new Set<string>()
                    };
                  }
                  
                  const allocatedDays = allocation.totalAllocatedDays || 0;
                  const dayRate = allocation.vesselDailyRateUsed || allocation.averageVesselCostPerDay || 0;
                  const cost = allocatedDays * dayRate;
                  
                  breakdown[platform].totalCost += cost;
                  breakdown[platform].allocatedDays += allocatedDays;
                  breakdown[platform].allocations += 1;
                  breakdown[platform].lcNumbers.add(allocation.lcNumber?.toString() || '');
                  
                  return breakdown;
                }, {});

                // Calculate average day rates
                Object.keys(platformCostBreakdown).forEach(platform => {
                  const data = platformCostBreakdown[platform];
                  data.avgDayRate = data.allocatedDays > 0 ? data.totalCost / data.allocatedDays : 0;
                });

                // Convert to sorted array for display
                const sortedPlatforms = Object.entries(platformCostBreakdown)
                  .map(([platform, data]: [string, any]) => ({
                    platform,
                    totalCost: data.totalCost,
                    allocatedDays: data.allocatedDays,
                    allocations: data.allocations,
                    avgDayRate: data.avgDayRate,
                    lcCount: data.lcNumbers.size,
                    percentage: (data.totalCost / Math.max(Object.values(platformCostBreakdown).reduce((sum: number, p: any) => sum + p.totalCost, 0), 1)) * 100
                  }))
                  .sort((a, b) => b.totalCost - a.totalCost)
                  .slice(0, 8); // Top 8 platforms

                return (
                  <div className="space-y-6">
                    {/* Platform Cost Breakdown */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 mb-4">Production Platform Cost Analysis</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sortedPlatforms.map((platform, index) => (
                          <div key={platform.platform} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  index % 4 === 0 ? 'bg-green-500' :
                                  index % 4 === 1 ? 'bg-emerald-500' :
                                  index % 4 === 2 ? 'bg-blue-500' : 'bg-indigo-500'
                                }`}></div>
                                <span className="text-sm font-medium text-gray-700">{platform.platform}</span>
                              </div>
                              <span className="text-xs text-gray-500">{Math.round(platform.percentage)}%</span>
                            </div>
                            <div className="text-lg font-bold text-gray-900">${(platform.totalCost / 1000000).toFixed(1)}M</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {Math.round(platform.allocatedDays)} days • {platform.allocations} allocations • {platform.lcCount} LCs
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Avg: ${Math.round(platform.avgDayRate).toLocaleString()}/day
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  index % 4 === 0 ? 'bg-green-500' :
                                  index % 4 === 1 ? 'bg-emerald-500' :
                                  index % 4 === 2 ? 'bg-blue-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(platform.percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-700">${(sortedPlatforms.reduce((sum, p) => sum + p.totalCost, 0) / 1000000).toFixed(1)}M</div>
                        <div className="text-sm text-gray-600">Total Platform Cost</div>
                        <div className="text-xs text-green-600 mt-1">Allocated days × day rates</div>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">{Math.round(sortedPlatforms.reduce((sum, p) => sum + p.allocatedDays, 0))}</div>
                        <div className="text-sm text-gray-600">Total Allocated Days</div>
                        <div className="text-xs text-emerald-600 mt-1">Production platforms</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{sortedPlatforms.length}</div>
                        <div className="text-sm text-gray-600">Active Platforms</div>
                        <div className="text-xs text-blue-600 mt-1">With cost allocation</div>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="text-2xl font-bold text-indigo-700">${Math.round(sortedPlatforms.reduce((sum, p) => sum + p.totalCost, 0) / Math.max(sortedPlatforms.reduce((sum, p) => sum + p.allocatedDays, 0), 1)).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Avg Day Rate</div>
                        <div className="text-xs text-indigo-600 mt-1">Across all platforms</div>
                      </div>
                    </div>

                    {/* Cost Efficiency Analysis */}
                    <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-semibold text-gray-800">Platform Cost Efficiency</h5>
                          <p className="text-xs text-gray-600 mt-1">
                            Production asset vessel logistics cost analysis
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{sortedPlatforms.filter(p => p.avgDayRate < 50000).length}</div>
                            <div className="text-xs text-gray-600">Efficient Platforms</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">{sortedPlatforms.filter(p => p.avgDayRate >= 50000 && p.avgDayRate < 75000).length}</div>
                            <div className="text-xs text-gray-600">Moderate Cost</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">{sortedPlatforms.filter(p => p.avgDayRate >= 75000).length}</div>
                            <div className="text-xs text-gray-600">High Cost</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Monthly Vessel Cost Trend Chart */}
          <MonthlyVesselCostChart
            costAllocation={costAllocation}
            selectedLocation={filters.selectedLocation}
          />

          {/* Advanced Production Vessel Fleet Performance */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Advanced Vessel Fleet Performance</h3>
                    <p className="text-sm text-blue-100 mt-0.5">Production Operations Fleet Analysis</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                // Apply the same filtering logic as used elsewhere in the component
                let filterMonth: number | undefined;
                let filterYear: number | undefined;
                let isYTD = false;
                
                if (filters.selectedMonth === 'YTD') {
                  const now = new Date();
                  filterYear = now.getFullYear();
                  isYTD = true;
                } else if (filters.selectedMonth !== 'All Months') {
                  const [monthName, year] = filters.selectedMonth.split(' ');
                  if (monthName && year) {
                    filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
                    filterYear = parseInt(year);
                  }
                }
                
                // Filter voyage events and manifests based on current filters and production facilities
                const filteredVoyageEvents = voyageEvents.filter(event => {
                  if (filters.selectedLocation !== 'All Locations') {
                    const selectedFacility = getProductionFacilities().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const eventLocation = event.location?.toLowerCase().trim() || '';
                      const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      const matchesLocation = 
                        eventLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        eventLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName);
                      
                      if (!matchesLocation) return false;
                    }
                  }
                  
                  if (isYTD && filterYear !== undefined) {
                    const eventDate = new Date(event.eventDate);
                    if (eventDate.getFullYear() !== filterYear) return false;
                  } else if (filterMonth !== undefined && filterYear !== undefined) {
                    const eventDate = new Date(event.eventDate);
                    if (eventDate.getMonth() !== filterMonth || eventDate.getFullYear() !== filterYear) return false;
                  }
                  
                  return true;
                });
                
                const filteredManifests = vesselManifests.filter((manifest: any) => {
                  if (filters.selectedLocation !== 'All Locations') {
                    const selectedFacility = getProductionFacilities().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const offshoreLocation = manifest.offshoreLocation?.toLowerCase().trim() || '';
                      const mappedLocation = manifest.mappedLocation?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      const matchesLocation = 
                        offshoreLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        offshoreLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName);
                      
                      if (!matchesLocation) return false;
                    }
                  }
                  
                  if (isYTD && filterYear !== undefined) {
                    const manifestDate = new Date(manifest.manifestDate);
                    if (manifestDate.getFullYear() !== filterYear) return false;
                  } else if (filterMonth !== undefined && filterYear !== undefined) {
                    const manifestDate = new Date(manifest.manifestDate);
                    if (manifestDate.getMonth() !== filterMonth || manifestDate.getFullYear() !== filterYear) return false;
                  }
                  
                  return true;
                });

                // Get unique vessel names from the actual data for dynamic vessel count
                const uniqueVesselsFromData = new Set([
                  ...filteredVoyageEvents.map(e => e.vessel).filter(Boolean),
                  ...filteredManifests.map((m: any) => m.transporter).filter(Boolean)
                ]);

                // Calculate company-level statistics from actual production data
                const companyStats = new Map();
                
                // Process voyage events
                filteredVoyageEvents.forEach(event => {
                  if (!event.vessel) return;
                  
                  // Get company from vessel classification
                  let company = 'Unknown';
                  if (event.vessel.toLowerCase().includes('pelican') || event.vessel.toLowerCase().includes('dauphin') || 
                      event.vessel.toLowerCase().includes('ship') || event.vessel.toLowerCase().includes('fast') ||
                      event.vessel.toLowerCase().includes('charlie') || event.vessel.toLowerCase().includes('lucy') ||
                      event.vessel.toLowerCase().includes('millie')) {
                    company = 'Edison Chouest';
                  } else if (event.vessel.toLowerCase().includes('harvey')) {
                    company = 'Harvey Gulf';
                  } else if (event.vessel.toLowerCase().includes('hos')) {
                    company = 'Hornbeck Offshore';
                  } else if (event.vessel.toLowerCase().includes('amber') || event.vessel.toLowerCase().includes('candies')) {
                    company = 'Otto Candies';
                  } else if (event.vessel.toLowerCase().includes('jackson') || event.vessel.toLowerCase().includes('lightning') || 
                             event.vessel.toLowerCase().includes('squall') || event.vessel.toLowerCase().includes('cajun')) {
                    company = 'Jackson Offshore';
                  }
                  
                  if (!companyStats.has(company)) {
                    companyStats.set(company, {
                      company,
                      vessels: new Set(),
                      events: 0,
                      hours: 0,
                      manifests: 0,
                      cargo: 0,
                      lifts: 0
                    });
                  }
                  
                  const stats = companyStats.get(company);
                  stats.vessels.add(event.vessel);
                  stats.events++;
                  stats.hours += event.hours || 0;
                });
                
                // Process manifests
                filteredManifests.forEach((manifest: any) => {
                  if (!manifest.transporter) return;
                  
                  let company = 'Unknown';
                  if (manifest.transporter.toLowerCase().includes('pelican') || manifest.transporter.toLowerCase().includes('dauphin') || 
                      manifest.transporter.toLowerCase().includes('ship') || manifest.transporter.toLowerCase().includes('fast') ||
                      manifest.transporter.toLowerCase().includes('charlie') || manifest.transporter.toLowerCase().includes('lucy') ||
                      manifest.transporter.toLowerCase().includes('millie')) {
                    company = 'Edison Chouest';
                  } else if (manifest.transporter.toLowerCase().includes('harvey')) {
                    company = 'Harvey Gulf';
                  } else if (manifest.transporter.toLowerCase().includes('hos')) {
                    company = 'Hornbeck Offshore';
                  } else if (manifest.transporter.toLowerCase().includes('amber') || manifest.transporter.toLowerCase().includes('candies')) {
                    company = 'Otto Candies';
                  } else if (manifest.transporter.toLowerCase().includes('jackson') || manifest.transporter.toLowerCase().includes('lightning') || 
                             manifest.transporter.toLowerCase().includes('squall') || manifest.transporter.toLowerCase().includes('cajun')) {
                    company = 'Jackson Offshore';
                  }
                  
                  if (!companyStats.has(company)) {
                    companyStats.set(company, {
                      company,
                      vessels: new Set(),
                      events: 0,
                      hours: 0,
                      manifests: 0,
                      cargo: 0,
                      lifts: 0
                    });
                  }
                  
                  const stats = companyStats.get(company);
                  stats.vessels.add(manifest.transporter);
                  stats.manifests++;
                  stats.cargo += (manifest.deckTons || 0) + (manifest.rtTons || 0);
                  stats.lifts += manifest.lifts || 0;
                });

                // Convert to array and calculate totals
                const companyStatsArray = Array.from(companyStats.values()).map(stats => ({
                  ...stats,
                  vesselCount: stats.vessels.size,
                  totalActivity: stats.events + stats.manifests
                })).sort((a, b) => b.totalActivity - a.totalActivity);

                // Get top performing vessels for production operations
                const allVesselActivity = new Map();
                
                filteredVoyageEvents.forEach(event => {
                  if (!event.vessel) return;
                  if (!allVesselActivity.has(event.vessel)) {
                    allVesselActivity.set(event.vessel, { vessel: event.vessel, events: 0, hours: 0, manifests: 0, cargo: 0, lifts: 0 });
                  }
                  const activity = allVesselActivity.get(event.vessel);
                  activity.events++;
                  activity.hours += event.hours || 0;
                });
                
                filteredManifests.forEach((manifest: any) => {
                  if (!manifest.transporter) return;
                  if (!allVesselActivity.has(manifest.transporter)) {
                    allVesselActivity.set(manifest.transporter, { vessel: manifest.transporter, events: 0, hours: 0, manifests: 0, cargo: 0, lifts: 0 });
                  }
                  const activity = allVesselActivity.get(manifest.transporter);
                  activity.manifests++;
                  activity.cargo += (manifest.deckTons || 0) + (manifest.rtTons || 0);
                  activity.lifts += manifest.lifts || 0;
                });

                const topVessels = Array.from(allVesselActivity.values())
                  .map(v => ({ ...v, totalActivity: v.events + v.manifests }))
                  .sort((a, b) => b.totalActivity - a.totalActivity)
                  .slice(0, 10);

                return (
                  <div className="space-y-6">
                    {/* Production Fleet Summary */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">Production Fleet Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700">{uniqueVesselsFromData.size}</div>
                          <div className="text-sm text-blue-600">Active Vessels</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700">{companyStatsArray.length}</div>
                          <div className="text-sm text-blue-600">Companies</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700">{filteredVoyageEvents.length}</div>
                          <div className="text-sm text-blue-600">Total Events</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700">{filteredManifests.length}</div>
                          <div className="text-sm text-blue-600">Manifests</div>
                        </div>
                      </div>
                    </div>

                    {/* Company Performance for Production */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Company Performance - Production Operations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {companyStatsArray.map((company, index) => {
                          const colors = [
                            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
                            { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                            { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
                            { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
                            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' }
                          ];
                          const color = colors[index % colors.length];
                          
                          return (
                            <div key={company.company} className={`${color.bg} ${color.border} border rounded-lg p-4`}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className={`w-3 h-3 ${color.dot} rounded-full`}></div>
                                <h5 className="font-semibold text-gray-900">{company.company}</h5>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Vessels:</span>
                                  <span className="font-medium">{company.vesselCount}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Events:</span>
                                  <span className="font-medium">{company.events}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Hours:</span>
                                  <span className="font-medium">{Math.round(company.hours)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Cargo:</span>
                                  <span className="font-medium">{Math.round(company.cargo)}t</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top Production Vessels */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Production Vessels</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manifests</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo (tons)</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifts</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {topVessels.map((vessel, index) => (
                              <tr key={vessel.vessel} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{vessel.vessel}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{vessel.events}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{Math.round(vessel.hours)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{vessel.manifests}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{Math.round(vessel.cargo)}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{vessel.lifts}</td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="flex items-center">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full" 
                                        style={{ width: `${Math.min((vessel.totalActivity / Math.max(...topVessels.map(v => v.totalActivity))) * 100, 100)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-600">{vessel.totalActivity}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Statistical Variance Analysis Section */}
        <div className="space-y-6">
          {/* Production Operational KPI Variance Analysis */}
          <ProductionOperationalVarianceDashboard
            liftsPerHourVariance={varianceAnalysis.operationalVariance.liftsPerHourVariance}
            costPerTonVariance={varianceAnalysis.operationalVariance.costPerTonVariance}
            visitsPerWeekVariance={varianceAnalysis.operationalVariance.visitsPerWeekVariance}
            vesselOperationalData={varianceAnalysis.operationalVariance.vesselOperationalData}
          />

          {/* Production Support Variance Analysis */}
          <ProductionSupportVarianceDashboard
            monthlyCostVariance={varianceAnalysis.productionSupport.monthlyCostVariance}
            visitsPerWeekVariance={varianceAnalysis.productionSupport.visitsPerWeekVariance}
            facilityEfficiencyData={varianceAnalysis.productionSupport.facilityEfficiencyData}
          />
        </div>

      </div>
    </div>
  );
};

export default ProductionDashboard;