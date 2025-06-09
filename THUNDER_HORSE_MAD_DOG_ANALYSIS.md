# Thunder Horse Prod and Mad Dog Prod Analysis

## Executive Summary

Thunder Horse Prod and Mad Dog Prod are showing zero values in the Drilling Dashboard because they are **Production facilities**, not Drilling facilities. The dashboard is correctly filtering them out as it should only show drilling-related costs.

## Key Findings

### 1. Facility Classification

**Thunder Horse has two separate operations:**
- **Thunder Horse Drilling** - A drilling rig with LCs: 10101, 10102, 10103, 10104, 10105
- **Thunder Horse Prod** - A production facility with LCs: 9360, 10099, 10081, 10074, 10052

**Mad Dog has two separate operations:**
- **Mad Dog Drilling** - A drilling rig with LCs: 10106, 10107, 10108, 10109, 10110  
- **Mad Dog Prod** - A production facility with LCs: 9358, 10097, 10084, 10072, 10067

### 2. Dashboard Behavior

The Drilling Dashboard correctly:
1. Identifies all Production LC numbers from the master facilities data
2. Excludes any cost allocation records with Production LC numbers
3. Only includes records with Drilling LC numbers or drilling department classification

This is why Thunder Horse Prod and Mad Dog Prod show 0 - they are being filtered out because they are production facilities.

### 3. Location Mapping Enhancement

I've updated the `mapCostAllocationLocation` function to properly map:
- "Thunder Horse Prod" → Thunder Horse Prod facility
- "Thunder Horse Production" → Thunder Horse Prod facility  
- "Mad Dog Prod" → Mad Dog Prod facility
- "Mad Dog Production" → Mad Dog Prod facility

This ensures proper facility identification during cost allocation processing.

## Recommendations

### 1. Dashboard Selection
- Use the **Production Dashboard** to view Thunder Horse Prod and Mad Dog Prod costs
- Use the **Drilling Dashboard** to view Thunder Horse Drilling and Mad Dog Drilling costs

### 2. Data Validation
When importing cost allocation data, ensure:
- Production activities use the correct Production LC numbers
- Drilling activities use the correct Drilling LC numbers
- Location names match the expected format (e.g., "Thunder Horse Prod" for production, "Thunder Horse Drilling" for drilling)

### 3. Mixed Operations
For integrated facilities like Thunder Horse and Mad Dog that have both drilling and production:
- The system correctly separates costs based on LC numbers
- Each operation type (drilling vs production) has its own dedicated LC range
- This ensures accurate departmental allocation and reporting

## Technical Details

### Production LC Filtering Logic
```typescript
// In DrillingDashboard.tsx
const productionLCs = getAllProductionLCsSet(); // Gets all production LCs
const drillingLCs = getAllDrillingLCs(); // Gets all drilling LCs

// Filter cost allocation for drilling only
const drillingCostAllocation = costAllocation.filter(cost => {
  const lcNumber = String(cost.lcNumber || '').trim();
  const isProductionLC = productionLCs.has(lcNumber);
  
  // Exclude if it's a production LC
  if (isProductionLC) {
    return false;
  }
  
  // Include if it's a drilling LC or drilling department
  return drillingLCs.has(lcNumber) || cost.department === 'Drilling';
});
```

This filtering ensures production costs don't appear in the drilling dashboard, maintaining accurate departmental separation.