// src/data/masterFacilities.ts
// Static Master Facilities data - rarely changes, so hardcoded for efficiency
// Based on PowerBI PowerQuery model for BP Gulf of Mexico operations

export interface FacilityClassification {
  locationID: number;
  locationName: string;
  displayName: string;
  facilityType: 'Production' | 'Drilling' | 'Integrated';
  parentFacility?: string;
  region: string;
  isActive: boolean;
  sortOrder: number;
  productionCS?: number;
  isProductionCapable: boolean;
  isDrillingCapable: boolean;
  category: 'Production Facilities' | 'Drilling Rigs' | 'Integrated Facilities';
  isIntegrated: boolean;
  slicerOrder: number;
}

export const masterFacilitiesData: FacilityClassification[] = [
  // Production Facilities
  {
    locationID: 1,
    locationName: 'Argos',
    displayName: 'Argos',
    facilityType: 'Production',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 10,
    productionCS: 9999.9779,
    isProductionCapable: true,
    isDrillingCapable: false,
    category: 'Production Facilities',
    isIntegrated: false,
    slicerOrder: 10
  },
  {
    locationID: 2,
    locationName: 'Atlantis PQ',
    displayName: 'Atlantis',
    facilityType: 'Production',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 20,
    productionCS: 9361.1003,
    isProductionCapable: true,
    isDrillingCapable: false,
    category: 'Production Facilities',
    isIntegrated: false,
    slicerOrder: 20
  },
  {
    locationID: 3,
    locationName: 'Na Kika',
    displayName: 'Na Kika',
    facilityType: 'Production',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 30,
    productionCS: 9359.9364,
    isProductionCapable: true,
    isDrillingCapable: false,
    category: 'Production Facilities',
    isIntegrated: false,
    slicerOrder: 30
  },
  {
    locationID: 4,
    locationName: 'Thunder Horse Prod',
    displayName: 'Thunder Horse (Production)',
    facilityType: 'Production',
    parentFacility: 'Thunder Horse PDQ',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 40,
    productionCS: 9360.10099,
    isProductionCapable: true,
    isDrillingCapable: false,
    category: 'Production Facilities',
    isIntegrated: false,
    slicerOrder: 40
  },
  {
    locationID: 5,
    locationName: 'Mad Dog Prod',
    displayName: 'Mad Dog (Production)',
    facilityType: 'Production',
    parentFacility: 'Mad Dog',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 50,
    productionCS: 9358.10097,
    isProductionCapable: true,
    isDrillingCapable: false,
    category: 'Production Facilities',
    isIntegrated: false,
    slicerOrder: 50
  },

  // Drilling Rigs
  {
    locationID: 11,
    locationName: 'Thunder Horse Drilling',
    displayName: 'Thunder Horse (Drilling)',
    facilityType: 'Drilling',
    parentFacility: 'Thunder Horse PDQ',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 110,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 110
  },
  {
    locationID: 12,
    locationName: 'Mad Dog Drilling',
    displayName: 'Mad Dog (Drilling)',
    facilityType: 'Drilling',
    parentFacility: 'Mad Dog',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 120,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 120
  },
  {
    locationID: 13,
    locationName: 'Ocean Blackhornet',
    displayName: 'Ocean BlackHornet',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 130,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 130
  },
  {
    locationID: 14,
    locationName: 'Ocean BlackLion',
    displayName: 'Ocean BlackLion',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 140,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 140
  },
  {
    locationID: 15,
    locationName: 'Deepwater Invictus',
    displayName: 'Deepwater Invictus',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 150,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 150
  },
  {
    locationID: 16,
    locationName: 'Island Venture',
    displayName: 'Island Venture',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 160,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 160
  },
  {
    locationID: 17,
    locationName: 'Stena IceMAX',
    displayName: 'Stena IceMAX',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 170,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 170
  },
  {
    locationID: 18,
    locationName: 'Auriga',
    displayName: 'Auriga',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 180,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 180
  },
  {
    locationID: 19,
    locationName: 'Island Intervention',
    displayName: 'Island Intervention',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 190,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 190
  },
  {
    locationID: 20,
    locationName: 'C-Constructor',
    displayName: 'C-Constructor',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 200,
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 200
  },

  // Integrated Facilities
  {
    locationID: 101,
    locationName: 'Thunder Horse PDQ',
    displayName: 'Thunder Horse (Drill/Prod)',
    facilityType: 'Integrated',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 1000,
    productionCS: 1000,
    isProductionCapable: true,
    isDrillingCapable: true,
    category: 'Integrated Facilities',
    isIntegrated: true,
    slicerOrder: 1000
  },
  {
    locationID: 102,
    locationName: 'Mad Dog',
    displayName: 'Mad Dog (Drill/Prod)',
    facilityType: 'Integrated',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 1010,
    productionCS: 1010,
    isProductionCapable: true,
    isDrillingCapable: true,
    category: 'Integrated Facilities',
    isIntegrated: true,
    slicerOrder: 1010
  }
];

// Helper functions for facility classification
export const getFacilityByName = (locationName: string): FacilityClassification | undefined => {
  return masterFacilitiesData.find(facility => 
    facility.locationName.toLowerCase() === locationName.toLowerCase() ||
    facility.displayName.toLowerCase() === locationName.toLowerCase()
  );
};

export const getFacilitiesByType = (facilityType: string): FacilityClassification[] => {
  return masterFacilitiesData.filter(facility => 
    facility.facilityType.toLowerCase() === facilityType.toLowerCase()
  );
};

export const getDrillingFacilities = (): FacilityClassification[] => {
  return masterFacilitiesData.filter(facility => 
    facility.facilityType === 'Drilling' && facility.isActive
  ).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getProductionFacilities = (): FacilityClassification[] => {
  return masterFacilitiesData.filter(facility => 
    facility.facilityType === 'Production' && facility.isActive
  ).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getIntegratedFacilities = (): FacilityClassification[] => {
  return masterFacilitiesData.filter(facility => 
    facility.facilityType === 'Integrated' && facility.isActive
  ).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getAllDrillingCapableLocations = (): FacilityClassification[] => {
  return masterFacilitiesData.filter(facility => 
    facility.isDrillingCapable && facility.isActive
  ).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getFacilityTypeFromName = (locationName: string): string => {
  const facility = getFacilityByName(locationName);
  return facility?.facilityType || 'Unknown';
};

export const getFacilityDisplayName = (locationName: string): string => {
  const facility = getFacilityByName(locationName);
  return facility?.displayName || locationName;
};

// Statistics functions
export const getFacilityStatistics = () => {
  const totalFacilities = masterFacilitiesData.length;
  const activeFacilities = masterFacilitiesData.filter(f => f.isActive).length;
  
  const facilitiesByType = masterFacilitiesData.reduce((acc, facility) => {
    acc[facility.facilityType] = (acc[facility.facilityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const facilitiesByCategory = masterFacilitiesData.reduce((acc, facility) => {
    acc[facility.category] = (acc[facility.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalFacilities,
    activeFacilities,
    facilitiesByType,
    facilitiesByCategory,
    drillingRigs: masterFacilitiesData.filter(f => f.facilityType === 'Drilling').length,
    productionFacilities: masterFacilitiesData.filter(f => f.facilityType === 'Production').length,
    integratedFacilities: masterFacilitiesData.filter(f => f.facilityType === 'Integrated').length
  };
};

export default masterFacilitiesData; 