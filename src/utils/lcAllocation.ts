import { MasterFacility, CostAllocation } from '../types';
import { 
  FOURCHON_LOGISTICS_LCS, 
  inferDepartmentFromLCNumber,
  inferDepartmentFromLocation,
  inferDepartmentFromActivity,
  inferDepartmentFromRemarks
} from './departmentInference';

/**
 * LC allocation processing utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

// LC Allocation interface
interface LCAllocation {
  lcNumber: string;
  percentage: number;
  originalLocation: string | null;
  mappedLocation: string;
  department: "Drilling" | "Production" | "Logistics" | null;
  isSpecialCase: boolean;
}

/**
 * Process LC allocations with complex multi-allocation format like "9358 45, 10137 12, 10101"
 */
export const processLCAllocations = (
  costDedicatedTo: string | null | undefined,
  location: string,
  parentEvent: string | null,
  event: string | null,
  remarks: string | null | undefined,
  portType: string,
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>,
  debugMode: boolean = false
): LCAllocation[] => {
  // Handle special case: Fourchon base operations
  if (location === "Fourchon" && portType === "base") {
    return [{
      lcNumber: "FOURCHON_BASE",
      percentage: 100,
      originalLocation: "Fourchon",
      mappedLocation: "Fourchon",
      department: "Logistics",
      isSpecialCase: true
    }];
  }
  
  // Handle missing LC info
  if (!costDedicatedTo || costDedicatedTo.trim() === '') {
    return [{
      lcNumber: "",
      percentage: 100,
      originalLocation: null,
      mappedLocation: location,
      department: null,
      isSpecialCase: false
    }];
  }
  
  // Parse multi-allocation LC string
  const allocations = parseLCAllocationString(costDedicatedTo);
  
  // Debug logging for LC allocation parsing (only log occasionally)
  if (debugMode && allocations.length > 1) {
    console.log(`🔍 Multi-LC allocation parsed: "${costDedicatedTo}" -> ${allocations.length} allocations:`, 
      allocations.map(a => `${a.lcNumber}: ${a.percentage}%`).join(', '));
  }
  
  // Convert to LCAllocation objects with department lookup
  return allocations.map(allocation => {
    const costAlloc = costAllocationMap.get(allocation.lcNumber);
    
    if (!costAlloc && allocation.lcNumber !== '' && debugMode) {
      console.warn(`⚠️ LC Number "${allocation.lcNumber}" not found in Cost Allocation reference data`);
    }
    
    // Determine department with enhanced logic
    let department: "Drilling" | "Production" | "Logistics" | null = null;
    
    // Special handling: Fourchon Logistics LCs
    if (location === "Fourchon" && FOURCHON_LOGISTICS_LCS.includes(allocation.lcNumber)) {
      department = "Logistics";
      if (debugMode) {
        console.log(`🚛 LC ${allocation.lcNumber} at Fourchon auto-assigned to Logistics (${allocation.percentage.toFixed(1)}%)`);
      }
    } else if (costAlloc?.department) {
      // Use department from Cost Allocation reference table (primary source)
      department = costAlloc.department;
    } else if (allocation.lcNumber) {
      // Fallback to Master Facilities Production LC mapping
      department = inferDepartmentFromLCNumber(allocation.lcNumber) || null;
    }
    
    // ENHANCED FALLBACK STRATEGIES - if still no department assignment
    if (!department && allocation.lcNumber) {
      // Strategy 1: Use location patterns for department inference
      department = inferDepartmentFromLocation(location, portType) || null;
      
      if (department && debugMode) {
        console.log(`🗺️ LC ${allocation.lcNumber} assigned to ${department} based on location "${location}" (${allocation.percentage.toFixed(1)}%)`);
      }
    }
    
    if (!department) {
      // Strategy 2: Use parent event and activity patterns
      department = inferDepartmentFromActivity(parentEvent, event) || null;
      
      if (department && debugMode) {
        console.log(`⚡ LC ${allocation.lcNumber || 'UNKNOWN'} assigned to ${department} based on activity "${parentEvent}" (${allocation.percentage.toFixed(1)}%)`);
      }
    }
    
    if (!department) {
      // Strategy 3: Use remarks context
      department = inferDepartmentFromRemarks(remarks) || null;
      
      if (department && debugMode) {
        console.log(`💬 LC ${allocation.lcNumber || 'UNKNOWN'} assigned to ${department} based on remarks (${allocation.percentage.toFixed(1)}%)`);
      }
    }
    
    // Final fallback: Default assignment based on location type
    if (!department) {
      if (portType === "rig") {
        // Most rig activities are either drilling or production
        if (location.toLowerCase().includes('drill') || 
            parentEvent?.toLowerCase().includes('drill') ||
            event?.toLowerCase().includes('drill')) {
          department = "Drilling";
          if (debugMode) {
            console.log(`🔧 LC ${allocation.lcNumber || 'UNKNOWN'} defaulted to Drilling for rig location (${allocation.percentage.toFixed(1)}%)`);
          }
        } else {
          department = "Production";
          if (debugMode) {
            console.log(`🏭 LC ${allocation.lcNumber || 'UNKNOWN'} defaulted to Production for rig location (${allocation.percentage.toFixed(1)}%)`);
          }
        }
      } else if (portType === "base") {
        department = "Logistics";
        if (debugMode) {
          console.log(`🚢 LC ${allocation.lcNumber || 'UNKNOWN'} defaulted to Logistics for base location (${allocation.percentage.toFixed(1)}%)`);
        }
      }
    }
    
    // Log department assignment for debugging (only occasionally)
    if (allocation.lcNumber && department && !FOURCHON_LOGISTICS_LCS.includes(allocation.lcNumber) && debugMode) {
      console.log(`🏢 LC ${allocation.lcNumber} assigned to ${department} department (${allocation.percentage.toFixed(1)}%)`);
    }
    
    return {
      lcNumber: allocation.lcNumber,
      percentage: allocation.percentage,
      originalLocation: costAlloc?.locationReference || null,
      mappedLocation: costAlloc?.locationReference || location,
      department,
      isSpecialCase: FOURCHON_LOGISTICS_LCS.includes(allocation.lcNumber) && location === "Fourchon"
    };
  });
};

/**
 * Parse LC allocation string like "9358 45, 10137 12, 10101" into individual allocations
 * Handles various scenarios:
 * - Only LC (no percent): Assume 100%
 * - Multiple LCs with percent: Use defined percentages
 * - Last LC without percent: Assign remainder
 * - Some LCs missing percent: Split remainder equally among those without
 * - Percent ≠ 100%: Normalize or flag for review
 * - Invalid values: Flag for review
 * - Alternate delimiters: Normalize first
 */
export const parseLCAllocationString = (costDedicatedTo: string): { lcNumber: string; percentage: number }[] => {
  if (!costDedicatedTo || costDedicatedTo.trim() === '') {
    return [];
  }
  
  // Normalize delimiters - replace semicolons, pipes, etc. with commas
  const normalized = costDedicatedTo
    .replace(/[;|]/g, ',')  // Replace semicolons and pipes with commas
    .replace(/\s*,\s*/g, ',')  // Normalize spacing around commas
    .trim();
  
  // Split by comma and clean up
  const parts = normalized.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return [];
  }
  
  // If only one part and no percentage, assume 100%
  if (parts.length === 1 && !parts[0].includes(' ')) {
    return [{
      lcNumber: parts[0].trim(),
      percentage: 100
    }];
  }
  
  const allocationsWithPercent: { lcNumber: string; percentage: number }[] = [];
  const allocationsWithoutPercent: string[] = [];
  let totalAllocatedPercentage = 0;
  
  // Parse each part to separate those with and without percentages
  for (const part of parts) {
    const tokens = part.trim().split(/\s+/);
    
    if (tokens.length === 1) {
      // LC number without percentage
      allocationsWithoutPercent.push(tokens[0]);
    } else if (tokens.length >= 2) {
      // LC number with potential percentage
      const lcNumber = tokens[0];
      const percentageStr = tokens[1];
      const percentage = parseFloat(percentageStr);
      
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        allocationsWithPercent.push({
          lcNumber,
          percentage
        });
        totalAllocatedPercentage += percentage;
      } else {
        console.warn(`Invalid percentage "${percentageStr}" for LC ${lcNumber}, treating as no percentage`);
        allocationsWithoutPercent.push(lcNumber);
      }
    }
  }
  
  // Calculate remainder for LCs without percentages
  const remainderPercentage = Math.max(0, 100 - totalAllocatedPercentage);
  
  // Handle LCs without percentages
  if (allocationsWithoutPercent.length > 0) {
    if (remainderPercentage > 0) {
      // Split remainder equally among LCs without percentages
      const percentagePerLC = remainderPercentage / allocationsWithoutPercent.length;
      
      for (const lcNumber of allocationsWithoutPercent) {
        allocationsWithPercent.push({
          lcNumber,
          percentage: percentagePerLC
        });
      }
      
      totalAllocatedPercentage = 100; // Should now equal 100%
    } else {
      // No remainder available - this is an error condition
      console.error(`No remainder percentage available for LCs without percentages: ${allocationsWithoutPercent.join(', ')} in "${costDedicatedTo}"`);
      
      // Assign 0% to these LCs (they'll be flagged for review)
      for (const lcNumber of allocationsWithoutPercent) {
        allocationsWithPercent.push({
          lcNumber,
          percentage: 0
        });
      }
    }
  }
  
  // Validate and normalize total percentage
  if (Math.abs(totalAllocatedPercentage - 100) > 0.01) {
    console.warn(`LC allocation percentages don't add up to 100%: ${totalAllocatedPercentage.toFixed(2)}% for "${costDedicatedTo}"`);
    
    // Normalize percentages to sum to 100% if we have valid allocations
    if (totalAllocatedPercentage > 0 && allocationsWithPercent.length > 0) {
      const normalizationFactor = 100 / totalAllocatedPercentage;
      allocationsWithPercent.forEach(allocation => {
        allocation.percentage *= normalizationFactor;
      });
      
      console.log(`📊 Normalized LC percentages for "${costDedicatedTo}":`, 
        allocationsWithPercent.map(a => `${a.lcNumber}: ${a.percentage.toFixed(1)}%`).join(', '));
    }
  }
  
  // Final validation - ensure all percentages are reasonable
  const finalAllocations = allocationsWithPercent.filter(allocation => {
    if (allocation.percentage < 0 || allocation.percentage > 100) {
      console.error(`Invalid final percentage ${allocation.percentage}% for LC ${allocation.lcNumber} in "${costDedicatedTo}"`);
      return false;
    }
    return true;
  });
  
  // Round percentages to avoid floating point precision issues
  finalAllocations.forEach(allocation => {
    allocation.percentage = Math.round(allocation.percentage * 100) / 100;
  });
  
  return finalAllocations;
}; 