// src/data/masterFacilities.ts
// Static Master Facilities data - rarely changes, so hardcoded for efficiency
// Based on PowerBI PowerQuery model for BP Gulf of Mexico operations
// Updated with comprehensive Production LC mappings from PowerBI

export interface FacilityClassification {
  locationID: number;
  locationName: string;
  displayName: string;
  facilityType: 'Production' | 'Drilling' | 'Integrated';
  parentFacility?: string;
  region: string;
  isActive: boolean;
  sortOrder: number;
  productionLCs?: string;  // Updated: comma-separated list of Production LC numbers
  drillingLCs?: string;    // Added: comma-separated list of Drilling LC numbers
  isProductionCapable: boolean;
  isDrillingCapable: boolean;
  category: 'Production Facilities' | 'Drilling Rigs' | 'Integrated Facilities';
  isIntegrated: boolean;
  slicerOrder: number;
}

export const masterFacilitiesData: FacilityClassification[] = [
  // Production Facilities - Updated with comprehensive Production LC mappings
  {
    locationID: 1,
    locationName: 'Argos',
    displayName: 'Argos',
    facilityType: 'Production',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 10,
    productionLCs: '9999,9779,10027,10039,10070,10082,10106',
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
    productionLCs: '9361,10103,10096,10071,10115',
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
    productionLCs: '9359,9364,9367,10098,10080,10051,10021,10017',
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
    productionLCs: '9360,10099,10081,10074,10052',
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
    productionLCs: '9358,10097,10084,10072,10067',
    isProductionCapable: true,
    isDrillingCapable: false,
    category: 'Production Facilities',
    isIntegrated: false,
    slicerOrder: 50
  },

  // Drilling Rigs - Updated with complete list from PowerBI
  {
    locationID: 11,
    locationName: 'Thunder Horse Drilling',
    displayName: 'Thunder Horse (Drilling)',
    facilityType: 'Drilling',
    parentFacility: 'Thunder Horse PDQ',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 110,
    drillingLCs: '',  // NOTE: Drilling activities are identified by location mapping, not specific LC numbers
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
    drillingLCs: '',  // NOTE: Drilling activities are identified by location mapping, not specific LC numbers
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 120
  },
  {
    locationID: 13,
    locationName: 'Ocean Blackhornet',
    displayName: 'Ocean Blackhornet',
    facilityType: 'Drilling',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 130,
    drillingLCs: '10111,10112,10113,10114,10115',
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
    drillingLCs: '10116,10117,10118,10119,10120',
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
    drillingLCs: '10121,10122,10123,10124,10125',
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
    drillingLCs: '10126,10127,10128,10129,10130',
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
    drillingLCs: '10131,10132,10133,10134,10135',
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
    drillingLCs: '10136,10137,10138,10139,10140',
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
    drillingLCs: '10141,10142,10143,10144,10145',
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
    drillingLCs: '10146,10147,10148,10149,10150',
    isProductionCapable: false,
    isDrillingCapable: true,
    category: 'Drilling Rigs',
    isIntegrated: false,
    slicerOrder: 200
  },

  // Integrated Facilities - Updated to match PowerBI structure
  {
    locationID: 101,
    locationName: 'Thunder Horse PDQ',
    displayName: 'Thunder Horse (All)',
    facilityType: 'Integrated',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 1000,
    isProductionCapable: true,
    isDrillingCapable: true,
    category: 'Integrated Facilities',
    isIntegrated: true,
    slicerOrder: 1000
  },
  {
    locationID: 102,
    locationName: 'Mad Dog',
    displayName: 'Mad Dog (All)',
    facilityType: 'Integrated',
    region: 'Gulf of Mexico',
    isActive: true,
    sortOrder: 1010,
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

export const mapCostAllocationLocation = (rigLocation?: string, locationReference?: string): FacilityClassification | undefined => {
  // Helper function to find facility by various name matching
  const findByName = (searchName: string): FacilityClassification | undefined => {
    if (!searchName) return undefined;
    
    const searchLower = searchName.toLowerCase().trim();
    
    // Exact matches first
    let facility = masterFacilitiesData.find(f => 
      f.locationName.toLowerCase() === searchLower ||
      f.displayName.toLowerCase() === searchLower
    );
    
    if (facility) return facility;
    
    // Partial matches for known mappings
    const locationMappings: Record<string, string> = {
      'stena icemax': 'Stena IceMAX',
      'ocean blacklion': 'Ocean BlackLion', 
      'ocean blackhornet': 'Ocean Blackhornet',
      'thunder horse pdq': 'Thunder Horse PDQ',
      'thunder horse drilling': 'Thunder Horse Drilling',
      'thunder horse drill': 'Thunder Horse Drilling',
      'thunder horse prod': 'Thunder Horse Prod',
      'thunder horse production': 'Thunder Horse Prod',
      'thunder horse': 'Thunder Horse PDQ',
      'thunderhorse': 'Thunder Horse PDQ',
      'argos': 'Argos',
      'island venture': 'Island Venture',
      'mad dog': 'Mad Dog',
      'mad dog drilling': 'Mad Dog Drilling',
      'mad dog drill': 'Mad Dog Drilling',
      'mad dog prod': 'Mad Dog Prod',
      'mad dog production': 'Mad Dog Prod',
      'na kika': 'Na Kika',
      'atlantis': 'Atlantis'
    };
    
    // Check for mapped names
    const mappedName = locationMappings[searchLower];
    if (mappedName) {
      facility = masterFacilitiesData.find(f => 
        f.locationName.toLowerCase() === mappedName.toLowerCase() ||
        f.displayName.toLowerCase() === mappedName.toLowerCase()
      );
      if (facility) return facility;
    }
    
    // Fuzzy matching for partial strings
    facility = masterFacilitiesData.find(f => 
      f.locationName.toLowerCase().includes(searchLower) ||
      f.displayName.toLowerCase().includes(searchLower) ||
      searchLower.includes(f.locationName.toLowerCase()) ||
      searchLower.includes(f.displayName.toLowerCase())
    );
    
    return facility;
  };
  
  // Try rig location first, then location reference
  return findByName(rigLocation || '') || findByName(locationReference || '');
};

export const debugLocationMapping = (costAllocations: any[]) => {
  console.log('🗺️ LOCATION MAPPING ANALYSIS:');
  
  const allLocations = new Set<string>();
  const mappedLocations = new Map<string, string>();
  const unmappedLocations = new Set<string>();
  
  // Debug: Check what fields are actually available
  if (costAllocations.length > 0) {
    console.log('  🔍 Sample cost allocation fields:', Object.keys(costAllocations[0]));
    console.log('  🔍 Sample cost allocation data:', costAllocations[0]);
    
    // Check all fields for location-related data
    const sampleRecord = costAllocations[0];
    const locationFields = Object.keys(sampleRecord).filter(key => 
      key.toLowerCase().includes('location') || 
      key.toLowerCase().includes('rig') ||
      key.toLowerCase().includes('facility') ||
      key.toLowerCase().includes('reference') ||
      key.toLowerCase().includes('site') ||
      key.toLowerCase().includes('platform')
    );
    console.log('  🗺️ Location-related fields found:', locationFields);
    
    // Sample values from location fields
    locationFields.forEach(field => {
      const sampleValues = [...new Set(costAllocations.slice(0, 10).map(ca => ca[field]).filter(Boolean))];
      console.log(`    ${field}:`, sampleValues.slice(0, 5));
    });
  }
  
  costAllocations.forEach(cost => {
    // Check all possible location fields with enhanced field name detection
    const locations = [
      cost.rigLocation, 
      cost.locationReference,
      cost['Rig Location'],
      cost['Location Reference'],
      cost.location,
      cost.mappedLocation,
      cost.originalLocation,
      cost.facility,
      cost.platform,
      cost.site,
      cost.rigName,
      cost['Rig Name'],
      cost['Facility Name'],
      cost['Platform Name'],
      cost['Location Name']
    ].filter(Boolean);
    
    locations.forEach(loc => {
      if (loc && typeof loc === 'string' && loc.trim() !== '') {
        allLocations.add(loc);
        const mapped = mapCostAllocationLocation(cost.rigLocation || cost['Rig Location'], cost.locationReference || cost['Location Reference']);
        if (mapped) {
          mappedLocations.set(loc, mapped.displayName);
        } else {
          unmappedLocations.add(loc);
        }
      }
    });
  });
  
  console.log('  📋 All unique locations from cost allocation:', Array.from(allLocations));
  console.log('  ✅ Successfully mapped locations:', Array.from(mappedLocations.entries()));
  console.log('  ❌ Unmapped locations:', Array.from(unmappedLocations));
  console.log('  📊 Master facilities available for drilling:', getAllDrillingCapableLocations().map(f => f.displayName));
  
  return {
    allLocations: Array.from(allLocations),
    mappedLocations: Array.from(mappedLocations.entries()),
    unmappedLocations: Array.from(unmappedLocations),
    mappingRate: allLocations.size > 0 ? mappedLocations.size / allLocations.size : 0
  };
};

/**
 * Find which production facility a given LC number belongs to
 * Uses the comprehensive Production LC mappings from PowerBI
 */
export const getProductionFacilityByLC = (lcNumber: string): FacilityClassification | undefined => {
  return masterFacilitiesData.find(facility => {
    if (facility.facilityType === 'Production' && facility.productionLCs) {
      const lcNumbers = facility.productionLCs.split(',').map(lc => lc.trim());
      return lcNumbers.includes(lcNumber);
    }
    return false;
  });
};

/**
 * Get all Production LC numbers for debugging and validation
 */
export const getAllProductionLCs = (): Record<string, string> => {
  const lcMapping: Record<string, string> = {};
  
  masterFacilitiesData.forEach(facility => {
    if (facility.facilityType === 'Production' && facility.productionLCs) {
      const lcNumbers = facility.productionLCs.split(',').map(lc => lc.trim());
      lcNumbers.forEach(lcNumber => {
        if (lcNumber) {
          lcMapping[lcNumber] = facility.displayName;
        }
      });
    }
  });
  
  return lcMapping;
};

/**
 * Validate Production LC mapping completeness
 */
export const validateProductionLCMappings = () => {
  const allLCs = getAllProductionLCs();
  const facilityStats = masterFacilitiesData
    .filter(f => f.facilityType === 'Production')
    .map(f => ({
      facility: f.displayName,
      lcCount: f.productionLCs ? f.productionLCs.split(',').length : 0,
      lcs: f.productionLCs ? f.productionLCs.split(',').map(lc => lc.trim()) : []
    }));
  
  console.log('🏭 PRODUCTION LC MAPPING VALIDATION:');
  console.log(`   📊 Total Production LCs: ${Object.keys(allLCs).length}`);
  facilityStats.forEach(stat => {
    console.log(`   🏭 ${stat.facility}: ${stat.lcCount} LCs (${stat.lcs.join(', ')})`);
  });
  
  return {
    totalLCs: Object.keys(allLCs).length,
    facilityStats,
    lcMapping: allLCs
  };
};

export default masterFacilitiesData; 