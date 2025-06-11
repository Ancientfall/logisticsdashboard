import { BulkAction } from '../types';
import { classifyBulkFluid } from './bulkFluidClassification';

export interface BulkFluidDebugInfo {
  totalBulkActions: number;
  drillingFluids: number;
  completionFluids: number;
  otherFluids: number;
  uniqueBulkTypes: string[];
  uniqueDescriptions: string[];
  sampleMisclassified: Array<{
    bulkType: string;
    description?: string;
    classification: string;
    isDrillingFluid: boolean;
    isCompletionFluid: boolean;
  }>;
}

export function debugBulkFluidClassification(bulkActions: BulkAction[]): BulkFluidDebugInfo {
  const uniqueBulkTypes = new Set<string>();
  const uniqueDescriptions = new Set<string>();
  const misclassified: BulkFluidDebugInfo['sampleMisclassified'] = [];
  
  let drillingCount = 0;
  let completionCount = 0;
  let otherCount = 0;
  
  bulkActions.forEach(action => {
    uniqueBulkTypes.add(action.bulkType);
    if (action.bulkDescription) {
      uniqueDescriptions.add(action.bulkDescription);
    }
    
    // Re-classify to check
    const classification = classifyBulkFluid(action.bulkType, action.bulkDescription);
    
    if (action.isDrillingFluid) {
      drillingCount++;
    } else if (action.isCompletionFluid) {
      completionCount++;
    } else {
      otherCount++;
    }
    
    // Check if there's a mismatch between the stored classification and the recalculated one
    if (action.isDrillingFluid !== classification.isDrillingFluid || 
        action.isCompletionFluid !== classification.isCompletionFluid) {
      misclassified.push({
        bulkType: action.bulkType,
        description: action.bulkDescription,
        classification: classification.category,
        isDrillingFluid: classification.isDrillingFluid,
        isCompletionFluid: classification.isCompletionFluid
      });
    }
  });
  
  const debugInfo: BulkFluidDebugInfo = {
    totalBulkActions: bulkActions.length,
    drillingFluids: drillingCount,
    completionFluids: completionCount,
    otherFluids: otherCount,
    uniqueBulkTypes: Array.from(uniqueBulkTypes).sort(),
    uniqueDescriptions: Array.from(uniqueDescriptions).sort(),
    sampleMisclassified: misclassified.slice(0, 10) // First 10 samples
  };
  
  // Log to console for debugging
  console.log('🔍 Bulk Fluid Classification Debug:', debugInfo);
  console.log('📊 Unique Bulk Types:', debugInfo.uniqueBulkTypes);
  console.log('📝 Unique Descriptions:', debugInfo.uniqueDescriptions);
  
  if (misclassified.length > 0) {
    console.warn('⚠️ Potentially misclassified items:', misclassified);
  }
  
  return debugInfo;
}