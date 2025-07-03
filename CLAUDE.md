# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server (runs on http://localhost:3000)
npm start

# Start development with local Excel server
npm run dev

# Start local Excel server only
npm run excel-server

# Build for production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Testing Individual Components
```bash
# Run specific test file
npm test -- --testPathPattern=voyageEventProcessor.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="LC allocation"

# Run tests for a specific directory
npm test src/utils/__tests__/
```

## Architecture Overview

This is a BP Logistics Analytics Dashboard built with React 19, TypeScript, and Tailwind CSS. The application provides real-time analytics for offshore drilling and production operations.

### State Management
- **Context API** is used for global state management with three main contexts:
  - `DataContext`: Core data operations and state
  - `DashboardContext`: Dashboard-specific state and filters
  - `NotificationContext`: User notification system

### Data Flow
1. **Excel files** are loaded from local Excel server (`localhost:5001`) or manually uploaded
2. **Server integration** via `useServerFileLoader` hook automatically downloads files from server
3. **Modular processors** in `src/utils/processors/` validate and transform data:
   - `voyageEventProcessor.ts`: Processes voyage events with LC allocation
   - `vesselManifestProcessor.ts`: Handles manifest data with location mapping
   - `costAllocationProcessor.ts`: Processes cost allocation with vessel costs
   - `voyageListProcessor.ts`: Processes voyage list with segment analysis
4. **IndexedDB (Dexie)** stores processed data persistently via `indexedDBManager.ts`  
5. **Context providers** (DataContext, DashboardContext, NotificationContext) distribute data
6. **Dashboard components** visualize and interact with data
7. **Automatic navigation** redirects users to analytics after successful data loading

### Key Architectural Decisions
- **Excel Server Integration**: Local Express server (`simple-excel-server.js`) serves Excel files for development
- **Component organization**: Features are grouped by domain (dashboard/, layout/, ui/, admin/)
- **Type safety**: All data structures have TypeScript interfaces in `src/types/index.ts`
- **Error boundaries**: Graceful error handling with fallback UI
- **Custom hooks**: Business logic is extracted into reusable hooks (`useDataOperations`, `useServerFileLoader`)
- **Modular processors**: Each data type has its own processor with validation and transformation
- **Data storage**: Dual storage with IndexedDB for persistence and Context API for state
- **Business logic separation**: Complex logic like LC allocation, vessel cost calculation, and activity classification is extracted into utility modules
- **Streamlined UX**: Single `EnhancedFileUploadWithServer` component handles all data loading scenarios

### BP Design System
- Primary color: `#00754F` (BP green)
- Secondary color: `#6EC800` (bright green)
- Typography: Inter font family
- Spacing: Use Tailwind's spacing scale
- Components: Leverage NextUI with BP brand customization

### Testing Approach
- Jest with React Testing Library
- Test files: `__tests__/` directories or `.test.ts/tsx` suffix
- Mock external dependencies
- Focus on user interactions and component behavior

### Performance Considerations
- Large datasets are processed client-side with chunked processing
- IndexedDB for persistent storage avoids re-processing uploaded data
- React.memo for expensive component renders
- Modular processors allow parallel processing of different data types
- Business logic utilities use Map-based lookups for O(1) performance
- Excel server approach eliminates file upload time (direct loading from localhost:5001)
- Request timeouts (5s) and proper cleanup prevent hanging operations
- Single server file check on component mount (no polling loops)

## Development Standards

### Code Organization Patterns
- **Processors**: Business logic for data transformation (`src/utils/processors/`)
- **Utilities**: Pure functions for calculations (`src/utils/lcAllocation.ts`, `src/utils/vesselCost.ts`)
- **Hooks**: Reusable React hooks for data operations (`src/hooks/`)
- **Context**: Global state management (`src/context/`)
- **Types**: Comprehensive TypeScript interfaces (`src/types/index.ts`)

### Key Business Logic Modules

#### Cost Allocation & LC Processing
- **File**: `src/utils/lcAllocation.ts`
- **Purpose**: Processes LC (Location Code) allocation with percentage-based splitting
- **Key Function**: `processLCAllocations()` - Maps voyage events to cost allocation data

#### Vessel Cost Calculation  
- **File**: `src/utils/vesselCost.ts`
- **Purpose**: Calculates vessel costs using daily rates and time periods
- **Key Function**: `calculateVesselCost()` - Applies rates based on dates

#### Activity Classification
- **File**: `src/utils/activityClassification.ts` 
- **Purpose**: Classifies vessel activities as productive/non-productive
- **Key Function**: `classifyActivity()` - Uses parent event + event classification

#### Data Processing Pipeline
- **File**: `src/utils/dataProcessing.ts`
- **Purpose**: Orchestrates the entire data processing workflow
- **Key Functions**: `processUploadedFiles()`, `processFilesByType()`

#### Vessel Codes Processing
- **File**: `src/utils/vesselCodesProcessor.ts`
- **Purpose**: Processes vessel codes for proper activity classification
- **Integration**: Works with cost allocation for authoritative data source

### Data Validation and Quality
- **Data Integrity**: `src/utils/dataIntegrityValidator.ts` validates cross-references
- **Excel Validation**: `src/utils/excel/excelValidator.ts` validates file formats
- **Quality Reporting**: Built-in validation reporting for data quality metrics

### Storage Architecture
- **IndexedDB Manager**: `src/utils/storage/indexedDBManager.ts` handles persistence
- **Simple Data Store**: `src/types/simpleDataStore.ts` provides type-safe data structure
- **Debug Utils**: `src/utils/storage/debugUtils.ts` for troubleshooting storage issues

## Important Implementation Notes

### CostAllocation.xlsx as Master Data Source
- CostAllocation.xlsx serves as the authoritative source for location determination
- All LC-based filtering and location mapping should reference cost allocation data
- Use `costAllocationProcessor.ts` for proper LC validation and mapping

### Modular Processor Architecture
- Each Excel file type (Voyage Events, Manifests, etc.) has its own processor
- Processors are designed to be independent but can cross-reference each other
- Always process CostAllocation first as it provides master reference data

### Business Logic Separation  
- Complex calculations are extracted into utility modules (not in React components)
- Use TypeScript interfaces extensively for type safety
- Business rules are centralized in utility functions for reusability

## Implementation Memories

### Excel Server Integration & Upload Streamlining ⏺ ✅ Streamlined Data Loading Workflow!

🎉 What We've Accomplished:

✅ **Fixed Excel Server Polling Issues**
- **Root Cause**: Multiple components were calling `checkServerFiles()` on mount causing excessive polling
- **Auto-loading Logic**: `EnhancedFileUploadWithServer.tsx` had automatic loading that created polling loops
- **URL Resolution**: Components were calling `/api/excel-files` instead of proper base URL resolution
- **Solution Applied**:
  - Added proper mount lifecycle management with `mounted` flag and cleanup
  - Removed auto-loading setTimeout logic that was creating loops
  - Added `getApiBaseUrl()` function for proper development vs production URL handling
  - Added 5-second request timeouts with `AbortController` to prevent hanging
  - Enhanced error handling to prevent console spam and retry loops

✅ **Streamlined Upload Workflow**
- **Removed Deprecated Components**: Deleted `FileUploadPageWithDB.tsx` (200+ lines of obsolete database code)
- **Simplified Routing**: `/upload` route now directly shows `EnhancedFileUploadWithServer`
- **Automatic Navigation**: Users are redirected to dashboard after successful data loading (1.5s delay)
- **Enhanced UX**: Added "Back to Home" and "Skip to Dashboard" navigation buttons
- **Professional Header**: "BP Logistics Data Center" with clear messaging and navigation

✅ **Eliminated PostgreSQL Dependencies**
- **Removed Database Upload Functions**: `uploadToDatabase()`, `loadDataFromBackend()`, `fetchAllData()`
- **Cleaned Up State Management**: Removed `isLoadingPostgreSQL` and related database states
- **Simplified UI Logic**: Removed PostgreSQL loading conditions and "Load from PostgreSQL Database" button
- **Updated Imports**: Removed `uploadAPI`, `dataAPI`, and unused database-related imports
- **Deleted Wrapper**: Removed `fileProcessingWrapper.ts` as it's no longer needed

🔧 **Technical Improvements Made**:

**Excel Server Optimization**:
- `EnhancedFileUploadWithServer.tsx`: Fixed polling, added navigation, timeout handling
- `FileUploadPageWithDB.tsx`: Completely removed (replaced with enhanced component)
- `LandingPage.tsx`: Cleaned up unused imports and server checking logic
- `App.tsx`: Updated routing to use `EnhancedFileUploadWithServer` directly

**User Experience Flow**:
1. **Landing Page** → "Get Started" or "View Analytics"
2. **Data Center Page** (`/upload`) → Server loading + manual upload options
3. **Automatic Processing** → Files processed with progress indicators  
4. **Dashboard Redirect** → Seamless transition to analytics (no manual navigation needed)
5. **Full Analytics** → All dashboards populated and ready

**Development Workflow**:
- `npm run dev`: Starts both React app (3000) and Excel server (5001)
- `npm run excel-server`: Starts just the Excel server for data loading
- Excel files served from `excel-data/excel-files/` directory
- Automatic fallback to manual upload if server unavailable

🎯 **Benefits Achieved**:

- 🚀 **Faster Setup**: No database configuration needed - pure Excel file workflow
- 🎯 **Focused Experience**: Single streamlined page for all data loading needs
- 💾 **Excel Server Optimized**: Built specifically for local development workflow
- 🔄 **Seamless Navigation**: Users don't get stuck on upload pages
- 🧹 **Clean Codebase**: Removed deprecated PostgreSQL integration entirely
- ⚡ **No More Polling**: Eliminated excessive server requests and performance issues

**Current Architecture**:
```
Excel Server (5001) ←→ React App (3000) → Dashboard Analytics
     ↑                        ↓
Excel Files Directory    IndexedDB Storage
```

The dashboard now provides a streamlined, server-optimized experience focused entirely on Excel file processing without any database complexity!

### Data Processing Summary Fixes ⏺ ✅ Critical Dashboard Issues Resolved!

🎉 What We've Fixed:

✅ Removed Deprecated PostgreSQL Integration
- Removed 'Load from PostgreSQL' button from Data Processing Summary
- Cleaned up PostgreSQL-related imports and function calls
- Eliminated unused loadDataFromPostgreSQL functionality
- Streamlined dashboard interface for current architecture

✅ Fixed Bulk Actions Data Completeness Score
- **Root Cause**: Code was looking for `volumeBbls` field but BulkAction interface uses `qty`
- **Solution**: Updated bulk actions analysis to use correct field names:
  - `action.qty` instead of deprecated `volumeBbls` lookups
  - `b.bulkType` using proper interface field
  - `b.portType` and `b.atPort` with correct type safety
- **Result**: Bulk Actions now shows accurate completeness percentages instead of 0.00%

✅ Enhanced Duplicate Event IDs Detection
- **Previous Issue**: Overly complex signature including too many fields (6,330+ false positives)
- **Improvement**: More focused duplicate detection using key identifying fields:
  - Signature: `vessel|voyageNumber|event|eventDate|location`
  - Enhanced logging with percentage calculations and detailed examples
  - Better accuracy in identifying true duplicates vs. legitimate variations
- **Result**: More precise duplicate detection with actionable insights

🔧 Technical Changes Made:

**File**: `src/components/dashboard/MainDashboard.tsx`
- Lines 456-462: Removed PostgreSQL button and related UI
- Lines 16-24: Cleaned up imports and context usage
- Lines 310-317: Fixed bulk actions analysis with proper field names
- Lines 280-282: Fixed bulk actions data quality checks
- Lines 238-279: Enhanced duplicate detection algorithm

📊 Data Quality Improvements:

- **Bulk Actions**: Now accurately calculates volume using `qty` field from BulkAction interface
- **Duplicate Detection**: Focused approach reduces false positives and provides better insights
- **Interface Compliance**: All data access now properly uses TypeScript interface field names
- **Debug Logging**: Enhanced console output for troubleshooting data quality issues

🎯 Impact:

The Data Processing Summary now provides accurate metrics and insights:
- Bulk Actions completeness score reflects actual data quality
- Duplicate detection focuses on truly problematic records
- Clean interface without deprecated functionality
- Better debugging capabilities for ongoing data quality monitoring

### Previous Deployment Memory ⏺ ✅ Complete Implementation Successfully Deployed!

🎉 What We've Accomplished:

✅ Server-Side Excel File Loading System
- Created useServerFileLoader hook for seamless server integration
- Uploaded all 5 required Excel files to VPS server (4.4MB total)
- Implemented automatic file download and processing pipeline

✅ Enhanced Landing Page Experience
- "View Analytics" button now automatically loads server data
- Smart UI that adapts based on server file availability
- Loading states and error handling for better UX
- Maintained fallback to manual upload if needed

✅ Complete Production Deployment
- All files deployed to VPS with PM2 management
- API endpoints tested and functional
- Cache-busting implemented for instant updates
- Domain ready at https://bpsolutionsdashboard.com

🚀 User Experience Now:

1. Visit Landing Page → Clean white design loads
2. Click "View Analytics" → Automatic server file loading begins
3. Processing Indicator → Shows "Loading Data..." during processing
4. Dashboard Access → Direct redirect to fully loaded analytics

🔧 Technical Architecture:

Excel Files (VPS) → API Endpoint → Client Download → Processing → Dashboard
               ↓
       Fallback: Manual Upload → Same Processing → Dashboard

The BP Logistics Dashboard now provides an enterprise-grade, zero-setup experience where users can access fully loaded analytics
dashboards with a single click! 🎯

### Dashboard Showcase Implementation ⏺ ✅ Sleek Analytics Dashboard Selection Interface!

🎉 What We've Accomplished:

✅ **Created Dashboard Showcase Page (`/dashboards`)**
- **New Component**: `DashboardShowcase.tsx` - Sleek grid layout showcasing all 8 available dashboards
- **Interactive Design**: Hover effects with gradients, scale animations (105% on hover), and glow borders
- **Mouse Tracking**: Dynamic background gradients that follow mouse movement for immersive experience
- **Responsive Layout**: Grid adapts from 1 column (mobile) to 4 columns (desktop) with consistent card sizing

✅ **Enhanced User Experience Flow**
- **Previous Flow**: Landing Page → Direct to Data Summary → Navigate manually to other dashboards
- **New Flow**: Landing Page → Dashboard Showcase → Choose Specific Dashboard → Full Analytics
- **Improved Navigation**: Clear "Back to Home" and "Load Data" options on showcase page
- **Status Awareness**: Visual indicators showing data availability and processing status

✅ **Accurate Dashboard Representations**
- **Drilling Analytics** (formerly "Drilling Operations"): 
  - Updated to reflect actual fluid movement tracking, weather impact analysis, drilling voyages, and maneuvering hours
  - Removed Thunder Horse/Mad Dog specificity for broader applicability
  - Stats: voyages: '157', weather: '12%', fluids: '45K'

- **Production Analytics**: 
  - Accurate description of chemical transfers and production facility support
  - Features: Chemical Movement, Production Support, Vessel Performance, Weather Impact
  - Stats: chemicals: '28K', voyages: '89', impact: '8%'

- **Voyage Intelligence**: 
  - Reflects actual route efficiency, mission analysis, duration tracking, and multi-stop analysis
  - Features: Route Efficiency, Mission Analysis, Duration Tracking, Multi-Stop Analysis
  - Stats: voyages: '246', routes: '32', ontime: '87%'

- **Cost Allocation**: 
  - Emphasizes department analysis, project tracking, and spend breakdown
  - Features: Department Analysis, Project Tracking, Cost Trends, Spend Breakdown
  - Stats: spend: '$42M', depts: '8', projects: '15'

- **Comparison Analytics**: 
  - Highlights multi-dimension comparison capabilities and variance analysis
  - Features: Multi-Dimension Compare, Trend Analysis, Performance Metrics, Variance Analysis
  - Stats: metrics: '10+', comparisons: '4', trends: '6mo'

- **Bulk Operations** (formerly "Bulk Actions"): 
  - Describes transfer tracking with anti-duplication engine and fluid type analysis
  - Features: Transfer Tracking, Fluid Type Analysis, Route Performance, Volume Analytics
  - Stats: transfers: '234', volume: '67K', routes: '18'

✅ **Strategic Dashboard Ordering**
- **Top Priority Dashboards**: Drilling Analytics, Production Analytics, Voyage Intelligence, Cost Allocation, Comparison Analytics, Bulk Operations
- **Administrative Dashboards**: Data Processing Summary and Admin Dashboard positioned at bottom
- **Operational Focus**: Primary analytics dashboards are prominently featured for immediate access

🔧 **Technical Implementation Details**:

**New Components**:
- `src/components/DashboardShowcase.tsx`: Main showcase component with interactive cards
- **Route**: `/dashboards` - New route added to App.tsx routing configuration

**Interactive Features**:
- **Hover Effects**: 500ms duration transitions with scale, shadow, and gradient overlays
- **Mouse Tracking**: `useEffect` hook tracks mouse position for dynamic background gradients
- **Card Animations**: Individual cards have gradient overlays, icon scaling, and arrow indicators on hover
- **Status Integration**: Uses `useData` context to show data availability and voyage event counts

**Design Consistency**:
- **BP Brand Colors**: Consistent gradient themes using BP green and complementary colors
- **Icon System**: Lucide React icons for visual consistency across all dashboard cards
- **Card Structure**: Unified layout with icon, title, description, 4 features, and 3 stats per card
- **Typography**: Consistent sizing and spacing using Tailwind CSS utilities

**Navigation Updates**:
- **Landing Page**: "View Analytics" button now navigates to `/dashboards` instead of `/dashboard`
- **App.tsx**: Added new route mapping for dashboard showcase
- **User Flow**: Simplified direct navigation without server loading complexity on landing page

🎯 **User Experience Improvements**:

**Before**:
1. Landing Page → Data Processing Summary → Manual navigation to specific dashboards

**After**:
1. Landing Page → Dashboard Showcase → Intuitive selection → Specific Analytics Dashboard

**Benefits Achieved**:
- 🎨 **Visual Discovery**: Users can see all available analytics at a glance with rich previews
- 🚀 **Faster Access**: Direct navigation to desired analytics without intermediate stops
- 📊 **Informed Choice**: Accurate descriptions and stats help users choose the right dashboard
- 💫 **Engaging Interface**: Smooth animations and hover effects create professional experience
- 🔍 **Clear Organization**: Operational dashboards prioritized, admin functions clearly separated

**Platform Overview Section**:
- **Analytics Views**: 8 specialized dashboards for different operational needs
- **Data Sources**: Integration status display based on actual data availability
- **KPIs Tracked**: 50+ key performance indicators across all analytics
- **Real-time**: 24/7 operational monitoring capabilities

🎨 **Design Philosophy**:

The dashboard showcase embodies BP's commitment to operational excellence through:
- **Clarity**: Each dashboard's purpose and capabilities are immediately clear
- **Efficiency**: Minimal clicks from landing to specific analytics
- **Professionalism**: Enterprise-grade visual design with smooth interactions
- **Accuracy**: Dashboard descriptions match actual functionality to set proper expectations

The new dashboard showcase transforms the analytics discovery experience from functional navigation to an engaging, informative interface that guides users to the precise insights they need for offshore operations management.

### Statistical Variance Analysis Implementation ⏺ ✅ Enterprise-Grade KPI Variance Analytics!

🎉 What We've Accomplished:

✅ **Comprehensive Statistical Variance Analysis Framework**
- **New Utility Module**: `src/utils/statisticalVariance.ts` - Complete variance analysis engine
- **Statistical Functions**: Mean, variance, standard deviation, coefficient of variation, quartiles, outliers
- **Outlier Detection**: Both IQR (1.5x interquartile range) and Z-score (2σ threshold) methods
- **Data Quality**: Comprehensive validation and type safety throughout analysis pipeline

✅ **Business-Critical KPI Variance Focus**
- **Lifts per Hour Variance**: Operational efficiency consistency across vessels and time periods
- **Cost per Ton Variance**: Cost efficiency analysis with configurable rates ($150/ton drilling, $180/ton production)
- **Average Visits per Week Variance**: Supply frequency consistency with intelligent time period calculation
- **Replaced Previous Focus**: Moved from general cargo/utilization variance to actionable business KPIs

✅ **Professional Visualization Components**
- **New Components**: `src/components/dashboard/VarianceAnalysisComponents.tsx`
- **Box Plots**: Statistical distribution visualization with quartiles, median, outliers, and summary statistics
- **Control Charts**: Process control visualization with ±2σ control limits and out-of-control point detection
- **Variance Stats Cards**: Consistency ratings (Excellent <10% CV, Good <20% CV, Fair <30% CV, High Variance >30% CV)
- **Interactive SVG Charts**: Professional statistical visualizations with proper scaling and outlier highlighting

✅ **Drilling Dashboard Variance Analytics**
- **Component**: `DrillingOperationalVarianceDashboard` - BP green theme, 3-column layout
- **Function**: `calculateDrillingOperationalVariance()` - Drilling-specific operational KPI analysis
- **Integration**: Uses cost allocation LC filtering for drilling-only operations
- **Metrics**: Lifts/hr efficiency, cost per ton analysis, visits per week frequency

✅ **Production Dashboard Variance Analytics**
- **Component**: `ProductionOperationalVarianceDashboard` - Purple theme, 3-column layout  
- **Function**: `calculateProductionOperationalVariance()` - Production-specific operational KPI analysis
- **Integration**: Filters for production operations excluding drilling/completion fluids
- **Metrics**: Chemical transfer efficiency, production cost analysis, facility visit patterns

🔧 **Technical Implementation Excellence**:

**Statistical Engine Features**:
- **Comprehensive Analysis**: Full statistical suite with professional-grade calculations
- **Outlier Detection**: Dual-method approach for robust anomaly identification
- **Time Period Intelligence**: Smart calculation (specific month: 4.33 weeks, YTD: calculated, all data: range-based)
- **Cost Estimation**: Configurable cost-per-ton calculations based on operation type
- **Visit Tracking**: Unique voyage/manifest counting with week normalization

**Data Integration**:
- **Cost Allocation Authority**: Uses CostAllocation.xlsx as master source for LC-based filtering
- **Vessel Performance**: Tracks individual vessel metrics across all operational KPIs
- **Time Filtering**: Supports monthly, YTD, and all-data analysis periods
- **Location Filtering**: Facility-specific and platform-specific variance analysis

**Visualization Architecture**:
- **Modular Components**: Reusable variance dashboard components for drilling and production
- **Consistent Design**: BP brand colors with operation-specific themes (green/purple)
- **Statistical Rigor**: Professional box plots and control charts with proper statistical foundations
- **Interactive Elements**: Hover effects, outlier highlighting, and detailed statistical summaries

📊 **Business Value & Operational Insights**:

**Operational Efficiency Identification**:
- **Vessel Performance Outliers**: Identify vessels requiring training, maintenance, or operational review
- **Cost Efficiency Opportunities**: Highlight cost-per-ton variance for budget optimization
- **Schedule Optimization**: Visit frequency variance reveals logistics planning improvements

**Management Reporting**:
- **Consistent KPIs**: Same metrics across drilling and production for comparative analysis
- **Statistical Confidence**: Professional variance analysis with confidence intervals and process control
- **Actionable Intelligence**: Clear identification of outliers with significance metrics

**Process Control**:
- **Control Charts**: Real-time monitoring of operational KPIs with statistical control limits
- **Trend Analysis**: Variance tracking over time periods with outlier alerts
- **Performance Benchmarking**: Statistical baselines for operational excellence targets

🎯 **Key Features Delivered**:

**Professional Statistical Analysis**:
- **Box Plots**: Distribution visualization with quartiles, outliers, and statistical summaries
- **Control Charts**: Process control with ±2σ limits, mean lines, and out-of-control detection
- **Variance Statistics**: Comprehensive CV analysis with consistency ratings and outlier counts

**Enterprise-Grade Implementation**:
- **Type Safety**: Full TypeScript integration with comprehensive interfaces
- **Error Handling**: Graceful fallbacks and validation throughout variance calculations
- **Performance Optimization**: Efficient Map-based calculations with O(1) lookups
- **Responsive Design**: Professional visualizations that work across desktop and mobile

**Operational Focus**:
- **Drilling Operations**: Cost allocation-based filtering for accurate drilling-only variance analysis
- **Production Operations**: Chemical/utility focus with fuel exclusion for precise production metrics
- **Cost Allocation Integration**: Authoritative LC-based filtering using master cost allocation data
- **Business Unit Consistency**: Same KPI framework across both drilling and production dashboards

📈 **Technical Architecture**:

**Files Created/Modified**:
- `src/utils/statisticalVariance.ts`: Complete variance analysis engine with drilling/production functions
- `src/components/dashboard/VarianceAnalysisComponents.tsx`: Professional visualization components
- `src/components/dashboard/DrillingDashboard.tsx`: Integrated drilling operational variance dashboard
- `src/components/dashboard/ProductionDashboard.tsx`: Integrated production operational variance dashboard

**Statistical Functions**:
- `calculateDrillingOperationalVariance()`: Drilling KPI variance analysis
- `calculateProductionOperationalVariance()`: Production KPI variance analysis  
- `calculateVarianceAnalysis()`: Core statistical analysis engine
- Comprehensive outlier detection and statistical distribution analysis

🎨 **User Experience**:

**Dashboard Integration**:
- **Seamless Addition**: Variance analysis appears at bottom of drilling and production dashboards
- **Professional Presentation**: Enterprise-grade statistical visualizations with BP branding
- **Actionable Insights**: Clear identification of operational improvement opportunities
- **Consistent Navigation**: Same filtering and time period selection as existing dashboard features

**Visual Excellence**:
- **Statistical Rigor**: Professional box plots and control charts meeting industry standards
- **Brand Consistency**: BP green for drilling, purple for production, with consistent design language
- **Interactive Elements**: Hover effects, outlier detection, and comprehensive statistical summaries
- **Mobile Responsive**: Professional visualizations that scale across device types

The variance analysis implementation provides **enterprise-grade statistical intelligence** for operational excellence, delivering actionable insights into vessel performance consistency, cost efficiency patterns, and supply chain optimization opportunities across both drilling and production operations.

## Production Server Deployment

### VPS Server Configuration ⏺ ✅ Complete Production Deployment with Auto-Loading Excel Files!

🎯 **Server Details**:
- **Domain**: https://bpsolutionsdashboard.com
- **IP Address**: [SERVER_IP] # Set in .env as VPS_SERVER_IP
- **SSH User**: [SSH_USER] # Set in .env as VPS_SSH_USER  
- **SSH Password**: [SSH_PASSWORD] # Set in .env as VPS_SSH_PASSWORD
- **Server Path**: `/var/www/logisticsdashboard`

🔧 **Technical Architecture**:

**PM2 Process Management**:
- **Process Name**: `bp-logistics-dashboard`
- **Port**: 5001 
- **Service File**: `vps-server.js` (Express server)
- **Auto-restart**: Yes (managed by PM2)
- **Status Check**: `pm2 list` and `pm2 logs bp-logistics-dashboard`

**Nginx Configuration**:
- **Config File**: `/etc/nginx/sites-available/bpsolutionsdashboard.com`
- **Setup**: Proxy configuration routing HTTPS traffic to localhost:5001
- **SSL**: Let's Encrypt certificates (auto-renewal enabled)
- **Cache Busting**: Aggressive no-cache headers for instant updates

**File Structure on Server**:
```
/var/www/logisticsdashboard/
├── index.html                    # React build entry point
├── static/                       # React build assets (CSS, JS, media)
├── vps-server.js                 # Express server (serves React + API)
├── package.json                  # Node.js dependencies
├── node_modules/                 # Express dependencies
├── excel-data/
│   └── excel-files/             # Auto-loading Excel files
│       ├── Bulk Actions.xlsx
│       ├── Cost Allocation.xlsx
│       ├── Vessel Classifications.xlsx
│       ├── Vessel Manifests.xlsx
│       ├── Voyage Events.xlsx
│       └── Voyage List.xlsx
└── server.log                   # PM2 process logs
```

### Deployment Commands

**Complete Deployment Process**:
```bash
# 1. Build latest version locally
npm run build

# 2. Create deployment package
tar -czf bp-dashboard-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C build .

# 3. Deploy using sshpass script
chmod +x deploy-with-sshpass.sh && ./deploy-with-sshpass.sh

# 4. Restart PM2 process to pick up changes
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 restart bp-logistics-dashboard"

# 5. Verify deployment
curl -s -o /dev/null -w "%{http_code}" https://bpsolutionsdashboard.com
```

**Quick Server Management**:
```bash
# Check PM2 status
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 list"

# View server logs
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 logs bp-logistics-dashboard --lines 20"

# Restart server
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 restart bp-logistics-dashboard"

# Check Nginx status
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "sudo systemctl status nginx"

# Test Excel files API
curl -s "https://bpsolutionsdashboard.com/api/excel-files" | head -20
```

### Excel File Auto-Loading System

**Server-Side Excel Integration**:
- **API Endpoint**: `/api/excel-files` - Lists all available Excel files
- **Download Endpoint**: `/api/excel-files/:filename` - Downloads specific files
- **Directory**: `/var/www/logisticsdashboard/excel-data/excel-files/`
- **Auto-Detection**: Dashboard automatically checks for server files on load

**File Status (Current Deployment)**:
- ✅ **Bulk Actions.xlsx** (346KB) - Transfer tracking and fluid analysis
- ✅ **Cost Allocation.xlsx** (31KB) - Master LC mapping and cost data  
- ✅ **Vessel Classifications.xlsx** (11KB) - Vessel activity classification
- ✅ **Vessel Manifests.xlsx** (278KB) - Cargo manifest data
- ✅ **Voyage Events.xlsx** (3.8MB) - Complete voyage event tracking
- ✅ **Voyage List.xlsx** (78KB) - Voyage summary and route data

**User Experience Flow**:
1. **Visit Landing Page** → https://bpsolutionsdashboard.com
2. **Click "View Analytics"** → Automatic server file detection
3. **Auto-Loading** → Dashboard downloads all 6 Excel files automatically
4. **Data Processing** → Files processed client-side with progress indicators
5. **Dashboard Access** → Full analytics available without manual upload

### Troubleshooting Guide

**Common Issues and Solutions**:

**1. Site Returns 404/502**:
```bash
# Check PM2 process status
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 list"

# If stopped, restart PM2
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 restart bp-logistics-dashboard"

# Check server logs for errors
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 logs bp-logistics-dashboard"
```

**2. Excel Files Not Loading**:
```bash
# Verify Excel files exist
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "ls -la /var/www/logisticsdashboard/excel-data/excel-files/"

# Test API endpoint directly
curl -s "https://bpsolutionsdashboard.com/api/excel-files"

# Check file permissions
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "sudo chown -R www-data:www-data /var/www/logisticsdashboard"
```

**3. Outdated Build Deployed**:
```bash
# Verify latest build files
curl -s https://bpsolutionsdashboard.com | grep -o 'main\.[a-f0-9]*\.js'

# Compare with local build
ls -la build/static/js/main.*.js

# If different, redeploy using deployment script
./deploy-with-sshpass.sh
```

**4. Nginx Configuration Issues**:
```bash
# Test Nginx configuration
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "sudo nginx -t"

# Reload Nginx
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "sudo systemctl reload nginx"

# Check Nginx logs
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "sudo tail -f /var/log/nginx/error.log"
```

### Server Dependencies

**Required Node.js Packages** (installed on server):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "path-to-regexp": "^6.2.1"
  }
}
```

**Installation Commands** (if needed):
```bash
# SSH into server
sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP

# Navigate to app directory
cd /var/www/logisticsdashboard

# Install dependencies
npm install express@4.18.2 path-to-regexp@6.2.1
```

### Deployment Verification Checklist

**Post-Deployment Verification**:
- ✅ **Site Loads**: https://bpsolutionsdashboard.com returns HTTP 200
- ✅ **Latest Build**: JavaScript bundle hash matches local build
- ✅ **Excel API**: `/api/excel-files` returns all 6 files with metadata
- ✅ **File Downloads**: Individual Excel files download successfully
- ✅ **PM2 Status**: Process shows "online" status with recent restart
- ✅ **Auto-Loading**: Dashboard automatically detects and loads server files
- ✅ **Full Functionality**: All dashboards load with complete data sets

**Success Indicators**:
- **HTTP Status**: 200 for main site and API endpoints
- **PM2 Process**: Status "online" with current PID and minimal restarts
- **File Count**: 6 Excel files (Bulk Actions, Cost Allocation, Vessel Classifications, Vessel Manifests, Voyage Events, Voyage List)
- **Bundle Hash**: Matches current local build (e.g., `main.deba3ccc.js`)
- **Auto-Detection**: Landing page "View Analytics" triggers automatic file loading

### Current Production Status

**Latest Deployment**: June 22, 2025 at 12:00 PM (UTC)
- **Build Hash**: `main.deba3ccc.js`
- **Commit**: `9c25294` - TV Kiosk Display with rotating KPI analytics
- **Features**: Production Support Variance Analysis, Enhanced currency formatting, Fixed Logistics Cost KPI filtering

**Operational Capabilities**:
- ✅ **Zero-Setup User Experience**: Automatic Excel file loading from server
- ✅ **Enterprise-Grade Performance**: PM2 process management with auto-restart
- ✅ **Complete Analytics Suite**: All 8 dashboards fully functional
- ✅ **Real-Time Updates**: Cache-busting ensures immediate deployment visibility
- ✅ **Fallback Support**: Manual upload option if server files unavailable

The production server provides a seamless, enterprise-ready experience where users can access fully loaded analytics dashboards with a single click, automatically pulling all required Excel files from the server without any manual setup required.