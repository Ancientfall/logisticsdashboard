# 🚢 BP Logistics Analytics Dashboard

> **Transform Your Offshore Operations with Intelligent Analytics**

A comprehensive, modern analytics platform designed specifically for BP's offshore drilling and production operations. Upload your logistics data and get instant insights through beautiful, interactive dashboards.

![BP Logistics Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-19.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-blue)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20AA-green)
![Security](https://img.shields.io/badge/Security-Hardened-brightgreen)

## 🌟 Features

### 🎯 **Smart Data Management**
- **Dual Upload Modes**: Initial data load vs incremental monthly updates
- **Intelligent Processing**: Automatic deduplication and data validation
- **Persistent Storage**: localStorage integration with automatic backup
- **Real-time Feedback**: Live processing logs and status indicators

### 📊 **Specialized Dashboards**
- **Drilling Dashboard**: Monitor rig operations, efficiency metrics, and safety KPIs
- **Production Dashboard**: Track facility output, performance indicators, and quality metrics
- **Comparison View**: Side-by-side analysis across facilities and time periods
- **Data Management**: Upload interface with validation and processing controls

### 🎨 **Modern User Experience**
- **Beautiful Landing Page**: Showcase platform capabilities and value proposition
- **BP Brand Integration**: Professional design with BP green color scheme
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Engaging transitions and interactive elements

### 🔧 **Technical Excellence**
- **TypeScript**: Full type safety and enhanced developer experience
- **React 19**: Latest React features with functional components and hooks
- **Tailwind CSS**: Utility-first styling for rapid development
- **Modular Architecture**: Clean separation of concerns and reusable components
- **Refactored Processing Pipeline**: Modular data processing with improved maintainability
- **WCAG 2.1 AA Compliance**: Complete accessibility framework with screen reader support
- **Performance Optimized**: Bundle size reduced 63% (2.6MB → 0.95MB) with lazy loading
- **Security Hardened**: 14 critical vulnerabilities resolved, enhanced validation
- **Comprehensive Testing**: 50+ tests across 9 test files with full coverage

### 🏗️ **Architecture**
- **Layered Design**: Clear separation between presentation, processing, and data layers
- **Modular Processors**: Specialized processors for different data types (voyage events, manifests, cost allocation)
- **Pure Functions**: Testable utility functions with minimal side effects
- **Performance Optimized**: Chunked file reading, lookup maps, and memory-efficient processing
- **Type Safe**: Comprehensive TypeScript interfaces and data validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/Ancientfall/logisticsdashboard.git

# Navigate to project directory
cd logisticsdashboard

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000` with the stunning landing page.

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/                   # 8 specialized analytics dashboards
│   │   ├── DrillingDashboard.tsx   # Drilling operations analytics
│   │   ├── ProductionDashboard.tsx # Production facility metrics
│   │   ├── VoyageAnalyticsDashboard.tsx # Voyage analytics
│   │   └── ...                     # 5 additional dashboards
│   ├── layout/
│   │   ├── DashboardLayout.tsx     # Layout for analytics pages
│   │   └── LoadingBoundary.tsx     # Error boundary with loading states
│   ├── lazy/                       # Lazy-loaded components for performance
│   ├── security/                   # Security components (HTTPS enforcer)
│   ├── ui/                         # Reusable UI components
│   ├── LandingPage.tsx             # Stunning homepage showcase
│   ├── DashboardShowcase.tsx       # Dashboard selection interface
│   └── TVKioskDisplay.tsx          # TV display for operations center
├── context/
│   ├── DataContext.tsx             # Global state management
│   ├── DashboardContext.tsx        # Dashboard-specific state
│   ├── NotificationContext.tsx     # Notification system
│   └── AccessibilityProvider.tsx   # Accessibility context
├── hooks/                          # Custom React hooks
├── utils/
│   ├── processors/                 # Modular data processors
│   ├── accessibility.ts            # WCAG 2.1 AA utilities
│   ├── dataProcessing.ts           # Main processing pipeline
│   ├── lcAllocation.ts             # Location code processing
│   ├── vesselCost.ts               # Cost calculations
│   └── metricsCalculation.ts       # KPI calculations
├── types/
│   └── index.ts                    # Comprehensive TypeScript interfaces
├── __tests__/                      # Test suites (9 files, 50+ tests)
└── data/
    └── masterFacilities.ts         # Static facility data
```

## 🎯 User Journey

### 1. **Landing Experience**
- **Compelling Hero Section**: Clear value proposition with animated statistics
- **Feature Showcase**: Six key capabilities with interactive cards
- **Dashboard Preview**: Visual representation of available analytics
- **Call-to-Action**: Multiple entry points to start using the platform

### 2. **Data Upload Process**
- **Mode Selection**: Choose between initial load or incremental update
- **File Upload**: Drag-and-drop interface for Excel files
- **Real-time Processing**: Live feedback with progress indicators
- **Validation**: Automatic data validation and error reporting

### 3. **Analytics Experience**
- **Drilling Dashboard**: Comprehensive drilling operations analytics
- **Production Dashboard**: Production facility performance metrics
- **Comparison Tools**: Cross-facility and temporal analysis
- **Export Capabilities**: Data export for further analysis

## 📊 Supported Data Types

### Required Files
- **Voyage Events**: Vessel movement and operational events
- **Cost Allocation**: Financial data and cost breakdowns
- **Voyage List**: Comprehensive voyage information

### Optional Files
- **Vessel Manifests**: Detailed cargo and passenger information

### Automatic Data
- **Master Facilities**: Pre-loaded facility information (5 Production, 10 Drilling, 2 Integrated)

## 🎨 Design System

### Color Palette
- **Primary Green**: `#059669` (BP Brand)
- **Secondary Blue**: `#2563eb`
- **Accent Colors**: Purple, Orange, Yellow for data visualization
- **Neutrals**: Gray scale for text and backgrounds

### Typography
- **Headings**: Bold, modern sans-serif
- **Body Text**: Clean, readable font stack
- **Code**: Monospace for technical content

### Components
- **Cards**: Rounded corners with subtle shadows
- **Buttons**: Gradient backgrounds with hover effects
- **Forms**: Clean inputs with validation states
- **Navigation**: Consistent styling across layouts

## 🔧 Development

### Available Scripts

```bash
# Development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=voyageEventProcessor.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="LC allocation"

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🧪 Testing

### Test Coverage
- **Test Files**: 9 comprehensive test suites
- **Test Cases**: 50+ tests covering core functionality
- **Coverage Areas**: Data processing, calculations, components, utilities
- **Test Types**: Unit tests, integration tests, component tests
- **Quality Gates**: Build fails on test failures

### Test Structure
```
src/
├── __tests__/
│   ├── utils/
│   │   ├── costAllocationProcessor.test.ts
│   │   ├── dataProcessing.test.ts
│   │   ├── lcAllocation.test.ts
│   │   ├── metricsCalculation.test.ts
│   │   └── vesselCost.test.ts
│   └── components/
│       ├── voyageEventProcessor.test.ts
│       ├── vesselManifestProcessor.test.ts
│       └── bulkActionsProcessor.test.ts
```

### Key Technologies

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and IntelliSense
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, customizable icons
- **Vite/Create React App**: Fast development and build tools

## 📈 Performance Features

- **Lazy Loading**: Components loaded on demand with React.lazy()
- **Code Splitting**: Strategic chunking reduced bundle from 2.6MB to 0.95MB
- **Optimized Images**: AVIF support with fallbacks, compressed assets
- **Caching**: Intelligent data caching with IndexedDB persistence
- **Memory Management**: Efficient data processing with streaming
- **Bundle Analysis**: Webpack optimization with chunk splitting
- **Loading States**: Comprehensive loading boundaries and error handling

## 🛡️ Security & Compliance

- **Vulnerability Resolution**: Fixed 14 critical security issues (xlsx, multer, form-data)
- **Data Validation**: Comprehensive input validation and sanitization
- **Type Safety**: TypeScript prevents runtime errors with strict mode
- **Secure Headers**: CSP, HSTS, and security headers configured
- **Error Handling**: Secure error handling without information leakage
- **Dependency Management**: Regular security audits and updates
- **WCAG 2.1 AA**: Complete accessibility compliance with screen reader support
- **Audit Trail**: Processing logs and data tracking with security context

## 🚀 Deployment

### Production Environment
- **Live URL**: https://bpsolutionsdashboard.com
- **Status**: ✅ Fully operational
- **Server**: VPS with PM2 process management
- **CDN**: Cloudflare with HTTPS termination
- **Monitoring**: Real-time health checks and logs

### Production Build

```bash
# Create optimized production build
npm run build

# Create deployment package
tar -czf bp-dashboard-deployment-$(date +%Y%m%d_%H%M%S).tar.gz -C build .

# Deploy to VPS (automated)
./deploy-with-sshpass.sh

# Serve locally for testing
npx serve -s build
```

### Environment Variables

```env
REACT_APP_VERSION=2.1.2
REACT_APP_ENVIRONMENT=production
VPS_SSH_USER=www-data
VPS_SERVER_IP=178.16.140.185
VPS_SERVER_PATH=/var/www/logisticsdashboard
```

### Production Features
- **Zero-downtime deployments** with PM2 process management
- **Automatic Excel file loading** from server
- **Health monitoring** with real-time status checks
- **Performance monitoring** with bundle analysis
- **Security headers** configured in Nginx
- **Backup systems** for data protection

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by Neal Smothers & BP p.l.c. All rights reserved.

## 🤝 Support

For technical support or questions:
- **Internal Teams**: Contact the Digital Analytics team
- **Issues**: Use the GitHub issue tracker
- **Documentation**: Check the `/docs` folder for detailed guides

---

<div align="center">

**Built with ❤️ for BP's Offshore Operations**

*Transforming data into actionable insights for safer, more efficient operations*

</div>
