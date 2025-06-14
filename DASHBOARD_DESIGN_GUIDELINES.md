# Dashboard Design Guidelines

## Overview
This document establishes the design patterns and guidelines for all dashboard components in the BP Logistics Analytics application, based on the successful redesign completed in 2025.

## Core Design Philosophy

### Simplicity Over Complexity
- **Remove visual clutter**: Eliminate complex progress bars, detailed breakdowns, and busy visualizations
- **Focus on essential data**: Display only the most important metrics prominently
- **Clean hierarchy**: Use clear information hierarchy with summary → details pattern

### Consistency Across Sections
- All dashboard sections should follow the same structural pattern
- Consistent spacing, typography, and color usage throughout
- Uniform component styling and behavior

## Standard Section Structure

Every dashboard section should follow this pattern:

```tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  {/* Header */}
  <div className="bg-gradient-to-r from-[color1] to-[color2] px-6 py-4">
    <h2 className="text-xl font-bold text-white flex items-center gap-2">
      <Icon className="w-6 h-6" />
      Section Title
    </h2>
  </div>
  
  <div className="p-6">
    {/* Summary Panel (Optional but recommended) */}
    <div className="bg-gradient-to-r from-[color]-50 to-[color]-50 rounded-lg p-4 mb-6 border border-[color]-200">
      {/* 2-4 key metrics in grid layout */}
    </div>

    {/* Content Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Simple metric cards */}
    </div>
  </div>
</div>
```

## Component Patterns

### 1. StatusDashboard (Performance Summary)
**Use for**: Main KPI overview at dashboard top
```tsx
<StatusDashboard
  title="Performance Summary"
  subtitle="Operations efficiency for all locations year-to-date"
  overallStatus="good"
  heroMetrics={[...]}
/>
```

**Features**:
- 6 KPI cards maximum
- Clean metric display with trend indicators
- Optional target values
- Consistent card styling

### 2. Summary Panel Pattern
**Use for**: Section-level key metrics overview
```tsx
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
    <div>
      <div className="text-2xl font-bold text-blue-600">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  </div>
</div>
```

### 3. Simple Metric Cards
**Use for**: Individual data points and breakdowns
```tsx
<div className="bg-gray-50 rounded-lg p-4 text-center">
  <div className="text-xl font-bold text-gray-900">{value}</div>
  <div className="text-sm text-gray-600">{label}</div>
</div>
```

## Color Palette & Usage

### Header Gradients
- **Blue to Indigo**: `bg-gradient-to-r from-blue-600 to-indigo-600`
- **Green to Emerald**: `bg-gradient-to-r from-green-600 to-emerald-600`
- **Purple to Pink**: `bg-gradient-to-r from-purple-600 to-pink-600`
- **Orange to Red**: `bg-gradient-to-r from-orange-600 to-red-600`

### Summary Panel Colors
- **Blue theme**: `from-blue-50 to-indigo-50` with `border-blue-200`
- **Green theme**: `from-green-50 to-emerald-50` with `border-green-200`
- **Gray neutral**: `from-gray-50 to-gray-100` with `border-gray-200`

### Metric Colors
- **Primary metrics**: `text-blue-600`, `text-green-600`, `text-indigo-600`
- **Secondary metrics**: `text-gray-900`
- **Labels**: `text-gray-600`
- **Subtle text**: `text-gray-500`

## What NOT to Use

### ❌ Avoid These Patterns
1. **Complex Progress Bars**: No animated progress bars with percentages
2. **Detailed Breakdowns**: No multi-level nested data displays
3. **Multiple Status Indicators**: No complex status dots/badges within cards
4. **Busy Visualizations**: No charts or graphs within dashboard sections
5. **Color-coded Progress**: No rainbow progress bars or complex color schemes

### ❌ Complex Visualization Examples
```tsx
// DON'T: Complex progress bar
<div className="w-full bg-gray-200 rounded-full h-2">
  <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }}></div>
</div>

// DON'T: Detailed status breakdown
<div className="flex items-start gap-2">
  <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
  <span className="text-sm text-gray-600">Fleet utilization up 8% this quarter</span>
</div>
```

## Typography Standards

### Headers
- **Section titles**: `text-xl font-bold text-white`
- **Card titles**: `text-sm font-medium text-gray-600`
- **Subsection headers**: `text-lg font-semibold text-gray-900`

### Metrics
- **Primary values**: `text-2xl font-bold text-[color]-600`
- **Secondary values**: `text-xl font-bold text-gray-900`
- **Small metrics**: `text-lg font-semibold text-gray-700`

### Labels
- **Primary labels**: `text-sm text-gray-600`
- **Secondary labels**: `text-xs text-gray-600`
- **Subtle labels**: `text-xs text-gray-500`

## Layout Guidelines

### Grid Systems
- **Mobile**: `grid-cols-1`
- **Tablet**: `md:grid-cols-2`
- **Desktop**: `lg:grid-cols-3` or `lg:grid-cols-4`

### Spacing
- **Section padding**: `p-6`
- **Card padding**: `p-4`
- **Grid gaps**: `gap-4` or `gap-6`
- **Margin bottom**: `mb-6` for summary panels

### Card Styling
- **Background**: `bg-white` for main cards, `bg-gray-50` for secondary
- **Borders**: `border border-gray-200`
- **Shadows**: `shadow-sm`
- **Rounded corners**: `rounded-xl` for sections, `rounded-lg` for cards

## Responsive Design

### Breakpoint Strategy
```tsx
// Standard responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Mobile Considerations
- Single column layout on mobile
- Touch-friendly target sizes
- Readable text at small sizes
- Simplified navigation

## Data Presentation

### Key Principles
1. **Most important data first**: Lead with summary metrics
2. **Limit cognitive load**: Show 6 items max per row
3. **Clear labeling**: Every number needs context
4. **Consistent formatting**: Use same number formats throughout

### Number Formatting
- **Large numbers**: Use abbreviations (1.2M, 5.3K)
- **Percentages**: Show with % symbol, 1 decimal place max
- **Currency**: Use $ symbol, appropriate abbreviations
- **Time**: Use consistent time units (hours, days)

## Implementation Checklist

When creating or updating a dashboard section:

- [ ] Uses standard section structure
- [ ] Has appropriate header with gradient and icon
- [ ] Includes summary panel if section has 3+ metrics
- [ ] Uses simple metric cards without progress bars
- [ ] Follows responsive grid layout
- [ ] Uses consistent color scheme
- [ ] Has clean typography hierarchy
- [ ] Avoids complex visualizations
- [ ] Shows essential data only
- [ ] Tests well on mobile devices

## Example Implementations

### Good Example: Fleet Analysis
```tsx
{/* Header */}
<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
  <h2 className="text-xl font-bold text-white flex items-center gap-2">
    <Ship className="w-6 h-6" />
    Fleet Analysis
  </h2>
</div>

{/* Summary Panel */}
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
    <div>
      <div className="text-2xl font-bold text-blue-600">50</div>
      <div className="text-xs text-gray-600">Total Vessels</div>
    </div>
  </div>
</div>

{/* Simple Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-gray-50 rounded-lg p-4 text-center">
    <div className="text-xl font-bold text-gray-900">8</div>
    <div className="text-sm text-gray-600">Drill Ships</div>
  </div>
</div>
```

## Conclusion

These guidelines ensure consistent, clean, and professional dashboard designs that prioritize usability and essential data presentation over visual complexity. Always prefer simplicity and clarity over detailed visualizations within dashboard sections.

For questions or exceptions to these guidelines, consult the development team lead.