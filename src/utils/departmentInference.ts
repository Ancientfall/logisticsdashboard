import { masterFacilitiesData } from '../data/masterFacilities';

/**
 * Department inference utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Generate Production LC mapping from Master Facilities data
 * This ensures we always use the authoritative source for Production LC numbers
 * Updated to use comprehensive Production LC mappings from PowerBI
 */
const generateProductionLCMapping = (): Record<string, { department: "Production"; facility: string }> => {
  const mapping: Record<string, { department: "Production"; facility: string }> = {};
  
  // Extract Production LC numbers from Master Facilities
  masterFacilitiesData.forEach(facility => {
    if (facility.facilityType === 'Production' && facility.productionLCs) {
      // Parse comma-separated Production LC numbers
      const lcNumbers = facility.productionLCs.split(',').map(lc => lc.trim());
      
      lcNumbers.forEach(lcNumber => {
        if (lcNumber) { // Ensure not empty
          mapping[lcNumber] = {
            department: "Production",
            facility: facility.displayName
          };
        }
      });
    }
  });
  
  console.log('📋 Generated Production LC mapping from Master Facilities:', mapping);
  console.log(`🏭 Total Production LCs mapped: ${Object.keys(mapping).length}`);
  
  // Log breakdown by facility
  const facilityBreakdown = masterFacilitiesData
    .filter(f => f.facilityType === 'Production' && f.productionLCs)
    .map(f => `${f.displayName}: ${f.productionLCs!.split(',').length} LCs`)
    .join(', ');
  console.log(`🏭 Production LC breakdown: ${facilityBreakdown}`);
  
  return mapping;
};

// Generate the mapping dynamically from Master Facilities data
const PRODUCTION_LC_MAPPING = generateProductionLCMapping();

/**
 * Special LC numbers that auto-assign to Logistics when at Fourchon
 */
export const FOURCHON_LOGISTICS_LCS = ['999', '333', '7777', '8888'];

/**
 * Infer department from LC Number using Production LC mapping
 */
export const inferDepartmentFromLCNumber = (lcNumber: string): "Drilling" | "Production" | "Logistics" | undefined => {
  // Check Production LC Numbers from Master Facilities
  if (PRODUCTION_LC_MAPPING[lcNumber]) {
    return "Production";
  }
  
  // For other LC numbers, we'll rely on the Cost Allocation reference table
  // This function is used as a fallback when Cost Allocation lookup fails
  return undefined;
};

/**
 * Infer department from description text
 */
export const inferDepartmentFromDescription = (description: string | undefined): "Drilling" | "Production" | "Logistics" | undefined => {
  if (!description) return undefined;
  
  const desc = description.toLowerCase();
  
  // Enhanced drilling keywords - much more comprehensive
  if (desc.includes('drill') || desc.includes('completion') || desc.includes('workover') ||
      desc.includes('rig') || desc.includes('drilling') || desc.includes('spud') ||
      desc.includes('bha') || desc.includes('mud') || desc.includes('cementing') ||
      desc.includes('casing') || desc.includes('perforation') || desc.includes('fracturing') ||
      desc.includes('logging') || desc.includes('wireline') || desc.includes('coil') ||
      desc.includes('well') || desc.includes('bore') || desc.includes('hole') ||
      desc.includes('bit') || desc.includes('tubular') || desc.includes('pipe') ||
      desc.includes('test') || desc.includes('pressure') || desc.includes('flow') ||
      desc.includes('completion') || desc.includes('abandonment')) {
    return "Drilling";
  }
  
  // Enhanced production keywords - much more comprehensive  
  if (desc.includes('production') || desc.includes('prod') || desc.includes('facility') || 
      desc.includes('platform') || desc.includes('process') || desc.includes('separation') ||
      desc.includes('compression') || desc.includes('pipeline') || desc.includes('manifold') ||
      desc.includes('flowline') || desc.includes('riser') || desc.includes('subsea') ||
      desc.includes('umbilical') || desc.includes('tree') || desc.includes('header') ||
      desc.includes('export') || desc.includes('gas') || desc.includes('oil') ||
      desc.includes('condensate') || desc.includes('hydrocarbon') || desc.includes('crude') ||
      desc.includes('processing') || desc.includes('treating') || desc.includes('pdq') ||
      desc.includes('pq') || desc.includes('atlantis') || desc.includes('na kika') ||
      desc.includes('mad dog') || desc.includes('thunder horse') || desc.includes('argos')) {
    return "Production";
  }
  
  // Enhanced logistics keywords - much more comprehensive
  if (desc.includes('logistics') || desc.includes('fourchon') || desc.includes('supply') || 
      desc.includes('port') || desc.includes('base') || desc.includes('transport') ||
      desc.includes('vessel') || desc.includes('cargo') || desc.includes('freight') ||
      desc.includes('delivery') || desc.includes('loading') || desc.includes('unloading') ||
      desc.includes('manifest') || desc.includes('warehouse') || desc.includes('storage') ||
      desc.includes('inventory') || desc.includes('procurement') || desc.includes('charter') ||
      desc.includes('marine') || desc.includes('offshore') || desc.includes('onshore')) {
    return "Logistics";
  }
  
  return undefined;
};

/**
 * Infer department from location patterns
 */
export const inferDepartmentFromLocation = (location: string, portType: string): "Drilling" | "Production" | "Logistics" | undefined => {
  if (!location) return undefined;
  
  const loc = location.toLowerCase();
  
  // Known drilling locations
  const drillingLocations = [
    'drilling', 'drill', 'rig', 'blackhawk', 'blackhorse', 'blacklion', 'blacktip',
    'stena', 'ocean', 'deepwater', 'invictus', 'island', 'argos', 'venture'
  ];
  
  // Known production locations  
  const productionLocations = [
    'atlantis', 'na kika', 'mad dog', 'thunder horse', 'production', 'prod',
    'pdq', 'pq', 'facility', 'platform'
  ];
  
  // Known logistics locations
  const logisticsLocations = [
    'fourchon', 'port', 'base', 'supply', 'houston', 'cameron', 'venice',
    'intracoastal', 'dock', 'wharf', 'terminal'
  ];
  
  for (const pattern of drillingLocations) {
    if (loc.includes(pattern)) {
      return "Drilling";
    }
  }
  
  for (const pattern of productionLocations) {
    if (loc.includes(pattern)) {
      return "Production";
    }
  }
  
  for (const pattern of logisticsLocations) {
    if (loc.includes(pattern)) {
      return "Logistics";
    }
  }
  
  return undefined;
};

/**
 * Infer department from activity patterns (parent event + event)
 */
export const inferDepartmentFromActivity = (parentEvent: string | null, event: string | null): "Drilling" | "Production" | "Logistics" | undefined => {
  const parentLower = parentEvent?.toLowerCase() || '';
  const eventLower = event?.toLowerCase() || '';
  const combined = `${parentLower} ${eventLower}`.trim();
  
  // Drilling activity patterns
  const drillingPatterns = [
    'drilling', 'drill', 'rig', 'mud', 'cementing', 'casing', 'completion',
    'workover', 'logging', 'wireline', 'coiled tubing', 'perforation',
    'fracturing', 'well test', 'pressure test', 'abandon', 'plug'
  ];
  
  // Production activity patterns
  const productionPatterns = [
    'production', 'processing', 'separation', 'compression', 'pipeline',
    'flowline', 'manifold', 'subsea', 'tree', 'export', 'treating',
    'facility', 'platform', 'riser', 'umbilical'
  ];
  
  // Logistics activity patterns
  const logisticsPatterns = [
    'cargo ops', 'loading', 'unloading', 'cargo', 'freight', 'supply',
    'transport', 'vessel', 'marine', 'manifest', 'delivery', 'charter',
    'standby', 'transit', 'ballast', 'fuel', 'water', 'methanol'
  ];
  
  for (const pattern of drillingPatterns) {
    if (combined.includes(pattern)) {
      return "Drilling";
    }
  }
  
  for (const pattern of productionPatterns) {
    if (combined.includes(pattern)) {
      return "Production";
    }
  }
  
  for (const pattern of logisticsPatterns) {
    if (combined.includes(pattern)) {
      return "Logistics";
    }
  }
  
  return undefined;
};

/**
 * Infer department from remarks context
 */
export const inferDepartmentFromRemarks = (remarks: string | null | undefined): "Drilling" | "Production" | "Logistics" | undefined => {
  if (!remarks) return undefined;
  
  // Use the same logic as description inference but with remarks
  return inferDepartmentFromDescription(remarks);
};

/**
 * Extract rig location from description text
 * Handles various description formats like "MC 777 U / THUNDERHORSE/ DWP", "Thunder Horse", "Stena Ice Max"
 */
export const extractRigLocationFromDescription = (description: string): string | undefined => {
  if (!description) return undefined;
  
  const desc = description.trim().toLowerCase();
  
  // Known rig name patterns and their standardized names
  const rigMappings: Record<string, string> = {
    // Thunder Horse variations
    'thunder horse': 'Thunder Horse',
    'thunderhorse': 'Thunder Horse',
    'thr': 'Thunder Horse',
    
    // Stena IceMAX variations
    'stena ice max': 'Stena IceMAX',
    'stena icemax': 'Stena IceMAX',
    'stena': 'Stena IceMAX',
    'icemax': 'Stena IceMAX',
    
    // Ocean BlackLion variations
    'ocean blacklion': 'Ocean BlackLion',
    'ocean black lion': 'Ocean BlackLion',
    'blacklion': 'Ocean BlackLion',
    'black lion': 'Ocean BlackLion',
    
    // Ocean Blackhornet variations
    'ocean blackhornet': 'Ocean Blackhornet',
    'ocean black hornet': 'Ocean Blackhornet',
    'blackhornet': 'Ocean Blackhornet',
    'black hornet': 'Ocean Blackhornet',
    
    // Mad Dog variations
    'mad dog': 'Mad Dog',
    'maddog': 'Mad Dog',
    
    // Na Kika variations
    'na kika': 'Na Kika',
    'nakika': 'Na Kika',
    
    // Atlantis variations
    'atlantis': 'Atlantis',
    'atlantis pq': 'Atlantis',
    
    // Argos variations
    'argos': 'Argos',
    
    // Other known rigs
    'deepwater invictus': 'Deepwater Invictus',
    'island venture': 'Island Venture',
    'island intervention': 'Island Intervention',
    'auriga': 'Auriga',
    'c-constructor': 'C-Constructor'
  };
  
  // Check for direct matches
  for (const [pattern, standardName] of Object.entries(rigMappings)) {
    if (desc.includes(pattern)) {
      return standardName;
    }
  }
  
  // Extract from complex descriptions like "MC 777 U / THUNDERHORSE/ DWP"
  const complexMatches = desc.match(/(?:\/\s*)?([a-z\s]+)(?:\s*\/|$)/gi);
  if (complexMatches) {
    for (const match of complexMatches) {
      const cleaned = match.replace(/[/\s]+/g, ' ').trim().toLowerCase();
      for (const [pattern, standardName] of Object.entries(rigMappings)) {
        if (cleaned.includes(pattern)) {
          return standardName;
        }
      }
    }
  }
  
  return undefined;
}; 