# Vessel Requirement Calculator

## Overview

The Vessel Requirement Calculator is a new dashboard feature that analyzes voyage patterns by rig location and calculates optimal PSV (Platform Supply Vessel) fleet requirements using the whiteboard formula:

**PSV vessels required = (number of vessels × 7 days per week) ÷ 24 hours per day**

## Features

### 1. Rig Location Analysis
- **Automatic Location Mapping**: Maps common rig abbreviations to full names
  - TH → Thunder Horse
  - MD → Mad Dog  
  - BC → Blind Faith Complex
  - BSC → Big Scar
  - JT → Jack/St. Malo
  - NK → Na Kika
  - AT → Atlantis
  - AR → Argos

### 2. Voyage Pattern Analysis
- **Weekly Voyage Frequency**: Calculates average voyages per week for each rig
- **Daily Requirements**: Converts to daily voyage requirements
- **Duration Analysis**: Tracks average voyage duration in hours
- **Vessel Utilization**: Measures current fleet utilization percentage

### 3. Fleet Optimization
- **Recommended Fleet Size**: Calculates optimal number of vessels needed
- **Utilization Metrics**: Shows current vs optimal utilization
- **Efficiency Scoring**: Rates rig operations efficiency
- **Underutilization Detection**: Identifies rigs with <50% utilization

### 4. Interactive Dashboard
- **Summary Cards**: Key metrics at a glance
- **Formula Breakdown**: Shows calculation components
- **Detailed Tables**: Rig-by-rig analysis with sorting
- **Insights Panel**: Actionable recommendations
- **Export Functions**: Report and data export capabilities

## How It Works

### Data Sources
The calculator analyzes three main data sources:
1. **Voyage List**: Route information and voyage patterns
2. **Vessel Manifests**: Cargo and destination details  
3. **Voyage Events**: Detailed operational activities

### Calculation Logic
1. **Location Normalization**: Standardizes rig names using mapping table
2. **Voyage Filtering**: Identifies voyages serving each rig location
3. **Pattern Analysis**: Calculates frequency and duration statistics
4. **Requirement Calculation**: Applies whiteboard formula:
   ```
   Required Vessels = (Weekly Voyages × Avg Duration) ÷ (7 days × 24 hours)
   ```
5. **Utilization Analysis**: Compares current vs optimal fleet size

### Key Metrics
- **Total Rigs**: Number of offshore locations analyzed
- **Current Vessels**: Existing fleet size
- **Recommended Vessels**: Calculated optimal fleet size
- **Fleet Utilization**: Percentage of fleet capacity being used
- **Efficiency Score**: Combined utilization and frequency rating

## Using the Dashboard

### Navigation
Access via: **Dashboard Showcase → Vessel Requirements**
Route: `/vessel-requirements`

### Main Sections

#### 1. Executive Summary
- Quick overview of fleet status
- Key performance indicators
- Formula breakdown visualization

#### 2. Rig Analysis Table
- **Overview Tab**: High-level metrics per rig
- **Details Tab**: Operational specifics (duration, frequency)

#### 3. Insights & Recommendations
Automated analysis providing:
- Fleet expansion/reduction recommendations
- Utilization improvement suggestions
- Underutilized rig identification

#### 4. Export Options
- **Export Report**: Text-based analysis report
- **Export Data**: JSON data for further analysis

## Example Output

### Sample Rig Analysis
```
RIG CODE | LOCATION        | VOYAGES | WEEKLY | VESSELS | UTIL%
---------|-----------------|---------|--------|---------|-------
TH       | Thunder Horse   | 45      | 8.2    | 3       | 78.5%
MD       | Mad Dog         | 38      | 6.9    | 2       | 82.1%
BC       | Blind Faith     | 22      | 4.0    | 2       | 57.1%
NK       | Na Kika         | 31      | 5.6    | 2       | 80.0%
```

### Recommendations Example
- **Fleet Expansion**: Consider adding 2 vessels to meet optimal demand
- **Route Optimization**: 3 rigs show utilization below 60%
- **Efficiency Focus**: Thunder Horse shows highest demand requiring priority

## Technical Implementation

### Core Files
- `src/utils/vesselRequirementCalculator.ts`: Main calculation logic
- `src/components/dashboard/VesselRequirementDashboard.tsx`: React dashboard component
- `src/utils/__tests__/vesselRequirementCalculator.test.ts`: Unit tests

### Key Functions
- `normalizeRigLocation()`: Standardizes location names
- `analyzeRigVoyagePattern()`: Analyzes patterns for single rig
- `calculateVesselRequirements()`: Main calculation function
- `generateVesselRequirementReport()`: Creates exportable report

### Data Types
- `RigVoyagePattern`: Individual rig analysis results
- `VesselRequirementSummary`: Complete fleet analysis
- `RIG_LOCATION_MAPPINGS`: Location standardization map

## Integration Points

### Dashboard Showcase
Added as new tile in dashboard selection grid with Calculator icon and teal gradient.

### React Router
New route: `/vessel-requirements` integrated in `App.tsx`

### Data Context
Uses existing `useData()` hook to access:
- `voyageList`: Voyage patterns and routes
- `vesselManifests`: Cargo and destination data
- `voyageEvents`: Detailed operational activities

## Benefits

### Operational Excellence
- **Data-Driven Decisions**: Quantitative basis for fleet sizing
- **Cost Optimization**: Right-size fleet to avoid over/under capacity
- **Efficiency Improvement**: Identify underutilized assets

### Strategic Planning
- **Capacity Planning**: Forecast vessel needs for new projects
- **Budget Allocation**: Optimize vessel charter costs
- **Performance Monitoring**: Track fleet utilization trends

### Tactical Operations
- **Route Optimization**: Focus on high-demand rigs
- **Resource Allocation**: Prioritize vessel assignments
- **Utilization Improvement**: Address underperforming routes

## Future Enhancements

Potential improvements include:
- Historical trend analysis
- Seasonal demand patterns
- Weather impact correlation
- Cost per voyage calculations
- Predictive demand modeling
- Integration with charter rates

## Testing

The calculator includes comprehensive unit tests covering:
- Location normalization logic
- Voyage pattern analysis
- Fleet requirement calculations
- Edge cases and error handling

Run tests with:
```bash
npm test -- --testPathPattern=vesselRequirementCalculator.test.ts
```