// src/utils/storage/debugUtils.ts
import { SimpleStorageManager } from './storageManagerSimple';

export class DebugUtils {
  private static instanceId = Math.random().toString(36).substr(2, 9);

  /**
   * Comprehensive localStorage inspection
   */
  static inspectStorage(): void {
    console.log(`🔍 DebugUtils[${this.instanceId}] - Storage Inspection`);
    
    const allKeys = Object.keys(localStorage);
    console.log(`🗂️ All localStorage keys:`, allKeys);
    
    const bpKeys = allKeys.filter(key => key.startsWith('bp-logistics'));
    console.log(`📋 BP logistics keys:`, bpKeys);
    
    bpKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        const sizeKB = Math.round(value.length / 1024);
        const sizeMB = (value.length / 1024 / 1024).toFixed(2);
        console.log(`📊 ${key}:`, {
          sizeKB: `${sizeKB}KB`,
          sizeMB: `${sizeMB}MB`,
          stringLength: value.length,
          blobSize: new Blob([value]).size,
          firstChars: value.substring(0, 100),
          lastChars: value.substring(value.length - 100)
        });
        
        if (key === 'bp-logistics-data') {
          try {
            const parsed = JSON.parse(value);
            console.log(`🔬 Parsed data analysis:`, {
              topLevelKeys: Object.keys(parsed),
              voyageEvents: {
                exists: !!parsed.voyageEvents,
                isArray: Array.isArray(parsed.voyageEvents),
                length: parsed.voyageEvents?.length || 0,
                firstElement: parsed.voyageEvents?.[0],
                sample: parsed.voyageEvents?.slice(0, 3)
              },
              vesselManifests: {
                exists: !!parsed.vesselManifests,
                isArray: Array.isArray(parsed.vesselManifests),
                length: parsed.vesselManifests?.length || 0
              },
              metadata: {
                exists: !!parsed.metadata,
                content: parsed.metadata
              }
            });
          } catch (e) {
            console.error(`❌ Failed to parse stored data:`, e);
          }
        }
      }
    });
  }

  /**
   * Check current data state
   */
  static checkDataState(data: any): void {
    console.log(`📊 Current data state:`, {
      voyageEventsCount: data.voyageEvents?.length || 0,
      vesselManifestsCount: data.vesselManifests?.length || 0,
      costAllocationCount: data.costAllocation?.length || 0,
      voyageListCount: data.voyageList?.length || 0,
      isDataReady: data.isDataReady,
      isLoading: data.isLoading,
      lastUpdated: data.lastUpdated
    });
  }

  /**
   * Test storage operations
   */
  static async testStorageOperations(): Promise<void> {
    console.log('🧪 Testing storage operations...');
    const storageManager = SimpleStorageManager.getInstance();
    
    // Test load
    console.log('📥 Testing load...');
    const loadedData = storageManager.loadData();
    console.log('Loaded data:', {
      hasData: loadedData?.hasData,
      voyageEventsCount: loadedData?.voyageEvents?.length || 0
    });
    
    // Test storage info
    console.log('📊 Storage info:', storageManager.getStorageInfo());
    
    // Test save (with minimal test data)
    console.log('💾 Testing save...');
    const testData = {
      voyageEvents: [],
      vesselManifests: [],
      masterFacilities: [],
      costAllocation: [],
      vesselClassifications: [],
      voyageList: [],
      bulkActions: [],
      rigScheduleData: []
    };
    
    const saveResult = storageManager.saveData(testData);
    console.log('Save result:', saveResult);
  }

  /**
   * Clear all BP logistics data from localStorage
   */
  static clearAllBPData(): void {
    console.log('🧹 Clearing all BP logistics data...');
    const keys = Object.keys(localStorage).filter(key => key.startsWith('bp-logistics'));
    keys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`❌ Removed: ${key}`);
    });
    console.log('✅ All BP logistics data cleared');
  }

  /**
   * Export current localStorage data to console as JSON
   */
  static exportStorageData(): void {
    const data: Record<string, any> = {};
    const keys = Object.keys(localStorage).filter(key => key.startsWith('bp-logistics'));
    
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });
    
    console.log('📦 Exported storage data:');
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Attach debug utilities to window for console access
   */
  static attachToWindow(): void {
    if (typeof window !== 'undefined') {
      (window as any).bpDebug = {
        inspectStorage: this.inspectStorage.bind(this),
        checkDataState: this.checkDataState.bind(this),
        testStorage: this.testStorageOperations.bind(this),
        clearAllData: this.clearAllBPData.bind(this),
        exportData: this.exportStorageData.bind(this),
        help: () => {
          console.log(`
🛠️ BP Logistics Debug Utilities:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• bpDebug.inspectStorage() - Inspect all localStorage data
• bpDebug.checkDataState(data) - Check current data state
• bpDebug.testStorage() - Test storage operations
• bpDebug.clearAllData() - Clear all BP logistics data
• bpDebug.exportData() - Export storage data as JSON
• bpDebug.help() - Show this help message
          `);
        }
      };
      
      console.log('🛠️ Debug utilities attached to window.bpDebug - Type bpDebug.help() for usage');
    }
  }
}