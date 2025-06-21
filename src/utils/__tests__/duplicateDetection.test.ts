/**
 * Tests for duplicate detection utility
 */

import { detectDuplicates } from '../duplicateDetection';
import { VoyageEvent } from '../../types';

// Helper function to create test voyage events
const createTestEvent = (overrides: Partial<VoyageEvent> = {}): VoyageEvent => ({
  id: 'test-id',
  mission: 'Test Mission',
  vessel: 'Test Vessel',
  voyageNumber: '123',
  parentEvent: 'Test Parent Event',
  location: 'Test Location',
  originalLocation: 'Test Location',
  mappedLocation: 'Test Location',
  from: new Date('2024-01-01'),
  to: new Date('2024-01-01'),
  hours: 8,
  finalHours: 8,
  eventDate: new Date('2024-01-01'),
  eventYear: 2024,
  quarter: 'Q1',
  monthNumber: 1,
  monthName: 'January',
  weekOfYear: 1,
  dayOfWeek: 'Monday',
  dayOfMonth: 1,
  portType: 'rig' as const,
  locationType: 'Offshore' as const,
  activityCategory: 'Productive' as const,
  mappingStatus: 'LC Mapped' as const,
  dataIntegrity: 'Valid' as const,
  year: 2024,
  ...overrides
});

describe('duplicateDetection', () => {
  describe('detectDuplicates', () => {
    it('should detect no duplicates in unique records', () => {
      const events = [
        createTestEvent({ voyageNumber: '123', vessel: 'Vessel A' }),
        createTestEvent({ voyageNumber: '124', vessel: 'Vessel B' }),
        createTestEvent({ voyageNumber: '125', vessel: 'Vessel C' })
      ];

      const result = detectDuplicates(events);

      expect(result.totalDuplicates).toBe(0);
      expect(result.duplicateGroups).toHaveLength(0);
      expect(result.recordsWithoutVoyageNumbers).toBe(0);
    });

    it('should detect true duplicates', () => {
      const baseEvent = createTestEvent({ 
        voyageNumber: '123', 
        vessel: 'Vessel A',
        event: 'Loading',
        location: 'Test Location'
      });
      
      const events = [
        baseEvent,
        { ...baseEvent, id: 'test-id-2' }, // Exact duplicate
        createTestEvent({ voyageNumber: '124', vessel: 'Vessel B' }) // Different event
      ];

      const result = detectDuplicates(events);

      expect(result.totalDuplicates).toBe(1); // One duplicate found
      expect(result.duplicateGroups).toHaveLength(1);
      expect(result.duplicateGroups[0].count).toBe(2);
      expect(result.duplicateGroups[0].severityLevel).toBe('Medium');
    });

    it('should handle records without voyage numbers', () => {
      const events = [
        createTestEvent({ voyageNumber: '' }), // No voyage number
        createTestEvent({ voyageNumber: 'undefined' }), // Undefined voyage number
        createTestEvent({ voyageNumber: '123' }) // Valid voyage number
      ];

      const result = detectDuplicates(events);

      expect(result.recordsWithoutVoyageNumbers).toBe(2);
      expect(result.voyageNumberAnalysis.recordsWithVoyageNumbers).toBe(1);
      expect(result.voyageNumberAnalysis.percentageWithoutVoyage).toBeCloseTo(66.67, 1);
    });

    it('should classify event types for records without voyage numbers', () => {
      const maintenanceEvent = createTestEvent({ 
        voyageNumber: '',
        mission: 'maintenance',
        parentEvent: 'Vessel Maintenance'
      });
      
      const portEvent = createTestEvent({
        voyageNumber: '',
        location: 'Port Fourchon',
        parentEvent: 'Port Operations'
      });

      const events = [maintenanceEvent, portEvent];
      const result = detectDuplicates(events);

      expect(result.voyageNumberAnalysis.sampleRecordsWithoutVoyage).toHaveLength(2);
      expect(result.voyageNumberAnalysis.sampleRecordsWithoutVoyage[0].eventType).toBe('maintenance');
      expect(result.voyageNumberAnalysis.sampleRecordsWithoutVoyage[1].eventType).toBe('port_activity');
    });

    it('should determine severity levels correctly', () => {
      const highSeverityBase = createTestEvent({
        voyageNumber: '123',
        vessel: 'Vessel A',
        event: 'Loading',
        hours: 8,
        eventDate: new Date('2024-01-01')
      });

      const events = [
        highSeverityBase,
        { ...highSeverityBase, id: 'test-id-2' }, // Exact duplicate
        { ...highSeverityBase, id: 'test-id-3' }, // Another exact duplicate
        { ...highSeverityBase, id: 'test-id-4' }  // Yet another exact duplicate
      ];

      const result = detectDuplicates(events);

      expect(result.duplicateGroups).toHaveLength(1);
      expect(result.duplicateGroups[0].severityLevel).toBe('High'); // Multiple identical records
      expect(result.duplicateGroups[0].count).toBe(4);
    });

    it('should generate meaningful explanations', () => {
      const events = [
        createTestEvent({ voyageNumber: '123', hours: 8 }),
        createTestEvent({ voyageNumber: '123', hours: 8 }) // Same hours, same voyage
      ];

      const result = detectDuplicates(events);

      expect(result.duplicateGroups[0].explanation).toContain('Identical records detected');
    });
  });
});