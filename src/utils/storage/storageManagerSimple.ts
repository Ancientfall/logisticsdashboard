// src/utils/storage/storageManagerSimple.ts
import { 
  VoyageEvent, 
  VesselManifest, 
  MasterFacility, 
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction 
} from '../../types';

export interface StorageData {
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  metadata?: {
    lastUpdated: Date | string;
    dateRange?: {
      start: Date | string | null;
      end: Date | string | null;
    };
    totalRecords: number;
    dataVersion: string;
  };
}

export interface LoadedData extends StorageData {
  hasData: boolean;
  lastUpdated: Date | null;
  isEmergency?: boolean;
  isMinimal?: boolean;
  message?: string;
  instructions?: string[];
  savedData?: Record<string, number>;
  counts?: Record<string, number>;
}

const STORAGE_KEY = 'bp-logistics-data';

/**
 * Simplified Storage Manager for localStorage fallback
 * IndexedDB is now the primary storage - this is just a simple fallback
 */
export class SimpleStorageManager {
  private static instance: SimpleStorageManager;
  private instanceId: string;

  private constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`📦 SimpleStorageManager[${this.instanceId}] initialized as localStorage fallback`);
  }

  public static getInstance(): SimpleStorageManager {
    if (!SimpleStorageManager.instance) {
      SimpleStorageManager.instance = new SimpleStorageManager();
    }
    return SimpleStorageManager.instance;
  }

  /**
   * Load data from localStorage (simple fallback)
   */
  loadData(): LoadedData | null {
    console.log(`🔍 SimpleStorageManager[${this.instanceId}] loading fallback data from localStorage...`);
    
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        return this.validateAndTransformData(parsed);
      }
    } catch (error) {
      console.warn(`Failed to load fallback data from localStorage:`, error);
    }

    return null;
  }

  /**
   * Save data to localStorage (simple fallback)
   */
  saveData(data: StorageData): boolean {
    const timestamp = new Date().toISOString();
    console.log(`💾 SimpleStorageManager[${this.instanceId}] saving fallback data at ${timestamp}`);

    try {
      const totalRecords = this.calculateTotalRecords(data);
      
      const dataWithMetadata: StorageData = {
        ...data,
        metadata: {
          lastUpdated: new Date(),
          dateRange: this.calculateDateRange(data.voyageEvents),
          totalRecords,
          dataVersion: '2.0-localStorage-fallback'
        }
      };

      const dataString = JSON.stringify(dataWithMetadata);
      const dataSizeMB = (new Blob([dataString]).size / 1024 / 1024).toFixed(2);

      console.log(`💾 Fallback data size: ${dataSizeMB}MB`);

      // Simple localStorage save (IndexedDB should handle large data)
      localStorage.setItem(STORAGE_KEY, dataString);
      console.log(`✅ Saved fallback data to localStorage`);
      
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn(`⚠️ localStorage quota exceeded - this is expected with large datasets`);
        console.log(`ℹ️ Primary storage (IndexedDB) should be handling large data`);
        return false; // Fail gracefully - IndexedDB should be primary
      }
      console.error(`Failed to save fallback data to localStorage:`, error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🧹 Cleared localStorage fallback data');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; keys: string[]; sizeMB: number } {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('bp-logistics'));
    let totalSize = 0;

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    });

    return {
      used: totalSize,
      keys,
      sizeMB: totalSize / 1024 / 1024
    };
  }

  /**
   * Validate and transform loaded data
   */
  private validateAndTransformData(parsed: any): LoadedData {
    const data: LoadedData = {
      voyageEvents: parsed.voyageEvents || [],
      vesselManifests: parsed.vesselManifests || [],
      masterFacilities: parsed.masterFacilities || [],
      costAllocation: parsed.costAllocation || [],
      vesselClassifications: parsed.vesselClassifications || [],
      voyageList: parsed.voyageList || [],
      bulkActions: parsed.bulkActions || [],
      hasData: false,
      lastUpdated: null
    };

    // Check if we have any actual data
    data.hasData = data.voyageEvents.length > 0 || 
                   data.vesselManifests.length > 0 || 
                   data.costAllocation.length > 0;

    if (parsed.metadata?.lastUpdated) {
      data.lastUpdated = new Date(parsed.metadata.lastUpdated);
    }

    return data;
  }

  /**
   * Calculate total records for metadata
   */
  private calculateTotalRecords(data: StorageData): number {
    return (data.voyageEvents?.length || 0) +
           (data.vesselManifests?.length || 0) +
           (data.costAllocation?.length || 0) +
           (data.voyageList?.length || 0) +
           (data.masterFacilities?.length || 0) +
           (data.vesselClassifications?.length || 0) +
           (data.bulkActions?.length || 0);
  }

  /**
   * Calculate date range from voyage events
   */
  private calculateDateRange(voyageEvents: VoyageEvent[]): { start: Date | null; end: Date | null } {
    if (!voyageEvents || voyageEvents.length === 0) {
      return { start: null, end: null };
    }

    const dates = voyageEvents.map(event => new Date(event.from)).filter(date => !isNaN(date.getTime()));
    
    if (dates.length === 0) {
      return { start: null, end: null };
    }

    return {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }
}