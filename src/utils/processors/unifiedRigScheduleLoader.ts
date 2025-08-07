// src/utils/processors/unifiedRigScheduleLoader.ts
import { RigScheduleEntry } from '../../types';
import { RigScheduleCSVProcessor, ProcessedRigScheduleData } from './rigScheduleCSVProcessor';

export interface RigScheduleFileInfo {
  filename: string;
  type: 'excel' | 'csv';
  scenario?: 'early' | 'mean';
  size: number;
  lastModified: Date;
}

export interface UnifiedRigScheduleData {
  rigScheduleData: RigScheduleEntry[];
  metadata: {
    totalRecords: number;
    scenarios: string[];
    files: RigScheduleFileInfo[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    rigs: string[];
    processingTime: number;
    version: string;
  };
}

/**
 * Unified Rig Schedule Loader
 * Handles both Excel and CSV rig schedule files from the API
 */
export class UnifiedRigScheduleLoader {
  private static readonly API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://bpsolutionsdashboard.com/api' 
    : 'http://localhost:5001/api';

  /**
   * Load all available rig schedule files from the API
   */
  static async loadAllRigScheduleFiles(): Promise<UnifiedRigScheduleData> {
    const startTime = performance.now();
    
    try {
      console.log('🔍 Loading rig schedule files from API...');
      
      // Get list of available files
      const response = await fetch(`${this.API_BASE_URL}/excel-files`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const apiData = await response.json();
      if (!apiData.success || !apiData.files) {
        throw new Error('Invalid API response format');
      }

      // Filter for rig schedule files
      const rigScheduleFiles = apiData.files.filter((file: any) => 
        file.name.toLowerCase().includes('rig schedule') ||
        file.name.toLowerCase().includes('schedule data')
      );

      console.log(`📋 Found ${rigScheduleFiles.length} rig schedule files:`, 
        rigScheduleFiles.map((f: any) => f.name));

      if (rigScheduleFiles.length === 0) {
        console.warn('⚠️ No rig schedule files found');
        return this.createEmptyResult(startTime);
      }

      // Process each file
      const allRigScheduleData: RigScheduleEntry[] = [];
      const processedFiles: RigScheduleFileInfo[] = [];
      const scenarios = new Set<string>();
      const rigs = new Set<string>();
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      for (const file of rigScheduleFiles) {
        try {
          console.log(`📄 Processing file: ${file.name}`);
          
          // Determine file type and scenario
          const fileInfo = this.analyzeFileName(file);
          const fileData = await this.loadFile(file.name);
          
          if (fileInfo.type === 'csv') {
            const processed = RigScheduleCSVProcessor.processRigScheduleCSV(
              fileData, 
              fileInfo.scenario || 'mean'
            );
            
            allRigScheduleData.push(...processed.rigScheduleData);
            processed.metadata.scenarios.forEach(s => scenarios.add(s));
            processed.metadata.rigs.forEach(r => rigs.add(r));
            
            // Update date range
            if (processed.metadata.dateRange.start) {
              if (!minDate || processed.metadata.dateRange.start < minDate) {
                minDate = processed.metadata.dateRange.start;
              }
            }
            if (processed.metadata.dateRange.end) {
              if (!maxDate || processed.metadata.dateRange.end > maxDate) {
                maxDate = processed.metadata.dateRange.end;
              }
            }
          } else {
            // TODO: Handle Excel files when needed
            console.log(`📊 Excel file processing not implemented yet: ${file.name}`);
            continue;
          }
          
          processedFiles.push({
            filename: file.name,
            type: fileInfo.type,
            scenario: fileInfo.scenario,
            size: file.size || 0,
            lastModified: new Date(file.lastModified || Date.now())
          });
          
        } catch (error) {
          console.error(`❌ Error processing file ${file.name}:`, error);
          continue;
        }
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const result: UnifiedRigScheduleData = {
        rigScheduleData: allRigScheduleData,
        metadata: {
          totalRecords: allRigScheduleData.length,
          scenarios: Array.from(scenarios),
          files: processedFiles,
          dateRange: { start: minDate, end: maxDate },
          rigs: Array.from(rigs),
          processingTime,
          version: '1.0.0'
        }
      };

      console.log(`✅ Unified rig schedule loading completed in ${processingTime.toFixed(0)}ms`);
      console.log(`📊 Total records: ${result.metadata.totalRecords}`);
      console.log(`🎯 Scenarios: ${result.metadata.scenarios.join(', ')}`);
      console.log(`🚢 Rigs: ${result.metadata.rigs.join(', ')}`);
      console.log(`📅 Date range: ${minDate?.toLocaleDateString()} to ${maxDate?.toLocaleDateString()}`);

      return result;

    } catch (error) {
      console.error('❌ Error loading rig schedule files:', error);
      return this.createEmptyResult(startTime);
    }
  }

  /**
   * Load a specific file from the API
   */
  private static async loadFile(filename: string): Promise<string> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await fetch(`${this.API_BASE_URL}/excel-files/${encodedFilename}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load file ${filename}: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  }

  /**
   * Analyze filename to determine type and scenario
   */
  private static analyzeFileName(file: any): { type: 'excel' | 'csv', scenario?: 'early' | 'mean' } {
    const filename = file.name.toLowerCase();
    
    // Determine file type
    const type: 'excel' | 'csv' = filename.endsWith('.csv') ? 'csv' : 'excel';
    
    // Determine scenario
    let scenario: 'early' | 'mean' | undefined;
    if (filename.includes('early') || filename.includes('p10')) {
      scenario = 'early';
    } else if (filename.includes('mean') || filename.includes('p50')) {
      scenario = 'mean';
    }
    
    return { type, scenario };
  }

  /**
   * Create empty result structure
   */
  private static createEmptyResult(startTime: number): UnifiedRigScheduleData {
    return {
      rigScheduleData: [],
      metadata: {
        totalRecords: 0,
        scenarios: [],
        files: [],
        dateRange: { start: null, end: null },
        rigs: [],
        processingTime: performance.now() - startTime,
        version: '1.0.0'
      }
    };
  }

  /**
   * Load specific scenario data
   */
  static async loadScenarioData(scenario: 'early' | 'mean'): Promise<RigScheduleEntry[]> {
    const allData = await this.loadAllRigScheduleFiles();
    return allData.rigScheduleData.filter(entry => entry.scenario === scenario);
  }

  /**
   * Get available scenarios
   */
  static async getAvailableScenarios(): Promise<string[]> {
    const allData = await this.loadAllRigScheduleFiles();
    return allData.metadata.scenarios;
  }

  /**
   * Get available rigs
   */
  static async getAvailableRigs(): Promise<string[]> {
    const allData = await this.loadAllRigScheduleFiles();
    return allData.metadata.rigs;
  }

  /**
   * Get schedule data for a specific rig
   */
  static async getRigScheduleData(rigName: string): Promise<RigScheduleEntry[]> {
    const allData = await this.loadAllRigScheduleFiles();
    return allData.rigScheduleData.filter(entry => 
      entry.rigName.toLowerCase().includes(rigName.toLowerCase())
    );
  }

  /**
   * Get date range for all schedule data
   */
  static async getScheduleDateRange(): Promise<{ start: Date | null; end: Date | null }> {
    const allData = await this.loadAllRigScheduleFiles();
    return allData.metadata.dateRange;
  }
}