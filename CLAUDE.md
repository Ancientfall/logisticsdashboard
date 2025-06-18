# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server (runs on http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Architecture Overview

This is a BP Logistics Analytics Dashboard built with React 19, TypeScript, and Tailwind CSS. The application provides real-time analytics for offshore drilling and production operations.

### State Management
- **Context API** is used for global state management with three main contexts:
  - `DataContext`: Core data operations and state
  - `DashboardContext`: Dashboard-specific state and filters
  - `NotificationContext`: User notification system

### Data Flow
1. **Excel files** are uploaded through the FileUpload component
2. **Processors** in `src/processors/` validate and transform data
3. **Dexie (IndexedDB)** stores processed data persistently
4. **Context providers** distribute data to components
5. **Dashboard components** visualize and interact with data

### Key Architectural Decisions
- **Component organization**: Features are grouped by domain (dashboard/, layout/, ui/)
- **Type safety**: All data structures have TypeScript interfaces in `src/types/`
- **Error boundaries**: Graceful error handling with fallback UI
- **Custom hooks**: Business logic is extracted into reusable hooks
- **Data processing**: Modular processors handle different data types independently

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
- Large datasets are processed client-side
- IndexedDB for persistent storage avoids re-processing
- React.memo for expensive component renders
- Virtual scrolling for large lists (when implemented)

## Development Standards

(... rest of the existing content remains the same ...)

## Implementation Memories

### Latest Deployment Memory ⏺ ✅ Complete Implementation Successfully Deployed!

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

📋 Next Steps:

1. Clear Cloudflare Cache to see new functionality immediately
2. Test "View Analytics" button from landing page
3. Verify Dashboard Access with pre-loaded data

The BP Logistics Dashboard now provides an enterprise-grade, zero-setup experience where users can access fully loaded analytics
dashboards with a single click! 🎯