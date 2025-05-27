// src/data/masterFacilities.ts
// Static Master Facilities data - rarely changes, so hardcoded for efficiency
// Based on PowerBI PowerQuery model for BP Gulf of Mexico operations

export interface MasterFacility {
  LocationID: number;
  LocationName: string;
  DisplayName: string;
  FacilityType: 'Production' | 'Drilling' | 'Integrated';
  ParentFacility: string | null;
  Region: string;
  IsActive: boolean;
  SortOrder: number;
  ProductionLCs: string | null; // Comma-separated LC numbers for production facilities
  IsProductionCapable: boolean;
  IsDrillingCapable: boolean;
  Category: string;
  IsIntegrated: boolean;
}

export const MASTER_FACILITIES: MasterFacility[] = [
  // Production facilities
  {
    LocationID: 1,
    LocationName: "Argos",
    DisplayName: "Argos",
    FacilityType: "Production",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 10,
    ProductionLCs: "9999,9779,10027,10039,10070,10082,10106",
    IsProductionCapable: true,
    IsDrillingCapable: false,
    Category: "Production Facilities",
    IsIntegrated: false
  },
  {
    LocationID: 2,
    LocationName: "Atlantis PQ",
    DisplayName: "Atlantis",
    FacilityType: "Production",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 20,
    ProductionLCs: "9361,10103,10096,10071,10115",
    IsProductionCapable: true,
    IsDrillingCapable: false,
    Category: "Production Facilities",
    IsIntegrated: false
  },
  {
    LocationID: 3,
    LocationName: "Na Kika",
    DisplayName: "Na Kika",
    FacilityType: "Production",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 30,
    ProductionLCs: "9359,9364,9367,10098,10080,10051,10021,10017",
    IsProductionCapable: true,
    IsDrillingCapable: false,
    Category: "Production Facilities",
    IsIntegrated: false
  },
  {
    LocationID: 4,
    LocationName: "Thunder horse Prod",
    DisplayName: "Thunder Horse (Production)",
    FacilityType: "Production",
    ParentFacility: "Thunder Horse PDQ",
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 40,
    ProductionLCs: "9360,10099,10081,10074,10052",
    IsProductionCapable: true,
    IsDrillingCapable: false,
    Category: "Production Facilities",
    IsIntegrated: false
  },
  {
    LocationID: 5,
    LocationName: "Mad Dog Prod",
    DisplayName: "Mad Dog (Production)",
    FacilityType: "Production",
    ParentFacility: "Mad Dog",
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 50,
    ProductionLCs: "9358,10097,10084,10072,10067",
    IsProductionCapable: true,
    IsDrillingCapable: false,
    Category: "Production Facilities",
    IsIntegrated: false
  },

  // Drilling facilities
  {
    LocationID: 11,
    LocationName: "Thunder Horse Drilling",
    DisplayName: "Thunder Horse (Drilling)",
    FacilityType: "Drilling",
    ParentFacility: "Thunder Horse PDQ",
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 110,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 12,
    LocationName: "Mad Dog Drilling",
    DisplayName: "Mad Dog (Drilling)",
    FacilityType: "Drilling",
    ParentFacility: "Mad Dog",
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 120,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 13,
    LocationName: "Ocean Blackhornet",
    DisplayName: "Ocean Blackhornet",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 130,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 14,
    LocationName: "Ocean BlackLion",
    DisplayName: "Ocean BlackLion",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 140,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 15,
    LocationName: "Deepwater Invictus",
    DisplayName: "Deepwater Invictus",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 150,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 16,
    LocationName: "Island Venture",
    DisplayName: "Island Venture",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 160,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 17,
    LocationName: "Stena IceMAX",
    DisplayName: "Stena IceMAX",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 170,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 18,
    LocationName: "Auriga",
    DisplayName: "Auriga",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 180,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 19,
    LocationName: "Island Intervention",
    DisplayName: "Island Intervention",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 190,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },
  {
    LocationID: 20,
    LocationName: "C-Constructor",
    DisplayName: "C-Constructor",
    FacilityType: "Drilling",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 200,
    ProductionLCs: null,
    IsProductionCapable: false,
    IsDrillingCapable: true,
    Category: "Drilling Rigs",
    IsIntegrated: false
  },

  // Integrated facilities
  {
    LocationID: 101,
    LocationName: "Thunder Horse PDQ",
    DisplayName: "Thunder Horse (All)",
    FacilityType: "Integrated",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 1000,
    ProductionLCs: null,
    IsProductionCapable: true,
    IsDrillingCapable: true,
    Category: "Integrated Facilities",
    IsIntegrated: true
  },
  {
    LocationID: 102,
    LocationName: "Mad Dog",
    DisplayName: "Mad Dog (All)",
    FacilityType: "Integrated",
    ParentFacility: null,
    Region: "Gulf of Mexico",
    IsActive: true,
    SortOrder: 1010,
    ProductionLCs: null,
    IsProductionCapable: true,
    IsDrillingCapable: true,
    Category: "Integrated Facilities",
    IsIntegrated: true
  }
];

// Utility functions for working with facilities data
export const getFacilityById = (id: number): MasterFacility | undefined => {
  return MASTER_FACILITIES.find(facility => facility.LocationID === id);
};

export const getFacilityByName = (name: string): MasterFacility | undefined => {
  return MASTER_FACILITIES.find(facility => 
    facility.LocationName.toLowerCase() === name.toLowerCase() ||
    facility.DisplayName.toLowerCase() === name.toLowerCase()
  );
};

export const getProductionFacilities = (): MasterFacility[] => {
  return MASTER_FACILITIES.filter(facility => facility.IsProductionCapable);
};

export const getDrillingFacilities = (): MasterFacility[] => {
  return MASTER_FACILITIES.filter(facility => facility.IsDrillingCapable);
};

export const getActiveFacilities = (): MasterFacility[] => {
  return MASTER_FACILITIES.filter(facility => facility.IsActive);
};

export const getFacilitiesByType = (type: 'Production' | 'Drilling' | 'Integrated'): MasterFacility[] => {
  return MASTER_FACILITIES.filter(facility => facility.FacilityType === type);
};

export const getProductionLCsForFacility = (facilityName: string): string[] => {
  const facility = getFacilityByName(facilityName);
  if (facility && facility.ProductionLCs) {
    return facility.ProductionLCs.split(',').map(lc => lc.trim());
  }
  return [];
};

export const isProductionFacility = (facilityName: string): boolean => {
  const facility = getFacilityByName(facilityName);
  return facility ? facility.IsProductionCapable : false;
};

export const isDrillingFacility = (facilityName: string): boolean => {
  const facility = getFacilityByName(facilityName);
  return facility ? facility.IsDrillingCapable : false;
};

// Export the data in the format expected by the existing data processing
export const getMasterFacilitiesData = (): MasterFacility[] => {
  return MASTER_FACILITIES;
}; 