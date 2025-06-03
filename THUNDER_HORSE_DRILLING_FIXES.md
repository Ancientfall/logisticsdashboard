# Thunder Horse (Drilling) Metrics Fix Summary

## Problem
Thunder Horse (Drilling) location was not showing several metrics including:
- Lifts/hr
- Productive hours
- Waiting time
- Vessel utilization
- NPT percentage
- Weather impact
- Drilling voyages
- Maneuvering hours

## Root Causes Identified

1. **Location Name Matching Issues**
   - Thunder Horse appears with different variations in the data
   - The location filtering was not matching all variations

2. **Department Filtering Too Restrictive**
   - Many Thunder Horse events don't have department = 'Drilling' assigned
   - The dashboard was filtering out events without department classification

3. **LC Number Filtering Logic Error**
   - The drilling dashboard was excluding drilling LCs instead of including them
   - Thunder Horse drilling LCs (10101-10105) were being filtered out

4. **Location Mapping Inconsistencies**
   - Vessel manifests and voyage events use different location field names
   - Not checking both `location` and `mappedLocation` fields

## Fixes Applied

### 1. Enhanced Location Filtering (`DrillingDashboard.tsx`)
```typescript
// Added fuzzy matching for Thunder Horse variations
if (filters.selectedLocation === 'Thunder Horse (Drilling)') {
  return normalizedLocation.includes('thunder') && 
         (normalizedLocation.includes('drill') || 
          normalizedLocation.includes('pdq') ||
          normalizedLocation === 'thunder horse');
}
```

### 2. Fixed Drilling LC Filtering Logic
Changed from excluding non-drilling LCs to including drilling-related allocations:
```typescript
// Include if:
// 1. It's a drilling LC number
// 2. OR it's marked as Drilling department
// 3. OR it's a Drilling/Completions project type
// 4. OR it's at a drilling location
```

### 3. Improved Event and Manifest Filtering
- Now checks both `location` and `mappedLocation` fields
- For drilling locations, includes ALL events at that location (not just those marked as Drilling department)
- Added support for checking `offshoreLocation` in manifests

### 4. Enhanced Location Mapping (`masterFacilities.ts`)
Added more Thunder Horse variations to the mapping:
```typescript
'thunder horse drilling': 'Thunder Horse Drilling',
'thunder horse drill': 'Thunder Horse Drilling',
'thunder horse': 'Thunder Horse PDQ',
'thunderhorse': 'Thunder Horse PDQ',
```

### 5. Improved Vessel Manifest Processing
Enhanced Thunder Horse detection in vessel manifests:
```typescript
if (offshoreLocation.toLowerCase().includes("thunder horse drilling") ||
    (offshoreLocation.toLowerCase().includes("thunder horse") && 
     offshoreLocation.toLowerCase().includes("drill"))) {
  return "Thunder Horse Drilling";
}
```

### 6. Better Cost Allocation Location Assignment
Improved logic for determining Thunder Horse locations in cost allocations:
```typescript
if (isThunderHorse) {
  if (isDrilling || allLocationText.includes('drilling') || 
      description.toLowerCase().includes('drill')) {
    finalRigLocation = 'Thunder Horse Drilling';
  } else {
    // Default Thunder Horse to drilling if we can't determine
    finalRigLocation = 'Thunder Horse Drilling';
  }
}
```

### 7. Added Debug Logging
Added specific debug logging for Thunder Horse to help diagnose issues:
```typescript
if (filters.selectedLocation === 'Thunder Horse (Drilling)') {
  console.log('🔍 THUNDER HORSE DEBUG:');
  // ... detailed logging of events, manifests, and costs
}
```

## Testing Recommendations

1. Upload fresh data files to test the fixes
2. Navigate to Drilling Dashboard
3. Select "Thunder Horse (Drilling)" from the location dropdown
4. Verify that all metrics now show data:
   - Cargo Tons
   - Lifts per Hour
   - Productive Hours
   - Waiting Time
   - Vessel Utilization
   - NPT Percentage
   - Weather Impact
   - Drilling Voyages
   - Maneuvering Hours

## Debug Tools Created

Created `ThunderHorseDebugger.tsx` component for detailed diagnostics:
- Shows all Thunder Horse location variations found in data
- Displays department distribution
- Lists sample events and manifests
- Shows LC cost allocations

## Next Steps if Issues Persist

1. Check the browser console for debug messages when selecting Thunder Horse (Drilling)
2. Use the Thunder Horse Debugger component to see raw data
3. Verify that the Excel files contain Thunder Horse data with expected location names
4. Check if drilling LCs (10101-10105) exist in the cost allocation data