# Cost Allocation Sheet Enhancement

## Overview
The Cost Allocation sheet has been enhanced to include additional cost and rig location information that enables more detailed cost analysis and vessel cost determination for rig locations.

## New Fields Added

### Cost Information Fields
- **Total Allocated Days**: Number of days allocated for this cost center
- **Average Vessel Cost Per Day**: Average daily cost for vessels at this location
- **Total Cost**: Total cost for this allocation (optional - can be calculated)
- **Cost Per Hour**: Calculated automatically from Total Cost and Total Allocated Days

### Rig Location Information Fields
- **Rig Location**: Name of the rig/drilling location
- **Rig Type**: Type of rig (e.g., "Drillship", "Semi-submersible", "Jack-up")
- **Water Depth**: Water depth at the rig location in feet

## Excel Column Structure

| Column | Field Name | Type | Required | Description |
|--------|------------|------|----------|-------------|
| A | LC Number | Text | Yes | Location Code number |
| B | Location Reference | Text | Yes | Reference location name |
| C | Description | Text | No | Description of the cost allocation |
| D | Cost Element | Text | No | Type of cost element |
| E | Month-Year | Text | No | Format: "2024-01" |
| F | Mission | Text | No | Mission type |
| **G** | **Total Allocated Days** | **Number** | **No** | **Days allocated for this cost center** |
| **H** | **Average Vessel Cost Per Day** | **Number** | **No** | **Daily vessel cost in USD** |
| **I** | **Total Cost** | **Number** | **No** | **Total cost in USD (optional)** |
| **J** | **Rig Location** | **Text** | **No** | **Name of the rig/drilling location** |
| **K** | **Rig Type** | **Text** | **No** | **Type of rig equipment** |
| **L** | **Water Depth** | **Number** | **No** | **Water depth in feet** |

## Example Data

```
LC Number | Location Reference | Description | Cost Element | Month-Year | Mission | Total Allocated Days | Average Vessel Cost Per Day | Total Cost | Rig Location | Rig Type | Water Depth
----------|-------------------|-------------|--------------|------------|---------|---------------------|----------------------------|------------|--------------|----------|------------
LC001     | Thunder Horse     | Drilling Support | Vessel Ops | 2024-01 | Drilling | 30 | 25000 | 750000 | Thunder Horse PDQ | Semi-submersible | 6050
LC002     | Na Kika          | Production Support | Vessel Ops | 2024-01 | Production | 25 | 22000 | 550000 | Na Kika | Production Platform | 6340
LC003     | Atlantis         | Mixed Operations | Vessel Ops | 2024-01 | Mixed | 28 | 24000 | 672000 | Atlantis | Semi-submersible | 7070
```

## Benefits of Enhancement

### 1. **Accurate Cost Analysis**
- Real cost data instead of estimated calculations
- Ability to track cost trends over time
- Department-specific cost allocation

### 2. **Rig Location Intelligence**
- Cost comparison between different rig types
- Water depth impact on operational costs
- Location-specific cost optimization

### 3. **Vessel Cost Optimization**
- Average vessel costs for different locations
- Cost per hour calculations for efficiency analysis
- ROI analysis for vessel deployment

### 4. **Enhanced Dashboard Features**
- **Cost per Hour KPI**: Real-time cost efficiency tracking
- **Rig Location Cost Analysis**: Visual breakdown of costs by rig
- **Cost Trends**: Month-over-month cost analysis
- **Water Depth vs Cost Analysis**: Understanding depth impact on costs

## Dashboard Integration

The enhanced cost data is automatically integrated into the Drilling Dashboard:

### New KPI Cards
- **Cost per Hour**: Shows average cost per operational hour
- **Total Cost (YTD)**: Uses actual cost data when available
- **Average Monthly Cost**: Based on real allocated days and costs

### New Chart Section
- **Rig Location Cost Analysis**: 
  - Visual breakdown of costs by rig location
  - Cost per day calculations
  - Rig type and water depth information
  - Total cost summaries

### Enhanced Performance Summary
- **Cost Efficiency**: Replaces generic metrics with cost-focused analysis
- **ROI Indicators**: Cost per hour and efficiency metrics

## Data Processing Logic

1. **Cost Calculation Priority**:
   - If `Total Cost` is provided, use it directly
   - If not provided, calculate as: `Total Allocated Days × Average Vessel Cost Per Day`
   - `Cost Per Hour` = `Total Cost ÷ (Total Allocated Days × 24)`

2. **Rig Location Analysis**:
   - Groups costs by rig location
   - Calculates total costs and days per location
   - Sorts by total cost (highest first)
   - Shows rig type and water depth for context

3. **Trend Analysis**:
   - Compares current period with previous period
   - Tracks cost efficiency improvements
   - Identifies cost optimization opportunities

## Implementation Notes

- All new fields are optional to maintain backward compatibility
- Existing Cost Allocation files will continue to work
- Enhanced features only appear when new data is available
- Mock data is used when real cost data is not provided

## File Upload Instructions

1. Add the new columns to your existing Cost Allocation Excel file
2. Fill in the cost and rig location data where available
3. Upload through the standard file upload process
4. The dashboard will automatically detect and use the enhanced data

The system will gracefully handle both old and new format files, ensuring a smooth transition to the enhanced cost analysis capabilities. 