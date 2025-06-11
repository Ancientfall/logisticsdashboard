export enum BulkFluidCategory {
  DRILLING = 'Drilling',
  COMPLETION_INTERVENTION = 'Completion/Intervention',
  PRODUCTION_CHEMICAL = 'Production Chemical',
  UTILITY = 'Utility',
  PETROLEUM = 'Petroleum',
  OTHER = 'Other'
}

export enum DrillingFluidType {
  WBM = 'WBM',
  SBM = 'SBM',
  OBM = 'OBM',
  PREMIX = 'Premix',
  BASEOIL = 'Baseoil'
}

export enum CompletionFluidType {
  CALCIUM_BROMIDE = 'Calcium Bromide',
  CALCIUM_CHLORIDE = 'Calcium Chloride',
  CALCIUM_CHLORIDE_BROMIDE = 'Calcium Chloride/Calcium Bromide',
  SODIUM_CHLORIDE = 'Sodium Chloride',
  KCL = 'KCL',
  CLAYFIX = 'Clayfix'
}

export enum ProductionFluidType {
  ASPHALTENE_INHIBITOR = 'Asphaltene Inhibitor',
  CALCIUM_NITRATE = 'Calcium Nitrate (Petrocare 45)',
  METHANOL = 'Methanol',
  XYLENE = 'Xylene',
  CORROSION_INHIBITOR = 'Corrosion Inhibitor',
  SCALE_INHIBITOR = 'Scale Inhibitor',
  LDHI = 'LDHI',
  SUBSEA_525 = 'Subsea 525'
}

export interface BulkFluidClassification {
  category: BulkFluidCategory;
  specificType?: string;
  isDrillingFluid: boolean;
  isCompletionFluid: boolean;
}

const DRILLING_FLUID_KEYWORDS = [
  'wbm', 'water based mud',
  'sbm', 'synthetic based mud',
  'obm', 'oil based mud',
  'premix', 'pre-mix',
  'baseoil', 'base oil', 'base-oil',
  'drilling mud', 'drilling fluid',
  'mud', 'drill fluid'
];

const COMPLETION_FLUID_KEYWORDS = [
  'calcium bromide', 'cabr2', 'ca br2',
  'calcium chloride', 'cacl2', 'ca cl2',
  'sodium chloride', 'nacl', 'na cl',
  'kcl', 'potassium chloride',
  'clayfix', 'clay fix',
  'completion fluid', 'completion brine',
  'intervention fluid', 'workover fluid'
];

const PRODUCTION_FLUID_KEYWORDS = [
  'asphaltene inhibitor', 'asphaltene',
  'calcium nitrate', 'petrocare 45', 'petrocare',
  'methanol',
  'xylene',
  'corrosion inhibitor',
  'scale inhibitor',
  'ldhi', 'low dosage hydrate inhibitor',
  'subsea 525', 'subsea525'
];

export function classifyBulkFluid(bulkType: string, description?: string): BulkFluidClassification {
  const combinedText = `${bulkType} ${description || ''}`.toLowerCase();
  
  // Check for drilling fluids
  for (const keyword of DRILLING_FLUID_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      let specificType: string | undefined;
      
      if (combinedText.includes('wbm') || combinedText.includes('water based')) {
        specificType = DrillingFluidType.WBM;
      } else if (combinedText.includes('sbm') || combinedText.includes('synthetic')) {
        specificType = DrillingFluidType.SBM;
      } else if (combinedText.includes('obm') || combinedText.includes('oil based')) {
        specificType = DrillingFluidType.OBM;
      } else if (combinedText.includes('premix') || combinedText.includes('pre-mix')) {
        specificType = DrillingFluidType.PREMIX;
      } else if (combinedText.includes('baseoil') || combinedText.includes('base oil')) {
        specificType = DrillingFluidType.BASEOIL;
      }
      
      return {
        category: BulkFluidCategory.DRILLING,
        specificType,
        isDrillingFluid: true,
        isCompletionFluid: false
      };
    }
  }
  
  // Check for completion/intervention fluids
  for (const keyword of COMPLETION_FLUID_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      let specificType: string | undefined;
      
      if (combinedText.includes('calcium bromide') || combinedText.includes('cabr')) {
        specificType = CompletionFluidType.CALCIUM_BROMIDE;
      } else if (combinedText.includes('calcium chloride') && combinedText.includes('bromide')) {
        specificType = CompletionFluidType.CALCIUM_CHLORIDE_BROMIDE;
      } else if (combinedText.includes('calcium chloride') || combinedText.includes('cacl')) {
        specificType = CompletionFluidType.CALCIUM_CHLORIDE;
      } else if (combinedText.includes('sodium chloride') || combinedText.includes('nacl')) {
        specificType = CompletionFluidType.SODIUM_CHLORIDE;
      } else if (combinedText.includes('kcl') || combinedText.includes('potassium')) {
        specificType = CompletionFluidType.KCL;
      } else if (combinedText.includes('clayfix') || combinedText.includes('clay fix')) {
        specificType = CompletionFluidType.CLAYFIX;
      }
      
      return {
        category: BulkFluidCategory.COMPLETION_INTERVENTION,
        specificType,
        isDrillingFluid: false,
        isCompletionFluid: true
      };
    }
  }
  
  // Check for production fluids
  for (const keyword of PRODUCTION_FLUID_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      let specificType: string | undefined;
      
      if (combinedText.includes('asphaltene')) {
        specificType = ProductionFluidType.ASPHALTENE_INHIBITOR;
      } else if (combinedText.includes('calcium nitrate') || combinedText.includes('petrocare')) {
        specificType = ProductionFluidType.CALCIUM_NITRATE;
      } else if (combinedText.includes('methanol')) {
        specificType = ProductionFluidType.METHANOL;
      } else if (combinedText.includes('xylene')) {
        specificType = ProductionFluidType.XYLENE;
      } else if (combinedText.includes('corrosion inhibitor')) {
        specificType = ProductionFluidType.CORROSION_INHIBITOR;
      } else if (combinedText.includes('scale inhibitor')) {
        specificType = ProductionFluidType.SCALE_INHIBITOR;
      } else if (combinedText.includes('ldhi') || combinedText.includes('low dosage hydrate')) {
        specificType = ProductionFluidType.LDHI;
      } else if (combinedText.includes('subsea 525') || combinedText.includes('subsea525')) {
        specificType = ProductionFluidType.SUBSEA_525;
      }
      
      return {
        category: BulkFluidCategory.PRODUCTION_CHEMICAL,
        specificType,
        isDrillingFluid: false,
        isCompletionFluid: false
      };
    }
  }
  
  // Check for other categories
  if (combinedText.includes('chemical') && !combinedText.includes('drilling')) {
    return {
      category: BulkFluidCategory.PRODUCTION_CHEMICAL,
      isDrillingFluid: false,
      isCompletionFluid: false
    };
  }
  
  if (combinedText.includes('water') && !combinedText.includes('mud')) {
    return {
      category: BulkFluidCategory.UTILITY,
      isDrillingFluid: false,
      isCompletionFluid: false
    };
  }
  
  if (combinedText.includes('oil') || combinedText.includes('fuel') || combinedText.includes('diesel')) {
    return {
      category: BulkFluidCategory.PETROLEUM,
      isDrillingFluid: false,
      isCompletionFluid: false
    };
  }
  
  return {
    category: BulkFluidCategory.OTHER,
    isDrillingFluid: false,
    isCompletionFluid: false
  };
}

export function getDrillingFluidTypes(): string[] {
  return Object.values(DrillingFluidType);
}

export function getCompletionFluidTypes(): string[] {
  return Object.values(CompletionFluidType);
}

export function getProductionFluidTypes(): string[] {
  return Object.values(ProductionFluidType);
}