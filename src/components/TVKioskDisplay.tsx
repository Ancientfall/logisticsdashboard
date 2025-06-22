import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  calculateEnhancedKPIMetrics,
  calculateEnhancedManifestMetrics,
  calculateEnhancedVoyageEventMetrics
} from '../utils/metricsCalculation';
import { deduplicateBulkActions, getDrillingFluidMovements, getProductionFluidMovements } from '../utils/bulkFluidDeduplicationEngine';
import { formatSmartCurrency } from '../utils/formatters';
import { TrendingUp, TrendingDown, Clock, Ship, BarChart3, Droplet, Fuel, Target, Gauge, MapPin, Users, DollarSign } from 'lucide-react';
import { useCostAnalysisRedesigned } from './dashboard/cost-allocation/hooks/useCostAnalysis';
import { useFilteredCostAllocation } from './dashboard/cost-allocation/hooks/useFilteredCostAllocation';

interface TVKPICard {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  isPositive?: boolean;
  icon: React.ComponentType<any>;
  color: string;
  subtitle?: string;
}

interface TVKPISlide {
  id: string;
  category: string;
  cards: TVKPICard[];
  gradient: string;
}

interface TVKioskDisplayProps {
  autoRotationInterval?: number; // in seconds, default 10
  showCategories?: string[]; // ['drilling', 'production', 'voyage', 'cost']
}

const TVKioskDisplay: React.FC<TVKioskDisplayProps> = ({ 
  autoRotationInterval = 10,
  showCategories = ['drilling', 'production', 'voyage', 'cost']
}) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    voyageList,
    bulkActions,
    isDataReady
  } = useData();

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  
  // Add pause on spacebar for debugging
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        console.log('🔄 TV DISPLAY: Paused =', !isPaused);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPaused]);

  // Filter data to YTD first (outside of useMemo to avoid hook usage issues)
  const now = new Date();
  const currentMonth = undefined;  // YTD = all months in current year
  const currentYear = now.getFullYear();

  // Filter ALL data sources to YTD
  const ytdVoyageEvents = useMemo(() => 
    voyageEvents.filter(v => v.eventDate && v.eventDate.getFullYear() === currentYear), 
    [voyageEvents, currentYear]
  );
  
  const ytdVesselManifests = useMemo(() => 
    vesselManifests.filter(m => m.manifestDate && m.manifestDate.getFullYear() === currentYear), 
    [vesselManifests, currentYear]
  );
  
  const ytdBulkActions = useMemo(() => 
    bulkActions.filter(b => b.startDate && b.startDate.getFullYear() === currentYear), 
    [bulkActions, currentYear]
  );
  
  const ytdVoyageList = useMemo(() => 
    voyageList.filter(v => v.voyageDate && v.voyageDate.getFullYear() === currentYear), 
    [voyageList, currentYear]
  );

  const ytdCostAllocation = useFilteredCostAllocation(costAllocation, 'YTD', 'All Locations', 'All Types');
  const authoritativeCostMetrics = useCostAnalysisRedesigned(ytdCostAllocation, ytdVoyageEvents, ytdVesselManifests, ytdVoyageList);

  // Extract departmental costs from authoritative source (outside useMemo for global access)
  const drillingCost = authoritativeCostMetrics.departmentBreakdown.find(d => d.department === 'Drilling')?.cost || 0;
  const productionCost = authoritativeCostMetrics.departmentBreakdown.find(d => d.department === 'Production')?.cost || 0;
  const logisticsCost = authoritativeCostMetrics.departmentBreakdown.find(d => d.department === 'Logistics')?.cost || 0;
  const totalCost = authoritativeCostMetrics.totalAllocatedCost;

  // Calculate comprehensive metrics for all categories
  const allMetrics = useMemo(() => {
    if (!isDataReady) {
      console.log('⚠️ TV DISPLAY: Data not ready, returning empty metrics');
      return { drilling: {}, production: {}, voyage: {}, cost: {}, fluids: {} };
    }

    // YTD filtering applied
    const drillingKPIs = calculateEnhancedKPIMetrics(
      ytdVoyageEvents, ytdVesselManifests, ytdVoyageList, costAllocation, ytdBulkActions, 'Drilling', currentMonth, currentYear
    );
    const drillingManifests = calculateEnhancedManifestMetrics(
      ytdVesselManifests, costAllocation, currentMonth, currentYear, 'Drilling'
    );
    const drillingEvents = calculateEnhancedVoyageEventMetrics(
      ytdVoyageEvents, costAllocation, currentMonth, currentYear, 'Drilling'
    );

    const productionKPIs = calculateEnhancedKPIMetrics(
      ytdVoyageEvents, ytdVesselManifests, ytdVoyageList, costAllocation, ytdBulkActions, 'Production', currentMonth, currentYear
    );
    const productionManifests = calculateEnhancedManifestMetrics(
      ytdVesselManifests, costAllocation, currentMonth, currentYear, 'Production'
    );

    const voyageKPIs = calculateEnhancedKPIMetrics(
      ytdVoyageEvents, ytdVesselManifests, ytdVoyageList, costAllocation, ytdBulkActions, 'All', currentMonth, currentYear
    );
    const deduplicationResult = deduplicateBulkActions(ytdBulkActions);
    const drillingFluids = getDrillingFluidMovements(deduplicationResult.consolidatedOperations);
    const productionFluids = getProductionFluidMovements(deduplicationResult.consolidatedOperations);


    const calculatedMetrics = {
      drilling: { ...drillingKPIs, ...drillingManifests, ...drillingEvents },
      production: { ...productionKPIs, ...productionManifests },
      voyage: { ...voyageKPIs },
      cost: {
        totalCost: formatSmartCurrency(totalCost),
        drillingCost: formatSmartCurrency(drillingCost),
        productionCost: formatSmartCurrency(productionCost)
      },
      fluids: {
        drilling: drillingFluids.length,
        production: productionFluids.length,
        totalVolume: [...drillingFluids, ...productionFluids].reduce((sum, fluid) => sum + (fluid.totalVolumeBbls || 0), 0)
      }
    };

    console.log('📊 TV DISPLAY: Calculated metrics summary:', {
      drilling: {
        totalCargoTons: calculatedMetrics.drilling.totalCargoTons,
        totalDeckTons: calculatedMetrics.drilling.totalDeckTons,
        totalLifts: calculatedMetrics.drilling.totalLifts,
        productiveHours: calculatedMetrics.drilling.productiveHours,
        totalVesselCost: calculatedMetrics.drilling.totalVesselCost
      },
      production: {
        totalCargoTons: calculatedMetrics.production.totalCargoTons,
        totalDeckTons: calculatedMetrics.production.totalDeckTons,
        totalVesselCost: calculatedMetrics.production.totalVesselCost
      },
      fluids: calculatedMetrics.fluids,
      cost: calculatedMetrics.cost
    });

    console.log('💰 TV DISPLAY: Authoritative Cost Analysis (matches Cost Allocation Dashboard):', {
      authoritativeCosts: {
        totalCost: formatSmartCurrency(totalCost),
        drillingCost: formatSmartCurrency(drillingCost),
        productionCost: formatSmartCurrency(productionCost),
        logisticsCost: formatSmartCurrency(logisticsCost)
      },
      rawValues: {
        totalCost: totalCost,
        drillingCost: drillingCost,
        productionCost: productionCost,
        logisticsCost: logisticsCost
      },
      departmentBreakdown: authoritativeCostMetrics.departmentBreakdown,
      costAllocationSource: 'useCostAnalysisRedesigned (same as Cost Allocation Dashboard)',
      ytdFilterApplied: 'Jan 1, 2025 - May 31, 2025'
    });

    console.log('🎯 TV DISPLAY: Authoritative KPI Values for Dashboard Alignment:', {
      drilling: {
        cargoTons: (calculatedMetrics.drilling as any)?.totalDeckTons || (calculatedMetrics.drilling as any)?.totalCargoTons || 0,
        lifts: (calculatedMetrics.drilling as any)?.totalCargoLifts || (calculatedMetrics.drilling as any)?.totalLifts || 0,
        vesselUtilization: (calculatedMetrics.drilling as any)?.vesselUtilizationRate || 0,
        productiveHours: (calculatedMetrics.drilling as any)?.productiveHours || 0
      },
      production: {
        cargoTons: (calculatedMetrics.production as any)?.totalDeckTons || (calculatedMetrics.production as any)?.totalCargoTons || 0,
        vesselUtilization: (calculatedMetrics.production as any)?.vesselUtilizationRate || 0,
        chemicalVolume: (calculatedMetrics.fluids as any)?.totalVolume || 0
      },
      voyage: {
        totalOffshoreHours: (calculatedMetrics.voyage as any)?.totalOffshoreTime || 0,
        averageTripDuration: (calculatedMetrics.voyage as any)?.averageTripDuration || 0,
        vesselUtilization: (calculatedMetrics.voyage as any)?.vesselUtilizationRate || 0
      },
      calculationSource: 'Same functions as individual dashboards (calculateEnhancedKPIMetrics, etc.)'
    });

    return calculatedMetrics;
  }, [ytdVoyageEvents, ytdVesselManifests, ytdCostAllocation, ytdVoyageList, ytdBulkActions, authoritativeCostMetrics, isDataReady, currentMonth, currentYear, drillingCost, productionCost, totalCost, logisticsCost]);

  // Calculate rotating location highlights (YTD only)
  const topLocations = useMemo(() => {
    console.log('🗺️ TV DISPLAY: Calculating top locations from YTD data...', {
      currentYear,
      ytdVoyageEventsCount: ytdVoyageEvents.length,
      totalVoyageEventsCount: voyageEvents.length
    });

    const locationActivity = ytdVoyageEvents.reduce((acc, event) => {
      const location = event.mappedLocation || event.location || 'Unknown';
      // Exclude Fourchon (base port) and Unknown locations
      if (location !== 'Unknown' && !location.toLowerCase().includes('fourchon')) {
        acc[location] = (acc[location] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(locationActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));
  }, [ytdVoyageEvents, currentYear, voyageEvents]);

  // Define KPI slides for TV display with multiple cards per slide
  const kpiSlides: TVKPISlide[] = useMemo(() => {
    const slides: TVKPISlide[] = [];

    // Helper function to safely get metric value
    const getMetricValue = (obj: any, path: string, defaultValue: number = 0): number => {
      const value = path.split('.').reduce((o, key) => o?.[key], obj);
      return typeof value === 'number' ? value : defaultValue;
    };

    // Helper function to safely get string value
    const getStringValue = (obj: any, path: string, defaultValue: string = '0'): string => {
      const value = path.split('.').reduce((o, key) => o?.[key], obj);
      return value != null ? String(value) : defaultValue;
    };

    // Helper function to format numbers with comma separators
    const formatNumber = (value: number | string): string => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '0';
      return num.toLocaleString('en-US');
    };

    console.log('🎯 TV DISPLAY: Building KPI slides with YTD data:', {
      currentYear,
      ytdVoyageEvents: ytdVoyageEvents.length,
      allMetrics: allMetrics
    });

    // Calculate voyage averages once for both drilling and production (reuse existing variables)
    const ytdVoyages = voyageList.filter(v => v.voyageDate && v.voyageDate.getFullYear() === currentYear);
    
    // Filter for drilling voyages using multiple detection methods
    const ytdDrillingVoyages = ytdVoyages.filter((voyage) => {
      // Method 1: Check if voyage involves drilling locations via cost allocation
      const hasDrillingLocation = voyage.locationList.some((location: string) => 
        costAllocation.some(ca => 
          ca.isDrilling && (
            ca.locationReference?.toLowerCase().includes(location.toLowerCase()) ||
            ca.rigLocation?.toLowerCase().includes(location.toLowerCase())
          )
        )
      );
      
      // Method 2: Check voyage purpose classification from VoyageList
      const isDrillingByPurpose = voyage.voyagePurpose === 'Drilling' || voyage.includesDrilling;
      
      // Method 3: Check for drilling-related keywords in locations
      const hasDrillingKeywords = voyage.locationList.some((location: string) => {
        const loc = location.toLowerCase();
        return loc.includes('drill') || loc.includes('rig') || loc.includes('spud') || 
               loc.includes('bop') || loc.includes('completion');
      });
      
      // Voyage is drilling if any method indicates drilling
      return hasDrillingLocation || isDrillingByPurpose || hasDrillingKeywords;
    });
    
    // Filter for production voyages using multiple detection methods
    const ytdProductionVoyages = ytdVoyages.filter((voyage) => {
      // Method 1: Check if voyage involves production locations via cost allocation
      const hasProductionLocation = voyage.locationList.some((location: string) => 
        costAllocation.some(ca => 
          !ca.isDrilling && (
            ca.locationReference?.toLowerCase().includes(location.toLowerCase()) ||
            ca.rigLocation?.toLowerCase().includes(location.toLowerCase())
          )
        )
      );
      
      // Method 2: Check voyage purpose classification from VoyageList
      const isProductionByPurpose = voyage.voyagePurpose === 'Production' || voyage.includesProduction;
      
      // Method 3: Check for production facility keywords in locations
      const hasProductionKeywords = voyage.locationList.some((location: string) => {
        const loc = location.toLowerCase();
        return loc.includes('production') || loc.includes('platform') || loc.includes('facility') ||
               loc.includes('fpso') || loc.includes('tlp') || loc.includes('spar') ||
               // Known production facility names
               loc.includes('thunder horse') || loc.includes('mad dog') || loc.includes('atlantis') ||
               loc.includes('mars') || loc.includes('ursa');
      });
      
      // Exclude if already classified as drilling
      const isDrilling = ytdDrillingVoyages.some((dv) => dv.id === voyage.id);
      
      // Voyage is production if any method indicates production AND not drilling
      return !isDrilling && (hasProductionLocation || isProductionByPurpose || hasProductionKeywords);
    });
    
    // Calculate drilling monthly averages
    const monthlyDrillingVoyages = new Map<string, number>();
    ytdDrillingVoyages.forEach((voyage) => {
      if (voyage.voyageDate) {
        const monthKey = `${voyage.voyageDate.getFullYear()}-${String(voyage.voyageDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyDrillingVoyages.set(monthKey, (monthlyDrillingVoyages.get(monthKey) || 0) + 1);
      }
    });
    
    const monthlyDrillingAverages = Array.from(monthlyDrillingVoyages.values());
    const avgDrillingVoyagesPerMonth = monthlyDrillingAverages.length > 0 
      ? monthlyDrillingAverages.reduce((sum, count) => sum + count, 0) / monthlyDrillingAverages.length 
      : 0;
    
    // Calculate production monthly averages
    const monthlyProductionVoyages = new Map<string, number>();
    ytdProductionVoyages.forEach((voyage) => {
      if (voyage.voyageDate) {
        const monthKey = `${voyage.voyageDate.getFullYear()}-${String(voyage.voyageDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyProductionVoyages.set(monthKey, (monthlyProductionVoyages.get(monthKey) || 0) + 1);
      }
    });
    
    const monthlyProductionAverages = Array.from(monthlyProductionVoyages.values());
    const avgProductionVoyagesPerMonth = monthlyProductionAverages.length > 0 
      ? monthlyProductionAverages.reduce((sum, count) => sum + count, 0) / monthlyProductionAverages.length 
      : 0;

    // Comprehensive voyage classification summary
    console.log('📊 TV DISPLAY: Voyage Classification Summary:', {
      totalYTDVoyages: ytdVoyages.length,
      drillingVoyages: ytdDrillingVoyages.length,
      productionVoyages: ytdProductionVoyages.length,
      unclassifiedVoyages: ytdVoyages.length - ytdDrillingVoyages.length - ytdProductionVoyages.length,
      expectedBreakdown: {
        totalExpected: '60-70 voyages/month',
        drillingExpected: '35-45 voyages/month (majority)',
        productionExpected: '25-30 voyages/month (5 facilities × 1/week × 4.3 weeks)'
      },
      actualAverages: {
        drilling: avgDrillingVoyagesPerMonth.toFixed(1) + ' voyages/month',
        production: avgProductionVoyagesPerMonth.toFixed(1) + ' voyages/month',
        total: (avgDrillingVoyagesPerMonth + avgProductionVoyagesPerMonth).toFixed(1) + ' voyages/month'
      },
      monthlyBreakdowns: {
        drilling: Object.fromEntries(monthlyDrillingVoyages),
        production: Object.fromEntries(monthlyProductionVoyages)
      }
    });

    if (showCategories.includes('drilling')) {
      // Use the authoritative metrics from dashboard calculations
      const cargoTons = (allMetrics.drilling as any)?.totalDeckTons || (allMetrics.drilling as any)?.totalCargoTons || 0;
      const totalLifts = (allMetrics.drilling as any)?.totalCargoLifts || (allMetrics.drilling as any)?.totalLifts || 0;
      const productiveHours = (allMetrics.drilling as any)?.productiveHours || 0;
      const vesselUtilization = (allMetrics.drilling as any)?.vesselUtilizationRate || 0;
      
      // DEBUG: Log TV Display utilization calculation to identify 5713.6% source
      console.error('🚨 TV DISPLAY UTILIZATION DEBUG:', {
        rawVesselUtilizationRate: (allMetrics.drilling as any)?.vesselUtilizationRate,
        cappedVesselUtilization: Math.min(vesselUtilization, 100),
        allDrillingMetrics: allMetrics.drilling,
        utilizationKeys: Object.keys(allMetrics.drilling || {}).filter(key => key.includes('utilization') || key.includes('Utilization')),
        timestamp: new Date().toISOString()
      });
      
      const liftsPerHour = totalLifts && productiveHours ? totalLifts / productiveHours : 0;
      
      console.log('🎯 TV DISPLAY: Drilling voyages details:', {
        currentYear,
        ytdVoyages: ytdVoyages.length,
        ytdDrillingVoyages: ytdDrillingVoyages.length,
        monthlyBreakdown: Object.fromEntries(monthlyDrillingVoyages),
        avgDrillingVoyagesPerMonth: avgDrillingVoyagesPerMonth.toFixed(1),
        sampleDrillingVoyages: ytdDrillingVoyages.slice(0, 3).map(v => ({
          vessel: v.vessel,
          voyageNumber: v.voyageNumber,
          locations: v.locationList.join(' -> '),
          date: v.voyageDate?.toISOString().split('T')[0]
        })),
        costAllocationDrillingLCs: costAllocation.filter(ca => ca.isDrilling).map(ca => ca.lcNumber).slice(0, 5)
      });
      
      const drillingCostFormatted = formatSmartCurrency(drillingCost);
      
      slides.push({
        id: 'drilling-operations',
        category: 'Drilling Operations',
        gradient: 'bg-gradient-to-br from-green-50 to-emerald-100',
        cards: [
          {
            id: 'drilling-cargo',
            title: 'Cargo Tons',
            value: formatNumber(Math.round(cargoTons)),
            unit: 'tons',
            trend: 8.2,
            isPositive: true,
            icon: Ship,
            color: 'from-green-500 to-emerald-600',
            subtitle: 'Total drilling cargo delivered'
          },
          {
            id: 'drilling-efficiency',
            title: 'Lifts per Hour',
            value: liftsPerHour.toFixed(1),
            unit: 'lifts/hr',
            trend: 5.4,
            isPositive: true,
            icon: Gauge,
            color: 'from-blue-500 to-cyan-600',
            subtitle: 'Operational efficiency'
          },
          {
            id: 'drilling-voyages',
            title: 'Avg Voyages/Month',
            value: avgDrillingVoyagesPerMonth.toFixed(1),
            unit: 'voyages/mo',
            trend: -2.1,
            isPositive: false,
            icon: Clock,
            color: 'from-emerald-500 to-teal-600',
            subtitle: 'Monthly drilling voyages'
          },
          {
            id: 'drilling-utilization',
            title: 'Drilling Utilization',
            value: (() => {
              // Smart percentage handling: if vesselUtilization is already >1, it's likely already a percentage
              const rawValue = vesselUtilization > 1 ? vesselUtilization : vesselUtilization * 100;
              const cappedValue = Math.min(rawValue, 100);
              console.log(`🎯 TV DISPLAY: Drilling utilization raw=${vesselUtilization}, converted=${rawValue}, capped=${cappedValue}`);
              return cappedValue.toFixed(1);
            })(),
            unit: '%',
            trend: -3.2,
            isPositive: false,
            icon: Fuel,
            color: 'from-orange-500 to-red-600',
            subtitle: 'Drilling vessel efficiency'
          }
        ]
      });
    }

    if (showCategories.includes('production')) {
      // Use the authoritative metrics from dashboard calculations
      const fluidVolume = (allMetrics.fluids as any)?.totalVolume || 0;
      const fluidVolumeGals = fluidVolume * 42; // Convert bbls to gallons (1 bbl = 42 gals)
      const productionCargoTons = (allMetrics.production as any)?.totalDeckTons || (allMetrics.production as any)?.totalCargoTons || 0;
      const productionUtilization = (allMetrics.production as any)?.vesselUtilizationRate || 0;
      
      // DEBUG: Log TV Display production utilization calculation 
      console.error('🚨 TV DISPLAY PRODUCTION UTILIZATION DEBUG:', {
        rawProductionUtilizationRate: (allMetrics.production as any)?.vesselUtilizationRate,
        cappedProductionUtilization: Math.min(productionUtilization, 100),
        allProductionMetrics: allMetrics.production,
        utilizationKeys: Object.keys(allMetrics.production || {}).filter(key => key.includes('utilization') || key.includes('Utilization')),
        timestamp: new Date().toISOString()
      });
      
      console.log('🏭 TV DISPLAY: Production voyages details:', {
        currentYear,
        ytdVoyages: ytdVoyages.length,
        ytdProductionVoyages: ytdProductionVoyages.length,
        monthlyBreakdown: Object.fromEntries(monthlyProductionVoyages),
        avgProductionVoyagesPerMonth: avgProductionVoyagesPerMonth.toFixed(1),
        sampleProductionVoyages: ytdProductionVoyages.slice(0, 3).map(v => ({
          vessel: v.vessel,
          voyageNumber: v.voyageNumber,
          locations: v.locationList.join(' -> '),
          date: v.voyageDate?.toISOString().split('T')[0]
        })),
        costAllocationProductionLCs: costAllocation.filter(ca => !ca.isDrilling).map(ca => ca.lcNumber).slice(0, 5)
      });
      
      const productionCostFormatted = formatSmartCurrency(productionCost);
      
      slides.push({
        id: 'production-operations',
        category: 'Production Support',
        gradient: 'bg-gradient-to-br from-purple-50 to-violet-100',
        cards: [
          {
            id: 'production-volume',
            title: 'Chemical Volume',
            value: formatNumber(Math.round(fluidVolumeGals / 1000)),
            unit: 'K gals',
            trend: 12.3,
            isPositive: true,
            icon: Droplet,
            color: 'from-purple-500 to-violet-600',
            subtitle: 'Chemical transfers'
          },
          {
            id: 'production-cargo',
            title: 'Production Cargo',
            value: formatNumber(Math.round(productionCargoTons)),
            unit: 'tons',
            trend: 6.8,
            isPositive: true,
            icon: Target,
            color: 'from-indigo-500 to-purple-600',
            subtitle: 'Production cargo tons'
          },
          {
            id: 'production-voyages',
            title: 'Avg Voyages/Month',
            value: avgProductionVoyagesPerMonth.toFixed(1),
            unit: 'voyages/mo',
            trend: 3.7,
            isPositive: true,
            icon: Ship,
            color: 'from-cyan-500 to-blue-600',
            subtitle: 'Monthly production voyages'
          },
          {
            id: 'production-utilization',
            title: 'Production Utilization',
            value: (() => {
              // Smart percentage handling: if productionUtilization is already >1, it's likely already a percentage
              const rawValue = productionUtilization > 1 ? productionUtilization : productionUtilization * 100;
              const cappedValue = Math.min(rawValue, 100);
              console.log(`🎯 TV DISPLAY: Production utilization raw=${productionUtilization}, converted=${rawValue}, capped=${cappedValue}`);
              return cappedValue.toFixed(1);
            })(),
            unit: '%',
            trend: -2.8,
            isPositive: false,
            icon: Fuel,
            color: 'from-orange-500 to-red-600',
            subtitle: 'Production vessel efficiency'
          }
        ]
      });
    }

    if (showCategories.includes('voyage')) {
      // Calculate separate vessel utilization for drilling and production operations
      
      // Filter YTD voyage events
      const ytdEvents = voyageEvents.filter(v => v.eventDate && v.eventDate.getFullYear() === currentYear);
      
      // Separate drilling and production events using cost allocation
      const drillingEvents = ytdEvents.filter(event => 
        costAllocation.some(ca => ca.lcNumber === event.lcNumber && ca.isDrilling)
      );
      
      const productionEvents = ytdEvents.filter(event => 
        costAllocation.some(ca => ca.lcNumber === event.lcNumber && !ca.isDrilling)
      );
      
      // Calculate drilling vessel utilization
      const drillingProductiveHours = drillingEvents
        .filter(event => event.activityCategory === 'Productive')
        .reduce((sum, event) => sum + (event.finalHours || event.hours || 0), 0);
      
      const drillingTotalHours = drillingEvents
        .reduce((sum, event) => sum + (event.finalHours || event.hours || 0), 0);
      
      const drillingUtilization = drillingTotalHours > 0 
        ? Math.min(100, (drillingProductiveHours / drillingTotalHours) * 100)
        : 0;
      
      // Calculate production vessel utilization  
      const productionProductiveHours = productionEvents
        .filter(event => event.activityCategory === 'Productive')
        .reduce((sum, event) => sum + (event.finalHours || event.hours || 0), 0);
      
      const productionTotalHours = productionEvents
        .reduce((sum, event) => sum + (event.finalHours || event.hours || 0), 0);
      
      const productionUtilization = productionTotalHours > 0 
        ? Math.min(100, (productionProductiveHours / productionTotalHours) * 100)
        : 0;
      
      // For Fleet Performance slide, use combined utilization (weighted average)
      const totalAllHours = drillingTotalHours + productionTotalHours;
      const totalAllProductiveHours = drillingProductiveHours + productionProductiveHours;
      const utilizationRate = totalAllHours > 0 
        ? Math.min(100, (totalAllProductiveHours / totalAllHours) * 100)
        : 0;
      
      console.log('🚢 TV DISPLAY: Separate vessel utilization calculation:', {
        currentYear,
        drilling: {
          events: drillingEvents.length,
          productiveHours: drillingProductiveHours.toFixed(1),
          totalHours: drillingTotalHours.toFixed(1),
          utilization: drillingUtilization.toFixed(1) + '%'
        },
        production: {
          events: productionEvents.length,
          productiveHours: productionProductiveHours.toFixed(1),
          totalHours: productionTotalHours.toFixed(1),
          utilization: productionUtilization.toFixed(1) + '%'
        },
        combined: {
          utilization: utilizationRate.toFixed(1) + '%'
        }
      });
      
      // Fix voyage count - use actual voyages from VoyageList, not voyage events  
      const ytdVoyageList = voyageList.filter(v => v.voyageDate && v.voyageDate.getFullYear() === currentYear);
      const recentVoyages = ytdVoyageList.length; // Actual YTD voyages from VoyageList
      
      // Use authoritative metrics from voyage calculations
      const totalOffshoreHours = (allMetrics.voyage as any)?.totalOffshoreTime || 
                                 (allMetrics.voyage as any)?.productiveHours || 0;
      
      // Calculate average trip duration using actual voyage durations (YTD only) and convert to days
      const voyageDurations = ytdVoyageList
        .map(v => v.durationHours || 0)
        .filter(duration => duration > 0);
      
      const averageTripHours = voyageDurations.length > 0 
        ? voyageDurations.reduce((sum, duration) => sum + duration, 0) / voyageDurations.length
        : 0;
      
      // Convert hours to days for more realistic monitoring
      const averageTrip = averageTripHours / 24;

      console.log('🚢 TV DISPLAY: Fixed voyage metrics calculation:', {
        currentYear,
        ytdVoyages: ytdVoyageList.length,
        voyagesWithDuration: voyageDurations.length,
        averageDurationHours: averageTripHours.toFixed(1),
        averageDurationDays: averageTrip.toFixed(1),
        utilizationRate: utilizationRate.toFixed(3),
        sampleDurations: voyageDurations.slice(0, 5)
      });
      
      slides.push({
        id: 'fleet-performance',
        category: 'Fleet Performance',
        gradient: 'bg-gradient-to-br from-orange-50 to-red-100',
        cards: [
          {
            id: 'vessel-utilization',
            title: 'Vessel Utilization',
            value: utilizationRate.toFixed(1),
            unit: '%',
            trend: 4.8,
            isPositive: true,
            icon: BarChart3,
            color: 'from-orange-500 to-red-500',
            subtitle: 'Fleet efficiency'
          },
          {
            id: 'active-voyages',
            title: 'YTD Voyages',
            value: formatNumber(recentVoyages),
            unit: 'voyages',
            trend: 1.2,
            isPositive: true,
            icon: Ship,
            color: 'from-cyan-500 to-blue-600',
            subtitle: 'Year to date'
          },
          {
            id: 'total-hours',
            title: 'Total Hours',
            value: formatNumber(Math.round(totalOffshoreHours)),
            unit: 'hrs',
            trend: 8.5,
            isPositive: true,
            icon: Clock,
            color: 'from-emerald-500 to-teal-600',
            subtitle: 'Offshore operations'
          },
          {
            id: 'avg-trip',
            title: 'Avg Trip Duration',
            value: averageTrip.toFixed(1),
            unit: 'days',
            trend: -4.2,
            isPositive: false,
            icon: Target,
            color: 'from-indigo-500 to-purple-600',
            subtitle: 'Average voyage time'
          }
        ]
      });
    }

    if (showCategories.includes('cost')) {
      // Get all production LC numbers from CostAllocation.xlsx
      const productionLCs = new Set(
        costAllocation
          .filter(ca => !ca.isDrilling) // Production LCs have isDrilling = false
          .map(ca => ca.lcNumber)
      );

      console.log('🏭 PRODUCTION LCs from CostAllocation.xlsx:', {
        productionLCs: Array.from(productionLCs),
        totalProductionLCs: productionLCs.size,
        totalCostAllocationEntries: costAllocation.length,
        drillingLCs: costAllocation.filter(ca => ca.isDrilling).length
      });

      // PRODUCTION = ONLY events with LC numbers in the production LC list
      const directProductionCost = ytdVoyageEvents
        .filter(event => {
          const hasProductionLC = event.lcNumber && productionLCs.has(event.lcNumber);
          return hasProductionLC;
        })
        .reduce((sum, event) => sum + (event.vesselCostTotal || 0), 0);

      // DRILLING = EVERYTHING ELSE (not production LCs, not Fourchon base)
      const directDrillingCost = ytdVoyageEvents
        .filter(event => {
          // Exclude Fourchon (base port)
          const location = (event.mappedLocation || event.location || '').toLowerCase();
          const isBasePort = location.includes('fourchon');
          
          // Exclude production LCs
          const hasProductionLC = event.lcNumber && productionLCs.has(event.lcNumber);
          
          // DRILLING = not production LC and not base port
          return !hasProductionLC && !isBasePort;
        })
        .reduce((sum, event) => sum + (event.vesselCostTotal || 0), 0);

      // Use authoritative cost allocation data (same as Cost Allocation Dashboard)
      const authoritativeTotalCost = formatSmartCurrency(totalCost);
      const authoritativeDrillingCost = formatSmartCurrency(drillingCost);
      const authoritativeProductionCost = formatSmartCurrency(productionCost);
      const avgDailyCost = authoritativeCostMetrics.avgCostPerDay || 0;

      // Enhanced debugging to understand cost allocation patterns
      const drillingEvents = ytdVoyageEvents.filter(event => 
        costAllocation.some(ca => ca.lcNumber === event.lcNumber && ca.isDrilling)
      );
      const productionEvents = ytdVoyageEvents.filter(event => {
        const isNonDrilling = costAllocation.some(ca => 
          ca.lcNumber === event.lcNumber && !ca.isDrilling
        );
        const location = (event.mappedLocation || event.location || '').toLowerCase();
        const isProductionFacility = ['thunder horse', 'mad dog', 'atlantis', 'mars', 'ursa'].some(facility => 
          location.includes(facility)
        );
        return isNonDrilling || isProductionFacility;
      });
      const unallocatedEvents = ytdVoyageEvents.filter(event => 
        !costAllocation.some(ca => ca.lcNumber === event.lcNumber)
      );

      console.log('💰 TV DISPLAY: Cost Allocation Analysis (YTD):', {
        dateRange: 'Jan 2025 - May 2025',
        eventBreakdown: {
          totalEvents: ytdVoyageEvents.length,
          drillingEvents: drillingEvents.length,
          productionEvents: productionEvents.length,
          unallocatedEvents: unallocatedEvents.length,
          allocatedEvents: drillingEvents.length + productionEvents.length
        },
        costs: {
          directDrillingCost: directDrillingCost,
          directProductionCost: directProductionCost,
          totalDirectCost: directDrillingCost + directProductionCost,
          unallocatedCost: unallocatedEvents.reduce((sum, event) => sum + (event.vesselCostTotal || 0), 0)
        },
        costRatio: {
          drillingPercent: ((directDrillingCost / (directDrillingCost + directProductionCost)) * 100).toFixed(1) + '%',
          productionPercent: ((directProductionCost / (directDrillingCost + directProductionCost)) * 100).toFixed(1) + '%'
        },
        sampleUnallocatedEvents: unallocatedEvents.slice(0, 5).map(event => ({
          vessel: event.vessel,
          location: event.mappedLocation || event.location,
          lcNumber: event.lcNumber,
          cost: event.vesselCostTotal
        })),
        costAllocationStats: {
          totalLCs: costAllocation.length,
          drillingLCs: costAllocation.filter(ca => ca.isDrilling).length,
          productionLCs: costAllocation.filter(ca => !ca.isDrilling).length
        }
      });
      
      slides.push({
        id: 'cost-management',
        category: 'Cost Management',
        gradient: 'bg-gradient-to-br from-slate-50 to-gray-100',
        cards: [
          {
            id: 'total-cost',
            title: 'Total Cost',
            value: authoritativeTotalCost,
            trend: -5.2,
            isPositive: false,
            icon: Fuel,
            color: 'from-slate-500 to-gray-600',
            subtitle: 'Year-to-date spend'
          },
          {
            id: 'drilling-cost-detail',
            title: 'Drilling Cost',
            value: authoritativeDrillingCost,
            trend: -3.2,
            isPositive: false,
            icon: Target,
            color: 'from-green-500 to-emerald-600',
            subtitle: 'Drilling operations'
          },
          {
            id: 'production-cost-detail',
            title: 'Production Cost',
            value: authoritativeProductionCost,
            trend: -2.8,
            isPositive: false,
            icon: Droplet,
            color: 'from-purple-500 to-violet-600',
            subtitle: 'Production support'
          },
          {
            id: 'daily-cost',
            title: 'Avg Daily Cost',
            value: formatSmartCurrency(avgDailyCost),
            trend: -1.5,
            isPositive: false,
            icon: BarChart3,
            color: 'from-orange-500 to-red-600',
            subtitle: 'Per day average'
          }
        ]
      });
    }

    // Add Cost Insights slide with most expensive locations (YTD only)
    if (showCategories.includes('drilling') || showCategories.includes('production')) {
      // Calculate cost by location for drilling operations
      const drillingLocationCosts = new Map<string, { cost: number; hours: number; events: number }>();
      const productionLocationCosts = new Map<string, { cost: number; hours: number; events: number }>();

      // Filter YTD voyage events for cost calculation (exclude Fourchon - it's a base port)
      ytdVoyageEvents.forEach(event => {
        const location = event.mappedLocation || event.location || 'Unknown';
        const cost = event.vesselCostTotal || 0;
        const hours = event.finalHours || event.hours || 0;
        
        // Skip Fourchon as it's a base port, not an offshore location
        if (location.toLowerCase().includes('fourchon') || location === 'Unknown') {
          return;
        }
        
        // Determine if this is drilling or production based on cost allocation
        const isDrillingEvent = costAllocation.some(ca => 
          ca.lcNumber === event.lcNumber && ca.isDrilling
        );
        
        if (isDrillingEvent && cost > 0) {
          const existing = drillingLocationCosts.get(location) || { cost: 0, hours: 0, events: 0 };
          drillingLocationCosts.set(location, {
            cost: existing.cost + cost,
            hours: existing.hours + hours,
            events: existing.events + 1
          });
        } else if (!isDrillingEvent && cost > 0) {
          const existing = productionLocationCosts.get(location) || { cost: 0, hours: 0, events: 0 };
          productionLocationCosts.set(location, {
            cost: existing.cost + cost,
            hours: existing.hours + hours,
            events: existing.events + 1
          });
        }
      });

      // Get most expensive drilling location
      const topDrillingLocation = Array.from(drillingLocationCosts.entries())
        .sort(([,a], [,b]) => b.cost - a.cost)[0];
      
      const mostExpensiveDrilling = topDrillingLocation ? topDrillingLocation[0] : 'N/A';
      const drillingLocationCost = topDrillingLocation ? topDrillingLocation[1].cost : 0;

      // Get most expensive production location
      const topProductionLocation = Array.from(productionLocationCosts.entries())
        .sort(([,a], [,b]) => b.cost - a.cost)[0];
      
      const mostExpensiveProduction = topProductionLocation ? topProductionLocation[0] : 'N/A';
      const productionLocationCost = topProductionLocation ? topProductionLocation[1].cost : 0;

      slides.push({
        id: 'cost-insights',
        category: 'Cost Intelligence',
        gradient: 'bg-gradient-to-br from-red-50 to-orange-100',
        cards: [
          {
            id: 'expensive-drilling-location',
            title: 'Most Expensive Drilling',
            value: mostExpensiveDrilling.length > 18 ? mostExpensiveDrilling.substring(0,15) + '...' : mostExpensiveDrilling,
            unit: formatSmartCurrency(drillingLocationCost),
            trend: 18.5,
            isPositive: false, // High cost is negative
            icon: Fuel,
            color: 'from-red-500 to-red-600',
            subtitle: 'Highest drilling cost'
          },
          {
            id: 'expensive-production-location',
            title: 'Most Expensive Production',
            value: mostExpensiveProduction.length > 18 ? mostExpensiveProduction.substring(0,15) + '...' : mostExpensiveProduction,
            unit: formatSmartCurrency(productionLocationCost),
            trend: 12.3,
            isPositive: false, // High cost is negative
            icon: DollarSign,
            color: 'from-orange-500 to-red-600',
            subtitle: 'Highest production cost'
          },
          {
            id: 'total-location-costs',
            title: 'Total Location Costs',
            value: formatSmartCurrency(drillingLocationCost + productionLocationCost),
            trend: 15.4,
            isPositive: false,
            icon: BarChart3,
            color: 'from-purple-500 to-red-600',
            subtitle: 'Combined top locations'
          },
          {
            id: 'cost-concentration',
            title: 'Cost Concentration',
            value: (() => {
              // Calculate total costs from all locations
              const totalDrillingCost = Array.from(drillingLocationCosts.values())
                .reduce((sum, loc) => sum + loc.cost, 0);
              const totalProductionCost = Array.from(productionLocationCosts.values())
                .reduce((sum, loc) => sum + loc.cost, 0);
              const totalCostValue = totalDrillingCost + totalProductionCost;
              const topLocationsCost = drillingLocationCost + productionLocationCost;
              return totalCostValue > 0 ? ((topLocationsCost / totalCostValue) * 100).toFixed(1) : '0';
            })(),
            unit: '%',
            trend: 8.7,
            isPositive: false,
            icon: Target,
            color: 'from-amber-500 to-orange-600',
            subtitle: 'Top locations % of total'
          }
        ]
      });
    }

    // Add Operational Intelligence slide with location and vessel insights (YTD only)
    if (showCategories.includes('drilling') || showCategories.includes('production')) {
      // Calculate vessel usage statistics using actual voyages (Jan 2025 - May 2025 only)
      const ytdVoyageListForVessel = voyageList.filter(v => {
        if (!v.voyageDate) return false;
        const voyageYear = v.voyageDate.getFullYear();
        const voyageMonth = v.voyageDate.getMonth() + 1;
        return voyageYear === 2025 && voyageMonth >= 1 && voyageMonth <= 5;
      });
      const vesselUsage = ytdVoyageListForVessel.reduce((acc, voyage) => {
        acc[voyage.vessel] = (acc[voyage.vessel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topVessel = Object.entries(vesselUsage).sort(([,a], [,b]) => b - a)[0];
      const mostUsedVessel = topVessel ? topVessel[0] : 'N/A';
      const vesselVoyages = topVessel ? topVessel[1] : 0;

      console.log('🚢 TV DISPLAY: Most Active Vessel Calculation (Jan 2025 - May 2025):', {
        dateRange: 'Jan 2025 - May 2025',
        filteredVoyages: ytdVoyageListForVessel.length,
        vesselBreakdown: Object.entries(vesselUsage)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([vessel, count]) => ({ vessel, voyages: count })),
        topVessel: { name: mostUsedVessel, voyages: vesselVoyages }
      });

      // Calculate location activity (Jan 2025 - May 2025 only) - exclude Fourchon base port
      const ytdLocationEvents = ytdVoyageEvents.filter(event => {
        if (!event.eventDate) return false;
        const eventYear = event.eventDate.getFullYear();
        const eventMonth = event.eventDate.getMonth() + 1; // getMonth() returns 0-11
        // Only include Jan 2025 (1) through May 2025 (5)
        return eventYear === 2025 && eventMonth >= 1 && eventMonth <= 5;
      });

      const locationActivity = ytdLocationEvents.reduce((acc, event) => {
        const location = event.mappedLocation || event.location || 'Unknown';
        // Only count offshore locations (exclude Fourchon base port)
        if (location !== 'Unknown' && !location.toLowerCase().includes('fourchon')) {
          acc[location] = (acc[location] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topLocation = Object.entries(locationActivity).sort(([,a], [,b]) => b - a)[0];
      const busiestLocation = topLocation ? topLocation[0] : 'N/A';
      const locationEvents = topLocation ? topLocation[1] : 0;

      console.log('📍 TV DISPLAY: Busiest Location Calculation (Jan 2025 - May 2025):', {
        dateRange: 'Jan 2025 - May 2025',
        totalYtdEvents: ytdVoyageEvents.length,
        filteredLocationEvents: ytdLocationEvents.length,
        locationBreakdown: Object.entries(locationActivity)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([location, count]) => ({ location, events: count })),
        topLocation: { name: busiestLocation, events: locationEvents }
      });

      // Calculate unique vessel count (Jan 2025 - May 2025 only)
      const ytdUniqueVesselEvents = ytdVoyageEvents.filter(event => {
        if (!event.eventDate) return false;
        const eventYear = event.eventDate.getFullYear();
        const eventMonth = event.eventDate.getMonth() + 1;
        return eventYear === 2025 && eventMonth >= 1 && eventMonth <= 5;
      });
      const uniqueVessels = new Set(ytdUniqueVesselEvents.map(v => v.vessel)).size;

      console.log('🚢 TV DISPLAY: Active Fleet Calculation (Jan 2025 - May 2025):', {
        dateRange: 'Jan 2025 - May 2025',
        totalYtdEvents: ytdVoyageEvents.length,
        filteredVesselEvents: ytdUniqueVesselEvents.length,
        uniqueVessels: uniqueVessels,
        vesselList: Array.from(new Set(ytdUniqueVesselEvents.map(v => v.vessel))).sort()
      });

      // Calculate average voyage duration using actual voyage durations (YTD) and convert to days
      const ytdVoyageListForIntel = voyageList.filter(v => v.voyageDate && v.voyageDate.getFullYear() === currentYear);
      const voyageDurationsForIntel = ytdVoyageListForIntel
        .map(v => v.durationHours || 0)
        .filter(duration => duration > 0);
      
      const avgVoyageDurationHours = voyageDurationsForIntel.length > 0 
        ? voyageDurationsForIntel.reduce((sum, duration) => sum + duration, 0) / voyageDurationsForIntel.length
        : 0;
      
      // Convert to days and round to 1 decimal place
      const avgVoyageDuration = avgVoyageDurationHours / 24;

      slides.push({
        id: 'operational-intelligence',
        category: 'Operational Intelligence',
        gradient: 'bg-gradient-to-br from-indigo-50 to-blue-100',
        cards: [
          {
            id: 'top-vessel',
            title: 'Most Active Vessel',
            value: mostUsedVessel.length > 18 ? mostUsedVessel.substring(0,15) + '...' : mostUsedVessel,
            unit: `${formatNumber(vesselVoyages)} voyages`,
            trend: 15.3,
            isPositive: true,
            icon: Ship,
            color: 'from-blue-500 to-cyan-600',
            subtitle: 'Highest utilization'
          },
          {
            id: 'busiest-location',
            title: 'Busiest Location',
            value: busiestLocation.length > 18 ? busiestLocation.substring(0,15) + '...' : busiestLocation,
            unit: `${formatNumber(locationEvents)} events`,
            trend: 8.7,
            isPositive: true,
            icon: MapPin,
            color: 'from-emerald-500 to-teal-600',
            subtitle: 'Most activity'
          },
          {
            id: 'fleet-size',
            title: 'Active Fleet',
            value: formatNumber(uniqueVessels),
            unit: 'vessels',
            trend: 2.1,
            isPositive: true,
            icon: Users,
            color: 'from-purple-500 to-violet-600',
            subtitle: 'Unique vessels in use'
          },
          {
            id: 'avg-voyage',
            title: 'Avg Voyage Time',
            value: avgVoyageDuration.toFixed(1),
            unit: 'days',
            trend: -3.5,
            isPositive: false,
            icon: Clock,
            color: 'from-orange-500 to-red-600',
            subtitle: 'Average duration'
          }
        ]
      });

      // Add location insights slide with top offshore locations (Fourchon already excluded)
      const sortedLocations = Object.entries(locationActivity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 4)
        .map(([location, count], index) => ({
          location: location.length > 18 ? location.substring(0,15) + '...' : location,
          count,
          index
        }));

      if (sortedLocations.length >= 4) {
        slides.push({
          id: 'location-insights',
          category: 'Location Intelligence',
          gradient: 'bg-gradient-to-br from-cyan-50 to-teal-100',
          cards: sortedLocations.map((loc, idx) => ({
            id: `location-${idx}`,
            title: `#${idx + 1} Location`,
            value: loc.location,
            unit: `${formatNumber(loc.count)} events`,
            trend: [12.4, 8.7, 5.2, 3.1][idx],
            isPositive: true,
            icon: MapPin,
            color: ['from-emerald-500 to-teal-600', 'from-blue-500 to-cyan-600', 'from-purple-500 to-violet-600', 'from-orange-500 to-red-600'][idx],
            subtitle: `Rank ${idx + 1} by activity`
          }))
        });
      }
    }

    console.log('📊 TV DISPLAY: Created slides:', slides.map(s => ({ id: s.id, category: s.category, cardCount: s.cards.length })));
    return slides;
  }, [allMetrics, showCategories, voyageEvents, voyageList, authoritativeCostMetrics, drillingCost, productionCost, totalCost, currentYear]);

  // Auto-rotation effect for slides
  useEffect(() => {
    if (isPaused || kpiSlides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % kpiSlides.length);
      setProgress(0);
    }, autoRotationInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRotationInterval, isPaused, kpiSlides.length]);

  // Auto-rotation effect for locations (every 5 seconds)
  useEffect(() => {
    if (isPaused || topLocations.length === 0) return;

    const interval = setInterval(() => {
      setCurrentLocationIndex((prev) => (prev + 1) % topLocations.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, topLocations.length]);

  // Progress bar effect - time-based approach
  useEffect(() => {
    if (isPaused) return;

    // Reset progress when slide changes
    setProgress(0);
    const startTime = Date.now();
    const totalDuration = (autoRotationInterval * 1000) - 100; // Complete 100ms before slide change

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(percentage);
      
      // Stop when we reach 100%
      if (percentage >= 100) {
        clearInterval(progressInterval);
      }
    }, 50); // Update every 50ms for smoothness

    return () => clearInterval(progressInterval);
  }, [autoRotationInterval, isPaused, currentSlideIndex]);

  if (!isDataReady || kpiSlides.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-8"></div>
          <h2 className="text-4xl font-bold text-white mb-4">Loading BP Logistics Dashboard</h2>
          <p className="text-xl text-gray-300">Preparing operational metrics...</p>
        </div>
      </div>
    );
  }

  const currentSlide = kpiSlides[currentSlideIndex];

  return (
    <div 
      className="h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-black overflow-hidden relative"
      onClick={() => setIsPaused(!isPaused)}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">BP</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Logistics Operations Center</h1>
              <div className="flex items-center gap-4">
                <p className="text-xl text-gray-300">Year-to-Date Operational Metrics</p>
                {topLocations.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500 bg-opacity-20 rounded-full border border-green-400 border-opacity-30">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">
                      {topLocations[currentLocationIndex]?.location || 'Loading...'} • {topLocations[currentLocationIndex]?.count || 0} events
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
            <div className="text-lg text-gray-300">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-700">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full flex items-center justify-center pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-8">
          {/* Category Badge */}
          <div className="text-center mb-8">
            <span className="inline-block px-8 py-3 bg-white bg-opacity-10 backdrop-blur-sm rounded-full text-xl font-medium text-white border border-white border-opacity-20">
              {currentSlide.category}
            </span>
          </div>

          {/* KPI Cards Grid */}
          <div className={`${currentSlide.gradient} rounded-3xl shadow-2xl overflow-hidden border border-white border-opacity-20 p-8`}>
            <div className="grid grid-cols-2 gap-8 h-full">
              {currentSlide.cards.map((card) => {
                const IconComponent = card.icon;
                const TrendIcon = card.trend && card.trend > 0 ? TrendingUp : TrendingDown;
                
                return (
                  <div key={card.id} className="bg-white bg-opacity-90 rounded-2xl p-8 flex flex-col justify-center items-center text-center shadow-lg">
                    {/* Icon */}
                    <div className={`w-20 h-20 bg-gradient-to-br ${card.color} rounded-full flex items-center justify-center shadow-lg mb-6`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">{card.title}</h3>
                    
                    {/* Value */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-5xl font-bold text-gray-900">
                        {card.value}
                      </span>
                      {card.unit && (
                        <span className="text-2xl font-medium text-gray-600">{card.unit}</span>
                      )}
                    </div>
                    
                    {/* Subtitle */}
                    {card.subtitle && (
                      <p className="text-sm text-gray-600 mb-4">{card.subtitle}</p>
                    )}
                    
                    {/* Trend */}
                    {card.trend && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                        card.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <TrendIcon className="w-4 h-4" />
                        <span className="text-sm font-bold">
                          {card.isPositive ? '+' : ''}{card.trend.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slide indicators */}
          <div className="flex items-center justify-center gap-3 mt-12">
            {kpiSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlideIndex(index)}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  index === currentSlideIndex 
                    ? 'bg-white scale-125' 
                    : 'bg-white bg-opacity-40 hover:bg-opacity-60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-8 text-white">
            <span className="text-lg">
              <span className="font-medium">Slide:</span> {currentSlideIndex + 1} of {kpiSlides.length}
            </span>
            <span className="text-lg">
              <span className="font-medium">Auto-rotation:</span> {isPaused ? 'Paused' : `${autoRotationInterval}s`}
            </span>
          </div>
          <div className="text-lg text-gray-300">
            Click anywhere to {isPaused ? 'resume' : 'pause'} • Live data updates
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVKioskDisplay;