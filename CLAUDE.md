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

### Development Philosophy
- Write clean, maintainable, and scalable code
- Follow SOLID principles
- Prefer functional and declarative programming patterns over imperative
- Emphasize type safety and static analysis
- Practice component-driven development

### Code Implementation Guidelines

#### Planning Phase
- Begin with step-by-step planning
- Write detailed pseudocode before implementation
- Document component architecture and data flow
- Consider edge cases and error scenarios

#### Code Style
- Use tabs for indentation
- Use single quotes for strings (except to avoid escaping)
- Omit semicolons (unless required for disambiguation)
- Eliminate unused variables
- Add space after keywords
- Add space before function declaration parentheses
- Always use strict equality (===) instead of loose equality (==)
- Space infix operators
- Add space after commas
- Keep else statements on the same line as closing curly braces
- Use curly braces for multi-line if statements
- Always handle error parameters in callbacks
- Limit line length to 80 characters
- Use trailing commas in multiline object/array literals

### Naming Conventions

#### General Rules
- Use PascalCase for:
  - Components
  - Type definitions
  - Interfaces
- Use kebab-case for:
  - Directory names (e.g., components/auth-wizard)
  - File names (e.g., user-profile.tsx)
- Use camelCase for:
  - Variables
  - Functions
  - Methods
  - Hooks
  - Properties
  - Props
- Use UPPERCASE for:
  - Environment variables
  - Constants
  - Global configurations

#### Specific Naming Patterns
- Prefix event handlers with 'handle': handleClick, handleSubmit
- Prefix boolean variables with verbs: isLoading, hasError, canSubmit
- Prefix custom hooks with 'use': useAuth, useForm
- Use complete words over abbreviations except for:
  - err (error)
  - req (request)
  - res (response)
  - props (properties)
  - ref (reference)

### React Best Practices

#### Component Architecture
- Use functional components with TypeScript interfaces
- Define components using the function keyword
- Extract reusable logic into custom hooks
- Implement proper component composition
- Use React.memo() strategically for performance
- Implement proper cleanup in useEffect hooks

#### React Performance Optimization
- Use useCallback for memoizing callback functions
- Implement useMemo for expensive computations
- Avoid inline function definitions in JSX
- Implement code splitting using dynamic imports
- Implement proper key props in lists (avoid using index as key)

### TypeScript Implementation
- Enable strict mode
- Define clear interfaces for component props, state, and Redux state structure
- Use type guards to handle potential undefined or null values safely
- Apply generics to functions, actions, and slices where type flexibility is needed
- Utilize TypeScript utility types (Partial, Pick, Omit) for cleaner and reusable code
- Prefer interface over type for defining object structures, especially when extending
- Use mapped types for creating variations of existing types dynamically

### UI and Styling

#### Styling Guidelines
- Use Tailwind CSS for utility-first, maintainable styling
- Design with mobile-first, responsive principles for flexibility across devices
- Implement dark mode using CSS variables or Tailwind's dark mode features
- Ensure color contrast ratios meet accessibility standards for readability
- Maintain consistent spacing values to establish visual harmony
- Define CSS variables for theme colors and spacing to support easy theming and maintainability

### State Management

#### Local State
- Use useState for component-level state
- Implement useReducer for complex state
- Use useContext for shared state
- Implement proper state initialization

#### Global State
- Use Redux Toolkit for global state when needed
- Use createSlice to define state, reducers, and actions together
- Avoid using createReducer and createAction unless necessary
- Normalize state structure to avoid deeply nested data
- Use selectors to encapsulate state access
- Avoid large, all-encompassing slices; separate concerns by feature

### Error Handling and Validation

#### Form Validation
- Use Zod for schema validation
- Implement proper error messages
- Use proper form libraries (e.g., React Hook Form)

#### Error Boundaries
- Use error boundaries to catch and handle errors in React component trees gracefully
- Log caught errors to an external service (e.g., Sentry) for tracking and debugging
- Design user-friendly fallback UIs to display when errors occur, keeping users informed without breaking the app

### Testing

#### Unit Testing
- Write thorough unit tests to validate individual functions and components
- Use Jest and React Testing Library for reliable and efficient testing of React components
- Follow patterns like Arrange-Act-Assert to ensure clarity and consistency in tests
- Mock external dependencies and API calls to isolate unit tests

#### Integration Testing
- Focus on user workflows to ensure app functionality
- Set up and tear down test environments properly to maintain test independence
- Use snapshot testing selectively to catch unintended UI changes without over-relying on it
- Leverage testing utilities (e.g., screen in RTL) for cleaner and more readable tests

### Accessibility (a11y)

#### Core Requirements
- Use semantic HTML for meaningful structure
- Apply accurate ARIA attributes where needed
- Ensure full keyboard navigation support
- Manage focus order and visibility effectively
- Maintain accessible color contrast ratios
- Follow a logical heading hierarchy
- Make all interactive elements accessible
- Provide clear and accessible error feedback

### Security
- Implement input sanitization to prevent XSS attacks
- Use DOMPurify for sanitizing HTML content
- Use proper authentication methods

### Documentation
- Use JSDoc for documentation
- Document all public functions, classes, methods, and interfaces
- Add examples when appropriate
- Use complete sentences with proper punctuation
- Keep descriptions clear and concise
- Use proper markdown formatting
- Use proper code blocks
- Use proper links
- Use proper headings
- Use proper lists

## Integration Points Memory

### Data Processing and Integration

#### Vessel Cost Calculation
```javascript
const baseHourlyRate = vesselSize > 300 ? 1500 : vesselSize > 250 ? 1200 : vesselSize > 200 ? 1000 : 800
const vesselHourlyRate = vesselType === 'FSV' ? baseHourlyRate * 0.8 : baseHourlyRate
```

#### NPT (Non-Productive Time) Detection
```javascript
if (combined.includes('waiting') || combined.includes('delay') ||
    combined.includes('breakdown') || combined.includes('weather') ||
    combined.includes('standby') || combined.includes('equipment failure')) {
    return 'Non-Productive'
}
```

### Reference Data Integration Points

#### Voyage Events
- Enhanced vessel classification metadata
- Accurate company assignment from vessel names
- Size-based cost calculations
- NPT activity detection

#### Vessel Manifests
- Company inference from transporter vessel names
- Enhanced vessel type classification
- Cargo efficiency based on vessel size

#### Cost Allocation
- Company inference from vessel names in data
- Enhanced rig location cost analysis
- locationReference field for dashboard compatibility

#### Bulk Actions
- Vessel classification metadata
- Company assignment for fluid transfers
- Enhanced vessel type for transfer analysis

#### Voyage List
- Vessel classification integration
- Company assignment for voyage planning
- Vessel size-based efficiency calculations

### Dashboard Improvements

#### Drilling Dashboard
- NPT Impact: Detects waiting, delays, weather, equipment failures
- Productive Time: Enhanced LC allocation with vessel classification
- Rig Cost Analysis: Added locationReference field
- Vessel Utilization: Size-based cost calculations

#### Production Dashboard
- Fluid Movements: Enhanced bulk action classification
- Cargo Operations: Vessel size-based efficiency metrics
- Company Analytics: Accurate vessel company assignments

### Data Processing Chain

Excel Files → Enhanced Processing → PostgreSQL → APIs → Dashboard KPIs

1. Vessel Names → Vessel Classification
2. Activity Events → Enhanced Activity Classification
3. Location Names → Master Facilities
4. Fluid Types → Bulk Fluid Classification
5. Cost Data → Enhanced Cost Analysis

### Expected Improvements
1. Accurate Company Distribution
2. Proper Vessel Type Analysis
3. Realistic Cost Calculations
4. NPT Impact Detection
5. Enhanced Utilization Metrics

### Next Steps
Clear all data and re-upload 5 Excel files to validate:
- Accurate vessel companies
- NPT percentages
- Realistic cost calculations
- Enhanced activity categorization
- Complete rig location cost analysis

## Data Migration Memory

### Migration Overview
Key Sections:

1. Migration Overview - The core challenge and approach
2. Data Processing Requirements - Analysis of 15+ frontend utility files
3. Enhanced Field Mappings - Complete mapping of 50+ enhanced fields
4. Migration Phases - The 3-phase approach we used
5. Database Schema Enhancements - All model updates and indexes
6. Processing Pipelines - Code examples and implementation details
7. Validation & Quality Assurance - Data quality scoring system
8. Performance Considerations - Batch processing and optimization
9. Troubleshooting - Common issues and solutions
10. Best Practices - Lessons learned and recommendations

Critical Insights Documented:

- The Core Discovery: Dashboard components expect enhanced, processed data with calculated fields - not just raw Excel data
- Field Dependencies: Specific fields each dashboard component requires
- Processing Logic: Complete implementation details for all transformations
- Migration Results: 51,575 events, 1,475 voyages, 18 months of data
- Validation Strategy: 99.98% perfect data quality scores

Practical Value:

This guide serves as a complete reference for:
- Future migrations or similar projects
- Understanding the sophisticated data processing requirements
- Implementing enhanced field calculations
- Troubleshooting dashboard issues
- Maintaining and extending the PostgreSQL implementation

The document captures the full journey from discovering missing fields to implementing comprehensive voyage analytics, providing a roadmap for anyone working with similar data migration challenges.

## Hostinger VPS Server Implementation

### Overview
The BP Logistics Dashboard is deployed on a Hostinger VPS server with a file-based approach for Excel data distribution. This implementation preserves the current working IndexedDB + client-side processing architecture while enabling server-side data management.

### Architecture: File-Based Server Approach

#### Current Working System (Preserved)
```
Excel Files (Local) → Client Processing → IndexedDB → Dashboard Display
```

#### Enhanced System (Hostinger VPS)
```
Excel Files (VPS) → Client Processing → IndexedDB → Dashboard Display
                ↓
        Server-Side Management
```

### Hostinger VPS Configuration

#### Server Directory Structure
```bash
/var/www/html/logistics-data/
├── excel-files/
│   ├── voyage-events.xlsx
│   ├── cost-allocation.xlsx
│   ├── vessel-manifests.xlsx
│   ├── voyage-list.xlsx
│   └── bulk-actions.xlsx
├── reference-data/
│   ├── vessel-classifications.xlsx
│   └── master-facilities.xlsx
└── api/
    └── file-server.js
```

#### File Management Approach
- **Admin uploads**: Excel files stored in `/var/www/html/logistics-data/excel-files/`
- **User access**: Files served via API endpoints
- **Processing**: Client-side using existing `dataProcessing.ts` logic
- **Storage**: IndexedDB with current enhancement pipeline

### Implementation Details

#### Server-Side File API
```javascript
// file-server.js - Simple Express file server
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const DATA_DIR = '/var/www/html/logistics-data/excel-files';

// Serve Excel files
app.get('/api/excel-files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(DATA_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// List available files
app.get('/api/excel-files', (req, res) => {
  const files = fs.readdirSync(DATA_DIR)
    .filter(file => file.endsWith('.xlsx'))
    .map(file => ({
      name: file,
      size: fs.statSync(path.join(DATA_DIR, file)).size,
      modified: fs.statSync(path.join(DATA_DIR, file)).mtime
    }));
  
  res.json(files);
});
```

#### Client-Side Integration
```typescript
// Enhanced FileUpload component
const FileUpload = () => {
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  
  // Load files from Hostinger VPS
  const loadFromServer = async () => {
    try {
      // Fetch file list from server
      const response = await fetch('/api/excel-files');
      const files = await response.json();
      setServerFiles(files);
      
      // Download and process each file
      for (const file of files) {
        const fileResponse = await fetch(`/api/excel-files/${file.name}`);
        const blob = await fileResponse.blob();
        const excelFile = new File([blob], file.name);
        
        // Process using existing dataProcessing.ts logic
        await processExcelFile(excelFile);
      }
      
      // Save to IndexedDB using current flow
      await saveToIndexedDB(processedData);
      
    } catch (error) {
      console.error('Failed to load from server:', error);
      // Fallback to local upload
    }
  };
  
  return (
    <div>
      <Button onClick={loadFromServer}>Load Data from Server</Button>
      <FileUploadComponent /> {/* Existing component */}
    </div>
  );
};
```

### Key Preservation Points

#### What Remains Unchanged
1. **Data Processing Logic**: All existing processors in `src/processors/` remain identical
2. **Enhancement Pipeline**: `enhanceDataWithProcessors` function preserved
3. **IndexedDB Storage**: Current caching and storage system maintained
4. **Dashboard Components**: No changes to data expectations or interfaces
5. **Fallback System**: Smart fallback hierarchy (IndexedDB → localStorage → reference data)

#### What Gets Enhanced
1. **File Source**: Excel files can come from VPS instead of local upload
2. **Data Sharing**: Multiple users can access same dataset
3. **Admin Management**: Centralized file management on server
4. **Deployment**: Consistent data across all user sessions

### Benefits of This Approach

#### Technical Benefits
- **Zero Risk**: Preserves all current working functionality
- **Backward Compatible**: Local file upload still works as fallback
- **Performance**: Client-side processing maintains speed
- **Reliability**: Current data enhancement pipeline unchanged

#### User Benefits
- **No Local Files**: Users don't need Excel files on their computers
- **Consistent Data**: Everyone sees same dataset
- **Instant Access**: Load data with single button click
- **Admin Control**: Centralized data management

#### Operational Benefits
- **Simple Deployment**: No database migration required
- **Easy Backup**: Excel files can be backed up/versioned
- **Debugging**: Easy to inspect raw data files
- **Maintenance**: Simple file management interface

### Implementation Strategy

#### Phase 1: Add Server File Loading
```typescript
// Add to existing FileUpload component
const useServerFiles = () => {
  const loadServerData = async () => {
    // Fetch from Hostinger VPS
    // Process with existing logic
    // Save to IndexedDB
    // Update contexts
  };
  
  return { loadServerData };
};
```

#### Phase 2: Admin File Management
```typescript
// Admin interface for file management
const AdminFileManager = () => {
  const uploadToServer = async (files: File[]) => {
    // Upload Excel files to VPS
    // Update file listings
    // Notify users of new data
  };
  
  return <FileManagementInterface />;
};
```

#### Phase 3: User Experience Enhancement
```typescript
// Enhanced user interface
const DataLoadingOptions = () => {
  return (
    <div>
      <Button onClick={loadFromServer}>Load Latest Data</Button>
      <Button onClick={loadFromLocal}>Upload Local Files</Button>
    </div>
  );
};
```

### Deployment Considerations

#### Hostinger VPS Requirements
- **File Storage**: Sufficient space for Excel files (~10-50MB each)
- **API Endpoints**: Simple Express server for file serving
- **Security**: Basic authentication for admin file uploads
- **Backup**: Regular backup of Excel files directory

#### File Management Best Practices
- **Naming Convention**: Consistent file naming (e.g., `voyage-events-2024-Q1.xlsx`)
- **Version Control**: Keep previous versions for rollback
- **Validation**: Server-side file validation before serving
- **Monitoring**: Log file access and processing success rates

### Success Metrics

#### Technical Metrics
- **Processing Time**: Maintain current client-side processing speed
- **Data Quality**: Preserve 99.98% data quality scores
- **Error Rate**: Maintain current low error rates
- **Compatibility**: 100% backward compatibility with existing features

#### User Experience Metrics
- **Load Time**: Single-click data loading under 30 seconds
- **Reliability**: 99.9% successful data loading from server
- **Accessibility**: Zero learning curve for existing users
- **Convenience**: Eliminate need for local file management

This implementation provides the server-side data management capabilities while preserving the robust, proven client-side processing architecture that currently works well.