import { 
  normalizeRigLocation, 
  calculateVesselRequirements,
  calculateDeliveryDemand,
  calculateVesselCapability,
  isPSVOrOSV,
  RIG_LOCATION_MAPPINGS 
} from '../vesselRequirementCalculator';
import { VoyageList, VesselManifest } from '../../types';

describe('vesselRequirementCalculator', () => {
  describe('normalizeRigLocation', () => {
    test('should normalize Thunder Horse variations', () => {
      expect(normalizeRigLocation('TH')).toBe('Thunder Horse PDQ');
      expect(normalizeRigLocation('Thunder Horse PDQ')).toBe('Thunder Horse PDQ');
      expect(normalizeRigLocation('Thunder Horse')).toBe('Thunder Horse PDQ');
    });
    
    test('should normalize Mad Dog variations', () => {
      expect(normalizeRigLocation('MD')).toBe('Mad Dog');
      expect(normalizeRigLocation('Mad Dog Drilling')).toBe('Mad Dog');
    });
    
    test('should return original for unknown locations', () => {
      expect(normalizeRigLocation('Some Random Place')).toBe('Some Random Place');
    });
  });

  describe('isPSVOrOSV', () => {
    test('should identify PSV/OSV vessels', () => {
      expect(isPSVOrOSV('Ocean BlackLion')).toBe(true);
      expect(isPSVOrOSV('Some PSV Vessel')).toBe(true);
    });
    
    test('should exclude specific Fast vessels (FSV)', () => {
      expect(isPSVOrOSV('Fast Goliath')).toBe(false);
      expect(isPSVOrOSV('Fast Leopard')).toBe(false);
      expect(isPSVOrOSV('Fast Tiger')).toBe(false);
      expect(isPSVOrOSV('Fast Server')).toBe(false);
      // Should allow other vessels that happen to have "fast" in name
      expect(isPSVOrOSV('Some Other Vessel')).toBe(true);
    });
    
    test('should exclude other vessel types', () => {
      expect(isPSVOrOSV('crew boat')).toBe(false);
      expect(isPSVOrOSV('utility boat')).toBe(false);
      expect(isPSVOrOSV('inspections and maintenance')).toBe(false);
    });
  });

  describe('calculateDeliveryDemand', () => {
    const mockManifests: VesselManifest[] = [
      {
        id: '1',
        voyageId: 'V1',
        standardizedVoyageId: 'V1',
        manifestNumber: 'M1',
        transporter: 'Ocean BlackLion',
        from: 'Fourchon',
        offshoreLocation: 'Thunder Horse PDQ',
        mappedLocation: 'Thunder Horse PDQ',
        deckLbs: 1000,
        deckTons: 0.5,
        rtTons: 1.0,
        rtLifts: 2,
        lifts: 2,
        wetBulkBbls: 100,
        wetBulkGals: 4200,
        rtWetBulkGals: 4200,
        deckSqft: 500,
        manifestDate: new Date('2025-01-15'),
        manifestDateOnly: new Date('2025-01-15'),
        month: 'January',
        monthNumber: 1,
        quarter: 'Q1',
        year: 2025,
        costCode: 'TH001',
        cargoType: 'Deck Cargo'
      }
    ];

    test('should calculate delivery demand correctly', () => {
      const result = calculateDeliveryDemand(mockManifests);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].location).toBe('Thunder Horse PDQ');
      expect(result[0].totalDeliveries).toBe(1);
    });
  });

  describe('calculateVesselCapability', () => {
    const mockVoyages: VoyageList[] = [
      {
        id: '1',
        vessel: 'Ocean BlackLion',
        voyageNumber: 'V001',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        locationList: ['Fourchon', 'Thunder Horse PDQ', 'Fourchon'],
        durationDays: 1,
        durationHours: 24,
        mission: 'Supply Run',
        remarks: 'Test voyage'
      }
    ];

    test('should calculate vessel capability correctly', () => {
      const result = calculateVesselCapability(mockVoyages);
      expect(result.vesselCapabilities.length).toBeGreaterThan(0);
      expect(result.vesselCapabilities[0].vesselName).toBe('Ocean BlackLion');
      expect(result.vesselCapabilities[0].totalUniquePortCalls).toBe(1); // Only counts unique offshore locations
      expect(result.fleetCapability).toBeGreaterThan(0); // Should return fleet efficiency capability
    });
  });

  describe('calculateVesselRequirements - Integration', () => {
    const mockVoyages: VoyageList[] = [
      {
        id: '1',
        vessel: 'Ocean BlackLion',
        voyageNumber: 'V001',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-16'),
        locationList: ['Fourchon', 'Thunder Horse PDQ', 'Fourchon'],
        durationDays: 1,
        durationHours: 24,
        mission: 'Supply Run',
        remarks: 'Test voyage'
      }
    ];

    const mockManifests: VesselManifest[] = [
      {
        id: '1',
        voyageId: 'V1',
        standardizedVoyageId: 'V1', 
        manifestNumber: 'M1',
        transporter: 'Ocean BlackLion',
        from: 'Fourchon',
        offshoreLocation: 'Thunder Horse PDQ',
        mappedLocation: 'Thunder Horse PDQ',
        deckLbs: 1000,
        deckTons: 0.5,
        rtTons: 1.0,
        rtLifts: 2,
        lifts: 2,
        wetBulkBbls: 100,
        wetBulkGals: 4200,
        rtWetBulkGals: 4200,
        deckSqft: 500,
        manifestDate: new Date('2025-01-15'),
        manifestDateOnly: new Date('2025-01-15'),
        month: 'January',
        monthNumber: 1,
        quarter: 'Q1',
        year: 2025,
        costCode: 'TH001',
        cargoType: 'Deck Cargo'
      }
    ];

    test('should calculate vessel requirements using three-step methodology', () => {
      const result = calculateVesselRequirements(mockVoyages, mockManifests);
      
      expect(result.analysisDateRange.monthsCovered).toBe(6);
      expect(result.locationDemands.length).toBeGreaterThan(0);
      expect(result.vesselCapabilities.length).toBeGreaterThan(0);
      expect(result.requiredVessels).toBeGreaterThanOrEqual(0);
      expect(result.recommendation).toBeDefined();
    });

    test('should handle empty data gracefully', () => {
      const result = calculateVesselRequirements([], []);
      
      expect(result.analysisDateRange.monthsCovered).toBe(6);
      expect(result.locationDemands.length).toBe(0);
      expect(result.vesselCapabilities.length).toBe(0);
      expect(result.requiredVessels).toBe(0);
    });
  });
});