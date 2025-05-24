# 🛢️ BP Logistics Dashboard

> **Modern React TypeScript application for offshore vessel operations analytics**

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A powerful, modern web application that transforms PowerBI dashboards into a sleek, responsive React interface for analyzing offshore vessel operations and logistics data.

## ✨ Features

### 🎨 Modern Design System
- **BP Corporate Branding** - Authentic green and yellow color scheme
- **Glassmorphism UI** - Modern backdrop blur effects and transparency
- **Animated BP Helios Logo** - Rotating sun symbol with authentic styling
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

### 🏗️ Architecture
- **React 18** with TypeScript for type safety
- **Component-based Architecture** - Scalable and maintainable
- **Context API** for global state management
- **Modern CSS3** with custom properties and animations

### 📊 Data Processing (Coming in Phase 2)
- **Excel File Processing** - Direct upload and parsing
- **PowerQuery Logic** - Complex LC number allocation and location mapping
- **Real-time Analytics** - Instant calculations and visualizations
- **Offline Capable** - All processing happens in the browser

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

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

The application will open at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/          # Main dashboard components
│   │   └── FileUploadPage.tsx
│   ├── charts/            # Data visualization components
│   ├── layout/            # Layout and navigation
│   │   └── DashboardLayout.tsx
│   └── ui/                # Reusable UI components
├── context/
│   └── DataContext.tsx    # Global state management
├── types/
│   └── index.ts          # TypeScript interfaces
├── utils/                # Helper functions
├── hooks/                # Custom React hooks
└── data/                 # Sample data and processors
```

## 🎯 Roadmap

### ✅ Phase 1 - Foundation (Complete)
- [x] Modern React TypeScript setup
- [x] Component architecture
- [x] BP corporate design system
- [x] Responsive layouts
- [x] Type-safe data interfaces

### 🚧 Phase 2 - Data Processing (In Progress)
- [ ] Excel file upload with drag & drop
- [ ] SheetJS integration for file parsing  
- [ ] PowerQuery transformation logic
- [ ] LC number allocation system
- [ ] Location mapping and facility classification

### 🔮 Phase 3 - Visualizations (Planned)
- [ ] Interactive charts with Recharts
- [ ] KPI dashboard cards
- [ ] Real-time filtering and search
- [ ] Export capabilities
- [ ] Advanced analytics

### 🌟 Phase 4 - Advanced Features (Future)
- [ ] Dark/light theme toggle
- [ ] Custom date range selection
- [ ] Performance optimization
- [ ] PWA capabilities

## 🔧 Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript |
| **Styling** | CSS3, Custom Properties, Glassmorphism |
| **Charts** | Recharts, D3.js integration |
| **Icons** | Lucide React |
| **File Processing** | SheetJS (xlsx) |
| **Data Manipulation** | Lodash, Date-fns |
| **State Management** | React Context API |

## 📊 Data Sources

The application processes the following Excel files:

- **Voyage Events.xlsx** - Hourly vessel activity data
- **Vessel Manifests.xlsx** - Cargo shipment details  
- **Master Facilities.xlsx** - Facility classifications
- **Cost Allocation.xlsx** - LC number mappings

## 🎨 Design Philosophy

This dashboard embraces modern web design principles:

- **Performance First** - Client-side processing for instant results
- **User Experience** - Intuitive navigation and smooth interactions
- **Corporate Identity** - Authentic BP branding and colors
- **Accessibility** - WCAG compliant design patterns
- **Responsive** - Mobile-first approach

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Notes

### Key Business Logic
- **LC Number Processing** - Complex percentage allocation across multiple cost centers
- **Activity Classification** - Productive vs Non-Productive categorization
- **Location Mapping** - Integrated facility handling (Mad Dog, Thunder Horse)
- **Department Assignment** - Drilling vs Production classification

### Performance Considerations
- **Lazy Loading** - Components load on demand
- **Memoization** - Expensive calculations are cached
- **Virtual Scrolling** - Handle large datasets efficiently

## 📈 Advantages Over PowerBI

| Feature | PowerBI | This Dashboard |
|---------|---------|----------------|
| **Performance** | Model refresh required | Instant processing |
| **Customization** | Limited | Unlimited flexibility |
| **Mobile Experience** | Basic | Fully responsive |
| **Licensing** | Per user cost | No licensing fees |
| **Offline Capability** | No | Yes |
| **Custom Logic** | DAX limitations | Full JavaScript power |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **BP Corporate** - For the authentic branding and color palette
- **React Team** - For the amazing framework
- **TypeScript Team** - For making JavaScript better
- **Open Source Community** - For the incredible tools and libraries

---

**Built with ❤️ for offshore energy operations**

*Transform your data. Empower your decisions. Drive your business forward.*