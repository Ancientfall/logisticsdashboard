import { 
  normalizeRigLocation, 
  analyzeRigVoyagePattern,
  calculateVesselRequirements,
  RIG_LOCATION_MAPPINGS 
} from '../vesselRequirementCalculator';
import { VoyageList, VesselManifest, VoyageEvent } from '../../types';

describe('vesselRequirementCalculator', () => {
  describe('normalizeRigLocation', () => {
    test('should normalize Thunder Horse variations', () => {
      expect(normalizeRigLocation('TH')).toEqual({
        standardName: 'Thunder Horse',
        rigCode: 'TH'
      });
      
      expect(normalizeRigLocation('Thunder Horse PDQ')).toEqual({
        standardName: 'Thunder Horse',
        rigCode: 'TH'
      });
      
      expect(normalizeRigLocation('Thunderhorse')).toEqual({
        standardName: 'Thunder Horse',
        rigCode: 'TH'
      });
    });

    test('should normalize Mad Dog variations', () => {
      expect(normalizeRigLocation('MD')).toEqual({
        standardName: 'Mad Dog',
        rigCode: 'MD'
      });
      
      expect(normalizeRigLocation('Mad Dog Drilling')).toEqual({
        standardName: 'Mad Dog',
        rigCode: 'MD'
      });
    });

    test('should handle unknown locations', () => {
      const result = normalizeRigLocation('Unknown Rig Location');
      expect(result.standardName).toBe('Unknown Rig Location');
      expect(result.rigCode).toBe('UNK');
    });

    test('should generate codes for unmapped multi-word locations', () => {
      const result = normalizeRigLocation('Ocean Black Lion');
      expect(result.rigCode).toBe('OBL');
    });
  });

  describe('analyzeRigVoyagePattern', () => {
    const mockVoyages: VoyageList[] = [
      {
        id: '1',
        uniqueVoyageId: '2024_jan_vessel1_001',
        standardizedVoyageId: '2024-01-Vessel1-001',
        vessel: 'Vessel1',
        standardizedVesselName: 'Vessel1',
        voyageNumber: 1,
        year: 2024,
        month: 'jan',
        monthNumber: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        voyageDate: new Date('2024-01-01'),
        durationHours: 24,
        type: 'Supply',
        mission: 'Supply',
        missionType: 'Supply',
        routeType: 'Standard',
        locations: 'Fourchon -> Thunder Horse',
        locationList: ['Fourchon', 'Thunder Horse'],
        stopCount: 2,
        includesProduction: false,
        includesDrilling: true,
        voyagePurpose: 'Drilling',
        originPort: 'Fourchon',
        mainDestination: 'Thunder Horse',
        edit: '',
        isActive: true
      },
      {
        id: '2',
        uniqueVoyageId: '2024_jan_vessel2_002',
        standardizedVoyageId: '2024-01-Vessel2-002',
        vessel: 'Vessel2',
        standardizedVesselName: 'Vessel2',
        voyageNumber: 2,
        year: 2024,
        month: 'jan',
        monthNumber: 1,
        startDate: new Date('2024-01-03'),
        endDate: new Date('2024-01-04'),
        voyageDate: new Date('2024-01-03'),
        durationHours: 18,
        type: 'Supply',
        mission: 'Supply',
        missionType: 'Supply',
        routeType: 'Standard',
        locations: 'Fourchon -> Thunder Horse',
        locationList: ['Fourchon', 'Thunder Horse'],
        stopCount: 2,
        includesProduction: false,
        includesDrilling: true,
        voyagePurpose: 'Drilling',
        originPort: 'Fourchon',
        mainDestination: 'Thunder Horse',
        edit: '',
        isActive: true
      }
    ];

    const mockManifests: VesselManifest[] = [];
    const mockEvents: VoyageEvent[] = [];

    test('should analyze rig voyage patterns correctly', () => {
      const result = analyzeRigVoyagePattern('Thunder Horse', mockVoyages, mockManifests, mockEvents);
      
      expect(result.rigLocation).toBe('Thunder Horse');
      expect(result.rigCode).toBe('TH');
      expect(result.totalVoyages).toBe(2);
      expect(result.vesselCount).toBe(2);
      expect(result.averageVoyageDuration).toBe(21); // (24 + 18) / 2
      expect(result.recommendedVessels).toBeGreaterThan(0);
    });

    test('should handle empty voyage data', () => {
      const result = analyzeRigVoyagePattern('Thunder Horse', [], [], []);
      
      expect(result.totalVoyages).toBe(0);
      expect(result.vesselCount).toBe(0);
      expect(result.recommendedVessels).toBe(1); // At least 1 vessel
    });
  });

  describe('calculateVesselRequirements', () => {
    const mockVoyages: VoyageList[] = [
      {
        id: '1',
        uniqueVoyageId: '2024_jan_vessel1_001',
        standardizedVoyageId: '2024-01-Vessel1-001',
        vessel: 'Vessel1',
        standardizedVesselName: 'Vessel1',
        voyageNumber: 1,
        year: 2024,
        month: 'jan',
        monthNumber: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        voyageDate: new Date('2024-01-01'),
        durationHours: 24,
        type: 'Supply',
        mission: 'Supply',
        missionType: 'Supply',
        routeType: 'Standard',
        locations: 'Fourchon -> Thunder Horse',
        locationList: ['Fourchon', 'Thunder Horse'],
        stopCount: 2,
        includesProduction: false,
        includesDrilling: true,
        voyagePurpose: 'Drilling',
        originPort: 'Fourchon',
        mainDestination: 'Thunder Horse',
        edit: '',
        isActive: true
      }
    ];

    const mockManifests: VesselManifest[] = [
      {
        id: 'manifest-1',
        voyageId: '1',
        standardizedVoyageId: '2024-01-Vessel1-001',
        manifestNumber: 'M001',
        transporter: 'Vessel1',
        from: 'Fourchon',
        offshoreLocation: 'Thunder Horse',
        mappedLocation: 'Thunder Horse',
        deckLbs: 1000,
        deckTons: 0.5,
        rtTons: 2,
        rtLifts: 5,
        lifts: 3,
        wetBulkBbls: 100,
        wetBulkGals: 4200,
        rtWetBulkGals: 8400,
        deckSqft: 200,
        manifestDate: new Date('2024-01-01'),
        manifestDateOnly: new Date('2024-01-01'),
        month: 'January',
        monthNumber: 1,
        quarter: 'Q1',
        year: 2024,
        costCode: '12345',
        finalDepartment: 'Drilling',
        cargoType: 'Deck Cargo',
        remarks: 'Test cargo',
        company: 'BP',
        vesselType: 'OSV'
      }
    ];

    const mockEvents: VoyageEvent[] = [
      {
        id: 'event-1',
        mission: 'Supply',
        vessel: 'Vessel1',
        voyageNumber: '1',
        event: 'Cargo Operations',
        parentEvent: 'Operations',
        location: 'Thunder Horse',
        originalLocation: 'Thunder Horse',
        mappedLocation: 'Thunder Horse',
        quay: 'A1',
        remarks: 'Test event',
        from: new Date('2024-01-01T08:00:00Z'),
        to: new Date('2024-01-01T12:00:00Z'),
        hours: 4,
        finalHours: 4,
        eventDate: new Date('2024-01-01'),
        eventYear: 2024,
        quarter: 'Q1',
        monthNumber: 1,
        monthName: 'January',
        weekOfYear: 1,
        dayOfWeek: 'Monday',
        dayOfMonth: 1,
        portType: 'rig',
        locationType: 'Offshore',
        activityCategory: 'Productive',
        eventCategory: 'Operations',
        department: 'Drilling',
        costDedicatedTo: 'Drilling Operations',
        lcNumber: '12345',
        originalLCLocation: 'Thunder Horse',
        lcPercentage: 100,
        mappingStatus: 'LC Mapped',
        dataIntegrity: 'Valid',
        isActive: true,
        ins500m: 'No',
        year: 2024,
        company: 'BP',
        standardizedVoyageNumber: '1'
      }
    ];

    test('should calculate vessel requirements summary', () => {
      const result = calculateVesselRequirements(mockVoyages, mockManifests, mockEvents);
      
      expect(result.totalRigs).toBeGreaterThan(0);
      expect(result.totalVoyages).toBe(1);
      expect(result.currentVesselCount).toBe(1);
      expect(result.totalRecommendedVessels).toBeGreaterThan(0);
      expect(result.rigAnalysis).toHaveLength(1);
      expect(result.formulaBreakdown).toBeDefined();
      expect(result.formulaBreakdown.vesselHoursPerDay).toBe(24);
    });

    test('should handle empty data gracefully', () => {
      const result = calculateVesselRequirements([], [], []);
      
      expect(result.totalRigs).toBe(0);
      expect(result.totalVoyages).toBe(0);
      expect(result.currentVesselCount).toBe(0);
      expect(result.totalRecommendedVessels).toBe(0);
      expect(result.rigAnalysis).toHaveLength(0);
    });
  });

  describe('RIG_LOCATION_MAPPINGS', () => {
    test('should contain expected rig location mappings', () => {
      expect(RIG_LOCATION_MAPPINGS['TH']).toBe('Thunder Horse');
      expect(RIG_LOCATION_MAPPINGS['MD']).toBe('Mad Dog');
      expect(RIG_LOCATION_MAPPINGS['BC']).toBe('Blind Faith Complex');
      expect(RIG_LOCATION_MAPPINGS['BSC']).toBe('Big Scar');
      expect(RIG_LOCATION_MAPPINGS['JT']).toBe('Jack/St. Malo');
      expect(RIG_LOCATION_MAPPINGS['NK']).toBe('Na Kika');
      expect(RIG_LOCATION_MAPPINGS['AT']).toBe('Atlantis');
      expect(RIG_LOCATION_MAPPINGS['AR']).toBe('Argos');
    });

    test('should handle drilling rig names', () => {
      expect(RIG_LOCATION_MAPPINGS['Stena IceMAX']).toBe('Stena IceMAX');
      expect(RIG_LOCATION_MAPPINGS['Ocean BlackLion']).toBe('Ocean BlackLion');
      expect(RIG_LOCATION_MAPPINGS['Ocean BlackHornet']).toBe('Ocean BlackHornet');
    });
  });
});