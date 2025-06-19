# Stena IceMAX Voyage Count Debug Report

## Issue Summary
The user expects to see 22 voyages for "Stena IceMAX" in May 2025, but the dashboard is showing 0 voyages.

## Root Cause Analysis

### 1. Vessel Name Issue ❌
**Finding:** The vessel "Stena IceMAX" does not exist in the voyage data.

**Evidence:**
- Total voyages in Excel file: 1,228
- Total unique vessels: 30
- Stena vessels found: 0
- IceMAX vessels found: 0
- Vessels containing both "stena" and "ice": 0

### 2. May 2025 Data Analysis 📊
**Total May 2025 voyages:** 86 voyages across 13 vessels

**Top vessels by voyage count in May 2025:**
1. Fast Leopard: 15 voyages
2. Fast Goliath: 14 voyages  
3. Squall: 7 voyages
4. Lightning: 7 voyages
5. Amber: 7 voyages
6. HOS Panther: 6 voyages
7. Pelican Island: 5 voyages
8. Tucker Candies: 5 voyages
9. Ship Island: 5 voyages
10. Dauphin Island: 5 voyages

**No vessel has exactly 22 voyages in May 2025.**

### 3. Complete Vessel List
```
Ship Island, Dauphin Island, Fast Leopard, Fast Goliath, Lightning, 
Pelican Island, Amber, Harvey Supporter, Fantasy Island, HOS Panther, 
Squall, Tucker Candies, Harvey Carrier, HOS Black Foot, Harvey Provider, 
Fast Giant, Robin, Lucy, Charlie Comeaux, Harvey Freedom, Squall B, 
HOS Future, HOS Achiever, Endeavor, HOS Iron Horse, HOS Red Dog, 
HOS Bayou, Uncle John, Cappy Bisso, Catherine Bisso
```

## Possible Explanations

### 1. Data File Mismatch
The user may be expecting data from a different dataset that contains "Stena IceMAX" voyages. The current Excel file (`Voyage List.xlsx`) may not be the complete or correct dataset.

### 2. Vessel Name Variation
"Stena IceMAX" might be recorded under a different name in the data, though no similar variants were found.

### 3. Date Range Issue
The expected 22 voyages might be from a different time period or the date parsing might have issues.

### 4. Data Processing Issue
There could be an issue in how the dashboard processes and filters the voyage data.

## Debugging Tools Implemented

### 1. VoyageDebugPanel Component
- **Location:** `/src/components/debug/VoyageDebugPanel.tsx`
- **Features:**
  - Real-time vessel name and date filtering
  - Duplicate detection
  - Date issue identification
  - Detailed voyage listing
  - Console logging capability

### 2. Enhanced Dashboard Logging
- **Location:** `VoyageAnalyticsDashboard.tsx`
- **Features:**
  - Automatic Stena IceMAX logging when May 2025 is selected
  - Filter debugging information
  - Date parsing validation

### 3. Debug Button
- Added a red "Debug" button to the VoyageAnalyticsDashboard header
- Opens the VoyageDebugPanel for detailed analysis

### 4. Node.js Analysis Scripts
- `debug_voyage_data.js` - Direct Excel file analysis
- `debug_vessel_names.js` - Vessel name discovery
- `debug_may_2025_analysis.js` - May 2025 specific analysis

## How to Use the Debug Tools

### 1. Dashboard Debug Panel
1. Navigate to the Voyage Analytics Dashboard
2. Click the red "Debug" button in the top-right corner
3. Enter "Stena IceMAX" in the Vessel field
4. Enter "May 2025" in the Month field
5. Review the analysis results

### 2. Browser Console Debugging
1. Open browser developer tools (F12)
2. Navigate to Voyage Analytics Dashboard
3. Select "May 2025" from the month filter
4. Check console for "🚢 STENA ICEMAX DEBUG" logs

### 3. Command Line Analysis
```bash
node debug_voyage_data.js     # Analyze Stena IceMAX specifically
node debug_vessel_names.js    # Show all vessel names
node debug_may_2025_analysis.js # Find vessels with 22 voyages
```

## Recommendations

### 1. Verify Data Source
- Confirm the correct Excel file is being used
- Check if there are additional voyage data files
- Verify the expected vessel name spelling

### 2. Check Data Processing
- Use the debug panel to verify data is loaded correctly
- Check if vessel names are being processed/standardized
- Verify date parsing is working correctly

### 3. Alternative Investigation
If "Stena IceMAX" should exist:
- Check the raw Excel file manually
- Look for similar vessel names that might be standardized
- Verify the voyage date range expectations

## Expected Outcome
Once the correct data source or vessel name is identified, the dashboard should display the expected 22 voyages for the correct vessel in May 2025.

## Files Modified
- `/src/components/dashboard/VoyageAnalyticsDashboard.tsx` - Added debug button and logging
- `/src/components/debug/VoyageDebugPanel.tsx` - New debug panel component
- `debug_voyage_data.js` - Excel analysis script
- `debug_vessel_names.js` - Vessel name analysis script  
- `debug_may_2025_analysis.js` - May 2025 specific analysis script