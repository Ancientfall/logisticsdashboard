# Backend Directory - Legacy PostgreSQL Implementation

⚠️ **DEPRECATED**: This backend implementation is no longer used in the current production system.

## 🚨 Current Status

**NOT IN USE** - The BP Logistics Dashboard has migrated to a pure Excel file workflow with IndexedDB storage, removing PostgreSQL dependencies entirely.

## 📁 Directory Contents

### Core Server Files
- **[server.js](./src/server.js)** - Main Express.js server with PostgreSQL integration
- **[server-fix.js](./src/server-fix.js)** - Server fixes and patches
- **[ecosystem.config.js](./ecosystem.config.js)** - PM2 process management configuration
- **[package.json](./package.json)** - Node.js dependencies for PostgreSQL backend

### Database Layer
- **[config/database.js](./src/config/database.js)** - PostgreSQL connection configuration  
- **[models/](./src/models/)** - Sequelize ORM models (14 files)
- **[migrations/](./src/migrations/)** - Database schema migrations

### API Layer
- **[controllers/](./src/controllers/)** - Express.js route controllers (5 files)
- **[routes/](./src/routes/)** - API route definitions (6 files)
- **[middleware/](./src/middleware/)** - Authentication, authorization, error handling (4 files)

### Data Processing
- **[scripts/](./scripts/)** - Database migration and data processing scripts (5 files)
- **[src/scripts/](./src/scripts/)** - Enhanced data processing utilities (7 files)
- **[services/](./src/services/)** - Email and external service integrations

## 🏗️ Original Architecture

This backend provided:
- **PostgreSQL Database** - Relational data storage for all logistics data
- **Sequelize ORM** - Database abstraction and migrations
- **Express.js API** - RESTful endpoints for data operations
- **Authentication System** - User management and authorization
- **File Upload Processing** - Excel file parsing and database insertion
- **Email Services** - Notification and alert systems

## 🔄 Migration to Current System

**Replaced By:**
- **Excel Server**: `simple-excel-server.js` (root directory)
- **IndexedDB Storage**: Client-side data persistence
- **Context API**: React state management replacing database queries
- **Direct Excel Processing**: `src/utils/processors/` modules

**Benefits of Migration:**
- ✅ Zero database setup required
- ✅ Faster development and deployment
- ✅ Simplified data pipeline
- ✅ Reduced infrastructure complexity
- ✅ Direct Excel file workflow

## 🗂️ Data Models (Historical Reference)

The backend defined comprehensive data models:
- `BulkAction.js` - Bulk fluid actions and operations
- `CostAllocation.js` - Cost center and allocation data
- `VesselManifest.js` - Vessel cargo and manifest tracking
- `VoyageEvent.js` - Vessel voyage events and activities
- `VoyageList.js` - Voyage planning and scheduling
- `VesselClassification.js` - Vessel type and capability data
- `User.js` - Authentication and user management
- `FluidAnalysis.js` - Drilling fluid analysis data
- `MasterFacility.js` - Facility and location master data
- `WellOperation.js` - Well drilling operations

## 📊 Migration Scripts

Scripts for migrating from PostgreSQL to Excel workflow:
- `migrate-voyage-event-departments.js` - Department field migration
- `enhanceExistingVoyageEvents.js` - Data enhancement utilities
- `getVoyageStatistics.js` - Statistical analysis migration
- `seedReferenceData.js` - Reference data seeding

## 🚀 Current Production System

**Active Components:**
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Data Source**: Excel files in `/excel-data/excel-files/`
- **Server**: `simple-excel-server.js` (Express.js file server)
- **Storage**: IndexedDB for client-side persistence
- **Processing**: Modular processors in `src/utils/processors/`

## 💡 When to Reference This Backend

**Useful for:**
- Understanding original data model relationships
- Historical data migration needs
- Reference for comprehensive field definitions
- Learning business logic patterns

**NOT for:**
- New feature development (use current Excel workflow)
- Production deployment (backend is inactive)
- Current system troubleshooting

## 📖 Related Documentation

- [Architecture Overview](../docs/ARCHITECTURE.md) - Current system architecture
- [Data Mapping Guide](../docs/DATA_MAPPING_GUIDE.md) - Excel data processing
- [Deployment Instructions](../docs/DEPLOYMENT_INSTRUCTIONS.md) - Current deployment (no backend)