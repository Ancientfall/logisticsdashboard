// src/utils/storage/indexedDBManager.ts
import Dexie, { Table } from 'dexie';
import {
  VoyageEvent,
  VesselManifest,
  MasterFacility,
  CostAllocation,
  VesselClassification,
  VoyageList,
  BulkAction,
  RigScheduleEntry
} from '../../types';
import type { Notification, NotificationSettings } from '../../types/notification';

export interface StorageMetadata {
  id?: number;
  lastUpdated: Date;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  totalRecords: number;
  dataVersion: string;
}

export interface LogisticsData {
  voyageEvents: VoyageEvent[];
  vesselManifests: VesselManifest[];
  masterFacilities: MasterFacility[];
  costAllocation: CostAllocation[];
  vesselClassifications: VesselClassification[];
  voyageList: VoyageList[];
  bulkActions: BulkAction[];
  rigScheduleData: RigScheduleEntry[];
  metadata?: StorageMetadata;
}

/**
 * IndexedDB Database for BP Logistics Dashboard
 * Uses Dexie.js for easier IndexedDB management
 */
export class LogisticsDatabase extends Dexie {
  // Table definitions
  voyageEvents!: Table<VoyageEvent, number>;
  vesselManifests!: Table<VesselManifest, number>;
  masterFacilities!: Table<MasterFacility, number>;
  costAllocation!: Table<CostAllocation, number>;
  vesselClassifications!: Table<VesselClassification, number>;
  voyageList!: Table<VoyageList, number>;
  bulkActions!: Table<BulkAction, number>;
  rigScheduleData!: Table<RigScheduleEntry, number>;
  metadata!: Table<StorageMetadata, number>;
  notifications!: Table<Notification, string>;
  notificationSettings!: Table<NotificationSettings, number>;

  constructor() {
    super('BPLogisticsDatabase');

    // Define database schema
    this.version(1).stores({
      // VoyageEvent table with indexes for fast querying
      voyageEvents: '++id, vessel, eventDate, location, activityCategory, from, to',
      
      // VesselManifest table
      vesselManifests: '++id, transporter, manifestDate, from, offshoreLocation',
      
      // MasterFacility table
      masterFacilities: '++id, name, location, type',
      
      // CostAllocation table
      costAllocation: '++id, vesselName, date, location, activityType',
      
      // VesselClassification table
      vesselClassifications: '++id, vesselName, classification, type',
      
      // VoyageList table
      voyageList: '++id, vesselName, departure, arrival, route',
      
      // BulkAction table
      bulkActions: '++id, timestamp, type, status',
      
      // Metadata table (single record with app metadata)
      metadata: '++id, lastUpdated, dataVersion'
    });
    
    // Version 2: Add notifications
    this.version(2).stores({
      // Keep all existing stores
      voyageEvents: '++id, vessel, eventDate, location, activityCategory, from, to',
      vesselManifests: '++id, transporter, manifestDate, from, offshoreLocation',
      masterFacilities: '++id, name, location, type',
      costAllocation: '++id, vesselName, date, location, activityType',
      vesselClassifications: '++id, vesselName, classification, type',
      voyageList: '++id, vesselName, departure, arrival, route',
      bulkActions: '++id, timestamp, type, status',
      metadata: '++id, lastUpdated, dataVersion',
      
      // Add notification stores
      notifications: 'id, type, subType, priority, timestamp, isRead, groupId',
      notificationSettings: '++id'
    });

    // Version 3: Add rig schedule data
    this.version(3).stores({
      // Keep all existing stores
      voyageEvents: '++id, vessel, eventDate, location, activityCategory, from, to',
      vesselManifests: '++id, transporter, manifestDate, from, offshoreLocation',
      masterFacilities: '++id, name, location, type',
      costAllocation: '++id, vesselName, date, location, activityType',
      vesselClassifications: '++id, vesselName, classification, type',
      voyageList: '++id, vesselName, departure, arrival, route',
      bulkActions: '++id, timestamp, type, status',
      metadata: '++id, lastUpdated, dataVersion',
      notifications: 'id, type, subType, priority, timestamp, isRead, groupId',
      notificationSettings: '++id',
      
      // Add rig schedule data store
      rigScheduleData: '++id, rigName, client, activityType, location, startDate, endDate, duration'
    });

    // Optional: Add hooks for data validation and transformation
    this.voyageEvents.hook('creating', (primKey, obj, trans) => {
      // Ensure dates are proper Date objects
      if (obj.eventDate && typeof obj.eventDate === 'string') {
        obj.eventDate = new Date(obj.eventDate);
      }
      if (obj.from && typeof obj.from === 'string') {
        obj.from = new Date(obj.from);
      }
      if (obj.to && typeof obj.to === 'string') {
        obj.to = new Date(obj.to);
      }
    });

    this.vesselManifests.hook('creating', (primKey, obj, trans) => {
      // Ensure dates are proper Date objects
      if (obj.manifestDate && typeof obj.manifestDate === 'string') {
        obj.manifestDate = new Date(obj.manifestDate);
      }
      if (obj.manifestDateOnly && typeof obj.manifestDateOnly === 'string') {
        obj.manifestDateOnly = new Date(obj.manifestDateOnly);
      }
    });
  }

  /**
   * Get database size and usage information
   */
  async getDatabaseInfo() {
    try {
      const counts = {
        voyageEvents: await this.voyageEvents.count(),
        vesselManifests: await this.vesselManifests.count(),
        masterFacilities: await this.masterFacilities.count(),
        costAllocation: await this.costAllocation.count(),
        vesselClassifications: await this.vesselClassifications.count(),
        voyageList: await this.voyageList.count(),
        bulkActions: await this.bulkActions.count(),
        rigScheduleData: await this.rigScheduleData.count()
      };

      const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

      // Get storage estimate (if supported)
      let storageEstimate = null;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        storageEstimate = await navigator.storage.estimate();
      }

      return {
        counts,
        totalRecords,
        databaseName: this.name,
        version: this.verno,
        storageEstimate
      };
    } catch (error) {
      console.error('Failed to get database info:', error);
      return null;
    }
  }

  /**
   * Clear all data from database
   */
  async clearAllData() {
    try {
      await this.transaction('rw', this.tables, async () => {
        await Promise.all([
          this.voyageEvents.clear(),
          this.vesselManifests.clear(),
          this.masterFacilities.clear(),
          this.costAllocation.clear(),
          this.vesselClassifications.clear(),
          this.voyageList.clear(),
          this.bulkActions.clear(),
          this.rigScheduleData.clear(),
          this.metadata.clear()
        ]);
      });
      console.log('✅ Cleared all IndexedDB data');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB data:', error);
      return false;
    }
  }

  /**
   * Export all data for backup/migration
   */
  async exportAllData(): Promise<LogisticsData | null> {
    try {
      const [
        voyageEvents,
        vesselManifests,
        masterFacilities,
        costAllocation,
        vesselClassifications,
        voyageList,
        bulkActions,
        rigScheduleData,
        metadata
      ] = await Promise.all([
        this.voyageEvents.toArray(),
        this.vesselManifests.toArray(),
        this.masterFacilities.toArray(),
        this.costAllocation.toArray(),
        this.vesselClassifications.toArray(),
        this.voyageList.toArray(),
        this.bulkActions.toArray(),
        this.rigScheduleData.toArray(),
        this.metadata.toArray()
      ]);

      return {
        voyageEvents,
        vesselManifests,
        masterFacilities,
        costAllocation,
        vesselClassifications,
        voyageList,
        bulkActions,
        rigScheduleData,
        metadata: metadata[0] // Single metadata record
      };
    } catch (error) {
      console.error('Failed to export data from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Import data (with optional clear first)
   */
  async importAllData(data: LogisticsData, clearFirst = false): Promise<boolean> {
    try {
      await this.transaction('rw', this.tables, async () => {
        if (clearFirst) {
          await Promise.all([
            this.voyageEvents.clear(),
            this.vesselManifests.clear(),
            this.masterFacilities.clear(),
            this.costAllocation.clear(),
            this.vesselClassifications.clear(),
            this.voyageList.clear(),
            this.bulkActions.clear(),
            this.rigScheduleData.clear(),
            this.metadata.clear()
          ]);
        }

        await Promise.all([
          data.voyageEvents.length > 0 && this.voyageEvents.bulkAdd(data.voyageEvents),
          data.vesselManifests.length > 0 && this.vesselManifests.bulkAdd(data.vesselManifests),
          data.masterFacilities.length > 0 && this.masterFacilities.bulkAdd(data.masterFacilities),
          data.costAllocation.length > 0 && this.costAllocation.bulkAdd(data.costAllocation),
          data.vesselClassifications.length > 0 && this.vesselClassifications.bulkAdd(data.vesselClassifications),
          data.voyageList.length > 0 && this.voyageList.bulkAdd(data.voyageList),
          data.bulkActions.length > 0 && this.bulkActions.bulkAdd(data.bulkActions),
          data.rigScheduleData.length > 0 && this.rigScheduleData.bulkAdd(data.rigScheduleData),
          data.metadata && this.metadata.add(data.metadata)
        ].filter(Boolean));
      });

      console.log('✅ Successfully imported data to IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to import data to IndexedDB:', error);
      return false;
    }
  }
}

// Singleton instance
export const logisticsDB = new LogisticsDatabase();