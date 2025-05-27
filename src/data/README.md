# Master Facilities Data

This directory contains static reference data for the BP Logistics Dashboard.

## Master Facilities (`masterFacilities.ts`)

Contains hardcoded facility data for BP Gulf of Mexico operations. This data is based on the PowerBI PowerQuery model and includes:

### Facility Types
- **Production Facilities**: Argos, Atlantis PQ, Na Kika, Thunder Horse Prod, Mad Dog Prod
- **Drilling Rigs**: Ocean Blackhornet, Ocean BlackLion, Deepwater Invictus, Island Venture, Stena IceMAX, Auriga, Island Intervention, C-Constructor, Thunder Horse Drilling, Mad Dog Drilling
- **Integrated Facilities**: Thunder Horse PDQ, Mad Dog (combines production and drilling)

### Key Features
- **Production LCs**: Comma-separated LC numbers for production facilities to help differentiate drilling vs production operations
- **Capability Flags**: `IsProductionCapable` and `IsDrillingCapable` for easy filtering
- **Hierarchy**: Parent-child relationships (e.g., Thunder Horse Drilling → Thunder Horse PDQ)
- **Utility Functions**: Helper functions for common queries

### Updating the Data

To add or modify facilities:

1. Edit the `MASTER_FACILITIES` array in `masterFacilities.ts`
2. Follow the existing data structure
3. Update `SortOrder` to maintain proper ordering
4. For production facilities, include the LC numbers in `ProductionLCs`
5. Set appropriate capability flags

### Usage in Code

```typescript
import { 
  getMasterFacilitiesData, 
  getFacilityByName, 
  getProductionFacilities,
  isProductionFacility 
} from '../data/masterFacilities';

// Get all facilities
const facilities = getMasterFacilitiesData();

// Find specific facility
const argos = getFacilityByName('Argos');

// Get production facilities only
const productionFacilities = getProductionFacilities();

// Check if facility is production-capable
const isProduction = isProductionFacility('Na Kika'); // true
```

### Why Static Data?

This data is hardcoded because:
- It changes very rarely (maybe once per quarter)
- Eliminates the need for users to upload a master facilities file
- Ensures data consistency across all dashboard instances
- Reduces upload complexity for end users
- Matches the PowerBI model structure exactly

### Data Source

Based on the PowerBI PowerQuery model with the following transformations:
- Added category classification
- Added integrated facility flags
- Standardized naming conventions
- Added utility functions for common operations 