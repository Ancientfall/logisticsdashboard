# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start              # Start development server (http://localhost:3000)
npm run dev           # Start with local Excel server
npm run excel-server  # Start Excel server only
npm run build         # Build for production

# Testing
npm test              # Run tests
npm test -- --watch   # Watch mode
npm test -- --coverage # With coverage
npm test -- --testPathPattern=voyageEventProcessor.test.ts  # Specific file
npm test -- --testNamePattern="LC allocation"               # Pattern match
```

## Architecture Overview

BP Logistics Analytics Dashboard built with React 19, TypeScript, and Tailwind CSS for offshore drilling and production operations analytics.

### Data Flow
1. **Excel files** loaded from server (`localhost:5001`) or manual upload
2. **Modular processors** (`src/utils/processors/`) validate and transform data
3. **IndexedDB** stores processed data persistently
4. **Context providers** distribute data to dashboard components
5. **Automatic navigation** to analytics after data loading

### Key Components
- **State Management**: Context API (DataContext, DashboardContext, NotificationContext)
- **Excel Server**: Local Express server (`simple-excel-server.js`) serves files
- **Data Storage**: IndexedDB + Context API for persistence and state
- **Business Logic**: Extracted to utility modules for reusability
- **Type Safety**: Comprehensive TypeScript interfaces in `src/types/index.ts`

### BP Design System
- Primary: `#00754F` (BP green), Secondary: `#6EC800` (bright green)
- Typography: Inter font family
- Components: NextUI with BP brand customization

## Development Standards

### Code Organization
- **Processors**: `src/utils/processors/` - Data transformation
- **Utilities**: `src/utils/` - Pure calculation functions
- **Hooks**: `src/hooks/` - Reusable React hooks
- **Context**: `src/context/` - Global state management
- **Types**: `src/types/index.ts` - TypeScript interfaces

### Key Business Logic Modules
- **LC Allocation**: `src/utils/lcAllocation.ts` - Location code processing
- **Vessel Cost**: `src/utils/vesselCost.ts` - Cost calculations
- **Activity Classification**: `src/utils/activityClassification.ts` - Event classification
- **Data Processing**: `src/utils/dataProcessing.ts` - Main processing pipeline
- **Vessel Codes**: `src/utils/vesselCodesProcessor.ts` - Activity classification

### Data Architecture
- **CostAllocation.xlsx**: Master data source for location determination and LC validation
- **Modular Processors**: Independent but cross-referencing processors
- **Process Order**: Always process CostAllocation first as master reference

## Monthly Data Upload System

Cumulative monthly data appending system for Kabal exports with duplicate prevention.

**Key Features**: Data appending, duplicate detection, automatic file recognition, backup system, progress tracking
**Supported Files**: Voyage Events, Vessel Manifests, Bulk Actions, Cost Allocation, Voyage List
**Implementation**: `MonthlyDataUpload.tsx` frontend, integrated API in `simple-excel-server.js`
**Navigation**: "Monthly" button → `/monthly-upload`

## Recent Implementations

### Key Features Delivered
- **Dashboard Showcase**: Interactive selection interface (`/dashboards`) with 8 specialized analytics dashboards
- **Statistical Variance Analysis**: Enterprise-grade KPI variance analytics with box plots and control charts
- **Excel Server Integration**: Streamlined data loading with polling fixes and automatic navigation
- **Monthly Data Upload**: Cumulative data appending system with duplicate prevention
- **Production Deployment**: Complete VPS deployment with PM2 management at https://bpsolutionsdashboard.com

### Technical Achievements
- **Removed PostgreSQL Dependencies**: Pure Excel file workflow with IndexedDB storage
- **Fixed Data Quality Issues**: Corrected bulk actions completeness scoring and duplicate detection
- **Enhanced UX Flow**: Landing → Dashboard Showcase → Specific Analytics (seamless navigation)
- **Statistical Intelligence**: Professional variance analysis for operational excellence
- **Server Optimization**: Fixed polling issues, added timeouts, enhanced error handling

## Production Deployment

### Server Configuration
- **Domain**: https://bpsolutionsdashboard.com
- **Server Path**: `/var/www/logisticsdashboard`
- **Process**: `bp-logistics-dashboard` (PM2 managed)
- **Port**: 5001 (Nginx proxy to HTTPS)

### Deployment Commands
```bash
# Build and deploy
npm run build
tar -czf bp-dashboard-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C build .
./deploy-with-sshpass.sh

# Deploy server and restart
source .env && sshpass -p "$VPS_SSH_PASSWORD" scp vps-server.js $VPS_SSH_USER@$VPS_SERVER_IP:$VPS_SERVER_PATH/
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "cd $VPS_SERVER_PATH && pm2 restart bp-logistics-dashboard"
```

### Server Management
```bash
# Check status
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 list"

# View logs
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "pm2 logs bp-logistics-dashboard --lines 20"

# Test API
curl -s "https://bpsolutionsdashboard.com/api/excel-files"

# Full deployment update procedure
npm run build
tar -czf bp-dashboard-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C build .
./deploy-with-sshpass.sh
source .env && sshpass -p "$VPS_SSH_PASSWORD" scp vps-server.js $VPS_SSH_USER@$VPS_SERVER_IP:$VPS_SERVER_PATH/
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "cd $VPS_SERVER_PATH && pm2 restart bp-logistics-dashboard"

# If Express.js issues occur:
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "cd $VPS_SERVER_PATH && npm install express@4.18.2"

# Excel files structure on VPS
source .env && sshpass -p "$VPS_SSH_PASSWORD" ssh $VPS_SSH_USER@$VPS_SERVER_IP "cd $VPS_SERVER_PATH && mkdir -p excel-data/excel-files"
source .env && sshpass -p "$VPS_SSH_PASSWORD" scp "excel-data/excel-files/"*.xlsx $VPS_SSH_USER@$VPS_SERVER_IP:$VPS_SERVER_PATH/excel-data/excel-files/
```

### Excel Files (Auto-Loading)
- **API**: `/api/excel-files` (list), `/api/excel-files/:filename` (download)
- **Files**: Bulk Actions, Cost Allocation, Vessel Classifications, Vessel Manifests, Voyage Events, Voyage List
- **Flow**: Landing Page → Auto-Detection → Processing → Analytics

**Current Status**: Zero-setup experience with automatic Excel file loading from server

## Latest Deployment Status (July 28, 2025)

### Production Environment Health
- **Site Status**: ✅ Online and fully operational 
- **URL**: https://bpsolutionsdashboard.com
- **PM2 Process**: ✅ bp-logistics-dashboard (online, stable)
- **Excel Files API**: ✅ 6 files available and serving correctly
- **Dependencies**: ✅ Express.js 4.18.2 (compatibility verified)

### Recent Deployment Fixes Applied
1. **Express.js Compatibility**: Fixed path-to-regexp version conflicts
2. **Excel Files Structure**: Organized in proper `excel-data/excel-files/` directory  
3. **PM2 Process Management**: Stable restart procedures implemented
4. **API Endpoints**: All endpoints responding correctly (health, excel-files)
5. **Frontend Build**: Latest optimized production build deployed

### Verified Working Features
- ✅ TV Kiosk Display with rotating KPI analytics
- ✅ Production Support Variance Analysis
- ✅ Enhanced currency formatting throughout dashboards
- ✅ Fixed Logistics Cost KPI filtering accuracy
- ✅ All 8 specialized dashboard modules operational
- ✅ Monthly data upload system with duplicate prevention
- ✅ Statistical variance analysis with box plots and control charts

### Server Dependencies
- **Node.js**: v18.20.8
- **Express.js**: 4.18.2 (verified compatible)
- **PM2**: Process management for production stability
- **Nginx**: Reverse proxy with HTTPS termination
- **File Structure**: `/var/www/logisticsdashboard/excel-data/excel-files/`

### Troubleshooting Procedures
If deployment issues occur, follow these steps in order:
1. Check PM2 status: `pm2 list`
2. Verify Express.js version: `npm list express`
3. Ensure Excel files in correct directory structure
4. Restart PM2 process: `pm2 restart bp-logistics-dashboard`
5. Test API endpoints: `curl https://bpsolutionsdashboard.com/api/excel-files`

**Last Updated**: July 28, 2025 - Full deployment verification completed