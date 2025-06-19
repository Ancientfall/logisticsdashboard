import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getVesselTypeFromName, getVesselCompanyFromName } from '../../data/vesselClassification';
import { getAllDrillingCapableLocations, mapCostAllocationLocation, getAllProductionLCs } from '../../data/masterFacilities';
import type { VoyageEvent } from '../../types';
import { Activity, Clock, Ship, BarChart3, Droplet } from 'lucide-react';
import KPICard from './KPICard';
import StatusDashboard from './StatusDashboard';
import SmartFilterBar from './SmartFilterBar';
import { 
  calculateEnhancedKPIMetrics,
  calculateEnhancedManifestMetrics,
  calculateEnhancedVoyageEventMetrics,
  calculateEnhancedBulkFluidMetrics
} from '../../utils/metricsCalculation';
import { validateDataIntegrity, generateIntegrityReport } from '../../utils/dataIntegrityValidator';
import { debugVesselCodes } from '../../utils/vesselCodesProcessor';
import { deduplicateBulkActions, getDrillingFluidMovements } from '../../utils/bulkFluidDeduplicationEngine';

interface DrillingDashboardProps {
  onNavigateToUpload?: () => void;
}

const DrillingDashboard: React.FC<DrillingDashboardProps> = ({ onNavigateToUpload }) => {
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

  // Update default month when data loads
  React.useEffect(() => {
    if (getDefaultMonth !== 'All Months' && filters.selectedMonth === 'All Months') {
      setFilters(prev => ({ ...prev, selectedMonth: getDefaultMonth }));
    }
  }, [getDefaultMonth, filters.selectedMonth]);
  
  // Calculate parent event hours once for Kabal comparison
  const parentEventHours = useMemo(() => {
    // Apply same month/year filtering as main metrics calculation
    let filterMonth: number | undefined;
    let filterYear: number | undefined;
    let isYTD = false;
    
    if (filters.selectedMonth === 'YTD') {
      // Year to Date - filter to current year (2025)
      const now = new Date();
      filterYear = now.getFullYear(); // Use current year (2025)
      isYTD = true;
    } else if (filters.selectedMonth !== 'All Months') {
      // Parse month/year from filter
      const [monthName, year] = filters.selectedMonth.split(' ');
      if (monthName && year) {
        filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
        filterYear = parseInt(year);
      }
    }
    
    return voyageEvents
      .filter(event => {
        // Apply location filtering with proper facility mapping
        if (filters.selectedLocation !== 'All Locations') {
          const selectedFacility = getAllDrillingCapableLocations().find(
            f => f.displayName === filters.selectedLocation
          );
          
          if (selectedFacility) {
            // Check multiple location fields and use facility mapping
            const eventLocation = event.location?.toLowerCase().trim() || '';
            const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
            const facilityLocationName = selectedFacility.locationName.toLowerCase();
            const facilityDisplayName = selectedFacility.displayName.toLowerCase();
            
            // Check if any location field matches or contains the facility name
            const matchesLocation = 
              eventLocation.includes(facilityLocationName) ||
              mappedLocation.includes(facilityLocationName) ||
              facilityLocationName.includes(eventLocation) ||
              eventLocation.includes(facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim()) || // Remove parentheses
              mappedLocation.includes(facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim());
            
            if (!matchesLocation) {
              return false;
            }
          } else {
            // Fallback: if no facility found, skip this filter (show all)
            console.warn(`⚠️ No facility found for selected location: ${filters.selectedLocation}`);
            console.log('🔍 PARENT EVENT DEBUG - Available locations in events:', 
              [...new Set(voyageEvents.slice(0, 20).map(e => e.location).filter(Boolean))]);
            console.log('🔍 PARENT EVENT DEBUG - Available drilling facilities:', 
              getAllDrillingCapableLocations().map(f => ({ locationName: f.locationName, displayName: f.displayName })));
          }
        }
        
        // Apply month/year filtering if specified
        if (isYTD && filterYear !== undefined) {
          // Year to Date - filter to current year only
          const eventDate = new Date(event.eventDate);
          if (eventDate.getFullYear() !== filterYear) {
            return false;
          }
        } else if (filterMonth !== undefined && filterYear !== undefined) {
          // Specific month filtering
          const eventDate = new Date(event.eventDate);
          if (eventDate.getMonth() !== filterMonth || eventDate.getFullYear() !== filterYear) {
            return false;
          }
        }
        
        return true;
      })
      .reduce((breakdown, event) => {
        const parentEvent = event.parentEvent || 'Unknown';
        breakdown[parentEvent] = (breakdown[parentEvent] || 0) + (event.finalHours || 0);
        return breakdown;
      }, {} as Record<string, number>);
  }, [voyageEvents, filters.selectedLocation, filters.selectedMonth]);
  
  // Calculate previous period data for trend analysis
  const previousPeriodMetrics = useMemo(() => {
    try {
      // Determine previous period based on current filter
      let prevFilterMonth: number | undefined;
      let prevFilterYear: number | undefined;
      let isPrevYTD = false;
      
      if (filters.selectedMonth === 'YTD') {
        // For YTD, compare to previous year's YTD
        const now = new Date();
        prevFilterYear = now.getFullYear() - 1; // Previous year
        isPrevYTD = true;
      } else if (filters.selectedMonth !== 'All Months') {
        // For specific month, get previous month
        const [monthName, year] = filters.selectedMonth.split(' ');
        if (monthName && year) {
          const currentMonth = new Date(`${monthName} 1, ${year}`).getMonth();
          const currentYear = parseInt(year);
          
          // Calculate previous month
          if (currentMonth === 0) {
            prevFilterMonth = 11; // December
            prevFilterYear = currentYear - 1;
          } else {
            prevFilterMonth = currentMonth - 1;
            prevFilterYear = currentYear;
          }
        }
      } else {
        // For 'All Months', use last 30 days as comparison
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        prevFilterMonth = thirtyDaysAgo.getMonth();
        prevFilterYear = thirtyDaysAgo.getFullYear();
      }
      
      if (!isDataReady || !voyageEvents.length || !costAllocation.length) {
        return {
          cargo: { totalCargoTons: 0 },
          lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
          hours: { totalProductiveHours: 0 },
          bulk: { totalBulkVolume: 0 },
          utilization: { transitTimeHours: 0 }
        };
      }

      // Calculate previous period KPIs using same logic as current
      const prevEnhancedKPIs = calculateEnhancedKPIMetrics(
        voyageEvents,
        vesselManifests,
        voyageList,
        costAllocation,
        bulkActions,
        'Drilling',
        isPrevYTD ? undefined : prevFilterMonth,
        prevFilterYear,
        filters.selectedLocation
      );

      const prevManifestMetrics = calculateEnhancedManifestMetrics(
        vesselManifests,
        costAllocation,
        isPrevYTD ? undefined : prevFilterMonth,
        prevFilterYear,
        'Drilling',
        filters.selectedLocation
      );

      const prevVoyageMetrics = calculateEnhancedVoyageEventMetrics(
        voyageEvents,
        costAllocation,
        isPrevYTD ? undefined : prevFilterMonth,
        prevFilterYear,
        'Drilling',
        filters.selectedLocation
      );

      const prevBulkMetrics = calculateEnhancedBulkFluidMetrics(
        bulkActions,
        isPrevYTD ? undefined : prevFilterMonth,
        prevFilterYear,
        'Drilling',
        filters.selectedLocation
      );

      // Calculate previous voyages count
      let prevDrillingVoyages = 0;
      if (voyageList && voyageList.length > 0) {
        let prevFilteredVoyages = voyageList;
        
        if (isPrevYTD && prevFilterYear !== undefined) {
          prevFilteredVoyages = voyageList.filter(voyage => {
            const voyageDate = voyage.voyageDate || voyage.startDate;
            if (!voyageDate) return false;
            const vDate = new Date(voyageDate);
            return vDate.getFullYear() === prevFilterYear;
          });
        } else if (prevFilterMonth !== undefined && prevFilterYear !== undefined) {
          prevFilteredVoyages = voyageList.filter(voyage => {
            const voyageDate = voyage.voyageDate || voyage.startDate;
            if (!voyageDate) return false;
            const vDate = new Date(voyageDate);
            return vDate.getMonth() === prevFilterMonth && vDate.getFullYear() === prevFilterYear;
          });
        }
        
        if (filters.selectedLocation !== 'All Locations') {
          prevDrillingVoyages = prevFilteredVoyages.filter(voyage => 
            voyage.locations && voyage.locations.toLowerCase().includes(filters.selectedLocation.toLowerCase())
          ).length;
        } else {
          prevDrillingVoyages = prevFilteredVoyages.filter(voyage => 
            voyage.voyagePurpose === 'Drilling' || 
            voyage.voyagePurpose === 'Mixed' ||
            voyage.includesDrilling
          ).length;
        }
      }

      return {
        cargo: {
          totalCargoTons: prevManifestMetrics.totalCargoTons
        },
        lifts: {
          totalLifts: prevManifestMetrics.totalLifts,
          liftsPerHour: prevVoyageMetrics.productiveHours > 0 ? prevManifestMetrics.totalLifts / prevVoyageMetrics.productiveHours : 0,
          vesselVisits: prevDrillingVoyages
        },
        hours: {
          totalProductiveHours: prevVoyageMetrics.productiveHours
        },
        bulk: {
          totalBulkVolume: prevBulkMetrics.totalFluidVolume || 0
        },
        costs: {
          totalVesselCost: prevEnhancedKPIs.totalVesselCost || 0
        },
        utilization: {
          transitTimeHours: prevVoyageMetrics.transitTime || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Error calculating previous period metrics:', error);
      return {
        cargo: { totalCargoTons: 0 },
        lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
        hours: { totalProductiveHours: 0 },
        bulk: { totalBulkVolume: 0 },
        costs: { totalVesselCost: 0 },
        utilization: { transitTimeHours: 0 }
      };
    }
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions, filters]);

  // Calculate drilling-specific KPIs using enhanced infrastructure
  const drillingMetrics = useMemo(() => {
    try {
      console.log('🔄 Recalculating ENHANCED drilling metrics for:', filters);
      
      // Helper function to calculate rig location cost analysis
      const calculateRigLocationCosts = (
        costAllocations: any[], 
        filterMonth?: number, 
        filterYear?: number, 
        isYTD?: boolean,
        selectedLocation?: string
      ) => {
        console.log('🔍 RIG COST ANALYSIS DEBUG:', {
          totalCostAllocations: costAllocations.length,
          sampleAllocations: costAllocations.slice(0, 3),
          filterMonth,
          filterYear,
          isYTD,
          selectedLocation
        });
        
        // Filter for DRILLING ONLY allocations
        let filteredAllocations = costAllocations.filter(allocation => {
          // Must be drilling project type
          const isDrillingProject = allocation.projectType === 'Drilling' || allocation.projectType === 'Completions';
          
          // Must be drilling department
          const isDrillingDepartment = allocation.department === 'Drilling';
          
          // Must be drilling location (using master facilities data)
          const drillingLocations = getAllDrillingCapableLocations();
          const drillingLocationNames = drillingLocations.map(loc => loc.displayName.toLowerCase());
          
          const isDrillingLocation = drillingLocationNames.some(drillingLoc => 
            allocation.locationReference?.toLowerCase().includes(drillingLoc) ||
            allocation.rigLocation?.toLowerCase().includes(drillingLoc) ||
            allocation.description?.toLowerCase().includes(drillingLoc)
          );
          
          return isDrillingProject || isDrillingDepartment || isDrillingLocation;
        });
        
        console.log('🔍 DRILLING FILTER APPLIED:', {
          originalCount: costAllocations.length,
          drillingOnlyCount: filteredAllocations.length,
          sampleDrillingAllocations: filteredAllocations.slice(0, 3)
        });
        
        // Apply time filtering
        if (isYTD && filterYear !== undefined) {
          filteredAllocations = filteredAllocations.filter(allocation => {
            if (allocation.costAllocationDate) {
              return allocation.costAllocationDate.getFullYear() === filterYear;
            } else if (allocation.year) {
              return allocation.year === filterYear;
            }
            return true;
          });
        } else if (filterMonth !== undefined && filterYear !== undefined) {
          filteredAllocations = filteredAllocations.filter(allocation => {
            if (allocation.costAllocationDate) {
              return allocation.costAllocationDate.getMonth() === filterMonth && allocation.costAllocationDate.getFullYear() === filterYear;
            } else if (allocation.month && allocation.year) {
              return allocation.month - 1 === filterMonth && allocation.year === filterYear; // month is 1-based in data
            }
            return true;
          });
        }
        
        // Apply location filtering if specified
        if (selectedLocation && selectedLocation !== 'All Locations') {
          const selectedFacility = getAllDrillingCapableLocations().find(
            f => f.displayName === selectedLocation
          );
          
          if (selectedFacility) {
            const facilityLocationName = selectedFacility.locationName.toLowerCase();
            const facilityDisplayName = selectedFacility.displayName.toLowerCase();
            const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim(); // Remove parentheses
            
            filteredAllocations = filteredAllocations.filter(allocation => {
              const locationRef = allocation.locationReference?.toLowerCase().trim() || '';
              const rigLocation = allocation.rigLocation?.toLowerCase().trim() || '';
              const description = allocation.description?.toLowerCase().trim() || '';
              
              return locationRef.includes(facilityLocationName) ||
                     rigLocation.includes(facilityLocationName) ||
                     description.includes(facilityLocationName) ||
                     facilityLocationName.includes(locationRef) ||
                     facilityLocationName.includes(rigLocation) ||
                     locationRef.includes(facilityNameCore) ||
                     rigLocation.includes(facilityNameCore) ||
                     facilityNameCore.includes(locationRef) ||
                     facilityNameCore.includes(rigLocation);
            });
          } else {
            console.warn(`⚠️ No facility found for cost allocation location filtering: ${selectedLocation}`);
          }
        }
        
        console.log('🔍 AFTER FILTERING:', {
          filteredCount: filteredAllocations.length,
          sampleFiltered: filteredAllocations.slice(0, 3),
          selectedLocation,
          uniqueLocationReferences: [...new Set(filteredAllocations.map(a => a.locationReference).filter(Boolean))],
          uniqueRigLocations: [...new Set(filteredAllocations.map(a => a.rigLocation).filter(Boolean))]
        });
        
        // Group by DRILLING RIG location only and calculate metrics
        const rigMetrics = filteredAllocations.reduce((acc, allocation) => {
          let rigName = allocation.locationReference || allocation.rigLocation || allocation.description || 'Unknown';
          
          // Clean up rig names and ensure they are drilling rigs
          const drillingLocations = getAllDrillingCapableLocations();
          const matchedLocation = drillingLocations.find(loc => 
            rigName.toLowerCase().includes(loc.displayName.toLowerCase()) ||
            loc.displayName.toLowerCase().includes(rigName.toLowerCase())
          );
          
          if (matchedLocation) {
            rigName = matchedLocation.displayName; // Use standardized name
          } else {
            // Skip if not a recognized drilling location
            return acc;
          }
          
          if (!acc[rigName]) {
            acc[rigName] = {
              totalCost: 0,
              totalDays: 0,
              costPerDay: 0,
              allocations: 0
            };
          }
          
          const cost = allocation.totalCost || allocation.budgetedVesselCost || 0;
          const days = allocation.totalAllocatedDays || 0;
          
          acc[rigName].totalCost += cost;
          acc[rigName].totalDays += days;
          acc[rigName].allocations += 1;
          
          return acc;
        }, {} as Record<string, { totalCost: number; totalDays: number; costPerDay: number; allocations: number }>);
        
        console.log('🔍 RIG METRICS CALCULATED:', {
          rigCount: Object.keys(rigMetrics).length,
          rigMetrics: Object.entries(rigMetrics).slice(0, 3)
        });
        
        // Calculate cost per day for each rig
        Object.keys(rigMetrics).forEach(rigName => {
          const rig = rigMetrics[rigName];
          rig.costPerDay = rig.totalDays > 0 ? rig.totalCost / rig.totalDays : 0;
        });
        
        // Sort by total cost descending and return top rigs
        const sortedRigs = Object.entries(rigMetrics)
          .sort(([,a], [,b]) => (b as any).totalCost - (a as any).totalCost)
          .slice(0, 9) // Top 9 rigs to match the image
          .map(([rigName, metrics]) => ({
            rigName,
            totalCost: (metrics as any).totalCost,
            totalDays: (metrics as any).totalDays,
            costPerDay: (metrics as any).costPerDay,
            allocations: (metrics as any).allocations
          }));
        
        const totalCosts = Object.values(rigMetrics).reduce((sum, rig) => sum + (rig as any).totalCost, 0);
        const totalDays = Object.values(rigMetrics).reduce((sum, rig) => sum + (rig as any).totalDays, 0);
        const totalAllocations = Object.values(rigMetrics).reduce((sum, rig) => sum + (rig as any).allocations, 0);
        
        return {
          rigs: sortedRigs,
          summary: {
            totalCost: totalCosts,
            totalDays: totalDays,
            averageCostPerDay: (totalDays as number) > 0 ? (totalCosts as number) / (totalDays as number) : 0,
            totalAllocations: totalAllocations
          }
        };
      };
      
      // Quick diagnostic for LC Numbers and Transit events
      if (voyageEvents.length > 0) {
        const uniqueParentEvents = [...new Set(voyageEvents.map(e => e.parentEvent))];
        const uniqueLCs = [...new Set(voyageEvents.map(e => e.lcNumber).filter(Boolean))];
        const transitEvents = voyageEvents.filter(e => e.parentEvent?.toLowerCase().includes('transit'));
        
        console.log('🔍 DATA DIAGNOSTIC:', {
          totalVoyageEvents: voyageEvents.length,
          uniqueParentEvents: uniqueParentEvents.slice(0, 10),
          uniqueLCs: uniqueLCs.slice(0, 10),
          transitEventsFound: transitEvents.length,
          sampleTransitEvents: transitEvents.slice(0, 3).map(e => ({
            parentEvent: e.parentEvent,
            portType: e.portType,
            lcNumber: e.lcNumber,
            hours: e.finalHours
          }))
        });
      }
      
      if (!isDataReady || !voyageEvents.length || !costAllocation.length) {
        console.warn('Data not ready for enhanced calculations');
        return {
          cargo: { totalCargoTons: 0, cargoTonnagePerVisit: 0, rtPercentage: 0, outboundPercentage: 0 },
          lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
          hours: { totalOSVHours: 0, totalProductiveHours: 0, productiveHoursPercentage: 0, averageTripDuration: 0 },
          costs: { totalVesselCost: 0, costPerTon: 0, costPerHour: 0 },
          utilization: { vesselUtilization: 0, transitTimeHours: 0, atLocationHours: 0 },
          bulk: { totalBulkVolume: 0, uniqueBulkTypes: 0, drillingFluidVolume: 0 },
          integrityScore: 0,
          validationSummary: { criticalIssues: 0, warnings: 0, recommendations: [] },
          activityData: [],
          vesselLocationData: null,
          ratePeriodAnalysis: [],
          budgetVsActual: { totalBudgeted: 0, totalActual: 0, variance: 0 },
          budgetVariancePercentage: 0,
          dateFilteredDrillingCosts: []
        };
      }

      // Get filter month/year - only apply filtering if specific month selected
      let filterMonth: number | undefined;
      let filterYear: number | undefined;
      let isYTD = false;
      
      if (filters.selectedMonth === 'YTD') {
        // Year to Date - filter to current year (accounting for 1-month lag)
        const now = new Date();
        filterYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        isYTD = true;
      } else if (filters.selectedMonth !== 'All Months') {
        // Parse month/year from filter
        const [monthName, year] = filters.selectedMonth.split(' ');
        if (monthName && year) {
          filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
          filterYear = parseInt(year);
        }
      }
      // If 'All Months' selected, filterMonth and filterYear remain undefined

      // Run comprehensive data integrity validation
      const integrityReport = validateDataIntegrity(
        voyageEvents,
        vesselManifests,
        costAllocation,
        bulkActions,
        voyageList
      );
      
      console.log(`📊 Data Integrity Score: ${Math.round(integrityReport.overallScore)}%`);
      
      // Enhanced KPI calculations with drilling department focus
      const enhancedKPIs = calculateEnhancedKPIMetrics(
        voyageEvents,
        vesselManifests,
        voyageList,
        costAllocation,
        bulkActions,
        'Drilling', // Focus on drilling department
        isYTD ? undefined : filterMonth, // For YTD, don't filter by specific month
        filterYear, // Always pass filterYear (will be current year for YTD)
        filters.selectedLocation
      );

      // Enhanced manifest metrics with filtering
      const manifestMetrics = calculateEnhancedManifestMetrics(
        vesselManifests,
        costAllocation,
        isYTD ? undefined : filterMonth, // For YTD, don't filter by specific month
        filterYear, // Always pass filterYear (will be current year for YTD)
        'Drilling',
        filters.selectedLocation
      );

      // Enhanced voyage event metrics
      const voyageMetrics = calculateEnhancedVoyageEventMetrics(
        voyageEvents,
        costAllocation,
        isYTD ? undefined : filterMonth, // For YTD, don't filter by specific month
        filterYear, // Always pass filterYear (will be current year for YTD)
        'Drilling',
        filters.selectedLocation
      );

      // Enhanced bulk fluid metrics with deduplication
      const bulkMetrics = calculateEnhancedBulkFluidMetrics(
        bulkActions,
        isYTD ? undefined : filterMonth, // For YTD, don't filter by specific month
        filterYear, // Always pass filterYear (will be current year for YTD)
        'Drilling',
        filters.selectedLocation
      );

      // Note: Location filtering is now handled within each enhanced metrics function

      // Calculate drilling voyages from voyage list data
      let drillingVoyages = 0;
      if (voyageList && voyageList.length > 0) {
        // Filter voyages by month/year if specified
        let filteredVoyages = voyageList;
        
        if (isYTD && filterYear !== undefined) {
          // Year to Date filtering - filter to current year only
          filteredVoyages = voyageList.filter(voyage => {
            const voyageDate = voyage.voyageDate || voyage.startDate;
            if (!voyageDate) return false;
            const vDate = new Date(voyageDate);
            return vDate.getFullYear() === filterYear;
          });
        } else if (filterMonth !== undefined && filterYear !== undefined) {
          // Specific month filtering
          filteredVoyages = voyageList.filter(voyage => {
            const voyageDate = voyage.voyageDate || voyage.startDate;
            if (!voyageDate) return false;
            const vDate = new Date(voyageDate);
            return vDate.getMonth() === filterMonth && vDate.getFullYear() === filterYear;
          });
        }
        
        // Filter by location if specified and count drilling voyages
        if (filters.selectedLocation !== 'All Locations') {
          // Count voyages that visited the selected location
          drillingVoyages = filteredVoyages.filter(voyage => 
            voyage.locations && voyage.locations.toLowerCase().includes(filters.selectedLocation.toLowerCase())
          ).length;
        } else {
          // Count all drilling-related voyages (now properly classified at source)
          drillingVoyages = filteredVoyages.filter(voyage => 
            voyage.voyagePurpose === 'Drilling' || 
            voyage.voyagePurpose === 'Mixed' ||
            voyage.includesDrilling
          ).length;
        }
        
        // Debug voyage purpose distribution
        const voyagePurposeCount = filteredVoyages.reduce((acc, voyage) => {
          const purpose = voyage.voyagePurpose || 'Unknown';
          acc[purpose] = (acc[purpose] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const drillingFlagCount = filteredVoyages.reduce((acc, voyage) => {
          if (voyage.includesDrilling) acc.includesDrilling++;
          if (voyage.includesProduction) acc.includesProduction++;
          if (!voyage.includesDrilling && !voyage.includesProduction) acc.neither++;
          return acc;
        }, { includesDrilling: 0, includesProduction: 0, neither: 0 });
        
        console.log(`🚢 DRILLING VOYAGES CALCULATION:`, {
          totalVoyageRecords: voyageList.length,
          filteredByTime: filteredVoyages.length,
          drillingVoyages: drillingVoyages,
          locationFilter: filters.selectedLocation,
          timeFilter: `${filterMonth !== undefined ? filterMonth + 1 : 'All'}/${filterYear || 'All'}`,
          
          // Debug voyage classification
          voyagePurposeDistribution: voyagePurposeCount,
          drillingFlagDistribution: drillingFlagCount,
          
          // Sample of filtered voyages
          sampleVoyages: filteredVoyages.slice(0, 5).map(v => ({
            vessel: v.vessel,
            voyagePurpose: v.voyagePurpose,
            includesDrilling: v.includesDrilling,
            includesProduction: v.includesProduction,
            locations: v.locations,
            mission: v.mission
          })),
          
          // What would happen with different counting methods
          alternativeCount: {
            allFilteredVoyages: filteredVoyages.length,
            supplyMissionOnly: filteredVoyages.filter(v => v.mission === 'Supply').length,
            newInclusiveLogic: filteredVoyages.filter(v => 
              v.voyagePurpose === 'Drilling' || 
              v.voyagePurpose === 'Mixed' ||
              v.includesDrilling ||
              (v.locations && (
                v.locations.toLowerCase().includes('ocean black') ||
                v.locations.toLowerCase().includes('stena') ||
                v.locations.toLowerCase().includes('drilling') ||
                v.locations.toLowerCase().includes('blacklion') ||
                v.locations.toLowerCase().includes('blackhornet') ||
                v.locations.toLowerCase().includes('icemax')
              )) ||
              (v.voyagePurpose === 'Other' && v.locations && (
                v.locations.toLowerCase().includes('ocean') ||
                v.locations.toLowerCase().includes('stena')
              ))
            ).length,
            drillingPlusMixed: filteredVoyages.filter(v => 
              v.voyagePurpose === 'Drilling' || v.voyagePurpose === 'Mixed'
            ).length
          }
        });
      }

      // Calculate dynamic fluid intelligence data
      let fluidIntelligence: {
        totalTransfers: number;
        totalVolume: number;
        fluidTypes: number;
        drillingMuds: { operations: number; volume: number };
        completionFluids: { operations: number; volume: number };
        fluidTypeBreakdown: Record<string, { volume: number; transfers: number; type: 'Drilling' | 'Completion' }>;
      } = {
        totalTransfers: 0,
        totalVolume: 0,
        fluidTypes: 0,
        drillingMuds: { operations: 0, volume: 0 },
        completionFluids: { operations: 0, volume: 0 },
        fluidTypeBreakdown: {}
      };

      if (bulkActions && bulkActions.length > 0) {
        // Filter bulk actions by time, location, and drilling operations
        let filteredBulkActions = bulkActions;
        
        // Apply time filtering (YTD or specific month)
        if (isYTD && filterYear !== undefined) {
          // Year to Date - filter to current year only
          filteredBulkActions = filteredBulkActions.filter(action => {
            return action.startDate.getFullYear() === filterYear;
          });
        } else if (filterMonth !== undefined && filterYear !== undefined) {
          // Specific month filtering
          filteredBulkActions = filteredBulkActions.filter(action => {
            return action.startDate.getMonth() === filterMonth && action.startDate.getFullYear() === filterYear;
          });
        }
        
        // Get drilling-capable locations from master facilities
        const drillingLocations = getAllDrillingCapableLocations();
        const drillingLocationNames = drillingLocations.map(loc => loc.displayName.toLowerCase());
        
        // *** CRITICAL: Filter for OFFLOADS TO DRILLING RIG LOCATIONS ONLY ***
        // Use the same logic as Kabal: portType === 'rig' && action === 'offload'
        filteredBulkActions = filteredBulkActions.filter(action => {
          // Must be drilling or completion fluid
          const isDrillingRelatedFluid = action.isDrillingFluid || action.isCompletionFluid;
          
          // Must be offload operation (not load)
          const isOffloadOperation = action.action === 'offload';
          
          // Must be to a rig port (matching Kabal's logic exactly)
          const isRigDestination = action.portType === 'rig';
          
          return isDrillingRelatedFluid && isOffloadOperation && isRigDestination;
        });
        
        // Apply specific location filtering if selected
        if (filters.selectedLocation !== 'All Locations') {
          filteredBulkActions = filteredBulkActions.filter(action => 
            action.atPort?.toLowerCase().includes(filters.selectedLocation.toLowerCase()) ||
            action.destinationPort?.toLowerCase().includes(filters.selectedLocation.toLowerCase()) ||
            action.standardizedOrigin?.toLowerCase().includes(filters.selectedLocation.toLowerCase()) ||
            action.standardizedDestination?.toLowerCase().includes(filters.selectedLocation.toLowerCase())
          );
        }
        
        // Debug: Check what action types and locations we have in the data
        const uniqueActions = [...new Set(bulkActions.map(a => a.action))];
        const uniqueDestinations = [...new Set(bulkActions.map(a => a.standardizedDestination))];
        const drillingFluidCount = bulkActions.filter(a => a.isDrillingFluid).length;
        const completionFluidCount = bulkActions.filter(a => a.isCompletionFluid).length;
        
        console.log('🔍 BULK ACTION DATA ANALYSIS:', {
          totalBulkActions: bulkActions.length,
          uniqueActionTypes: uniqueActions,
          uniqueDestinations: uniqueDestinations.slice(0, 10),
          drillingFluidActions: drillingFluidCount,
          completionFluidActions: completionFluidCount,
          drillingLocations: drillingLocationNames,
          afterTimeFilter: filteredBulkActions.length,
          sampleFilteredActions: filteredBulkActions.slice(0, 5).map(action => ({
            action: action.action,
            bulkType: action.bulkType,
            destination: action.standardizedDestination,
            isDrillingFluid: action.isDrillingFluid,
            isCompletionFluid: action.isCompletionFluid,
            volumeBbls: action.volumeBbls
          })),
          totalVolumeFiltered: filteredBulkActions.reduce((sum, a) => sum + a.volumeBbls, 0),
          afterDrillingRigFilter: filteredBulkActions.length,
          offloadOnlyCount: bulkActions.filter(a => a.action === 'offload').length,
          rigPortTypeCount: bulkActions.filter(a => a.portType === 'rig').length,
          rigOffloadCount: bulkActions.filter(a => a.portType === 'rig' && a.action === 'offload').length,
          rigOffloadVolume: bulkActions.filter(a => a.portType === 'rig' && a.action === 'offload').reduce((sum, a) => sum + a.volumeBbls, 0),
          kabalComparisonAfterTime: bulkActions.filter(a => {
            // Apply same time filtering as our logic
            if (isYTD && filterYear !== undefined) {
              return a.startDate.getFullYear() === filterYear && a.portType === 'rig' && a.action === 'offload';
            } else if (filterMonth !== undefined && filterYear !== undefined) {
              return a.startDate.getMonth() === filterMonth && a.startDate.getFullYear() === filterYear && a.portType === 'rig' && a.action === 'offload';
            }
            return a.portType === 'rig' && a.action === 'offload';
          }).reduce((sum, a) => sum + a.volumeBbls, 0),
          destinationMatches: filteredBulkActions.slice(0, 3).map(action => ({
            destination: action.standardizedDestination,
            portType: action.portType,
            matchedDrillingLocation: drillingLocationNames.find(loc => 
              action.standardizedDestination?.toLowerCase().includes(loc))
          }))
        });
        
        // *** CRITICAL: Use deduplication engine to prevent double-counting ***
        const deduplicationResult = deduplicateBulkActions(filteredBulkActions, 'Drilling');
        const drillingFluidOperations = getDrillingFluidMovements(deduplicationResult.consolidatedOperations);
        
        // Calculate metrics from deduplicated operations (not raw actions)
        fluidIntelligence.totalTransfers = drillingFluidOperations.length;
        fluidIntelligence.totalVolume = drillingFluidOperations.reduce((sum, op) => sum + op.totalVolumeBbls, 0);
        
        // Get unique fluid types from deduplicated operations
        const uniqueFluidTypes = new Set();
        drillingFluidOperations.forEach(op => {
          op.operations.forEach(action => {
            if (action.bulkType) uniqueFluidTypes.add(action.bulkType);
          });
        });
        fluidIntelligence.fluidTypes = uniqueFluidTypes.size;
        
        // Separate drilling vs completion fluids from deduplicated operations
        const drillingMudOperations = drillingFluidOperations.filter(op => 
          op.operations.some(action => action.isDrillingFluid)
        );
        const completionFluidOperations = drillingFluidOperations.filter(op => 
          op.operations.some(action => action.isCompletionFluid)
        );
        
        fluidIntelligence.drillingMuds = {
          operations: drillingMudOperations.length,
          volume: drillingMudOperations.reduce((sum, op) => sum + op.totalVolumeBbls, 0)
        };
        
        fluidIntelligence.completionFluids = {
          operations: completionFluidOperations.length,
          volume: completionFluidOperations.reduce((sum, op) => sum + op.totalVolumeBbls, 0)
        };
        
        // Build fluid type breakdown from deduplicated operations
        drillingFluidOperations.forEach(operation => {
          operation.operations.forEach(action => {
            const fluidType = action.bulkType;
            if (fluidType) {
              if (!fluidIntelligence.fluidTypeBreakdown[fluidType]) {
                fluidIntelligence.fluidTypeBreakdown[fluidType] = {
                  volume: 0,
                  transfers: 0,
                  type: action.isDrillingFluid ? 'Drilling' : 'Completion'
                };
              }
              // Use operation volume divided by number of bulk types in this operation
              const typesInOperation = operation.operations.filter(a => a.bulkType === fluidType).length;
              const volumePerType = operation.totalVolumeBbls / Math.max(1, typesInOperation);
              
              fluidIntelligence.fluidTypeBreakdown[fluidType].volume += volumePerType;
              fluidIntelligence.fluidTypeBreakdown[fluidType].transfers += 1;
            }
          });
        });
        
        console.log(`🧪 ENHANCED FLUID INTELLIGENCE CALCULATION (DEDUPLICATED):`, {
          originalBulkActions: bulkActions.length,
          filteredBulkActions: filteredBulkActions.length,
          deduplicatedOperations: drillingFluidOperations.length,
          duplicatesRemoved: deduplicationResult.duplicatesRemoved,
          volumeBefore: deduplicationResult.totalVolumeOriginal.toLocaleString(),
          volumeAfter: deduplicationResult.totalVolumeConsolidated.toLocaleString(),
          filteredByTime: filterMonth !== undefined ? 'Applied' : 'None',
          filteredByLocation: filters.selectedLocation !== 'All Locations' ? filters.selectedLocation : 'None',
          fluidIntelligence
        });
      }

      // Build comprehensive metrics object
      const metrics = {
        // Core cargo metrics from enhanced manifests
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
          vesselVisits: drillingVoyages // Use actual drilling voyages count from voyage list
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
        
        // Bulk fluid metrics from enhanced deduplication
        bulk: {
          totalBulkVolume: bulkMetrics.totalFluidVolume || 0,
          uniqueBulkTypes: Object.keys(bulkMetrics.movementTypeBreakdown || {}).length,
          drillingFluidVolume: bulkMetrics.totalFluidVolume || 0
        },
        
        // Dynamic fluid intelligence data
        fluidIntelligence,
        
        // Calculate rig location cost analysis
        rigLocationCostAnalysis: calculateRigLocationCosts(costAllocation, filterMonth, filterYear, isYTD, filters.selectedLocation),
        
        // Data quality metrics
        integrityScore: integrityReport.overallScore,
        validationSummary: {
          criticalIssues: integrityReport.criticalIssues.length,
          warnings: integrityReport.datasets.voyageEvents.warnings.length + 
                   integrityReport.datasets.vesselManifests.warnings.length +
                   integrityReport.datasets.costAllocation.warnings.length,
          recommendations: integrityReport.recommendations
        },
        
        // Legacy compatibility fields for existing dashboard components
        activityData: [],
        vesselLocationData: null,
        ratePeriodAnalysis: [],
        budgetVsActual: {
          totalBudgeted: 0, // Will be calculated separately if needed
          totalActual: enhancedKPIs.totalVesselCost || 0,
          variance: enhancedKPIs.totalVesselCost || 0
        },
        budgetVariancePercentage: 0, // Will be calculated separately if needed
        dateFilteredDrillingCosts: []
      };

      console.log('✅ ENHANCED DRILLING METRICS CALCULATED:', {
        cargoTons: metrics.cargo.totalCargoTons.toLocaleString(),
        lifts: metrics.lifts.totalLifts.toLocaleString(),
        productiveHours: metrics.hours.totalProductiveHours.toLocaleString(),
        totalCost: `$${metrics.costs.totalVesselCost.toLocaleString()}`,
        integrityScore: `${Math.round(metrics.integrityScore)}%`,
        criticalIssues: metrics.validationSummary.criticalIssues
      });

      return metrics;
      
    } catch (error) {
      console.error('❌ Error in enhanced drilling metrics calculation:', error);
      return {
        cargo: { totalCargoTons: 0, cargoTonnagePerVisit: 0, rtPercentage: 0, outboundPercentage: 0 },
        lifts: { totalLifts: 0, liftsPerHour: 0, vesselVisits: 0 },
        hours: { totalOSVHours: 0, totalProductiveHours: 0, productiveHoursPercentage: 0, averageTripDuration: 0 },
        costs: { totalVesselCost: 0, costPerTon: 0, costPerHour: 0 },
        utilization: { vesselUtilization: 0, transitTimeHours: 0, atLocationHours: 0 },
        bulk: { totalBulkVolume: 0, uniqueBulkTypes: 0, drillingFluidVolume: 0 },
        integrityScore: 0,
        validationSummary: { criticalIssues: 0, warnings: 0, recommendations: [] },
        activityData: [],
        vesselLocationData: null,
        ratePeriodAnalysis: [],
        budgetVsActual: { totalBudgeted: 0, totalActual: 0, variance: 0 },
        budgetVariancePercentage: 0,
        dateFilteredDrillingCosts: []
      };
    }
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions, filters]);

  // Get filter options
  const filterOptions = useMemo(() => {
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

    const months = ['All Months', 'YTD', ...sortedMonths];
    
    // Get drilling locations from master facilities data - exclude integrated facilities
    const drillingFacilities = getAllDrillingCapableLocations();
    const locations = ['All Locations', ...drillingFacilities
      .filter(facility => 
        facility.facilityType === 'Drilling' && // Only pure drilling facilities
        !facility.displayName.toLowerCase().includes('production') &&
        !facility.displayName.toLowerCase().includes('(all)') // Exclude integrated facilities
      )
      .map(facility => facility.displayName)];

    return { months, locations };
  }, [voyageEvents, vesselManifests]); // Focus on primary data sources

  // Dynamic targets based on filter scope - realistic for 16+ months of data
  const dynamicTargets = useMemo(() => {
    const isSingleLocation = filters.selectedLocation !== 'All Locations';
    const isSingleMonth = filters.selectedMonth !== 'All Months';
    
    // Base targets for 16+ months across all locations (more realistic)
    let cargoTarget = 95000; // Realistic for 16+ months across all drilling locations
    let liftsPerHourTarget = 1.4; // Achievable drilling ops efficiency
    let nptTarget = 18; // Realistic NPT for drilling operations
    let waitingTarget = 12; // Realistic waiting time for drilling operations
    
    // Adjust targets based on scope
    if (isSingleLocation && isSingleMonth) {
      // Single location, single month - focused view
      cargoTarget = 3000; // Realistic monthly cargo at one location (scaled up from 95k yearly)
      liftsPerHourTarget = 1.6; // Better efficiency in focused operations
      nptTarget = 15; // Stricter for focused view
      waitingTarget = 8; // Lower waiting time for focused operations
    } else if (isSingleLocation) {
      // Single location, all months - 16+ months at one location
      cargoTarget = 30000; // Realistic 16+ months at single location (scaled up from 95k yearly)
      liftsPerHourTarget = 1.5; // Good efficiency for sustained operations
      nptTarget = 16; // Slightly better than all locations
      waitingTarget = 10; // Improved waiting management
    } else if (isSingleMonth) {
      // All locations, single month - monthly snapshot
      cargoTarget = 9500; // Realistic monthly total across all locations (95k/10 months)
      liftsPerHourTarget = 1.3; // Variable efficiency across multiple locations
      nptTarget = 20; // Higher variability across locations
      waitingTarget = 14; // Variable waiting times across locations
    }
    
    // Calculate productive hours target based on cargo operations
    // Assume 1 hour of productive time per 50 tons of cargo (realistic ratio)
    const productiveHoursTarget = Math.round(cargoTarget / 50);
    
    // Convert waiting percentage to realistic hours based on total operation time
    // Assume 2000 hours base operation time, adjust by scope
    let baseOperationHours = 2000;
    if (isSingleLocation && isSingleMonth) {
      baseOperationHours = 150; // ~5 hours/day for 30 days
    } else if (isSingleLocation) {
      baseOperationHours = 800; // Single location over 16+ months
    } else if (isSingleMonth) {
      baseOperationHours = 400; // All locations in one month
    }
    
    const waitingHoursTarget = Math.round(baseOperationHours * (waitingTarget / 100));
    
    // DEBUG: Log dynamic targets
    console.log('🎯 Dynamic targets calculated:', {
      cargoTons: cargoTarget,
      liftsPerHour: liftsPerHourTarget,
      nptPercentage: nptTarget,
      waitingPercentage: waitingTarget,
      productiveHours: productiveHoursTarget,
      waitingHours: waitingHoursTarget,
      filterContext: { isSingleLocation, isSingleMonth }
    });

    return {
      cargoTons: cargoTarget,
      liftsPerHour: liftsPerHourTarget,
      nptPercentage: nptTarget,
      waitingPercentage: waitingTarget,
      productiveHours: productiveHoursTarget,
      waitingHours: waitingHoursTarget,
    };
  }, [filters.selectedMonth, filters.selectedLocation, isDataReady]);


  // Calculate filtered record counts for display
  const recordCounts = useMemo(() => {
    if (!isDataReady || !voyageEvents.length) {
      return { totalRecords: 0, filteredRecords: 0 };
    }
    
    const totalRecords = voyageEvents.length;
    
    // Apply same filtering logic as parentEventHours
    let filterMonth: number | undefined;
    let filterYear: number | undefined;
    let isYTD = false;
    
    if (filters.selectedMonth === 'YTD') {
      // Year to Date - filter to current year (2025)
      const now = new Date();
      filterYear = now.getFullYear(); // Use current year (2025)
      isYTD = true;
    } else if (filters.selectedMonth !== 'All Months') {
      const [monthName, year] = filters.selectedMonth.split(' ');
      if (monthName && year) {
        filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
        filterYear = parseInt(year);
      }
    }
    
    const filteredRecords = voyageEvents.filter(event => {
      // Apply location filtering
      if (filters.selectedLocation !== 'All Locations' && 
          !event.location?.toLowerCase().includes(filters.selectedLocation.toLowerCase())) {
        return false;
      }
      
      // Apply month/year filtering if specified
      if (isYTD && filterYear !== undefined) {
        // Year to Date - filter to current year only
        const eventDate = new Date(event.eventDate);
        if (eventDate.getFullYear() !== filterYear) {
          return false;
        }
      } else if (filterMonth !== undefined && filterYear !== undefined) {
        // Specific month filtering
        const eventDate = new Date(event.eventDate);
        if (eventDate.getMonth() !== filterMonth || eventDate.getFullYear() !== filterYear) {
          return false;
        }
      }
      
      return true;
    }).length;
    
    return { totalRecords, filteredRecords };
  }, [voyageEvents, filters.selectedLocation, filters.selectedMonth, isDataReady]);

  // Show loading state if data isn't ready
  if (!isDataReady || !voyageEvents || !vesselManifests || !costAllocation) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Enhanced Dashboard</h3>
          <p className="text-gray-600">Processing drilling analytics with enhanced infrastructure...</p>
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
          title="GoA Wells Performance" 
          subtitle="Real-time Drilling Operations & Logistics Dashboard - Enhanced with Data Integrity"
          overallStatus={
            drillingMetrics.integrityScore < 80 ? 'poor' :
            drillingMetrics.hours.totalProductiveHours < dynamicTargets.productiveHours ? 'fair' : 
            drillingMetrics.cargo.totalCargoTons < dynamicTargets.cargoTons ? 'good' : 'excellent'
          }
          heroMetrics={[
            {
              title: "Outbound Tonnage",
              value: Math.round(drillingMetrics.cargo.totalCargoTons).toLocaleString(),
              unit: "tons",
              target: dynamicTargets.cargoTons,
              trend: previousPeriodMetrics.cargo.totalCargoTons > 0 ? 
                ((drillingMetrics.cargo.totalCargoTons - previousPeriodMetrics.cargo.totalCargoTons) / previousPeriodMetrics.cargo.totalCargoTons) * 100 : 0,
              isPositive: drillingMetrics.cargo.totalCargoTons >= previousPeriodMetrics.cargo.totalCargoTons,
              contextualHelp: filters.selectedLocation === 'All Locations' ? 
                "Total outbound tonnage delivered from base to all drilling rigs across GoA. Calculated from vessel manifests filtered for drilling operations using cost allocation LC validation. Includes deck cargo, tubulars, and drilling supplies." :
                `Outbound tonnage specific to ${filters.selectedLocation}. Filtered from vessel manifests where destination matches selected drilling location. Validated against cost allocation LC numbers.`
            },
            {
              title: filters.selectedLocation === 'All Locations' ? "Avg Visits/Week" : "Visits per Week",
              value: (() => {
                // Calculate number of weeks in the current period
                let weeks = 1;
                if (filters.selectedMonth === 'YTD') {
                  // YTD: calculate weeks from start of year to now (accounting for 1 month lag)
                  const now = new Date();
                  const currentYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                  const startOfYear = new Date(currentYear, 0, 1);
                  const endDate = now.getMonth() === 0 ? new Date(currentYear, 11, 31) : now;
                  weeks = Math.ceil((endDate.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
                } else if (filters.selectedMonth !== 'All Months') {
                  // Specific month: exactly 4 weeks for cleaner calculation
                  weeks = 4;
                } else {
                  // All Months: use actual data span from available months
                  const availableMonths = filterOptions.months.length - 2; // Exclude 'All Months' and 'YTD'
                  weeks = Math.max(availableMonths * 4, 52); // At least 52 weeks for full dataset
                }
                
                // For debug: calculate active drilling locations count
                const debugActiveDrillingLocations = new Set<string>();
                costAllocation.forEach(allocation => {
                  if (allocation.locationReference && allocation.locationReference.trim() !== '') {
                    debugActiveDrillingLocations.add(allocation.locationReference.trim());
                  }
                });
                
                console.log('🔍 WEEKLY VISITS DEBUG:', {
                  selectedMonth: filters.selectedMonth,
                  selectedLocation: filters.selectedLocation,
                  totalVesselVisits: drillingMetrics.lifts.vesselVisits,
                  activeDrillingLocationsPeriod: 'Will be calculated below',
                  totalDrillingLocationsEver: debugActiveDrillingLocations.size,
                  filterLocationsFound: filterOptions.locations.length - 1,
                  calculatedWeeks: weeks,
                  
                  // Debug the source of vessel visits
                  vesselVisitsSource: {
                    drillingMetricsLifts: drillingMetrics.lifts,
                    voyageListTotal: voyageList ? voyageList.length : 0,
                    voyageEventsTotal: voyageEvents ? voyageEvents.length : 0,
                    vesselManifestsTotal: vesselManifests ? vesselManifests.length : 0
                  },
                  
                  note: 'Active locations calculated dynamically based on selected period - CHECK IF TOTAL VISITS IS TOO LOW'
                });
                
                if (filters.selectedLocation === 'All Locations') {
                  // Dynamically calculate active drilling locations for the selected period
                  const totalVisits = drillingMetrics.lifts.vesselVisits;
                  
                  // Get active drilling locations from cost allocation data for the selected period
                  let activeDrillingLocations = new Set<string>();
                  
                  // Filter cost allocation by the same period logic as the metrics
                  const filteredCostAllocation = costAllocation.filter(allocation => {
                    if (!allocation.costAllocationDate) return false;
                    
                    const allocDate = new Date(allocation.costAllocationDate);
                    
                    // Apply same filtering logic as used in metrics
                    if (filters.selectedMonth === 'YTD') {
                      const currentYear = allocDate.getMonth() === 0 ? allocDate.getFullYear() - 1 : allocDate.getFullYear();
                      return allocDate.getFullYear() === currentYear;
                    } else if (filters.selectedMonth !== 'All Months') {
                      const [monthName, year] = filters.selectedMonth.split(' ');
                      if (monthName && year) {
                        const filterMonth = new Date(`${monthName} 1, ${year}`).getMonth();
                        const filterYear = parseInt(year);
                        return allocDate.getMonth() === filterMonth && allocDate.getFullYear() === filterYear;
                      }
                    }
                    return true; // For 'All Months'
                  });
                  
                  // Extract unique drilling locations that had cost allocation in the period
                  filteredCostAllocation.forEach(allocation => {
                    if (allocation.locationReference && allocation.locationReference.trim() !== '') {
                      activeDrillingLocations.add(allocation.locationReference.trim());
                    }
                  });
                  
                  const numActiveDrillingLocations = Math.max(activeDrillingLocations.size, 1);
                  const avgVisitsPerLocationPerWeek = totalVisits / numActiveDrillingLocations / weeks;
                  
                  console.log('📊 AVG VISITS/WEEK BREAKDOWN:', {
                    totalVisits,
                    numActiveDrillingLocations,
                    activeDrillingLocationsList: Array.from(activeDrillingLocations),
                    weeks,
                    avgVisitsPerLocationPerWeek,
                    expectedMinimum: 2.0,
                    selectedPeriod: filters.selectedMonth,
                    
                    // Detailed breakdown for debugging
                    calculation: {
                      step1_totalVisits: totalVisits,
                      step2_divideByLocations: totalVisits / numActiveDrillingLocations,
                      step3_divideByWeeks: (totalVisits / numActiveDrillingLocations) / weeks,
                      expectedWith80Voyages: {
                        if80VoyagesAnd4Locations: (80 / 4) / weeks,
                        if80VoyagesAnd6Locations: (80 / 6) / weeks,
                        if80VoyagesAnd8Locations: (80 / 8) / weeks
                      }
                    },
                    
                    costAllocationInfo: {
                      totalCostAllocRecords: costAllocation.length,
                      filteredCostAllocRecords: filteredCostAllocation.length,
                      costAllocSample: filteredCostAllocation.slice(0, 3).map(a => ({
                        locationReference: a.locationReference,
                        date: a.costAllocationDate,
                        projectType: a.projectType
                      }))
                    },
                    
                    note: 'Using dynamic count of active drilling locations from cost allocation data'
                  });
                  
                  return avgVisitsPerLocationPerWeek.toFixed(1);
                } else {
                  // Visits per week for specific location
                  return (drillingMetrics.lifts.vesselVisits / weeks).toFixed(1);
                }
              })(),
              unit: "visits/week",
              target: filters.selectedLocation === 'All Locations' ? 2.0 : 8,
              trend: previousPeriodMetrics.lifts.vesselVisits > 0 ? 
                ((drillingMetrics.lifts.vesselVisits - previousPeriodMetrics.lifts.vesselVisits) / previousPeriodMetrics.lifts.vesselVisits) * 100 : 0,
              isPositive: drillingMetrics.lifts.vesselVisits >= previousPeriodMetrics.lifts.vesselVisits,
              contextualHelp: filters.selectedLocation === 'All Locations' ?
                "Average vessel visits per drilling location per week across GoA operations. Calculated as (total drilling voyages ÷ active drilling locations with cost allocation in period) ÷ weeks in period. Only counts locations that were on-hire/active during the selected timeframe. Helps assess weekly operational tempo and logistics efficiency." :
                `Average vessel visits per week to ${filters.selectedLocation}. Calculated as total visits divided by weeks in the selected time period. Each round trip voyage counts as one visit. Useful for planning weekly logistics capacity.`
            },
            {
              title: "Lifts per Hour",
              value: (Math.round(drillingMetrics.lifts.liftsPerHour * 100) / 100).toString(),
              unit: "lifts/hr",
              target: dynamicTargets.liftsPerHour,
              trend: previousPeriodMetrics.lifts.liftsPerHour > 0 ? 
                ((drillingMetrics.lifts.liftsPerHour - previousPeriodMetrics.lifts.liftsPerHour) / previousPeriodMetrics.lifts.liftsPerHour) * 100 : 0,
              isPositive: drillingMetrics.lifts.liftsPerHour >= previousPeriodMetrics.lifts.liftsPerHour,
              contextualHelp: filters.selectedLocation === 'All Locations' ?
                "Average operational efficiency across all GoA drilling locations. Calculated as total lifts divided by total productive hours. Includes all crane operations from drilling manifests validated against cost allocation LCs." :
                `Operational efficiency specific to ${filters.selectedLocation}. Lifts per productive hour for this drilling location only. Productive hours exclude weather, waiting, and non-operational time.`
            },
            {
              title: "Logistics Cost",
              value: `$${Math.round(drillingMetrics.costs.totalVesselCost / 1000).toLocaleString()}K`,
              unit: "",
              target: filters.selectedLocation === 'All Locations' ? 15000 : 3000,
              trend: (previousPeriodMetrics.costs?.totalVesselCost || 0) > 0 ? 
                ((drillingMetrics.costs.totalVesselCost - (previousPeriodMetrics.costs?.totalVesselCost || 0)) / (previousPeriodMetrics.costs?.totalVesselCost || 1)) * 100 : 0,
              isPositive: drillingMetrics.costs.totalVesselCost <= (previousPeriodMetrics.costs?.totalVesselCost || 0), // Lower cost is positive
              contextualHelp: filters.selectedLocation === 'All Locations' ?
                "Total logistics cost for all GoA drilling operations. Calculated from cost allocation data including vessel rates, fuel, and operational expenses. Represents comprehensive drilling support cost across all locations." :
                `Logistics cost specific to ${filters.selectedLocation}. Includes vessel charter, fuel, and operational costs allocated to this drilling location. Based on cost allocation percentages and actual vessel utilization.`
            },
            {
              title: "Fluid Volume",
              value: Math.round(drillingMetrics.bulk.totalBulkVolume).toLocaleString(),
              unit: "bbls",
              target: filters.selectedLocation === 'All Locations' ? 25000 : 5000,
              trend: previousPeriodMetrics.bulk.totalBulkVolume > 0 ? 
                ((drillingMetrics.bulk.totalBulkVolume - previousPeriodMetrics.bulk.totalBulkVolume) / previousPeriodMetrics.bulk.totalBulkVolume) * 100 : 0,
              isPositive: drillingMetrics.bulk.totalBulkVolume >= previousPeriodMetrics.bulk.totalBulkVolume,
              contextualHelp: filters.selectedLocation === 'All Locations' ?
                "Total drilling and completion fluid volume moved across all GoA drilling operations. Includes drilling mud, completion fluids, chemicals, and specialized fluids. Anti-double-counting applied to avoid load/offload duplication." :
                `Total drilling and completion fluid volume moved to ${filters.selectedLocation}. Includes all bulk fluid transfers supporting drilling operations at this location. Calculated from bulk actions with deduplication.`
            }
          ]}
          onViewDetails={onNavigateToUpload}
        />


        {/* Compact KPI Cards Row - Matching your image layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <KPICard 
            title="Fluid Movement" 
            value={drillingMetrics.bulk.totalBulkVolume.toLocaleString()}
            variant="compact"
            unit="bbls"
            trend={previousPeriodMetrics.bulk.totalBulkVolume > 0 ? 
              ((drillingMetrics.bulk.totalBulkVolume - previousPeriodMetrics.bulk.totalBulkVolume) / previousPeriodMetrics.bulk.totalBulkVolume) * 100 : 0}
            isPositive={drillingMetrics.bulk.totalBulkVolume >= previousPeriodMetrics.bulk.totalBulkVolume}
            color="blue"
            contextualHelp="Total drilling and completion fluid volume offloaded to rigs. Calculated from bulk actions with anti-double-counting (load/offload pair deduplication). Includes drilling muds, completion fluids, and specialized chemicals. Filtered for rig destinations only."
          />
          <KPICard 
            title="Weather Impact" 
            value={`${Math.round((drillingMetrics.hours.totalOSVHours - drillingMetrics.hours.totalProductiveHours) / drillingMetrics.hours.totalOSVHours * 100 * 0.15)}`}
            variant="compact"
            unit="%"
            trend={(() => {
              const currentWeatherImpact = (drillingMetrics.hours.totalOSVHours - drillingMetrics.hours.totalProductiveHours) / drillingMetrics.hours.totalOSVHours * 100 * 0.15;
              const prevWeatherImpact = previousPeriodMetrics.hours.totalProductiveHours > 0 ? 
                ((drillingMetrics.hours.totalOSVHours - previousPeriodMetrics.hours.totalProductiveHours) / drillingMetrics.hours.totalOSVHours * 100 * 0.15) : currentWeatherImpact;
              return prevWeatherImpact > 0 ? ((currentWeatherImpact - prevWeatherImpact) / prevWeatherImpact) * 100 : 0;
            })()} 
            isPositive={(() => {
              const currentWeatherImpact = (drillingMetrics.hours.totalOSVHours - drillingMetrics.hours.totalProductiveHours) / drillingMetrics.hours.totalOSVHours * 100 * 0.15;
              const prevWeatherImpact = previousPeriodMetrics.hours.totalProductiveHours > 0 ? 
                ((drillingMetrics.hours.totalOSVHours - previousPeriodMetrics.hours.totalProductiveHours) / drillingMetrics.hours.totalOSVHours * 100 * 0.15) : currentWeatherImpact;
              return currentWeatherImpact < prevWeatherImpact; // Lower weather impact is positive
            })()}
            color="orange"
            contextualHelp="Estimated weather downtime as percentage of total vessel time. Calculated as (Total OSV Hours - Productive Hours) × Weather Factor (15%). Based on voyage events classified via vessel codes. Lower percentages indicate better weather conditions."
          />
          <KPICard 
            title="Drilling Voyages" 
            value={drillingMetrics.lifts.vesselVisits.toLocaleString()}
            variant="compact"
            unit="voyages"
            trend={previousPeriodMetrics.lifts.vesselVisits > 0 ? 
              ((drillingMetrics.lifts.vesselVisits - previousPeriodMetrics.lifts.vesselVisits) / previousPeriodMetrics.lifts.vesselVisits) * 100 : 0}
            isPositive={drillingMetrics.lifts.vesselVisits >= previousPeriodMetrics.lifts.vesselVisits}
            color="green"
            contextualHelp="Total number of vessel voyages supporting drilling operations. Counted from voyage list data where voyage purpose = 'Drilling' or 'Mixed' with drilling components. Filtered by selected location if specified. Each round trip = 1 voyage."
          />
          <KPICard 
            title="Maneuvering Hours" 
            value={Math.round(drillingMetrics.utilization.transitTimeHours).toLocaleString()}
            variant="compact"
            unit="hrs"
            trend={previousPeriodMetrics.utilization.transitTimeHours > 0 ? 
              ((drillingMetrics.utilization.transitTimeHours - previousPeriodMetrics.utilization.transitTimeHours) / previousPeriodMetrics.utilization.transitTimeHours) * 100 : 0}
            isPositive={drillingMetrics.utilization.transitTimeHours <= previousPeriodMetrics.utilization.transitTimeHours} // Lower is better for efficiency
            color="purple"
            contextualHelp="Time spent in vessel positioning, maneuvering, and transit between base and drilling locations. Calculated from voyage events with 'Maneuvering' and 'Transit' parent events. Includes setup time at drilling rigs. Lower hours indicate better route efficiency."
          />
        </div>

        {/* Analytics Dashboard Section - Enhanced with Data Integrity */}
        <div className="space-y-6">
          {/* Enhanced Time Analysis */}
            {/* Enhanced Vessel Time Analysis */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Enhanced Time Analysis</h3>
                      <p className="text-sm text-green-100 mt-0.5">{Math.round(drillingMetrics.hours.totalOSVHours).toLocaleString()} Total Hours</p>
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
                        {Math.round(drillingMetrics.hours.productiveHoursPercentage)}% productive with vessel codes validation
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700">
                        {Math.round(drillingMetrics.hours.totalOSVHours).toLocaleString()} hrs
                      </div>
                      <div className="text-xs text-green-600">Enhanced calculation</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(drillingMetrics.hours.totalProductiveHours).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Productive Hours</div>
                    <div className="text-xs text-blue-600 mt-1">With vessel codes</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(drillingMetrics.utilization.transitTimeHours).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Transit Hours</div>
                    <div className="text-xs text-blue-600 mt-1">Enhanced tracking</div>
                  </div>
                </div>
              </div>
            </div>

          {/* Enhanced Fleet Analysis */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Enhanced Drilling Fleet Analysis</h3>
                    <p className="text-sm text-purple-100 mt-0.5">With vessel codes integration & cost allocation validation</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-purple-800">Enhanced Fleet Overview</h4>
                    <p className="text-xs text-purple-600 mt-1">
                      Cost allocation validated • Vessel codes classified • Anti-double-counting enabled
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-700">
                      {drillingMetrics.lifts.vesselVisits}
                    </div>
                    <div className="text-xs text-purple-600">Vessel Visits</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">{Math.round(drillingMetrics.lifts.liftsPerHour).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Lifts/Hr</div>
                  <div className="text-xs text-purple-600 mt-1">Enhanced calc</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">${Math.round(drillingMetrics.costs.costPerTon).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Cost/Ton</div>
                  <div className="text-xs text-purple-600 mt-1">LC validated</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold text-gray-900">{Math.round(drillingMetrics.utilization.vesselUtilization)}%</div>
                  <div className="text-sm text-gray-600">Utilization</div>
                  <div className="text-xs text-purple-600 mt-1">Vessel codes</div>
                </div>
              </div>

              {drillingMetrics.validationSummary.recommendations.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="text-sm font-semibold text-yellow-800 mb-2">Data Quality Recommendations:</h5>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {drillingMetrics.validationSummary.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Activity Breakdown & Vessel Location Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Parent Event Analysis - Kabal-Style Time Monitoring */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Parent Event Analysis</h3>
                      <p className="text-sm text-blue-100 mt-0.5">
                        Time monitoring for critical drilling operations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {(() => {
                        // Calculate total hours from actual parent events
                        const cargoOps = parentEventHours['Cargo Ops'] || 0;
                        const waitingOnInstallation = parentEventHours['Waiting on Installation'] || 0;
                        const transit = drillingMetrics.utilization.transitTimeHours || 0;
                        const maneuvering = parentEventHours['Maneuvering'] || 0;
                        return Math.round(cargoOps + waitingOnInstallation + transit + maneuvering).toLocaleString();
                      })()}
                    </div>
                    <div className="text-xs text-blue-100">Total Parent Event Hours</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Parent Event Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cargo Operations */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Cargo Ops</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {Math.round(parentEventHours['Cargo Ops'] || 0).toLocaleString()}h
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Load/offload operations</div>
                  </div>

                  {/* Waiting on Installation */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Waiting on Installation</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {Math.round(parentEventHours['Waiting on Installation'] || 0).toLocaleString()}h
                    </div>
                    <div className="text-xs text-amber-600 mt-1">Installation standby</div>
                  </div>

                  {/* Transit */}
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Transit</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {Math.round(drillingMetrics.utilization.transitTimeHours).toLocaleString()}h
                    </div>
                    <div className="text-xs text-cyan-600 mt-1">Base ↔ Rig transit</div>
                  </div>

                  {/* Maneuvering */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Maneuvering</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {Math.round(parentEventHours['Maneuvering'] || 0).toLocaleString()}h
                    </div>
                    <div className="text-xs text-purple-600 mt-1">Positioning operations</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vessel Location Data - Enhanced Design */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Ship className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Vessel Operations</h3>
                      <p className="text-sm text-green-100 mt-0.5">
                        Enhanced vessel performance & location analytics
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{drillingMetrics.lifts.vesselVisits}</div>
                    <div className="text-xs text-green-100">Vessel Visits</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-green-800">Enhanced Vessel Analytics</h4>
                      <p className="text-xs text-green-600 mt-1">
                        Cost allocation validated • Location mapping enhanced
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700">
                        {Math.round(drillingMetrics.cargo.cargoTonnagePerVisit).toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600">Tons per visit</div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Vessel Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(drillingMetrics.cargo.totalCargoTons).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Cargo</div>
                    <div className="text-xs text-green-600 mt-1">LC Validated</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{drillingMetrics.lifts.totalLifts.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Lifts</div>
                    <div className="text-xs text-green-600 mt-1">Enhanced tracking</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${Math.round(drillingMetrics.costs.costPerTon).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Cost per Ton</div>
                    <div className="text-xs text-green-600 mt-1">Cost allocation</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${Math.round(drillingMetrics.costs.costPerHour).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Cost per Hour</div>
                    <div className="text-xs text-green-600 mt-1">Enhanced calc</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Analysis Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">RIG LOCATION COST ANALYSIS</h3>
                    <p className="text-sm text-indigo-100 mt-0.5">
                      Cost allocation validated • Enhanced tracking
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{((drillingMetrics as any).rigLocationCostAnalysis?.summary?.totalAllocations || 0)} Cost Allocations</div>
                  <div className="text-xs text-indigo-100">Active Allocations</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Summary Statistics Row - Enhanced with Hover Effects */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center group cursor-pointer p-4 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:shadow-sm">
                  <div className="text-4xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-200">
                    ${Math.round(((drillingMetrics as any).rigLocationCostAnalysis?.summary?.totalCost || 0) / 1000000)}M
                  </div>
                  <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-700 transition-colors">Total Rig Costs</div>
                  <div className="w-12 h-1 bg-blue-200 mx-auto mt-2 group-hover:bg-blue-400 transition-colors"></div>
                </div>
                <div className="text-center group cursor-pointer p-4 rounded-lg hover:bg-green-50 transition-all duration-200 hover:shadow-sm">
                  <div className="text-4xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-200">
                    {Math.round(((drillingMetrics as any).rigLocationCostAnalysis?.summary?.totalDays || 0)).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 group-hover:text-green-700 transition-colors">Total Allocated Days</div>
                  <div className="w-12 h-1 bg-green-200 mx-auto mt-2 group-hover:bg-green-400 transition-colors"></div>
                </div>
                <div className="text-center group cursor-pointer p-4 rounded-lg hover:bg-purple-50 transition-all duration-200 hover:shadow-sm">
                  <div className="text-4xl font-bold text-purple-600 group-hover:scale-110 transition-transform duration-200">
                    ${Math.round(((drillingMetrics as any).rigLocationCostAnalysis?.summary?.averageCostPerDay || 0)).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1 group-hover:text-purple-700 transition-colors">Average Cost per Day</div>
                  <div className="w-12 h-1 bg-purple-200 mx-auto mt-2 group-hover:bg-purple-400 transition-colors"></div>
                </div>
              </div>

              {/* Rig Location Cost Breakdown - Enhanced with Hover Effects & Colors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {((drillingMetrics as any).rigLocationCostAnalysis?.rigs || []).map((rig: any, index: number) => {
                  // Color array for variety
                  const colors = [
                    { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', accent: 'text-blue-600', dot: 'bg-blue-500' },
                    { bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100', accent: 'text-purple-600', dot: 'bg-purple-500' },
                    { bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:bg-indigo-100', accent: 'text-indigo-600', dot: 'bg-indigo-500' },
                    { bg: 'bg-teal-50', border: 'border-teal-200', hover: 'hover:bg-teal-100', accent: 'text-teal-600', dot: 'bg-teal-500' },
                    { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:bg-emerald-100', accent: 'text-emerald-600', dot: 'bg-emerald-500' },
                    { bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100', accent: 'text-green-600', dot: 'bg-green-500' },
                    { bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:bg-cyan-100', accent: 'text-cyan-600', dot: 'bg-cyan-500' },
                    { bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:bg-violet-100', accent: 'text-violet-600', dot: 'bg-violet-500' },
                    { bg: 'bg-sky-50', border: 'border-sky-200', hover: 'hover:bg-sky-100', accent: 'text-sky-600', dot: 'bg-sky-500' }
                  ];
                  const colorSet = colors[index % colors.length];
                  
                  return (
                    <div 
                      key={rig.rigName} 
                      className={`${colorSet.bg} border ${colorSet.border} rounded-lg p-4 transition-all duration-200 ${colorSet.hover} hover:shadow-md hover:border-opacity-80 hover:scale-[1.02] cursor-pointer`}
                    >
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 ${colorSet.dot} rounded-full`}></div>
                          <h4 className="text-lg font-semibold text-gray-900">{rig.rigName}</h4>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center group">
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Total Cost</span>
                          <span className={`text-sm font-semibold ${colorSet.accent} group-hover:scale-105 transition-transform`}>
                            ${Math.round(rig.totalCost / 1000000)}M
                          </span>
                        </div>
                        <div className="flex justify-between items-center group">
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Days</span>
                          <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 group-hover:scale-105 transition-all">
                            {Math.round(rig.totalDays)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center group">
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Cost/Day</span>
                          <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 group-hover:scale-105 transition-all">
                            ${Math.round(rig.costPerDay).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Subtle hover indicator */}
                      <div className={`mt-3 pt-3 border-t ${colorSet.border} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className="text-xs text-gray-500 text-center">
                          Click for details
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Enhanced Drilling Fluids Intelligence Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Blue Header */}
            <div className="bg-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Droplet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Enhanced Drilling Fluids Intelligence</h3>
                    <p className="text-sm text-blue-100 mt-0.5">
                      Advanced drilling & completion fluid analytics with deduplication
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {((drillingMetrics as any).fluidIntelligence?.totalVolume || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-100">Total Volume (bbls)</div>
                </div>
              </div>
            </div>

            {/* Light Blue Summary Card */}
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-blue-900">Enhanced Fluid Analytics</h4>
                  <p className="text-sm text-blue-700 mt-0.5">
                    Anti-double-counting • Load/Offload validation • Cost allocation
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {(drillingMetrics as any).fluidIntelligence?.fluidTypes || 0}
                  </div>
                  <div className="text-sm text-blue-600">Fluid types</div>
                </div>
              </div>
            </div>

            {/* Three Metric Cards Row */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Total Volume */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Total Volume</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {((drillingMetrics as any).fluidIntelligence?.totalVolume || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600">bbls • Deduplicated</div>
                </div>

                {/* Drilling Fluids */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Drilling Fluids</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {((drillingMetrics as any).fluidIntelligence?.drillingMuds?.volume || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600">bbls • Enhanced</div>
                </div>

                {/* Fluid Types */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Fluid Types</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {(drillingMetrics as any).fluidIntelligence?.fluidTypes || 0}
                  </div>
                  <div className="text-xs text-purple-600">Classified types</div>
                </div>

              </div>

              {/* Dynamic Fluid Types Grid */}
              {((drillingMetrics as any).fluidIntelligence?.fluidTypeBreakdown && Object.keys((drillingMetrics as any).fluidIntelligence.fluidTypeBreakdown).length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries((drillingMetrics as any).fluidIntelligence.fluidTypeBreakdown)
                    .sort(([,a], [,b]) => (b as any).volume - (a as any).volume)
                    .slice(0, 6)
                    .map(([fluidType, data], index) => {
                      const fluidData = data as { volume: number; transfers: number; type: 'Drilling' | 'Completion' };
                      
                      // Color array for consistent styling
                      const colors = [
                        { bg: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-600' },
                        { bg: 'border-purple-200', dot: 'bg-purple-500', text: 'text-purple-600' },
                        { bg: 'border-indigo-200', dot: 'bg-indigo-500', text: 'text-indigo-600' },
                        { bg: 'border-teal-200', dot: 'bg-teal-500', text: 'text-teal-600' },
                        { bg: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-600' },
                        { bg: 'border-green-200', dot: 'bg-green-500', text: 'text-green-600' }
                      ];
                      const colorSet = colors[index % colors.length];
                      
                      return (
                        <div key={fluidType} className={`bg-gray-50 rounded-lg p-4 border ${colorSet.bg}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 ${colorSet.dot} rounded-full`}></div>
                            <span className="text-sm font-semibold text-gray-700">{fluidType}</span>
                          </div>
                          <div className={`text-xl font-bold ${colorSet.text} mb-1`}>
                            {Math.round(fluidData.volume).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            BBLs • {fluidData.transfers} transfers
                          </div>
                          <div className="text-xs text-gray-500">
                            {fluidData.type === 'Drilling' ? 'Drilling fluid' : 'Completion fluid'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              
              {/* Fallback message if no fluid data */}
              {(!(drillingMetrics as any).fluidIntelligence?.fluidTypeBreakdown || Object.keys((drillingMetrics as any).fluidIntelligence?.fluidTypeBreakdown || {}).length === 0) && (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm">
                    No fluid data available for the selected time period and location
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DrillingDashboard;
