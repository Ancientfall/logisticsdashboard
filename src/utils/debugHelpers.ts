// src/utils/debugHelpers.ts
// Debugging utilities for troubleshooting data issues

import { indexedDBService } from '../services/indexedDBService';

/**
 * Debug function to check what data is currently stored
 */
export const debugStoredData = async () => {
  console.log('🔍 === DEBUG: Checking stored data ===');
  
  try {
    // Check IndexedDB
    console.log('🔍 Checking IndexedDB...');
    const indexedDBData = await indexedDBService.loadAllData();
    console.log('🔍 IndexedDB data:', {
      voyageEventsCount: indexedDBData?.voyageEvents?.length || 0,
      costAllocationCount: indexedDBData?.costAllocation?.length || 0,
      voyageListCount: indexedDBData?.voyageList?.length || 0,
      vesselManifestsCount: indexedDBData?.vesselManifests?.length || 0,
      bulkActionsCount: indexedDBData?.bulkActions?.length || 0,
      lastUpdated: indexedDBData?.metadata?.lastUpdated
    });
    
    // Check localStorage
    console.log('🔍 Checking localStorage...');
    const keys = Object.keys(localStorage).filter(key => key.startsWith('bp-logistics'));
    console.log('🔍 localStorage keys:', keys);
    
    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (Array.isArray(data)) {
          console.log(`🔍 ${key}: ${data.length} records`);
        } else if (typeof data === 'object' && data !== null) {
          console.log(`🔍 ${key}:`, Object.keys(data));
        } else {
          console.log(`🔍 ${key}:`, data);
        }
      } catch (e) {
        console.log(`🔍 ${key}: (could not parse)`);
      }
    });
    
  } catch (error) {
    console.error('🔍 Error checking stored data:', error);
  }
  
  console.log('🔍 === END DEBUG ===');
};

/**
 * Add this function to window for easy browser console access
 */
if (typeof window !== 'undefined') {
  (window as any).debugStoredData = debugStoredData;
  console.log('🔍 debugStoredData() function available in browser console');
}