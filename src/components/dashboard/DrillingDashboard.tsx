import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getVesselTypeFromName } from '../../data/vesselClassification';
import { getAllDrillingCapableLocations, mapCostAllocationLocation, getAllProductionLCs } from '../../data/masterFacilities';
import type { VoyageEvent } from '../../types';
import { TrendingUp, TrendingDown, Activity, Clock, MapPin, Calendar, ChevronRight, Ship, BarChart3 } from 'lucide-react';

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
      
      // Ensure we have a valid date
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('Invalid date encountered:', date);
        return false;
      }
      
      try {
        const monthLabel = `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
        return monthLabel === filters.selectedMonth;
      } catch (error) {
        console.error('Error formatting date:', error, date);
        return false;
      }
    };

    const filterByLocation = (location: string) => {
      if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') return true;
      
      // Get all drilling facilities to map display names to location names
      const drillingFacilities = getAllDrillingCapableLocations();
      const selectedFacility = drillingFacilities.find(f => f.displayName === filters.selectedLocation);
      
      // Normalize location names for comparison
      const normalizedLocation = location?.toLowerCase() || '';
      const normalizedSelected = filters.selectedLocation.toLowerCase();
      
      // Check against both display name and location name
      const directMatch = location === filters.selectedLocation || 
                         normalizedLocation === normalizedSelected;
      
      const facilityMatch = selectedFacility && (
        location === selectedFacility.locationName ||
        location === selectedFacility.displayName ||
        normalizedLocation === selectedFacility.locationName.toLowerCase() ||
        normalizedLocation === selectedFacility.displayName.toLowerCase()
      );
      
      // Special handling for Thunder Horse variations
      if (filters.selectedLocation === 'Thunder Horse (Drilling)') {
        return normalizedLocation.includes('thunder') && 
               (normalizedLocation.includes('drill') || 
                normalizedLocation.includes('pdq') ||
                normalizedLocation === 'thunder horse');
      }
      
      // Special handling for Mad Dog variations
      if (filters.selectedLocation === 'Mad Dog (Drilling)') {
        return normalizedLocation.includes('mad dog') && 
               (normalizedLocation.includes('drill') || 
                normalizedLocation === 'mad dog');
      }
      
      return directMatch || facilityMatch;
    };

    // Debug: Check what departments we have in the data
    const uniqueDepartments = [...new Set(voyageEvents.map(e => e.department))].filter(Boolean);
    const uniqueManifestDepartments = [...new Set(vesselManifests.map(m => m.finalDepartment))].filter(Boolean);
    
    console.log('🔍 Available Departments:', {
      voyageEventDepartments: uniqueDepartments,
      vesselManifestDepartments: uniqueManifestDepartments
    });

    // Get all drilling LC numbers from pure drilling facilities only
    const getAllDrillingLCs = () => {
      const drillingFacilities = getAllDrillingCapableLocations()
        .filter(facility => facility.facilityType === 'Drilling'); // Only pure drilling facilities
      const allDrillingLCs = new Set<string>();
      
      drillingFacilities.forEach(facility => {
        if (facility.drillingLCs) {
          facility.drillingLCs.split(',').forEach(lc => {
            allDrillingLCs.add(lc.trim());
          });
        }
      });
      
      console.log('🏭 Drilling LC Numbers to include:', Array.from(allDrillingLCs));
      return allDrillingLCs;
    };

    const drillingLCs = getAllDrillingLCs();
    
    // Get all production LC numbers to exclude
    const getAllProductionLCsSet = () => {
      const productionLCsMap = getAllProductionLCs();
      return new Set(Object.keys(productionLCsMap));
    };
    
    const productionLCs = getAllProductionLCsSet();

    // Helper function to calculate drilling-allocated hours based on LC information
    const getDrillingAllocatedHours = (event: VoyageEvent) => {
      const baseHours = event.finalHours || event.hours || 0;
      
      // Check if event has LC number
      if (event.lcNumber) {
        const lcNum = String(event.lcNumber).trim();
        
        // If it's a drilling LC, use the percentage or full hours
        if (drillingLCs.has(lcNum)) {
          const percentage = event.lcPercentage ? event.lcPercentage / 100 : 1;
          console.log(`📊 Event ${event.event} - Drilling LC ${lcNum}: ${(percentage * 100).toFixed(1)}% of ${baseHours}h`);
          return baseHours * percentage;
        }
        
        // If it's a production LC, exclude
        if (productionLCs.has(lcNum)) {
          console.log(`📊 Event ${event.event} - Production LC ${lcNum}: excluding from drilling`);
          return 0;
        }
      }
      
      // Fallback to cost allocation percentage if available
      if (event.costDedicatedTo) {
        const costDedicatedTo = event.costDedicatedTo.toString();
        const percentageMatch = costDedicatedTo.match(/(\d+(?:\.\d+)?)%/);
        
        if (percentageMatch) {
          const percentage = parseFloat(percentageMatch[1]) / 100;
          console.log(`📊 Event ${event.event} - Using cost allocation: ${percentageMatch[1]}% of ${baseHours}h`);
          return baseHours * percentage;
        }
      }
      
      // If marked as drilling department, use full hours
      if (event.department === 'Drilling') {
        return baseHours;
      }
      
      // Otherwise, no drilling allocation
      return 0;
    };

    // Apply filters to data - Enhanced logic for drilling locations with LC-based filtering
    const filteredVoyageEvents = voyageEvents.filter(event => {
      const dateMatch = filterByDate(event.eventDate);
      if (!dateMatch) return false;
      
      // Check if this event has drilling LC
      let hasDrillingLC = false;
      let hasProductionLC = false;
      
      if (event.lcNumber) {
        const lcNum = String(event.lcNumber).trim();
        hasDrillingLC = drillingLCs.has(lcNum);
        hasProductionLC = productionLCs.has(lcNum);
      }
      
      // Exclude if it has a production LC
      if (hasProductionLC) return false;
      
      // For specific location filtering
      if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
        const locationMatch = filterByLocation(event.location) || filterByLocation(event.mappedLocation || '');
        
        // For drilling locations: Include events that:
        // 1. Are at the selected location AND
        // 2. Have drilling LC OR are marked as drilling department
        if (locationMatch) {
          return hasDrillingLC || event.department === 'Drilling';
        }
        return false;
      }
      
      // For "All Locations": include all events with drilling LCs or drilling department
      return hasDrillingLC || event.department === 'Drilling';
    });

    const filteredVesselManifests = vesselManifests.filter(manifest => {
      const dateMatch = filterByDate(manifest.manifestDate);
      if (!dateMatch) return false;
      
      // Check if manifest is for drilling based on multiple criteria
      let isDrillingManifest = false;
      
      // 1. Check Cost Code (LC number)
      if (manifest.costCode) {
        const costCodeStr = String(manifest.costCode).trim();
        if (drillingLCs.has(costCodeStr)) {
          isDrillingManifest = true;
          console.log(`✅ Manifest ${manifest.manifestNumber} - Drilling LC: ${costCodeStr}`);
        } else if (productionLCs.has(costCodeStr)) {
          console.log(`❌ Manifest ${manifest.manifestNumber} - Production LC: ${costCodeStr}`);
          return false; // Explicitly exclude production LCs
        }
      }
      
      // 2. Check Offshore Location facility type
      if (manifest.offshoreLocation || manifest.mappedLocation) {
        const facility = mapCostAllocationLocation(manifest.offshoreLocation, manifest.mappedLocation);
        if (facility) {
          if (facility.facilityType === 'Drilling') {
            isDrillingManifest = true;
          } else if (facility.facilityType === 'Production') {
            // Only exclude if we're sure it's production (and no drilling LC)
            if (!manifest.costCode || !drillingLCs.has(String(manifest.costCode).trim())) {
              return false;
            }
          }
        }
      }
      
      // 3. Fallback to department if no Cost Code
      if (!manifest.costCode && manifest.finalDepartment === 'Drilling') {
        isDrillingManifest = true;
      }
      
      // For specific location filtering
      if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
        const locationMatch = filterByLocation(manifest.offshoreLocation || '') || 
                            filterByLocation(manifest.mappedLocation || '');
        
        // Only include manifests that are:
        // 1. At the selected location AND
        // 2. Identified as drilling through LC or facility type
        return locationMatch && isDrillingManifest;
      }
      
      // For "All Locations": include all drilling manifests
      return isDrillingManifest;
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
      return sum + getDrillingAllocatedHours(event);
    }, 0);

    // Enhanced Lifts per Hour calculation
    let liftsPerHour = 0;
    if (filters.selectedLocation === 'All Locations' && filters.selectedMonth === 'All Months') {
      // For all locations and all months, calculate average across all drilling locations
      const drillingFacilities = getAllDrillingCapableLocations();
      const drillingLocationLifts = drillingFacilities.map(facility => {
        const facilityManifests = vesselManifests.filter(m => {
          const locationMatch = m.mappedLocation === facility.locationName || 
                              m.mappedLocation === facility.displayName ||
                              m.offshoreLocation === facility.locationName ||
                              m.offshoreLocation === facility.displayName;
          
          if (!locationMatch) return false;
          
          // Apply LC-based filtering
          if (m.costCode) {
            const costCodeStr = String(m.costCode).trim();
            if (drillingLCs.has(costCodeStr)) return true;
            if (productionLCs.has(costCodeStr)) return false;
          }
          
          // Fallback to department
          return m.finalDepartment === 'Drilling';
        });
        const facilityLifts = facilityManifests.reduce((sum, m) => sum + (m.lifts || 0), 0);
        
        const facilityEvents = voyageEvents.filter(e => 
          (e.location === facility.locationName || e.location === facility.displayName) &&
          (e.parentEvent === 'Cargo Ops' ||
           (e.parentEvent === 'Installation Productive Time' && 
            (e.event?.toLowerCase().includes('cargo') || 
             e.event?.toLowerCase().includes('loading') || 
             e.event?.toLowerCase().includes('offloading') ||
             e.event?.toLowerCase().includes('discharge'))) ||
           e.event?.toLowerCase().includes('simops'))
        );
        const facilityHours = facilityEvents.reduce((sum, e) => sum + getDrillingAllocatedHours(e), 0);
        
        return { lifts: facilityLifts, hours: facilityHours };
      });

      const totalDrillingLifts = drillingLocationLifts.reduce((sum, loc) => sum + loc.lifts, 0);
      const totalDrillingHours = drillingLocationLifts.reduce((sum, loc) => sum + loc.hours, 0);
      
      liftsPerHour = totalDrillingHours > 0 ? totalDrillingLifts / totalDrillingHours : 0;
      
      console.log('🔍 All Locations Lifts/Hour Calculation:', {
        totalDrillingLifts,
        totalDrillingHours,
        liftsPerHour,
        locationBreakdown: drillingLocationLifts.map((loc, i) => ({
          location: drillingFacilities[i].displayName,
          lifts: loc.lifts,
          hours: loc.hours
        }))
      });
    } else {
      // For specific location or month, use the filtered data
      liftsPerHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
    }
    
    // 3. OSV Productive Hours - Using activity category classification with cost allocation
    const productiveEvents = filteredVoyageEvents.filter(event => 
      event.activityCategory === 'Productive'
    );
    
    // Calculate productive hours using LC-based allocation
    const osvProductiveHours = productiveEvents.reduce((sum, event) => {
      return sum + getDrillingAllocatedHours(event);
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
      return sum + getDrillingAllocatedHours(event);
    }, 0);
    
    // 5. Fluid Movement - Wet bulk cargo (bbls + gals converted to bbls)
    const wetBulkBbls = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.wetBulkBbls || 0), 0);
    const wetBulkGals = filteredVesselManifests.reduce((sum, manifest) => sum + (manifest.wetBulkGals || 0), 0);
    const fluidMovement = wetBulkBbls + (wetBulkGals / 42); // Convert gallons to barrels
    
    // 6. Vessel Utilization - Productive hours vs total offshore time with LC allocation
    const totalOffshoreHours = filteredVoyageEvents
      .filter(event => event.portType === 'rig')
      .reduce((sum, event) => {
        return sum + getDrillingAllocatedHours(event);
      }, 0);
    const vesselUtilization = totalOffshoreHours > 0 ? (osvProductiveHours / totalOffshoreHours) * 100 : 0;
    
    // 7. Voyage Efficiency - Using voyage list data for better accuracy with filtering
    const drillingVoyages = voyageList.filter(voyage => {
      // For specific drilling locations, include any voyage that visits that location
      // regardless of voyage purpose classification
      if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
        // Check if any location in the voyage's location list matches the selected location
        let locationMatch = false;
        
        // Check main destination and origin port first
        if (voyage.mainDestination && filterByLocation(voyage.mainDestination)) {
          locationMatch = true;
        } else if (voyage.originPort && filterByLocation(voyage.originPort)) {
          locationMatch = true;
        } else if (voyage.locationList && voyage.locationList.length > 0) {
          // Check each location in the location list
          locationMatch = voyage.locationList.some(loc => filterByLocation(loc));
        } else if (voyage.locations) {
          // Fallback to checking the full locations string
          locationMatch = filterByLocation(voyage.locations) || false;
        }
        
        if (!locationMatch) return false;
        
        // Apply date filter if not "All Months"
        if (filters.selectedMonth !== 'all' && filters.selectedMonth !== 'All Months') {
          const dateMatch = filterByDate(voyage.startDate || voyage.voyageDate || new Date());
          if (!dateMatch) return false;
        }
        
        // For specific drilling locations, include the voyage if it visited that location
        // This ensures we count all voyages to drilling locations, not just those classified as "Drilling"
        return true;
      }
      
      // For "All Locations", use the voyage purpose classification
      const isDrilling = voyage.voyagePurpose === 'Drilling' || voyage.voyagePurpose === 'Mixed';
      
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
    
    // Debug: Log voyage vs vessel count discrepancy
    if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
      console.log(`📊 VOYAGE vs VESSEL COUNT for ${filters.selectedLocation}:`);
      console.log(`- Drilling Voyages: ${fsvRuns}`);
      console.log(`- Unique Vessels (from events): ${[...new Set(filteredVoyageEvents.map(e => e.vessel))].length}`);
      console.log(`- Vessel Manifests: ${vesselVisits}`);
      
      // List unique vessels that visited this location
      const uniqueVesselsFromEvents = [...new Set(filteredVoyageEvents.map(e => e.vessel))];
      const uniqueVesselsFromManifests = [...new Set(filteredVesselManifests.map(m => m.transporter))];
      const allUniqueVessels = [...new Set([...uniqueVesselsFromEvents, ...uniqueVesselsFromManifests])];
      
      console.log(`- Total Unique Vessels: ${allUniqueVessels.length}`);
      console.log(`- Vessels:`, allUniqueVessels);
      
      // Show which voyages were found
      console.log(`- Drilling Voyage Details:`, drillingVoyages.map(v => ({
        vessel: v.vessel,
        voyageNumber: v.voyageNumber,
        month: v.month,
        locations: v.locationList || v.locations
      })));
    }
    
    // 9. Maneuvering Hours - Setup and positioning activities with cost allocation
    const maneuveringEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Maneuvering' ||
      event.event?.toLowerCase().includes('maneuvering') ||
      event.event?.toLowerCase().includes('positioning') ||
      event.event?.toLowerCase().includes('setup') ||
      event.event?.toLowerCase().includes('shifting')
    );
    const maneuveringHours = maneuveringEvents.reduce((sum, event) => {
      return sum + getDrillingAllocatedHours(event);
    }, 0);
    
    // 10. Non-Productive Time Analysis with cost allocation
    const nonProductiveEvents = filteredVoyageEvents.filter(event => 
      event.activityCategory === 'Non-Productive'
    );
    const nonProductiveHours = nonProductiveEvents.reduce((sum, event) => {
      return sum + getDrillingAllocatedHours(event);
    }, 0);
    const totalHours = filteredVoyageEvents.reduce((sum, event) => {
      return sum + getDrillingAllocatedHours(event);
    }, 0);
    const nptPercentage = totalHours > 0 ? (nonProductiveHours / totalHours) * 100 : 0;
    
    // 11. Weather Impact Analysis with cost allocation
    const weatherEvents = filteredVoyageEvents.filter(event => 
      event.parentEvent === 'Waiting on Weather'
    );
    const weatherWaitingHours = weatherEvents.reduce((sum, event) => {
      return sum + getDrillingAllocatedHours(event);
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
    
    // Additional debug for Thunder Horse specifically
    if (filters.selectedLocation === 'Thunder Horse (Drilling)') {
      console.log('🔍 THUNDER HORSE DEBUG:');
      console.log('Events with Thunder Horse:', voyageEvents.filter(e => 
        e.location?.toLowerCase().includes('thunder') || 
        e.mappedLocation?.toLowerCase().includes('thunder')
      ).length);
      console.log('Filtered Thunder Horse events:', filteredVoyageEvents.length);
      console.log('Sample Thunder Horse events:', filteredVoyageEvents.slice(0, 5).map(e => ({
        location: e.location,
        mappedLocation: e.mappedLocation,
        department: e.department,
        hours: e.finalHours
      })));
      console.log('Thunder Horse manifests:', filteredVesselManifests.length);
    }

    // NEW ENHANCED COST ALLOCATION INTEGRATION
    
    // Production LCs are already defined above using getAllProductionLCsSet()
    console.log('🏭 Production LC Numbers to exclude:', Array.from(productionLCs));

    // Filter cost allocation data for drilling operations
    const drillingCostAllocation = costAllocation.filter(cost => {
      // Check if this is a drilling LC
      const lcNumber = String(cost.lcNumber || '').trim();
      const isDrillingLC = drillingLCs.has(lcNumber);
      const isProductionLC = productionLCs.has(lcNumber);
      
      // Exclude if it's a production LC
      if (isProductionLC) {
        console.log(`🚫 Excluding production LC: ${lcNumber} (facility: ${cost.rigLocation || cost.locationReference})`);
        return false;
      }
      
      // Include if:
      // 1. It's a drilling LC number
      // 2. OR it's marked as Drilling department
      // 3. OR it's a Drilling/Completions project type
      // 4. AND it's NOT a production location
      const isDrillingDept = cost.department === 'Drilling';
      const isDrillingProject = cost.projectType === 'Drilling' || cost.projectType === 'Completions';
      
      // Check if location is explicitly a drilling location
      const locationName = cost.rigLocation || cost.locationReference || '';
      const mappedFacility = mapCostAllocationLocation(cost.rigLocation, cost.locationReference);
      const isDrillingLocation = mappedFacility ? 
        mappedFacility.facilityType === 'Drilling' : 
        locationName.toLowerCase().includes('drilling');
      
      const shouldInclude = (isDrillingLC || isDrillingDept || isDrillingProject) && 
                           !locationName.toLowerCase().includes('production') &&
                           !locationName.toLowerCase().includes(' prod');
      
      if (!shouldInclude && lcNumber && isDrillingLocation) {
        console.log(`🚫 Excluding non-drilling LC: ${lcNumber} (dept: ${cost.department}, project: ${cost.projectType}, location: ${locationName})`);
      }
      
      return shouldInclude;
    });
    
    console.log(`💰 Drilling Cost Allocations: ${drillingCostAllocation.length} (excluded ${costAllocation.length - drillingCostAllocation.length} production LCs)`);
    
    // Debug manifest filtering
    const manifestDebug = {
      totalManifests: vesselManifests.length,
      manifestsWithCostCode: vesselManifests.filter(m => m.costCode).length,
      manifestsWithDrillingLC: vesselManifests.filter(m => m.costCode && drillingLCs.has(String(m.costCode).trim())).length,
      manifestsWithProductionLC: vesselManifests.filter(m => m.costCode && productionLCs.has(String(m.costCode).trim())).length,
      manifestsNoCostCode: vesselManifests.filter(m => !m.costCode).length,
      filteredDrillingManifests: filteredVesselManifests.length
    };
    console.log('📦 Manifest Filtering Debug:', manifestDebug);
    
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
    
    // Log Thunder Horse cost allocations if Thunder Horse is selected
    if (filters.selectedLocation === 'Thunder Horse') {
      console.log('Thunder Horse cost allocations:', dateFilteredDrillingCosts.length);
    }
    
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
        value: Math.round(Number(liftsPerHour) || 0), 
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
        value: Math.round(Number(rtTons) || 0), 
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
        value: Math.round(Number(maneuveringHours) || 0), 
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
          // Apply same LC-based filtering logic
          const vesselManifestsAtLocation = vesselManifests.filter(m => {
            if (m.transporter !== vesselName) return false;
            
            const manifestLocation = m.mappedLocation || m.offshoreLocation || 'Unknown';
            const locationMatch = filterByLocation(manifestLocation);
            const dateMatch = filterByDate(m.manifestDate);
            
            if (!locationMatch || !dateMatch) return false;
            
            // Apply LC-based filtering for drilling manifests
            if (m.costCode) {
              const costCodeStr = String(m.costCode).trim();
              // Include if it's a drilling LC
              if (drillingLCs.has(costCodeStr)) return true;
              // Exclude if it's a production LC
              if (productionLCs.has(costCodeStr)) return false;
            }
            
            // Check facility type
            const facility = mapCostAllocationLocation(m.offshoreLocation, m.mappedLocation);
            if (facility && facility.facilityType === 'Drilling') return true;
            
            // Fallback to department
            return m.finalDepartment === 'Drilling';
          });
          
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
    
    // Add months from voyage list - using startDate
    voyageList.forEach(voyage => {
      if (voyage.startDate && voyage.startDate instanceof Date && !isNaN(voyage.startDate.getTime())) {
        const monthKey = `${voyage.startDate.getFullYear()}-${String(voyage.startDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = voyage.startDate.toLocaleString('en-US', { month: 'long' });
        const label = `${monthName} ${voyage.startDate.getFullYear()}`;
        monthMap.set(monthKey, label);
      }
    });
    
    // Convert to sorted array and log results
    const sortedMonths = Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.value.localeCompare(b.value)); // Sort chronologically
      
    const months = ['All Months', ...sortedMonths.map(item => item.label)];
    
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
  }, [voyageEvents, vesselManifests, voyageList]); // Focus on primary data sources

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
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink' | 'yellow';
  }> = ({ title, value, trend, isPositive, unit, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      indigo: 'bg-indigo-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500'
    };
    
    return (
      <div className="relative overflow-hidden bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            {trend !== null && trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-gray-900">{value}</p>
            {unit && <span className="text-sm font-normal text-gray-500">{unit}</span>}
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClasses[color]}`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6">
        {/* Modern Header with Gradient */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  GoA Wells Performance
                </h1>
              </div>
              <p className="text-gray-600 ml-14">Real-time Drilling Operations & Logistics Dashboard</p>
            </div>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Upload
            </button>
          </div>
        </div>

        {/* Modern Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Time Period</label>
                  <select 
                    className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[180px]"
                    value={filters.selectedMonth}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
                  >
                    {filterOptions.months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Drilling Location</label>
                  <select 
                    className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 min-w-[200px]"
                    value={filters.selectedLocation}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedLocation: e.target.value }))}
                  >
                    {filterOptions.locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>Live data refresh every 5 minutes</span>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid - All Original Metrics */}
        <div className="grid grid-cols-5 gap-4">
          {/* First Row - Core Operational Metrics */}
          <KPICard 
            title="Cargo Tons" 
            value={drillingMetrics.cargoTons.value.toLocaleString()}
            trend={drillingMetrics.cargoTons.trend}
            isPositive={drillingMetrics.cargoTons.isPositive}
            unit="tons"
            color="blue"
          />
          <KPICard 
            title="Lifts per Hour" 
            value={Math.round(drillingMetrics.liftsPerHour.value).toLocaleString()}
            trend={drillingMetrics.liftsPerHour.trend}
            isPositive={drillingMetrics.liftsPerHour.isPositive}
            unit="lifts/hr"
            color="green"
          />
          <KPICard 
            title="Productive Hours" 
            value={drillingMetrics.osvProductiveHours.value.toLocaleString()}
            trend={drillingMetrics.osvProductiveHours.trend}
            isPositive={drillingMetrics.osvProductiveHours.isPositive}
            unit="hrs"
            color="purple"
          />
          <KPICard 
            title="Waiting Time" 
            value={drillingMetrics.waitingTime.value.toLocaleString()}
            trend={drillingMetrics.waitingTime.trend}
            isPositive={drillingMetrics.waitingTime.isPositive}
            unit="hrs"
            color="orange"
          />
          <KPICard 
            title="Vessel Utilization" 
            value={drillingMetrics.vesselUtilization.value.toLocaleString()}
            trend={drillingMetrics.vesselUtilization.trend}
            isPositive={drillingMetrics.vesselUtilization.isPositive}
            unit="%"
            color="red"
          />
          
          {/* Second Row - Efficiency & Performance Metrics */}
          <KPICard 
            title="Fluid Movement" 
            value={drillingMetrics.fluidMovement.value === 'N/A' ? 'N/A' : Math.round(Number(drillingMetrics.fluidMovement.value)).toLocaleString()}
            trend={drillingMetrics.fluidMovement.trend}
            isPositive={drillingMetrics.fluidMovement.isPositive}
            unit={drillingMetrics.fluidMovement.value !== 'N/A' ? "bbls" : undefined}
            color="indigo"
          />
          <KPICard 
            title="NPT Percentage" 
            value={Math.round(drillingMetrics.nptPercentage?.value || 0).toLocaleString()}
            trend={drillingMetrics.nptPercentage?.trend}
            isPositive={drillingMetrics.nptPercentage?.isPositive}
            unit="%"
            color="pink"
          />
          <KPICard 
            title="Weather Impact" 
            value={Math.round(drillingMetrics.weatherImpact?.value || 0).toLocaleString()}
            trend={drillingMetrics.weatherImpact?.trend}
            isPositive={drillingMetrics.weatherImpact?.isPositive}
            unit="%"
            color="yellow"
          />
          <KPICard 
            title="Drilling Voyages" 
            value={drillingMetrics.fsvRuns.value.toLocaleString()}
            trend={drillingMetrics.fsvRuns.trend}
            isPositive={drillingMetrics.fsvRuns.isPositive}
            unit="voyages"
            color="blue"
          />
          <KPICard 
            title="Maneuvering Hours" 
            value={Math.round(drillingMetrics.maneuveringHours.value).toLocaleString()}
            trend={drillingMetrics.maneuveringHours.trend}
            isPositive={drillingMetrics.maneuveringHours.isPositive}
            unit="hrs"
            color="green"
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

        {/* Analytics Dashboard Section - Redesigned Layout */}
        <div className="space-y-6">
          {/* Time Analysis & Fluid Movements Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Vessel Time Analysis - Enhanced Design */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Vessel Time Analysis</h3>
                      <p className="text-sm text-green-100 mt-0.5">{drillingMetrics.totalHours.toFixed(0)} Total Hours</p>
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
                <div className="space-y-4">
                  {/* Productive Hours */}
                  <div className="group hover:bg-green-50 p-3 rounded-lg transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full ring-4 ring-green-100"></div>
                        <span className="text-sm font-semibold text-gray-800">Productive Hours</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{Math.round(drillingMetrics.osvProductiveHours.value).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">hours</div>
                      </div>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${Math.max(2, (drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100)}%` }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                        {((drillingMetrics.osvProductiveHours.value / drillingMetrics.totalHours) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Non-Productive Hours */}
                  <div className="group hover:bg-red-50 p-3 rounded-lg transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-100"></div>
                        <span className="text-sm font-semibold text-gray-800">Non-Productive Hours</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{Math.round(drillingMetrics.nonProductiveHours).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">hours</div>
                      </div>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${Math.max(2, (drillingMetrics.nonProductiveHours / drillingMetrics.totalHours) * 100)}%` }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                        {((drillingMetrics.nonProductiveHours / drillingMetrics.totalHours) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Cargo Operations */}
                  <div className="group hover:bg-blue-50 p-3 rounded-lg transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-blue-100"></div>
                        <span className="text-sm font-semibold text-gray-800">Cargo Operations</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{Math.round(drillingMetrics.cargoOpsHours).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">hours</div>
                      </div>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${Math.max(2, (drillingMetrics.cargoOpsHours / drillingMetrics.totalHours) * 100)}%` }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                        {((drillingMetrics.cargoOpsHours / drillingMetrics.totalHours) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Waiting Time */}
                  <div className="group hover:bg-orange-50 p-3 rounded-lg transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full ring-4 ring-orange-100"></div>
                        <span className="text-sm font-semibold text-gray-800">Waiting Time</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{Math.round(drillingMetrics.waitingTime.value).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">hours</div>
                      </div>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${Math.max(2, (drillingMetrics.waitingTime.value / drillingMetrics.totalHours) * 100)}%` }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                        {((drillingMetrics.waitingTime.value / drillingMetrics.totalHours) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fluid Movements - Enhanced Design */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Fluid Movements</h3>
                      <p className="text-sm text-blue-100 mt-0.5">Volume Analysis & Tracking</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-white/80 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {drillingMetrics.fluidMovement.value !== 'N/A' ? `${Math.round(Number(drillingMetrics.fluidMovement.value)).toLocaleString()} bbls` : 'No Data'}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                {drillingMetrics.fluidMovement.value !== 'N/A' ? (
                  <div className="space-y-6">
                    {/* Main Metric Display */}
                    <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        {Math.round(Number(drillingMetrics.fluidMovement.value)).toLocaleString()}
                      </div>
                      <div className="text-lg font-medium text-gray-600 mt-2">Total Barrels Moved</div>
                      <div className={`flex items-center justify-center gap-2 mt-4 ${drillingMetrics.fluidMovement.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="text-sm font-medium">{drillingMetrics.fluidMovement.trend}</span>
                        <span className="text-xs">vs previous period</span>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {drillingMetrics.fsvRuns.value}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Total Runs</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {drillingMetrics.fluidMovement.value !== 'N/A' && drillingMetrics.fsvRuns.value > 0 
                            ? Math.round(Number(drillingMetrics.fluidMovement.value) / drillingMetrics.fsvRuns.value).toLocaleString()
                            : '0'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Avg bbls/Run</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {drillingMetrics.osvProductiveHours.value > 0 
                            ? Math.round(Number(drillingMetrics.fluidMovement.value) / drillingMetrics.osvProductiveHours.value).toLocaleString()
                            : '0'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">bbls/Hour</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="p-4 bg-blue-50 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="text-gray-700 font-semibold">No Fluid Movement Data</p>
                      <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Fluid movement tracking will appear here when data is available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vessels & Activity Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Vessels by Type - Enhanced Design */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Ship className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Vessel Fleet Analysis</h3>
                      <p className="text-sm text-purple-100 mt-0.5">Distribution by Type</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{drillingMetrics.vesselTypeData.reduce((sum, v) => sum + v.count, 0)}</div>
                    <div className="text-xs text-purple-100">Total Vessels</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {drillingMetrics.vesselTypeData.length > 0 ? (
                  <div className="space-y-4">
                    {drillingMetrics.vesselTypeData.map((item, index) => {
                      const colors = [
                        { bg: 'bg-blue-500', light: 'bg-blue-50', ring: 'ring-blue-200' },
                        { bg: 'bg-green-500', light: 'bg-green-50', ring: 'ring-green-200' },
                        { bg: 'bg-purple-500', light: 'bg-purple-50', ring: 'ring-purple-200' },
                        { bg: 'bg-orange-500', light: 'bg-orange-50', ring: 'ring-orange-200' },
                        { bg: 'bg-red-500', light: 'bg-red-50', ring: 'ring-red-200' }
                      ];
                      const color = colors[index % colors.length];
                      
                      return (
                        <div key={item.type} className={`group hover:${color.light} p-4 rounded-lg transition-all duration-200`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 ${color.bg} rounded-full ring-4 ${color.ring}`}></div>
                              <span className="text-sm font-semibold text-gray-800">{item.type}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-900">{item.count}</span>
                              <span className="text-sm text-gray-500">vessels</span>
                            </div>
                          </div>
                          <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`${color.bg} h-4 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                              style={{ width: `${Math.max(15, item.percentage)}%` }}
                            >
                              <span className="text-xs font-medium text-white">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="p-4 bg-purple-50 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
                        <Ship className="w-10 h-10 text-purple-400" />
                      </div>
                      <p className="text-gray-700 font-semibold">No Vessel Data</p>
                      <p className="text-sm text-gray-500 mt-2">Vessel information will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Breakdown - Enhanced Design */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Activity Breakdown</h3>
                      <p className="text-sm text-orange-100 mt-0.5">Operational Time Distribution</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{Math.round(drillingMetrics.totalHours).toLocaleString()}</div>
                    <div className="text-xs text-orange-100">Total Hours</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {drillingMetrics.activityData.length > 0 ? (
                  <div className="space-y-4">
                    {drillingMetrics.activityData.map((activity) => {
                      const percentage = (activity.hours / drillingMetrics.totalHours) * 100;
                      
                      return (
                        <div key={activity.name} className="group hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-3 h-3 rounded-full ${activity.color} ring-4 ring-opacity-30`} 
                                   style={{ boxShadow: `0 0 0 4px ${activity.color}30` }}></div>
                              <span className="text-sm font-semibold text-gray-800 truncate">{activity.name}</span>
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="text-lg font-bold text-gray-900">{Math.round(activity.hours).toLocaleString()}</div>
                              <div className="text-xs text-gray-500">hours</div>
                            </div>
                          </div>
                          <div className="relative w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div 
                              className={`absolute top-0 left-0 h-full ${activity.color} rounded-full transition-all duration-700 ease-out`}
                              style={{ width: `${Math.max(2, percentage)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                              <span className="text-xs font-medium text-gray-700">{percentage.toFixed(1)}%</span>
                              {percentage > 20 && (
                                <span className="text-xs font-medium text-white">
                                  {Math.round(activity.hours).toLocaleString()} hrs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="p-4 bg-orange-50 rounded-full mx-auto mb-4 w-20 h-20 flex items-center justify-center">
                        <BarChart3 className="w-10 h-10 text-orange-400" />
                      </div>
                      <p className="text-gray-700 font-semibold">No Activity Data</p>
                      <p className="text-sm text-gray-500 mt-2">Activity breakdown will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Vessels by Location Section - Only shown when specific location is selected */}
      {drillingMetrics.vesselLocationData && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">VESSELS AT {drillingMetrics.vesselLocationData.location.toUpperCase()}</h3>
            <div className="text-sm text-gray-500">
              {filters.selectedMonth !== 'All Months' ? `${filters.selectedMonth} • ` : ''}
              {drillingMetrics.vesselLocationData.vesselCount} vessels
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {drillingMetrics.vesselLocationData.vessels.map((vessel, index) => {
              const colors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-orange-500', 'border-red-500', 'border-indigo-500', 'border-pink-500', 'border-yellow-500'];
              const dotColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'];
              const vesselBorderColor = colors[index % colors.length];
              const vesselDotColor = dotColors[index % dotColors.length];
              
              return (
                <div key={vessel.name} className={`bg-white rounded-lg p-4 border-2 ${vesselBorderColor} hover:shadow-lg transition-all duration-200`}>
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight flex-1" title={vessel.name}>
                        {vessel.name}
                      </h4>
                      <div className={`w-2 h-2 rounded-full ${vesselDotColor} flex-shrink-0 mt-1 ml-2`}></div>
                    </div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      {vessel.company}
                    </p>
                    <span className="inline-block text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                      {vessel.type}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-600 mb-0.5">Events</div>
                        <div className="text-sm font-bold text-gray-900">{vessel.eventsCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-600 mb-0.5">Hours</div>
                        <div className="text-sm font-bold text-gray-900">{Math.round(vessel.totalHours).toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-600 mb-0.5">Manifests</div>
                        <div className="text-sm font-bold text-gray-900">{vessel.manifestsCount.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-600 mb-0.5">Cargo</div>
                        <div className="text-sm font-bold text-gray-900">{Math.round(vessel.cargoTons).toLocaleString()}t</div>
                      </div>
                    </div>
                    
                    {vessel.lifts > 0 && (
                      <div className="col-span-2 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                        <div className="text-xs text-blue-700 mb-0.5">Total Lifts</div>
                        <div className="text-lg font-bold text-blue-900">{vessel.lifts.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Activity Level Bar */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-600">Activity Level</span>
                      <span className="font-medium text-gray-900">
                        {drillingMetrics.vesselLocationData ? ((vessel.totalHours / drillingMetrics.vesselLocationData.totalHours) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`${vesselDotColor} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(2, drillingMetrics.vesselLocationData ? (vessel.totalHours / drillingMetrics.vesselLocationData.totalHours) * 100 : 0)}%` }}
                      />
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">RIG LOCATION COST ANALYSIS</h3>
              <div className="text-sm text-gray-500">{Object.keys(drillingMetrics.rigLocationAnalysis).length} Cost Allocations</div>
            </div>
            <div className="space-y-4">
              {Object.entries(drillingMetrics.rigLocationAnalysis).map(([location, rig]) => {
                const costPerDay = rig.allocatedDays > 0 ? rig.totalCost / rig.allocatedDays : 0;
                const maxCost = Math.max(...Object.values(drillingMetrics.rigLocationAnalysis).map((r: any) => r.totalCost));
                const widthPercentage = maxCost > 0 ? (rig.totalCost / maxCost) * 100 : 0;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'];
                const colorIndex = Object.keys(drillingMetrics.rigLocationAnalysis).indexOf(location) % colors.length;
                
                return (
                  <div key={location} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[colorIndex]}`}></div>
                        <div>
                          <span className="font-medium text-gray-900">{location}</span>
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
                        <div className="relative w-full bg-gray-100 rounded-lg h-8 overflow-hidden">
                          <div 
                            className={`absolute top-0 left-0 h-full ${colors[colorIndex]} rounded-lg transition-all duration-700 ease-out`}
                            style={{ width: `${Math.max(2, widthPercentage)}%` }}
                          >
                            <div className="h-full flex items-center justify-end pr-3">
                              <span className="text-white text-xs font-semibold drop-shadow">
                                ${Math.round(rig.totalCost / 1000000)}M
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 min-w-[80px] text-right">
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
    </div>
  );
};

export default DrillingDashboard;