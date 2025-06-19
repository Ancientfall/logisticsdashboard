// src/utils/dashboardUtils.ts
import { 
    VoyageEvent, 
    VesselManifest, 
    MasterFacility,
    LocationAnalytics,
    DashboardFilters
  } from '../types';
  
  /**
   * Filter voyage events based on dashboard filters
   */
  export const filterVoyageEvents = (
    voyageEvents: VoyageEvent[],
    filters: DashboardFilters
  ): VoyageEvent[] => {
    return voyageEvents.filter(event => {
      // Filter by month
      if (filters.selectedMonth) {
        const eventMonth = `${event.eventDate.getFullYear()}-${String(event.monthNumber).padStart(2, '0')}`;
        if (eventMonth !== filters.selectedMonth) {
          return false;
        }
      }
      
      // Filter by year
      if (filters.selectedYear !== undefined) {
        if (event.eventYear !== filters.selectedYear) {
          return false;
        }
      }
      
      // Filter by department
      if (filters.selectedDepartment && event.department) {
        if (event.department !== filters.selectedDepartment) {
          return false;
        }
      }
      
      // Filter by company
      if (filters.selectedCompany && event.company) {
        if (event.company !== filters.selectedCompany) {
          return false;
        }
      }
      
      // Filter by vessel
      if (filters.selectedVessel && event.vessel) {
        if (event.vessel !== filters.selectedVessel) {
          return false;
        }
      }
      
      // Filter by location
      if (filters.selectedLocation && event.mappedLocation) {
        if (event.mappedLocation !== filters.selectedLocation) {
          return false;
        }
      }
      
      // Filter by activity category
      if (filters.selectedActivityCategory && event.activityCategory) {
        if (event.activityCategory !== filters.selectedActivityCategory) {
          return false;
        }
      }
      
      // Filter by date range
      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        if (event.eventDate < startDate || event.eventDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  /**
   * Filter vessel manifests based on dashboard filters
   */
  export const filterVesselManifests = (
    vesselManifests: VesselManifest[],
    filters: DashboardFilters
  ): VesselManifest[] => {
    return vesselManifests.filter(manifest => {
      // Filter by month
      if (filters.selectedMonth) {
        const manifestMonth = `${manifest.year}-${String(manifest.monthNumber).padStart(2, '0')}`;
        if (manifestMonth !== filters.selectedMonth) {
          return false;
        }
      }
      
      // Filter by year
      if (filters.selectedYear !== undefined) {
        if (manifest.year !== filters.selectedYear) {
          return false;
        }
      }
      
      // Filter by department
      if (filters.selectedDepartment && manifest.finalDepartment) {
        if (manifest.finalDepartment !== filters.selectedDepartment) {
          return false;
        }
      }
      
      // Filter by company
      if (filters.selectedCompany && manifest.company) {
        if (manifest.company !== filters.selectedCompany) {
          return false;
        }
      }
      
      // Filter by vessel
      if (filters.selectedVessel && manifest.transporter) {
        if (manifest.transporter !== filters.selectedVessel) {
          return false;
        }
      }
      
      // Filter by location
      if (filters.selectedLocation && manifest.mappedLocation) {
        if (manifest.mappedLocation !== filters.selectedLocation) {
          return false;
        }
      }
      
      // Filter by date range
      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        if (manifest.manifestDate < startDate || manifest.manifestDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  /**
   * Calculate location analytics
   */
  export const calculateLocationAnalytics = (
    voyageEvents: VoyageEvent[],
    vesselManifests: VesselManifest[],
    masterFacilities: MasterFacility[]
  ): LocationAnalytics[] => {
    // Group events by mapped location
    const locationMap = new Map<string, VoyageEvent[]>();
    voyageEvents.forEach(event => {
      if (!locationMap.has(event.mappedLocation)) {
        locationMap.set(event.mappedLocation, []);
      }
      locationMap.get(event.mappedLocation)!.push(event);
    });
    
    // Group manifests by mapped location
    const manifestMap = new Map<string, VesselManifest[]>();
    vesselManifests.forEach(manifest => {
      if (!manifestMap.has(manifest.mappedLocation)) {
        manifestMap.set(manifest.mappedLocation, []);
      }
      manifestMap.get(manifest.mappedLocation)!.push(manifest);
    });
    
    // Create facility map for quick lookups
    const facilityMap = new Map<string, MasterFacility>();
    masterFacilities.forEach(facility => {
      facilityMap.set(facility.locationName.toLowerCase(), facility);
    });
    
    // Generate location analytics
    const analytics: LocationAnalytics[] = [];
    
    // Combine all unique locations
    const allLocations = new Set([
      ...Array.from(locationMap.keys()),
      ...Array.from(manifestMap.keys())
    ]);
    
    allLocations.forEach(location => {
      const events = locationMap.get(location) || [];
      const manifests = manifestMap.get(location) || [];
      
      // Find facility type
      const facility = facilityMap.get(location.toLowerCase());
      const facilityType = facility?.facilityType || 'Unknown';
      
      // Calculate metrics
      const totalHours = events.reduce((sum, event) => sum + event.finalHours, 0);
      const totalVisits = manifests.length;
      const cargoTonnage = manifests.reduce((sum, manifest) => 
        sum + manifest.deckTons + manifest.rtTons, 0);
      
      analytics.push({
        location,
        facilityType,
        totalVisits,
        totalHours,
        averageHoursPerVisit: totalVisits > 0 ? totalHours / totalVisits : 0,
        cargoTonnage,
        isDrilling: facility?.isDrillingCapable || false,
        isProduction: facility?.isProductionCapable || false
      });
    });
    
    // Sort by total hours (descending)
    return analytics.sort((a, b) => b.totalHours - a.totalHours);
  };