# System Architecture Documentation

## Overview

The Logistics Dashboard has been refactored into a modular architecture to improve maintainability, testability, and scalability. The system follows a layered architecture with clear separation of concerns.

## Architecture Layers

### 1. **Presentation Layer** (`src/components/`)
- React components for user interface
- Dashboard views and data visualization
- File upload and management interfaces

### 2. **Data Processing Layer** (`src/utils/`)
- **Core Module**: `dataProcessing.ts` - Main orchestration
- **Specialized Processors**: Modular data processing units
- **Utilities**: Helper functions and utilities
- **Calculations**: Metrics and analytics

### 3. **Data Layer** (`src/data/`)
- Master data definitions
- Static reference data
- Data validation schemas

### 4. **Types Layer** (`src/types/`)
- TypeScript interfaces and types
- Data model definitions
- API contracts

## Modular Processing Architecture

### Core Processing Flow

```
Excel Files → dataProcessing.ts → Specialized Processors → Metrics → Dashboard
```

### Processor Modules

#### 1. **Excel Reading** (`src/utils/excel/`)
- `excelReader.ts` - Universal Excel file reading with multiple fallback methods
- Handles large files with chunked reading
- Browser compatibility optimizations

#### 2. **Data Processors** (`src/utils/processors/`)
- `costAllocationProcessor.ts` - Cost allocation data processing
- `voyageEventProcessor.ts` - Voyage events processing with LC allocation
- `vesselManifestProcessor.ts` - Vessel manifest data processing  
- `voyageListProcessor.ts` - Voyage list data processing

#### 3. **Utility Modules** (`src/utils/`)
- `dateUtils.ts` - Date parsing and manipulation
- `vesselCost.ts` - Vessel cost calculations
- `activityClassification.ts` - Activity and company inference
- `departmentInference.ts` - Department assignment logic
- `lcAllocation.ts` - LC allocation processing
- `helpers.ts` - General utility functions
- `metricsCalculation.ts` - KPI metrics calculation

## Key Design Principles

### 1. **Single Responsibility Principle**
Each module has a single, well-defined responsibility:
- Excel reading handles only file I/O
- Processors handle only their specific data type
- Utilities handle specific calculations or transformations

### 2. **Dependency Injection**
Processors receive dependencies (maps, configurations) as parameters rather than importing them directly.

### 3. **Pure Functions**
Most utility functions are pure, making them easier to test and reason about.

### 4. **Type Safety**
Strong TypeScript typing throughout the system with clear interfaces.

## Data Flow Architecture

### Input Processing Pipeline

```
1. File Upload (Excel files)
   ↓
2. Excel Reader (universal file reading)
   ↓
3. Raw Data Interfaces (typed parsing)
   ↓
4. Specialized Processors (domain-specific processing)
   ↓
5. Lookup Maps Creation (performance optimization)
   ↓
6. Business Logic Application (LC allocation, department inference)
   ↓
7. Metrics Calculation (KPI computation)
   ↓
8. Dashboard Display (React components)
```

### Cross-Reference Processing

```
Master Facilities ←→ Cost Allocation ←→ Voyage Events
        ↓                   ↓               ↓
    Lookup Maps      LC Mappings    Department Inference
        ↓                   ↓               ↓
             Final Processed Data
```

## Module Dependencies

### High-Level Dependency Graph

```
dataProcessing.ts (orchestrator)
├── excel/excelReader.ts
├── processors/
│   ├── costAllocationProcessor.ts
│   ├── voyageEventProcessor.ts  
│   ├── vesselManifestProcessor.ts
│   └── voyageListProcessor.ts
├── dateUtils.ts
├── vesselCost.ts
├── activityClassification.ts
├── departmentInference.ts
├── lcAllocation.ts
├── helpers.ts
└── metricsCalculation.ts
```

### Processor Dependencies

```
voyageEventProcessor.ts
├── dateUtils.ts (parseDate, getWeekNumber)
├── vesselCost.ts (calculateVesselCost)
├── activityClassification.ts (classifyActivity, inferCompanyFromVessel)
└── lcAllocation.ts (processLCAllocations)

vesselManifestProcessor.ts  
├── dateUtils.ts (parseDate)
├── activityClassification.ts (inferCompanyFromVessel, inferVesselType)
└── helpers.ts (createStandardizedVoyageId, safeNumeric)
```

## Performance Optimizations

### 1. **Lookup Maps**
- Pre-built hash maps for O(1) facility and cost allocation lookups
- Reduces O(n²) operations to O(n)

### 2. **Chunked File Reading** 
- Large Excel files read in 512KB chunks
- Prevents browser memory overflow
- Multiple fallback reading methods

### 3. **Incremental Processing**
- Data processed in stages with early validation
- Failed records don't halt entire processing pipeline

### 4. **Memory Efficient**
- Streaming data processing where possible
- Garbage collection friendly patterns

## Error Handling Strategy

### 1. **Graceful Degradation**
- Individual record failures don't stop batch processing
- Default values and fallback strategies

### 2. **Comprehensive Logging**
- Detailed console logging for debugging
- Warning/error classification
- Processing statistics and summaries

### 3. **Data Validation**
- Input validation at multiple stages
- Type checking with TypeScript
- Business rule validation

## Testing Strategy

### 1. **Unit Testing**
- Pure functions easily testable in isolation
- Mock dependencies for processor testing
- Comprehensive edge case coverage

### 2. **Integration Testing**
- End-to-end data processing pipeline tests
- Real file processing validation
- Cross-module interaction testing

### 3. **Performance Testing**
- Large file processing benchmarks
- Memory usage monitoring
- Browser compatibility testing

## Future Architecture Considerations

### 1. **Microservice Migration**
The modular structure provides a clear path for future microservice architecture:
- Each processor could become a separate service
- API contracts already defined by TypeScript interfaces
- Clear input/output boundaries

### 2. **Streaming Processing**
- Real-time data processing capabilities
- WebSocket integration for live updates
- Event-driven architecture patterns

### 3. **Caching Layer**
- Redis integration for processed data caching
- Incremental update capabilities
- Session state management

## Development Guidelines

### 1. **Adding New Processors**
1. Create processor file in `src/utils/processors/`
2. Implement standard processor interface
3. Add tests for all public functions
4. Update this documentation

### 2. **Adding New Utilities**
1. Place in appropriate utility module
2. Keep functions pure when possible
3. Add TypeScript interfaces for all parameters
4. Document complex business logic

### 3. **Modifying Existing Processors**
1. Maintain backward compatibility
2. Add comprehensive test coverage for changes
3. Update related documentation
4. Consider impact on dependent modules

This architecture provides a solid foundation for future growth while maintaining current functionality and performance. 