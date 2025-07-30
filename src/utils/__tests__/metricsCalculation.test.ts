/**
 * Metrics Calculation Tests
 * Tests KPI and metrics calculation functions
 */

import {
  calculateEnhancedKPIMetrics,
  calculateEnhancedManifestMetrics,
  calculateEnhancedVoyageEventMetrics,
  calculateEnhancedBulkFluidMetrics
} from '../metricsCalculation';

// Mock data for testing
const mockVoyageEvents = [
  {
    id: '1',
    vesselName: 'Test Vessel 1',
    eventDate: new Date('2024-01-01T10:00:00Z'),
    eventType: 'Load',
    location: 'Thunder Horse',
    lcNumber: '10052',
    duration: 2.5,
    portType: 'rig',
    activityType: 'Cargo Operations'
  },
  {
    id: '2',
    vesselName: 'Test Vessel 1',
    eventDate: new Date('2024-01-01T14:00:00Z'),
    eventType: 'Transit',
    location: 'Base',
    duration: 4.0,
    portType: 'base',
    activityType: 'Transit'
  }
];

const mockVesselManifests = [
  {
    id: '1',
    manifestNumber: 'M001',
    vesselName: 'Test Vessel 1',
    manifestDate: new Date('2024-01-01'),
    offshoreLocation: 'Thunder Horse',
    finalDepartment: 'Drilling',
    totalManifestTons: 150.5,
    deckTons: 100.5,
    rtTons: 50.0,
    manifestType: 'Outbound',
    cargoItems: [
      {
        itemDescription: 'Drilling Fluid',
        tons: 150.5,
        isDrillingFluid: true
      }
    ]
  },
  {
    id: '2',
    manifestNumber: 'M002',
    vesselName: 'Test Vessel 2',
    manifestDate: new Date('2024-01-02'),
    offshoreLocation: 'Mad Dog',
    finalDepartment: 'Production',
    totalManifestTons: 200.0,
    deckTons: 200.0,
    rtTons: 0,
    manifestType: 'Outbound'
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
  },
  {
    id: '2',
    lcNumber: '10067',
    location: 'Mad Dog',
    department: 'Production',
    percentage: 100,
    projectType: 'Production Operations'
  }
];

const mockBulkActions = [
  {
    id: '1',
    vesselName: 'Test Vessel 1',
    actionDate: new Date('2024-01-01'),
    bulkType: 'Base Oil',
    volumeBbls: 1000,
    isDrillingFluid: true,
    lcNumber: '10052'
  }
];

describe('Metrics Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEnhancedKPIMetrics', () => {
    test('should calculate basic KPI metrics', () => {
      const result = calculateEnhancedKPIMetrics(
        mockVoyageEvents as any,
        mockVesselManifests as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result).toHaveProperty('vesselUtilization');
      expect(result).toHaveProperty('cargoTons');
      expect(result).toHaveProperty('liftsPerHour');
      expect(result).toHaveProperty('waitingTimeOffshore');
      expect(result).toHaveProperty('osvProductiveHours');

      expect(typeof result.vesselUtilization).toBe('number');
      expect(typeof result.cargoTons).toBe('number');
      expect(typeof result.liftsPerHour).toBe('number');
      expect(result.cargoTons).toBeGreaterThan(0);
    });

    test('should handle empty data gracefully', () => {
      const result = calculateEnhancedKPIMetrics([], [], [], 'All');

      expect(result.vesselUtilization).toBe(0);
      expect(result.cargoTons).toBe(0);
      expect(result.liftsPerHour).toBe(0);
      expect(result.waitingTimeOffshore).toBe(0);
      expect(result.osvProductiveHours).toBe(0);
    });

    test('should filter by department correctly', () => {
      const drillingResult = calculateEnhancedKPIMetrics(
        mockVoyageEvents as any,
        mockVesselManifests as any,
        mockCostAllocation as any,
        'Drilling'
      );

      const productionResult = calculateEnhancedKPIMetrics(
        mockVoyageEvents as any,
        mockVesselManifests as any,
        mockCostAllocation as any,
        'Production'
      );

      // Drilling should have less cargo tons than total (only drilling manifests)
      expect(drillingResult.cargoTons).toBeLessThan(350.5); // Total of both manifests
      expect(productionResult.cargoTons).toBeLessThan(350.5);
    });
  });

  describe('calculateEnhancedManifestMetrics', () => {
    test('should calculate manifest-specific metrics', () => {
      const result = calculateEnhancedManifestMetrics(
        mockVesselManifests as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result).toHaveProperty('totalTons');
      expect(result).toHaveProperty('totalManifests');
      expect(result).toHaveProperty('averageManifestSize');
      expect(result).toHaveProperty('drillingTons');
      expect(result).toHaveProperty('productionTons');

      expect(result.totalTons).toBe(350.5); // Sum of both manifests
      expect(result.totalManifests).toBe(2);
      expect(result.averageManifestSize).toBe(175.25); // 350.5 / 2
    });

    test('should separate drilling and production tons', () => {
      const result = calculateEnhancedManifestMetrics(
        mockVesselManifests as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result.drillingTons).toBe(150.5);
      expect(result.productionTons).toBe(200.0);
      expect(result.drillingTons + result.productionTons).toBe(result.totalTons);
    });
  });

  describe('calculateEnhancedVoyageEventMetrics', () => {
    test('should calculate voyage event metrics', () => {
      const result = calculateEnhancedVoyageEventMetrics(
        mockVoyageEvents as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('totalDuration');
      expect(result).toHaveProperty('averageEventDuration');
      expect(result).toHaveProperty('productiveHours');
      expect(result).toHaveProperty('rigHours');

      expect(result.totalEvents).toBe(2);
      expect(result.totalDuration).toBe(6.5); // 2.5 + 4.0
      expect(result.averageEventDuration).toBe(3.25); // 6.5 / 2
    });

    test('should identify productive vs non-productive hours', () => {
      const result = calculateEnhancedVoyageEventMetrics(
        mockVoyageEvents as any,
        mockCostAllocation as any,
        'All'
      );

      // Cargo operations should be productive, transit should not
      expect(result.productiveHours).toBe(2.5);
      expect(result.rigHours).toBe(2.5); // Only rig events
    });
  });

  describe('calculateEnhancedBulkFluidMetrics', () => {
    test('should calculate bulk fluid metrics', () => {
      const result = calculateEnhancedBulkFluidMetrics(
        mockBulkActions as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result).toHaveProperty('totalVolumeBbls');
      expect(result).toHaveProperty('totalActions');
      expect(result).toHaveProperty('averageVolumePerAction');
      expect(result).toHaveProperty('drillingFluidVolume');
      expect(result).toHaveProperty('productionFluidVolume');

      expect(result.totalVolumeBbls).toBe(1000);
      expect(result.totalActions).toBe(1);
      expect(result.averageVolumePerAction).toBe(1000);
      expect(result.drillingFluidVolume).toBe(1000);
    });

    test('should handle department filtering for bulk fluids', () => {
      const drillingResult = calculateEnhancedBulkFluidMetrics(
        mockBulkActions as any,
        mockCostAllocation as any,
        'Drilling'
      );

      const productionResult = calculateEnhancedBulkFluidMetrics(
        mockBulkActions as any,
        mockCostAllocation as any,
        'Production'
      );

      expect(drillingResult.totalVolumeBbls).toBe(1000);
      expect(productionResult.totalVolumeBbls).toBe(0); // No production bulk actions in mock
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined dates gracefully', () => {
      const eventsWithInvalidDates = [
        {
          ...mockVoyageEvents[0],
          eventDate: null
        }
      ];

      const result = calculateEnhancedVoyageEventMetrics(
        eventsWithInvalidDates as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result.totalEvents).toBe(1);
      expect(result.totalDuration).toBe(2.5);
    });

    test('should handle missing LC numbers', () => {
      const eventsWithoutLC = [
        {
          ...mockVoyageEvents[0],
          lcNumber: null
        }
      ];

      const result = calculateEnhancedVoyageEventMetrics(
        eventsWithoutLC as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result.totalEvents).toBe(1);
    });

    test('should handle zero durations', () => {
      const eventsWithZeroDuration = [
        {
          ...mockVoyageEvents[0],
          duration: 0
        }
      ];

      const result = calculateEnhancedVoyageEventMetrics(
        eventsWithZeroDuration as any,
        mockCostAllocation as any,
        'All'
      );

      expect(result.totalDuration).toBe(0);
      expect(result.averageEventDuration).toBe(0);
    });
  });
});