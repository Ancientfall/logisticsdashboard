// src/hooks/useNotificationIntegration.ts
// Hook to integrate notifications with data processing and analytics

import { useEffect, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useData } from '../context/DataContext';

export const useNotificationIntegration = () => {
  const { addNotification } = useNotifications();
  const { 
    voyageEvents, 
    costAllocation,
    isDataReady,
    lastUpdated 
  } = useData();

  // Check data quality and create notifications
  const checkDataQuality = useCallback(() => {
    if (!isDataReady) return;

    // Check for missing vessel information
    const missingVesselEvents = voyageEvents.filter(event => !event.vessel || event.vessel.trim() === '');
    if (missingVesselEvents.length > 0) {
      addNotification('missing-vessel-info', { 
        count: missingVesselEvents.length 
      });
    }

    // Check for zero-hour events
    const zeroHourEvents = voyageEvents.filter(event => event.hours === 0);
    if (zeroHourEvents.length > 0) {
      addNotification('zero-hour-events', { 
        count: zeroHourEvents.length 
      });
    }

    // Check for missing locations
    const missingLocationEvents = voyageEvents.filter(event => 
      !event.location || event.location.trim() === '' || 
      event.location.toLowerCase() === 'unknown'
    );
    if (missingLocationEvents.length > 0) {
      addNotification('missing-locations', { 
        count: missingLocationEvents.length 
      });
    }

    // Check for duplicate voyage events
    const eventMap = new Map<string, number>();
    voyageEvents.forEach(event => {
      const key = `${event.vessel}-${event.voyageNumber}-${event.eventDate}`;
      eventMap.set(key, (eventMap.get(key) || 0) + 1);
    });
    const duplicateCount = Array.from(eventMap.values()).filter(count => count > 1).length;
    if (duplicateCount > 0) {
      addNotification('duplicate-records', { 
        count: duplicateCount,
        recordType: 'voyage event'
      });
    }
  }, [voyageEvents, isDataReady, addNotification]);

  // Check for threshold alerts
  const checkThresholdAlerts = useCallback(() => {
    if (!isDataReady) return;

    // Check vessel utilization
    const vesselUtilizationMap = new Map<string, { totalHours: number, activeHours: number }>();
    
    voyageEvents.forEach(event => {
      if (!event.vessel) return;
      
      const stats = vesselUtilizationMap.get(event.vessel) || { totalHours: 0, activeHours: 0 };
      stats.totalHours += event.hours;
      
      if (event.activityCategory === 'Productive') {
        stats.activeHours += event.hours;
      }
      
      vesselUtilizationMap.set(event.vessel, stats);
    });

    vesselUtilizationMap.forEach((stats, vessel) => {
      const utilization = stats.totalHours > 0 ? (stats.activeHours / stats.totalHours) * 100 : 0;
      if (utilization < 60 && stats.totalHours > 100) {
        addNotification('vessel-utilization', {
          vesselName: vessel,
          utilization: Math.round(utilization),
          target: 60
        });
      }
    });

    // Check for high-cost allocations
    const highCostThreshold = 1000000; // $1M
    const highCostAllocations = costAllocation.filter(ca => 
      ca.totalCost && ca.totalCost > highCostThreshold
    );

    highCostAllocations.forEach(ca => {
      addNotification('high-cost', {
        entity: ca.lcNumber,
        current: ca.totalCost,
        threshold: highCostThreshold,
        percentage: Math.round(((ca.totalCost! - highCostThreshold) / highCostThreshold) * 100)
      });
    });

    // Check for unusual voyage durations
    const avgDurationByRoute = new Map<string, { total: number, count: number }>();
    
    voyageEvents.forEach(event => {
      if (!event.location || !event.mappedLocation) return;
      const route = `${event.location}-${event.mappedLocation}`;
      const stats = avgDurationByRoute.get(route) || { total: 0, count: 0 };
      stats.total += event.hours;
      stats.count += 1;
      avgDurationByRoute.set(route, stats);
    });

    voyageEvents.forEach(event => {
      if (!event.location || !event.mappedLocation) return;
      const route = `${event.location}-${event.mappedLocation}`;
      const stats = avgDurationByRoute.get(route);
      if (stats && stats.count > 5) {
        const avgDuration = stats.total / stats.count;
        const variance = Math.abs(event.hours - avgDuration) / avgDuration;
        
        if (variance > 0.5 && event.hours > 24) { // 50% variance and more than 24 hours
          addNotification('unusual-voyage-duration', {
            voyageId: `${event.vessel}-${event.voyageNumber}`,
            duration: Math.round(event.hours),
            percentage: Math.round(variance * 100)
          });
        }
      }
    });
  }, [voyageEvents, costAllocation, isDataReady, addNotification]);

  // Check for operational insights
  const checkOperationalInsights = useCallback(() => {
    if (!isDataReady || voyageEvents.length === 0) return;

    // Calculate month-over-month improvements
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthEvents = voyageEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });

    const lastMonthEvents = voyageEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const year = currentMonth === 0 ? currentYear - 1 : currentYear;
      return eventDate.getMonth() === lastMonth && eventDate.getFullYear() === year;
    });

    if (currentMonthEvents.length > 0 && lastMonthEvents.length > 0) {
      // Calculate efficiency metrics
      const currentEfficiency = currentMonthEvents.filter(e => e.activityCategory === 'Productive').length / currentMonthEvents.length;
      const lastEfficiency = lastMonthEvents.filter(e => e.activityCategory === 'Productive').length / lastMonthEvents.length;
      
      const improvement = ((currentEfficiency - lastEfficiency) / lastEfficiency) * 100;
      
      if (improvement > 10) {
        addNotification('efficiency-improvement', {
          metric: 'Productive Activity Rate',
          percentage: Math.round(improvement),
          period: 'month'
        });
      }

      // Monthly comparison summary
      const currentCost = currentMonthEvents.reduce((sum, e) => sum + (e.vesselCostTotal || 0), 0);
      const lastCost = lastMonthEvents.reduce((sum, e) => sum + (e.vesselCostTotal || 0), 0);
      const costChange = ((currentCost - lastCost) / lastCost) * 100;

      addNotification('monthly-comparison', {
        month: new Date().toLocaleString('default', { month: 'long' }),
        summary: `${currentMonthEvents.length} events processed`,
        highlight: costChange < 0 
          ? `Cost reduced by ${Math.abs(Math.round(costChange))}%`
          : `Efficiency improved by ${Math.round(improvement)}%`
      });
    }

    // Check for cost optimization opportunities
    const routeFrequency = new Map<string, number>();
    voyageEvents.forEach(event => {
      if (event.location && event.mappedLocation) {
        const route = `${event.location} to ${event.mappedLocation}`;
        routeFrequency.set(route, (routeFrequency.get(route) || 0) + 1);
      }
    });

    routeFrequency.forEach((frequency, route) => {
      if (frequency > 10) {
        const estimatedSavings = frequency * 5000; // Rough estimate
        addNotification('cost-optimization', {
          route,
          savings: estimatedSavings
        });
      }
    });
  }, [voyageEvents, isDataReady, addNotification]);

  // Check if data needs refresh
  const checkDataFreshness = useCallback(() => {
    if (!lastUpdated) return;

    const daysSinceUpdate = Math.floor((new Date().getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate > 7) {
      addNotification('refresh-reminder', {
        daysAgo: daysSinceUpdate
      });
    }
  }, [lastUpdated, addNotification]);

  // Run checks when data changes
  useEffect(() => {
    if (isDataReady) {
      // Delay checks to avoid overwhelming the user immediately
      const timeouts = [
        setTimeout(() => checkDataQuality(), 1000),
        setTimeout(() => checkThresholdAlerts(), 2000),
        setTimeout(() => checkOperationalInsights(), 3000),
        setTimeout(() => checkDataFreshness(), 4000)
      ];

      return () => timeouts.forEach(timeout => clearTimeout(timeout));
    }
  }, [isDataReady, checkDataQuality, checkThresholdAlerts, checkOperationalInsights, checkDataFreshness]);

  // Function to notify processing complete
  const notifyProcessingComplete = useCallback((totalRecords: number, duration: number) => {
    addNotification('processing-complete', {
      totalRecords,
      duration: `${Math.round(duration / 1000)}s`
    });
  }, [addNotification]);

  // Function to notify upload success
  const notifyUploadSuccess = useCallback((fileName: string, recordCount: number) => {
    addNotification('upload-success', {
      fileName,
      recordCount
    });
  }, [addNotification]);

  // Function to notify incremental update
  const notifyIncrementalUpdate = useCallback((newRecords: number, updatedRecords: number) => {
    addNotification('incremental-update', {
      newRecords,
      updatedRecords
    });
  }, [addNotification]);

  // Function to notify export complete
  const notifyExportComplete = useCallback((exportType: string, fileName: string) => {
    addNotification('export-complete', {
      exportType,
      fileName
    });
  }, [addNotification]);

  // Function to check storage and notify if needed
  const checkStorageSpace = useCallback(async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage && estimate.quota) {
        const percentageUsed = (estimate.usage / estimate.quota) * 100;
        if (percentageUsed > 80) {
          addNotification('storage-warning', {
            percentage: Math.round(percentageUsed)
          });
        }
      }
    }
  }, [addNotification]);

  return {
    notifyProcessingComplete,
    notifyUploadSuccess,
    notifyIncrementalUpdate,
    notifyExportComplete,
    checkStorageSpace,
    checkDataQuality,
    checkThresholdAlerts,
    checkOperationalInsights
  };
};