# 🚢 BP Logistics Analytics Dashboard

> **Transform Your Offshore Operations with Intelligent Analytics**

A comprehensive, modern analytics platform designed specifically for BP's offshore drilling and production operations. Upload your logistics data and get instant insights through beautiful, interactive dashboards.

![BP Logistics Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-blue)

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
- **React 18**: Latest React features with functional components and hooks
- **Tailwind CSS**: Utility-first styling for rapid development
- **Modular Architecture**: Clean separation of concerns and reusable components

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
│   ├── dashboard/
│   │   ├── FileUploadPage.tsx      # Data management interface
│   │   └── MainDashboard.tsx       # Main analytics dashboard
│   ├── layout/
│   │   ├── DashboardLayout.tsx     # Layout for analytics pages
│   │   └── DataManagementLayout.tsx # Layout for data upload
│   ├── LandingPage.tsx             # Stunning homepage showcase
│   └── FileUpload.tsx              # File upload components
├── context/
│   └── DataContext.tsx             # Global state management
├── data/
│   ├── masterFacilities.ts         # Static facility data
│   └── README.md                   # Data structure documentation
├── types/
│   └── index.ts                    # TypeScript type definitions
└── utils/
    └── dataProcessing.ts           # Data processing utilities
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

# Type checking
npm run type-check

# Linting
npm run lint
```

### Key Technologies

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and IntelliSense
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, customizable icons
- **Vite/Create React App**: Fast development and build tools

## 📈 Performance Features

- **Lazy Loading**: Components loaded on demand
- **Optimized Images**: Compressed and responsive images
- **Code Splitting**: Reduced bundle sizes
- **Caching**: Intelligent data caching strategies
- **Responsive Design**: Mobile-first approach

## 🛡️ Security & Compliance

- **Data Validation**: Comprehensive input validation
- **Type Safety**: TypeScript prevents runtime errors
- **Secure Storage**: localStorage with data encryption
- **Error Handling**: Graceful error recovery
- **Audit Trail**: Processing logs and data tracking

## 🚀 Deployment

### Production Build

```bash
# Create optimized production build
npm run build

# Serve locally for testing
npx serve -s build
```

### Environment Variables

```env
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by BP p.l.c. All rights reserved.

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