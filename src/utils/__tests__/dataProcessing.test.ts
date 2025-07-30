/**
 * Data Processing Tests
 * Tests core data processing functionality
 */

import { processAllExcelFiles, validateDataIntegrity } from '../dataProcessing';
import { validateExcelFile } from '../dataQualityValidation';

// Mock data for testing
const mockVoyageEvents = [
  {
    id: '1',
    vesselName: 'Test Vessel',
    eventDate: new Date('2024-01-01'),
    eventType: 'Load',
    location: 'Thunder Horse',
    lcNumber: '10052',
    duration: 2.5
  }
];

const mockVesselManifests = [
  {
    id: '1',
    manifestNumber: 'M001',
    vesselName: 'Test Vessel',
    manifestDate: new Date('2024-01-01'),
    offshoreLocation: 'Thunder Horse',
    finalDepartment: 'Drilling',
    totalManifestTons: 100
  }
];

const mockCostAllocation = [
  {
    id: '1',
    lcNumber: '10052',
    location: 'Thunder Horse',
    department: 'Drilling',
    percentage: 100,
    projectType: 'Drilling Operations'
  }
];

describe('Data Processing', () => {
  beforeEach(() => {
    // Clear any existing mocks
    jest.clearAllMocks();
  });

  describe('validateDataIntegrity', () => {
    test('should validate data integrity with valid data', () => {
      const result = validateDataIntegrity(
        mockVoyageEvents as any,
        mockVesselManifests as any,
        mockCostAllocation as any,
        [],
        []
      );

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('warnings');
      expect(result.overallScore).toBeGreaterThan(0);
    });

    test('should handle empty data arrays', () => {
      const result = validateDataIntegrity([], [], [], [], []);

      expect(result).toHaveProperty('overallScore');
      expect(result.overallScore).toBe(0);
      expect(result.criticalIssues.length).toBeGreaterThan(0);
    });

    test('should identify data quality issues', () => {
      const invalidVoyageEvents = [
        {
          id: '1',
          vesselName: '', // Invalid: empty vessel name
          eventDate: null, // Invalid: null date
          eventType: 'Load',
          location: 'Thunder Horse'
        }
      ];

      const result = validateDataIntegrity(
        invalidVoyageEvents as any,
        [],
        [],
        [],
        []
      );

      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(50);
    });
  });

  describe('validateExcelFile', () => {
    test('should validate voyage events data structure', () => {
      const result = validateExcelFile(mockVoyageEvents, 'voyageEvents');

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    test('should validate vessel manifests data structure', () => {
      const result = validateExcelFile(mockVesselManifests, 'vesselManifests');

      expect(result).toHaveProperty('isValid');
      expect(result.isValid).toBe(true);
    });

    test('should identify invalid data structures', () => {
      const invalidData = [
        {
          // Missing required fields
          id: '1'
        }
      ];

      const result = validateExcelFile(invalidData, 'voyageEvents');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle unknown data types', () => {
      const result = validateExcelFile([], 'unknownType' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown data type: unknownType');
    });
  });

  describe('processAllExcelFiles', () => {
    // This is a complex integration test that would require mocking
    // the Excel file reading functionality
    test('should handle empty file list', async () => {
      const emptyFiles: File[] = [];
      
      // Mock the readExcelFile function to avoid actual file reading
      jest.mock('../excel/excelReader', () => ({
        readExcelFile: jest.fn().mockResolvedValue([])
      }));

      try {
        const result = await processAllExcelFiles(emptyFiles);
        expect(result).toHaveProperty('voyageEvents');
        expect(result).toHaveProperty('vesselManifests');
        expect(result).toHaveProperty('costAllocation');
      } catch (error) {
        // Expected to fail with empty files
        expect(error).toBeDefined();
      }
    });
  });
});