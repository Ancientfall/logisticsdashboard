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
import { getMasterFacilitiesData } from '../data/masterFacilities';

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
      results.vesselManifests
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
    const staticMasterFacilities = getMasterFacilitiesData();
    
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
      locationName: facility.LocationName,
      facilityType: facility.FacilityType as 'Production' | 'Drilling' | 'Integrated' | 'Logistics',
      parentFacility: facility.ParentFacility || undefined,
      isProductionCapable: facility.IsProductionCapable,
      isDrillingCapable: facility.IsDrillingCapable,
      productionLCs: facility.ProductionLCs ? facility.ProductionLCs.split(',').map(lc => lc.trim()) : undefined,
      region: facility.Region,
      notes: undefined,
      isActive: facility.IsActive
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
  return rawCostAllocation.map((costAlloc, index) => ({
    lcNumber: costAlloc["LC Number"],
    locationReference: costAlloc["Location Reference"],
    description: costAlloc.Description,
    costElement: costAlloc["Cost Element"],
    monthYear: costAlloc["Month-Year"],
    month: costAlloc["Month-Year"] ? parseInt(costAlloc["Month-Year"].split('-')[1]) : undefined,
    year: costAlloc["Month-Year"] ? parseInt(costAlloc["Month-Year"].split('-')[0]) : undefined,
    mission: costAlloc.Mission,
    department: inferDepartmentFromDescription(costAlloc.Description),
    isActive: true
  }));
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

  for (const event of rawEvents) {
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
          activityCategory: classifyActivity(event["Parent Event"], event.Event || null), // Convert undefined to null
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
 * Calculate KPI metrics from processed data
 */
const calculateMetrics = (
  voyageEvents: VoyageEvent[],
  vesselManifests: VesselManifest[]
): KPIMetrics => {
  // Default time period (current month)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter for current month
  const currentMonthEvents = voyageEvents.filter(event => 
    event.eventDate.getMonth() === currentMonth && 
    event.eventDate.getFullYear() === currentYear
  );
  
  // Filter for previous month
  const prevMonthEvents = voyageEvents.filter(event => {
    const date = event.eventDate;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  });
  
  // Calculate current month metrics
  const totalOffshoreTime = calculateTotalHours(currentMonthEvents.filter(e => e.portType === 'rig'));
  const totalOnshoreTime = calculateTotalHours(currentMonthEvents.filter(e => e.portType === 'base'));
  const productiveHours = calculateTotalHours(currentMonthEvents.filter(e => e.activityCategory === 'Productive'));
  const nonProductiveHours = calculateTotalHours(currentMonthEvents.filter(e => e.activityCategory === 'Non-Productive'));
  
  // Drilling metrics
  const drillingEvents = currentMonthEvents.filter(e => e.department === 'Drilling');
  const drillingHours = calculateTotalHours(drillingEvents);
  const drillingNPTHours = calculateTotalHours(drillingEvents.filter(e => e.activityCategory === 'Non-Productive'));
  const drillingNPTPercentage = drillingHours > 0 ? (drillingNPTHours / drillingHours) * 100 : 0;
  const drillingCargoOpsHours = calculateTotalHours(drillingEvents.filter(e => e.parentEvent === 'Cargo Ops'));
  
  // Waiting time metrics
  const waitingTimeOffshore = calculateTotalHours(currentMonthEvents.filter(e => 
    e.portType === 'rig' && e.parentEvent === 'Waiting on Installation'
  ));
  const waitingTimePercentage = totalOffshoreTime > 0 ? (waitingTimeOffshore / totalOffshoreTime) * 100 : 0;
  const weatherWaitingHours = calculateTotalHours(currentMonthEvents.filter(e => e.parentEvent === 'Waiting on Weather'));
  const installationWaitingHours = calculateTotalHours(currentMonthEvents.filter(e => e.parentEvent === 'Waiting on Installation'));
  
  // Cargo metrics
  const cargoOpsHours = calculateTotalHours(currentMonthEvents.filter(e => e.parentEvent === 'Cargo Ops'));
  const totalLifts = vesselManifests.reduce((sum, manifest) => sum + manifest.lifts, 0);
  const liftsPerCargoHour = cargoOpsHours > 0 ? totalLifts / cargoOpsHours : 0;
  const totalDeckTons = vesselManifests.reduce((sum, manifest) => sum + manifest.deckTons, 0);
  const totalRTTons = vesselManifests.reduce((sum, manifest) => sum + manifest.rtTons, 0);
  
  // Efficiency metrics
  const vesselUtilizationRate = (totalOffshoreTime + totalOnshoreTime) > 0 ? 
    (productiveHours / (totalOffshoreTime + totalOnshoreTime)) * 100 : 0;
  const averageTripDuration = calculateAverageTripDuration(voyageEvents);
  const cargoTonnagePerVisit = vesselManifests.length > 0 ? 
    (totalDeckTons + totalRTTons) / vesselManifests.length : 0;
  
  // Calculate previous month metrics
  const prevTotalOffshoreTime = calculateTotalHours(prevMonthEvents.filter(e => e.portType === 'rig'));
  const prevWaitingTimeOffshore = calculateTotalHours(prevMonthEvents.filter(e => 
    e.portType === 'rig' && e.parentEvent === 'Waiting on Installation'
  ));
  const prevWaitingTimePercentage = prevTotalOffshoreTime > 0 ? 
    (prevWaitingTimeOffshore / prevTotalOffshoreTime) * 100 : 0;
  const prevCargoOpsHours = calculateTotalHours(prevMonthEvents.filter(e => e.parentEvent === 'Cargo Ops'));
  
  // Month-over-month changes
  const waitingTimePercentageMoM = waitingTimePercentage - prevWaitingTimePercentage;
  const cargoOpsHoursMoM = prevCargoOpsHours > 0 ? 
    ((cargoOpsHours - prevCargoOpsHours) / prevCargoOpsHours) * 100 : 0;
  
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
    momChanges: {
      waitingTimePercentage: waitingTimePercentageMoM,
      cargoOpsHours: cargoOpsHoursMoM,
      liftsPerCargoHour: 0, // Would need previous month manifests
      drillingNPTPercentage: 0, // Would need previous month calculation
      vesselUtilizationRate: 0 // Would need previous month calculation
    }
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
): "Productive" | "Non-Productive" | "Uncategorized" => {
  if (!parentEvent) return "Uncategorized";
  
  if (!event) {
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
      return "Uncategorized";
    }
  }
  
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
  
  if (productiveCombinations.includes(`${parentEvent},${event}`)) {
    return "Productive";
  }
  
  const nonProductiveParentEvents = [
    "Waiting on Weather", "Waiting on Installation",
    "Waiting on Quay", "Port or Supply Base closed"
  ];
  
  if (nonProductiveParentEvents.includes(parentEvent)) {
    return "Non-Productive";
  }
  
  return "Uncategorized";
};

// LC Allocation Processing (simplified version)
interface LCAllocation {
  lcNumber: string;
  percentage: number;
  originalLocation: string | null;
  mappedLocation: string;
  department: "Drilling" | "Production" | "Logistics" | null;
  isSpecialCase: boolean;
}

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
  // Default allocation if no LC info
  if (!costDedicatedTo) {
    if (location === "Fourchon" && portType === "base") {
      return [{
        lcNumber: "AUTO",
        percentage: 100,
        originalLocation: "Fourchon",
        mappedLocation: "Fourchon",
        department: "Logistics",
        isSpecialCase: true
      }];
    }
    
    return [{
      lcNumber: "",
      percentage: 100,
      originalLocation: null,
      mappedLocation: location,
      department: null,
      isSpecialCase: false
    }];
  }
  
  // Simple LC processing - single LC with 100%
  const lcNumber = costDedicatedTo.split(' ')[0];
  const costAlloc = costAllocationMap.get(lcNumber);
  
  return [{
    lcNumber,
    percentage: 100,
    originalLocation: costAlloc?.locationReference || null,
    mappedLocation: costAlloc?.locationReference || location,
    department: costAlloc?.department || null,
    isSpecialCase: false
  }];
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
  if (costCode && costAllocationMap.has(costCode)) {
    const costAlloc = costAllocationMap.get(costCode)!;
    return {
      mappedLocation: costAlloc.locationReference,
      department: costAlloc.department || null // Convert undefined to null, then we'll convert back to undefined in the calling function
    };
  }
  
  return {
    mappedLocation: offshoreLocation,
    department: null
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
    "Thunder Horse Drilling", "Mad Dog Drilling", "Ocean Blackhornet",
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

const inferDepartmentFromDescription = (description: string | undefined): "Drilling" | "Production" | "Logistics" | undefined => {
  if (!description) return undefined;
  
  const desc = description.toLowerCase();
  if (desc.includes('drill')) return "Drilling";
  if (desc.includes('production') || desc.includes('prod')) return "Production";
  if (desc.includes('logistics') || desc.includes('fourchon')) return "Logistics";
  
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