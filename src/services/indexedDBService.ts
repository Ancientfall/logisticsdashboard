// src/services/indexedDBService.ts
import { logisticsDB, StorageMetadata } from '../utils/storage/indexedDBManager';
import {
  VoyageEvent,
  VesselManifest,
  MasterFacility,
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction
} from '../types';

export interface IndexedDBStorageData {
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

/**
 * IndexedDB Storage Service for BP Logistics Dashboard
 * Provides high-level interface for data operations
 */
export class IndexedDBStorageService {
  private isReady = false;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the database connection
   */
  private async initialize(): Promise<boolean> {
    try {
      // Test database connection
      await logisticsDB.open();
      
      // Check if we can perform basic operations
      await logisticsDB.transaction('r', logisticsDB.metadata, async () => {
        await logisticsDB.metadata.count();
      });

      this.isReady = true;
      console.log('✅ IndexedDB initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Ensure database is ready before operations
   */
  private async ensureReady(): Promise<boolean> {
    if (this.isReady) return true;
    
    if (this.initPromise) {
      return await this.initPromise;
    }
    
    return await this.initialize();
  }

  /**
   * Save all data to IndexedDB
   */
  async saveAllData(data: IndexedDBStorageData): Promise<boolean> {
    try {
      console.log('💾 Saving data to IndexedDB...');
      
      if (!(await this.ensureReady())) {
        throw new Error('IndexedDB not available');
      }

      const startTime = performance.now();

      // Calculate metadata
      const totalRecords = 
        data.voyageEvents.length +
        data.vesselManifests.length +
        data.costAllocation.length +
        data.voyageList.length;

      const metadata: StorageMetadata = {
        lastUpdated: new Date(),
        dateRange: this.calculateDateRange(data.voyageEvents),
        totalRecords,
        dataVersion: '2.0-indexeddb'
      };

      // Save all data in a single transaction for consistency
      await logisticsDB.transaction('rw', logisticsDB.tables, async () => {
        // Clear existing data
        await Promise.all([
          logisticsDB.voyageEvents.clear(),
          logisticsDB.vesselManifests.clear(),
          logisticsDB.masterFacilities.clear(),
          logisticsDB.costAllocation.clear(),
          logisticsDB.vesselClassifications.clear(),
          logisticsDB.voyageList.clear(),
          logisticsDB.bulkActions.clear(),
          logisticsDB.metadata.clear()
        ]);

        // Add new data using bulkAdd for better performance
        const savePromises = [];
        
        if (data.voyageEvents.length > 0) {
          savePromises.push(logisticsDB.voyageEvents.bulkAdd(data.voyageEvents));
        }
        if (data.vesselManifests.length > 0) {
          savePromises.push(logisticsDB.vesselManifests.bulkAdd(data.vesselManifests));
        }
        if (data.masterFacilities.length > 0) {
          savePromises.push(logisticsDB.masterFacilities.bulkAdd(data.masterFacilities));
        }
        if (data.costAllocation.length > 0) {
          savePromises.push(logisticsDB.costAllocation.bulkAdd(data.costAllocation));
        }
        if (data.vesselClassifications.length > 0) {
          savePromises.push(logisticsDB.vesselClassifications.bulkAdd(data.vesselClassifications));
        }
        if (data.voyageList.length > 0) {
          savePromises.push(logisticsDB.voyageList.bulkAdd(data.voyageList));
        }
        if (data.bulkActions.length > 0) {
          savePromises.push(logisticsDB.bulkActions.bulkAdd(data.bulkActions));
        }
        
        // Save metadata
        savePromises.push(logisticsDB.metadata.add(metadata));

        await Promise.all(savePromises);
      });

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(0);
      
      console.log(`✅ Saved ${totalRecords} records to IndexedDB in ${duration}ms`);
      return true;

    } catch (error) {
      console.error('❌ Failed to save data to IndexedDB:', error);
      return false;
    }
  }

  /**
   * Load all data from IndexedDB
   */
  async loadAllData(): Promise<IndexedDBStorageData | null> {
    try {
      console.log('🔍 Loading data from IndexedDB...');
      
      if (!(await this.ensureReady())) {
        console.warn('IndexedDB not available, cannot load data');
        return null;
      }

      const startTime = performance.now();

      // Load all data in parallel for better performance
      const [
        voyageEvents,
        vesselManifests,
        masterFacilities,
        costAllocation,
        vesselClassifications,
        voyageList,
        bulkActions,
        metadataArray
      ] = await Promise.all([
        logisticsDB.voyageEvents.toArray(),
        logisticsDB.vesselManifests.toArray(),
        logisticsDB.masterFacilities.toArray(),
        logisticsDB.costAllocation.toArray(),
        logisticsDB.vesselClassifications.toArray(),
        logisticsDB.voyageList.toArray(),
        logisticsDB.bulkActions.toArray(),
        logisticsDB.metadata.toArray()
      ]);

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(0);
      
      const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length;
      console.log(`✅ Loaded ${totalRecords} records from IndexedDB in ${duration}ms`);

      return {
        voyageEvents,
        vesselManifests,
        masterFacilities,
        costAllocation,
        vesselClassifications,
        voyageList,
        bulkActions,
        metadata: metadataArray[0] // Single metadata record
      };

    } catch (error) {
      console.error('❌ Failed to load data from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAllData(): Promise<boolean> {
    try {
      if (!(await this.ensureReady())) {
        return false;
      }

      await logisticsDB.clearAllData();
      console.log('✅ Cleared all IndexedDB data');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB data:', error);
      return false;
    }
  }

  /**
   * Get storage information and statistics
   */
  async getStorageInfo() {
    try {
      if (!(await this.ensureReady())) {
        return null;
      }

      const dbInfo = await logisticsDB.getDatabaseInfo();
      
      return {
        type: 'IndexedDB',
        database: logisticsDB.name,
        version: logisticsDB.verno,
        isReady: this.isReady,
        ...dbInfo
      };
    } catch (error) {
      console.error('Failed to get IndexedDB storage info:', error);
      return null;
    }
  }

  /**
   * Check if IndexedDB is supported and available
   */
  static isSupported(): boolean {
    return 'indexedDB' in window && !!window.indexedDB;
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      if (!(await this.ensureReady())) {
        return { healthy: false, message: 'Database not initialized' };
      }

      // Perform a simple read test
      await logisticsDB.metadata.count();
      
      return { healthy: true, message: 'Database is healthy' };
    } catch (error) {
      return { 
        healthy: false, 
        message: `Database health check failed: ${error}` 
      };
    }
  }

  /**
   * Calculate date range from voyage events
   */
  private calculateDateRange(voyageEvents: VoyageEvent[]) {
    if (voyageEvents.length === 0) {
      return { start: null, end: null };
    }

    const dates = voyageEvents
      .map(event => new Date(event.eventDate || event.from))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      start: dates.length > 0 ? dates[0] : null,
      end: dates.length > 0 ? dates[dates.length - 1] : null
    };
  }

  /**
   * Advanced query methods for specific use cases
   */
  
  /**
   * Get voyage events for a specific vessel
   */
  async getVoyageEventsByVessel(vesselName: string): Promise<VoyageEvent[]> {
    if (!(await this.ensureReady())) return [];
    
    return await logisticsDB.voyageEvents
      .where('vessel')
      .equals(vesselName)
      .toArray();
  }

  /**
   * Get recent voyage events (last N days)
   */
  async getRecentVoyageEvents(days: number = 30): Promise<VoyageEvent[]> {
    if (!(await this.ensureReady())) return [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await logisticsDB.voyageEvents
      .where('eventDate')
      .above(cutoffDate)
      .toArray();
  }

  /**
   * Get vessels that departed from a specific location
   */
  async getVesselsByDepartureLocation(location: string): Promise<VesselManifest[]> {
    if (!(await this.ensureReady())) return [];
    
    return await logisticsDB.vesselManifests
      .where('from')
      .equals(location)
      .toArray();
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBStorageService();