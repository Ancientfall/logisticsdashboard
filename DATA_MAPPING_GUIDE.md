# BP Logistics Dashboard - Data Mapping Guide

## Overview
This guide shows how your Excel files map to the PostgreSQL database tables.

## Database Tables Created

### 1. **voyage_events** - Voyage Event Data
Maps to Excel files containing voyage event information.

**Excel Columns → Database Fields:**
- `Mission` → `mission`
- `Event` → `event`
- `Parent Event` → `parent_event`
- `Location` → `location`
- `Quay` → `quay`
- `Remarks` → `remarks`
- `Is active?` → `is_active` (Yes/No → true/false)
- `From` → `from`
- `To` → `to`
- `Hours` → `hours`
- `Port Type` → `port_type`
- `Event Category` → `event_category`
- `Year` → `year`
- `Ins. 500m` → `ins_500m` (Yes/No → true/false)
- `Cost Dedicated to` → `cost_dedicated_to`
- `Vessel` → `vessel`
- `Voyage #` → `voyage_number`

### 2. **vessel_manifests** - Vessel Manifest Data
Maps to Excel files containing manifest details.

**Excel Columns → Database Fields:**
- `Voyage Id` → `voyage_id`
- `Manifest Number` → `manifest_number`
- `Transporter` → `transporter`
- `Type` → `type`
- `Manifest Date` → `manifest_date`
- `Cost Code` → `cost_code`
- `From` → `from`
- `Offshore Location` → `offshore_location`
- `Deck Lbs` → `deck_lbs`
- `Deck Tons` → `deck_tons`
- `RT Tons` → `rt_tons`
- `Lifts` → `lifts`
- `Wet Bulk (bbls)` → `wet_bulk_bbls`
- `Wet Bulk (gals)` → `wet_bulk_gals`
- `Deck Sqft` → `deck_sqft`
- `Remarks` → `remarks`
- `Year` → `year`

### 3. **cost_allocations** - Cost Allocation Data
Maps to Excel files containing cost allocation information.

**Excel Columns → Database Fields:**
- `LC Number` → `lc_number`
- `Rig Reference` → `rig_reference`
- `Description` → `description`
- `Cost Element` → `cost_element`
- `Month-Year` → `month_year`
- `Mission` → `mission`
- `Project Type` → `project_type`
- `Alloc (days)` or `Total Allocated Days` → `allocated_days`
- `Average Vessel Cost Per Day` → `avg_vessel_cost_per_day`
- `Total Cost` → `total_cost`
- `Rig Location` → `rig_location`
- `Rig Type` → `rig_type`
- `Water Depth` → `water_depth`


### 4. **bulk_actions** - Bulk Action Data
Maps to Excel files containing bulk cargo operations.

**Excel Columns → Database Fields:**
- `Vessel Name` or `Vessel` → `vessel_name`
- `Voyage Number` or `Voyage #` → `voyage_number`
- `Manifest Number` → `manifest_number`
- `Manifest Date` → `manifest_date`
- `From` → `from`
- `To` → `to`
- `Cargo Type` → `cargo_type`
- `Cargo Description` → `cargo_description`
- `Quantity` → `quantity`
- `Unit` → `unit`
- `Weight` → `weight`
- `Volume` → `volume`
- `Cost Code` → `cost_code`
- `Project Code` → `project_code`
- `Department` → `department`
- `Status` → `status` (default: 'pending')
- `Action Type` → `action_type`
- `Completed Date` → `completed_date`
- `Remarks` → `remarks`

### 5. **voyage_lists** - Voyage List/Summary Data
Maps to Excel files containing voyage summaries.

**Excel Columns → Database Fields:**
- `Vessel Name` or `Vessel` → `vessel_name`
- `Voyage Number` or `Voyage #` → `voyage_number`
- `Voyage Type` → `voyage_type`
- `Departure Port` → `departure_port`
- `Departure Date` → `departure_date`
- `Arrival Port` → `arrival_port`
- `Arrival Date` → `arrival_date`
- `Voyage Duration` → `voyage_duration` (in days)
- `Total Distance` → `total_distance` (nautical miles)
- `Fuel Consumption` → `fuel_consumption` (metric tons)
- `Cargo Capacity` → `cargo_capacity`
- `Cargo Utilization` → `cargo_utilization` (percentage)
- `Voyage Status` → `voyage_status` (planned/in_progress/completed/cancelled)
- `Charterer` → `charterer`
- `Operator` → `operator`
- `Master Name` → `master_name`
- `Total Crew` → `total_crew`
- `Voyage Purpose` → `voyage_purpose`
- `Total Revenue` → `total_revenue`
- `Total Cost` → `total_cost`
- `Profit` → `profit`
- `Remarks` → `remarks`

## Upload Endpoints

Each data type has its own upload endpoint:

```
POST /api/voyage/upload-events     → voyage_events table
POST /api/voyage/upload-manifests  → vessel_manifests table
POST /api/voyage/upload-costs      → cost_allocations table
POST /api/voyage/upload-bulk       → bulk_actions table
POST /api/voyage/upload-list       → voyage_lists table
```

## File Naming Recommendations

To ensure files are uploaded to the correct tables, use these naming patterns:

- **Voyage Events**: Include "voyage" and "event" (e.g., `voyage_events_2024.xlsx`)
- **Vessel Manifests**: Include "manifest" (e.g., `vessel_manifests_jan2024.xlsx`)
- **Cost Allocation**: Include "cost" or "allocation" (e.g., `cost_allocation_q1_2024.xlsx`)
- **Bulk Actions**: Include "bulk" (e.g., `bulk_actions_thunderhorse.xlsx`)
- **Voyage List**: Include "voyage" and "list" (e.g., `voyage_list_summary.xlsx`)

## Important Notes

1. **Case Insensitive**: Column matching is flexible - "Vessel Name", "vessel name", and "VESSEL NAME" all work
2. **Extra Columns**: Any columns not mapped are stored in the `metadata` field as JSON
3. **Missing Columns**: Missing columns default to null or 0 for numeric fields
4. **Date Formats**: Dates are automatically parsed from Excel date formats
5. **Numeric Fields**: Non-numeric values in numeric fields default to 0

## Data Validation

The upload process includes:
- Automatic date parsing and validation
- Numeric field conversion with fallback to 0
- Boolean field conversion (Yes/No → true/false)
- Department assignment based on LC numbers
- Transaction support (all-or-nothing uploads)