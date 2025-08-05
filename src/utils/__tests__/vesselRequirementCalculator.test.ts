import { 
  normalizeRigLocation, 
  calculateVesselRequirements,
  calculateDeliveryDemand,
  calculateVesselCapability,
  isPSVOrOSV,
  RIG_LOCATION_MAPPINGS,
  BP_OFFSHORE_LOCATIONS
} from '../vesselRequirementCalculator';
import { 
  processManifestCostAllocationMatches,
  calculateDrillingSummary,
  classifyLocationActivity,
  determineDepartment
} from '../costAllocationValidator';
import { 
  createVesselCodesDatabase,
  batchClassifyVoyageEvents,
  calculateProductiveHoursWithVesselCodes
} from '../vesselCodesProcessor';
import { VoyageList, VesselManifest, CostAllocation, VoyageEvent } from '../../types';

describe('vesselRequirementCalculator', () => {
  describe('normalizeRigLocation', () => {
    test('should normalize Thunder Horse variations to drilling (primary operation)', () => {
      expect(normalizeRigLocation('TH')).toBe('Thunder Horse Drilling');
      expect(normalizeRigLocation('Thunder Horse PDQ')).toBe('Thunder Horse Drilling');
      expect(normalizeRigLocation('Thunder Horse')).toBe('Thunder Horse Drilling');
      expect(normalizeRigLocation('Thunder Horse Drilling')).toBe('Thunder Horse Drilling');
    });
    
    test('should normalize Thunder Horse production separately', () => {
      expect(normalizeRigLocation('Thunder Horse Prod')).toBe('Thunder Horse Prod');
      expect(normalizeRigLocation('THP')).toBe('Thunder Horse Prod');
      expect(normalizeRigLocation('Thunder Horse Production')).toBe('Thunder Horse Prod');
    });
    
    test('should normalize Mad Dog variations to drilling (primary operation)', () => {
      expect(normalizeRigLocation('MD')).toBe('Mad Dog Drilling');
      expect(normalizeRigLocation('Mad Dog')).toBe('Mad Dog Drilling');
      expect(normalizeRigLocation('Mad Dog Drilling')).toBe('Mad Dog Drilling');
      expect(normalizeRigLocation('MDD')).toBe('Mad Dog Drilling');
    });
    
    test('should normalize Mad Dog production separately', () => {
      expect(normalizeRigLocation('Mad Dog Prod')).toBe('Mad Dog Prod');
      expect(normalizeRigLocation('MDP')).toBe('Mad Dog Prod');
      expect(normalizeRigLocation('Mad Dog Production')).toBe('Mad Dog Prod');
    });
    
    test('should normalize production locations correctly', () => {
      expect(normalizeRigLocation('Argos')).toBe('Argos');
      expect(normalizeRigLocation('Atlantis')).toBe('Atlantis');
      expect(normalizeRigLocation('Na Kika')).toBe('Na Kika');
      expect(normalizeRigLocation('Shenzi')).toBe('Shenzi');
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
    
    test('should exclude other vessel types and Tucker Candies', () => {
      expect(isPSVOrOSV('crew boat')).toBe(false);
      expect(isPSVOrOSV('utility boat')).toBe(false);
      expect(isPSVOrOSV('inspections and maintenance')).toBe(false);
      // ADJUSTMENT: Exclude Tucker Candies from vessel count
      expect(isPSVOrOSV('Tucker Candies')).toBe(false);
      expect(isPSVOrOSV('tucker candies')).toBe(false);
      expect(isPSVOrOSV('TUCKER CANDIES')).toBe(false);
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
      expect(result).toBeDefined();
      expect(result.locationDemands).toBeDefined();
      expect(result.locationDemands.length).toBeGreaterThan(0);
      expect(result.locationDemands[0].location).toBe('Thunder Horse Drilling');
      expect(result.locationDemands[0].totalDeliveries).toBe(1);
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

    test('should handle empty data gracefully with Fantasy Island baseline addition', () => {
      const result = calculateVesselRequirements([], []);
      
      expect(result.analysisDateRange.monthsCovered).toBe(6);
      // ADJUSTMENT: Fantasy Island is excluded from calculations but added as +1 baseline
      expect(result.locationDemands.length).toBe(0); // No real location demands
      expect(result.vesselCapabilities.length).toBe(0); // No real vessel capabilities
      expect(result.requiredVessels).toBe(1); // Fantasy Island +1 baseline addition
    });

    test('should exclude Fantasy Island manifests from demand calculations', () => {
      const mockManifestsWithFantasyIsland: VesselManifest[] = [
        {
          id: '1',
          voyageId: 'V1',
          standardizedVoyageId: 'V1',
          manifestNumber: 'M1',
          transporter: 'Ocean BlackLion',
          from: 'Fourchon',
          offshoreLocation: 'Fantasy Island', // Should be excluded
          mappedLocation: 'Fantasy Island',
          deckTons: 0.5,
          rtTons: 1.0,
          lifts: 2,
          rtLifts: 2,
          wetBulkBbls: 100,
          wetBulkGals: 4200,
          rtWetBulkGals: 4200,
          deckSqft: 500,
          deckLbs: 1000,
          manifestDate: new Date('2025-01-15'),
          manifestDateOnly: new Date('2025-01-15'),
          month: 'January',
          monthNumber: 1,
          quarter: 'Q1',
          year: 2025,
          costCode: 'FI001',
          cargoType: 'Deck Cargo'
        },
        {
          id: '2',
          voyageId: 'V2',
          standardizedVoyageId: 'V2',
          manifestNumber: 'M2',
          transporter: 'Ocean Atlantic',
          from: 'Fourchon',
          offshoreLocation: 'Thunder Horse PDQ', // Should be included
          mappedLocation: 'Thunder Horse PDQ',
          deckTons: 0.8,
          rtTons: 1.2,
          lifts: 3,
          rtLifts: 3,
          wetBulkBbls: 150,
          wetBulkGals: 6300,
          rtWetBulkGals: 6300,
          deckSqft: 750,
          deckLbs: 1500,
          manifestDate: new Date('2025-01-16'),
          manifestDateOnly: new Date('2025-01-16'),
          month: 'January',
          monthNumber: 1,
          quarter: 'Q1',
          year: 2025,
          costCode: 'TH001',
          cargoType: 'Deck Cargo'
        }
      ];

      const result = calculateVesselRequirements([], mockManifestsWithFantasyIsland);
      
      // Should only have Thunder Horse Drilling in location demands (Fantasy Island excluded)
      expect(result.locationDemands.length).toBe(1);
      expect(result.locationDemands[0].location).toBe('Thunder Horse Drilling');
      expect(result.locationDemands[0].totalDeliveries).toBe(1);
      
      // Fantasy Island still contributes +1 to final vessel requirement
      expect(result.requiredVessels).toBeGreaterThanOrEqual(1); // At least 1 from Fantasy Island baseline
    });

    test('should filter to only drilling deliveries for Mad Dog and Thunder Horse', () => {
      const mockManifestsWithProduction: VesselManifest[] = [
        {
          id: '1',
          voyageId: 'V1',
          standardizedVoyageId: 'V1',
          manifestNumber: 'M1',
          transporter: 'Ocean BlackLion',
          from: 'Fourchon',
          offshoreLocation: 'Mad Dog Drilling', // Should be included
          mappedLocation: 'Mad Dog',
          deckTons: 0.5,
          rtTons: 1.0,
          lifts: 2,
          rtLifts: 2,
          wetBulkBbls: 100,
          wetBulkGals: 4200,
          rtWetBulkGals: 4200,
          deckSqft: 500,
          deckLbs: 1000,
          manifestDate: new Date('2025-01-15'),
          manifestDateOnly: new Date('2025-01-15'),
          month: 'January',
          monthNumber: 1,
          quarter: 'Q1',
          year: 2025,
          costCode: 'MD001',
          cargoType: 'Deck Cargo'
        },
        {
          id: '2',
          voyageId: 'V2',
          standardizedVoyageId: 'V2',
          manifestNumber: 'M2',
          transporter: 'Ocean Atlantic',
          from: 'Fourchon',
          offshoreLocation: 'Mad Dog Production', // Should be excluded
          mappedLocation: 'Mad Dog',
          deckTons: 0.8,
          rtTons: 1.2,
          lifts: 3,
          rtLifts: 3,
          wetBulkBbls: 150,
          wetBulkGals: 6300,
          rtWetBulkGals: 6300,
          deckSqft: 750,
          deckLbs: 1500,
          manifestDate: new Date('2025-01-16'),
          manifestDateOnly: new Date('2025-01-16'),
          month: 'January',
          monthNumber: 1,
          quarter: 'Q1',
          year: 2025,
          costCode: 'MP001',
          cargoType: 'Deck Cargo'
        },
        {
          id: '3',
          voyageId: 'V3',
          standardizedVoyageId: 'V3',
          manifestNumber: 'M3',
          transporter: 'Ocean Pacific',
          from: 'Fourchon',
          offshoreLocation: 'Thunder Horse Drilling', // Should be included
          mappedLocation: 'Thunder Horse PDQ',
          deckTons: 1.0,
          rtTons: 1.5,
          lifts: 4,
          rtLifts: 4,
          wetBulkBbls: 200,
          wetBulkGals: 8400,
          rtWetBulkGals: 8400,
          deckSqft: 1000,
          deckLbs: 2000,
          manifestDate: new Date('2025-01-17'),
          manifestDateOnly: new Date('2025-01-17'),
          month: 'January',
          monthNumber: 1,
          quarter: 'Q1',
          year: 2025,
          costCode: 'TH001',
          cargoType: 'Deck Cargo'
        },
        {
          id: '4',
          voyageId: 'V4',
          standardizedVoyageId: 'V4',
          manifestNumber: 'M4',
          transporter: 'Ocean Gulf',
          from: 'Fourchon',
          offshoreLocation: 'Thunder Horse Prod', // Should be excluded
          mappedLocation: 'Thunder Horse PDQ',
          deckTons: 0.6,
          rtTons: 0.9,
          lifts: 2,
          rtLifts: 2,
          wetBulkBbls: 120,
          wetBulkGals: 5040,
          rtWetBulkGals: 5040,
          deckSqft: 600,
          deckLbs: 1200,
          manifestDate: new Date('2025-01-18'),
          manifestDateOnly: new Date('2025-01-18'),
          month: 'January',
          monthNumber: 1,
          quarter: 'Q1',
          year: 2025,
          costCode: 'TP001',
          cargoType: 'Deck Cargo'
        }
      ];

      const result = calculateVesselRequirements([], mockManifestsWithProduction);
      
      // Should now separate drilling and production into different locations (4 total: 2 drilling + 2 production)
      expect(result.locationDemands.length).toBe(4);
      
      // Check that drilling and production locations are properly separated
      const locations = result.locationDemands.map(loc => loc.location);
      expect(locations).toContain('Mad Dog Drilling');
      expect(locations).toContain('Mad Dog Prod');
      expect(locations).toContain('Thunder Horse Drilling');
      expect(locations).toContain('Thunder Horse Prod');
      
      // Each location should have 1 delivery
      expect(result.locationDemands.find(loc => loc.location === 'Mad Dog Drilling')?.totalDeliveries).toBe(1);
      expect(result.locationDemands.find(loc => loc.location === 'Mad Dog Prod')?.totalDeliveries).toBe(1);
      expect(result.locationDemands.find(loc => loc.location === 'Thunder Horse Drilling')?.totalDeliveries).toBe(1);
      expect(result.locationDemands.find(loc => loc.location === 'Thunder Horse Prod')?.totalDeliveries).toBe(1);
      
      // Fantasy Island still contributes +1 to final vessel requirement
      expect(result.requiredVessels).toBeGreaterThanOrEqual(1);
    });
  });

  // ==================== ENHANCED TESTS FOR COST ALLOCATION INTEGRATION ====================

  describe('Enhanced Cost Allocation Integration Tests', () => {
    const mockCostAllocations: CostAllocation[] = [
      {
        lcNumber: 'LC-1001-DR',
        locationReference: 'Thunder Horse Drilling',
        description: 'Thunder Horse Drilling Operations',
        projectType: 'Drilling',
        rigLocation: 'Thunder Horse',
        department: 'Drilling',
        totalAllocatedDays: 30,
        averageVesselCostPerDay: 35000,
        totalCost: 1050000,
        budgetedVesselCost: 1050000,
        vesselDailyRateUsed: 35000,
        vesselRateDescription: 'Mar 2024: $35,000/day',
        isDrilling: true,
        isActive: true,
        monthYear: '2024-03',
        month: 3,
        year: 2024
      },
      {
        lcNumber: 'LC-2001-PR',
        locationReference: 'Mad Dog Production',
        description: 'Mad Dog Production Support',
        projectType: 'Production',
        rigLocation: 'Mad Dog',
        department: 'Production',
        totalAllocatedDays: 25,
        averageVesselCostPerDay: 32000,
        totalCost: 800000,
        budgetedVesselCost: 800000,
        vesselDailyRateUsed: 32000,
        vesselRateDescription: 'Mar 2024: $32,000/day',
        isDrilling: false,
        isActive: true,
        monthYear: '2024-03',
        month: 3,
        year: 2024
      }
    ];

    const mockEnhancedManifests: VesselManifest[] = [
      {
        id: 'manifest-1',
        voyageId: 'voyage-1',
        standardizedVoyageId: '2024-03-OSV1-001',
        manifestNumber: 'M-001',
        transporter: 'OSV Neptune',
        from: 'Fourchon',
        offshoreLocation: 'Thunder Horse',
        mappedLocation: 'Thunder Horse',
        deckTons: 150,
        rtTons: 0,
        lifts: 25,
        rtLifts: 0,
        wetBulkBbls: 500,
        wetBulkGals: 21000,
        rtWetBulkGals: 0,
        deckSqft: 1200,
        deckLbs: 300000,
        manifestDate: new Date('2024-03-15'),
        manifestDateOnly: new Date('2024-03-15'),
        month: 'March',
        monthNumber: 3,
        quarter: 'Q1',
        year: 2024,
        costCode: 'LC-1001-DR',
        finalDepartment: 'Drilling',
        cargoType: 'Deck Cargo',
        isDrillingActivity: true,
        costCodeMatchFound: true
      },
      {
        id: 'manifest-2',
        voyageId: 'voyage-2',
        standardizedVoyageId: '2024-03-OSV2-001',
        manifestNumber: 'M-002',
        transporter: 'OSV Atlantic',
        from: 'Fourchon',
        offshoreLocation: 'Mad Dog',
        mappedLocation: 'Mad Dog',
        deckTons: 120,
        rtTons: 50,
        lifts: 20,
        rtLifts: 8,
        wetBulkBbls: 300,
        wetBulkGals: 12600,
        rtWetBulkGals: 5000,
        deckSqft: 1000,
        deckLbs: 240000,
        manifestDate: new Date('2024-03-16'),
        manifestDateOnly: new Date('2024-03-16'),
        month: 'March',
        monthNumber: 3,
        quarter: 'Q1',
        year: 2024,
        costCode: 'LC-2001-PR',
        finalDepartment: 'Production',
        cargoType: 'Deck Cargo',
        isDrillingActivity: false,
        costCodeMatchFound: true
      }
    ];

    const mockVoyageEvents: VoyageEvent[] = [
      {
        id: 'event-1',
        mission: 'Supply',
        vessel: 'OSV Neptune',
        voyageNumber: '001',
        event: 'Load - Fuel, Water or Methanol',
        parentEvent: 'Cargo Ops',
        location: 'Thunder Horse',
        originalLocation: 'Thunder Horse',
        mappedLocation: 'Thunder Horse',
        from: new Date('2024-03-15T08:00:00Z'),
        to: new Date('2024-03-15T14:00:00Z'),
        hours: 6,
        finalHours: 6,
        eventDate: new Date('2024-03-15'),
        eventYear: 2024,
        quarter: 'Q1',
        monthNumber: 3,
        monthName: 'March',
        weekOfYear: 11,
        dayOfWeek: 'Friday',
        dayOfMonth: 15,
        portType: 'rig',
        locationType: 'Offshore',
        activityCategory: 'Productive',
        department: 'Drilling',
        lcNumber: 'LC-1001-DR',
        mappingStatus: 'LC Mapped',
        dataIntegrity: 'Valid',
        year: 2024
      },
      {
        id: 'event-2',
        mission: 'Supply',
        vessel: 'OSV Atlantic',
        voyageNumber: '001',
        event: '',
        parentEvent: 'Waiting on Weather',
        location: 'Mad Dog',
        originalLocation: 'Mad Dog',
        mappedLocation: 'Mad Dog',
        from: new Date('2024-03-16T10:00:00Z'),
        to: new Date('2024-03-16T14:00:00Z'),
        hours: 4,
        finalHours: 4,
        eventDate: new Date('2024-03-16'),
        eventYear: 2024,
        quarter: 'Q1',
        monthNumber: 3,
        monthName: 'March',
        weekOfYear: 11,
        dayOfWeek: 'Saturday',
        dayOfMonth: 16,
        portType: 'rig',
        locationType: 'Offshore',
        activityCategory: 'Non-Productive',
        department: 'Production',
        lcNumber: 'LC-2001-PR',
        mappingStatus: 'LC Mapped',
        dataIntegrity: 'Valid',
        year: 2024
      }
    ];

    test('should process cost allocation matches correctly', () => {
      const matches = processManifestCostAllocationMatches(mockEnhancedManifests, mockCostAllocations);
      
      expect(matches).toHaveLength(2);
      
      // Test exact LC matches
      const exactMatches = matches.filter(m => m.matchType === 'exact_lc');
      expect(exactMatches).toHaveLength(2);
      
      // Test high confidence matches
      const highConfidenceMatches = matches.filter(m => m.confidence === 'high');
      expect(highConfidenceMatches).toHaveLength(2);
      
      // Test drilling vs production classification
      const drillingMatches = matches.filter(m => m.classification.projectType === 'drilling');
      const productionMatches = matches.filter(m => m.classification.projectType === 'production');
      
      expect(drillingMatches).toHaveLength(1); // Thunder Horse
      expect(productionMatches).toHaveLength(1); // Mad Dog
    });

    test('should calculate drilling summary with real data', () => {
      const matches = processManifestCostAllocationMatches(mockEnhancedManifests, mockCostAllocations);
      const summary = calculateDrillingSummary(matches);
      
      expect(summary.totalDrillingDemand).toBe(1); // 1 drilling location
      expect(summary.totalProductionDemand).toBe(1); // 1 production location
      expect(summary.drillingLocationCount).toBe(1);
      expect(summary.productionLocationCount).toBe(1);
      expect(summary.mixedLocationCount).toBe(0);
      
      // Check location classifications
      expect(summary.locationClassifications.size).toBe(2);
      // Note: locations are normalized, so "Thunder Horse" becomes "Thunder Horse Drilling" (primary operation)
      const thunderHorseClassification = summary.locationClassifications.get('Thunder Horse') || 
                                        summary.locationClassifications.get('Thunder Horse PDQ');
      const madDogClassification = summary.locationClassifications.get('Mad Dog');
      
      expect(thunderHorseClassification?.projectType).toBe('drilling');
      expect(madDogClassification?.projectType).toBe('production');
    });

    test('should classify activities using cost allocation data', () => {
      const drillingCostAllocations = mockCostAllocations.filter(ca => ca.projectType === 'Drilling');
      const productionCostAllocations = mockCostAllocations.filter(ca => ca.projectType === 'Production');
      
      expect(classifyLocationActivity(drillingCostAllocations)).toBe('drilling');
      expect(classifyLocationActivity(productionCostAllocations)).toBe('production');
      expect(classifyLocationActivity([])).toBe('unknown');
    });

    test('should determine departments correctly', () => {
      const drillingCostAllocations = mockCostAllocations.filter(ca => ca.department === 'Drilling');
      const productionCostAllocations = mockCostAllocations.filter(ca => ca.department === 'Production');
      
      expect(determineDepartment(drillingCostAllocations)).toBe('Drilling');
      expect(determineDepartment(productionCostAllocations)).toBe('Production');
      expect(determineDepartment([])).toBe('Logistics');
    });
  });

  describe('Enhanced Vessel Codes Integration Tests', () => {
    const mockVoyageEvents: VoyageEvent[] = [
      {
        id: 'event-1',
        mission: 'Supply',
        vessel: 'OSV Neptune',
        voyageNumber: '001',
        event: 'Load - Fuel, Water or Methanol',
        parentEvent: 'Cargo Ops',
        location: 'Thunder Horse',
        originalLocation: 'Thunder Horse',
        mappedLocation: 'Thunder Horse',
        from: new Date('2024-03-15T08:00:00Z'),
        to: new Date('2024-03-15T14:00:00Z'),
        hours: 6,
        finalHours: 6,
        eventDate: new Date('2024-03-15'),
        eventYear: 2024,
        quarter: 'Q1',
        monthNumber: 3,
        monthName: 'March',
        weekOfYear: 11,
        dayOfWeek: 'Friday',
        dayOfMonth: 15,
        portType: 'rig',
        locationType: 'Offshore',
        activityCategory: 'Productive',
        department: 'Drilling',
        mappingStatus: 'LC Mapped',
        dataIntegrity: 'Valid',
        year: 2024
      },
      {
        id: 'event-2',
        mission: 'Supply',
        vessel: 'OSV Atlantic',
        voyageNumber: '001',
        event: '',
        parentEvent: 'Waiting on Weather',
        location: 'Mad Dog',
        originalLocation: 'Mad Dog',
        mappedLocation: 'Mad Dog',
        from: new Date('2024-03-16T10:00:00Z'),
        to: new Date('2024-03-16T14:00:00Z'),
        hours: 4,
        finalHours: 4,
        eventDate: new Date('2024-03-16'),
        eventYear: 2024,
        quarter: 'Q1',
        monthNumber: 3,
        monthName: 'March',
        weekOfYear: 11,
        dayOfWeek: 'Saturday',
        dayOfMonth: 16,
        portType: 'rig',
        locationType: 'Offshore',
        activityCategory: 'Non-Productive',
        department: 'Production',
        mappingStatus: 'LC Mapped',
        dataIntegrity: 'Valid',
        year: 2024
      }
    ];

    test('should create vessel codes database correctly', () => {
      const database = createVesselCodesDatabase();
      
      expect(database.codes.size).toBeGreaterThan(0);
      expect(database.l1Events.size).toBeGreaterThan(0);
      expect(database.productiveCodes.length).toBeGreaterThan(0);
      expect(database.nonProductiveCodes.length).toBeGreaterThan(0);
      expect(database.weatherRelatedCodes.length).toBeGreaterThan(0);
      expect(database.cargoOperationCodes.length).toBeGreaterThan(0);
    });

    test('should batch classify voyage events correctly', () => {
      const database = createVesselCodesDatabase();
      const classifications = batchClassifyVoyageEvents(mockVoyageEvents, database);
      
      expect(classifications).toHaveLength(2);
      
      // Test cargo operations classification
      const cargoOpsClassifications = classifications.filter(c => 
        c.vesselCode?.isCargoOperation === true
      );
      expect(cargoOpsClassifications.length).toBeGreaterThanOrEqual(1);
      
      // Test weather-related classification
      const weatherClassifications = classifications.filter(c => 
        c.vesselCode?.isWeatherRelated === true
      );
      expect(weatherClassifications.length).toBe(1); // Waiting on Weather event
    });

    test('should calculate productive hours with vessel codes', () => {
      const database = createVesselCodesDatabase();
      const classifications = batchClassifyVoyageEvents(mockVoyageEvents, database);
      const results = calculateProductiveHoursWithVesselCodes(mockVoyageEvents, classifications);
      
      expect(results.totalHours).toBe(10); // 6 + 4 hours
      expect(results.productiveHours).toBeGreaterThan(0);
      expect(results.nonProductiveHours).toBeGreaterThan(0);
      expect(results.weatherHours).toBe(4); // Weather waiting hours
      
      // Test productive percentage calculation
      expect(results.productivePercentage).toBeGreaterThanOrEqual(0);
      expect(results.productivePercentage).toBeLessThanOrEqual(100);
      
      // Test breakdown structure
      expect(results.breakdown).toBeDefined();
      expect(typeof results.breakdown).toBe('object');
    });
  });

  describe('BP Offshore Locations Validation', () => {
    test('should contain only the 6 operational BP offshore locations', () => {
      expect(BP_OFFSHORE_LOCATIONS).toHaveLength(6);
      expect(BP_OFFSHORE_LOCATIONS).toContain('Thunder Horse PDQ');
      expect(BP_OFFSHORE_LOCATIONS).toContain('Mad Dog');
      expect(BP_OFFSHORE_LOCATIONS).toContain('Ocean BlackLion');
      expect(BP_OFFSHORE_LOCATIONS).toContain('Ocean Blackhornet');
      expect(BP_OFFSHORE_LOCATIONS).toContain('Deepwater Invictus');
      expect(BP_OFFSHORE_LOCATIONS).toContain('Stena IceMAX');
      // ADJUSTMENT: Fantasy Island and Island Venture excluded from operational calculations
      expect(BP_OFFSHORE_LOCATIONS).not.toContain('Fantasy Island'); // Handled as +1 baseline
      expect(BP_OFFSHORE_LOCATIONS).not.toContain('Island Venture'); // Removed per requirements
      expect(BP_OFFSHORE_LOCATIONS).not.toContain('Na Kika'); // Maps to Fantasy Island (excluded)
      expect(BP_OFFSHORE_LOCATIONS).not.toContain('Atlantis'); // Maps to Fantasy Island (excluded)
      expect(BP_OFFSHORE_LOCATIONS).not.toContain('Argos'); // Maps to Fantasy Island (excluded)
    });

    test('should normalize BP locations correctly with Fantasy Island mapping', () => {
      expect(normalizeRigLocation('thunder horse')).toBe('Thunder Horse PDQ');
      expect(normalizeRigLocation('THUNDER HORSE')).toBe('Thunder Horse PDQ');
      expect(normalizeRigLocation('mad dog')).toBe('Mad Dog');
      // ADJUSTMENT: Legacy locations now map to Fantasy Island (but excluded from calculations)
      expect(normalizeRigLocation('na kika')).toBe('Fantasy Island');
      expect(normalizeRigLocation('atlantis')).toBe('Fantasy Island');
      expect(normalizeRigLocation('argos')).toBe('Fantasy Island');
      expect(normalizeRigLocation('fantasy island')).toBe('Fantasy Island');
    });
  });

  describe('Enhanced calculateVesselRequirements Integration', () => {
    const mockData = {
      manifests: [
        {
          id: 'manifest-1',
          voyageId: 'voyage-1',
          standardizedVoyageId: '2024-03-OSV1-001',
          manifestNumber: 'M-001',
          transporter: 'OSV Neptune',
          from: 'Fourchon',
          offshoreLocation: 'Thunder Horse',
          mappedLocation: 'Thunder Horse',
          deckTons: 150,
          rtTons: 0,
          lifts: 25,
          rtLifts: 0,
          wetBulkBbls: 500,
          wetBulkGals: 21000,
          rtWetBulkGals: 0,
          deckSqft: 1200,
          deckLbs: 300000,
          manifestDate: new Date('2024-03-15'),
          manifestDateOnly: new Date('2024-03-15'),
          month: 'March',
          monthNumber: 3,
          quarter: 'Q1',
          year: 2024,
          costCode: 'LC-1001-DR',
          finalDepartment: 'Drilling',
          cargoType: 'Deck Cargo'
        } as VesselManifest
      ],
      voyageEvents: [
        {
          id: 'event-1',
          mission: 'Supply',
          vessel: 'OSV Neptune',
          voyageNumber: '001',
          event: 'Load - Fuel, Water or Methanol',
          parentEvent: 'Cargo Ops',
          location: 'Thunder Horse',
          originalLocation: 'Thunder Horse',
          mappedLocation: 'Thunder Horse',
          from: new Date('2024-03-15T08:00:00Z'),
          to: new Date('2024-03-15T14:00:00Z'),
          hours: 6,
          finalHours: 6,
          eventDate: new Date('2024-03-15'),
          eventYear: 2024,
          quarter: 'Q1',
          monthNumber: 3,
          monthName: 'March',
          weekOfYear: 11,
          dayOfWeek: 'Friday',
          dayOfMonth: 15,
          portType: 'rig',
          locationType: 'Offshore',
          activityCategory: 'Productive',
          department: 'Drilling',
          mappingStatus: 'LC Mapped',
          dataIntegrity: 'Valid',
          year: 2024
        } as VoyageEvent
      ],
      costAllocations: [
        {
          lcNumber: 'LC-1001-DR',
          locationReference: 'Thunder Horse Drilling',
          description: 'Thunder Horse Drilling Operations',
          projectType: 'Drilling',
          rigLocation: 'Thunder Horse',
          department: 'Drilling',
          isActive: true
        } as CostAllocation
      ],
      vesselCodes: []
    };

    test('should integrate all enhancements in vessel requirement calculation', () => {
      const results = calculateVesselRequirements([], mockData.manifests, mockData.costAllocations);
      
      expect(results).toBeDefined();
      expect(results.locationDemands).toBeDefined();
      expect(results.vesselCapabilities).toBeDefined();
      expect(results.requiredVessels).toBeGreaterThanOrEqual(0);
      expect(results.recommendation).toBeDefined();
      
      // Test enhanced drilling vs production calculation
      expect(results.averageDrillingDemand).toBeGreaterThanOrEqual(0);
      expect(results.averageProductionDemand).toBeGreaterThanOrEqual(0);
    });

    test('should handle enhanced calculations without cost allocation data', () => {
      const resultsWithoutCostAllocation = calculateVesselRequirements([], mockData.manifests, []);
      
      expect(resultsWithoutCostAllocation).toBeDefined();
      expect(resultsWithoutCostAllocation.locationDemands).toBeDefined();
      expect(resultsWithoutCostAllocation.requiredVessels).toBeGreaterThanOrEqual(0);
    });

    test('should provide comprehensive debugging and validation', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      calculateVesselRequirements([], mockData.manifests, mockData.costAllocations);
      
      // Verify that enhanced debugging information was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ENHANCED vessel requirement calculation')
      );
      
      consoleLogSpy.mockRestore();
    });

    test('should handle large datasets efficiently', () => {
      // Generate larger dataset for performance testing
      const largeManifests = Array.from({ length: 100 }, (_, i) => ({
        ...mockData.manifests[0],
        id: `manifest-${i}`,
        manifestNumber: `M-${i.toString().padStart(3, '0')}`
      }));
      
      const largeCostAllocations = Array.from({ length: 50 }, (_, i) => ({
        ...mockData.costAllocations[0],
        lcNumber: `LC-${i.toString().padStart(4, '0')}-DR`,
        locationReference: `Location ${i}`
      }));
      
      const startTime = Date.now();
      const results = calculateVesselRequirements([], largeManifests, largeCostAllocations);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(results).toBeDefined();
      expect(results.locationDemands).toBeDefined();
    });
  });
});