# BP Logistics Dashboard Documentation

This directory contains comprehensive documentation for the BP Logistics Analytics Dashboard project.

## 📚 Documentation Index

### Architecture & Development
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview and component relationships
- **[FILE_STRUCTURE_REFACTOR.md](./FILE_STRUCTURE_REFACTOR.md)** - File organization and refactoring guidelines
- **[DASHBOARD_DESIGN_GUIDELINES.md](./DASHBOARD_DESIGN_GUIDELINES.md)** - UI/UX design standards and BP brand guidelines

### Data Management
- **[DATA_MAPPING_GUIDE.md](./DATA_MAPPING_GUIDE.md)** - Data processing, mapping, and transformation documentation
- **[MONTHLY_UPLOAD.md](./MONTHLY_UPLOAD.md)** - Monthly data upload procedures and duplicate prevention

### Deployment & Operations
- **[DEPLOYMENT_COMMANDS.md](./DEPLOYMENT_COMMANDS.md)** - Essential deployment commands and procedures
- **[DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)** - Step-by-step deployment guide for VPS

### Security
- **[SECURITY.md](./SECURITY.md)** - Security policies and best practices
- **[SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)** - Security enhancement guidelines and implementations

## 🚀 Quick Start

For new developers:
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Review [DASHBOARD_DESIGN_GUIDELINES.md](./DASHBOARD_DESIGN_GUIDELINES.md) for design standards
3. Check [DATA_MAPPING_GUIDE.md](./DATA_MAPPING_GUIDE.md) for data processing workflows

For deployment:
1. Follow [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md)
2. Use commands from [DEPLOYMENT_COMMANDS.md](./DEPLOYMENT_COMMANDS.md)

## 📋 Project Overview

The BP Logistics Analytics Dashboard is a React 19 + TypeScript application for offshore drilling and production operations analytics. It processes Excel files through modular processors, stores data in IndexedDB, and provides 8 specialized dashboard modules for comprehensive logistics analytics.

**Key Features:**
- Zero-setup Excel file processing
- Real-time KPI analytics and variance analysis
- TV kiosk display for operational dashboards
- Monthly cumulative data upload system
- Production deployment at https://bpsolutionsdashboard.com