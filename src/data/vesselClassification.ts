export interface VesselClassification {
  vesselName: string;
  company: string;
  size: number;
  vesselType: 'OSV' | 'FSV' | 'Specialty' | 'Support' | 'AHTS' | 'MSV' | 'PSV';
  category: 'Supply' | 'Support' | 'Specialized' | 'Multi-Purpose';
  capacity?: {
    deckSpace?: number; // m²
    fuelCapacity?: number; // m³
    waterCapacity?: number; // m³
    mudCapacity?: number; // m³
  };
  specifications?: {
    length?: number; // meters
    beam?: number; // meters
    draft?: number; // meters
    bollardPull?: number; // tonnes (for AHTS)
  };
  operationalArea?: string[];
  status: 'Active' | 'Standby' | 'Maintenance' | 'Retired';
}

// Generated from Excel file on 2025-06-18T18:32:27.705Z
export const vesselClassificationData: VesselClassification[] = [
  {
    "vesselName": "Amber",
    "company": "Edison Chouest Offshore",
    "size": 280,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 280
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Cajun IV",
    "company": "Jackson Offshore",
    "size": 210,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 210
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Charlie Comeaux",
    "company": "Edison Chouest Offshore",
    "size": 299,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 299
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Claire Candies",
    "company": "Otto Candies",
    "size": 282,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 282
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Dauphin island",
    "company": "Edison Chouest Offshore",
    "size": 312,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 312
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fantasy island",
    "company": "Edison Chouest Offshore",
    "size": 312,
    "vesselType": "Specialty",
    "category": "Specialized",
    "specifications": {
      "length": 312
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fast Giant",
    "company": "Edison Chouest Offshore",
    "size": 194,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 194
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fast Goliath",
    "company": "Edison Chouest Offshore",
    "size": 194,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 194
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fast Hauler",
    "company": "Edison Chouest Offshore",
    "size": 194,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 194
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fast Leopard",
    "company": "Edison Chouest Offshore",
    "size": 201,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 201
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fast Lion",
    "company": "Edison Chouest Offshore",
    "size": 190,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 190
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Fast Tiger",
    "company": "Edison Chouest Offshore",
    "size": 196,
    "vesselType": "FSV",
    "category": "Supply",
    "specifications": {
      "length": 196
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Gibson Lab",
    "company": "Laborde Marine",
    "size": 240,
    "vesselType": "Support",
    "category": "Support",
    "specifications": {
      "length": 240
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Harvey Carrier",
    "company": "Harvey Gulf",
    "size": 280,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 280
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Harvey Champion",
    "company": "Harvey Gulf",
    "size": 310,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 310
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Harvey Freedom",
    "company": "Harvey Gulf",
    "size": 310,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 310
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Harvey Power",
    "company": "Harvey Gulf",
    "size": 310,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 310
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Harvey Provider",
    "company": "Harvey Gulf",
    "size": 240,
    "vesselType": "Support",
    "category": "Support",
    "specifications": {
      "length": 240
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Harvey Supporter",
    "company": "Harvey Gulf",
    "size": 310,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 310
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "HOS Black Foot",
    "company": "Hornbeck Offshore",
    "size": 310,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 310
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "HOS Blackhawk",
    "company": "Hornbeck Offshore",
    "size": 280,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 280
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "HOS Commander",
    "company": "Hornbeck Offshore",
    "size": 320,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 320
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "HOS Mauser",
    "company": "Hornbeck Offshore",
    "size": 280,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 280
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "HOS Panther",
    "company": "Hornbeck Offshore",
    "size": 280,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 280
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "HOS Ruger",
    "company": "Hornbeck Offshore",
    "size": 280,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 280
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Lightning",
    "company": "Jackson Offshore",
    "size": 252,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 252
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Lucy",
    "company": "Edison Chouest Offshore",
    "size": 270,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 270
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Millie",
    "company": "Edison Chouest Offshore",
    "size": 298,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 298
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Pelican Island",
    "company": "Edison Chouest Offshore",
    "size": 312,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 312
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Persistence Lab",
    "company": "Laborde Marine",
    "size": 150,
    "vesselType": "Support",
    "category": "Support",
    "specifications": {
      "length": 150
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Regulus",
    "company": "Tidewater Marine",
    "size": 272,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 272
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Ship Island",
    "company": "Edison Chouest Offshore",
    "size": 312,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 312
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Squall",
    "company": "Jackson Offshore",
    "size": 252,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 252
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  },
  {
    "vesselName": "Tucker Candies",
    "company": "Otto Candies",
    "size": 290,
    "vesselType": "OSV",
    "category": "Supply",
    "specifications": {
      "length": 290
    },
    "operationalArea": [
      "Gulf of Mexico"
    ],
    "status": "Active"
  }
];

// Helper functions for vessel classification
export const getVesselByName = (vesselName: string): VesselClassification | undefined => {
  return vesselClassificationData.find(vessel => 
    vessel.vesselName.toLowerCase() === vesselName.toLowerCase()
  );
};

export const getVesselsByCompany = (company: string): VesselClassification[] => {
  return vesselClassificationData.filter(vessel => 
    vessel.company.toLowerCase().includes(company.toLowerCase())
  );
};

export const getVesselsByType = (vesselType: string): VesselClassification[] => {
  return vesselClassificationData.filter(vessel => 
    vessel.vesselType.toLowerCase() === vesselType.toLowerCase()
  );
};

export const getVesselsByCategory = (category: string): VesselClassification[] => {
  return vesselClassificationData.filter(vessel => 
    vessel.category.toLowerCase() === category.toLowerCase()
  );
};

export const getVesselTypeFromName = (vesselName: string): string => {
  const vessel = getVesselByName(vesselName);
  return vessel?.vesselType || 'Unknown';
};

export const getVesselCompanyFromName = (vesselName: string): string => {
  const vessel = getVesselByName(vesselName);
  return vessel?.company || 'Unknown';
};

export const getVesselSizeFromName = (vesselName: string): number => {
  const vessel = getVesselByName(vesselName);
  return vessel?.size || 0;
};

// Statistics functions
export const getVesselStatistics = () => {
  const totalVessels = vesselClassificationData.length;
  const vesselsByType = vesselClassificationData.reduce((acc, vessel) => {
    acc[vessel.vesselType] = (acc[vessel.vesselType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const vesselsByCompany = vesselClassificationData.reduce((acc, vessel) => {
    acc[vessel.company] = (acc[vessel.company] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const averageSize = vesselClassificationData.reduce((sum, vessel) => sum + vessel.size, 0) / totalVessels;
  
  return {
    totalVessels,
    vesselsByType,
    vesselsByCompany,
    averageSize: Math.round(averageSize)
  };
};

export default vesselClassificationData;
