// src/utils/dataProcessing.ts
import * as XLSX from 'xlsx';
import { 
  VoyageEvent, 
  VesselManifest, 
  MasterFacility, 
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction,
  KPIMetrics,
  DateRange,
  DashboardFilters 
} from '../types';
import { masterFacilitiesData } from '../data/masterFacilities';

// ===================== RAW DATA INTERFACES =====================
// These represent the data as it comes from Excel files

interface RawVoyageEvent {
  Mission: string;
  Event?: string | null;
  "Parent Event": string;
  Location: string;
  Quay?: string;
  Remarks?: string | null;
  "Is active?": string;
  From: string;
  To?: string;
  Hours: number;
  "Port Type": string;
  "Event Category"?: string;
  Year: number;
  "Ins. 500m"?: string;
  "Cost Dedicated to"?: string | null;
  Vessel: string;
  "Voyage #": number;
}

interface RawVesselManifest {
  "Voyage Id": number;
  "Manifest Number": string;
  Transporter: string;
  Type?: string;
  "Manifest Date": string;
  "Cost Code"?: string;
  From: string;
  "Offshore Location": string;
  "Deck Lbs": number;
  "Deck Tons": number;
  "RT Tons": number;
  Lifts: number;
  "Wet Bulk (bbls)": number;
  "Wet Bulk (gals)": number;
  "Deck Sqft": number;
  Remarks?: string;
  Year: number;
}



interface RawCostAllocation {
  "LC Number": string;
  "Location Reference": string;
  Description?: string;
  "Cost Element"?: string;
  "Month-Year"?: string;
  Mission?: string;
  
  // Cost Information
  "Total Allocated Days"?: number;
  "Average Vessel Cost Per Day"?: number;
  "Total Cost"?: number;
  "Cost Per Hour"?: number;
  
  // Rig Location Information
  "Rig Location"?: string;
  "Rig Type"?: string;
  "Water Depth"?: number;
}

interface RawVoyageList {
  Edit?: string;
  Vessel: string;
  "Voyage Number": number;
  Year: number;
  Month: string;
  "Start Date": string;
  "End Date"?: string;
  Type?: string;
  Mission: string;
  "Route Type"?: string;
  Locations: string;
}

// ===================== PROCESSING OPTIONS & RESULTS =====================

// Processing options interface
interface ProcessingOptions {
  voyageEventsFile: File | null;
  voyageListFile: File | null;
  vesselManifestsFile: File | null;
  costAllocationFile: File | null;
  vesselClassificationsFile?: File | null;
  bulkActionsFile?: File | null;
  useMockData?: boolean;
}

// Processing results interface
export interface ProcessingResults {
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  metrics: KPIMetrics;
  errors: string[];
  warnings: string[];
}

// ===================== MAIN PROCESSING FUNCTION =====================

/**
 * Process Excel files and return a data store
 */
export const processExcelFiles = async (options: ProcessingOptions): Promise<ProcessingResults & { metrics: KPIMetrics; dateRange: DateRange; filters: DashboardFilters }> => {
  const {
    voyageEventsFile,
    voyageListFile,
    vesselManifestsFile,
    costAllocationFile,
    vesselClassificationsFile,
    bulkActionsFile,
    useMockData = false
  } = options;

  // If using mock data, return mock data store
  if (useMockData) {
    return createMockDataStore();
  }

  // Validate files - masterFacilitiesFile no longer required as it's hardcoded
  if (!voyageEventsFile || !costAllocationFile) {
    throw new Error('Voyage Events and Cost Allocation files must be provided');
  }

  try {
    // Process files
    const results = await processFiles({
      voyageEventsFile,
      voyageListFile,
      vesselManifestsFile,
      costAllocationFile,
      vesselClassificationsFile,
      bulkActionsFile
    });

    // Calculate metrics
    const metrics = calculateMetrics(
      results.voyageEvents,
      results.vesselManifests,
      results.voyageList
    );

    // Create data store
    return {
      voyageEvents: results.voyageEvents,
      vesselManifests: results.vesselManifests,
      masterFacilities: results.masterFacilities,
      costAllocation: results.costAllocation,
      vesselClassifications: results.vesselClassifications,
      voyageList: results.voyageList,
      bulkActions: results.bulkActions,
      metrics,
      errors: results.errors,
      warnings: results.warnings,
      dateRange: getDateRange(results.voyageEvents),
      filters: getDefaultFilters()
    };
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
};

/**
 * Process all Excel files and return processed data
 */
const processFiles = async (files: {
  voyageEventsFile: File | null;
  voyageListFile: File | null;
  vesselManifestsFile: File | null;
  costAllocationFile: File | null;
  vesselClassificationsFile?: File | null;
  bulkActionsFile?: File | null;
}): Promise<ProcessingResults> => {
  try {
    console.log('Starting Excel file processing...');

    // Read all required Excel files
    const voyageEventsFile = files.voyageEventsFile!;
    const costAllocationFile = files.costAllocationFile!;
    
    // Read required Excel files
    const rawVoyageEvents = await readExcelFile<RawVoyageEvent>(voyageEventsFile);
    const rawCostAllocation = await readExcelFile<RawCostAllocation>(costAllocationFile);
    
    // Use static master facilities data instead of file upload
    const staticMasterFacilities = masterFacilitiesData;
    
    // Read optional files with null checks
    const rawVesselManifests = files.vesselManifestsFile ? 
      await readExcelFile<RawVesselManifest>(files.vesselManifestsFile) : [];
    const rawVoyageList = files.voyageListFile ? 
      await readExcelFile<RawVoyageList>(files.voyageListFile) : [];
    const rawVesselClassifications = files.vesselClassificationsFile ? 
      await readExcelFile<any>(files.vesselClassificationsFile) : [];
    const rawBulkActions = files.bulkActionsFile ? 
      await readExcelFile<any>(files.bulkActionsFile) : [];

    console.log('Excel files read successfully:', {
      voyageEvents: rawVoyageEvents.length,
      vesselManifests: rawVesselManifests.length,
      masterFacilities: staticMasterFacilities.length,
      costAllocation: rawCostAllocation.length,
      voyageList: rawVoyageList.length,
      vesselClassifications: rawVesselClassifications.length,
      bulkActions: rawBulkActions.length
    });

    // Process reference data first (needed for lookups)
    // Use static master facilities data directly (already in correct format)
    const masterFacilities = staticMasterFacilities.map(facility => ({
      locationName: facility.locationName,
      facilityType: facility.facilityType as 'Production' | 'Drilling' | 'Integrated' | 'Logistics',
      parentFacility: facility.parentFacility || undefined,
      isProductionCapable: facility.isProductionCapable,
      isDrillingCapable: facility.isDrillingCapable,
      productionLCs: facility.productionCS ? [facility.productionCS.toString()] : undefined,
      region: facility.region,
      notes: undefined,
      isActive: facility.isActive
    }));
    const costAllocation = processCostAllocation(rawCostAllocation);

    console.log('Reference data processed');

    // Create lookup maps for better performance
    const facilitiesMap = createFacilitiesMap(masterFacilities);
    const costAllocationMap = createCostAllocationMap(costAllocation);

    // Process main data entities
    const voyageEvents = processVoyageEvents(rawVoyageEvents, facilitiesMap, costAllocationMap);
    const vesselManifests = processVesselManifests(rawVesselManifests, facilitiesMap, costAllocationMap);
    const voyageList = processVoyageList(rawVoyageList);

    console.log('Main data processed:', {
      voyageEvents: voyageEvents.length,
      vesselManifests: vesselManifests.length,
      voyageList: voyageList.length
    });

    // Process optional data
    const vesselClassifications = processVesselClassifications(rawVesselClassifications);
    const bulkActions = processBulkActions(rawBulkActions);

    return {
      voyageEvents,
      vesselManifests,
      masterFacilities,
      costAllocation,
      vesselClassifications,
      voyageList,
      bulkActions,
      metrics: {
        totalOffshoreTime: 0,
        totalOnshoreTime: 0,
        productiveHours: 0,
        nonProductiveHours: 0,
        drillingHours: 0,
        drillingNPTHours: 0,
        drillingNPTPercentage: 0,
        drillingCargoOpsHours: 0,
        waitingTimeOffshore: 0,
        waitingTimePercentage: 0,
        weatherWaitingHours: 0,
        installationWaitingHours: 0,
        cargoOpsHours: 0,
        liftsPerCargoHour: 0,
        totalLifts: 0,
        totalDeckTons: 0,
        totalRTTons: 0,
        vesselUtilizationRate: 0,
        averageTripDuration: 0,
        cargoTonnagePerVisit: 0,
        momChanges: {
          waitingTimePercentage: 0,
          cargoOpsHours: 0,
          liftsPerCargoHour: 0,
          drillingNPTPercentage: 0,
          vesselUtilizationRate: 0
        }
      },
      errors: [],
      warnings: []
    };

  } catch (error) {
    console.error('Error processing files:', error);
    throw new Error(`Failed to process Excel files: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ===================== EXCEL FILE READING =====================

/**
 * Read a file in chunks to handle large files or browser limitations
 */
const readFileInChunks = async (file: File): Promise<ArrayBuffer> => {
  const chunkSize = 512 * 1024; // Smaller 512KB chunks for better compatibility
  const chunks: Uint8Array[] = [];
  let offset = 0;
  
  console.log(`📦 Reading ${file.name} in ${Math.ceil(file.size / chunkSize)} chunks of ${chunkSize} bytes each`);
  
  while (offset < file.size) {
    const currentOffset = offset; // Capture offset value for closure
    const chunk = file.slice(currentOffset, currentOffset + chunkSize);
    console.log(`📦 Reading chunk ${Math.floor(currentOffset / chunkSize) + 1}/${Math.ceil(file.size / chunkSize)} (${currentOffset}-${Math.min(currentOffset + chunkSize, file.size)})`);
    
    // eslint-disable-next-line no-loop-func
    const chunkBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      
      const timeout = setTimeout(() => {
        reject(new Error(`Chunk read timeout at offset ${currentOffset}`));
      }, 10000); // 10 second timeout per chunk
      
      reader.onload = (event) => {
        clearTimeout(timeout);
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error(`Chunk read failed at offset ${currentOffset}`));
        }
      };
      
      reader.onerror = (event) => {
        clearTimeout(timeout);
        console.error(`Chunk read error at offset ${currentOffset}:`, event);
        reject(new Error(`Chunk read error at offset ${currentOffset}: ${reader.error?.message || 'Unknown error'}`));
      };
      
      reader.readAsArrayBuffer(chunk);
    });
    
    chunks.push(new Uint8Array(chunkBuffer));
    offset += chunkSize;
    
    // Small delay to prevent overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`📦 Successfully read all ${chunks.length} chunks, combining...`);
  
  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  
  console.log(`📦 Combined ${chunks.length} chunks into ${totalLength} bytes`);
  return result.buffer;
};

/**
 * Read a file using URL.createObjectURL and fetch - bypasses some blob restrictions
 */
const readFileViaURL = async (file: File): Promise<ArrayBuffer> => {
  console.log(`🔗 Creating object URL for ${file.name}...`);
  const url = URL.createObjectURL(file);
  
  try {
    console.log(`🔗 Fetching file via URL for ${file.name}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}: ${response.statusText}`);
    }
    
    console.log(`🔗 Converting response to array buffer for ${file.name}...`);
    const buffer = await response.arrayBuffer();
    
    console.log(`🔗 Successfully read ${buffer.byteLength} bytes via URL for ${file.name}`);
    return buffer;
  } finally {
    // Always clean up the object URL
    URL.revokeObjectURL(url);
    console.log(`🔗 Cleaned up object URL for ${file.name}`);
  }
};

/**
 * Read an Excel file and return its data as an array of objects
 */
const readExcelFile = async <T>(file: File): Promise<T[]> => {
  try {
    console.log(`📖 Reading Excel file: ${file.name}`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`File ${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 50MB.`);
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      throw new Error(`File ${file.name} must be an Excel file (.xlsx or .xls)`);
    }

    console.log(`🔄 Converting ${file.name} to array buffer...`);
    
    // Try multiple methods for reading the file to handle WebKit/Safari issues
    let buffer: ArrayBuffer;
    let readMethod = 'unknown';
    
    // Method 1: Try FileReader first (more reliable for large files in Safari)
    try {
      console.log(`📖 Attempting FileReader method for ${file.name}...`);
      buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          if (event.target?.result instanceof ArrayBuffer) {
            console.log(`✅ FileReader succeeded for ${file.name}`);
            resolve(event.target.result);
          } else {
            reject(new Error('FileReader did not return ArrayBuffer'));
          }
        };
        
        reader.onerror = (event) => {
          console.error(`❌ FileReader failed for ${file.name}:`, event);
          reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown FileReader error'}`));
        };
        
        reader.onabort = () => {
          reject(new Error('FileReader was aborted'));
        };
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reader.abort();
          reject(new Error('FileReader timeout after 30 seconds'));
        }, 30000);
        
        reader.onloadend = () => {
          clearTimeout(timeout);
        };
        
        reader.readAsArrayBuffer(file);
      });
      readMethod = 'FileReader';
    } catch (fileReaderError) {
      console.warn(`⚠️ FileReader failed for ${file.name}:`, fileReaderError);
      
      // Method 2: Try file.arrayBuffer() as fallback
      try {
        console.log(`📖 Attempting arrayBuffer() method for ${file.name}...`);
        buffer = await file.arrayBuffer();
        readMethod = 'arrayBuffer';
        console.log(`✅ arrayBuffer() succeeded for ${file.name}`);
      } catch (arrayBufferError) {
        console.error(`❌ arrayBuffer() also failed for ${file.name}:`, arrayBufferError);
        
                 // Method 3: Try reading in chunks as last resort
         try {
           console.log(`📖 Attempting chunked read for ${file.name}...`);
           buffer = await readFileInChunks(file);
           readMethod = 'chunked';
           console.log(`✅ Chunked read succeeded for ${file.name}`);
         } catch (chunkedError) {
           console.error(`❌ Chunked read also failed for ${file.name}:`, chunkedError);
           
           // Method 4: Try URL-based approach as absolute last resort
           try {
             console.log(`📖 Attempting URL-based read for ${file.name}...`);
             buffer = await readFileViaURL(file);
             readMethod = 'URL-based';
             console.log(`✅ URL-based read succeeded for ${file.name}`);
           } catch (urlError) {
             console.error(`❌ All read methods failed for ${file.name}:`, urlError);
             const fileReaderMsg = fileReaderError instanceof Error ? fileReaderError.message : String(fileReaderError);
             const arrayBufferMsg = arrayBufferError instanceof Error ? arrayBufferError.message : String(arrayBufferError);
             const chunkedMsg = chunkedError instanceof Error ? chunkedError.message : String(chunkedError);
             const urlMsg = urlError instanceof Error ? urlError.message : String(urlError);
             throw new Error(`Failed to read file ${file.name}. All methods failed: FileReader: ${fileReaderMsg}, arrayBuffer: ${arrayBufferMsg}, chunked: ${chunkedMsg}, URL-based: ${urlMsg}`);
           }
         }
      }
    }
    
    console.log(`✅ Array buffer created for ${file.name} using ${readMethod}, size: ${buffer.byteLength} bytes`);
    
    if (buffer.byteLength === 0) {
      throw new Error(`File ${file.name} appears to be empty or corrupted`);
    }
    
    console.log(`📊 Parsing Excel workbook for ${file.name}...`);
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error(`No sheets found in Excel file ${file.name}`);
    }
    
    const firstSheetName = workbook.SheetNames[0];
    console.log(`📋 Reading sheet "${firstSheetName}" from ${file.name} (available sheets: ${workbook.SheetNames.join(', ')})`);
    const worksheet = workbook.Sheets[firstSheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet "${firstSheetName}" not found in ${file.name}`);
    }
    
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: '',
      blankrows: false
    });
    
    console.log(`✅ Successfully read ${data.length} rows from ${file.name}`);
    
    if (data.length === 0) {
      throw new Error(`No data found in sheet "${firstSheetName}" of file ${file.name}`);
    }
    
    return data as T[];
  } catch (error) {
    console.error(`❌ Error reading Excel file ${file.name}:`, error);
    throw new Error(`Failed to read Excel file ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ===================== REFERENCE DATA PROCESSING =====================

/**
 * Process CostAllocation raw data
 */
const processCostAllocation = (rawCostAllocation: RawCostAllocation[]): CostAllocation[] => {
  return rawCostAllocation.map((costAlloc, index) => {
    // Parse month and year from Month-Year field
    let month: number | undefined;
    let year: number | undefined;
    
    if (costAlloc["Month-Year"]) {
      const parts = costAlloc["Month-Year"].split('-');
      if (parts.length >= 2) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
      }
    }
    
    // Calculate cost per hour if we have both total cost and allocated days
    let costPerHour: number | undefined;
    if (costAlloc["Total Cost"] && costAlloc["Total Allocated Days"]) {
      const totalHours = costAlloc["Total Allocated Days"] * 24; // Convert days to hours
      costPerHour = costAlloc["Total Cost"] / totalHours;
    }
    
    return {
      lcNumber: String(costAlloc["LC Number"]),
      locationReference: costAlloc["Location Reference"],
      description: costAlloc.Description,
      costElement: costAlloc["Cost Element"],
      monthYear: costAlloc["Month-Year"],
      month,
      year,
      
      // Cost Information
      totalAllocatedDays: costAlloc["Total Allocated Days"],
      averageVesselCostPerDay: costAlloc["Average Vessel Cost Per Day"],
      totalCost: costAlloc["Total Cost"],
      costPerHour,
      
      // Rig Location Information
      rigLocation: costAlloc["Rig Location"],
      rigType: costAlloc["Rig Type"],
      waterDepth: costAlloc["Water Depth"],
      
      // Additional Information
      mission: costAlloc.Mission,
      department: inferDepartmentFromDescription(costAlloc.Description),
      isActive: true
    };
  });
};

// ===================== MAIN DATA PROCESSING =====================

/**
 * Process Voyage Events with complex LC allocation logic
 */
const processVoyageEvents = (
  rawEvents: RawVoyageEvent[],
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>
): VoyageEvent[] => {
  const processedEvents: VoyageEvent[] = [];

  // Filter to only include active events
  const activeEvents = rawEvents.filter(event => event["Is active?"] === "Yes");
  
  console.log(`📊 Processing ${activeEvents.length} active events out of ${rawEvents.length} total events`);

  for (const event of activeEvents) {
    try {
      // Parse dates
      const from = parseDate(event.From);
      const to = event.To ? parseDate(event.To) : from;
      
      // Calculate duration
      let hours = event.Hours;
      if ((hours === 0 || !hours) && from && to) {
        hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
      }
      
      // Ensure hours is a valid number before calling toFixed
      const numericHours = Number(hours);
      if (isNaN(numericHours)) {
        console.warn('Invalid hours value for event:', event, 'Original hours:', hours, 'Setting to 0');
        hours = 0;
      } else {
        hours = Number(numericHours.toFixed(2));
      }

      // Process LC allocations
      const lcAllocations = processLCAllocations(
        event["Cost Dedicated to"],
        event.Location,
        event["Parent Event"],
        event.Event || null, // Convert undefined to null
        event.Remarks || null, // Convert undefined to null
        event["Port Type"],
        facilitiesMap,
        costAllocationMap
      );

      // Create an event for each LC allocation
      lcAllocations.forEach((allocation, allocIndex) => {
        const finalHours = hours * (allocation.percentage / 100);
        const eventDate = from || new Date();

        processedEvents.push({
          id: `${event.Vessel}-${event["Voyage #"]}-${processedEvents.length}`,
          mission: event.Mission,
          vessel: event.Vessel,
          voyageNumber: String(event["Voyage #"]),
          event: event.Event || undefined, // Convert null to undefined
          parentEvent: event["Parent Event"],
          location: event.Location,
          originalLocation: event.Location,
          mappedLocation: allocation.mappedLocation,
          quay: event.Quay,
          remarks: event.Remarks || undefined, // Convert null to undefined
          from,
          to,
          hours,
          finalHours: Number(isNaN(finalHours) ? 0 : finalHours.toFixed(2)),
          eventDate,
          eventYear: eventDate.getFullYear(),
          quarter: `Q${Math.ceil((eventDate.getMonth() + 1) / 3)}`,
          monthNumber: eventDate.getMonth() + 1,
          monthName: eventDate.toLocaleString('default', { month: 'long' }),
          weekOfYear: getWeekNumber(eventDate),
          dayOfWeek: eventDate.toLocaleString('default', { weekday: 'long' }),
          dayOfMonth: eventDate.getDate(),
          portType: event["Port Type"] as 'rig' | 'base',
          locationType: event["Port Type"] === "rig" ? "Offshore" : event["Port Type"] === "base" ? "Onshore" : "Other",
          activityCategory: classifyActivity(event["Parent Event"], event.Event || null),
          eventCategory: event["Event Category"],
          department: allocation.department || undefined, // Convert null to undefined
          costDedicatedTo: event["Cost Dedicated to"] || undefined, // Convert null to undefined
          lcNumber: allocation.lcNumber,
          originalLCLocation: allocation.originalLocation || undefined, // Convert null to undefined
          lcPercentage: allocation.percentage,
          mappingStatus: allocation.isSpecialCase ? "Special Case Mapping" : 
                         allocation.lcNumber ? "LC Mapped" : "No LC Info",
          dataIntegrity: allocation.isSpecialCase ? "Valid - Special Case" :
                         allocation.lcNumber ? "Valid" : "Missing LC",
          isActive: event["Is active?"] === "Yes",
          ins500m: event["Ins. 500m"],
          year: event.Year,
          company: inferCompanyFromVessel(event.Vessel),
          standardizedVoyageNumber: String(event["Voyage #"]).trim()
        });
      });
    } catch (error) {
      console.error('Error processing voyage event:', error, event);
    }
  }

  return processedEvents;
};

/**
 * Process Vessel Manifests
 */
const processVesselManifests = (
  rawManifests: RawVesselManifest[],
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>
): VesselManifest[] => {
  return rawManifests.map((manifest, index) => {
    try {
      const manifestDate = parseDate(manifest["Manifest Date"]);
      
      // Process location mapping
      const { mappedLocation, department } = processMappedLocationForManifest(
        manifest["Cost Code"],
        manifest.From,
        manifest["Offshore Location"],
        manifest.Remarks,
        facilitiesMap,
        costAllocationMap
      );

      return {
        id: `manifest-${index}`,
        voyageId: String(manifest["Voyage Id"]),
        standardizedVoyageId: createStandardizedVoyageId(manifest["Voyage Id"], manifestDate),
        manifestNumber: manifest["Manifest Number"],
        transporter: manifest.Transporter,
        from: manifest.From,
        offshoreLocation: manifest["Offshore Location"],
        mappedLocation,
        deckLbs: manifest["Deck Lbs"] || 0,
        deckTons: manifest["Deck Tons"] || 0,
        rtTons: manifest["RT Tons"] || 0,
        lifts: manifest.Lifts || 0,
        wetBulkBbls: manifest["Wet Bulk (bbls)"] || 0,
        wetBulkGals: manifest["Wet Bulk (gals)"] || 0,
        deckSqft: manifest["Deck Sqft"] || 0,
        manifestDate,
        manifestDateOnly: new Date(manifestDate.getFullYear(), manifestDate.getMonth(), manifestDate.getDate()),
        month: manifestDate.toLocaleString('default', { month: 'long' }),
        monthNumber: manifestDate.getMonth() + 1,
        quarter: `Q${Math.ceil((manifestDate.getMonth() + 1) / 3)}`,
        year: manifest.Year,
        costCode: manifest["Cost Code"],
        finalDepartment: department || undefined, // Convert null to undefined
        cargoType: determineCargoType(
          manifest["Deck Tons"] || 0,
          manifest["RT Tons"] || 0,
          manifest["Wet Bulk (bbls)"] || 0,
          manifest["Wet Bulk (gals)"] || 0,
          manifest.Lifts || 0
        ),
        remarks: manifest.Remarks,
        company: inferCompanyFromVessel(manifest.Transporter),
        vesselType: inferVesselType(manifest.Transporter)
      };
    } catch (error) {
      console.error('Error processing vessel manifest:', error, manifest);
      return createEmptyManifest(index, manifest);
    }
  });
};

/**
 * Process Voyage List
 */
const processVoyageList = (rawVoyages: RawVoyageList[]): VoyageList[] => {
  return rawVoyages.map((voyage, index) => {
    const locations = voyage.Locations ? voyage.Locations.split('->').map(loc => loc.trim()) : [];
    const startDate = parseDate(voyage["Start Date"]);
    const endDate = voyage["End Date"] ? parseDate(voyage["End Date"]) : undefined;
    
    return {
      id: `voyage-${index}`,
      uniqueVoyageId: `${voyage.Year}_${voyage.Month}_${voyage.Vessel.replace(/\s+/g, '')}_${voyage["Voyage Number"]}`,
      standardizedVoyageId: createStandardizedVoyageIdFromVoyage(voyage),
      vessel: voyage.Vessel,
      standardizedVesselName: voyage.Vessel.trim(),
      voyageNumber: voyage["Voyage Number"],
      year: voyage.Year,
      month: voyage.Month,
      monthNumber: getMonthNumber(voyage.Month),
      startDate,
      endDate,
      voyageDate: startDate,
      durationHours: startDate && endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) : undefined,
      type: voyage.Type,
      mission: voyage.Mission,
      routeType: voyage["Route Type"],
      locations: voyage.Locations,
      locationList: locations,
      stopCount: locations.length,
      includesProduction: includesProductionLocation(locations),
      includesDrilling: includesDrillingLocation(locations),
      voyagePurpose: determineVoyagePurpose(locations),
      originPort: locations.length > 0 ? locations[0] : undefined,
      mainDestination: locations.length > 1 ? locations[1] : undefined,
      edit: voyage.Edit,
      isActive: true
    };
  });
};

// ===================== OPTIONAL DATA PROCESSORS =====================

const processVesselClassifications = (rawData: any[]): VesselClassification[] => {
  return rawData.map((item, index) => ({
    vesselName: item["Vessel Name"] || `Unknown-${index}`,
    standardizedVesselName: (item["Vessel Name"] || `Unknown-${index}`).trim(),
    company: item.Company || 'Unknown',
    size: item.Size || 0,
    vesselType: item["Vessel Type"] || 'Other',
    vesselCategory: item["Vessel Type"] || 'Other',
    sizeCategory: (item.Size || 0) <= 200 ? 'Small' : (item.Size || 0) <= 280 ? 'Medium' : 'Large',
    yearBuilt: item["Year Built"],
    flag: item.Flag,
    isActive: true
  }));
};

const processBulkActions = (rawData: any[]): BulkAction[] => {
  return rawData.map((item, index) => ({
    id: `bulk-${index}`,
    portType: item["Port Type"] || 'base',
    vesselName: item["Vessel Name"] || 'Unknown',
    startDate: parseDate(item["Start Date"]) || new Date(),
    action: item.Action || 'Unknown',
    qty: item.Qty || 0,
    unit: item.Unit || 'bbl',
    ppg: item.PPG,
    bulkType: item["Bulk Type"] || 'Unknown',
    bulkDescription: item["Bulk Description"],
    fluidClassification: 'Other',
    fluidCategory: 'Other',
    productionChemicalType: undefined,
    atPort: item["At Port"] || 'Unknown',
    standardizedOrigin: (item["At Port"] || 'Unknown').trim(),
    destinationPort: item["Destination Port"],
    standardizedDestination: item["Destination Port"] ? item["Destination Port"].trim() : undefined,
    productionPlatform: undefined,
    volumeBbls: item.Unit === 'gal' ? (item.Qty || 0) / 42 : (item.Qty || 0),
    isReturn: (item.Remarks || '').toLowerCase().includes('return'),
    monthNumber: (parseDate(item["Start Date"]) || new Date()).getMonth() + 1,
    year: (parseDate(item["Start Date"]) || new Date()).getFullYear(),
    monthName: (parseDate(item["Start Date"]) || new Date()).toLocaleString('default', { month: 'long' }),
    monthYear: (parseDate(item["Start Date"]) || new Date()).toISOString().substring(0, 7),
    remarks: item.Remarks,
    tank: item.Tank
  }));
};

// ===================== METRICS CALCULATION =====================

/**
 * Calculate KPI metrics from processed data using exact PowerBI DAX logic
 */
const calculateMetrics = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  voyageList: VoyageList[] = []
): KPIMetrics => {
  // Filter for current month (you can adjust this based on your needs)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthEvents = voyageEvents.filter(event => 
    event.eventDate.getMonth() === currentMonth && 
    event.eventDate.getFullYear() === currentYear
  );
  
  // Previous month for MoM calculations
  const prevMonthEvents = voyageEvents.filter(event => {
    const date = event.eventDate;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  });

  // ===== EXACT DAX IMPLEMENTATIONS =====

  // Waiting Time Offshore (DAX: Port Type = "rig" AND Parent Event = "Waiting on Installation")
  const waitingTimeOffshore = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent === 'Waiting on Installation'
    )
  );

  // Total Offshore Time (DAX: Complex logic with rig activities + base transit)
  const rigActivitiesExcludingWeather = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent !== 'Waiting on Weather'
    )
  );
  
  const baseTransitTime = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'base' && 
      event.parentEvent === 'Transit'
    )
  );
  
  const totalOffshoreTime = rigActivitiesExcludingWeather + baseTransitTime;

  // Waiting Time Percentage (DAX: DIVIDE([Waiting Time Offshore], [Total Offshore Time], 0))
  const waitingTimePercentage = totalOffshoreTime > 0 ? 
    (waitingTimeOffshore / totalOffshoreTime) * 100 : 0;

  // Total Onshore Time (all base activities except transit)
  const totalOnshoreTime = calculateTotalHours(
    currentMonthEvents.filter(event => 
      event.portType === 'base' && 
      event.parentEvent !== 'Transit'
    )
  );

  // Productive vs Non-Productive Hours
  const productiveHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.activityCategory === 'Productive')
  );
  
  const nonProductiveHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.activityCategory === 'Non-Productive')
  );

  // Drilling-specific metrics (filter by department = "Drilling")
  const drillingEvents = currentMonthEvents.filter(event => event.department === 'Drilling');
  const drillingHours = calculateTotalHours(drillingEvents);
  const drillingNPTHours = calculateTotalHours(
    drillingEvents.filter(event => event.activityCategory === 'Non-Productive')
  );
  const drillingNPTPercentage = drillingHours > 0 ? (drillingNPTHours / drillingHours) * 100 : 0;
  const drillingCargoOpsHours = calculateTotalHours(
    drillingEvents.filter(event => event.parentEvent === 'Cargo Ops')
  );

  // Weather and Installation Waiting breakdown
  const weatherWaitingHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.parentEvent === 'Waiting on Weather')
  );
  
  const installationWaitingHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.parentEvent === 'Waiting on Installation')
  );

  // Cargo Operations Hours (Parent Event = "Cargo Ops")
  const cargoOpsHours = calculateTotalHours(
    currentMonthEvents.filter(event => event.parentEvent === 'Cargo Ops')
  );

  // Calculate manifest metrics using exact DAX formulas
  const manifestMetrics = calculateManifestMetrics(vesselManifests, currentMonth, currentYear);

  // Calculate voyage list metrics using exact DAX formulas
  const voyageListMetrics = calculateVoyageListMetrics(voyageList, voyageEvents, vesselManifests, currentMonth, currentYear);

  // Lifts per Cargo Hour (using manifest data and voyage event cargo hours)
  const liftsPerCargoHour = cargoOpsHours > 0 ? manifestMetrics.totalLifts / cargoOpsHours : 0;

  // Use manifest metrics for cargo calculations
  const totalLifts = manifestMetrics.totalLifts;
  const totalDeckTons = manifestMetrics.totalDeckTons;
  const totalRTTons = manifestMetrics.totalRTTons;
  const cargoTonnagePerVisit = manifestMetrics.cargoTonnagePerVisit;

  // Vessel Utilization Rate (Productive Hours / Total Hours)
  const totalHours = totalOffshoreTime + totalOnshoreTime;
  const vesselUtilizationRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

  // Average Trip Duration
  const averageTripDuration = calculateAverageTripDuration(currentMonthEvents);

  // Previous month calculations for MoM changes
  const prevWaitingTimeOffshore = calculateTotalHours(
    prevMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent === 'Waiting on Installation'
    )
  );
  
  const prevRigActivities = calculateTotalHours(
    prevMonthEvents.filter(event => 
      event.portType === 'rig' && 
      event.parentEvent !== 'Waiting on Weather'
    )
  );
  
  const prevBaseTransit = calculateTotalHours(
    prevMonthEvents.filter(event => 
      event.portType === 'base' && 
      event.parentEvent === 'Transit'
    )
  );
  
  const prevTotalOffshoreTime = prevRigActivities + prevBaseTransit;
  const prevWaitingTimePercentage = prevTotalOffshoreTime > 0 ? 
    (prevWaitingTimeOffshore / prevTotalOffshoreTime) * 100 : 0;
  
  const prevCargoOpsHours = calculateTotalHours(
    prevMonthEvents.filter(event => event.parentEvent === 'Cargo Ops')
  );

  // Month-over-month changes
  const waitingTimePercentageMoM = waitingTimePercentage - prevWaitingTimePercentage;
  const cargoOpsHoursMoM = prevCargoOpsHours > 0 ? 
    ((cargoOpsHours - prevCargoOpsHours) / prevCargoOpsHours) * 100 : 0;

  console.log('📊 KPI Calculations Summary:', {
    waitingTimeOffshore: `${waitingTimeOffshore}h`,
    totalOffshoreTime: `${totalOffshoreTime}h`,
    waitingTimePercentage: `${waitingTimePercentage.toFixed(1)}%`,
    cargoOpsHours: `${cargoOpsHours}h`,
    drillingHours: `${drillingHours}h`,
    vesselUtilizationRate: `${vesselUtilizationRate.toFixed(1)}%`,
    // Manifest metrics
    cargoTonnagePerVisit: `${cargoTonnagePerVisit.toFixed(1)} tons`,
    totalManifests: manifestMetrics.totalManifests,
    rtPercentage: `${manifestMetrics.rtPercentage.toFixed(1)}%`,
    totalWetBulk: `${manifestMetrics.totalWetBulkNormalized.toFixed(1)} bbls`,
    fsvVsOsvRatio: manifestMetrics.fsvVsOsvRatio.toFixed(2),
    // Voyage List metrics
    totalVoyages: voyageListMetrics.totalVoyages,
    averageVoyageDuration: `${voyageListMetrics.averageVoyageDuration.toFixed(1)}h`,
    drillingVoyagePercentage: `${voyageListMetrics.drillingVoyagePercentage.toFixed(1)}%`,
    multiStopPercentage: `${voyageListMetrics.multiStopPercentage.toFixed(1)}%`,
    onTimeVoyagePercentage: `${voyageListMetrics.onTimeVoyagePercentage.toFixed(1)}%`,
    routeConcentration: `${voyageListMetrics.routeConcentration.toFixed(1)}%`
  });

  // TODO: Expand KPIMetrics interface to include manifest-specific metrics:
  // - manifestMetrics (RT analysis, fluid breakdown, location visits, vessel type performance)
  // - This will require updating the interface in types/index.ts

  return {
    totalOffshoreTime,
    totalOnshoreTime,
    productiveHours,
    nonProductiveHours,
    drillingHours,
    drillingNPTHours,
    drillingNPTPercentage,
    drillingCargoOpsHours,
    waitingTimeOffshore,
    waitingTimePercentage,
    weatherWaitingHours,
    installationWaitingHours,
    cargoOpsHours,
    liftsPerCargoHour,
    totalLifts,
    totalDeckTons,
    totalRTTons,
    vesselUtilizationRate,
    averageTripDuration,
    cargoTonnagePerVisit,
    voyageListMetrics: {
      totalVoyages: voyageListMetrics.totalVoyages,
      averageVoyageDuration: voyageListMetrics.averageVoyageDuration,
      avgVoyageDurationMoMChange: voyageListMetrics.avgVoyageDurationMoMChange,
      drillingVoyagePercentage: voyageListMetrics.drillingVoyagePercentage,
      mixedVoyageEfficiency: voyageListMetrics.mixedVoyageEfficiency,
      averageStopsPerVoyage: voyageListMetrics.averageStopsPerVoyage,
      multiStopPercentage: voyageListMetrics.multiStopPercentage,
      routeEfficiencyScore: voyageListMetrics.routeEfficiencyScore,
      activeVesselsThisMonth: voyageListMetrics.activeVesselsThisMonth,
      voyagesPerVessel: voyageListMetrics.voyagesPerVessel,
      routeConcentration: voyageListMetrics.routeConcentration,
      onTimeVoyagePercentage: voyageListMetrics.onTimeVoyagePercentage,
      averageExecutionEfficiency: voyageListMetrics.averageExecutionEfficiency,
      consolidationBenefit: voyageListMetrics.consolidationBenefit,
      peakSeasonIndicator: voyageListMetrics.peakSeasonIndicator,
      voyagePurposeDistribution: voyageListMetrics.voyagePurposeDistribution,
      popularDestinations: voyageListMetrics.popularDestinations
    },
    momChanges: {
      waitingTimePercentage: waitingTimePercentageMoM,
      cargoOpsHours: cargoOpsHoursMoM,
      liftsPerCargoHour: 0, // Would need previous month manifests for accurate calculation
      drillingNPTPercentage: 0, // Would need previous month drilling calculation
      vesselUtilizationRate: 0 // Would need previous month calculation
    }
  };
};

/**
 * Calculate Vessel Manifest KPIs using exact PowerBI DAX logic
 */
const calculateManifestMetrics = (
  vesselManifests: VesselManifest[],
  currentMonth: number,
  currentYear: number
) => {
  // Filter manifests for current month
  const currentMonthManifests = vesselManifests.filter(manifest => 
    manifest.manifestDate.getMonth() === currentMonth && 
    manifest.manifestDate.getFullYear() === currentYear
  );

  // 1. Cargo Tonnage Per Visit (DAX: DIVIDE(SUM(Deck Tons) + SUM(RT Tons), DISTINCTCOUNT(Manifest Number), 0))
  const totalDeckTons = currentMonthManifests.reduce((sum, manifest) => sum + manifest.deckTons, 0);
  const totalRTTons = currentMonthManifests.reduce((sum, manifest) => sum + manifest.rtTons, 0);
  const totalCargoTons = totalDeckTons + totalRTTons;
  const uniqueManifests = new Set(currentMonthManifests.map(m => m.manifestNumber)).size;
  const cargoTonnagePerVisit = uniqueManifests > 0 ? totalCargoTons / uniqueManifests : 0;

  // 2. RT Tons Analysis
  const rtTons = totalRTTons;
  const rtPercentage = totalCargoTons > 0 ? (totalRTTons / totalCargoTons) * 100 : 0;
  const rtStatus = rtTons > 0 ? "⚠️ RT Present" : "✓ No RT";

  // 3. Wet Bulk Fluid Analysis (DAX: Normalize bbls + gals/42)
  const totalWetBulkBbls = currentMonthManifests.reduce((sum, manifest) => sum + manifest.wetBulkBbls, 0);
  const totalWetBulkGals = currentMonthManifests.reduce((sum, manifest) => sum + manifest.wetBulkGals, 0);
  const totalWetBulkNormalized = totalWetBulkBbls + (totalWetBulkGals / 42);

  // Fluid type breakdown based on remarks
  const fluidBreakdown = currentMonthManifests.reduce((breakdown, manifest) => {
    const remarks = (manifest.remarks || '').toLowerCase();
    const manifestWetBulk = manifest.wetBulkBbls + (manifest.wetBulkGals / 42);
    
    if (remarks.includes('fuel') || remarks.includes('diesel')) {
      breakdown.fuel += manifestWetBulk;
    } else if (remarks.includes('water') || remarks.includes('potable')) {
      breakdown.water += manifestWetBulk;
    } else if (remarks.includes('methanol')) {
      breakdown.methanol += manifestWetBulk;
    } else if (remarks.includes('mud') || remarks.includes('brine') || remarks.includes('drilling')) {
      breakdown.drillingFluid += manifestWetBulk;
    } else if (manifestWetBulk > 0) {
      breakdown.other += manifestWetBulk;
    }
    
    return breakdown;
  }, { fuel: 0, water: 0, methanol: 0, drillingFluid: 0, other: 0 });

  // Calculate fluid percentages
  const fluidPercentages = totalWetBulkNormalized > 0 ? {
    fuel: (fluidBreakdown.fuel / totalWetBulkNormalized) * 100,
    water: (fluidBreakdown.water / totalWetBulkNormalized) * 100,
    methanol: (fluidBreakdown.methanol / totalWetBulkNormalized) * 100,
    drillingFluid: (fluidBreakdown.drillingFluid / totalWetBulkNormalized) * 100,
    other: (fluidBreakdown.other / totalWetBulkNormalized) * 100
  } : { fuel: 0, water: 0, methanol: 0, drillingFluid: 0, other: 0 };

  // 4. Location Visit Frequency
  const locationVisits = currentMonthManifests.reduce((visits, manifest) => {
    const location = manifest.offshoreLocation;
    if (!visits[location]) {
      visits[location] = new Set();
    }
    visits[location].add(manifest.manifestNumber);
    return visits;
  }, {} as Record<string, Set<string>>);

  const locationVisitCounts = Object.entries(locationVisits).map(([location, manifestSet]) => ({
    location,
    visitCount: manifestSet.size,
    tonnage: currentMonthManifests
      .filter(m => m.offshoreLocation === location)
      .reduce((sum, m) => sum + m.deckTons + m.rtTons, 0)
  }));

  // 5. Vessel Type Performance Analysis (requires vessel classification data)
  const vesselTypePerformance = currentMonthManifests.reduce((performance, manifest) => {
    const vesselType = manifest.vesselType || 'Unknown';
    const cargoTons = manifest.deckTons + manifest.rtTons;
    
    if (!performance[vesselType]) {
      performance[vesselType] = { tonnage: 0, manifests: 0, lifts: 0 };
    }
    
    performance[vesselType].tonnage += cargoTons;
    performance[vesselType].manifests += 1;
    performance[vesselType].lifts += manifest.lifts;
    
    return performance;
  }, {} as Record<string, { tonnage: number; manifests: number; lifts: number }>);

  // Calculate FSV vs OSV metrics
  const fsvTonnage = vesselTypePerformance['FSV']?.tonnage || 0;
  const osvTonnage = vesselTypePerformance['OSV']?.tonnage || 0;
  const fsvVsOsvRatio = osvTonnage > 0 ? fsvTonnage / osvTonnage : 0;

  return {
    // Core metrics
    totalDeckTons,
    totalRTTons,
    totalCargoTons,
    cargoTonnagePerVisit,
    uniqueManifests,
    
    // RT Analysis
    rtTons,
    rtPercentage,
    rtStatus,
    
    // Wet Bulk Analysis
    totalWetBulkNormalized,
    fluidBreakdown,
    fluidPercentages,
    
    // Location Analysis
    locationVisitCounts,
    
    // Vessel Type Performance
    vesselTypePerformance,
    fsvTonnage,
    osvTonnage,
    fsvVsOsvRatio,
    
    // Total metrics
    totalLifts: currentMonthManifests.reduce((sum, manifest) => sum + manifest.lifts, 0),
    totalManifests: currentMonthManifests.length
  };
};

// ===================== HELPER FUNCTIONS =====================

const createFacilitiesMap = (facilities: MasterFacility[]): Map<string, MasterFacility> => {
  const map = new Map<string, MasterFacility>();
  for (const facility of facilities) {
    map.set(facility.locationName.toLowerCase(), facility);
  }
  return map;
};

const createCostAllocationMap = (costAllocations: CostAllocation[]): Map<string, CostAllocation> => {
  const map = new Map<string, CostAllocation>();
  for (const costAlloc of costAllocations) {
    map.set(costAlloc.lcNumber, costAlloc);
  }
  return map;
};

const parseDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    return new Date();
  } catch (error) {
    console.warn(`Error parsing date: ${dateStr}`, error);
    return new Date();
  }
};

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getMonthNumber = (month: string): number => {
  const monthMap: {[key: string]: number} = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  
  return monthMap[month.toLowerCase().substring(0, 3)] || 1;
};

const classifyActivity = (
  parentEvent: string | null,
  event: string | null
): "Productive" | "Non-Productive" | "Needs Review - Null Event" | "Uncategorized" => {
  if (!parentEvent) return "Uncategorized";
  
  // Handle null event values first
  if (event === null || event === undefined || event === '') {
    const productiveParentEvents = [
      "End Voyage", "Standby inside 500m zone", "Standby Inside 500m zone",
      "Standby - Close", "Cargo Ops", "Marine Trial"
    ];
    
    const nonProductiveParentEvents = [
      "Waiting on Weather", "Waiting on Installation",
      "Waiting on Quay", "Port or Supply Base closed"
    ];
    
    if (productiveParentEvents.includes(parentEvent)) {
      return "Productive";
    } else if (nonProductiveParentEvents.includes(parentEvent)) {
      return "Non-Productive";
    } else {
      return "Needs Review - Null Event";
    }
  }
  
  // Handle productive combinations (Parent Event + Event)
  const productiveCombinations = [
    "ROV Operations,ROV Operational duties",
    "Cargo Ops,Load - Fuel, Water or Methanol",
    "Cargo Ops,Offload - Fuel, Water or Methanol",
    "Cargo Ops,Cargo Loading or Discharging",
    "Cargo Ops,Simops ",
    "Installation Productive Time,Bulk Displacement",
    "Installation Productive Time,Floating Storage",
    "Maintenance,Vessel Under Maintenance",
    "Maintenance,Training",
    "Marine Trial, ",
    "Maneuvering,Shifting",
    "Maneuvering,Set Up",
    "Maneuvering,Pilotage",
    "Standby,Close - Standby",
    "Standby,Emergency Response Standby",
    "Transit,Steam from Port",
    "Transit,Steam to Port",
    "Transit,Steam Infield",
    "Transit,Enter 500 mtr zone Setup Maneuver",
    "Stop the Job,Installation, Vessel, Supply Base",
    "Standby,Standby - Close",
    "Tank Cleaning,Tank Cleaning"
  ];
  
  const combination = `${parentEvent},${event}`;
  if (productiveCombinations.includes(combination)) {
    return "Productive";
  }
  
  // Handle non-productive parent events
  const nonProductiveParentEvents = [
    "Waiting on Weather", "Waiting on Installation",
    "Waiting on Quay", "Port or Supply Base closed"
  ];
  
  if (nonProductiveParentEvents.includes(parentEvent)) {
    return "Non-Productive";
  }
  
  return "Uncategorized";
};

// LC Allocation Processing - handles multi-allocation format like "9358 45, 10137 12, 10101"
interface LCAllocation {
  lcNumber: string;
  percentage: number;
  originalLocation: string | null;
  mappedLocation: string;
  department: "Drilling" | "Production" | "Logistics" | null;
  isSpecialCase: boolean;
}

/**
 * Special LC numbers that auto-assign to Logistics when at Fourchon
 */
const FOURCHON_LOGISTICS_LCS = ['999', '333', '7777', '8888'];

const processLCAllocations = (
  costDedicatedTo: string | null | undefined,
  location: string,
  parentEvent: string | null,
  event: string | null,
  remarks: string | null | undefined,
  portType: string,
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>
): LCAllocation[] => {
  // Handle special case: Fourchon base operations
  if (location === "Fourchon" && portType === "base") {
    return [{
      lcNumber: "FOURCHON_BASE",
      percentage: 100,
      originalLocation: "Fourchon",
      mappedLocation: "Fourchon",
      department: "Logistics",
      isSpecialCase: true
    }];
  }
  
  // Handle missing LC info
  if (!costDedicatedTo || costDedicatedTo.trim() === '') {
    return [{
      lcNumber: "",
      percentage: 100,
      originalLocation: null,
      mappedLocation: location,
      department: null,
      isSpecialCase: false
    }];
  }
  
  // Parse multi-allocation LC string
  const allocations = parseLCAllocationString(costDedicatedTo);
  
  // Debug logging for LC allocation parsing
  if (allocations.length > 1) {
    console.log(`🔍 Multi-LC allocation parsed: "${costDedicatedTo}" -> ${allocations.length} allocations:`, 
      allocations.map(a => `${a.lcNumber}: ${a.percentage}%`).join(', '));
  }
  
  // Convert to LCAllocation objects with department lookup
  return allocations.map(allocation => {
    const costAlloc = costAllocationMap.get(allocation.lcNumber);
    
    if (!costAlloc && allocation.lcNumber !== '') {
      console.warn(`⚠️ LC Number "${allocation.lcNumber}" not found in Cost Allocation reference data`);
    }
    
    // Determine department with enhanced logic
    let department: "Drilling" | "Production" | "Logistics" | null = null;
    
    // Special handling: Fourchon Logistics LCs
    if (location === "Fourchon" && FOURCHON_LOGISTICS_LCS.includes(allocation.lcNumber)) {
      department = "Logistics";
      console.log(`🚛 LC ${allocation.lcNumber} at Fourchon auto-assigned to Logistics (${allocation.percentage.toFixed(1)}%)`);
    } else if (costAlloc?.department) {
      // Use department from Cost Allocation reference table (primary source)
      department = costAlloc.department;
    } else if (allocation.lcNumber) {
      // Fallback to Master Facilities Production LC mapping
      department = inferDepartmentFromLCNumber(allocation.lcNumber) || null;
    }
    
    // Log department assignment for debugging
    if (allocation.lcNumber && department && !FOURCHON_LOGISTICS_LCS.includes(allocation.lcNumber)) {
      const facilityInfo = PRODUCTION_LC_MAPPING[allocation.lcNumber];
      const facilityName = facilityInfo ? ` (${facilityInfo.facility})` : '';
      console.log(`🏢 LC ${allocation.lcNumber} assigned to ${department} department${facilityName} (${allocation.percentage.toFixed(1)}%)`);
    }
    
    return {
      lcNumber: allocation.lcNumber,
      percentage: allocation.percentage,
      originalLocation: costAlloc?.locationReference || null,
      mappedLocation: costAlloc?.locationReference || location,
      department,
      isSpecialCase: FOURCHON_LOGISTICS_LCS.includes(allocation.lcNumber) && location === "Fourchon"
    };
  });
};

/**
 * Parse LC allocation string like "9358 45, 10137 12, 10101" into individual allocations
 * Handles various scenarios:
 * - Only LC (no percent): Assume 100%
 * - Multiple LCs with percent: Use defined percentages
 * - Last LC without percent: Assign remainder
 * - Some LCs missing percent: Split remainder equally among those without
 * - Percent ≠ 100%: Normalize or flag for review
 * - Invalid values: Flag for review
 * - Alternate delimiters: Normalize first
 */
const parseLCAllocationString = (costDedicatedTo: string): { lcNumber: string; percentage: number }[] => {
  if (!costDedicatedTo || costDedicatedTo.trim() === '') {
    return [];
  }
  
  // Normalize delimiters - replace semicolons, pipes, etc. with commas
  const normalized = costDedicatedTo
    .replace(/[;|]/g, ',')  // Replace semicolons and pipes with commas
    .replace(/\s*,\s*/g, ',')  // Normalize spacing around commas
    .trim();
  
  // Split by comma and clean up
  const parts = normalized.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return [];
  }
  
  // If only one part and no percentage, assume 100%
  if (parts.length === 1 && !parts[0].includes(' ')) {
    return [{
      lcNumber: parts[0].trim(),
      percentage: 100
    }];
  }
  
  const allocationsWithPercent: { lcNumber: string; percentage: number }[] = [];
  const allocationsWithoutPercent: string[] = [];
  let totalAllocatedPercentage = 0;
  
  // Parse each part to separate those with and without percentages
  for (const part of parts) {
    const tokens = part.trim().split(/\s+/);
    
    if (tokens.length === 1) {
      // LC number without percentage
      allocationsWithoutPercent.push(tokens[0]);
    } else if (tokens.length >= 2) {
      // LC number with potential percentage
      const lcNumber = tokens[0];
      const percentageStr = tokens[1];
      const percentage = parseFloat(percentageStr);
      
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        allocationsWithPercent.push({
          lcNumber,
          percentage
        });
        totalAllocatedPercentage += percentage;
      } else {
        console.warn(`Invalid percentage "${percentageStr}" for LC ${lcNumber}, treating as no percentage`);
        allocationsWithoutPercent.push(lcNumber);
      }
    }
  }
  
  // Calculate remainder for LCs without percentages
  const remainderPercentage = Math.max(0, 100 - totalAllocatedPercentage);
  
  // Handle LCs without percentages
  if (allocationsWithoutPercent.length > 0) {
    if (remainderPercentage > 0) {
      // Split remainder equally among LCs without percentages
      const percentagePerLC = remainderPercentage / allocationsWithoutPercent.length;
      
      for (const lcNumber of allocationsWithoutPercent) {
        allocationsWithPercent.push({
          lcNumber,
          percentage: percentagePerLC
        });
      }
      
      totalAllocatedPercentage = 100; // Should now equal 100%
    } else {
      // No remainder available - this is an error condition
      console.error(`No remainder percentage available for LCs without percentages: ${allocationsWithoutPercent.join(', ')} in "${costDedicatedTo}"`);
      
      // Assign 0% to these LCs (they'll be flagged for review)
      for (const lcNumber of allocationsWithoutPercent) {
        allocationsWithPercent.push({
          lcNumber,
          percentage: 0
        });
      }
    }
  }
  
  // Validate and normalize total percentage
  if (Math.abs(totalAllocatedPercentage - 100) > 0.01) {
    console.warn(`LC allocation percentages don't add up to 100%: ${totalAllocatedPercentage.toFixed(2)}% for "${costDedicatedTo}"`);
    
    // Normalize percentages to sum to 100% if we have valid allocations
    if (totalAllocatedPercentage > 0 && allocationsWithPercent.length > 0) {
      const normalizationFactor = 100 / totalAllocatedPercentage;
      allocationsWithPercent.forEach(allocation => {
        allocation.percentage *= normalizationFactor;
      });
      
      console.log(`📊 Normalized LC percentages for "${costDedicatedTo}":`, 
        allocationsWithPercent.map(a => `${a.lcNumber}: ${a.percentage.toFixed(1)}%`).join(', '));
    }
  }
  
  // Final validation - ensure all percentages are reasonable
  const finalAllocations = allocationsWithPercent.filter(allocation => {
    if (allocation.percentage < 0 || allocation.percentage > 100) {
      console.error(`Invalid final percentage ${allocation.percentage}% for LC ${allocation.lcNumber} in "${costDedicatedTo}"`);
      return false;
    }
    return true;
  });
  
  // Round percentages to avoid floating point precision issues
  finalAllocations.forEach(allocation => {
    allocation.percentage = Math.round(allocation.percentage * 100) / 100;
  });
  
  return finalAllocations;
};

// Simplified helper functions
const processMappedLocationForManifest = (
  costCode: string | undefined,
  from: string,
  offshoreLocation: string,
  remarks: string | undefined,
  facilitiesMap: Map<string, MasterFacility>,
  costAllocationMap: Map<string, CostAllocation>
): { mappedLocation: string, department: "Drilling" | "Production" | "Logistics" | null } => {
  let department: "Drilling" | "Production" | "Logistics" | null = null;
  
  if (costCode && costAllocationMap.has(costCode)) {
    const costAlloc = costAllocationMap.get(costCode)!;
    department = costAlloc.department || null;
    
    return {
      mappedLocation: costAlloc.locationReference,
      department
    };
  }
  
  // If no cost code mapping, try to infer department from location and context
  if (costCode) {
    // Check special Fourchon Logistics LCs
    if (from === "Fourchon" && FOURCHON_LOGISTICS_LCS.includes(costCode)) {
      department = "Logistics";
    } else {
      // Check Production LC mapping from Master Facilities
      department = inferDepartmentFromLCNumber(costCode) || null;
    }
  }
  
  return {
    mappedLocation: offshoreLocation,
    department
  };
};

const createStandardizedVoyageId = (voyageId: number, manifestDate: Date): string => {
  const year = manifestDate.getFullYear();
  const month = String(manifestDate.getMonth() + 1).padStart(2, '0');
  const paddedVoyageId = String(voyageId).padStart(3, '0');
  return `${year}-${month}-UNKNOWN-${paddedVoyageId}`;
};

const createStandardizedVoyageIdFromVoyage = (voyage: RawVoyageList): string => {
  const monthNumber = getMonthNumber(voyage.Month);
  const paddedMonth = String(monthNumber).padStart(2, '0');
  const vesselNoSpaces = voyage.Vessel.replace(/\s+/g, '');
  const paddedVoyageNumber = String(voyage["Voyage Number"]).padStart(3, '0');
  return `${voyage.Year}-${paddedMonth}-${vesselNoSpaces}-${paddedVoyageNumber}`;
};

const determineCargoType = (
  deckTons: number,
  rtTons: number,
  wetBulkBbls: number,
  wetBulkGals: number,
  lifts: number
): "Deck Cargo" | "Below Deck Cargo" | "Liquid Bulk" | "Lift Only" | "Other/Mixed" => {
  if (deckTons > 0) return "Deck Cargo";
  if (rtTons > 0) return "Below Deck Cargo";
  if (wetBulkBbls > 0 || wetBulkGals > 0) return "Liquid Bulk";
  if (lifts > 0 && deckTons === 0 && rtTons === 0) return "Lift Only";
  return "Other/Mixed";
};

const includesProductionLocation = (locations: string[]): boolean => {
  const productionLocations = [
    "Atlantis PQ", "Na Kika", "Mad Dog Prod", 
    "Thunder Horse PDQ", "Thunder Horse Prod", "Mad Dog"
  ];
  
  return locations.some(location => 
    productionLocations.some(prodLoc => location.includes(prodLoc))
  );
};

const includesDrillingLocation = (locations: string[]): boolean => {
  const drillingLocations = [
    "Thunder Horse Drilling", "Mad Dog Drilling", "Ocean BlackHornet",
    "Ocean BlackLion", "Stena IceMAX", "Ocean Blacktip", "Island Venture",
    "Argos", "Deepwater Invictus"
  ];
  
  return locations.some(location => 
    drillingLocations.some(drillLoc => location.includes(drillLoc))
  );
};

const determineVoyagePurpose = (locations: string[]): "Production" | "Drilling" | "Mixed" | "Other" => {
  const hasProduction = includesProductionLocation(locations);
  const hasDrilling = includesDrillingLocation(locations);
  
  if (hasProduction && hasDrilling) return "Mixed";
  if (hasProduction) return "Production";
  if (hasDrilling) return "Drilling";
  return "Other";
};

/**
 * Generate Production LC mapping from Master Facilities data
 * This ensures we always use the authoritative source for Production LC numbers
 */
const generateProductionLCMapping = (): Record<string, { department: "Production"; facility: string }> => {
  const mapping: Record<string, { department: "Production"; facility: string }> = {};
  
  // Extract Production LC numbers from Master Facilities
  masterFacilitiesData.forEach(facility => {
    if (facility.facilityType === 'Production' && facility.productionCS) {
      // Convert productionCS to string and extract the main LC number (before decimal)
      const lcNumber = Math.floor(facility.productionCS).toString();
      mapping[lcNumber] = {
        department: "Production",
        facility: facility.displayName
      };
    }
  });
  
  console.log('📋 Generated Production LC mapping from Master Facilities:', mapping);
  return mapping;
};

// Generate the mapping dynamically from Master Facilities data
const PRODUCTION_LC_MAPPING = generateProductionLCMapping();

const inferDepartmentFromLCNumber = (lcNumber: string): "Drilling" | "Production" | "Logistics" | undefined => {
  // Check Production LC Numbers from Master Facilities
  if (PRODUCTION_LC_MAPPING[lcNumber]) {
    return "Production";
  }
  
  // For other LC numbers, we'll rely on the Cost Allocation reference table
  // This function is used as a fallback when Cost Allocation lookup fails
  return undefined;
};

const inferDepartmentFromDescription = (description: string | undefined): "Drilling" | "Production" | "Logistics" | undefined => {
  if (!description) return undefined;
  
  const desc = description.toLowerCase();
  
  // More specific drilling keywords
  if (desc.includes('drill') || desc.includes('completion') || desc.includes('workover')) {
    return "Drilling";
  }
  
  // More specific production keywords
  if (desc.includes('production') || desc.includes('prod') || desc.includes('facility') || desc.includes('platform')) {
    return "Production";
  }
  
  // Logistics keywords
  if (desc.includes('logistics') || desc.includes('fourchon') || desc.includes('supply base') || desc.includes('port')) {
    return "Logistics";
  }
  
  return undefined;
};

const inferCompanyFromVessel = (vesselName: string): string => {
  const name = vesselName.toLowerCase();
  if (name.includes('hos')) return 'Hornbeck';
  if (name.includes('chouest')) return 'Edison Chouest';
  if (name.includes('harvey')) return 'Harvey Gulf';
  if (name.includes('seacor')) return 'Seacor';
  return 'Unknown';
};

const inferVesselType = (vesselName: string): string => {
  const name = vesselName.toLowerCase();
  if (name.includes('fsv') || name.includes('fast')) return 'FSV';
  if (name.includes('osv')) return 'OSV';
  return 'Other';
};

const createEmptyManifest = (index: number, originalManifest: RawVesselManifest): VesselManifest => {
  return {
    id: `manifest-error-${index}`,
    voyageId: String(originalManifest["Voyage Id"] || 0),
    standardizedVoyageId: '',
    manifestNumber: originalManifest["Manifest Number"] || '',
    transporter: originalManifest.Transporter || '',
    from: originalManifest.From || '',
    offshoreLocation: originalManifest["Offshore Location"] || '',
    mappedLocation: '',
    deckLbs: 0,
    deckTons: 0,
    rtTons: 0,
    lifts: 0,
    wetBulkBbls: 0,
    wetBulkGals: 0,
    deckSqft: 0,
    manifestDate: new Date(),
    manifestDateOnly: new Date(),
    month: '',
    monthNumber: 0,
    quarter: '',
    year: originalManifest.Year || new Date().getFullYear(),
    costCode: originalManifest["Cost Code"],
    finalDepartment: undefined,
    cargoType: "Other/Mixed",
    remarks: originalManifest.Remarks,
    company: 'Unknown',
    vesselType: 'Other'
  };
};

const calculateTotalHours = (events: VoyageEvent[]): number => {
  return Number(events.reduce((sum, event) => sum + event.finalHours, 0).toFixed(1));
};

const calculateAverageTripDuration = (events: VoyageEvent[]): number => {
  // Group by mission to get all events for each voyage
  const missionMap = new Map<string, VoyageEvent[]>();
  events.forEach(event => {
    if (!missionMap.has(event.mission)) {
      missionMap.set(event.mission, []);
    }
    missionMap.get(event.mission)!.push(event);
  });
  
  // Calculate the duration of each mission
  const durations: number[] = [];
  missionMap.forEach(missionEvents => {
    // Find earliest and latest timestamps
    const timestamps = missionEvents.flatMap(event => [event.from.getTime(), event.to.getTime()]);
    if (timestamps.length > 0) {
      const earliest = Math.min(...timestamps);
      const latest = Math.max(...timestamps);
      const durationHours = (latest - earliest) / (1000 * 60 * 60);
      durations.push(durationHours);
    }
  });
  
  // Calculate average
  return durations.length > 0 
    ? Number((durations.reduce((sum, duration) => sum + duration, 0) / durations.length).toFixed(1))
    : 0;
};

const getDateRange = (voyageEvents: VoyageEvent[]): DateRange => {
  if (voyageEvents.length === 0) {
    return {
      startDate: new Date(new Date().getFullYear(), 0, 1), // January 1st of current year
      endDate: new Date()
    };
  }
  
  const dates = voyageEvents.flatMap(event => [event.from, event.to]);
  const startDate = new Date(Math.min(...dates.map(date => date.getTime())));
  const endDate = new Date(Math.max(...dates.map(date => date.getTime())));
  
  return { startDate, endDate };
};

const getDefaultFilters = (): DashboardFilters => {
  const now = new Date();
  return {
    selectedDepartment: 'Drilling',
    selectedMonth: now.toISOString().slice(0, 7), // Current month in YYYY-MM format
    selectedYear: now.getFullYear()
  };
};

/**
 * Create a mock data store for testing
 */
export const createMockDataStore = (): ProcessingResults & { metrics: KPIMetrics; dateRange: DateRange; filters: DashboardFilters } => {
  // Create mock metrics
  const metrics: KPIMetrics = {
    totalOffshoreTime: 1250.5,
    totalOnshoreTime: 450.3,
    productiveHours: 950.2,
    nonProductiveHours: 300.3,
    drillingHours: 720.8,
    drillingNPTHours: 180.5,
    drillingNPTPercentage: 25.04,
    drillingCargoOpsHours: 310.6,
    waitingTimeOffshore: 220.4,
    waitingTimePercentage: 17.62,
    weatherWaitingHours: 90.3,
    installationWaitingHours: 130.1,
    cargoOpsHours: 410.7,
    liftsPerCargoHour: 1.8,
    totalLifts: 739,
    totalDeckTons: 3250.6,
    totalRTTons: 450.2,
    vesselUtilizationRate: 76.5,
    averageTripDuration: 48.2,
    cargoTonnagePerVisit: 92.3,
    momChanges: {
      waitingTimePercentage: -2.3,
      cargoOpsHours: 5.2,
      liftsPerCargoHour: 0.3,
      drillingNPTPercentage: -1.5,
      vesselUtilizationRate: 3.1
    }
  };

  // Create mock date range (last 6 months)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  // Create mock data store
  return {
    voyageEvents: [],
    vesselManifests: [],
    masterFacilities: [],
    costAllocation: [],
    vesselClassifications: [],
    voyageList: [],
    bulkActions: [],
    metrics,
    errors: [],
    warnings: [],
    dateRange: { startDate, endDate },
    filters: {
      selectedDepartment: 'Drilling',
      selectedMonth: new Date().toISOString().slice(0, 7)
    }
  };
};

/**
 * Calculate Voyage List KPIs using exact PowerBI DAX logic
 */
const calculateVoyageListMetrics = (
  voyageList: VoyageList[],
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[],
  currentMonth: number,
  currentYear: number
) => {
  // Filter voyages for current month
  const currentMonthVoyages = voyageList.filter(voyage => 
    voyage.voyageDate.getMonth() === currentMonth && 
    voyage.voyageDate.getFullYear() === currentYear
  );

  // Previous month for MoM calculations
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthVoyages = voyageList.filter(voyage => 
    voyage.voyageDate.getMonth() === prevMonth && 
    voyage.voyageDate.getFullYear() === prevYear
  );

  // 1. Average Voyage Duration (DAX: AVERAGEX('Voyage List', 'Voyage List'[Duration Hours]))
  const totalDurationHours = currentMonthVoyages.reduce((sum, voyage) => sum + (voyage.durationHours || 0), 0);
  const averageVoyageDuration = currentMonthVoyages.length > 0 ? totalDurationHours / currentMonthVoyages.length : 0;
  
  const prevTotalDuration = prevMonthVoyages.reduce((sum, voyage) => sum + (voyage.durationHours || 0), 0);
  const prevAverageVoyageDuration = prevMonthVoyages.length > 0 ? prevTotalDuration / prevMonthVoyages.length : 0;
  const avgVoyageDurationMoMChange = prevAverageVoyageDuration > 0 ? 
    ((averageVoyageDuration - prevAverageVoyageDuration) / prevAverageVoyageDuration) * 100 : 0;

  // 2. Voyage Purpose Distribution
  const voyagePurposeDistribution = currentMonthVoyages.reduce((dist, voyage) => {
    const purpose = voyage.voyagePurpose || 'Other';
    dist[purpose] = (dist[purpose] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  const totalVoyages = currentMonthVoyages.length;
  const drillingVoyages = voyagePurposeDistribution['Drilling'] || 0;
  const productionVoyages = voyagePurposeDistribution['Production'] || 0;
  const mixedVoyages = voyagePurposeDistribution['Mixed'] || 0;
  const otherVoyages = voyagePurposeDistribution['Other'] || 0;

  const drillingVoyagePercentage = totalVoyages > 0 ? (drillingVoyages / totalVoyages) * 100 : 0;
  const mixedVoyageEfficiency = totalVoyages > 0 ? (mixedVoyages / totalVoyages) * 100 : 0;

  // 3. Route Complexity Analysis
  const totalStops = currentMonthVoyages.reduce((sum, voyage) => sum + voyage.stopCount, 0);
  const averageStopsPerVoyage = totalVoyages > 0 ? totalStops / totalVoyages : 0;
  
  const multiStopVoyages = currentMonthVoyages.filter(voyage => voyage.stopCount > 2).length;
  const multiStopPercentage = totalVoyages > 0 ? (multiStopVoyages / totalVoyages) * 100 : 0;
  
  const routeEfficiencyScore = averageVoyageDuration > 0 ? 
    averageStopsPerVoyage / (averageVoyageDuration / 24) : 0;

  // 4. Vessel Voyage Frequency
  const uniqueVessels = new Set(currentMonthVoyages.map(voyage => voyage.vessel));
  const activeVesselsThisMonth = uniqueVessels.size;
  const voyagesPerVessel = activeVesselsThisMonth > 0 ? totalVoyages / activeVesselsThisMonth : 0;
  
  const highActivityVessels = currentMonthVoyages
    .filter(voyage => voyage.stopCount >= 3)
    .map(voyage => voyage.vessel);
  const uniqueHighActivityVessels = new Set(highActivityVessels).size;

  // 5. Origin-Destination Analysis
  const fourchonDepartures = currentMonthVoyages.filter(voyage => 
    voyage.originPort === 'Fourchon' || 
    voyage.locations.toLowerCase().includes('fourchon') ||
    (voyage.locationList.length > 0 && voyage.locationList[0].toLowerCase().includes('fourchon'))
  ).length;
  const routeConcentration = totalVoyages > 0 ? (fourchonDepartures / totalVoyages) * 100 : 0;

  // Popular destinations analysis
  const destinationCounts = currentMonthVoyages.reduce((counts, voyage) => {
    const destination = voyage.mainDestination || 'Unknown';
    counts[destination] = (counts[destination] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const popularDestinations = Object.entries(destinationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([destination, count]) => ({ destination, count, percentage: (count / totalVoyages) * 100 }));

  // 6. Seasonal Voyage Patterns
  const monthlyVoyageCount = totalVoyages;
  const prevMonthlyVoyageCount = prevMonthVoyages.length;
  const voyageSeasonalIndex = prevMonthlyVoyageCount > 0 ? monthlyVoyageCount / prevMonthlyVoyageCount : 1;
  
  const peakSeasonIndicator = voyageSeasonalIndex > 1.2 ? "🔥 Peak" : 
                             voyageSeasonalIndex < 0.8 ? "❄️ Low" : "📊 Normal";

  // Cross-table integration metrics
  
  // 7. Voyage Planning vs Execution Analysis
  const voyageExecutionMetrics = currentMonthVoyages.map(voyage => {
    // Find related voyage events
    const relatedEvents = voyageEvents.filter(event => 
      event.standardizedVoyageNumber === voyage.standardizedVoyageId ||
      (event.vessel === voyage.vessel && 
       Math.abs(event.eventDate.getTime() - voyage.voyageDate.getTime()) < 7 * 24 * 60 * 60 * 1000) // Within 7 days
    );
    
    const actualDuration = relatedEvents.reduce((sum, event) => sum + event.finalHours, 0);
    const plannedDuration = voyage.durationHours || 0;
    const plannedVsActualDuration = actualDuration - plannedDuration;
    const voyageExecutionEfficiency = actualDuration > 0 ? plannedDuration / actualDuration : 0;
    
    return {
      voyageId: voyage.standardizedVoyageId,
      plannedDuration,
      actualDuration,
      plannedVsActualDuration,
      voyageExecutionEfficiency,
      isOnTime: Math.abs(plannedVsActualDuration) <= 2 // Within 2 hours
    };
  });

  const onTimeVoyages = voyageExecutionMetrics.filter(metric => metric.isOnTime).length;
  const onTimeVoyagePercentage = totalVoyages > 0 ? (onTimeVoyages / totalVoyages) * 100 : 0;
  const averageExecutionEfficiency = voyageExecutionMetrics.length > 0 ? 
    voyageExecutionMetrics.reduce((sum, metric) => sum + metric.voyageExecutionEfficiency, 0) / voyageExecutionMetrics.length : 0;

  // 8. Route Complexity vs Operational Performance
  const complexRouteVoyages = currentMonthVoyages.filter(voyage => voyage.stopCount >= 4);
  const simpleRouteVoyages = currentMonthVoyages.filter(voyage => voyage.stopCount <= 2);
  
  const complexRoutePerformance = calculateRoutePerformance(complexRouteVoyages, voyageEvents);
  const simpleRoutePerformance = calculateRoutePerformance(simpleRouteVoyages, voyageEvents);
  const routeComplexityImpact = complexRoutePerformance - simpleRoutePerformance;

  // 9. Cargo Delivery Effectiveness by Voyage Purpose
  const cargoEfficiencyByPurpose = {
    drilling: calculateCargoEfficiencyByPurpose('Drilling', currentMonthVoyages, vesselManifests),
    production: calculateCargoEfficiencyByPurpose('Production', currentMonthVoyages, vesselManifests),
    mixed: calculateCargoEfficiencyByPurpose('Mixed', currentMonthVoyages, vesselManifests)
  };

  // 10. Multi-Stop Voyage Efficiency
  const multiStopCargoData = calculateMultiStopEfficiency(currentMonthVoyages, vesselManifests, true);
  const singleStopCargoData = calculateMultiStopEfficiency(currentMonthVoyages, vesselManifests, false);
  const consolidationBenefit = multiStopCargoData.cargoDensity - singleStopCargoData.cargoDensity;

  return {
    // Core voyage metrics
    totalVoyages,
    averageVoyageDuration,
    avgVoyageDurationMoMChange,
    
    // Purpose distribution
    voyagePurposeDistribution,
    drillingVoyages,
    productionVoyages,
    mixedVoyages,
    otherVoyages,
    drillingVoyagePercentage,
    mixedVoyageEfficiency,
    
    // Route complexity
    averageStopsPerVoyage,
    multiStopVoyages,
    multiStopPercentage,
    routeEfficiencyScore,
    
    // Vessel utilization
    activeVesselsThisMonth,
    voyagesPerVessel,
    uniqueHighActivityVessels,
    
    // Origin-destination
    fourchonDepartures,
    routeConcentration,
    popularDestinations,
    
    // Seasonal patterns
    monthlyVoyageCount,
    voyageSeasonalIndex,
    peakSeasonIndicator,
    
    // Execution analysis
    voyageExecutionMetrics,
    onTimeVoyagePercentage,
    averageExecutionEfficiency,
    
    // Route performance
    complexRoutePerformance,
    simpleRoutePerformance,
    routeComplexityImpact,
    
    // Cargo effectiveness
    cargoEfficiencyByPurpose,
    
    // Multi-stop efficiency
    multiStopCargoData,
    singleStopCargoData,
    consolidationBenefit
  };
};

// Helper functions for voyage list calculations
const calculateRoutePerformance = (voyages: VoyageList[], voyageEvents: VoyageEvent[]): number => {
  if (voyages.length === 0) return 0;
  
  const voyageIds = voyages.map(v => v.standardizedVoyageId);
  const relatedEvents = voyageEvents.filter(event => 
    voyageIds.includes(event.standardizedVoyageNumber || '') ||
    voyages.some(v => v.vessel === event.vessel)
  );
  
  const productiveHours = relatedEvents
    .filter(event => event.activityCategory === 'Productive')
    .reduce((sum, event) => sum + event.finalHours, 0);
  
  const totalHours = relatedEvents.reduce((sum, event) => sum + event.finalHours, 0);
  
  return totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
};

const calculateCargoEfficiencyByPurpose = (
  purpose: string, 
  voyages: VoyageList[], 
  manifests: VesselManifest[]
): { tonnagePerVoyage: number; totalTonnage: number; voyageCount: number } => {
  const purposeVoyages = voyages.filter(voyage => voyage.voyagePurpose === purpose);
  const voyageIds = purposeVoyages.map(v => v.standardizedVoyageId);
  
  const relatedManifests = manifests.filter(manifest => 
    voyageIds.includes(manifest.standardizedVoyageId) ||
    purposeVoyages.some(v => v.vessel === manifest.transporter)
  );
  
  const totalTonnage = relatedManifests.reduce((sum, manifest) => 
    sum + manifest.deckTons + manifest.rtTons, 0);
  
  const voyageCount = purposeVoyages.length;
  const tonnagePerVoyage = voyageCount > 0 ? totalTonnage / voyageCount : 0;
  
  return { tonnagePerVoyage, totalTonnage, voyageCount };
};

const calculateMultiStopEfficiency = (
  voyages: VoyageList[], 
  manifests: VesselManifest[], 
  isMultiStop: boolean
): { cargoDensity: number; totalTonnage: number; totalDuration: number } => {
  const filteredVoyages = voyages.filter(voyage => 
    isMultiStop ? voyage.stopCount >= 3 : voyage.stopCount <= 2
  );
  
  const voyageIds = filteredVoyages.map(v => v.standardizedVoyageId);
  const relatedManifests = manifests.filter(manifest => 
    voyageIds.includes(manifest.standardizedVoyageId) ||
    filteredVoyages.some(v => v.vessel === manifest.transporter)
  );
  
  const totalTonnage = relatedManifests.reduce((sum, manifest) => 
    sum + manifest.deckTons + manifest.rtTons, 0);
  
  const totalDuration = filteredVoyages.reduce((sum, voyage) => 
    sum + (voyage.durationHours || 0), 0);
  
  const cargoDensity = totalDuration > 0 ? totalTonnage / totalDuration : 0;
  
  return { cargoDensity, totalTonnage, totalDuration };
};