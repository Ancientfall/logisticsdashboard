import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getAllDrillingCapableLocations } from '../../data/masterFacilities';
import { Clock, Ship, BarChart3, Droplet } from 'lucide-react';
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
import { deduplicateBulkActions, getDrillingFluidMovements } from '../../utils/bulkFluidDeduplicationEngine';
import { 
  calculateDrillingOperationalVariance, 
  calculateVesselUtilizationVariance 
} from '../../utils/statisticalVariance';
import { 
  DrillingOperationalVarianceDashboard, 
  VesselUtilizationVarianceDashboard 
} from './VarianceAnalysisComponents';
import { formatSmartCurrency } from '../../utils/formatters';
import { 
  getThunderHorseDrillingVoyages, 
  getMadDogDrillingVoyages
} from '../../utils/thunderHorseMadDogClassification';

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

  // Update default month when data loads (only on initial load)
  const [hasInitialized, setHasInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!hasInitialized && getDefaultMonth !== 'All Months' && filters.selectedMonth === 'All Months') {
      setFilters(prev => ({ ...prev, selectedMonth: getDefaultMonth }));
      setHasInitialized(true);
    }
  }, [getDefaultMonth, filters.selectedMonth, hasInitialized]);
  
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
          const selectedFacility = getAllDrillingCapableLocations().find(
            f => f.displayName === filters.selectedLocation
          );
          
          if (selectedFacility) {
            prevDrillingVoyages = prevFilteredVoyages.filter(voyage => {
              if (!voyage.locations) return false;
              
              const voyageLocation = voyage.locations.toLowerCase().trim();
              const facilityLocationName = selectedFacility.locationName.toLowerCase();
              const facilityDisplayName = selectedFacility.displayName.toLowerCase();
              
              return voyageLocation.includes(facilityLocationName) ||
                     voyageLocation.includes(facilityDisplayName);
            }).length;
          } else {
            prevDrillingVoyages = 0;
          }
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
          liftsPerHour: (() => {
            // Calculate actual cargo operation hours for previous period
            const prevCargoEvents = voyageEvents.filter(event => {
              // Time filtering for previous period
              if (isPrevYTD && prevFilterYear !== undefined) {
                const eventDate = new Date(event.eventDate);
                if (eventDate.getFullYear() !== prevFilterYear) return false;
              } else if (prevFilterMonth !== undefined && prevFilterYear !== undefined) {
                const eventDate = new Date(event.eventDate);
                if (eventDate.getMonth() !== prevFilterMonth || eventDate.getFullYear() !== prevFilterYear) return false;
              }
              
              // Location filtering
              if (filters.selectedLocation !== 'All Locations') {
                const selectedFacility = getAllDrillingCapableLocations().find(
                  f => f.displayName === filters.selectedLocation
                );
                if (selectedFacility) {
                  const eventLocation = event.location?.toLowerCase().trim() || '';
                  const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
                  const facilityLocationName = selectedFacility.locationName.toLowerCase();
                  const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                  const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim();
                  
                  const matchesLocation = 
                    eventLocation.includes(facilityLocationName) ||
                    mappedLocation.includes(facilityLocationName) ||
                    eventLocation.includes(facilityNameCore) ||
                    mappedLocation.includes(facilityNameCore) ||
                    facilityLocationName.includes(eventLocation) ||
                    facilityNameCore.includes(eventLocation);
                  
                  if (!matchesLocation) return false;
                }
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
                     remarks.includes('crane');
            });
            
            const prevCargoOperationHours = prevCargoEvents.reduce((sum, event) => sum + (event.finalHours || event.hours || 0), 0);
            
            return prevCargoOperationHours > 0 ? prevManifestMetrics.totalLifts / prevCargoOperationHours : 0;
          })(),
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
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions, filters, isDataReady]);

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
          selectedLocation,
          selectedMonth: filters.selectedMonth,
          willApplyTimeFiltering: {
            isYTD: isYTD && filterYear !== undefined,
            isSpecificMonth: filterMonth !== undefined && filterYear !== undefined,
            noTimeFiltering: !isYTD && (filterMonth === undefined || filterYear === undefined)
          }
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
          const beforeSpecificMonthFilter = filteredAllocations.length;
          filteredAllocations = filteredAllocations.filter(allocation => {
            if (allocation.costAllocationDate) {
              return allocation.costAllocationDate.getMonth() === filterMonth && allocation.costAllocationDate.getFullYear() === filterYear;
            } else if (allocation.month && allocation.year) {
              return allocation.month - 1 === filterMonth && allocation.year === filterYear; // month is 1-based in data
            }
            return true;
          });
          
          console.log('🔍 SPECIFIC MONTH FILTERING APPLIED:', {
            filterMonth, 
            filterYear,
            beforeFilter: beforeSpecificMonthFilter,
            afterFilter: filteredAllocations.length,
            recordsRemoved: beforeSpecificMonthFilter - filteredAllocations.length
          });
        }
        
        console.log('🔍 FINAL TIME FILTERING RESULT:', {
          selectedMonth: filters.selectedMonth,
          finalCount: filteredAllocations.length,
          timeFilteringApplied: {
            ytd: isYTD && filterYear !== undefined,
            specificMonth: filterMonth !== undefined && filterYear !== undefined,
            allMonths: !isYTD && (filterMonth === undefined || filterYear === undefined)
          }
        });
        
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
          uniqueRigLocations: [...new Set(filteredAllocations.map(a => a.rigLocation).filter(Boolean))],
          sampleCostData: filteredAllocations.slice(0, 3).map(a => ({
            lcNumber: a.lcNumber,
            locationReference: a.locationReference,
            totalCost: a.totalCost,
            totalAllocatedDays: a.totalAllocatedDays,
            isDrilling: a.isDrilling,
            isThunderHorse: a.isThunderHorse,
            isMadDog: a.isMadDog
          }))
        });
        
        // Group by DRILLING RIG location only and calculate metrics
        const rigMetrics = filteredAllocations.reduce((acc, allocation) => {
          let rigName = allocation.locationReference || allocation.rigLocation || allocation.description || 'Unknown';
          
          // Clean up rig names and ensure they are drilling rigs
          const drillingLocations = getAllDrillingCapableLocations();
          const matchedLocation = drillingLocations.find(loc => {
            const rigNameLower = rigName.toLowerCase();
            const displayNameLower = loc.displayName.toLowerCase();
            const locationNameLower = loc.locationName.toLowerCase();
            const displayNameCore = displayNameLower.replace(/\s*\([^)]*\)/, '').trim(); // Remove parentheses
            
            // Multiple matching strategies + handle common typos
            const matchesDirectly = rigNameLower.includes(displayNameLower) ||
                   displayNameLower.includes(rigNameLower) ||
                   rigNameLower.includes(locationNameLower) ||
                   locationNameLower.includes(rigNameLower) ||
                   rigNameLower.includes(displayNameCore) ||
                   displayNameCore.includes(rigNameLower);
            
            // Handle common spelling variations
            const matchesTypos = 
              // "Steana IceMAX" should match "Stena IceMAX"
              (rigNameLower.includes('steana icemax') && displayNameCore.includes('stena icemax')) ||
              (rigNameLower.includes('stena icemax') && displayNameCore.includes('stena icemax')) ||
              // Handle other potential variations
              (rigNameLower.replace('steana', 'stena').includes(displayNameCore)) ||
              (displayNameCore.includes(rigNameLower.replace('steana', 'stena')));
            
            return matchesDirectly || matchesTypos;
          });
          
          if (matchedLocation) {
            rigName = matchedLocation.displayName; // Use standardized name
          } else {
            // Debug logging for unmatched locations
            if (rigName.toLowerCase().includes('thunder') || rigName.toLowerCase().includes('mad dog')) {
              console.log('🚨 UNMATCHED DRILLING LOCATION:', {
                originalRigName: rigName,
                availableFacilities: drillingLocations.map(f => ({ 
                  displayName: f.displayName, 
                  locationName: f.locationName,
                  displayNameCore: f.displayName.replace(/\s*\([^)]*\)/, '').trim()
                }))
              });
            }
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
          
          const days = allocation.totalAllocatedDays || 0;
          
          // Calculate cost using proper daily rate based on time period
          // Time period logic: Jan 1, 2024 - Mar 31, 2025 = $33,000/day
          // Apr 1, 2025 onwards = $37,800/day
          let dailyRate = 33000; // Default rate for Jan 2024 - Mar 2025
          
          // Determine appropriate rate based on allocation date
          if (allocation.costAllocationDate) {
            const allocDate = new Date(allocation.costAllocationDate);
            if (allocDate >= new Date('2025-04-01')) {
              dailyRate = 37800;
            }
          } else if (allocation.year && allocation.month) {
            // Use year/month if costAllocationDate not available
            const allocDate = new Date(allocation.year, allocation.month - 1, 1);
            if (allocDate >= new Date('2025-04-01')) {
              dailyRate = 37800;
            }
          } else {
            // If no date info, use filter period to determine rate
            if (filterYear && filterYear >= 2025) {
              if (!filterMonth || filterMonth >= 3) { // April or later (filterMonth is 0-based)
                dailyRate = 37800;
              }
            }
          }
          
          const calculatedCost = days * dailyRate;
          
          acc[rigName].totalCost += calculatedCost;
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
        
        const result = {
          rigs: sortedRigs,
          summary: {
            totalCost: totalCosts,
            totalDays: totalDays,
            averageCostPerDay: (totalDays as number) > 0 ? (totalCosts as number) / (totalDays as number) : 0,
            totalAllocations: totalAllocations
          }
        };
        
        console.log('🔍 RIG COST ANALYSIS RESULT:', {
          rigsCount: sortedRigs.length,
          rigsFound: sortedRigs.map(r => ({ name: r.rigName, cost: r.totalCost, days: r.totalDays })),
          summary: result.summary,
          rawRigMetricsKeys: Object.keys(rigMetrics),
          rawRigMetricsCount: Object.keys(rigMetrics).length
        });
        
        // DETAILED COST ALLOCATION BREAKDOWN FOR DISCREPANCY ANALYSIS
        console.log('🏗️ RIG LOCATION COST ANALYSIS DETAILED BREAKDOWN:', {
          totalRigLocationCost: result.summary.totalCost,
          totalAllocationsProcessed: filteredAllocations.length,
          rigsIncluded: sortedRigs.length,
          costAllocationBreakdown: filteredAllocations
            .filter(allocation => allocation.totalCost > 0 || allocation.budgetedVesselCost > 0)
            .sort((a, b) => {
              const costA = a.totalCost || a.budgetedVesselCost || 0;
              const costB = b.totalCost || b.budgetedVesselCost || 0;
              return costB - costA;
            })
            .slice(0, 15)
            .map(allocation => ({
              lcNumber: allocation.lcNumber,
              locationReference: allocation.locationReference,
              rigLocation: allocation.rigLocation,
              totalCost: allocation.totalCost,
              budgetedVesselCost: allocation.budgetedVesselCost,
              usedCost: allocation.totalCost || allocation.budgetedVesselCost || 0,
              totalAllocatedDays: allocation.totalAllocatedDays,
              department: allocation.department,
              projectType: allocation.projectType,
              costPerDay: allocation.totalAllocatedDays > 0 ? 
                (allocation.totalCost || allocation.budgetedVesselCost || 0) / allocation.totalAllocatedDays : 0
            })),
          costSourceBreakdown: {
            totalCostUsed: filteredAllocations.filter(a => a.totalCost).reduce((sum, a) => sum + a.totalCost, 0),
            budgetedCostUsed: filteredAllocations.filter(a => !a.totalCost && a.budgetedVesselCost).reduce((sum, a) => sum + a.budgetedVesselCost, 0),
            totalCostCount: filteredAllocations.filter(a => a.totalCost).length,
            budgetedCostCount: filteredAllocations.filter(a => !a.totalCost && a.budgetedVesselCost).length
          },
          rigLocationMapping: Object.entries(rigMetrics).map(([rigName, metrics]) => ({
            rigName,
            totalCost: (metrics as any).totalCost,
            totalDays: (metrics as any).totalDays,
            allocations: (metrics as any).allocations,
            costPerDay: (metrics as any).costPerDay
          }))
        });
        
        return result;
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
          costs: { totalVesselCost: 0, costPerHour: 0 },
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

      // Enhanced KPI calculations with drilling department focus (kept for legacy compatibility)
      // const enhancedKPIs = calculateEnhancedKPIMetrics(...) - replaced with fixedKPIs using enhanced calculation

      // Run comprehensive data integrity validation
      const integrityReport = validateDataIntegrity(
        voyageEvents,
        vesselManifests,
        costAllocation,
        bulkActions,
        voyageList
      );
      
      console.log(`📊 Data Integrity Score: ${Math.round(integrityReport.overallScore)}%`);

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
          const selectedFacility = getAllDrillingCapableLocations().find(
            f => f.displayName === filters.selectedLocation
          );
          
          if (selectedFacility) {
            // Special manifest-based classification for Thunder Horse and Mad Dog
            if (filters.selectedLocation === 'Thunder Horse (Drilling)') {
              // Use manifest classification to get drilling-only voyages
              const thunderHorseVoyages = filteredVoyages.filter(voyage => 
                voyage.locations?.toLowerCase().includes('thunder horse')
              );
              drillingVoyages = getThunderHorseDrillingVoyages(thunderHorseVoyages, vesselManifests);
              
              console.log('🎯 THUNDER HORSE DRILLING - MANIFEST CLASSIFICATION:', {
                totalThunderHorseVoyages: thunderHorseVoyages.length,
                drillingOnlyVoyages: drillingVoyages,
                productionVoyages: thunderHorseVoyages.length - drillingVoyages
              });
              
            } else if (filters.selectedLocation === 'Mad Dog (Drilling)') {
              // Use manifest classification to get drilling-only voyages
              const madDogVoyages = filteredVoyages.filter(voyage => 
                voyage.locations?.toLowerCase().includes('mad dog')
              );
              drillingVoyages = getMadDogDrillingVoyages(madDogVoyages, vesselManifests);
              
              console.log('🎯 MAD DOG DRILLING - MANIFEST CLASSIFICATION:', {
                totalMadDogVoyages: madDogVoyages.length,
                drillingOnlyVoyages: drillingVoyages,
                productionVoyages: madDogVoyages.length - drillingVoyages
              });
              
            } else {
              // Use existing logic for other drilling locations
              drillingVoyages = filteredVoyages.filter(voyage => {
                if (!voyage.locations) return false;
                
                const locations = voyage.locations.toLowerCase();
                const facilityLocationName = selectedFacility.locationName.toLowerCase();
                const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim(); // Remove parentheses
                
                // Comprehensive location matching
                return locations.includes(facilityLocationName) ||
                       locations.includes(facilityNameCore) ||
                       facilityLocationName.includes(locations);
              }).length;
            }
            
            console.log('🔍 VOYAGE FILTERING DEBUG:', {
              selectedLocation: filters.selectedLocation,
              selectedFacility: selectedFacility.displayName,
              facilityLocationName: selectedFacility.locationName,
              totalFilteredVoyages: filteredVoyages.length,
              drillingVoyagesFound: drillingVoyages,
              sampleVoyageLocations: filteredVoyages.slice(0, 10).map(v => v.locations).filter(Boolean),
              matchingVoyages: filteredVoyages.filter(voyage => {
                if (!voyage.locations) return false;
                const locations = voyage.locations.toLowerCase();
                const facilityLocationName = selectedFacility.locationName.toLowerCase();
                const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim();
                return locations.includes(facilityLocationName) ||
                       locations.includes(facilityNameCore) ||
                       facilityLocationName.includes(locations);
              }).slice(0, 5).map(v => ({ locations: v.locations, purpose: v.voyagePurpose }))
            });
          } else {
            console.warn(`⚠️ No facility found for voyage filtering: ${filters.selectedLocation}`);
            console.log('Available facilities:', getAllDrillingCapableLocations().map(f => f.displayName));
            drillingVoyages = 0;
          }
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

      console.log('🔍 ENHANCED FLUID ANALYTICS DEBUG START');
      console.log('bulkActions exists:', !!bulkActions);
      console.log('bulkActions length:', bulkActions?.length || 0);
      console.log('isDataReady:', isDataReady);
      console.log('Selected location:', filters.selectedLocation);
      
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
        
        // Debug: Log Mad Dog related bulk actions before filtering
        // Try multiple search patterns for Mad Dog
        const madDogActions = bulkActions.filter(action => {
          const destination = (action.destinationPort?.toLowerCase() || '').trim();
          const standardized = (action.standardizedDestination?.toLowerCase() || '').trim();
          const atPort = (action.atPort?.toLowerCase() || '').trim();
          
          return destination.includes('mad dog') || 
                 destination.includes('maddog') ||
                 destination.includes('mad_dog') ||
                 standardized.includes('mad dog') ||
                 standardized.includes('maddog') ||
                 standardized.includes('mad_dog') ||
                 atPort.includes('mad dog') ||
                 atPort.includes('maddog') ||
                 atPort.includes('mad_dog');
        });
        
        console.log(`🚨 CRITICAL DEBUG: ${bulkActions.length} total bulk actions, ${madDogActions.length} Mad Dog actions found`);
        
        // Show sample destinations if no Mad Dog found
        if (madDogActions.length === 0) {
          console.log('🔍 SAMPLE DESTINATIONS FROM BULK ACTIONS:');
          const uniqueDestinations = [...new Set(bulkActions.map(a => a.destinationPort?.toLowerCase()).filter(Boolean))] as string[];
          const madDogLike = uniqueDestinations.filter(dest => dest.includes('mad') || dest.includes('dog'));
          console.log('Mad Dog-like destinations:', madDogLike);
          console.log('First 10 destinations:', uniqueDestinations.slice(0, 10));
        }
        
        if (madDogActions.length === 0) {
          console.log('❌ NO MAD DOG FOUND');
          // Show sample of actual destination names
          const sampleDestinations = bulkActions.slice(0, 5).map(a => ({
            dest: a.destinationPort,
            std: a.standardizedDestination
          }));
          console.log('Sample destinations:', sampleDestinations);
        } else {
          // Show ALL Mad Dog port types
          const madDogPortTypes = [...new Set(madDogActions.map(a => a.portType))];
          
          // Show Mad Dog action types
          const madDogActionTypes = [...new Set(madDogActions.map(a => a.action))];
          
          // Show drilling fluid status
          const drillingFluidCount = madDogActions.filter(a => a.isDrillingFluid).length;
          const completionFluidCount = madDogActions.filter(a => a.isCompletionFluid).length;
          
          // Show first few examples
          const examples = madDogActions.slice(0, 3).map(action => ({
            action: action.action,
            portType: action.portType,
            isDrillingFluid: action.isDrillingFluid,
            isCompletionFluid: action.isCompletionFluid,
            bulkType: action.bulkType,
            destination: action.destinationPort
          }));
          
          console.log(`🐕 MAD DOG ANALYSIS: ${madDogActions.length} total actions`);
          console.log(`🐕 Port types: ${JSON.stringify(madDogPortTypes)}`);
          console.log(`🐕 Action types: ${JSON.stringify(madDogActionTypes)}`);
          console.log(`🐕 Drilling fluids: ${drillingFluidCount}, Completion fluids: ${completionFluidCount}`);
          console.log(`🐕 Examples:`, examples);
        }

        // *** CRITICAL: Filter for OFFLOADS TO DRILLING RIG LOCATIONS ONLY ***
        // Use the same logic as Kabal: portType === 'rig' && action === 'offload'
        
        // Debug: Check filtering criteria step by step for Mad Dog
        const beforeDrillingFilter = filteredBulkActions.filter(action => {
          const destination = action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '';
          return destination.includes('mad dog');
        }).length;
        
        console.log(`🐕 DRILLING FILTER START: ${filteredBulkActions.length} actions to filter`);
        
        filteredBulkActions = filteredBulkActions.filter(action => {
          // Must be drilling or completion fluid
          const isDrillingRelatedFluid = action.isDrillingFluid || action.isCompletionFluid;
          
          // Only include OFFLOAD operations to avoid double-counting (matching Kabal logic)
          // Load operations happen at the base, offload operations happen at the rig
          const isRelevantOperation = action.action === 'offload';
          
          // Check if this is a Mad Dog or Thunder Horse action that might have different port type
          const destination = (action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '');
          const isMadDogAction = destination.includes('mad dog');
          const isThunderHorseAction = destination.includes('thunder horse') || destination.includes('thunderhorse') || destination.includes('thr');
          
          // Must be to a rig port (matching Kabal's logic exactly)
          // Only count offloads TO the rig to avoid double-counting
          // Both Mad Dog and Thunder Horse should only count 'rig' port type for drilling fluids
          const isRigDestination = action.portType === 'rig';
          
          const passes = isDrillingRelatedFluid && isRelevantOperation && isRigDestination;
          
          // Debug Mad Dog and Thunder Horse actions in this filter
          if (isMadDogAction || isThunderHorseAction) {
            const facility = isMadDogAction ? 'MAD DOG' : 'THUNDER HORSE';
            console.log(`🐕 DRILLING FILTER ${facility}:`, {
              isDrillingRelatedFluid,
              isRelevantOperation,
              isRigDestination,
              portType: action.portType,
              passes,
              month: action.startDate.getMonth() + 1,
              year: action.startDate.getFullYear(),
              destination: action.destinationPort
            });
          }
          
          return passes;
        });
        
        console.log(`🐕 DRILLING FILTER END: ${filteredBulkActions.length} actions remaining`);
        
        const afterDrillingFilter = filteredBulkActions.filter(action => {
          const destination = action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '';
          return destination.includes('mad dog');
        }).length;
        
        console.log(`🔍 Mad Dog filtering results: ${beforeDrillingFilter} → ${afterDrillingFilter} actions`);
        
        // Debug: Check what specific criteria are failing for Mad Dog
        const madDogFailedCriteria = bulkActions.filter(action => {
          const destination = action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '';
          if (!destination.includes('mad dog')) return false;
          
          const isDrillingRelatedFluid = action.isDrillingFluid || action.isCompletionFluid;
          const isRelevantOperation = action.action === 'offload'; // Only offloads to match main filter logic
          const isRigDestination = action.portType === 'rig'; // Only rig destinations for accurate fluid counting
          
          return !(isDrillingRelatedFluid && isRelevantOperation && isRigDestination);
        });
        
        console.log('🚫 Mad Dog actions failing criteria:', madDogFailedCriteria.length);
        
        // Count specific failure reasons and show detailed breakdown
        const failureReasons = {
          notDrillingFluid: 0,
          notOffload: 0,
          notRigPort: 0
        };
        
        const portTypeDistribution: Record<string, number> = {};
        const actionDistribution: Record<string, number> = {};
        
        madDogFailedCriteria.forEach(action => {
          if (!(action.isDrillingFluid || action.isCompletionFluid)) failureReasons.notDrillingFluid++;
          if (action.action !== 'offload') failureReasons.notOffload++;
          if (action.portType !== 'rig') failureReasons.notRigPort++;
          
          // Track distributions
          portTypeDistribution[action.portType] = (portTypeDistribution[action.portType] || 0) + 1;
          actionDistribution[action.action] = (actionDistribution[action.action] || 0) + 1;
        });
        
        console.log('🔍 DETAILED MAD DOG FAILURE ANALYSIS:');
        console.log(`Not drilling fluid: ${failureReasons.notDrillingFluid}`);
        console.log(`Not offload: ${failureReasons.notOffload}`);
        console.log(`Not rig port: ${failureReasons.notRigPort}`);
        console.log('Port type distribution:', portTypeDistribution);
        console.log('Action distribution:', actionDistribution);
        
        // Show detailed examples of failed actions
        const sampleFailedActions = madDogFailedCriteria.slice(0, 3).map(action => ({
          action: action.action,
          portType: action.portType,
          isDrillingFluid: action.isDrillingFluid,
          isCompletionFluid: action.isCompletionFluid,
          bulkType: action.bulkType,
          destinationPort: action.destinationPort,
          atPort: action.atPort
        }));
        
        console.log('🔍 SAMPLE FAILED ACTIONS:', sampleFailedActions);
        
        // Critical fix: If Mad Dog actions are failing because portType isn't 'rig',
        // let's check if we need to include 'platform' or other port types for Mad Dog
        if (failureReasons.notRigPort > 0 && madDogActions.length > 0) {
          console.log('🚨 CRITICAL: Mad Dog actions failing portType check - may need to include platform/base types');
          
          // Show what port types Mad Dog actually has
          const madDogPortTypes = [...new Set(madDogActions.map(a => a.portType))];
          console.log(`🐕 MAD DOG PORT TYPES: ${JSON.stringify(madDogPortTypes)}`);
          
          // Show action distribution
          const madDogActionTypes = [...new Set(madDogActions.map(a => a.action))];
          console.log(`🐕 MAD DOG ACTION TYPES: ${JSON.stringify(madDogActionTypes)}`);
          
          // Show drilling fluid count
          const drillingFluidCount = madDogActions.filter(a => a.isDrillingFluid).length;
          const completionFluidCount = madDogActions.filter(a => a.isCompletionFluid).length;
          console.log(`🐕 MAD DOG DRILLING FLUIDS: ${drillingFluidCount}, COMPLETION FLUIDS: ${completionFluidCount}`);
          
          // Check what time periods Mad Dog actions are from
          const madDogDates = madDogActions.map(a => ({
            month: a.startDate.getMonth() + 1,
            year: a.startDate.getFullYear(),
            monthYear: `${a.startDate.getMonth() + 1}/${a.startDate.getFullYear()}`
          }));
          
          const madDogMonthYears = [...new Set(madDogDates.map(d => d.monthYear))];
          console.log(`🐕 MAD DOG TIME PERIODS: ${JSON.stringify(madDogMonthYears.sort())}`);
          
          // Show current filter settings
          console.log(`🐕 CURRENT FILTER: ${filterMonth !== undefined ? filterMonth + 1 : 'All'}/${filterYear || 'All'}, isYTD: ${isYTD}`);
          
          // Check specifically what happens to May 2025 Mad Dog actions
          const may2025MadDogActions = madDogActions.filter(action => {
            return action.startDate.getMonth() === 4 && action.startDate.getFullYear() === 2025; // May = month 4 (0-indexed)
          });
          
          console.log(`🐕 MAY 2025 MAD DOG ACTIONS: ${may2025MadDogActions.length} total`);
          
          if (may2025MadDogActions.length > 0) {
            const drillingCount = may2025MadDogActions.filter(a => a.isDrillingFluid || a.isCompletionFluid).length;
            const rigCount = may2025MadDogActions.filter(a => a.portType === 'rig').length;
            const baseCount = may2025MadDogActions.filter(a => a.portType === 'base').length;
            const offloadCount = may2025MadDogActions.filter(a => a.action === 'offload').length;
            
            console.log(`🐕 MAY 2025 BREAKDOWN: ${drillingCount} drilling fluids, ${rigCount} rig port, ${baseCount} base port, ${offloadCount} offload`);
            
            // Show ALL May 2025 examples (not just first 3)
            const examples = may2025MadDogActions.map(action => ({
              action: action.action,
              portType: action.portType,
              isDrillingFluid: action.isDrillingFluid,
              isCompletionFluid: action.isCompletionFluid,
              bulkType: action.bulkType,
              volumeBbls: action.volumeBbls,
              destinationPort: action.destinationPort,
              standardizedDestination: action.standardizedDestination
            }));
            console.log(`🐕 MAY 2025 ALL EXAMPLES:`, examples);
            
            // Check how many pass our current filtering criteria
            const passingMay2025 = may2025MadDogActions.filter(action => {
              const isDrillingRelatedFluid = action.isDrillingFluid || action.isCompletionFluid;
              const isRelevantOperation = action.action === 'offload'; // Only offloads to avoid double-counting
              const isRigDestination = action.portType === 'rig'; // Only rig destinations to match main filter logic
              return isDrillingRelatedFluid && isRelevantOperation && isRigDestination;
            });
            console.log(`🐕 MAY 2025 PASSING FILTER: ${passingMay2025.length} actions`);
          }
        }
        
        // Apply specific location filtering if selected - using proper facility matching
        if (filters.selectedLocation !== 'All Locations') {
          const selectedFacility = getAllDrillingCapableLocations().find(
            f => f.displayName === filters.selectedLocation
          );
          
          console.log(`🐕 LOCATION FILTERING - Selected: ${filters.selectedLocation}`);
          console.log(`🐕 LOCATION FILTERING - Facility found:`, selectedFacility);
          console.log(`🐕 LOCATION FILTERING - Before filter: ${filteredBulkActions.length} actions`);
          
          if (selectedFacility) {
            const beforeLocationFilter = filteredBulkActions.length;
            
            filteredBulkActions = filteredBulkActions.filter(action => {
              // Check all possible location fields against facility name variations
              const atPort = action.atPort?.toLowerCase().trim() || '';
              const destinationPort = action.destinationPort?.toLowerCase().trim() || '';
              const standardizedOrigin = action.standardizedOrigin?.toLowerCase().trim() || '';
              const standardizedDestination = action.standardizedDestination?.toLowerCase().trim() || '';
              
              const facilityLocationName = selectedFacility.locationName.toLowerCase();
              const facilityDisplayName = selectedFacility.displayName.toLowerCase();
              
              // Check if any location field matches the facility
              // Standard matching (destination contains facility name)
              const standardMatch = 
                atPort.includes(facilityLocationName) ||
                destinationPort.includes(facilityLocationName) ||
                standardizedOrigin.includes(facilityLocationName) ||
                standardizedDestination.includes(facilityLocationName) ||
                atPort.includes(facilityDisplayName) ||
                destinationPort.includes(facilityDisplayName) ||
                standardizedOrigin.includes(facilityDisplayName) ||
                standardizedDestination.includes(facilityDisplayName);
              
              // Reverse matching (facility name contains destination)
              // This handles cases like "mad dog" matching "mad dog drilling"
              // and "thunder horse" matching "thunder horse (drilling)"
              const reverseMatch = 
                (atPort.length > 3 && facilityLocationName.includes(atPort)) ||
                (destinationPort.length > 3 && facilityLocationName.includes(destinationPort)) ||
                (standardizedOrigin.length > 3 && facilityLocationName.includes(standardizedOrigin)) ||
                (standardizedDestination.length > 3 && facilityLocationName.includes(standardizedDestination)) ||
                (atPort.length > 3 && facilityDisplayName.includes(atPort)) ||
                (destinationPort.length > 3 && facilityDisplayName.includes(destinationPort)) ||
                (standardizedOrigin.length > 3 && facilityDisplayName.includes(standardizedOrigin)) ||
                (standardizedDestination.length > 3 && facilityDisplayName.includes(standardizedDestination));
              
              // Special handling for common name variations
              const specialMatches = 
                // Thunder Horse variations
                (facilityLocationName.includes('thunder horse') && (
                  destinationPort.includes('thunder horse') || 
                  destinationPort.includes('thunderhorse') ||
                  destinationPort.includes('thr') ||
                  standardizedDestination.includes('thunder horse') ||
                  standardizedDestination.includes('thunderhorse') ||
                  standardizedDestination.includes('thr')
                )) ||
                // Mad Dog variations
                (facilityLocationName.includes('mad dog') && (
                  destinationPort.includes('mad dog') || 
                  destinationPort.includes('maddog') ||
                  destinationPort.includes('mad_dog') ||
                  standardizedDestination.includes('mad dog') ||
                  standardizedDestination.includes('maddog') ||
                  standardizedDestination.includes('mad_dog')
                ));
              
              const matchesLocation = standardMatch || reverseMatch || specialMatches;
              
              // Debug Mad Dog and Thunder Horse actions specifically
              const isMadDogAction = destinationPort.includes('mad dog') || standardizedDestination.includes('mad dog') || 
                                   atPort.includes('mad dog') || standardizedOrigin.includes('mad dog');
              const isThunderHorseAction = destinationPort.includes('thunder horse') || destinationPort.includes('thunderhorse') || 
                                         destinationPort.includes('thr') || standardizedDestination.includes('thunder horse') ||
                                         standardizedDestination.includes('thunderhorse') || standardizedDestination.includes('thr') ||
                                         atPort.includes('thunder horse') || standardizedOrigin.includes('thunder horse');
              
              if (isMadDogAction) {
                console.log(`🐕 CHECKING MAD DOG ACTION:`, {
                  atPort,
                  destinationPort,
                  standardizedDestination,
                  facilityLocationName,        // "mad dog drilling"
                  facilityDisplayName,         // "mad dog (drilling)"
                  matchesLocation,
                  allFields: {
                    atPort: `"${atPort}"`,
                    destinationPort: `"${destinationPort}"`, 
                    standardizedDestination: `"${standardizedDestination}"`,
                    standardizedOrigin: `"${standardizedOrigin}"`
                  }
                });
              }
              
              if (isThunderHorseAction) {
                console.log(`🐎 CHECKING THUNDER HORSE ACTION:`, {
                  atPort,
                  destinationPort,
                  standardizedDestination,
                  facilityLocationName,        // e.g., "thunder horse drilling"
                  facilityDisplayName,         // e.g., "thunder horse (drilling)"
                  matchesLocation,
                  allFields: {
                    atPort: `"${atPort}"`,
                    destinationPort: `"${destinationPort}"`, 
                    standardizedDestination: `"${standardizedDestination}"`,
                    standardizedOrigin: `"${standardizedOrigin}"`
                  }
                });
              }
              
              return matchesLocation;
            });
            
            console.log(`🐕 LOCATION FILTERING - After filter: ${filteredBulkActions.length} actions (removed ${beforeLocationFilter - filteredBulkActions.length})`);
          }
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
        
        // Show final Mad Dog count after all filtering and deduplication
        const finalMadDogCount = filteredBulkActions.filter(action => {
          const destination = action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '';
          return destination.includes('mad dog');
        }).length;
        
        const finalMadDogOperations = drillingFluidOperations.filter(op => {
          return op.operations.some(action => {
            const destination = action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '';
            return destination.includes('mad dog');
          });
        }).length;
        
        const finalMadDogVolume = drillingFluidOperations.filter(op => {
          return op.operations.some(action => {
            const destination = action.destinationPort?.toLowerCase() || action.standardizedDestination?.toLowerCase() || '';
            return destination.includes('mad dog');
          });
        }).reduce((sum, op) => sum + op.totalVolumeBbls, 0);
        
        console.log(`🐕 MAD DOG FINAL RESULTS: ${finalMadDogCount} actions, ${finalMadDogOperations} operations, ${finalMadDogVolume.toFixed(1)} bbls`);
      }

      // Calculate rig location cost analysis first (needed for costs calculation)
      const rigLocationCostAnalysis = calculateRigLocationCosts(costAllocation, filterMonth, filterYear, isYTD, filters.selectedLocation);

      // CRITICAL FIX: Calculate enhanced KPIs using cost allocation as master data source
      console.log('🔧 CALCULATING ENHANCED KPIs with Cost Allocation Master Data Source');
      const fixedKPIs = calculateAllEnhancedKPIs(
        voyageEvents,
        vesselManifests,
        costAllocation,
        'Drilling',
        isYTD ? undefined : filterMonth,
        filterYear,
        filters.selectedLocation
      );

      // Build comprehensive metrics object using FIXED KPIs
      const metrics = {
        // FIXED: Core cargo metrics using cost allocation LC filtering
        cargo: {
          totalCargoTons: fixedKPIs.cargoTons.totalCargoTons,
          cargoTonnagePerVisit: fixedKPIs.cargoTons.cargoTonnagePerVisit,
          rtPercentage: manifestMetrics.rtPercentage, // Keep existing calculation for now
          outboundPercentage: manifestMetrics.outboundPercentage, // Keep existing calculation for now
          drillingOnlyTons: fixedKPIs.cargoTons.drillingOnlyTons,
          validationRate: fixedKPIs.cargoTons.validationRate
        },
        
        // FIXED: Lifts metrics with proper LC validation and vessel codes
        lifts: {
          totalLifts: fixedKPIs.liftsPerHour.totalLifts,
          liftsPerHour: fixedKPIs.liftsPerHour.liftsPerHour,
          cargoOperationHours: fixedKPIs.liftsPerHour.cargoOperationHours,
          lcValidationRate: fixedKPIs.liftsPerHour.lcValidationRate,
          vesselVisits: drillingVoyages // Use actual drilling voyages count from voyage list
        },
        
        // FIXED: Hours metrics using vessel codes classification
        hours: {
          totalOSVHours: fixedKPIs.productiveHours.totalOSVHours,
          totalProductiveHours: fixedKPIs.productiveHours.productiveHours,
          productiveHoursPercentage: fixedKPIs.productiveHours.productivePercentage,
          vesselCodesCoverage: fixedKPIs.productiveHours.vesselCodesCoverage,
          averageTripDuration: 0 // Will be calculated from voyage duration if needed
        },
        
        // Cost metrics from LC-based cost allocation calculation
        costs: {
          totalVesselCost: Number(rigLocationCostAnalysis?.summary?.totalCost || 0),
          costPerHour: fixedKPIs.productiveHours.totalOSVHours > 0 ? Number(rigLocationCostAnalysis?.summary?.totalCost || 0) / fixedKPIs.productiveHours.totalOSVHours : 0
        },
        
        // FIXED: Utilization metrics using enhanced calculations with cost allocation validation
        utilization: {
          vesselUtilization: fixedKPIs.utilization.vesselUtilization,
          transitTimeHours: fixedKPIs.utilization.transitTimeHours,
          atLocationHours: fixedKPIs.utilization.atLocationHours,
          totalOffshoreTime: fixedKPIs.utilization.totalOffshoreTime,
          utilizationConfidence: fixedKPIs.utilization.utilizationConfidence
        },
        
        // ENHANCED: Waiting time metrics using vessel codes classification
        waitingTime: {
          waitingTimeOffshore: fixedKPIs.waitingTime.waitingTimeOffshore,
          waitingPercentage: fixedKPIs.waitingTime.waitingPercentage,
          weatherExcludedHours: fixedKPIs.waitingTime.weatherExcludedHours,
          installationWaitingHours: fixedKPIs.waitingTime.installationWaitingHours
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
        rigLocationCostAnalysis,
        
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
          totalActual: Number(rigLocationCostAnalysis?.summary?.totalCost || 0),
          variance: Number(rigLocationCostAnalysis?.summary?.totalCost || 0)
        },
        budgetVariancePercentage: 0, // Will be calculated separately if needed
        dateFilteredDrillingCosts: []
      };

      console.log('✅ ENHANCED DRILLING METRICS CALCULATED:', {
        lifts: `${metrics.lifts.totalLifts.toLocaleString()} lifts @ ${metrics.lifts.liftsPerHour.toFixed(2)} lifts/hr`,
        productiveHours: `${metrics.hours.totalProductiveHours.toLocaleString()} hrs (${metrics.hours.productiveHoursPercentage.toFixed(1)}%)`,
        vesselUtilization: `${metrics.utilization.vesselUtilization.toFixed(1)}% (${metrics.utilization.utilizationConfidence} confidence)`,
        dataQuality: `LC: ${fixedKPIs.dataQuality.lcCoverage.toFixed(1)}%, VesselCodes: ${fixedKPIs.dataQuality.vesselCodesCoverage.toFixed(1)}%`,
        totalCost: `$${metrics.costs.totalVesselCost.toLocaleString()}`,
        integrityScore: `${Math.round(metrics.integrityScore)}%`
      });
      
      // COST DISCREPANCY ANALYSIS - COMPARE BOTH CALCULATIONS
      const logisticsCostFromKPI = metrics.costs.totalVesselCost;
      const rigLocationCostFromAnalysis = (metrics as any).rigLocationCostAnalysis?.summary?.totalCost || 0;
      const costDiscrepancy = logisticsCostFromKPI - rigLocationCostFromAnalysis;
      
      console.log('🔍 COST DISCREPANCY ANALYSIS:', {
        logisticsCostKPI: logisticsCostFromKPI,
        rigLocationCostAnalysis: rigLocationCostFromAnalysis,
        discrepancy: costDiscrepancy,
        discrepancyPercentage: rigLocationCostFromAnalysis > 0 ? 
          ((costDiscrepancy / rigLocationCostFromAnalysis) * 100).toFixed(1) + '%' : 'N/A',
        costSourceComparison: {
          kpiSource: 'VoyageEvent data + calculateVesselCostMetrics()',
          rigAnalysisSource: 'CostAllocation data + calculateRigLocationCosts()',
          kpiFiltering: 'Event-based filtering (LC numbers + location matching)',
          rigAnalysisFiltering: 'Rig location mapping + drilling facility recognition'
        }
      });
      
      // FORCE LOG ALL UTILIZATION VALUES BEING RETURNED TO IDENTIFY 5713.6% SOURCE
      console.error('🚨 FINAL DRILLING METRICS UTILIZATION VALUES:', {
        vesselUtilization: metrics.utilization.vesselUtilization,
        rawVoyageMetricsUtilization: voyageMetrics.vesselUtilization,
        utilizationSource: 'metrics.utilization.vesselUtilization',
        allUtilizationValues: {
          metricsUtilization: metrics.utilization,
          voyageMetricsUtilization: voyageMetrics.vesselUtilization
        },
        timestamp: new Date().toISOString()
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
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions, filters, isDataReady]);

  // Calculate variance analysis data
  const varianceAnalysis = useMemo(() => {
    if (!isDataReady || !voyageEvents.length || !vesselManifests.length || !costAllocation.length) {
      return {
        operationalVariance: {
          liftsPerHourVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          costPerHourVariance: {
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
        vesselUtilization: {
          utilizationVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          productiveHoursVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          vesselUtilizationData: []
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
      // Calculate drilling operational variance (lifts/hr, cost/ton, visits/week)
      const operationalVariance = calculateDrillingOperationalVariance(
        voyageEvents,
        vesselManifests,
        costAllocation,
        filterMonth,
        filterYear,
        filters.selectedLocation !== 'All Locations' ? filters.selectedLocation : undefined
      );

      // Calculate vessel utilization variance
      const vesselUtilization = calculateVesselUtilizationVariance(
        voyageEvents,
        costAllocation,
        filterMonth,
        filterYear,
        filters.selectedLocation !== 'All Locations' ? filters.selectedLocation : undefined
      );

      console.log('📊 Drilling KPI Variance Analysis Complete:', {
        operationalDataPoints: operationalVariance.vesselOperationalData.length,
        vesselUtilizationDataPoints: vesselUtilization.vesselUtilizationData.length,
        liftsPerHourCV: operationalVariance.liftsPerHourVariance.coefficientOfVariation.toFixed(1) + '%',

        visitsPerWeekCV: operationalVariance.visitsPerWeekVariance.coefficientOfVariation.toFixed(1) + '%',
        utilizationCV: vesselUtilization.utilizationVariance.coefficientOfVariation.toFixed(1) + '%',
        outliers: {
          liftsPerHour: operationalVariance.liftsPerHourVariance.outliers.length,

          visitsPerWeek: operationalVariance.visitsPerWeekVariance.outliers.length,
          vesselUtilization: vesselUtilization.utilizationVariance.outliers.length
        }
      });

      return {
        operationalVariance,
        vesselUtilization
      };
    } catch (error) {
      console.error('❌ Error calculating drilling variance analysis:', error);
      return {
        operationalVariance: {
          liftsPerHourVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          costPerHourVariance: {
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
        vesselUtilization: {
          utilizationVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          productiveHoursVariance: {
            mean: 0, variance: 0, standardDeviation: 0, coefficientOfVariation: 0,
            median: 0, quartile1: 0, quartile3: 0, interQuartileRange: 0,
            outliers: [], min: 0, max: 0, count: 0
          },
          vesselUtilizationData: []
        }
      };
    }
  }, [voyageEvents, vesselManifests, costAllocation, filters, isDataReady]);

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
  }, [filters.selectedMonth, filters.selectedLocation]);


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
            drillingMetrics.lifts.liftsPerHour < 2.5 ? 'good' : 'excellent'
          }
          heroMetrics={[
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
                  // All Months: calculate actual weeks from data span
                  const availableMonths = filterOptions.months.length - 2; // Exclude 'All Months' and 'YTD'
                  weeks = Math.max(availableMonths * 4, 4); // Use actual months * 4 weeks, minimum 4 weeks
                  
                  console.log('🔍 WEEKS CALCULATION DEBUG:', {
                    totalFilterOptions: filterOptions.months.length,
                    availableMonths,
                    calculatedWeeks: weeks,
                    filterOptionsMonths: filterOptions.months
                  });
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
                  
                  // Extract unique DRILLING locations that had cost allocation in the period (exclude production)
                  const drillingLocationNames = getAllDrillingCapableLocations()
                    .filter(loc => loc.facilityType === 'Drilling') // Only drilling rigs, not production
                    .map(loc => loc.locationName.toLowerCase());
                  
                  filteredCostAllocation.forEach(allocation => {
                    if (allocation.locationReference && allocation.locationReference.trim() !== '') {
                      const locationRef = allocation.locationReference.trim().toLowerCase();
                      
                      // Check if this location matches a drilling rig (not production)
                      const isDrillingLocation = drillingLocationNames.some(drillingLoc => 
                        locationRef.includes(drillingLoc) || 
                        drillingLoc.includes(locationRef)
                      ) ||
                      // Handle specific drilling locations by name pattern (exclude C-Constructor and Island Intervention)
                      (locationRef.includes('drilling') && !locationRef.includes('prod')) ||
                      locationRef.includes('stena icemax') ||
                      locationRef.includes('steana icemax') ||
                      locationRef.includes('ocean black') ||
                      locationRef.includes('deepwater') ||
                      locationRef.includes('island venture') ||
                      locationRef.includes('auriga');
                      
                      // Explicitly exclude C-Constructor and Island Intervention
                      const isExcluded = locationRef.includes('c-constructor') || 
                                        locationRef.includes('island intervention');
                      
                      if (isDrillingLocation && !isExcluded) {
                        activeDrillingLocations.add(allocation.locationReference.trim());
                      }
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
              target: 3,
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
              target: 3,
              trend: previousPeriodMetrics.lifts.liftsPerHour > 0 ? 
                ((drillingMetrics.lifts.liftsPerHour - previousPeriodMetrics.lifts.liftsPerHour) / previousPeriodMetrics.lifts.liftsPerHour) * 100 : 0,
              isPositive: drillingMetrics.lifts.liftsPerHour >= previousPeriodMetrics.lifts.liftsPerHour,
              contextualHelp: filters.selectedLocation === 'All Locations' ?
                `ENHANCED: Average operational efficiency across all GoA drilling locations. Uses vessel codes classification for precise cargo operation identification and cost allocation LC validation for drilling-only filtering. LC validation rate: ${(drillingMetrics.lifts as any).lcValidationRate?.toFixed(1) || 'N/A'}%. Cargo ops hours: ${(drillingMetrics.lifts as any).cargoOperationHours?.toFixed(1) || 'N/A'} hrs.` :
                `ENHANCED: Operational efficiency specific to ${filters.selectedLocation}. Uses vessel codes to identify cargo operations and cost allocation for location validation. LC validation: ${(drillingMetrics.lifts as any).lcValidationRate?.toFixed(1) || 'N/A'}%. Excludes weather, waiting, and non-operational time per vessel codes classification.`
            },
            {
              title: "Logistics Vessel Cost",
              value: formatSmartCurrency(drillingMetrics.costs.totalVesselCost),
              unit: "",
              trend: (previousPeriodMetrics.costs?.totalVesselCost || 0) > 0 ? 
                ((drillingMetrics.costs.totalVesselCost - (previousPeriodMetrics.costs?.totalVesselCost || 0)) / (previousPeriodMetrics.costs?.totalVesselCost || 1)) * 100 : 0,
              isPositive: drillingMetrics.costs.totalVesselCost <= (previousPeriodMetrics.costs?.totalVesselCost || 0), // Lower cost is positive
              contextualHelp: filters.selectedLocation === 'All Locations' ?
                "Total vessel charter cost for all GoA drilling operations. Calculated from cost allocation data including vessel day rates and operational time. Does not include fuel costs. Represents comprehensive drilling vessel support cost across all locations." :
                `Vessel charter cost specific to ${filters.selectedLocation}. Includes vessel day rates and operational time allocated to this drilling location. Does not include fuel costs. Based on cost allocation percentages and actual vessel utilization.`
            },
            {
              title: "Fluid Volume",
              value: Math.round(drillingMetrics.bulk.totalBulkVolume).toLocaleString(),
              unit: "bbls",
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <KPICard 
            title="Fluid Movement" 
            value={Math.round(drillingMetrics.bulk.totalBulkVolume).toLocaleString()}
            variant="compact"
            unit="bbls"
            trend={previousPeriodMetrics.bulk.totalBulkVolume > 0 ? 
              ((drillingMetrics.bulk.totalBulkVolume - previousPeriodMetrics.bulk.totalBulkVolume) / previousPeriodMetrics.bulk.totalBulkVolume) * 100 : 0}
            isPositive={drillingMetrics.bulk.totalBulkVolume >= previousPeriodMetrics.bulk.totalBulkVolume}
            color="blue"
            contextualHelp="Total drilling and completion fluid volume offloaded to rigs. Calculated from bulk actions with anti-double-counting (load/offload pair deduplication). Includes drilling muds, completion fluids, and specialized chemicals. Filtered for rig destinations only."
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
            title="Vessel Utilization" 
            value={Math.round((drillingMetrics.utilization as any).vesselUtilization || 0).toString()}
            variant="compact"
            unit="%"
            trend={(previousPeriodMetrics.utilization as any).vesselUtilization > 0 ? 
              (((drillingMetrics.utilization as any).vesselUtilization - (previousPeriodMetrics.utilization as any).vesselUtilization) / (previousPeriodMetrics.utilization as any).vesselUtilization) * 100 : 0}
            isPositive={(drillingMetrics.utilization as any).vesselUtilization >= (previousPeriodMetrics.utilization as any).vesselUtilization}
            color="purple"
            contextualHelp={`ENHANCED: Vessel utilization calculated using cost allocation validation and vessel codes classification. Confidence: ${(drillingMetrics.utilization as any).utilizationConfidence || 'Medium'}. Transit time: ${(drillingMetrics.utilization as any).transitTimeHours?.toFixed(1) || 'N/A'} hrs. Total offshore time: ${(drillingMetrics.utilization as any).totalOffshoreTime?.toFixed(1) || 'N/A'} hrs. Uses enhanced calculation to prevent unrealistic values.`}
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

          {/* Vessel Fleet Performance */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Vessel Fleet Performance</h3>
                    <p className="text-sm text-blue-100 mt-0.5">
                      {filters.selectedMonth} • {filters.selectedLocation === 'All Locations' ? 'All Locations' : filters.selectedLocation} • {/* Dynamic vessel count will be shown */}
                    </p>
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
                
                // Filter voyage events and manifests based on current filters - drilling facilities only
                const filteredVoyageEvents = voyageEvents.filter(event => {
                  // Location filtering
                  if (filters.selectedLocation !== 'All Locations') {
                    // Specific drilling facility selected
                    const selectedFacility = getAllDrillingCapableLocations().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const eventLocation = event.location?.toLowerCase().trim() || '';
                      const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim(); // Remove parentheses
                      
                      // Enhanced location matching
                      const matchesLocation = 
                        eventLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        eventLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName) ||
                        eventLocation.includes(facilityNameCore) ||
                        mappedLocation.includes(facilityNameCore) ||
                        facilityLocationName.includes(eventLocation) ||
                        facilityNameCore.includes(eventLocation) ||
                        // Special handling for common name variations
                        (facilityNameCore.includes('thunder horse') && (
                          eventLocation.includes('thunder horse') || 
                          eventLocation.includes('thunderhorse') ||
                          eventLocation.includes('thr')
                        )) ||
                        (facilityNameCore.includes('mad dog') && (
                          eventLocation.includes('mad dog') || 
                          eventLocation.includes('maddog') ||
                          eventLocation.includes('mad_dog')
                        ));
                      
                      if (!matchesLocation) return false;
                    }
                  } else {
                    // "All Locations" selected - filter to only drilling facilities
                    const drillingFacilities = getAllDrillingCapableLocations();
                    const eventLocation = event.location?.toLowerCase().trim() || '';
                    const mappedLocation = event.mappedLocation?.toLowerCase().trim() || '';
                    
                    // Check if event location matches any drilling facility
                    const matchesDrillingFacility = drillingFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/, '').trim();
                      const coreEventLocation = eventLocation.replace(/\s*\([^)]*\)/, '').trim();
                      const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/, '').trim();
                      
                      return eventLocation.includes(facilityLocationName) ||
                             mappedLocation.includes(facilityLocationName) ||
                             eventLocation.includes(facilityNameCore) ||
                             mappedLocation.includes(facilityNameCore) ||
                             eventLocation.includes(coreLocationName) ||
                             mappedLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreEventLocation) ||
                             facilityNameCore.includes(coreEventLocation) ||
                             coreLocationName.includes(coreEventLocation) ||
                             facilityLocationName.includes(coreMappedLocation) ||
                             facilityNameCore.includes(coreMappedLocation) ||
                             coreLocationName.includes(coreMappedLocation) ||
                             // Special handling for common name variations
                             (facilityNameCore.includes('thunder horse') && (
                               eventLocation.includes('thunder horse') || 
                               eventLocation.includes('thunderhorse') ||
                               eventLocation.includes('thr') ||
                               mappedLocation.includes('thunder horse') ||
                               mappedLocation.includes('thunderhorse') ||
                               mappedLocation.includes('thr')
                             )) ||
                             (facilityNameCore.includes('mad dog') && (
                               eventLocation.includes('mad dog') || 
                               eventLocation.includes('maddog') ||
                               eventLocation.includes('mad_dog') ||
                               mappedLocation.includes('mad dog') ||
                               mappedLocation.includes('maddog') ||
                               mappedLocation.includes('mad_dog')
                             ));
                    });
                    
                    if (!matchesDrillingFacility) return false;
                  }
                  
                  // Time filtering
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
                  // Location filtering - drilling facilities only
                  if (filters.selectedLocation !== 'All Locations') {
                    // Specific drilling facility selected
                    const selectedFacility = getAllDrillingCapableLocations().find(
                      f => f.displayName === filters.selectedLocation
                    );
                    if (selectedFacility) {
                      const offshoreLocation = manifest.offshoreLocation?.toLowerCase().trim() || '';
                      const mappedLocation = manifest.mappedLocation?.toLowerCase().trim() || '';
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim(); // Remove parentheses
                      
                      // Enhanced location matching
                      const matchesLocation = 
                        offshoreLocation.includes(facilityLocationName) ||
                        mappedLocation.includes(facilityLocationName) ||
                        offshoreLocation.includes(facilityDisplayName) ||
                        mappedLocation.includes(facilityDisplayName) ||
                        offshoreLocation.includes(facilityNameCore) ||
                        mappedLocation.includes(facilityNameCore) ||
                        facilityLocationName.includes(offshoreLocation) ||
                        facilityNameCore.includes(offshoreLocation) ||
                        // Special handling for common name variations
                        (facilityNameCore.includes('thunder horse') && (
                          offshoreLocation.includes('thunder horse') || 
                          offshoreLocation.includes('thunderhorse') ||
                          offshoreLocation.includes('thr')
                        )) ||
                        (facilityNameCore.includes('mad dog') && (
                          offshoreLocation.includes('mad dog') || 
                          offshoreLocation.includes('maddog') ||
                          offshoreLocation.includes('mad_dog')
                        ));
                      
                      if (!matchesLocation) return false;
                    }
                  } else {
                    // "All Locations" selected - filter to only drilling facilities
                    const drillingFacilities = getAllDrillingCapableLocations();
                    const offshoreLocation = manifest.offshoreLocation?.toLowerCase().trim() || '';
                    const mappedLocation = manifest.mappedLocation?.toLowerCase().trim() || '';
                    
                    // Check if manifest location matches any drilling facility
                    const matchesDrillingFacility = drillingFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/, '').trim();
                      const coreOffshoreLocation = offshoreLocation.replace(/\s*\([^)]*\)/, '').trim();
                      const coreMappedLocation = mappedLocation.replace(/\s*\([^)]*\)/, '').trim();
                      
                      return offshoreLocation.includes(facilityLocationName) ||
                             mappedLocation.includes(facilityLocationName) ||
                             offshoreLocation.includes(facilityNameCore) ||
                             mappedLocation.includes(facilityNameCore) ||
                             offshoreLocation.includes(coreLocationName) ||
                             mappedLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreOffshoreLocation) ||
                             facilityNameCore.includes(coreOffshoreLocation) ||
                             coreLocationName.includes(coreOffshoreLocation) ||
                             facilityLocationName.includes(coreMappedLocation) ||
                             facilityNameCore.includes(coreMappedLocation) ||
                             coreLocationName.includes(coreMappedLocation) ||
                             // Special handling for common name variations
                             (facilityNameCore.includes('thunder horse') && (
                               offshoreLocation.includes('thunder horse') || 
                               offshoreLocation.includes('thunderhorse') ||
                               offshoreLocation.includes('thr') ||
                               mappedLocation.includes('thunder horse') ||
                               mappedLocation.includes('thunderhorse') ||
                               mappedLocation.includes('thr')
                             )) ||
                             (facilityNameCore.includes('mad dog') && (
                               offshoreLocation.includes('mad dog') || 
                               offshoreLocation.includes('maddog') ||
                               offshoreLocation.includes('mad_dog') ||
                               mappedLocation.includes('mad dog') ||
                               mappedLocation.includes('maddog') ||
                               mappedLocation.includes('mad_dog')
                             ));
                    });
                    
                    if (!matchesDrillingFacility) return false;
                  }
                  
                  // Time filtering
                  if (isYTD && filterYear !== undefined) {
                    const manifestDate = new Date(manifest.manifestDate);
                    if (manifestDate.getFullYear() !== filterYear) return false;
                  } else if (filterMonth !== undefined && filterYear !== undefined) {
                    const manifestDate = new Date(manifest.manifestDate);
                    if (manifestDate.getMonth() !== filterMonth || manifestDate.getFullYear() !== filterYear) return false;
                  }
                  
                  return true;
                });

                // Note: uniqueVesselsFromData removed as we now use vesselMetrics directly

                // Helper function to classify vessel type and company from vessel name
                const classifyVessel = (vesselName: string) => {
                  const name = vesselName.toLowerCase().trim();
                  
                  // Determine vessel type
                  let type = 'OSV'; // Default to OSV
                  if (name.includes('fast')) {
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

                // Helper function to get color scheme based on company and index
                const getVesselColor = (company: string, index: number) => {
                  const colorSchemes = {
                    'Edison Chouest': [
                      { border: 'border-blue-200', bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-700', progress: 'bg-blue-500' },
                      { border: 'border-purple-200', bg: 'bg-purple-50', dot: 'bg-purple-500', text: 'text-purple-700', progress: 'bg-purple-500' },
                      { border: 'border-indigo-200', bg: 'bg-indigo-50', dot: 'bg-indigo-500', text: 'text-indigo-700', progress: 'bg-indigo-500' }
                    ],
                    'Harvey Gulf': [
                      { border: 'border-green-200', bg: 'bg-green-50', dot: 'bg-green-500', text: 'text-green-700', progress: 'bg-green-500' }
                    ],
                    'Hornbeck Offshore': [
                      { border: 'border-teal-200', bg: 'bg-teal-50', dot: 'bg-teal-500', text: 'text-teal-700', progress: 'bg-teal-500' }
                    ],
                    'Otto Candies': [
                      { border: 'border-yellow-200', bg: 'bg-yellow-50', dot: 'bg-yellow-500', text: 'text-yellow-700', progress: 'bg-yellow-500' }
                    ],
                    'Jackson Offshore': [
                      { border: 'border-red-200', bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-700', progress: 'bg-red-500' }
                    ],
                    'Unknown': [
                      { border: 'border-gray-200', bg: 'bg-gray-50', dot: 'bg-gray-500', text: 'text-gray-700', progress: 'bg-gray-500' }
                    ]
                  };
                  
                  const companyColors = colorSchemes[company as keyof typeof colorSchemes] || colorSchemes['Unknown'];
                  return companyColors[index % companyColors.length];
                };

                // Get unique vessels from filtered data and calculate their metrics
                // Focus on actual VOYAGES rather than individual events/manifests
                const uniqueVesselActivity = new Map();
                
                // First, identify unique voyages from voyage list data (most accurate for visit counting)
                let filteredVoyageList = voyageList || [];
                
                // Apply location filtering to voyage list - filter to drilling facilities only
                if (filters.selectedLocation !== 'All Locations') {
                  // Specific drilling facility selected
                  const selectedFacility = getAllDrillingCapableLocations().find(
                    f => f.displayName === filters.selectedLocation
                  );
                  if (selectedFacility) {
                    filteredVoyageList = filteredVoyageList.filter(voyage => {
                      if (!voyage.locations) return false;
                      
                      const voyageLocation = voyage.locations.toLowerCase().trim();
                      const facilityLocationName = selectedFacility.locationName.toLowerCase();
                      const facilityDisplayName = selectedFacility.displayName.toLowerCase();
                      const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim();
                      
                      return voyageLocation.includes(facilityLocationName) ||
                             voyageLocation.includes(facilityNameCore) ||
                             facilityLocationName.includes(voyageLocation) ||
                             facilityNameCore.includes(voyageLocation) ||
                             // Special handling for common name variations
                             (facilityNameCore.includes('thunder horse') && (
                               voyageLocation.includes('thunder horse') || 
                               voyageLocation.includes('thunderhorse') ||
                               voyageLocation.includes('thr')
                             )) ||
                             (facilityNameCore.includes('mad dog') && (
                               voyageLocation.includes('mad dog') || 
                               voyageLocation.includes('maddog') ||
                               voyageLocation.includes('mad_dog')
                             ));
                    });
                  }
                } else {
                  // "All Locations" selected - filter to only drilling facilities
                  const drillingFacilities = getAllDrillingCapableLocations();
                  
                  filteredVoyageList = filteredVoyageList.filter(voyage => {
                    if (!voyage.locations) return false;
                    
                    const voyageLocation = voyage.locations.toLowerCase().trim();
                    
                    // Check if voyage location matches any drilling facility
                    return drillingFacilities.some(facility => {
                      const facilityLocationName = facility.locationName.toLowerCase();
                      const facilityDisplayName = facility.displayName.toLowerCase();
                      const facilityNameCore = facilityDisplayName.replace(/\s*\([^)]*\)/, '').trim();
                      
                      // Enhanced location matching with core name extraction
                      const coreLocationName = facilityLocationName.replace(/\s*\([^)]*\)/, '').trim();
                      const coreVoyageLocation = voyageLocation.replace(/\s*\([^)]*\)/, '').trim();
                      
                      return voyageLocation.includes(facilityLocationName) ||
                             voyageLocation.includes(facilityNameCore) ||
                             voyageLocation.includes(coreLocationName) ||
                             facilityLocationName.includes(coreVoyageLocation) ||
                             facilityNameCore.includes(coreVoyageLocation) ||
                             coreLocationName.includes(coreVoyageLocation) ||
                             // Special handling for common name variations
                             (facilityNameCore.includes('thunder horse') && (
                               voyageLocation.includes('thunder horse') || 
                               voyageLocation.includes('thunderhorse') ||
                               voyageLocation.includes('thr')
                             )) ||
                             (facilityNameCore.includes('mad dog') && (
                               voyageLocation.includes('mad dog') || 
                               voyageLocation.includes('maddog') ||
                               voyageLocation.includes('mad_dog')
                             ));
                    });
                  });
                }
                
                // Apply time filtering to voyage list
                if (isYTD && filterYear !== undefined) {
                  filteredVoyageList = filteredVoyageList.filter(voyage => {
                    const voyageDate = voyage.voyageDate || voyage.startDate;
                    if (!voyageDate) return false;
                    const vDate = new Date(voyageDate);
                    return vDate.getFullYear() === filterYear;
                  });
                } else if (filterMonth !== undefined && filterYear !== undefined) {
                  filteredVoyageList = filteredVoyageList.filter(voyage => {
                    const voyageDate = voyage.voyageDate || voyage.startDate;
                    if (!voyageDate) return false;
                    const vDate = new Date(voyageDate);
                    return vDate.getMonth() === filterMonth && vDate.getFullYear() === filterYear;
                  });
                }
                
                // Count actual voyages per vessel (this is the correct visit count)
                filteredVoyageList.forEach(voyage => {
                  if (!voyage.vessel) return;
                  const vesselName = voyage.vessel.trim();
                  
                  if (!uniqueVesselActivity.has(vesselName)) {
                    const classification = classifyVessel(vesselName);
                    uniqueVesselActivity.set(vesselName, {
                      name: vesselName,
                      ...classification,
                      category: `${classification.type} - ${classification.company}`,
                      voyages: 0, // Actual voyage count
                      events: 0,
                      hours: 0,
                      manifests: 0,
                      cargo: 0,
                      lifts: 0
                    });
                  }
                  
                  const vessel = uniqueVesselActivity.get(vesselName);
                  vessel.voyages++; // Count actual voyages
                });
                
                // Supplement with voyage events for hours calculation
                filteredVoyageEvents.forEach(event => {
                  if (!event.vessel) return;
                  const vesselName = event.vessel.trim();
                  
                  if (!uniqueVesselActivity.has(vesselName)) {
                    const classification = classifyVessel(vesselName);
                    uniqueVesselActivity.set(vesselName, {
                      name: vesselName,
                      ...classification,
                      category: `${classification.type} - ${classification.company}`,
                      voyages: 0,
                      events: 0,
                      hours: 0,
                      manifests: 0,
                      cargo: 0,
                      lifts: 0
                    });
                  }
                  
                  const vessel = uniqueVesselActivity.get(vesselName);
                  vessel.events++;
                  vessel.hours += event.hours || 0;
                });
                
                // Supplement with manifests for cargo/lifts calculation
                filteredManifests.forEach((manifest: any) => {
                  if (!manifest.transporter) return;
                  const vesselName = manifest.transporter.trim();
                  
                  if (!uniqueVesselActivity.has(vesselName)) {
                    const classification = classifyVessel(vesselName);
                    uniqueVesselActivity.set(vesselName, {
                      name: vesselName,
                      ...classification,
                      category: `${classification.type} - ${classification.company}`,
                      voyages: 0,
                      events: 0,
                      hours: 0,
                      manifests: 0,
                      cargo: 0,
                      lifts: 0
                    });
                  }
                  
                  const vessel = uniqueVesselActivity.get(vesselName);
                  vessel.manifests++;
                  vessel.cargo += (manifest.deckTons || 0) + (manifest.rtTons || 0);
                  vessel.lifts += manifest.lifts || 0;
                });

                // Convert to array and add color schemes and activity levels
                const vesselMetrics = Array.from(uniqueVesselActivity.values()).map((vessel: any, index) => {
                  // Use actual voyage count as the primary metric (this is the real visit count)
                  const totalVisits = vessel.voyages || 0; // Actual voyages to the location
                  const totalActivity = vessel.events + vessel.manifests; // Supporting activity data
                  const activityLevel = Math.min(100, Math.max(0, (totalVisits / 10) * 100)); // Scale based on 10 visits = 100%
                  
                  return {
                    ...vessel,
                    color: getVesselColor(vessel.company, index),
                    hours: Math.round(vessel.hours),
                    cargo: Math.round(vessel.cargo),
                    activityLevel: Math.round(activityLevel * 10) / 10,
                    totalActivity,
                    totalVisits, // This is the actual visit count we want to display
                    // Calculate averages per visit (voyage)
                    avgHoursPerVisit: totalVisits > 0 ? Math.round(vessel.hours / totalVisits) : 0,
                    avgCargoPerVisit: totalVisits > 0 ? Math.round(vessel.cargo / totalVisits) : 0,
                    avgLiftsPerVisit: totalVisits > 0 ? Math.round(vessel.lifts / totalVisits) : 0
                  };
                }).sort((a, b) => b.totalVisits - a.totalVisits); // Sort by actual visit count

                // Debug: Log filtering results
                console.log('🚢 VESSEL FLEET FILTERING DEBUG:', {
                  selectedLocation: filters.selectedLocation,
                  selectedMonth: filters.selectedMonth,
                  timeFilter: { filterMonth, filterYear, isYTD },
                  originalVoyageList: voyageList?.length || 0,
                  filteredVoyageList: filteredVoyageList.length,
                  originalVoyageEvents: voyageEvents.length,
                  filteredVoyageEvents: filteredVoyageEvents.length,
                  originalManifests: vesselManifests.length,
                  filteredManifests: filteredManifests.length,
                  uniqueVesselsFound: vesselMetrics.length,
                  vesselVisitCounts: vesselMetrics.map(v => ({ name: v.name, visits: v.totalVisits, events: v.events, manifests: v.manifests })),
                  totalVisitsAllVessels: vesselMetrics.reduce((sum, v) => sum + v.totalVisits, 0),
                  sampleFilteredVoyages: filteredVoyageList.slice(0, 3).map(v => ({
                    vessel: v.vessel,
                    locations: v.locations,
                    voyageDate: v.voyageDate,
                    voyagePurpose: v.voyagePurpose
                  }))
                });

                // Note: Removed groupedVessels and categoryOrder as we now use direct vessel list

                // Determine if we should show the summary view (when there are many vessels)
                const shouldShowSummary = vesselMetrics.length > 15 || filters.selectedMonth === 'All Months' || filters.selectedMonth === 'YTD';

                if (shouldShowSummary) {
                  // Calculate company-level statistics from actual data
                  const companyStats = new Map();
                  
                  // Process voyage events
                  filteredVoyageEvents.forEach(event => {
                    if (!event.vessel) return;
                    
                    // Get company from vessel classification or use a simplified approach
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

                  // Get top performing vessels (use the already calculated vesselMetrics)
                  const topVessels = vesselMetrics
                    .map(v => ({ 
                      vessel: v.name, 
                      events: v.events, 
                      hours: v.hours, 
                      manifests: v.manifests, 
                      cargo: v.cargo, 
                      lifts: v.lifts,
                      totalActivity: v.totalActivity 
                    }))
                    .slice(0, 10);

                  return (
                    <div className="space-y-6">
                      {/* Summary Stats */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="text-lg font-semibold text-blue-900 mb-2">Fleet Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{vesselMetrics.length}</div>
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

                      {/* Company Performance */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Company Performance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {companyStatsArray.map((company, index) => {
                            const colors = [
                              { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
                              { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
                              { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
                              { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
                              { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' }
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

                      {/* Top Performing Vessels */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Vessels</h4>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manifests</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo (t)</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifts</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {topVessels.map((vessel, index) => (
                                  <tr key={vessel.vessel} className={index < 3 ? 'bg-blue-50' : ''}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {index < 3 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">#{index + 1}</span>}
                                      {vessel.vessel}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{vessel.events}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{Math.round(vessel.hours)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{vessel.manifests}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{Math.round(vessel.cargo)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{vessel.lifts}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                                // Enhanced individual vessel view with visit frequency analysis
                return (
                  <div className="space-y-8">
                    {/* Enhanced Header with Period Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-blue-900 mb-2">Vessel Activity Analysis</h4>
                          <p className="text-sm text-blue-700 mb-1">
                            {vesselMetrics.length} vessels with activity
                            {filters.selectedLocation !== 'All Locations' && ` at ${filters.selectedLocation}`}
                            {filters.selectedMonth !== 'All Months' && ` during ${filters.selectedMonth}`}
                          </p>
                          <p className="text-xs text-blue-600">
                            Filtered from {voyageEvents.length + vesselManifests.length} total records
                            {filteredVoyageEvents.length + filteredManifests.length < voyageEvents.length + vesselManifests.length && 
                              ` → ${filteredVoyageEvents.length + filteredManifests.length} matching records`}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-700">
                            {vesselMetrics.reduce((sum, v) => sum + v.totalVisits, 0)}
                          </div>
                          <div className="text-sm text-blue-600">Total Visits</div>
                          <div className="text-xs text-blue-500 mt-1">
                            Actual voyages to location(s)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* No vessels found message */}
                    {vesselMetrics.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                          <Ship className="w-16 h-16 mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600 mb-2">No Vessels Found</h3>
                        <p className="text-sm text-gray-500 max-w-md mx-auto">
                          No vessel activity found for the selected time period
                          {filters.selectedLocation !== 'All Locations' && ` at ${filters.selectedLocation}`}.
                          Try selecting a different time period or location.
                        </p>
                      </div>
                    )}

                    {/* Enhanced Vessel Cards with Visit Frequency */}
                    {vesselMetrics.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {vesselMetrics.map((vessel: any) => {
                          // Use the correct visit count (actual voyages)
                          const totalVisits = vessel.totalVisits; // Actual voyage count to the location
                          const averageCargoPerVisit = vessel.avgCargoPerVisit;
                          const averageHoursPerVisit = vessel.avgHoursPerVisit;
                          const averageLiftsPerVisit = vessel.avgLiftsPerVisit;
                          
                          // Determine visit frequency category (adjusted for realistic visit counts)
                          let frequencyCategory = '';
                          let frequencyColor = '';
                          if (totalVisits >= 10) {
                            frequencyCategory = 'High Frequency';
                            frequencyColor = 'text-green-600 bg-green-100';
                          } else if (totalVisits >= 5) {
                            frequencyCategory = 'Medium Frequency';
                            frequencyColor = 'text-blue-600 bg-blue-100';
                          } else if (totalVisits >= 2) {
                            frequencyCategory = 'Regular Visitor';
                            frequencyColor = 'text-orange-600 bg-orange-100';
                          } else {
                            frequencyCategory = 'Occasional';
                            frequencyColor = 'text-gray-600 bg-gray-100';
                          }

                          return (
                            <div key={vessel.name} className={`${vessel.color.border} ${vessel.color.bg} border-2 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
                              {/* Header with Vessel Info */}
                              <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 ${vessel.color.dot} rounded-full flex-shrink-0`}></div>
                                    <div>
                                      <h4 className="font-bold text-gray-900 text-base">{vessel.name}</h4>
                                      <p className="text-sm text-gray-600">{vessel.company} • {vessel.type}</p>
                                    </div>
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${frequencyColor}`}>
                                    {frequencyCategory}
                                  </div>
                                </div>
                              </div>

                              {/* Visit Frequency Section */}
                              <div className="p-4 bg-white border-b border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-semibold text-gray-800">Actual Visits</h5>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-indigo-600">{totalVisits}</div>
                                    <div className="text-xs text-gray-500">Voyages to Location</div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-center">
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <div className="text-lg font-bold text-blue-600">{vessel.events}</div>
                                    <div className="text-xs text-gray-600">Supporting Events</div>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-2">
                                    <div className="text-lg font-bold text-green-600">{vessel.manifests}</div>
                                    <div className="text-xs text-gray-600">Manifests</div>
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-xs text-gray-500 text-center">
                                  Visit count based on actual voyage records
                                </div>
                              </div>

                              {/* Performance Metrics */}
                              <div className="p-4">
                                <h5 className="text-sm font-semibold text-gray-800 mb-3">Performance Metrics</h5>
                                
                                <div className="space-y-3">
                                  {/* Total Metrics Row */}
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                      <div className="text-sm font-bold text-gray-900">{vessel.hours}h</div>
                                      <div className="text-xs text-gray-600">Total Hours</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-gray-900">{vessel.cargo}t</div>
                                      <div className="text-xs text-gray-600">Total Cargo</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-gray-900">{vessel.lifts}</div>
                                      <div className="text-xs text-gray-600">Total Lifts</div>
                                    </div>
                                  </div>

                                  {/* Average Per Visit Metrics */}
                                  <div className="border-t pt-3">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">Average Per Voyage:</p>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                      <div className="bg-blue-50 rounded p-2">
                                        <div className="text-sm font-bold text-blue-700">{averageHoursPerVisit}h</div>
                                        <div className="text-xs text-blue-600">Hours</div>
                                      </div>
                                      <div className="bg-green-50 rounded p-2">
                                        <div className="text-sm font-bold text-green-700">{averageCargoPerVisit}t</div>
                                        <div className="text-xs text-green-600">Cargo</div>
                                      </div>
                                      <div className="bg-purple-50 rounded p-2">
                                        <div className="text-sm font-bold text-purple-700">{averageLiftsPerVisit}</div>
                                        <div className="text-xs text-purple-600">Lifts</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Activity Level Progress Bar */}
                                  <div className="border-t pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-700">Visit Frequency</span>
                                      <span className="text-xs font-bold text-gray-800">{vessel.activityLevel}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div 
                                        className={`${vessel.color.progress} h-3 rounded-full transition-all duration-500 relative`}
                                        style={{ width: `${vessel.activityLevel}%` }}
                                      >
                                        <div className="absolute inset-0 bg-white bg-opacity-30 rounded-full"></div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 text-center">
                                      Based on {totalVisits} voyage{totalVisits !== 1 ? 's' : ''} to location
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Location-Specific Info (if single location selected) */}
                              {filters.selectedLocation !== 'All Locations' && (
                                <div className="px-4 pb-4">
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 border border-indigo-200">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                      <span className="text-xs font-medium text-indigo-700">Location Activity</span>
                                    </div>
                                    <p className="text-xs text-indigo-600">
                                      {totalVisits} visits to {filters.selectedLocation}
                                      {filters.selectedMonth !== 'All Months' && ` in ${filters.selectedMonth}`}
                                    </p>
                                  </div>
                                </div>
                              )}
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

                {/* Pie Chart for Parent Event Distribution */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Parent Event Time Distribution</h4>
                  <div className="flex items-center justify-center">
                    {(() => {
                      const cargoOps = parentEventHours['Cargo Ops'] || 0;
                      const waitingOnInstallation = parentEventHours['Waiting on Installation'] || 0;
                      const transit = drillingMetrics.utilization.transitTimeHours || 0;
                      const maneuvering = parentEventHours['Maneuvering'] || 0;
                      
                      const total = cargoOps + waitingOnInstallation + transit + maneuvering;
                      
                      if (total === 0) {
                        return <div className="text-gray-500 text-sm">No data available</div>;
                      }
                      
                      const data = [
                        { name: 'Cargo Ops', value: cargoOps, color: '#10b981' },
                        { name: 'Waiting on Installation', value: waitingOnInstallation, color: '#f59e0b' },
                        { name: 'Transit', value: transit, color: '#06b6d4' },
                        { name: 'Maneuvering', value: maneuvering, color: '#8b5cf6' }
                      ].filter(item => item.value > 0);
                      
                      let currentAngle = 0;
                      const radius = 80;
                      const center = 100;
                      
                      const paths = data.map((segment, index) => {
                        const angle = (segment.value / total) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        
                        const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
                        const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
                        const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
                        const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
                        
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        
                        const pathData = [
                          `M ${center} ${center}`,
                          `L ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                          'Z'
                        ].join(' ');
                        
                        currentAngle += angle;
                        
                        return (
                          <path
                            key={index}
                            d={pathData}
                            fill={segment.color}
                            stroke="white"
                            strokeWidth="2"
                            className="hover:opacity-80 transition-opacity"
                          />
                        );
                      });
                      
                      return (
                        <div className="flex items-center gap-6">
                          <svg width="200" height="200" viewBox="0 0 200 200">
                            {paths}
                          </svg>
                          <div className="space-y-2">
                            {data.map((segment, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: segment.color }}
                                ></div>
                                <span className="text-sm text-gray-700">{segment.name}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {Math.round(segment.value).toLocaleString()}h
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({((segment.value / total) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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
                    <div className="text-2xl font-bold text-gray-900">{Math.round(drillingMetrics.bulk.totalBulkVolume).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Fluid Volume</div>
                    <div className="text-xs text-green-600 mt-1">bbls</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{drillingMetrics.lifts.totalLifts.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Lifts</div>
                    <div className="text-xs text-green-600 mt-1">Enhanced tracking</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${Math.round(drillingMetrics.costs.costPerHour).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Cost per Hour</div>
                    <div className="text-xs text-green-600 mt-1">$/hr</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{drillingMetrics.lifts.vesselVisits.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Vessel Visits</div>
                    <div className="text-xs text-green-600 mt-1">Total voyages</div>
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
                <div className="text-center group cursor-pointer p-4 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:shadow-sm relative">
                  <div className="text-4xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-200">
                    ${Math.round(((drillingMetrics as any).rigLocationCostAnalysis?.summary?.totalCost || 0) / 1000000)}M
                  </div>
                  <div className="text-sm text-gray-600 mt-1 group-hover:text-blue-700 transition-colors">Total Rig Costs</div>
                  <div className="w-12 h-1 bg-blue-200 mx-auto mt-2 group-hover:bg-blue-400 transition-colors"></div>
                  
                  {/* Tooltip for Total Rig Costs */}
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                    ${((drillingMetrics as any).rigLocationCostAnalysis?.summary?.totalCost || 0).toLocaleString()}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
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
                      className={`${colorSet.bg} border ${colorSet.border} rounded-lg p-4 transition-all duration-200 ${colorSet.hover} hover:shadow-md hover:border-opacity-80 hover:scale-[1.02] cursor-pointer relative group`}
                    >
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 ${colorSet.dot} rounded-full`}></div>
                          <h4 className="text-lg font-semibold text-gray-900">{rig.rigName}</h4>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center relative">
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Total Cost</span>
                          <span className={`text-sm font-semibold ${colorSet.accent} group-hover:scale-105 transition-transform relative`}>
                            ${Math.round(rig.totalCost / 1000000)}M
                            
                            {/* Tooltip for individual rig total cost */}
                            <div className="absolute -top-10 right-0 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                              ${rig.totalCost.toLocaleString()}
                              <div className="absolute top-full right-2 border-2 border-transparent border-t-gray-900"></div>
                            </div>
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

        {/* Statistical Variance Analysis Section */}
        <div className="space-y-6">
          {/* Drilling Operational KPI Variance Analysis */}
          <DrillingOperationalVarianceDashboard
            liftsPerHourVariance={varianceAnalysis.operationalVariance.liftsPerHourVariance}

            visitsPerWeekVariance={varianceAnalysis.operationalVariance.visitsPerWeekVariance}
            vesselOperationalData={varianceAnalysis.operationalVariance.vesselOperationalData}
          />

          {/* Vessel Utilization Variance Analysis */}
          <VesselUtilizationVarianceDashboard
            utilizationVariance={varianceAnalysis.vesselUtilization.utilizationVariance}
            productiveHoursVariance={varianceAnalysis.vesselUtilization.productiveHoursVariance}
            vesselUtilizationData={varianceAnalysis.vesselUtilization.vesselUtilizationData}
          />
        </div>

      </div>
    </div>
  );
};

export default DrillingDashboard;
