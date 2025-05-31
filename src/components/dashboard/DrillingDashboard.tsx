import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getVesselTypeFromName } from '../../data/vesselClassification';
import { getAllDrillingCapableLocations, mapCostAllocationLocation } from '../../data/masterFacilities';

interface DrillingDashboardProps {
  onNavigateToUpload?: () => void;
}

const DrillingDashboard: React.FC<DrillingDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    voyageList,
    isDataReady
  } = useData();

  // Filters state - matching PowerBI layout
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations'
  });

  // Calculate drilling-specific KPIs
  const drillingMetrics = useMemo(() => {
    // Filter data based on selected filters
    const filterByDate = (date: Date) => {
      if (filters.selectedMonth === 'all' || filters.selectedMonth === 'All Months') return true;
      const itemDate = new Date(date);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    };

    const filterByLocation = (location: string) => {
      if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') return true;
      
      // Get all drilling facilities to map display names to location names
      const drillingFacilities = getAllDrillingCapableLocations();
      const selectedFacility = drillingFacilities.find(f => f.displayName === filters.selectedLocation);
      
      // Check against both display name and location name
      return location === filters.selectedLocation || 
             (selectedFacility && (
               location === selectedFacility.locationName ||
               location === selectedFacility.displayName
             ));
    };

    // Debug: Check what departments we have in the data
    const uniqueDepartments = [...new Set(voyageEvents.map(e => e.department))].filter(Boolean);
    const uniqueManifestDepartments = [...new Set(vesselManifests.map(m => m.finalDepartment))].filter(Boolean);
    
    console.log('🔍 Available Departments:', {
      voyageEventDepartments: uniqueDepartments,
      vesselManifestDepartments: uniqueManifestDepartments
    });

    // Get all production LC numbers to exclude from drilling cost allocations
    const getAllProductionLCs = () => {
      const drillingFacilities = getAllDrillingCapableLocations();
      const allProductionLCs = new Set<string>();
      
      drillingFacilities.forEach(facility => {
        if (facility.productionLCs) {
          facility.productionLCs.split(',').forEach(lc => {
            allProductionLCs.add(lc.trim());
          });
        }
      });
      
      console.log('🏭 Production LC Numbers to exclude from drilling:', Array.from(allProductionLCs));
      return allProductionLCs;
    };

    const productionLCs = getAllProductionLCs();

    // Helper function to apply cost allocation percentage for drilling locations
    const applyCostAllocationPercentage = (event: any, hours: number) => {
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations' &&
          event.costDedicatedTo && 
          (filters.selectedLocation.toLowerCase().includes('drilling') || 
           filters.selectedLocation.toLowerCase().includes('thunder horse') ||
           filters.selectedLocation.toLowerCase().includes('mad dog'))) {
        
        const costDedicatedTo = event.costDedicatedTo.toString();
        const percentageMatch = costDedicatedTo.match(/(\d+(?:\.\d+)?)%/);
        
        if (percentageMatch) {
          const percentage = parseFloat(percentageMatch[1]) / 100;
          return hours * percentage;
        }
      }
      return hours;
    };

    // Apply filters to data - Enhanced logic for drilling locations
    const filteredVoyageEvents = voyageEvents.filter(event => {
      // For drilling locations, use location + time filtering primarily
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations' &&
          (filters.selectedLocation.toLowerCase().includes('drilling') || 
           filters.selectedLocation.toLowerCase().includes('thunder horse') ||
           filters.selectedLocation.toLowerCase().includes('mad dog'))) {
        
        // For drilling locations: Include ALL events at that location during the time period
        // This captures drilling activities regardless of department classification
        return filterByDate(event.eventDate) && filterByLocation(event.location);
      }
      
      // For non-drilling locations, use the original logic
      const isDrillingRelated = event.department === 'Drilling' || 
                               event.department === 'Production' ||
                               !event.department; // Include events without department classification
      
      return isDrillingRelated &&
             filterByDate(event.eventDate) &&
             filterByLocation(event.location);
    });

    const filteredVesselManifests = vesselManifests.filter(manifest => {
      // For drilling locations, use location + time filtering primarily
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations' &&
          (filters.selectedLocation.toLowerCase().includes('drilling') || 
           filters.selectedLocation.toLowerCase().includes('thunder horse') ||
           filters.selectedLocation.toLowerCase().includes('mad dog'))) {
        
        // For drilling locations: Include ALL manifests at that location during the time period
        // This captures drilling activities regardless of department classification
        return filterByDate(manifest.manifestDate) && filterByLocation(manifest.mappedLocation);
      }
      
      // For non-drilling locations, use the original logic
      const isDrillingRelated = manifest.finalDepartment === 'Drilling' ||
                               manifest.finalDepartment === 'Production' ||
                               !manifest.finalDepartment; // Include manifests without department classification
      
      return isDrillingRelated &&
             filterByDate(manifest.manifestDate) &&
             filterByLocation(manifest.mappedLocation);
    });

    // Calculate KPIs based on filtered data using exact PowerBI DAX logic
    
    // 1. Cargo Tons - Total cargo moved (Deck Tons + RT Tons)
    const deckTons = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.deckTons || 0), 0);
    const rtTons = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.rtTons || 0), 0);
    const cargoTons = deckTons + rtTons;
    
    // 2. Lifts/Hr - Efficiency metric using actual cargo operations hours
    const totalLifts = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.lifts || 0), 0);
    
    // More precise cargo operations filtering with cost allocation
    const cargoOpsEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Cargo Ops' ||
      (event.parentEvent === 'Installation Productive Time' && 
       (event.event?.toLowerCase().includes('cargo') || 
        event.event?.toLowerCase().includes('loading') || 
        event.event?.toLowerCase().includes('offloading') ||
        event.event?.toLowerCase().includes('discharge'))) ||
      event.event?.toLowerCase().includes('simops')
    );
    const cargoOpsHours = cargoOpsEvents.reduce((sum, event) => {
      const hours = event.finalHours || 0;
      return sum + applyCostAllocationPercentage(event, hours);
    }, 0);
    const liftsPerHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
    
    // 3. OSV Productive Hours - Using activity category classification with cost allocation
    const productiveEvents = filteredVoyageEvents.filter(event => 
      event.activityCategory === 'Productive'
    );
    
    // Enhanced calculation for drilling locations - use cost allocation percentages
    const osvProductiveHours = productiveEvents.reduce((sum, event) => {
      let hours = event.finalHours || 0;
      
      // For drilling locations, check if we need to apply cost allocation percentage
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations' &&
          event.costDedicatedTo && 
          (filters.selectedLocation.toLowerCase().includes('drilling') || 
           filters.selectedLocation.toLowerCase().includes('thunder horse') ||
           filters.selectedLocation.toLowerCase().includes('mad dog'))) {
        
        // Parse cost allocation percentage if available
        // Format might be like "LC12345 - 50%" or just "50%"
        const costDedicatedTo = event.costDedicatedTo.toString();
        const percentageMatch = costDedicatedTo.match(/(\d+(?:\.\d+)?)%/);
        
        if (percentageMatch) {
          const percentage = parseFloat(percentageMatch[1]) / 100;
          hours = hours * percentage;
          console.log(`⚖️ Applied ${percentageMatch[1]}% allocation to ${event.vessel} event: ${event.finalHours}h → ${hours}h`);
        }
      }
      
      return sum + hours;
    }, 0);
    
    // 4. Waiting Time Offshore - Specific offshore waiting events with cost allocation
    const waitingEvents = filteredVoyageEvents.filter(event => 
      event.portType === 'rig' && (
        event.parentEvent === 'Waiting on Installation' ||
        event.parentEvent === 'Waiting on Weather' ||
        (event.activityCategory === 'Non-Productive' && 
         (event.event?.toLowerCase().includes('waiting') ||
          event.event?.toLowerCase().includes('standby')))
      )
    );
    
    const waitingTimeOffshore = waitingEvents.reduce((sum, event) => {
      const hours = event.finalHours || 0;
      return sum + applyCostAllocationPercentage(event, hours);
    }, 0);
    
    // 5. Fluid Movement - Wet bulk cargo (bbls + gals converted to bbls)
    const wetBulkBbls = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.wetBulkBbls || 0), 0);
    const wetBulkGals = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.wetBulkGals || 0), 0);
    const fluidMovement = wetBulkBbls + (wetBulkGals / 42); // Convert gallons to barrels
    
    // 6. Vessel Utilization - Productive hours vs total offshore time with cost allocation
    const totalOffshoreHours = filteredVoyageEvents
      .filter(event => event.portType === 'rig')
      .reduce((sum, event) => {
        const hours = event.finalHours || 0;
        return sum + applyCostAllocationPercentage(event, hours);
      }, 0);
    const vesselUtilization = totalOffshoreHours > 0 ? (osvProductiveHours / totalOffshoreHours) * 100 : 0;
    
    // 7. Voyage Efficiency - Using voyage list data for better accuracy with filtering
    const drillingVoyages = voyageList.filter(voyage => {
      const isDrilling = voyage.voyagePurpose === 'Drilling' || voyage.voyagePurpose === 'Mixed';
      
      // Apply location filter if not "All Locations"
      if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
        const locationMatch = filterByLocation(voyage.mainDestination || voyage.originPort || voyage.locations || '');
        if (!locationMatch) return false;
      }
      
      // Apply date filter if not "All Months"
      if (filters.selectedMonth !== 'all' && filters.selectedMonth !== 'All Months') {
        const dateMatch = filterByDate(voyage.startDate || voyage.voyageDate || new Date());
        if (!dateMatch) return false;
      }
      
      return isDrilling;
    });
    const fsvRuns = drillingVoyages.length;
    
    // 8. Vessel Visits - Unique manifest entries (actual visits)
    const vesselVisits = filteredVesselManifests.length;
    
    // 9. Maneuvering Hours - Setup and positioning activities with cost allocation
    const maneuveringEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Maneuvering' ||
      event.event?.toLowerCase().includes('maneuvering') ||
      event.event?.toLowerCase().includes('positioning') ||
      event.event?.toLowerCase().includes('setup') ||
      event.event?.toLowerCase().includes('shifting')
    );
    const maneuveringHours = maneuveringEvents.reduce((sum, event) => {
      const hours = event.finalHours || 0;
      return sum + applyCostAllocationPercentage(event, hours);
    }, 0);
    
    // 10. Non-Productive Time Analysis with cost allocation
    const nonProductiveEvents = filteredVoyageEvents.filter(event => 
      event.activityCategory === 'Non-Productive'
    );
    const nonProductiveHours = nonProductiveEvents.reduce((sum, event) => {
      const hours = event.finalHours || 0;
      return sum + applyCostAllocationPercentage(event, hours);
    }, 0);
    const totalHours = filteredVoyageEvents.reduce((sum, event) => {
      const hours = event.finalHours || 0;
      return sum + applyCostAllocationPercentage(event, hours);
    }, 0);
    const nptPercentage = totalHours > 0 ? (nonProductiveHours / totalHours) * 100 : 0;
    
    // 11. Weather Impact Analysis with cost allocation
    const weatherEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Waiting on Weather'
    );
    const weatherWaitingHours = weatherEvents.reduce((sum, event) => {
      const hours = event.finalHours || 0;
      return sum + applyCostAllocationPercentage(event, hours);
    }, 0);
    const weatherImpactPercentage = totalOffshoreHours > 0 ? (weatherWaitingHours / totalOffshoreHours) * 100 : 0;

    // Debug log after basic KPI calculations
    console.log('🔧 Drilling Dashboard Filtered Data:', {
      totalVoyageEvents: voyageEvents.length,
      filteredVoyageEvents: filteredVoyageEvents.length,
      totalManifests: vesselManifests.length,
      filteredManifests: filteredVesselManifests.length,
      selectedMonth: filters.selectedMonth,
      selectedLocation: filters.selectedLocation,
      cargoTons: deckTons + rtTons,
      productiveHours: osvProductiveHours,
      waitingTimeOffshore: waitingTimeOffshore,
      maneuveringHours: maneuveringHours,
      drillingVoyageCount: fsvRuns
    });

    // NEW ENHANCED COST ALLOCATION INTEGRATION
    
    // Filter cost allocation data for drilling operations - exclude production LCs
    const drillingCostAllocation = costAllocation.filter(cost => {
      // Exclude known production LC numbers
      const lcNumber = String(cost.lcNumber || '').trim();
      if (productionLCs.has(lcNumber)) {
        console.log(`🚫 Excluding production LC: ${lcNumber}`);
        return false;
      }
      
      // Include drilling and completions
      return cost.department === 'Drilling' ||
             cost.projectType === 'Drilling' ||
             cost.projectType === 'Completions';
    });
    
    console.log(`💰 Drilling Cost Allocations: ${drillingCostAllocation.length} (excluded ${costAllocation.length - drillingCostAllocation.length} production LCs)`);
    
    // Apply location filter to cost allocation
    const filteredDrillingCosts = drillingCostAllocation.filter(cost => {
      if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') return true;
      
      // Get available drilling facilities
      const drillingFacilities = getAllDrillingCapableLocations();
      const selectedFacility = drillingFacilities.find(f => f.displayName === filters.selectedLocation);
      
      // Use improved location mapping
      const mappedFacility = mapCostAllocationLocation(cost.rigLocation, cost.locationReference);
      
      // Debug logging for location mapping (only for first few records to avoid spam)
      if (drillingCostAllocation.indexOf(cost) < 3) {
        console.log(`🗺️ Cost LC ${cost.lcNumber} mapping:`, {
          rigLocation: cost.rigLocation,
          locationReference: cost.locationReference,
          mappedTo: mappedFacility?.displayName || 'UNMAPPED',
          selectedLocation: filters.selectedLocation,
          selectedFacility: selectedFacility?.displayName
        });
      }
      
      // Check if this cost allocation matches the selected location
      const isDirectMatch = cost.rigLocation === filters.selectedLocation ||
                           cost.locationReference === filters.selectedLocation;
      
      const isFacilityMatch = selectedFacility && (
        cost.rigLocation === selectedFacility.locationName ||
        cost.locationReference === selectedFacility.locationName ||
        cost.rigLocation === selectedFacility.displayName ||
        cost.locationReference === selectedFacility.displayName
      );
      
      const isMappedMatch = mappedFacility && selectedFacility && 
                           mappedFacility.locationID === selectedFacility.locationID;
      
      return isDirectMatch || isFacilityMatch || isMappedMatch;
    });
    
    // Debug summary of filtering results
    if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
      console.log(`🎯 LOCATION FILTER RESULTS for "${filters.selectedLocation}":`, {
        totalDrillingCosts: drillingCostAllocation.length,
        filteredCosts: filteredDrillingCosts.length,
        filteredLCs: filteredDrillingCosts.map(c => c.lcNumber),
        totalCostValue: filteredDrillingCosts.reduce((sum, c) => sum + (c.totalCost || c.budgetedVesselCost || 0), 0),
        totalAllocatedDays: filteredDrillingCosts.reduce((sum, c) => sum + (c.totalAllocatedDays || 0), 0)
      });
    }
    
    // Apply date filter to cost allocation
    const dateFilteredDrillingCosts = filteredDrillingCosts.filter(cost => {
      if (filters.selectedMonth === 'all' || filters.selectedMonth === 'All Months') return true;
      if (!cost.costAllocationDate) return true; // Include if no date available
      
      const costDate = new Date(cost.costAllocationDate);
      const monthLabel = `${costDate.toLocaleString('default', { month: 'long' })} ${costDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    });
    
    // 11. Total Cost (YTD) - Enhanced calculation using filtered cost allocation
    const totalCostYTD = dateFilteredDrillingCosts.reduce((sum, cost) => {
      // Priority 1: Use actual total cost if available
      if (cost.totalCost) return sum + cost.totalCost;
      
      // Priority 2: Use budgeted vessel cost if available
      if (cost.budgetedVesselCost) return sum + cost.budgetedVesselCost;
      
      // Priority 3: Calculate from allocated days and day rate
      if (cost.totalAllocatedDays && cost.vesselDailyRateUsed) {
        return sum + (cost.totalAllocatedDays * cost.vesselDailyRateUsed);
      }
      
      return sum;
    }, 0);
    
    // 12. Average Monthly Cost - Based on actual cost allocation data
    const monthsWithData = new Set(
      dateFilteredDrillingCosts
        .filter(cost => cost.month)
        .map(cost => `${cost.year}-${cost.month}`)
    ).size;
    const avgMonthlyCost = monthsWithData > 0 ? totalCostYTD / monthsWithData : 0;
    
    // 13. Vessel Visits per Week - Calculate based on filtered data
    const dateRange = (() => {
      const dates = filteredVesselManifests.map(m => new Date(m.manifestDate)).filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return { start: new Date(), end: new Date() };
      return {
        start: new Date(Math.min(...dates.map(d => d.getTime()))),
        end: new Date(Math.max(...dates.map(d => d.getTime())))
      };
    })();
    const weeksDiff = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const vesselVisitsPerWeek = vesselVisits / weeksDiff;
    
    // 14. Allocated Days - Sum from actual cost allocation data
    const allocatedDays = dateFilteredDrillingCosts.reduce((sum, cost) => {
      return sum + (cost.totalAllocatedDays || 0);
    }, 0);
    
    // 15. Cost per Hour - Weighted average cost per hour
    const totalCostHours = dateFilteredDrillingCosts.reduce((sum, cost) => {
      if (cost.totalAllocatedDays) {
        return sum + (cost.totalAllocatedDays * 24); // Convert days to hours
      }
      return sum;
    }, 0);
    const avgCostPerHour = totalCostHours > 0 ? totalCostYTD / totalCostHours : 0;
    
    // 16. Budget vs Actual Analysis
    const budgetVsActual = dateFilteredDrillingCosts.reduce((acc, cost) => {
      const budgeted = cost.budgetedVesselCost || 0;
      const actual = cost.totalCost || budgeted; // Use budgeted as fallback for actual
      
      acc.totalBudgeted += budgeted;
      acc.totalActual += actual;
      acc.variance += (actual - budgeted);
      
      return acc;
    }, { totalBudgeted: 0, totalActual: 0, variance: 0 });
    
    const budgetVariancePercentage = budgetVsActual.totalBudgeted > 0 ? 
      (budgetVsActual.variance / budgetVsActual.totalBudgeted) * 100 : 0;
    
    // 17. Rig Location Analysis - Cost and utilization by rig location with PROPER AGGREGATION
    const rigLocationAnalysis = dateFilteredDrillingCosts.reduce((acc, cost) => {
      const rigLocation = cost.rigLocation || cost.locationReference || 'Unknown';
      
      if (!acc[rigLocation]) {
        acc[rigLocation] = {
          rigLocation,
          rigType: cost.rigType || 'Unknown',
          waterDepth: cost.waterDepth || 0,
          totalCost: 0,
          allocatedDays: 0,
          budgetedCost: 0,
          projectTypes: new Set(),
          avgDailyCost: 0,
          utilizationScore: 0,
          records: [] // TRACK INDIVIDUAL RECORDS FOR DEBUGGING
        };
      }
      
      // CRITICAL FIX: Ensure we're adding numbers, not concatenating strings
      const costValue = Number(cost.totalCost || cost.budgetedVesselCost || 0);
      const daysValue = Number(cost.totalAllocatedDays || 0);
      const budgetedValue = Number(cost.budgetedVesselCost || 0);
      
      // Debug log for first few records to ensure proper aggregation
      if (Object.keys(acc).length <= 3 && acc[rigLocation].records.length === 0) {
        console.log(`🔧 AGGREGATING ${rigLocation}:`, {
          lcNumber: cost.lcNumber,
          originalCost: cost.totalCost,
          originalBudgeted: cost.budgetedVesselCost, 
          originalDays: cost.totalAllocatedDays,
          costValue,
          daysValue,
          budgetedValue,
          types: [typeof cost.totalCost, typeof cost.budgetedVesselCost, typeof cost.totalAllocatedDays]
        });
      }
      
      acc[rigLocation].totalCost += costValue;
      acc[rigLocation].allocatedDays += daysValue;
      acc[rigLocation].budgetedCost += budgetedValue;
      acc[rigLocation].records.push({
        lcNumber: cost.lcNumber,
        days: daysValue,
        cost: costValue,
        monthYear: cost.monthYear
      });
      
      if (cost.projectType) acc[rigLocation].projectTypes.add(cost.projectType);
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate derived metrics for each rig location and LOG RESULTS
    Object.values(rigLocationAnalysis).forEach((rig: any) => {
      rig.avgDailyCost = rig.allocatedDays > 0 ? rig.totalCost / rig.allocatedDays : 0;
      rig.projectTypeList = Array.from(rig.projectTypes);
      
      // Calculate utilization score based on allocated days vs typical monthly allocation
      const typicalMonthlyDays = 30; // Assume 30 days per month as baseline
      rig.utilizationScore = Math.min(100, (rig.allocatedDays / typicalMonthlyDays) * 100);
      
      // ENHANCED DEBUG: Log aggregation results
      console.log(`📊 RIG AGGREGATION RESULT for ${rig.rigLocation}:`, {
        totalRecords: rig.records.length,
        totalAllocatedDays: rig.allocatedDays,
        totalCost: rig.totalCost,
        avgDailyCost: rig.avgDailyCost,
        individualRecords: rig.records.map((r: any) => `LC ${r.lcNumber}: ${r.days} days`).join(', ')
      });
    });
    
    // 18. Rate Period Analysis - Show cost breakdown by rate period
    const ratePeriodAnalysis = dateFilteredDrillingCosts.reduce((acc, cost) => {
      const rateDescription = cost.vesselRateDescription || 'Unknown Rate Period';
      
      if (!acc[rateDescription]) {
        acc[rateDescription] = {
          rateDescription,
          dailyRate: cost.vesselDailyRateUsed || 0,
          totalCost: 0,
          allocatedDays: 0,
          lcCount: 0
        };
      }
      
      acc[rateDescription].totalCost += cost.totalCost || cost.budgetedVesselCost || 0;
      acc[rateDescription].allocatedDays += cost.totalAllocatedDays || 0;
      acc[rateDescription].lcCount += 1;
      
      return acc;
    }, {} as Record<string, any>);
    
    console.log('🔧 Enhanced Drilling Dashboard Metrics:', {
      totalCostYTD: totalCostYTD.toLocaleString(),
      allocatedDays,
      avgMonthlyCost: avgMonthlyCost.toLocaleString(),
      avgCostPerHour: avgCostPerHour.toFixed(2),
      budgetVariancePercentage: budgetVariancePercentage.toFixed(1),
      rigLocationCount: Object.keys(rigLocationAnalysis).length,
      ratePeriodCount: Object.keys(ratePeriodAnalysis).length,
      filteredCostAllocations: dateFilteredDrillingCosts.length
    });

    // Calculate trends (mock data for now - in production, compare with previous period)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    // Mock previous period data (would come from actual historical data)
    const mockPreviousPeriod = {
      cargoTons: (cargoTons || 0) * 0.85,
      liftsPerHour: (liftsPerHour || 0) * 1.1,
      osvProductiveHours: (osvProductiveHours || 0) * 0.92,
      waitingTime: (waitingTimeOffshore || 0) * 1.15,
      rtCargoTons: (rtTons || 0) * 1.08,
      fluidMovement: (fluidMovement || 0) * 0.88,
      vesselUtilization: (vesselUtilization || 0) * 0.98,
      fsvRuns: (fsvRuns || 0) * 0.91,
      vesselVisits: (vesselVisits || 0) * 0.95,
      maneuveringHours: (maneuveringHours || 0) * 1.12,
      totalCostYTD: totalCostYTD * 0.93,
      avgMonthlyCost: avgMonthlyCost * 0.96,
      vesselVisitsPerWeek: vesselVisitsPerWeek * 0.89,
      allocatedDays: allocatedDays * 1.05,
      avgCostPerHour: avgCostPerHour * 0.98
    };

    return {
      cargoTons: { 
        value: Math.round(cargoTons), 
        trend: Number(calculateTrend(cargoTons, mockPreviousPeriod.cargoTons).toFixed(1)), 
        isPositive: cargoTons > mockPreviousPeriod.cargoTons 
      },
      liftsPerHour: { 
        value: Number((Number(liftsPerHour) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(liftsPerHour) || 0, mockPreviousPeriod.liftsPerHour).toFixed(1)), 
        isPositive: (Number(liftsPerHour) || 0) > mockPreviousPeriod.liftsPerHour 
      },
      osvProductiveHours: { 
        value: Math.round(osvProductiveHours), 
        trend: Number(calculateTrend(osvProductiveHours, mockPreviousPeriod.osvProductiveHours).toFixed(1)), 
        isPositive: osvProductiveHours > mockPreviousPeriod.osvProductiveHours 
      },
      waitingTime: { 
        value: Math.round(waitingTimeOffshore), 
        trend: Number(calculateTrend(waitingTimeOffshore, mockPreviousPeriod.waitingTime).toFixed(1)), 
        isPositive: waitingTimeOffshore < mockPreviousPeriod.waitingTime // Lower waiting time is better
      },
      rtCargoTons: { 
        value: Number((Number(rtTons) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(rtTons) || 0, mockPreviousPeriod.rtCargoTons).toFixed(1)), 
        isPositive: (Number(rtTons) || 0) < mockPreviousPeriod.rtCargoTons // Lower RT cargo might be better
      },
      fluidMovement: { 
        value: fluidMovement > 0 ? Math.round(fluidMovement) : 'N/A', 
        trend: fluidMovement > 0 ? Number(calculateTrend(fluidMovement, mockPreviousPeriod.fluidMovement).toFixed(1)) : null, 
        isPositive: fluidMovement > 0 ? fluidMovement > mockPreviousPeriod.fluidMovement : null 
      },
      vesselUtilization: { 
        value: Math.round(Number(vesselUtilization) || 0), 
        trend: Number(calculateTrend(Number(vesselUtilization) || 0, mockPreviousPeriod.vesselUtilization).toFixed(1)), 
        isPositive: (Number(vesselUtilization) || 0) > mockPreviousPeriod.vesselUtilization 
      },
      fsvRuns: { 
        value: fsvRuns, 
        trend: Number(calculateTrend(fsvRuns, mockPreviousPeriod.fsvRuns).toFixed(1)), 
        isPositive: fsvRuns > mockPreviousPeriod.fsvRuns 
      },
      vesselVisits: { 
        value: vesselVisits, 
        trend: Number(calculateTrend(vesselVisits, mockPreviousPeriod.vesselVisits).toFixed(1)), 
        isPositive: vesselVisits > mockPreviousPeriod.vesselVisits 
      },
      maneuveringHours: { 
        value: Number((Number(maneuveringHours) || 0).toFixed(2)), 
        trend: Number(calculateTrend(Number(maneuveringHours) || 0, mockPreviousPeriod.maneuveringHours).toFixed(1)), 
        isPositive: (Number(maneuveringHours) || 0) < mockPreviousPeriod.maneuveringHours // Lower maneuvering time is better
      },
      // NEW METRICS FOR UPDATED KPI CARDS
      totalCostYTD: {
        value: Math.round(totalCostYTD),
        trend: Number(calculateTrend(totalCostYTD, mockPreviousPeriod.totalCostYTD).toFixed(1)),
        isPositive: totalCostYTD < mockPreviousPeriod.totalCostYTD // Lower cost is better
      },
      avgMonthlyCost: {
        value: Math.round(avgMonthlyCost),
        trend: Number(calculateTrend(avgMonthlyCost, mockPreviousPeriod.avgMonthlyCost).toFixed(1)),
        isPositive: avgMonthlyCost < mockPreviousPeriod.avgMonthlyCost // Lower cost is better
      },
      vesselVisitsPerWeek: {
        value: Number(vesselVisitsPerWeek.toFixed(1)),
        trend: Number(calculateTrend(vesselVisitsPerWeek, mockPreviousPeriod.vesselVisitsPerWeek).toFixed(1)),
        isPositive: vesselVisitsPerWeek > mockPreviousPeriod.vesselVisitsPerWeek // More visits is better
      },
      allocatedDays: {
        value: Math.round(allocatedDays),
        trend: Number(calculateTrend(allocatedDays, mockPreviousPeriod.allocatedDays).toFixed(1)),
        isPositive: allocatedDays > mockPreviousPeriod.allocatedDays // More allocated days might be better
      },
      avgCostPerHour: {
        value: Number(avgCostPerHour.toFixed(2)),
        trend: Number(calculateTrend(avgCostPerHour, mockPreviousPeriod.avgCostPerHour).toFixed(1)),
        isPositive: avgCostPerHour < mockPreviousPeriod.avgCostPerHour // Lower cost per hour is better
      },
      nptPercentage: {
        value: Number(nptPercentage.toFixed(1)),
        trend: 0, // Would need historical data for trend
        isPositive: false // Lower NPT is always better
      },
      weatherImpact: {
        value: Number(weatherImpactPercentage.toFixed(1)),
        trend: 0, // Would need historical data for trend
        isPositive: false // Lower weather impact is better
      },
      // Additional metrics for charts
      totalEvents: filteredVoyageEvents.length,
      totalManifests: filteredVesselManifests.length,
      totalHours,
      cargoOpsHours,
      nonProductiveHours: totalHours - osvProductiveHours,
      
      // Cost allocation data
      rigLocationAnalysis,
      totalCostAllocations: dateFilteredDrillingCosts.length,
      
      // Vessel type breakdown
      vesselTypeData: (() => {
        const vessels = [...new Set(filteredVoyageEvents.map(event => event.vessel))];
        const vesselCounts = vessels.reduce((acc, vessel) => {
          // Use vessel classification data for accurate type detection
          const type = getVesselTypeFromName(vessel);
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(vesselCounts).map(([type, count]) => ({
          type,
          count,
          percentage: vessels.length > 0 ? (count / vessels.length) * 100 : 0
        }));
      })(),
      
      // Activity breakdown
      activityData: (() => {
        const activities = [
          { name: 'Cargo Operations', hours: cargoOpsHours, color: 'bg-blue-500' },
          { name: 'Waiting Time', hours: waitingTimeOffshore, color: 'bg-orange-500' },
          { name: 'Maneuvering', hours: maneuveringHours, color: 'bg-purple-500' },
          { name: 'Other Productive', hours: Math.max(0, osvProductiveHours - cargoOpsHours), color: 'bg-green-500' },
          { name: 'Non-Productive', hours: Math.max(0, totalHours - osvProductiveHours - waitingTimeOffshore), color: 'bg-red-500' }
        ].filter(activity => activity.hours > 0);
        
        return activities.sort((a, b) => b.hours - a.hours);
      })(),
      
      // Vessel by Location Analysis - Only for selected location
      vesselLocationData: (() => {
        // Only show vessels if a specific location is selected (not "All Locations")
        if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') {
          return null; // Don't show the section when "All Locations" is selected
        }
        
        console.log(`🚢 VESSEL LOCATION ANALYSIS for "${filters.selectedLocation}"`);
        
        // Get vessels that visited the selected location during the selected time period
        const selectedLocationVessels = new Set<string>();
        
        // Strategy 1: Get vessels from filtered voyage events at this location
        filteredVoyageEvents.forEach(event => {
          const eventLocation = event.mappedLocation || event.location || 'Unknown';
          const isAtSelectedLocation = filterByLocation(eventLocation);
          
          if (isAtSelectedLocation) {
            selectedLocationVessels.add(event.vessel);
            console.log(`📍 Found vessel ${event.vessel} at ${eventLocation} via voyage events`);
          }
        });
        
        // Strategy 2: Get vessels from filtered manifests at this location  
        filteredVesselManifests.forEach(manifest => {
          const manifestLocation = manifest.mappedLocation || 'Unknown';
          const isAtSelectedLocation = filterByLocation(manifestLocation);
          
          if (isAtSelectedLocation) {
            selectedLocationVessels.add(manifest.transporter);
            console.log(`📍 Found vessel ${manifest.transporter} at ${manifestLocation} via manifests`);
          }
        });
        
        // Strategy 3: For drilling locations (Mad Dog, Thunder Horse), also include vessels 
        // that have cost allocations for drilling LCs at those locations
        if (filters.selectedLocation.toLowerCase().includes('drilling') || 
            filters.selectedLocation.toLowerCase().includes('mad dog') ||
            filters.selectedLocation.toLowerCase().includes('thunder horse')) {
          
          console.log(`🔍 DRILLING LOCATION DETECTED: ${filters.selectedLocation} - Using cost allocation strategy`);
          
          // Get drilling cost allocations for this location
          const locationDrillingCosts = dateFilteredDrillingCosts.filter(cost => {
            const costLocation = cost.rigLocation || cost.locationReference || '';
            return filterByLocation(costLocation);
          });
          
          console.log(`💰 Found ${locationDrillingCosts.length} cost allocations for drilling at ${filters.selectedLocation}`);
          
          // Get all voyage events for the time period (broader search for drilling activities)
          const allTimeFilteredEvents = voyageEvents.filter(event => 
            filterByDate(event.eventDate)
          );
          
          // Get all manifests for the time period
          const allTimeFilteredManifests = vesselManifests.filter(manifest => 
            filterByDate(manifest.manifestDate)
          );
          
          // Look for vessels that went to this location during the time period
          // even if not explicitly marked as drilling
          allTimeFilteredEvents.forEach(event => {
            const eventLocation = event.mappedLocation || event.location || 'Unknown';
            const isAtLocation = filterByLocation(eventLocation);
            
            if (isAtLocation) {
              selectedLocationVessels.add(event.vessel);
              console.log(`🎯 BROADER SEARCH: Found vessel ${event.vessel} at ${eventLocation}`);
            }
          });
          
          allTimeFilteredManifests.forEach(manifest => {
            const manifestLocation = manifest.mappedLocation || 'Unknown';
            const isAtLocation = filterByLocation(manifestLocation);
            
            if (isAtLocation) {
              selectedLocationVessels.add(manifest.transporter);
              console.log(`🎯 BROADER SEARCH: Found vessel ${manifest.transporter} at ${manifestLocation}`);
            }
          });
        }
        
        console.log(`🚢 Total unique vessels found for ${filters.selectedLocation}: ${selectedLocationVessels.size}`);
        
        // Create vessel details for the selected location
        const vesselList = Array.from(selectedLocationVessels).map(vesselName => {
          // Get vessel type and company from vessel classification
          const vesselType = getVesselTypeFromName(vesselName);
          
          // Extract company name (usually first part of vessel name)
          const company = vesselName.split(' ')[0] || 'Unknown';
          
          // Get vessel events count for this specific location during the time period
          // Use broader search for drilling locations
          let vesselEvents;
          if (filters.selectedLocation.toLowerCase().includes('drilling')) {
            vesselEvents = voyageEvents.filter(e => {
              const eventLocation = e.mappedLocation || e.location || 'Unknown';
              return e.vessel === vesselName && 
                     filterByLocation(eventLocation) && 
                     filterByDate(e.eventDate);
            });
          } else {
            vesselEvents = filteredVoyageEvents.filter(e => {
              const eventLocation = e.mappedLocation || e.location || 'Unknown';
              return e.vessel === vesselName && filterByLocation(eventLocation);
            });
          }
          
          // Get manifests for this vessel at this location during the time period
          let vesselManifestsAtLocation;
          if (filters.selectedLocation.toLowerCase().includes('drilling')) {
            vesselManifestsAtLocation = vesselManifests.filter(m => {
              const manifestLocation = m.mappedLocation || 'Unknown';
              return m.transporter === vesselName && 
                     filterByLocation(manifestLocation) && 
                     filterByDate(m.manifestDate);
            });
          } else {
            vesselManifestsAtLocation = filteredVesselManifests.filter(m => {
              const manifestLocation = m.mappedLocation || 'Unknown';
              return m.transporter === vesselName && filterByLocation(manifestLocation);
            });
          }
          
          return {
            name: vesselName,
            company,
            type: vesselType,
            eventsCount: vesselEvents.length,
            manifestsCount: vesselManifestsAtLocation.length,
            totalHours: vesselEvents.reduce((sum, e) => sum + (e.finalHours || 0), 0),
            cargoTons: vesselManifestsAtLocation.reduce((sum, m) => sum + (m.deckTons || 0) + (m.rtTons || 0), 0),
            lifts: vesselManifestsAtLocation.reduce((sum, m) => sum + (m.lifts || 0), 0)
          };
        }).sort((a, b) => b.totalHours - a.totalHours); // Sort by total hours descending
        
        console.log(`📊 Vessel details computed for ${vesselList.length} vessels at ${filters.selectedLocation}`);
        
        if (vesselList.length === 0) {
          console.log(`❌ No vessels found for location: ${filters.selectedLocation}`);
          return null; // No vessels found for this location/time period
        }
        
        return {
          location: filters.selectedLocation,
          vesselCount: vesselList.length,
          vessels: vesselList,
          totalHours: vesselList.reduce((sum, v) => sum + v.totalHours, 0),
          totalCargoTons: vesselList.reduce((sum, v) => sum + v.cargoTons, 0),
          totalLifts: vesselList.reduce((sum, v) => sum + v.lifts, 0)
        };
      })(),
      
      // NEW: Rate Period Cost Analysis
      ratePeriodAnalysis,
      
      // NEW: Budget vs Actual Analysis
      budgetVsActual,
      budgetVariancePercentage,
      
      // Additional cost allocation data
      dateFilteredDrillingCosts
    };
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, filters]);

  // Get filter options
  const filterOptions = useMemo(() => {
    // Create month options with proper chronological sorting from actual data
    const monthMap = new Map<string, string>();
    
    console.log('🔍 DrillingDashboard filterOptions debug:', {
      voyageEventsCount: voyageEvents.length,
      vesselManifestsCount: vesselManifests.length,
      costAllocationCount: costAllocation.length,
      voyageListCount: voyageList.length
    });
    
    // Add months from voyage events - using eventDate as primary source
    voyageEvents.forEach(event => {
      if (event.eventDate) {
        const eventDate = new Date(event.eventDate);
        if (!isNaN(eventDate.getTime())) {
          const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = eventDate.toLocaleString('default', { month: 'long' });
          const label = `${monthName} ${eventDate.getFullYear()}`;
          monthMap.set(monthKey, label);
        }
      }
    });
    
    // Add months from vessel manifests - using manifestDate 
    vesselManifests.forEach(manifest => {
      if (manifest.manifestDate) {
        const manifestDate = new Date(manifest.manifestDate);
        if (!isNaN(manifestDate.getTime())) {
          const monthKey = `${manifestDate.getFullYear()}-${String(manifestDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = manifestDate.toLocaleString('default', { month: 'long' });
          const label = `${monthName} ${manifestDate.getFullYear()}`;
          monthMap.set(monthKey, label);
        }
      }
    });
    
    // Add months from voyage list - using startDate
    voyageList.forEach(voyage => {
      if (voyage.startDate) {
        const voyageDate = new Date(voyage.startDate);
        if (!isNaN(voyageDate.getTime())) {
          const monthKey = `${voyageDate.getFullYear()}-${String(voyageDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = voyageDate.toLocaleString('default', { month: 'long' });
          const label = `${monthName} ${voyageDate.getFullYear()}`;
          monthMap.set(monthKey, label);
        }
      }
    });
    
    // Convert to sorted array and log results
    const sortedMonths = Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value)); // Sort chronologically
      
    const months = ['All Months', ...sortedMonths.map(item => item.label)];
    
    console.log('📅 Generated month filters from actual data:', {
      totalMonthsFound: monthMap.size,
      monthRange: sortedMonths.length > 0 ? `${sortedMonths[0].label} to ${sortedMonths[sortedMonths.length - 1].label}` : 'None',
      allMonths: months,
      sampleDates: {
        firstVoyageEvent: voyageEvents[0]?.eventDate,
        firstManifest: vesselManifests[0]?.manifestDate,
        firstVoyage: voyageList[0]?.startDate
      }
    });
    
    // Get drilling locations from master facilities data
    const drillingFacilities = getAllDrillingCapableLocations();
    const locations = ['All Locations', ...drillingFacilities.map(facility => facility.displayName)];

    return { months, locations };
  }, [voyageEvents, vesselManifests, voyageList, costAllocation.length]); // Focus on primary data sources

  if (!isDataReady || voyageEvents.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drilling dashboard data...</p>
        </div>
      </div>
    );
  }

  const KPICard: React.FC<{
    title: string;
    value: string | number;
    trend?: number | null;
    isPositive?: boolean | null;
    unit?: string;
  }> = ({ title, value, trend, isPositive, unit }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            {trend !== null && (
              <div className="flex items-center gap-1 mr-2">
                {isPositive ? (
                  <svg className="w-3 h-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend}%
                </span>
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900">{value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">GoA WELLS PERFORMANCE</h2>
          <p className="text-lg text-gray-600 font-medium">LOGISTICS DASHBOARD</p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Upload
        </button>
      </div>

      {/* Filter Bar - Matching PowerBI Layout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">CURRENT MONTH</label>
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent min-w-[120px]"
              value={filters.selectedMonth}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
            >
              {filterOptions.months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">DRILLING LOCATION</label>
          <select 
            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent min-w-[160px]"
            value={filters.selectedLocation}
            onChange={(e) => setFilters(prev => ({ ...prev, selectedLocation: e.target.value }))}
          >
            {filterOptions.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid - Enhanced Drilling Operations */}
      <div className="grid grid-cols-5 gap-4">
        {/* First Row - Core Operational Metrics */}
        <KPICard 
          title="Cargo Tons" 
          value={drillingMetrics.cargoTons.value.toLocaleString()}
          trend={drillingMetrics.cargoTons.trend}
          isPositive={drillingMetrics.cargoTons.isPositive}
          unit="tons"
        />
        <KPICard 
          title="Lifts per Hour" 
          value={drillingMetrics.liftsPerHour.value}
          trend={drillingMetrics.liftsPerHour.trend}
          isPositive={drillingMetrics.liftsPerHour.isPositive}
          unit="lifts/hr"
        />
        <KPICard 
          title="Productive Hours" 
          value={drillingMetrics.osvProductiveHours.value}
          trend={drillingMetrics.osvProductiveHours.trend}
          isPositive={drillingMetrics.osvProductiveHours.isPositive}
          unit="hrs"
        />
        <KPICard 
          title="Waiting Time" 
          value={drillingMetrics.waitingTime.value}
          trend={drillingMetrics.waitingTime.trend}
          isPositive={drillingMetrics.waitingTime.isPositive}
          unit="hrs"
        />
        <KPICard 
          title="Vessel Utilization" 
          value={drillingMetrics.vesselUtilization.value}
          trend={drillingMetrics.vesselUtilization.trend}
          isPositive={drillingMetrics.vesselUtilization.isPositive}
          unit="%"
        />
        
        {/* Second Row - Efficiency & Performance Metrics */}
        <KPICard 
          title="Fluid Movement" 
          value={drillingMetrics.fluidMovement.value === 'N/A' ? 'N/A' : `${Number(drillingMetrics.fluidMovement.value).toLocaleString()}`}
          trend={drillingMetrics.fluidMovement.trend}
          isPositive={drillingMetrics.fluidMovement.isPositive}
          unit={drillingMetrics.fluidMovement.value !== 'N/A' ? "bbls" : undefined}
        />
        <KPICard 
          title="NPT Percentage" 
          value={drillingMetrics.nptPercentage?.value.toFixed(1) || '0.0'}
          trend={drillingMetrics.nptPercentage?.trend}
          isPositive={drillingMetrics.nptPercentage?.isPositive}
          unit="%"
        />
        <KPICard 
          title="Weather Impact" 
          value={drillingMetrics.weatherImpact?.value.toFixed(1) || '0.0'}
          trend={drillingMetrics.weatherImpact?.trend}
          isPositive={drillingMetrics.weatherImpact?.isPositive}
          unit="%"
        />
        <KPICard 
          title="Drilling Voyages" 
          value={drillingMetrics.fsvRuns.value}
          trend={drillingMetrics.fsvRuns.trend}
          isPositive={drillingMetrics.fsvRuns.isPositive}
          unit="voyages"
        />
        <KPICard 
          title="Maneuvering Hours" 
          value={drillingMetrics.maneuveringHours.value}
          trend={drillingMetrics.maneuveringHours.trend}
          isPositive={drillingMetrics.maneuveringHours.isPositive}
          unit="hrs"
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">
              {drillingMetrics.totalEvents.toLocaleString()} events | {drillingMetrics.totalManifests.toLocaleString()} manifests | {drillingMetrics.fsvRuns.value.toLocaleString()} voyages
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Efficiency Score</div>
            <div className="text-2xl font-bold text-green-600">
              {((drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Productive vs Total Hours</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Cargo Efficiency</div>
            <div className="text-2xl font-bold text-blue-600">
              {drillingMetrics.liftsPerHour.value}
            </div>
            <div className="text-xs text-gray-500">Lifts per Cargo Hour</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Cost Efficiency</div>
            <div className="text-2xl font-bold text-purple-600">
              ${drillingMetrics.avgCostPerHour.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Average Cost per Hour</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluid Movements Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Fluid Movements</h3>
            <div className="text-sm text-gray-500">MONTH OVER MONTH</div>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Fluid Movements Chart</p>
              <p className="text-sm text-gray-500 mt-2">Coming in Phase 3</p>
            </div>
          </div>
        </div>

        {/* Productive & Non-Productive Vessel Time */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Productive & Non-Productive Vessel Time</h3>
            <div className="text-sm text-gray-500">{drillingMetrics.totalHours.toFixed(0)} Total Hours</div>
          </div>
          <div className="h-64">
            {/* Simple horizontal bar chart */}
            <div className="space-y-4 h-full flex flex-col justify-center">
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Productive Hours</span>
                  <span>{Math.round(drillingMetrics.osvProductiveHours.value).toLocaleString()} hrs ({((drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-green-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {Math.round(drillingMetrics.osvProductiveHours.value).toLocaleString()}h
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Non-Productive Hours</span>
                  <span>{Math.round(drillingMetrics.nonProductiveHours).toLocaleString()} hrs ({((drillingMetrics.nonProductiveHours / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-red-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.nonProductiveHours / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {Math.round(drillingMetrics.nonProductiveHours).toLocaleString()}h
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Cargo Operations</span>
                  <span>{Math.round(drillingMetrics.cargoOpsHours).toLocaleString()} hrs ({((drillingMetrics.cargoOpsHours / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.cargoOpsHours / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {Math.round(drillingMetrics.cargoOpsHours).toLocaleString()}h
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Waiting Time</span>
                  <span>{Math.round(drillingMetrics.waitingTime.value).toLocaleString()} hrs ({((drillingMetrics.waitingTime.value / drillingMetrics.totalHours) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div 
                    className="bg-orange-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium" 
                    style={{ width: `${Math.max(5, (drillingMetrics.waitingTime.value / drillingMetrics.totalHours) * 100)}%` }}
                  >
                    {Math.round(drillingMetrics.waitingTime.value).toLocaleString()}h
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vessels Split by Type */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">VESSELS</h3>
            <div className="text-sm text-gray-500">SPLIT BY TYPE</div>
          </div>
          <div className="h-64">
            {drillingMetrics.vesselTypeData.length > 0 ? (
              <div className="space-y-4 h-full flex flex-col justify-center">
                {drillingMetrics.vesselTypeData.map((item, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                        <span>{item.type}</span>
                        <span>{item.count} vessels ({item.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`${colors[index % colors.length]} h-4 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium`}
                          style={{ width: `${Math.max(10, item.percentage)}%` }}
                        >
                          {item.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 17v4m-4 0h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p className="text-gray-600 font-medium">No vessel data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Breakdown Chart */}
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">ACTIVITY BREAKDOWN</h3>
            <div className="text-sm text-gray-500">BY HOURS</div>
          </div>
          <div className="h-64">
            {drillingMetrics.activityData.length > 0 ? (
              <div className="space-y-3 h-full flex flex-col justify-center">
                {drillingMetrics.activityData.map((activity, index) => (
                  <div key={activity.name}>
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>{activity.name}</span>
                      <span>{Math.round(activity.hours).toLocaleString()} hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`${activity.color} h-4 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium`}
                        style={{ width: `${Math.max(5, (activity.hours / drillingMetrics.totalHours) * 100)}%` }}
                      >
                        {activity.hours > 10 ? Math.round(activity.hours).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-gray-600 font-medium">No activity data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vessels by Location Section - Only shown when specific location is selected */}
      {drillingMetrics.vesselLocationData && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">VESSELS AT {drillingMetrics.vesselLocationData.location.toUpperCase()}</h3>
            <div className="text-sm text-gray-500">
              {filters.selectedMonth !== 'All Months' ? `${filters.selectedMonth} • ` : ''}
              {drillingMetrics.vesselLocationData.vesselCount} vessels
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drillingMetrics.vesselLocationData.vessels.map((vessel, index) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'];
              const vesselColor = colors[index % colors.length];
              
              return (
                <div key={vessel.name} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate mb-1" title={vessel.name}>
                        {vessel.name}
                      </div>
                      <div className="text-xs font-medium text-blue-600 mb-1">
                        {vessel.company}
                      </div>
                      <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full inline-block">
                        {vessel.type}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${vesselColor} flex-shrink-0 mt-1`}></div>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Operational Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{vessel.eventsCount.toLocaleString()}</div>
                        <div className="text-gray-600">Events</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{Math.round(vessel.totalHours).toLocaleString()}h</div>
                        <div className="text-gray-600">Hours</div>
                      </div>
                    </div>
                    
                    {/* Cargo Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{vessel.manifestsCount.toLocaleString()}</div>
                        <div className="text-gray-600">Manifests</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-gray-900">{Math.round(vessel.cargoTons).toLocaleString()}</div>
                        <div className="text-gray-600">Cargo Tons</div>
                      </div>
                    </div>
                    
                    {vessel.lifts > 0 && (
                      <div className="bg-white rounded p-2 text-center text-xs">
                        <div className="font-bold text-gray-900">{vessel.lifts.toLocaleString()}</div>
                        <div className="text-gray-600">Total Lifts</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Activity level bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Activity Level</span>
                      <span>{drillingMetrics.vesselLocationData ? ((vessel.totalHours / drillingMetrics.vesselLocationData.totalHours) * 100).toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${vesselColor} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(8, drillingMetrics.vesselLocationData ? (vessel.totalHours / drillingMetrics.vesselLocationData.totalHours) * 100 : 0)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Summary Statistics for Selected Location */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {drillingMetrics.vesselLocationData.vesselCount}
              </div>
              <div className="text-sm text-gray-600">Unique Vessels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(drillingMetrics.vesselLocationData.totalHours).toLocaleString()}h
              </div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(drillingMetrics.vesselLocationData.totalCargoTons).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Cargo (tons)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {drillingMetrics.vesselLocationData.totalLifts.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Lifts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Math.round(drillingMetrics.vesselLocationData.totalHours / Math.max(1, drillingMetrics.vesselLocationData.vesselCount)).toLocaleString()}h
              </div>
              <div className="text-sm text-gray-600">Avg Hours/Vessel</div>
            </div>
          </div>
        </div>
      )}

      {/* Rig Location Cost Analysis Section */}
      {drillingMetrics.rigLocationAnalysis && Object.keys(drillingMetrics.rigLocationAnalysis).length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">RIG LOCATION COST ANALYSIS</h3>
            <div className="text-sm text-gray-500">{Object.keys(drillingMetrics.rigLocationAnalysis).length} Cost Allocations</div>
          </div>
          <div className="space-y-4">
            {Object.entries(drillingMetrics.rigLocationAnalysis).map(([location, rig]) => {
              const costPerDay = rig.allocatedDays > 0 ? rig.totalCost / rig.allocatedDays : 0;
              const maxCost = Math.max(...Object.values(drillingMetrics.rigLocationAnalysis).map((r: any) => r.totalCost));
              const widthPercentage = maxCost > 0 ? (rig.totalCost / maxCost) * 100 : 0;
              const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600', 'bg-pink-600', 'bg-yellow-600'];
              
              return (
                <div key={location} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[Object.keys(drillingMetrics.rigLocationAnalysis).indexOf(location) % colors.length]}`}></div>
                      <div>
                        <span className="font-medium text-gray-900">{location}</span>
                        <div className="text-xs text-gray-500">
                          {rig.rigType}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${Math.round(rig.totalCost / 1000000)}M
                      </div>
                      <div className="text-xs text-gray-500">
                        ${Math.round(costPerDay).toLocaleString()}/day
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`${colors[Object.keys(drillingMetrics.rigLocationAnalysis).indexOf(location) % colors.length]} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(2, widthPercentage)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 min-w-[60px] text-right">
                      {Math.round(rig.allocatedDays)} days
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${Math.round(Object.values(drillingMetrics.rigLocationAnalysis).reduce((sum: number, rig: any) => sum + rig.totalCost, 0) / 1000000)}M
              </div>
              <div className="text-sm text-gray-600">Total Rig Costs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(drillingMetrics.rigLocationAnalysis).reduce((sum: number, rig: any) => sum + rig.allocatedDays, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Allocated Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${Math.round(Object.values(drillingMetrics.rigLocationAnalysis).reduce((sum: number, rig: any) => sum + rig.totalCost, 0) / 
                   Math.max(1, Object.values(drillingMetrics.rigLocationAnalysis).reduce((sum: number, rig: any) => sum + rig.allocatedDays, 0))).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Average Cost per Day</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrillingDashboard;