import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { getVesselTypeFromName, getVesselCompanyFromName } from '../../data/vesselClassification';
import { getProductionFacilities } from '../../data/masterFacilities';
import KPICard from './KPICard';
import { Calendar, MapPin, Activity, Clock, Ship, BarChart3, TrendingUp, TrendingDown, Anchor, DollarSign, Info } from 'lucide-react';

interface ProductionDashboardProps {
  onNavigateToUpload?: () => void;
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    voyageList
  } = useData();

  // Filters state - matching PowerBI layout
  const [filters, setFilters] = useState({
    selectedMonth: 'All Months',
    selectedLocation: 'All Locations'
  });

  // Calculate production-specific KPIs
  const productionMetrics = useMemo(() => {
    // Filter data based on selected filters
    const filterByDate = (date: Date) => {
      if (filters.selectedMonth === 'all' || filters.selectedMonth === 'All Months') return true;
      const itemDate = new Date(date);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === filters.selectedMonth;
    };

    const filterByLocation = (location: string) => {
      if (filters.selectedLocation === 'all' || filters.selectedLocation === 'All Locations') return true;
      
      // Get all production facilities to map display names to location names
      const productionFacilities = getProductionFacilities();
      const selectedFacility = productionFacilities.find(f => f.displayName === filters.selectedLocation);
      
      // Check against both display name and location name
      return location === filters.selectedLocation || 
             (selectedFacility && (
               location === selectedFacility.locationName ||
               location === selectedFacility.displayName
             ));
    };

    // Apply filters to data - Enhanced logic for production locations
    const filteredVoyageEvents = voyageEvents.filter(event => {
      // For production locations, use location + time filtering primarily
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations') {
        
        // For production locations: Include ALL events at that location during the time period
        // This captures production activities regardless of department classification
        return filterByDate(event.eventDate) && filterByLocation(event.location);
      }
      
      // For non-production locations, use the original logic
      const isProductionRelated = event.department === 'Production' || 
                                 event.department === 'Logistics' ||
                                 !event.department; // Include events without department classification
      
      return isProductionRelated &&
             filterByDate(event.eventDate) &&
             filterByLocation(event.location);
    });

    const filteredVesselManifests = vesselManifests.filter(manifest => {
      // For production locations, use location + time filtering primarily
      if (filters.selectedLocation !== 'all' && 
          filters.selectedLocation !== 'All Locations') {
        
        // For production locations: Include ALL manifests at that location during the time period
        // This captures production activities regardless of department classification
        return filterByDate(manifest.manifestDate) && filterByLocation(manifest.mappedLocation);
      }
      
      // For non-production locations, use the original logic
      const isProductionRelated = manifest.finalDepartment === 'Production' ||
                                 manifest.finalDepartment === 'Logistics' ||
                                 !manifest.finalDepartment; // Include manifests without department classification
      
      return isProductionRelated &&
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
    const cargoOpsHours = filteredVoyageEvents
      .filter(event => event.parentEvent === 'Cargo Ops')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const liftsPerHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
    
    // 3. Productive Hours - Time spent on productive activities
    const osvProductiveHours = filteredVoyageEvents
      .filter(event => event.activityCategory === 'Productive')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 4. Waiting Time - Non-productive time offshore (excluding weather)
    const waitingTimeOffshore = filteredVoyageEvents
      .filter(event => event.parentEvent === 'Waiting on Installation')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 5. Vessel Utilization - Productive hours vs total offshore time
    const totalOffshoreHours = filteredVoyageEvents
      .filter(event => event.portType === 'rig')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const vesselUtilization = totalOffshoreHours > 0 ? (osvProductiveHours / totalOffshoreHours) * 100 : 0;
    
    // 6. Voyage Efficiency - Using voyage list data for better accuracy with filtering
    const productionVoyages = voyageList.filter(voyage => {
      const isProduction = voyage.voyagePurpose === 'Production' || voyage.voyagePurpose === 'Mixed';
      
      // Apply location filter if not "All Locations"
      if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
        // Check multiple location fields and the location list array
        let locationMatch = false;
        
        // Check main destination
        if (voyage.mainDestination) {
          locationMatch = filterByLocation(voyage.mainDestination) || false;
        }
        
        // Check origin port if main destination didn't match
        if (!locationMatch && voyage.originPort) {
          locationMatch = filterByLocation(voyage.originPort) || false;
        }
        
        // Check full locations string if still no match
        if (!locationMatch && voyage.locations) {
          locationMatch = filterByLocation(voyage.locations) || false;
        }
        
        // Check individual locations in locationList array
        if (!locationMatch && voyage.locationList && voyage.locationList.length > 0) {
          locationMatch = voyage.locationList.some(loc => filterByLocation(loc) || false);
        }
        
        // Debug logging for Argos
        if (filters.selectedLocation === 'Argos' && voyage.locations && voyage.locations.toLowerCase().includes('argos')) {
          console.log('🔍 Argos voyage debug:', {
            vessel: voyage.vessel,
            voyageNumber: voyage.voyageNumber,
            startDate: voyage.startDate,
            voyagePurpose: voyage.voyagePurpose,
            locations: voyage.locations,
            locationList: voyage.locationList,
            mainDestination: voyage.mainDestination,
            originPort: voyage.originPort,
            locationMatch,
            isProduction
          });
        }
        
        if (!locationMatch) return false;
      }
      
      // Apply date filter if not "All Months"
      if (filters.selectedMonth !== 'all' && filters.selectedMonth !== 'All Months') {
        const dateMatch = filterByDate(voyage.startDate || voyage.voyageDate || new Date());
        if (!dateMatch) return false;
      }
      
      return isProduction;
    });
    const fsvRuns = productionVoyages.length;
    
    // Debug logging for voyage counts
    if (filters.selectedLocation === 'Argos') {
      console.log('📊 Argos Voyage Analysis:', {
        totalVoyages: voyageList.length,
        argosVoyages: voyageList.filter(v => v.locations && v.locations.toLowerCase().includes('argos')).length,
        productionOrMixedArgosVoyages: voyageList.filter(v => 
          v.locations && v.locations.toLowerCase().includes('argos') && 
          (v.voyagePurpose === 'Production' || v.voyagePurpose === 'Mixed')
        ).length,
        filteredProductionVoyages: fsvRuns,
        selectedMonth: filters.selectedMonth
      });
    }
    
    // 7. Vessel Visits - Unique manifest entries (actual visits)
    const vesselVisits = filteredVesselManifests.length;
    
    // 8. Maneuvering Hours - Setup and positioning activities
    const maneuveringHours = filteredVoyageEvents
      .filter(event => 
        event.parentEvent === 'Maneuvering' ||
        event.event?.toLowerCase().includes('maneuvering') ||
        event.event?.toLowerCase().includes('positioning') ||
        event.event?.toLowerCase().includes('setup') ||
        event.event?.toLowerCase().includes('shifting')
      )
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    
    // 9. Non-Productive Time Analysis
    const nonProductiveHours = filteredVoyageEvents
      .filter(event => event.activityCategory === 'Non-Productive')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const totalHours = filteredVoyageEvents.reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const nptPercentage = totalHours > 0 ? (nonProductiveHours / totalHours) * 100 : 0;
    
    // 10. Weather Impact Analysis
    const weatherWaitingHours = filteredVoyageEvents
      .filter(event => event.parentEvent === 'Waiting on Weather')
      .reduce((sum, event) => sum + (event.finalHours || 0), 0);
    const weatherImpactPercentage = totalOffshoreHours > 0 ? (weatherWaitingHours / totalOffshoreHours) * 100 : 0;

    // 11. Production Facility Cost Analysis
    const productionFacilityCosts = (() => {
      if (!costAllocation || costAllocation.length === 0) {
        console.log('🚨 No cost allocation data available');
        return {};
      }
      
      // Debug: Log sample cost allocation record to check field names
      if (costAllocation.length > 0) {
        console.log('📊 Sample cost allocation record:', costAllocation[0]);
        console.log('📊 Available fields in cost allocation:', Object.keys(costAllocation[0]));
        
        // Check for LC field variations
        const lcFields = Object.keys(costAllocation[0]).filter(key => 
          key.toLowerCase().includes('lc') || 
          key.toLowerCase().includes('location') ||
          key.toLowerCase().includes('rig')
        );
        console.log('📊 LC/Location related fields:', lcFields);
      }
      
      const productionFacilities = getProductionFacilities();
      console.log('🏭 Production Facilities:', productionFacilities.map(f => ({
        displayName: f.displayName,
        locationName: f.locationName,
        productionLCs: f.productionLCs
      })));
      
      // Debug: Check all unique locations in cost allocation data
      const uniqueLocations = new Set<string>();
      costAllocation.forEach(cost => {
        if (cost.rigLocation) uniqueLocations.add(cost.rigLocation);
        if (cost.locationReference) uniqueLocations.add(cost.locationReference);
      });
      console.log('📍 Unique locations in cost allocation:', Array.from(uniqueLocations));
      
      // Debug: Check LC numbers in cost allocation for Thunder Horse and Mad Dog
      const thunderHorseLCs = ['9360', '10099', '10081', '10074', '10052'];
      const madDogLCs = ['9358', '10097', '10084', '10072', '10067'];
      
      const thunderHorseCosts = costAllocation.filter(cost => 
        thunderHorseLCs.includes(cost.lcNumber)
      );
      const madDogCosts = costAllocation.filter(cost => 
        madDogLCs.includes(cost.lcNumber)
      );
      
      console.log(`🌩️ Thunder Horse costs by LC: ${thunderHorseCosts.length} records`);
      console.log('Thunder Horse LC details:', thunderHorseCosts.slice(0, 5).map(c => ({
        lcNumber: c.lcNumber,
        rigLocation: c.rigLocation,
        locationReference: c.locationReference,
        totalCost: c.totalCost,
        allocatedDays: c.totalAllocatedDays
      })));
      
      console.log(`🐕 Mad Dog costs by LC: ${madDogCosts.length} records`);
      console.log('Mad Dog LC details:', madDogCosts.slice(0, 5).map(c => ({
        lcNumber: c.lcNumber,
        rigLocation: c.rigLocation,
        locationReference: c.locationReference,
        totalCost: c.totalCost,
        allocatedDays: c.totalAllocatedDays
      })));
      
      const facilityCosts: Record<string, { 
        totalCost: number; 
        allocatedDays: number; 
        budgetedCost: number;
        voyageCount: number;
        avgDailyCost: number;
        displayName: string;
      }> = {};
      
      // Process cost allocation using LC-based approach
      const filteredCostAllocation = costAllocation.filter(cost => {
        // Apply date filter
        if (filters.selectedMonth !== 'all' && filters.selectedMonth !== 'All Months') {
          if (cost.costAllocationDate) {
            const costDate = new Date(cost.costAllocationDate);
            const monthLabel = `${costDate.toLocaleString('default', { month: 'long' })} ${costDate.getFullYear()}`;
            if (monthLabel !== filters.selectedMonth) return false;
          }
        }
        
        // Check if this LC belongs to any production facility
        const facility = productionFacilities.find(f => {
          if (f.productionLCs) {
            const lcNumbers = f.productionLCs.split(',').map(lc => lc.trim());
            return lcNumbers.includes(cost.lcNumber);
          }
          return false;
        });
        
        if (!facility) {
          // Also check by location name matching
          const isProductionFacility = productionFacilities.some(f => 
            cost.locationReference === f.locationName ||
            cost.locationReference === f.displayName ||
            cost.rigLocation === f.locationName ||
            cost.rigLocation === f.displayName
          );
          
          if (!isProductionFacility) return false;
        }
        
        // Apply location filter
        if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
          const selectedFacility = productionFacilities.find(f => f.displayName === filters.selectedLocation);
          if (selectedFacility) {
            // Check if this cost belongs to the selected facility by LC
            if (selectedFacility.productionLCs) {
              const lcNumbers = selectedFacility.productionLCs.split(',').map(lc => lc.trim());
              if (!lcNumbers.includes(cost.lcNumber)) {
                // Also check by location name
                const matchesLocation = cost.locationReference === selectedFacility.locationName ||
                                       cost.locationReference === selectedFacility.displayName ||
                                       cost.rigLocation === selectedFacility.locationName ||
                                       cost.rigLocation === selectedFacility.displayName;
                if (!matchesLocation) return false;
              }
            }
          }
        }
        
        return true;
      });
      
      console.log(`📊 Filtered cost allocation: ${filteredCostAllocation.length} records`);
      
      // Get the actual voyage count from the production voyages that match the same filters
      // This ensures we count unique voyages, not cost allocation records
      const getVoyageCountForFacility = (facility: any) => {
        const facilityVoyages = productionVoyages.filter(voyage => {
          // Check if voyage includes this facility location
          const locationMatch = voyage.locations && (
            voyage.locations.toLowerCase().includes(facility.locationName.toLowerCase()) ||
            voyage.locations.toLowerCase().includes(facility.displayName.toLowerCase())
          );
          
          // For specific location filter, ensure it matches
          if (filters.selectedLocation !== 'all' && filters.selectedLocation !== 'All Locations') {
            return locationMatch && filters.selectedLocation === facility.displayName;
          }
          
          return locationMatch;
        });
        
        console.log(`🚢 Voyage count for ${facility.displayName}: ${facilityVoyages.length} voyages (from voyage list)`);
        if (facilityVoyages.length > 0) {
          console.log(`   Sample voyages:`, facilityVoyages.slice(0, 3).map(v => ({
            vessel: v.vessel,
            voyageNumber: v.voyageNumber,
            locations: v.locations,
            startDate: v.startDate
          })));
        }
        
        return facilityVoyages.length;
      };
      
      // Aggregate costs by facility using LC-based approach
      filteredCostAllocation.forEach(cost => {
        // First try to find facility by LC number
        let facility = productionFacilities.find(f => {
          if (f.productionLCs) {
            const lcNumbers = f.productionLCs.split(',').map(lc => lc.trim());
            return lcNumbers.includes(cost.lcNumber);
          }
          return false;
        });
        
        // If not found by LC, try by location name
        if (!facility) {
          const location = cost.rigLocation || cost.locationReference || 'Unknown';
          facility = productionFacilities.find(f => 
            location === f.locationName || location === f.displayName
          );
        }
        
        if (facility) {
          const key = facility.displayName;
          
          if (!facilityCosts[key]) {
            facilityCosts[key] = {
              totalCost: 0,
              allocatedDays: 0,
              budgetedCost: 0,
              voyageCount: 0,
              avgDailyCost: 0,
              displayName: facility.displayName
            };
          }
          
          facilityCosts[key].totalCost += Number(cost.totalCost || cost.budgetedVesselCost || 0);
          facilityCosts[key].allocatedDays += Number(cost.totalAllocatedDays || 0);
          facilityCosts[key].budgetedCost += Number(cost.budgetedVesselCost || 0);
          // Don't increment voyageCount here - we'll set it after processing all costs
        }
      });
      
      // Now set the actual voyage counts based on voyage list data
      Object.keys(facilityCosts).forEach(key => {
        const facility = productionFacilities.find(f => f.displayName === key);
        if (facility) {
          facilityCosts[key].voyageCount = getVoyageCountForFacility(facility);
        }
      });
      
      // Calculate average daily costs
      Object.keys(facilityCosts).forEach(key => {
        if (facilityCosts[key].allocatedDays > 0) {
          facilityCosts[key].avgDailyCost = facilityCosts[key].totalCost / facilityCosts[key].allocatedDays;
        }
        console.log(`💰 ${key}: ${facilityCosts[key].voyageCount} voyages, ${facilityCosts[key].allocatedDays.toFixed(1)} days, $${facilityCosts[key].totalCost.toFixed(0)}`);
      });
      
      console.log('🏁 Final facility costs:', Object.keys(facilityCosts));
      
      return facilityCosts;
    })();

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
      vesselUtilization: (vesselUtilization || 0) * 0.98,
      fsvRuns: (fsvRuns || 0) * 0.91,
      vesselVisits: (vesselVisits || 0) * 0.95,
      maneuveringHours: (maneuveringHours || 0) * 1.12
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
        value: Math.round(rtTons || 0), 
        trend: Number(calculateTrend(Number(rtTons) || 0, mockPreviousPeriod.rtCargoTons).toFixed(1)), 
        isPositive: (Number(rtTons) || 0) < mockPreviousPeriod.rtCargoTons // Lower RT cargo might be better
      },
      vesselUtilization: { 
        value: Number(vesselUtilization.toFixed(1)), 
        trend: Number(calculateTrend(vesselUtilization, mockPreviousPeriod.vesselUtilization).toFixed(1)), 
        isPositive: vesselUtilization > mockPreviousPeriod.vesselUtilization 
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
        value: Math.round(maneuveringHours), 
        trend: Number(calculateTrend(maneuveringHours, mockPreviousPeriod.maneuveringHours).toFixed(1)), 
        isPositive: maneuveringHours < mockPreviousPeriod.maneuveringHours // Lower maneuvering hours is better
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
      
      // Vessel type breakdown - show companies when location/time is filtered
      vesselTypeData: (() => {
        const vessels = [...new Set(filteredVoyageEvents.map(event => event.vessel))];
        
        // Determine whether to show companies or types based on filters
        const showCompanies = (filters.selectedLocation !== 'All Locations') || 
                             (filters.selectedMonth !== 'All Months');
        
        const vesselCounts = vessels.reduce((acc, vessel) => {
          // Use company or type based on filter state
          const groupBy = showCompanies 
            ? getVesselCompanyFromName(vessel) 
            : getVesselTypeFromName(vessel);
          acc[groupBy] = (acc[groupBy] || 0) + 1;
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
      
      // Production facility costs
      productionFacilityCosts
    };
  }, [voyageEvents, vesselManifests, voyageList, costAllocation, filters]);

  // Get filter options
  const filterOptions = useMemo(() => {
    // Create month options with proper chronological sorting from actual data
    const monthMap = new Map<string, string>();
    
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
    
    // Get production locations from master facilities data
    const productionFacilities = getProductionFacilities();
    const locations = ['All Locations', ...productionFacilities.map(facility => facility.displayName)];

    return { months, locations };
  }, [voyageEvents, vesselManifests, voyageList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">GoA PRODUCTION PERFORMANCE</h2>
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

      {/* Enhanced Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
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
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Production Location</label>
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
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Enhanced Production Operations */}
      <div className="grid grid-cols-5 gap-4">
        {/* First Row - Core Operational Metrics */}
        <KPICard 
          title="Cargo Tons" 
          value={productionMetrics.cargoTons.value.toLocaleString()}
          trend={productionMetrics.cargoTons.trend}
          isPositive={productionMetrics.cargoTons.isPositive}
          unit="tons"
          color="blue"
          tooltip="Total cargo weight moved (Deck Tons + RT Tons) at production facilities. Higher values indicate increased operational activity."
        />
        <KPICard 
          title="Lifts per Hour" 
          value={productionMetrics.liftsPerHour.value}
          trend={productionMetrics.liftsPerHour.trend}
          isPositive={productionMetrics.liftsPerHour.isPositive}
          unit="lifts/hr"
          color="green"
          tooltip="Average number of cargo lifts performed per hour during active cargo operations. Higher values indicate better operational efficiency."
        />
        <KPICard 
          title="Productive Hours" 
          value={productionMetrics.osvProductiveHours.value.toLocaleString()}
          trend={productionMetrics.osvProductiveHours.trend}
          isPositive={productionMetrics.osvProductiveHours.isPositive}
          unit="hrs"
          color="purple"
          tooltip="Total hours classified as productive based on activity categorization. Includes cargo operations, loading, discharge, and other value-adding activities."
        />
        <KPICard 
          title="Waiting Time" 
          value={productionMetrics.waitingTime.value.toLocaleString()}
          trend={productionMetrics.waitingTime.trend}
          isPositive={productionMetrics.waitingTime.isPositive}
          unit="hrs"
          color="orange"
          tooltip="Hours spent waiting on installation at production locations (excludes weather). Lower values indicate better operational efficiency."
        />
        <KPICard 
          title="Vessel Utilization" 
          value={productionMetrics.vesselUtilization.value}
          trend={productionMetrics.vesselUtilization.trend}
          isPositive={productionMetrics.vesselUtilization.isPositive}
          unit="%"
          color="red"
          tooltip="Percentage of offshore time spent on productive activities. Calculated as productive hours divided by total offshore hours."
        />
        
        {/* Second Row - Efficiency & Performance Metrics */}
        <KPICard 
          title="RT Cargo Tons" 
          value={productionMetrics.rtCargoTons.value.toLocaleString()}
          trend={productionMetrics.rtCargoTons.trend}
          isPositive={productionMetrics.rtCargoTons.isPositive}
          unit="tons"
          color="indigo"
          tooltip="Round-trip cargo tonnage. Lower values may indicate more efficient one-way operations and better logistics planning."
        />
        <KPICard 
          title="NPT Percentage" 
          value={productionMetrics.nptPercentage?.value.toFixed(1) || '0.0'}
          trend={productionMetrics.nptPercentage?.trend}
          isPositive={productionMetrics.nptPercentage?.isPositive}
          unit="%"
          color="pink"
          tooltip="Non-Productive Time as a percentage of total hours. Includes waiting time, breakdowns, and other non-productive activities."
        />
        <KPICard 
          title="Weather Impact" 
          value={productionMetrics.weatherImpact?.value.toFixed(1) || '0.0'}
          trend={productionMetrics.weatherImpact?.trend}
          isPositive={productionMetrics.weatherImpact?.isPositive}
          unit="%"
          color="yellow"
          tooltip="Percentage of offshore time lost to weather-related delays. Lower values indicate less weather disruption to operations."
        />
        <KPICard 
          title="Production Voyages" 
          value={productionMetrics.fsvRuns.value.toLocaleString()}
          trend={productionMetrics.fsvRuns.trend}
          isPositive={productionMetrics.fsvRuns.isPositive}
          unit="voyages"
          color="blue"
          tooltip="Complete round-trip voyages with Production or Mixed purpose. A voyage may include multiple vessel visits to different locations."
        />
        <KPICard 
          title="Maneuvering Hours" 
          value={productionMetrics.maneuveringHours.value.toLocaleString()}
          trend={productionMetrics.maneuveringHours.trend}
          isPositive={productionMetrics.maneuveringHours.isPositive}
          unit="hrs"
          color="green"
          tooltip="Time spent on vessel positioning, setup, and shifting operations. Lower values indicate more efficient vessel handling."
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600 relative group">
              {productionMetrics.totalEvents.toLocaleString()} events | {productionMetrics.totalManifests.toLocaleString()} manifests | {productionMetrics.fsvRuns.value.toLocaleString()} voyages
              <Info className="inline-block w-3 h-3 text-gray-400 ml-1" />
              <div className="absolute z-10 bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="max-w-xs whitespace-normal">
                  <div className="font-semibold mb-1">Data Breakdown:</div>
                  <div className="space-y-1">
                    <div>• Events: Individual vessel activities recorded</div>
                    <div>• Manifests: Vessel visits (port calls) at locations</div>
                    <div>• Voyages: Complete round-trip journeys</div>
                  </div>
                </div>
                <div className="absolute top-full right-4 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Efficiency Score</div>
            <div className="text-2xl font-bold text-green-600">
              {((productionMetrics.osvProductiveHours.value / productionMetrics.totalHours) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Productive vs Total Hours</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Cargo Efficiency</div>
            <div className="text-2xl font-bold text-blue-600">
              {productionMetrics.liftsPerHour.value}
            </div>
            <div className="text-xs text-gray-500">Lifts per Cargo Hour</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-gray-600">Vessel Utilization</div>
            <div className="text-2xl font-bold text-purple-600">
              {productionMetrics.vesselUtilization.value.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Productive vs Offshore Hours</div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Section - Enhanced Design */}
      <div className="space-y-6">
        {/* Production Analytics Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Vessel Fleet Analysis - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Ship className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Vessel Fleet Analysis</h3>
                    <p className="text-sm text-purple-100 mt-0.5">
                      Distribution by {(filters.selectedLocation !== 'All Locations' || filters.selectedMonth !== 'All Months') ? 'Company' : 'Type'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{productionMetrics.vesselTypeData.reduce((sum, v) => sum + v.count, 0)}</div>
                  <div className="text-xs text-purple-100">Total Vessels</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {productionMetrics.vesselTypeData.length > 0 ? (
                <div className="space-y-4">
                  {productionMetrics.vesselTypeData.map((item, index) => {
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
                        <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                          <div 
                            className={`${color.bg} h-8 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${Math.max(15, item.percentage)}%` }}
                          >
                            <span className="text-sm font-bold text-white">
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
                  <div className="text-2xl font-bold text-white">{Math.round(productionMetrics.totalHours).toLocaleString()}</div>
                  <div className="text-xs text-orange-100">Total Hours</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {productionMetrics.activityData.length > 0 ? (
                <div className="space-y-4">
                  {productionMetrics.activityData.map((activity, index) => {
                    const percentage = (activity.hours / productionMetrics.totalHours) * 100;
                    
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
                        <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                          <div 
                            className={`absolute top-0 left-0 h-full ${activity.color} rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${Math.max(2, percentage)}%` }}
                          >
                            <span className="text-sm font-bold text-white">{percentage.toFixed(1)}%</span>
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

        {/* Additional Production-Specific Analytics */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Production Time Analysis */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Production Time Analysis</h3>
                    <p className="text-sm text-green-100 mt-0.5">{Math.round(productionMetrics.totalHours).toLocaleString()} Total Hours</p>
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
                      <div className="text-lg font-bold text-gray-900">{Math.round(productionMetrics.osvProductiveHours.value).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">hours</div>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3" 
                      style={{ width: `${Math.max(2, (productionMetrics.osvProductiveHours.value / productionMetrics.totalHours) * 100)}%` }}
                    >
                      <span className="text-sm font-bold text-white">
                        {((productionMetrics.osvProductiveHours.value / productionMetrics.totalHours) * 100).toFixed(1)}%
                      </span>
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
                      <div className="text-lg font-bold text-gray-900">{Math.round(productionMetrics.nonProductiveHours).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">hours</div>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3" 
                      style={{ width: `${Math.max(2, (productionMetrics.nonProductiveHours / productionMetrics.totalHours) * 100)}%` }}
                    >
                      <span className="text-sm font-bold text-white">
                        {((productionMetrics.nonProductiveHours / productionMetrics.totalHours) * 100).toFixed(1)}%
                      </span>
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
                      <div className="text-lg font-bold text-gray-900">{Math.round(productionMetrics.cargoOpsHours).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">hours</div>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3" 
                      style={{ width: `${Math.max(2, (productionMetrics.cargoOpsHours / productionMetrics.totalHours) * 100)}%` }}
                    >
                      <span className="text-sm font-bold text-white">
                        {((productionMetrics.cargoOpsHours / productionMetrics.totalHours) * 100).toFixed(1)}%
                      </span>
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
                      <div className="text-lg font-bold text-gray-900">{Math.round(productionMetrics.waitingTime.value).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">hours</div>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3" 
                      style={{ width: `${Math.max(2, (productionMetrics.waitingTime.value / productionMetrics.totalHours) * 100)}%` }}
                    >
                      <span className="text-sm font-bold text-white">
                        {((productionMetrics.waitingTime.value / productionMetrics.totalHours) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cargo Movement Analysis */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Anchor className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Cargo Movement Analysis</h3>
                    <p className="text-sm text-blue-100 mt-0.5">Volume & Efficiency Metrics</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-white/80 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  {productionMetrics.cargoTons.value.toLocaleString()} tons
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* Main Metric Display */}
                <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    {productionMetrics.cargoTons.value.toLocaleString()}
                  </div>
                  <div className="text-lg font-medium text-gray-600 mt-2">Total Cargo Moved</div>
                  <div className={`flex items-center justify-center gap-2 mt-4 ${productionMetrics.cargoTons.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {productionMetrics.cargoTons.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">{productionMetrics.cargoTons.trend}%</span>
                    <span className="text-xs">vs previous period</span>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {productionMetrics.liftsPerHour.value}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Lifts/Hour</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg relative group">
                    <div className="text-2xl font-bold text-gray-900">
                      {productionMetrics.vesselVisits.value}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                      Vessel Visits
                      <Info className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                      <div className="max-w-xs">
                        Individual port calls at the selected location. A single voyage may include multiple visits.
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {productionMetrics.rtCargoTons.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">RT Tons</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Production Facility Cost Analysis */}
        {Object.keys(productionMetrics.productionFacilityCosts).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Production Facility Cost Analysis</h3>
                    <p className="text-sm text-indigo-100 mt-0.5">Cost allocation by production location</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {(() => {
                      const totalCost = Object.values(productionMetrics.productionFacilityCosts).reduce((sum: number, facility: any) => sum + facility.totalCost, 0);
                      if (totalCost >= 1000000) {
                        return `$${(totalCost / 1000000).toFixed(1)}M`;
                      } else if (totalCost >= 1000) {
                        return `$${Math.round(totalCost / 1000).toLocaleString()}K`;
                      } else {
                        return `$${Math.round(totalCost).toLocaleString()}`;
                      }
                    })()}
                  </div>
                  <div className="text-xs text-indigo-100">Total Cost</div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(productionMetrics.productionFacilityCosts)
                  .sort(([,a]: any, [,b]: any) => b.totalCost - a.totalCost)
                  .map(([facility, data]: [string, any], index) => {
                    const maxCost = Math.max(...Object.values(productionMetrics.productionFacilityCosts).map((f: any) => f.totalCost));
                    const percentage = maxCost > 0 ? (data.totalCost / maxCost) * 100 : 0;
                    const colors = [
                      { bg: 'bg-indigo-500', light: 'bg-indigo-50', ring: 'ring-indigo-200' },
                      { bg: 'bg-purple-500', light: 'bg-purple-50', ring: 'ring-purple-200' },
                      { bg: 'bg-pink-500', light: 'bg-pink-50', ring: 'ring-pink-200' },
                      { bg: 'bg-blue-500', light: 'bg-blue-50', ring: 'ring-blue-200' },
                      { bg: 'bg-teal-500', light: 'bg-teal-50', ring: 'ring-teal-200' }
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={facility} className={`group hover:${color.light} p-4 rounded-lg transition-all duration-200 border border-gray-100`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 ${color.bg} rounded-full ring-4 ${color.ring}`}></div>
                            <div>
                              <span className="text-sm font-semibold text-gray-800">{data.displayName}</span>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {data.voyageCount.toLocaleString()} voyages • {Math.round(data.allocatedDays).toLocaleString()} days
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {(() => {
                                if (data.totalCost >= 1000000) {
                                  return `$${(data.totalCost / 1000000).toFixed(1)}M`;
                                } else if (data.totalCost >= 1000) {
                                  return `$${Math.round(data.totalCost / 1000).toLocaleString()}K`;
                                } else {
                                  return `$${Math.round(data.totalCost).toLocaleString()}`;
                                }
                              })()}
                            </div>
                            <div className="text-xs text-gray-500">
                              ${Math.round(data.avgDailyCost).toLocaleString()}/day
                            </div>
                          </div>
                        </div>
                        <div className="relative w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                          <div 
                            className={`${color.bg} h-8 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                            style={{ width: `${Math.max(15, percentage)}%` }}
                          >
                            <span className="text-sm font-bold text-white">
                              {(() => {
                                if (data.totalCost >= 1000000) {
                                  return `$${(data.totalCost / 1000000).toFixed(1)}M`;
                                } else if (data.totalCost >= 1000) {
                                  return `$${Math.round(data.totalCost / 1000).toLocaleString()}K`;
                                } else {
                                  return `$${Math.round(data.totalCost).toLocaleString()}`;
                                }
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Summary Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {Object.keys(productionMetrics.productionFacilityCosts).length}
                  </div>
                  <div className="text-sm text-gray-600">Active Facilities</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(() => {
                      const totalCost = Object.values(productionMetrics.productionFacilityCosts).reduce((sum: number, f: any) => sum + f.totalCost, 0);
                      if (totalCost >= 1000000) {
                        return `$${(totalCost / 1000000).toFixed(1)}M`;
                      } else if (totalCost >= 1000) {
                        return `$${Math.round(totalCost / 1000).toLocaleString()}K`;
                      } else {
                        return `$${Math.round(totalCost).toLocaleString()}`;
                      }
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">
                    {Math.round(Object.values(productionMetrics.productionFacilityCosts).reduce((sum: number, f: any) => sum + f.allocatedDays, 0)).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${Math.round(
                      Object.values(productionMetrics.productionFacilityCosts).reduce((sum: number, f: any) => sum + f.totalCost, 0) /
                      Math.max(1, Object.values(productionMetrics.productionFacilityCosts).reduce((sum: number, f: any) => sum + f.allocatedDays, 0))
                    ).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Avg Cost/Day</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionDashboard; 