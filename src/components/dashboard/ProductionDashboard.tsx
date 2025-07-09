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
import { calculateAllEnhancedKPIs } from '../../utils/enhancedKPICalculation';
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
        filters.selectedLocation,
        voyageList,
        vesselManifests // Pass all vessel manifests for shared visits analysis
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
          cargoTonnagePerVisit: prevManifestMetrics.cargoTonnagePerVisit,
          sharedVisitsPercentage: prevManifestMetrics.sharedVisitsPercentage || 0
        },
        lifts: {
          totalLifts: prevManifestMetrics.totalLifts,
          liftsPerHour: (() => {
            // Calculate actual cargo operation hours for previous period
            const prevCargoEvents = voyageEvents.filter(event => {
              // Time filtering for previous period
              if (previousFilterYear !== undefined) {
                const eventDate = new Date(event.eventDate);
                if (previousFilterMonth !== undefined) {
                  if (eventDate.getMonth() !== previousFilterMonth || eventDate.getFullYear() !== previousFilterYear) return false;
                } else {
                  if (eventDate.getFullYear() !== previousFilterYear) return false;
                }
              } else {
                return false; // No previous period defined
              }
              
              // Location filtering - same logic as current period
              const eventLocation = event.location?.toLowerCase().trim() || '';
              const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
              const productionFacilities = getProductionFacilities();
              
              if (filters.selectedLocation !== 'All Locations') {
                const selectedFacility = productionFacilities.find(
                  f => f.displayName === filters.selectedLocation
                );
                if (selectedFacility) {
                  const facilityLocationName = selectedFacility.locationName.toLowerCase();
                  const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                  
                  const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                  const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/g, '').trim();
                  
                  const matchesLocation = 
                    eventLocation.includes(facilityLocationName) ||
                    mappedLocation.includes(facilityLocationName) ||
                    eventLocation.includes(facilityDisplayName) ||
                    mappedLocation.includes(facilityDisplayName) ||
                    coreEventLocation.includes(coreLocationName) ||
                    facilityLocationName.includes(coreEventLocation) ||
                    (facilityLocationName.includes('thunder horse') && (eventLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                    (facilityLocationName.includes('mad dog') && (eventLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
                  
                  if (!matchesLocation) return false;
                }
              } else {
                const matchesAnyProductionFacility = productionFacilities.some(facility => {
                  const facilityLocationName = facility.locationName.toLowerCase();
                  const facilityDisplayName = facility.displayName.toLowerCase();
                  
                  const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                  const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/g, '').trim();
                  const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/g, '').trim();
                  
                  return eventLocation.includes(facilityLocationName) ||
                         mappedLocation.includes(facilityLocationName) ||
                         eventLocation.includes(facilityDisplayName) ||
                         mappedLocation.includes(facilityDisplayName) ||
                         coreEventLocation.includes(coreLocationName) ||
                         coreMappedLocation.includes(coreLocationName) ||
                         facilityLocationName.includes(coreEventLocation) ||
                         facilityLocationName.includes(coreMappedLocation) ||
                         (facilityLocationName.includes('thunder horse') && (eventLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                         (facilityLocationName.includes('mad dog') && (eventLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
                });
                
                if (!matchesAnyProductionFacility) return false;
              }
              
              // Filter for cargo operation activities
              const parentEvent = (event.parentEvent || '').toLowerCase();
              const eventName = (event.event || '').toLowerCase();
              const remarks = (event.remarks || '').toLowerCase();
              
              return parentEvent.includes('cargo') || 
                     parentEvent.includes('loading') || 
                     parentEvent.includes('offloading') ||
                     parentEvent.includes('lifting') ||
                     eventName.includes('cargo') ||
                     eventName.includes('loading') ||
                     eventName.includes('offloading') ||
                     eventName.includes('lifting') ||
                     eventName.includes('crane') ||
                     remarks.includes('cargo') ||
                     remarks.includes('loading') ||
                     remarks.includes('offloading') ||
                     remarks.includes('lifting') ||
                     remarks.includes('crane');
            });
            
            const prevCargoOperationHours = prevCargoEvents.reduce((sum, event) => sum + (event.hours || 0), 0);
            return prevCargoOperationHours > 0 ? prevManifestMetrics.totalLifts / prevCargoOperationHours : 0;
          })(),
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
        filters.selectedLocation,
        voyageList,
        vesselManifests // Pass all vessel manifests for shared visits analysis
      );

      // Debug: Log detailed manifest metrics for production
      console.log('📋 PRODUCTION MANIFEST METRICS DEBUG:', {
        filters: {
          selectedMonth: filters.selectedMonth,
          selectedLocation: filters.selectedLocation,
          parsedMonth: filterMonth,
          parsedYear: filterYear
        },
        manifestMetrics: {
          totalLifts: manifestMetrics.totalLifts,
          totalRTLifts: manifestMetrics.totalRTLifts,
          totalAllLifts: manifestMetrics.totalAllLifts,
          rtLiftsPercentage: manifestMetrics.rtLiftsPercentage,
          totalCargoTons: manifestMetrics.totalCargoTons,
          uniqueManifests: manifestMetrics.uniqueManifests,
          vesselVisits: manifestMetrics.vesselVisits,
          validationRate: manifestMetrics.validationRate,
          invalidManifests: manifestMetrics.invalidManifests
        },
        rawDataCounts: {
          totalVesselManifests: vesselManifests.length,
          totalCostAllocations: costAllocation.length
        }
      });

      // Debug: Compare with direct manifest filtering (without cost allocation dependency)
      const directManifestFiltering = (() => {
        // Filter manifests directly by time and location for production facilities
        let filteredManifests = vesselManifests;
        
        // Time filtering
        if (isYTD && filterYear !== undefined) {
          filteredManifests = filteredManifests.filter(manifest => 
            manifest.manifestDate.getFullYear() === filterYear
          );
        } else if (filterMonth !== undefined && filterYear !== undefined) {
          filteredManifests = filteredManifests.filter(manifest => 
            manifest.manifestDate.getMonth() === filterMonth && 
            manifest.manifestDate.getFullYear() === filterYear
          );
        }
        
        // Location filtering for production facilities
        const productionFacilities = getProductionFacilities();
        if (filters.selectedLocation !== 'All Locations') {
          // Filter to specific production facility
          const selectedFacility = productionFacilities.find(
            f => f.displayName === filters.selectedLocation
          );
          if (selectedFacility) {
            filteredManifests = filteredManifests.filter(manifest => {
              const offshoreLocation = manifest.offshoreLocation?.toLowerCase().trim() || '';
              const mappedLocation = manifest.mappedLocation?.toLowerCase().trim() || '';
              const facilityLocationName = selectedFacility.locationName.toLowerCase();
              const facilityDisplayName = selectedFacility.displayName.toLowerCase();
              
              const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
              const coreOffshoreLocation = offshoreLocation.replace(/\s*\([^)]*\)/g, '').trim();
              
              return offshoreLocation.includes(facilityLocationName) ||
                     mappedLocation.includes(facilityLocationName) ||
                     offshoreLocation.includes(facilityDisplayName) ||
                     mappedLocation.includes(facilityDisplayName) ||
                     coreOffshoreLocation.includes(coreLocationName) ||
                     facilityLocationName.includes(coreOffshoreLocation) ||
                     (facilityLocationName.includes('thunder horse') && offshoreLocation.includes('thunder horse')) ||
                     (facilityLocationName.includes('mad dog') && offshoreLocation.includes('mad dog'));
            });
          }
        } else {
          // Filter to ANY production facility (not drilling rigs)
          filteredManifests = filteredManifests.filter(manifest => {
            const offshoreLocation = manifest.offshoreLocation?.toLowerCase().trim() || '';
            const mappedLocation = manifest.mappedLocation?.toLowerCase().trim() || '';
            
            return productionFacilities.some(facility => {
              const facilityLocationName = facility.locationName.toLowerCase();
              const facilityDisplayName = facility.displayName.toLowerCase();
              
              const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
              const coreOffshoreLocation = offshoreLocation.replace(/\s*\([^)]*\)/g, '').trim();
              const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/g, '').trim();
              
              return offshoreLocation.includes(facilityLocationName) ||
                     mappedLocation.includes(facilityLocationName) ||
                     offshoreLocation.includes(facilityDisplayName) ||
                     mappedLocation.includes(facilityDisplayName) ||
                     coreOffshoreLocation.includes(coreLocationName) ||
                     coreMappedLocation.includes(coreLocationName) ||
                     facilityLocationName.includes(coreOffshoreLocation) ||
                     facilityLocationName.includes(coreMappedLocation) ||
                     (facilityLocationName.includes('thunder horse') && (offshoreLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                     (facilityLocationName.includes('mad dog') && (offshoreLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
            });
          });
        }
        
        // Calculate totals directly
        const directTotalLifts = filteredManifests.reduce((sum, manifest) => sum + (manifest.lifts || 0), 0);
        const directTotalCargoTons = filteredManifests.reduce((sum, manifest) => sum + (manifest.deckTons || 0) + (manifest.rtTons || 0), 0);
        const directUniqueManifests = new Set(filteredManifests.map(m => m.manifestNumber)).size;
        
        return {
          filteredCount: filteredManifests.length,
          directTotalLifts,
          directTotalCargoTons,
          directUniqueManifests,
          sampleManifests: filteredManifests.slice(0, 5).map(m => ({
            manifestNumber: m.manifestNumber,
            offshoreLocation: m.offshoreLocation,
            lifts: m.lifts,
            deckTons: m.deckTons,
            rtTons: m.rtTons,
            costCode: m.costCode
          }))
        };
      })();
      
             console.log('🔍 DIRECT MANIFEST FILTERING COMPARISON:', {
         enhancedMethod: {
           totalLifts: manifestMetrics.totalLifts,
           totalCargoTons: manifestMetrics.totalCargoTons,
           uniqueManifests: manifestMetrics.uniqueManifests
         },
         directMethod: {
           totalLifts: directManifestFiltering.directTotalLifts,
           totalCargoTons: directManifestFiltering.directTotalCargoTons,
           uniqueManifests: directManifestFiltering.directUniqueManifests,
           filteredCount: directManifestFiltering.filteredCount
         },
         difference: {
           lifts: directManifestFiltering.directTotalLifts - manifestMetrics.totalLifts,
           cargoTons: directManifestFiltering.directTotalCargoTons - manifestMetrics.totalCargoTons,
           manifests: directManifestFiltering.directUniqueManifests - manifestMetrics.uniqueManifests
         },
         sampleManifests: directManifestFiltering.sampleManifests
       });

       // PROMINENT LOG FOR EASY SPOTTING
       console.log('🚨🚨🚨 LIFTS COMPARISON RESULTS 🚨🚨🚨');
       console.log(`Enhanced Method Lifts: ${manifestMetrics.totalLifts}`);
       console.log(`Direct Method Lifts: ${directManifestFiltering.directTotalLifts}`);
       console.log(`Difference: ${directManifestFiltering.directTotalLifts - manifestMetrics.totalLifts} lifts`);
       console.log(`Location Filter: ${filters.selectedLocation}`);
       console.log(`Time Filter: ${filters.selectedMonth}`);
       console.log('🚨🚨🚨 END LIFTS COMPARISON 🚨🚨🚨');

      // Legacy voyage metrics calculation - replaced with fixedProductionKPIs
      // const voyageMetrics = calculateEnhancedVoyageEventMetrics(...);

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

      // CRITICAL FIX: Calculate enhanced KPIs using cost allocation as master data source for PRODUCTION
      console.log('🔧 CALCULATING ENHANCED PRODUCTION KPIs with Cost Allocation Master Data Source');
      const fixedProductionKPIs = calculateAllEnhancedKPIs(
        voyageEvents,
        vesselManifests,
        costAllocation,
        'Production', // Focus on production department
        isYTD ? undefined : filterMonth,
        filterYear,
        filters.selectedLocation
      );

      // Build comprehensive production metrics object using FIXED KPIs
      const metrics = {
        // FIXED: Core cargo metrics using cost allocation LC filtering for PRODUCTION
        cargo: {
          totalCargoTons: manifestMetrics.totalCargoTons || 0, // Use manifest metrics directly
          cargoTonnagePerVisit: manifestMetrics.cargoTonnagePerVisit || 0,
          rtPercentage: manifestMetrics.rtPercentage || 0,
          outboundPercentage: manifestMetrics.outboundPercentage || 0,
          productionOnlyTons: manifestMetrics.totalCargoTons || 0,
          validationRate: manifestMetrics.validationRate || 0,
          // RT Lifts metrics from enhanced manifest calculation
          totalRTLifts: manifestMetrics.totalRTLifts || 0,
          totalAllLifts: manifestMetrics.totalAllLifts || manifestMetrics.totalLifts || 0,
          rtLiftsPercentage: manifestMetrics.rtLiftsPercentage || 0,
          // Shared visits metrics
          sharedVisitsPercentage: manifestMetrics.sharedVisitsPercentage || 0,
          totalProductionVisits: manifestMetrics.totalProductionVisits || 0,
          sharedProductionVisits: manifestMetrics.sharedProductionVisits || 0,
          sharedVisitsDetails: manifestMetrics.sharedVisitsDetails || []
        },
        
        // FIXED: Lifts metrics with proper LC validation and vessel codes for PRODUCTION
        lifts: {
          totalLifts: fixedProductionKPIs.liftsPerHour.totalLifts,
          liftsPerHour: fixedProductionKPIs.liftsPerHour.liftsPerHour,
          cargoOperationHours: fixedProductionKPIs.liftsPerHour.cargoOperationHours,
          lcValidationRate: fixedProductionKPIs.liftsPerHour.lcValidationRate,
          vesselVisits: manifestMetrics.uniqueManifests
        },
        
        // FIXED: Hours metrics using vessel codes classification for PRODUCTION
        hours: {
          totalOSVHours: fixedProductionKPIs.productiveHours.totalOSVHours,
          totalProductiveHours: fixedProductionKPIs.productiveHours.productiveHours,
          productiveHoursPercentage: fixedProductionKPIs.productiveHours.productivePercentage,
          vesselCodesCoverage: fixedProductionKPIs.productiveHours.vesselCodesCoverage,
          averageTripDuration: 0 // Will be calculated from voyage duration if needed
        },
        
        // Cost metrics from enhanced cost allocation
        costs: {
          totalVesselCost: enhancedKPIs.totalVesselCost || 0,
          costPerTon: fixedProductionKPIs.cargoTons.totalCargoTons > 0 ? (enhancedKPIs.totalVesselCost || 0) / fixedProductionKPIs.cargoTons.totalCargoTons : 0,
          costPerHour: fixedProductionKPIs.productiveHours.totalOSVHours > 0 ? (enhancedKPIs.totalVesselCost || 0) / fixedProductionKPIs.productiveHours.totalOSVHours : 0
        },
        
        // FIXED: Utilization metrics using enhanced calculations with cost allocation validation for PRODUCTION
        utilization: {
          vesselUtilization: fixedProductionKPIs.utilization.vesselUtilization,
          transitTimeHours: fixedProductionKPIs.utilization.transitTimeHours,
          atLocationHours: fixedProductionKPIs.utilization.atLocationHours,
          totalOffshoreTime: fixedProductionKPIs.utilization.totalOffshoreTime,
          utilizationConfidence: fixedProductionKPIs.utilization.utilizationConfidence
        },
        
        // ENHANCED: Waiting time metrics using vessel codes classification for PRODUCTION
        waitingTime: {
          waitingTimeOffshore: fixedProductionKPIs.waitingTime.waitingTimeOffshore,
          waitingPercentage: fixedProductionKPIs.waitingTime.waitingPercentage,
          weatherExcludedHours: fixedProductionKPIs.waitingTime.weatherExcludedHours,
          installationWaitingHours: fixedProductionKPIs.waitingTime.installationWaitingHours
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

      console.log('✅ ENHANCED PRODUCTION METRICS CALCULATED:', {
        cargoTons: `${metrics.cargo.totalCargoTons.toLocaleString()} tons (${(metrics.cargo as any).validationRate?.toFixed(1) || 'N/A'}% validation)`,
        lifts: `${metrics.lifts.totalLifts.toLocaleString()} lifts @ ${metrics.lifts.liftsPerHour.toFixed(2)} lifts/hr`,
        productiveHours: `${metrics.hours.totalProductiveHours.toLocaleString()} hrs (${metrics.hours.productiveHoursPercentage.toFixed(1)}%)`,
        vesselUtilization: `${metrics.utilization.vesselUtilization.toFixed(1)}% (${(metrics.utilization as any).utilizationConfidence || 'Medium'} confidence)`,
        dataQuality: `LC: ${fixedProductionKPIs.dataQuality.lcCoverage.toFixed(1)}%, VesselCodes: ${fixedProductionKPIs.dataQuality.vesselCodesCoverage.toFixed(1)}%`,
        totalCost: `$${metrics.costs.totalVesselCost.toLocaleString()}`,
        integrityScore: `${Math.round(metrics.integrityScore)}%`
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

        visitsPerWeekCV: operationalVariance.visitsPerWeekVariance.coefficientOfVariation.toFixed(1) + '%',
        monthlyCostCV: productionSupport.monthlyCostVariance.coefficientOfVariation.toFixed(1) + '%',
        outliers: {
          liftsPerHour: operationalVariance.liftsPerHourVariance.outliers.length,

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
      liftsPerHour: 6, // Target: 6 lifts per hour for all scenarios
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
              title: "% Shared Visits",
              value: ((productionMetrics.cargo as any).sharedVisitsPercentage || 0).toFixed(1),
              unit: "%",
              target: 50, // Target: 50% shared visits for efficient multi-stop operations
              trend: (previousPeriodMetrics.cargo as any).sharedVisitsPercentage > 0 ? 
                (((productionMetrics.cargo as any).sharedVisitsPercentage - (previousPeriodMetrics.cargo as any).sharedVisitsPercentage)) : 0,
              isPositive: ((productionMetrics.cargo as any).sharedVisitsPercentage || 0) >= 20, // Higher is better for efficiency
              contextualHelp: (() => {
                const sharedVisitsPercentage = (productionMetrics.cargo as any).sharedVisitsPercentage || 0;
                const totalProductionVisits = (productionMetrics.cargo as any).totalProductionVisits || 0;
                const sharedProductionVisits = (productionMetrics.cargo as any).sharedProductionVisits || 0;
                const details = (productionMetrics.cargo as any).sharedVisitsDetails || [];
                
                // Get unique vessels and locations for summary
                const uniqueVessels = new Set(details.map((d: any) => d.vessel)).size;
                const uniqueFacilities = new Set(details.map((d: any) => d.productionFacility)).size;

                return `🚢 SHARED VISITS ANALYSIS

${sharedVisitsPercentage.toFixed(1)}% of production visits share voyages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 VISIT BREAKDOWN

Shared Visits: ${sharedProductionVisits.toLocaleString()} visits
Total Production Visits: ${totalProductionVisits.toLocaleString()} visits
Efficiency Rate: ${sharedVisitsPercentage.toFixed(1)}%
Unique Vessels: ${uniqueVessels} vessels
Production Facilities: ${uniqueFacilities} locations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 EFFICIENCY ANALYSIS

Target: >50% shared visits for optimal route efficiency
Current: ${sharedVisitsPercentage >= 50 ? '✅ Exceeds Target' : sharedVisitsPercentage >= 40 ? '⚠️ Near Target' : '❌ Below Target'}
Status: ${sharedVisitsPercentage >= 60 ? 'Excellent' : sharedVisitsPercentage >= 50 ? 'Good' : sharedVisitsPercentage >= 40 ? 'Fair' : 'Needs Improvement'}

Shared visits indicate efficient multi-stop voyage planning.
Higher percentages suggest optimized logistics and reduced costs.

Period: ${filters.selectedMonth}
Location: ${filters.selectedLocation}

Source: Vessel manifests voyage analysis`;
              })()
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
                const liftsPerHour = productionMetrics.lifts.liftsPerHour;
                
                // Calculate actual cargo operation hours for tooltip
                let cargoOperationHours = 0;
                const cargoEvents = voyageEvents.filter(event => {
                  // Time filtering
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
                  
                  if (isYTD && filterYear !== undefined) {
                    const eventDate = new Date(event.eventDate);
                    if (eventDate.getFullYear() !== filterYear) return false;
                  } else if (filterMonth !== undefined && filterYear !== undefined) {
                    const eventDate = new Date(event.eventDate);
                    if (eventDate.getMonth() !== filterMonth || eventDate.getFullYear() !== filterYear) return false;
                  }
                  
                  // Location filtering - production facilities only
                  const eventLocation = event.location?.toLowerCase().trim() || '';
                  const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
                  const productionFacilities = getProductionFacilities();
                  
                  if (filters.selectedLocation !== 'All Locations') {
                    const selectedFacility = productionFacilities.find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      const matchesLocation = 
                        eventLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        eventLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName) ||
                        coreEventLocation.includes(coreLocationName) ||
                        facilityLocationName.includes(coreEventLocation) ||
                        (facilityLocationName.includes('thunder horse') && (eventLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                        (facilityLocationName.includes('mad dog') && (eventLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
                      
                      if (!matchesLocation) return false;
                    }
                  } else {
                    const matchesAnyProductionFacility = productionFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      return eventLocation.includes(facilityLocationName) ||
                             mappedLocation.includes(facilityLocationName) ||
                             eventLocation.includes(facilityDisplayName) ||
                             mappedLocation.includes(facilityDisplayName) ||
                             coreEventLocation.includes(coreLocationName) ||
                             coreMappedLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreEventLocation) ||
                             facilityLocationName.includes(coreMappedLocation) ||
                             (facilityLocationName.includes('thunder horse') && (eventLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                             (facilityLocationName.includes('mad dog') && (eventLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
                    });
                    
                    if (!matchesAnyProductionFacility) return false;
                  }
                  
                  // Filter for cargo operation activities
                  const parentEvent = (event.parentEvent || '').toLowerCase();
                  const eventName = (event.event || '').toLowerCase();
                  const remarks = (event.remarks || '').toLowerCase();
                  
                  return parentEvent.includes('cargo') || 
                         parentEvent.includes('loading') || 
                         parentEvent.includes('offloading') ||
                         parentEvent.includes('lifting') ||
                         eventName.includes('cargo') ||
                         eventName.includes('loading') ||
                         eventName.includes('offloading') ||
                         eventName.includes('lifting') ||
                         eventName.includes('crane') ||
                         remarks.includes('cargo') ||
                         remarks.includes('loading') ||
                         remarks.includes('offloading') ||
                         remarks.includes('lifting') ||
                         remarks.includes('crane');
                });
                
                cargoOperationHours = cargoEvents.reduce((sum, event) => sum + (event.hours || 0), 0);

                return `⚡ ENHANCED CARGO OPERATION EFFICIENCY

${liftsPerHour.toFixed(2)} lifts/hour

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 EFFICIENCY BREAKDOWN

Total Lifts: ${totalLifts.toLocaleString()} crane operations
Cargo Operation Hours: ${(productionMetrics.lifts as any).cargoOperationHours?.toFixed(1) || Math.round(cargoOperationHours)} hours
LC Validation Rate: ${(productionMetrics.lifts as any).lcValidationRate?.toFixed(1) || 'N/A'}%
Location: ${filters.selectedLocation}
Period: ${filters.selectedMonth}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 ENHANCED METHODOLOGY

Formula: Total Lifts ÷ Actual Cargo Operation Hours
Source: Cost allocation LC validation + vessel codes classification
Includes: Vessel codes cargo operations (no hardcoded patterns)
Target: ${dynamicTargets.liftsPerHour} lifts/hour
Data Quality: Uses CostAllocation.xlsx as master data source

Note: ENHANCED with cost allocation validation and vessel codes classification`;
              })()
            },
            {
              title: "Logistics Vessel Cost",
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
              target: (() => {
                // Facility-specific logistics cost targets
                const selectedLocation = filters.selectedLocation;
                if (selectedLocation.includes('Na Kika')) return 550000; // $550k for Na Kika
                if (selectedLocation.includes('Thunder Horse')) return 800000; // $800k for Thunder Horse
                if (selectedLocation.includes('Mad Dog')) return 750000; // $750k for Mad Dog
                if (selectedLocation.includes('Atlantis')) return 650000; // $650k for Atlantis
                if (selectedLocation.includes('Argos')) return 280000; // $280k for Argos
                return 2500000; // $2.5M for All Locations
              })(),
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
                  return `💰 EXACT LOGISTICS VESSEL COST

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

Note: Vessel charter cost only - does not include fuel costs`;
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
              title: "Round-Tripped Lifts",
              value: ((productionMetrics.cargo as any).totalRTLifts || 0).toLocaleString(),
              unit: "lifts",
              target: 15, // Target: 15 round-tripped lifts
              trend: (previousPeriodMetrics.cargo as any).totalRTLifts > 0 ? 
                (((productionMetrics.cargo as any).totalRTLifts - (previousPeriodMetrics.cargo as any).totalRTLifts) / (previousPeriodMetrics.cargo as any).totalRTLifts) * 100 : 0,
              isPositive: ((productionMetrics.cargo as any).totalRTLifts || 0) <= ((previousPeriodMetrics.cargo as any).totalRTLifts || 100), // Lower is better
              contextualHelp: (() => {
                const rtLifts = (productionMetrics.cargo as any).totalRTLifts || 0;
                const totalLifts = productionMetrics.lifts.totalLifts;
                const allLifts = ((productionMetrics.cargo as any).totalAllLifts || totalLifts);
                const rtPercentage = allLifts > 0 ? (rtLifts / allLifts) * 100 : 0;

                return `🔄 ROUND-TRIPPED LIFTS ANALYSIS

${rtLifts.toLocaleString()} round-trip crane operations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 LIFT BREAKDOWN

RT Lifts: ${rtLifts.toLocaleString()} crane operations
Outbound Lifts: ${totalLifts.toLocaleString()} crane operations  
Total Lifts: ${allLifts.toLocaleString()} crane operations
RT Percentage: ${rtPercentage.toFixed(1)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 EFFICIENCY ANALYSIS

Target: <15% of total lifts (lower is better)
Current: ${rtPercentage <= 15 ? '✅ Within Target' : '⚠️ Above Target'}
Status: ${rtPercentage <= 10 ? 'Excellent' : rtPercentage <= 15 ? 'Good' : rtPercentage <= 25 ? 'Fair' : 'Needs Attention'}

RT lifts indicate cargo sent to platforms but returned unused.
High RT% suggests planning inefficiencies or platform issues.

Source: Vessel manifests RT Lifts field`;
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
            title="Vessel Utilization" 
            value={Math.round((productionMetrics.utilization as any).vesselUtilization || 0).toString()}
            variant="compact"
            unit="%"
            trend={(previousPeriodMetrics.utilization as any).vesselUtilization > 0 ? 
              (((productionMetrics.utilization as any).vesselUtilization - (previousPeriodMetrics.utilization as any).vesselUtilization) / (previousPeriodMetrics.utilization as any).vesselUtilization) * 100 : 0}
            isPositive={(productionMetrics.utilization as any).vesselUtilization >= (previousPeriodMetrics.utilization as any).vesselUtilization}
            color="purple"
            contextualHelp={`ENHANCED: Vessel utilization calculated using cost allocation validation and vessel codes classification for PRODUCTION operations. Confidence: ${(productionMetrics.utilization as any).utilizationConfidence || 'Medium'}. Transit time: ${(productionMetrics.utilization as any).transitTimeHours?.toFixed(1) || 'N/A'} hrs. Total offshore time: ${(productionMetrics.utilization as any).totalOffshoreTime?.toFixed(1) || 'N/A'} hrs. Uses enhanced calculation to prevent unrealistic values.`}
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

          {/* Enhanced Production Vessel Fleet Performance */}
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
                      Visit Frequency & Performance Analysis
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {((): React.ReactNode => {
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
                  // Location filtering - ALWAYS filter to production facilities only
                  const eventLocation = event.location?.toLowerCase().trim() || '';
                  const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
                  const productionFacilities = getProductionFacilities();
                  
                  if (filters.selectedLocation !== 'All Locations') {
                    // Filter to specific production facility
                    const selectedFacility = productionFacilities.find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      const matchesLocation = 
                        eventLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        eventLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName) ||
                        coreEventLocation.includes(coreLocationName) ||
                        facilityLocationName.includes(coreEventLocation) ||
                        // Special handling for common location variations
                        (facilityLocationName.includes('thunder horse') && eventLocation.includes('thunder horse')) ||
                        (facilityLocationName.includes('mad dog') && eventLocation.includes('mad dog'));
                      
                      if (!matchesLocation) return false;
                    }
                  } else {
                    // Filter to ANY production facility (not drilling rigs)
                    const matchesAnyProductionFacility = productionFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      return eventLocation.includes(facilityLocationName) ||
                             mappedLocation.includes(facilityLocationName) ||
                             eventLocation.includes(facilityDisplayName) ||
                             mappedLocation.includes(facilityDisplayName) ||
                             coreEventLocation.includes(coreLocationName) ||
                             coreMappedLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreEventLocation) ||
                             facilityLocationName.includes(coreMappedLocation) ||
                             // Special handling for common location variations
                             (facilityLocationName.includes('thunder horse') && (eventLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                             (facilityLocationName.includes('mad dog') && (eventLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
                    });
                    
                    if (!matchesAnyProductionFacility) return false;
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
                  // Location filtering - ALWAYS filter to production facilities only
                  const offshoreLocation = manifest.offshoreLocation?.toLowerCase().trim() || '';
                  const mappedLocation = manifest.mappedLocation?.toLowerCase().trim() || '';
                  const productionFacilities = getProductionFacilities();
                  
                  if (filters.selectedLocation !== 'All Locations') {
                    // Filter to specific production facility
                    const selectedFacility = productionFacilities.find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreOffshoreLocation = offshoreLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      const matchesLocation = 
                        offshoreLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        offshoreLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName) ||
                        coreOffshoreLocation.includes(coreLocationName) ||
                        facilityLocationName.includes(coreOffshoreLocation) ||
                        // Special handling for common location variations
                        (facilityLocationName.includes('thunder horse') && offshoreLocation.includes('thunder horse')) ||
                        (facilityLocationName.includes('mad dog') && offshoreLocation.includes('mad dog'));
                      
                      if (!matchesLocation) return false;
                    }
                  } else {
                    // Filter to ANY production facility (not drilling rigs)
                    const matchesAnyProductionFacility = productionFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreOffshoreLocation = offshoreLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      return offshoreLocation.includes(facilityLocationName) ||
                             mappedLocation.includes(facilityLocationName) ||
                             offshoreLocation.includes(facilityDisplayName) ||
                             mappedLocation.includes(facilityDisplayName) ||
                             coreOffshoreLocation.includes(coreLocationName) ||
                             coreMappedLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreOffshoreLocation) ||
                             facilityLocationName.includes(coreMappedLocation) ||
                             // Special handling for common location variations
                             (facilityLocationName.includes('thunder horse') && (offshoreLocation.includes('thunder horse') || mappedLocation.includes('thunder horse'))) ||
                             (facilityLocationName.includes('mad dog') && (offshoreLocation.includes('mad dog') || mappedLocation.includes('mad dog')));
                    });
                    
                    if (!matchesAnyProductionFacility) return false;
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

                // Filter voyage list data to get actual voyages (not individual events)
                const filteredVoyageList = voyageList.filter((voyage: any) => {
                  // Location filtering - ALWAYS filter to production facilities only
                  const voyageLocation = voyage.locations?.toLowerCase().trim() || '';
                  const productionFacilities = getProductionFacilities();
                  
                  if (filters.selectedLocation !== 'All Locations') {
                    // Filter to specific production facility
                    const selectedFacility = productionFacilities.find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreVoyageLocation = voyageLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      const matchesLocation = 
                        voyageLocation.includes(facilityLocationName) ||
                        voyageLocation.includes(facilityDisplayName.toLowerCase()) ||
                        coreVoyageLocation.includes(coreLocationName) ||
                        facilityLocationName.includes(coreVoyageLocation) ||
                        // Special handling for common location variations
                        (facilityLocationName.includes('thunder horse') && voyageLocation.includes('thunder horse')) ||
                        (facilityLocationName.includes('mad dog') && voyageLocation.includes('mad dog'));
                      
                      if (!matchesLocation) return false;
                    }
                  } else {
                    // Filter to ANY production facility (not drilling rigs)
                    const matchesAnyProductionFacility = productionFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/g, '').trim();
                      const coreVoyageLocation = voyageLocation.replace(/\s*\([^)]*\)/g, '').trim();
                      
                      return voyageLocation.includes(facilityLocationName) ||
                             voyageLocation.includes(facilityDisplayName.toLowerCase()) ||
                             coreVoyageLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreVoyageLocation) ||
                             // Special handling for common location variations
                             (facilityLocationName.includes('thunder horse') && voyageLocation.includes('thunder horse')) ||
                             (facilityLocationName.includes('mad dog') && voyageLocation.includes('mad dog'));
                    });
                    
                    if (!matchesAnyProductionFacility) return false;
                  }
                  
                  // Time filtering
                  if (voyage.voyageDate) {
                    const voyageDate = new Date(voyage.voyageDate);
                    if (isYTD && filterYear !== undefined) {
                      if (voyageDate.getFullYear() !== filterYear) return false;
                    } else if (filterMonth !== undefined && filterYear !== undefined) {
                      if (voyageDate.getMonth() !== filterMonth || voyageDate.getFullYear() !== filterYear) return false;
                    }
                  }
                  
                  return true;
                });

                // Helper functions for vessel classification (same as DrillingDashboard)
                const classifyVessel = (vesselName: string) => {
                  const name = vesselName.toLowerCase();
                  
                  // Determine vessel type
                  let type = 'OSV'; // Default to OSV
                  if (name.includes('fast') || name.includes('supply') || name.includes('fsv')) {
                    type = 'FSV';
                  }
                  
                  // Determine company
                  let company = 'Unknown';
                  if (name.includes('pelican') || name.includes('dauphin') || 
                      name.includes('ship') || name.includes('fast') ||
                      name.includes('charlie') || name.includes('lucy') ||
                      name.includes('millie')) {
                    company = 'Edison Chouest';
                  } else if (name.includes('harvey')) {
                    company = 'Harvey Gulf';
                  } else if (name.includes('hos')) {
                    company = 'Hornbeck Offshore';
                  } else if (name.includes('amber') || name.includes('candies')) {
                    company = 'Otto Candies';
                  } else if (name.includes('jackson') || name.includes('lightning') || 
                             name.includes('squall') || name.includes('cajun')) {
                    company = 'Jackson Offshore';
                  }
                  
                  return { type, company };
                };

                const getVesselColor = (company: string, index: number) => {
                  const colorSchemes = {
                    'Edison Chouest': { 
                      border: 'border-blue-200', 
                      bg: 'bg-blue-50', 
                      dot: 'bg-blue-500', 
                      text: 'text-blue-700', 
                      progress: 'bg-blue-500' 
                    },
                    'Harvey Gulf': { 
                      border: 'border-emerald-200', 
                      bg: 'bg-emerald-50', 
                      dot: 'bg-emerald-500', 
                      text: 'text-emerald-700', 
                      progress: 'bg-emerald-500' 
                    },
                    'Hornbeck Offshore': { 
                      border: 'border-indigo-200', 
                      bg: 'bg-indigo-50', 
                      dot: 'bg-indigo-500', 
                      text: 'text-indigo-700', 
                      progress: 'bg-indigo-500' 
                    },
                    'Otto Candies': { 
                      border: 'border-green-200', 
                      bg: 'bg-green-50', 
                      dot: 'bg-green-500', 
                      text: 'text-green-700', 
                      progress: 'bg-green-500' 
                    },
                    'Jackson Offshore': { 
                      border: 'border-purple-200', 
                      bg: 'bg-purple-50', 
                      dot: 'bg-purple-500', 
                      text: 'text-purple-700', 
                      progress: 'bg-purple-500' 
                    }
                  };
                  
                  return colorSchemes[company as keyof typeof colorSchemes] || {
                    border: 'border-gray-200', 
                    bg: 'bg-gray-50', 
                    dot: 'bg-gray-500', 
                    text: 'text-gray-700', 
                    progress: 'bg-gray-500' 
                  };
                };

                // Get unique vessels from filtered data and calculate their metrics based on actual voyages
                const uniqueVesselActivity = new Map();
                
                // Process filtered voyage list to get actual voyage counts
                filteredVoyageList.forEach((voyage: any) => {
                  if (!voyage.vessel) return;
                  const vesselName = voyage.vessel.trim();
                  
                  if (!uniqueVesselActivity.has(vesselName)) {
                    const classification = classifyVessel(vesselName);
                    uniqueVesselActivity.set(vesselName, {
                      name: vesselName,
                      ...classification,
                      category: `${classification.type} - ${classification.company}`,
                      voyages: 0,
                      hours: 0,
                      cargo: 0,
                      lifts: 0,
                      events: 0,
                      manifests: 0
                    });
                  }
                  
                  const vessel = uniqueVesselActivity.get(vesselName);
                  vessel.voyages++; // This is the actual visit count
                });
                
                // Process voyage events to get supporting data (hours)
                filteredVoyageEvents.forEach(event => {
                  if (!event.vessel) return;
                  const vesselName = event.vessel.trim();
                  
                  if (uniqueVesselActivity.has(vesselName)) {
                    const vessel = uniqueVesselActivity.get(vesselName);
                    vessel.events++;
                    vessel.hours += event.hours || 0;
                  }
                });
                
                // Process manifests to get supporting data (cargo, lifts)
                filteredManifests.forEach((manifest: any) => {
                  if (!manifest.transporter) return;
                  const vesselName = manifest.transporter.trim();
                  
                  if (uniqueVesselActivity.has(vesselName)) {
                    const vessel = uniqueVesselActivity.get(vesselName);
                    vessel.manifests++;
                    vessel.cargo += (manifest.deckTons || 0) + (manifest.rtTons || 0);
                    vessel.lifts += manifest.lifts || 0;
                  }
                });

                // Convert to array and add color schemes and activity levels
                const vesselMetrics = Array.from(uniqueVesselActivity.values()).map((vessel: any, index) => {
                  const totalVisits = vessel.voyages; // Use actual voyage count
                  const activityLevel = Math.min(100, Math.max(0, (totalVisits / 10) * 100)); // Scale based on 10 visits = 100%
                  
                  return {
                    ...vessel,
                    color: getVesselColor(vessel.company, index),
                    hours: Math.round(vessel.hours),
                    cargo: Math.round(vessel.cargo),
                    activityLevel: Math.round(activityLevel * 10) / 10,
                    totalVisits
                  };
                }).sort((a, b) => b.totalVisits - a.totalVisits); // Sort by actual visit count

                // Determine if we should show the summary view (when there are many vessels)
                const shouldShowSummary = vesselMetrics.length > 15 || filters.selectedMonth === 'All Months' || filters.selectedMonth === 'YTD';

                if (shouldShowSummary) {
                  // Summary view for large datasets
                  return (
                    <div className="space-y-6">
                      {/* Enhanced Header with Period Summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-blue-900 mb-2">Production Fleet Summary</h4>
                            <p className="text-sm text-blue-700">
                              {vesselMetrics.length} vessels with activity
                              {filters.selectedLocation !== 'All Locations' && ` at ${filters.selectedLocation}`}
                              {filters.selectedMonth !== 'All Months' && ` during ${filters.selectedMonth}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-700">
                              {vesselMetrics.reduce((sum, v) => sum + v.totalVisits, 0)}
                            </div>
                            <div className="text-sm text-blue-600">Total Visits</div>
                            <div className="text-xs text-blue-500 mt-1">
                              {filteredVoyageEvents.length} events + {filteredManifests.length} manifests
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{vesselMetrics.length}</div>
                            <div className="text-sm text-blue-600">Active Vessels</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{Math.round(vesselMetrics.reduce((sum, v) => sum + v.hours, 0)).toLocaleString()}</div>
                            <div className="text-sm text-blue-600">Total Hours</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{Math.round(vesselMetrics.reduce((sum, v) => sum + v.cargo, 0)).toLocaleString()}</div>
                            <div className="text-sm text-blue-600">Total Cargo (tons)</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{vesselMetrics.reduce((sum, v) => sum + v.lifts, 0).toLocaleString()}</div>
                            <div className="text-sm text-blue-600">Total Lifts</div>
                          </div>
                        </div>
                      </div>

                      {/* Top 10 Most Active Vessels Table */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Most Active Production Vessels</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo (tons)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifts</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {vesselMetrics.slice(0, 10).map((vessel, index) => (
                                <tr key={vessel.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{vessel.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700 font-semibold">{vessel.totalVisits}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{vessel.hours.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{vessel.cargo.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{vessel.lifts}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{vessel.company}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default individual vessel card view for smaller datasets
                return (
                  <div className="space-y-8">
                    {/* Enhanced Header with Period Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-blue-900 mb-2">Production Vessel Activity Analysis</h4>
                          <p className="text-sm text-blue-700">
                            {vesselMetrics.length} vessels with activity
                            {filters.selectedLocation !== 'All Locations' && ` at ${filters.selectedLocation}`}
                            {filters.selectedMonth !== 'All Months' && ` during ${filters.selectedMonth}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-700">
                            {vesselMetrics.reduce((sum, v) => sum + v.totalVisits, 0)}
                          </div>
                          <div className="text-sm text-blue-600">Total Visits</div>
                          <div className="text-xs text-blue-500 mt-1">
                            Actual voyages to location
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* No vessels found message */}
                    {vesselMetrics.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <Ship className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <h4 className="text-lg font-medium text-gray-600">No Vessels Found</h4>
                          <p className="text-sm text-gray-500 mt-2">
                            No vessel activity found for the selected time period and location.
                            {filters.selectedLocation !== 'All Locations' && ` Try selecting "All Locations" or a different location.`}
                            {filters.selectedMonth !== 'All Months' && ` Try selecting "All Months" or a different time period.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Individual Vessel Cards */}
                    {vesselMetrics.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vesselMetrics.map((vessel: any, index) => {
                          // Calculate visit frequency metrics
                          const totalVisits = vessel.totalVisits;
                          const averageCargoPerVisit = totalVisits > 0 ? vessel.cargo / totalVisits : 0;
                          const averageHoursPerVisit = totalVisits > 0 ? vessel.hours / totalVisits : 0;
                          const averageLiftsPerVisit = totalVisits > 0 ? vessel.lifts / totalVisits : 0;
                          
                          // Determine visit frequency category
                          let frequencyCategory = '';
                          let frequencyColor = '';
                          if (totalVisits >= 20) {
                            frequencyCategory = 'High Frequency';
                            frequencyColor = 'text-green-600 bg-green-100';
                          } else if (totalVisits >= 10) {
                            frequencyCategory = 'Medium Frequency';
                            frequencyColor = 'text-blue-600 bg-blue-100';
                          } else if (totalVisits >= 5) {
                            frequencyCategory = 'Regular Visitor';
                            frequencyColor = 'text-orange-600 bg-orange-100';
                          } else {
                            frequencyCategory = 'Occasional';
                            frequencyColor = 'text-gray-600 bg-gray-100';
                          }

                          return (
                            <div key={vessel.name} className={`${vessel.color.bg} ${vessel.color.border} border-2 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden`}>
                              {/* Vessel Header */}
                              <div className="p-4 bg-white border-b border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 ${vessel.color.dot} rounded-full`}></div>
                                    <h5 className="font-semibold text-gray-900 truncate">{vessel.name}</h5>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${frequencyColor}`}>
                                    {frequencyCategory}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">{vessel.type} • {vessel.company}</span>
                                  <span className="font-medium text-gray-800">{vessel.category}</span>
                                </div>
                              </div>

                              {/* Visit Frequency Section */}
                              <div className="p-4 bg-white border-b border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-semibold text-gray-800">Visit Frequency</h5>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-indigo-600">{totalVisits}</div>
                                    <div className="text-xs text-gray-500">Total Visits</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-center">
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <div className="text-sm font-bold text-gray-700">{vessel.events}</div>
                                    <div className="text-xs text-gray-500">Events</div>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <div className="text-sm font-bold text-gray-700">{vessel.manifests}</div>
                                    <div className="text-xs text-gray-500">Manifests</div>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  {/* Average Per Visit Metrics */}
                                  <div className="border-t pt-3">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">Average Per Visit:</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                      <div className="bg-blue-50 rounded p-2">
                                        <div className="text-sm font-bold text-blue-700">{Math.round(averageHoursPerVisit)}h</div>
                                        <div className="text-xs text-blue-600">Hours</div>
                                      </div>
                                      <div className="bg-green-50 rounded p-2">
                                        <div className="text-sm font-bold text-green-700">{Math.round(averageCargoPerVisit)}t</div>
                                        <div className="text-xs text-green-600">Cargo</div>
                                      </div>
                                      <div className="bg-purple-50 rounded p-2">
                                        <div className="text-sm font-bold text-purple-700">{Math.round(averageLiftsPerVisit)}</div>
                                        <div className="text-xs text-purple-600">Lifts</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Activity Level Progress Bar */}
                                  <div className="border-t pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-700">Activity Level</span>
                                      <span className="text-xs font-bold text-gray-800">{vessel.activityLevel}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div 
                                        className={`${vessel.color.progress} h-3 rounded-full transition-all duration-500 relative`}
                                        style={{ width: `${vessel.activityLevel}%` }}
                                      >
                                        <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Performance Metrics Section */}
                              <div className="p-4 bg-white">
                                <h5 className="text-sm font-semibold text-gray-800 mb-3">Performance Totals</h5>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div>
                                    <div className="text-lg font-bold text-blue-600">{vessel.hours.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">Hours</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-green-600">{vessel.cargo.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">Cargo (tons)</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-purple-600">{vessel.lifts}</div>
                                    <div className="text-xs text-gray-500">Lifts</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                  
                  // Exclude non-production fluids: drilling chemicals, fuel, water, waste fluids, and byproducts
                  const bulkType = (action.bulkType || '').toLowerCase().trim();
                  const fluidType = (action.fluidSpecificType || '').toLowerCase().trim();
                  const isDrillingChemical = bulkType.includes('diesel') || 
                                             bulkType.includes('drillwater') || // (water)
                                             bulkType.includes('fuel') || // (fuel)
                                             bulkType.includes('brine') || // drilling byproduct
                                             bulkType.includes('light slops') || // waste fluid
                                             bulkType.includes('lightslops') || // waste fluid (no space)
                                             bulkType.includes('trash fluid') || // waste fluid
                                             bulkType.includes('trashfluid') || // waste fluid (no space)
                                             bulkType.includes('trash') || // catch any trash variants
                                             fluidType.includes('diesel') ||
                                             fluidType.includes('drillwater') || // (water)
                                             fluidType.includes('fuel') || // (fuel)
                                             fluidType.includes('brine') || // drilling byproduct
                                             fluidType.includes('light slops') || // waste fluid
                                             fluidType.includes('lightslops') || // waste fluid (no space)
                                             fluidType.includes('trash fluid') || // waste fluid
                                             fluidType.includes('trashfluid') || // waste fluid (no space)
                                             fluidType.includes('trash'); // catch any trash variants
                  
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
        </div>

        {/* Statistical Variance Analysis Section */}
        <div className="space-y-6">
          {/* Production Operational KPI Variance Analysis */}
          <ProductionOperationalVarianceDashboard
            liftsPerHourVariance={varianceAnalysis.operationalVariance.liftsPerHourVariance}

            vesselOperationalData={varianceAnalysis.operationalVariance.vesselOperationalData}
          />

          {/* Production Support Variance Analysis */}
          <ProductionSupportVarianceDashboard
            monthlyCostVariance={varianceAnalysis.productionSupport.monthlyCostVariance}
            facilityEfficiencyData={varianceAnalysis.productionSupport.facilityEfficiencyData}
          />
        </div>

      </div>
    </div>
  );
};

export default ProductionDashboard;