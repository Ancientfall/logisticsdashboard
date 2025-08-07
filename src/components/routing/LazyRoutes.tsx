/**
 * Lazy-loaded routes for performance optimization
 * Implements code splitting to reduce initial bundle size
 */

import React, { Suspense } from 'react';
import { LoadingSpinner } from '../ui/LoadingSystem';

// Lazy load all dashboard components
const LandingPage = React.lazy(() => import('../LandingPage'));
const DashboardShowcase = React.lazy(() => import('../DashboardShowcase'));
const EnhancedFileUploadWithServer = React.lazy(() => import('../EnhancedFileUploadWithServer'));

// Dashboard components
const MainDashboard = React.lazy(() => import('../dashboard/MainDashboard'));
const DrillingDashboard = React.lazy(() => import('../dashboard/DrillingDashboard'));
const ProductionDashboard = React.lazy(() => import('../dashboard/ProductionDashboard'));
const VoyageAnalyticsDashboard = React.lazy(() => import('../dashboard/VoyageAnalyticsDashboard'));
const CostAllocationManagerRedesigned = React.lazy(() => import('../dashboard/CostAllocationManagerRedesigned'));
const ComparisonDashboard = React.lazy(() => import('../dashboard/ComparisonDashboard'));
const BulkActionsDashboard = React.lazy(() => import('../dashboard/BulkActionsDashboard'));
const VesselRequirementDashboard = React.lazy(() => import('../dashboard/VesselRequirementDashboard'));
const VesselForecastDashboard = React.lazy(() => import('../dashboard/VesselForecastDashboard'));

// Admin and special components
const AdminDashboard = React.lazy(() => import('../admin/AdminDashboard'));
const ReferenceDataManager = React.lazy(() => import('../admin/ReferenceDataManager'));
const TVKioskDisplay = React.lazy(() => import('../TVKioskDisplay'));
const AviationDashboard = React.lazy(() => import('../aviation/AviationDashboard'));

/**
 * Higher-order component for consistent loading states
 */
const withLazyLoading = <P extends object>(Component: React.LazyExoticComponent<React.ComponentType<P>>) => {
  return (props: P) => (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner 
          state="loading" 
          size="lg" 
          message="Loading dashboard..." 
        />
      </div>
    }>
      <Component {...props} />
    </Suspense>
  );
};

// Export wrapped components
export const LazyLandingPage = withLazyLoading(LandingPage);
export const LazyDashboardShowcase = withLazyLoading(DashboardShowcase);
export const LazyFileUpload = withLazyLoading(EnhancedFileUploadWithServer);

export const LazyMainDashboard = withLazyLoading(MainDashboard);
export const LazyDrillingDashboard = withLazyLoading(DrillingDashboard);
export const LazyProductionDashboard = withLazyLoading(ProductionDashboard);
export const LazyVoyageAnalyticsDashboard = withLazyLoading(VoyageAnalyticsDashboard);
export const LazyCostAllocationManagerRedesigned = withLazyLoading(CostAllocationManagerRedesigned);
export const LazyComparisonDashboard = withLazyLoading(ComparisonDashboard);
export const LazyBulkActionsDashboard = withLazyLoading(BulkActionsDashboard);
export const LazyVesselRequirementDashboard = withLazyLoading(VesselRequirementDashboard);
export const LazyVesselForecastDashboard = withLazyLoading(VesselForecastDashboard);

export const LazyAdminDashboard = withLazyLoading(AdminDashboard);
export const LazyReferenceDataManager = withLazyLoading(ReferenceDataManager);
export const LazyTVKioskDisplay = withLazyLoading(TVKioskDisplay);
export const LazyAviationDashboard = withLazyLoading(AviationDashboard);

/**
 * Preload critical routes for better UX
 */
export const preloadCriticalRoutes = () => {
  // Preload commonly accessed routes by triggering their lazy imports
  setTimeout(() => {
    import('../DashboardShowcase');
    import('../dashboard/MainDashboard');
    import('../dashboard/DrillingDashboard');
  }, 100);
};

/**
 * Preload route based on user intent (hover, etc.)
 */
export const preloadRoute = (routeName: string) => {
  const preloadMap: Record<string, () => Promise<any>> = {
    'landing': () => import('../LandingPage'),
    'dashboards': () => import('../DashboardShowcase'),
    'upload': () => import('../EnhancedFileUploadWithServer'),
    'dashboard': () => import('../dashboard/MainDashboard'),
    'drilling': () => import('../dashboard/DrillingDashboard'),
    'production': () => import('../dashboard/ProductionDashboard'),
    'voyage': () => import('../dashboard/VoyageAnalyticsDashboard'),
    'cost': () => import('../dashboard/CostAllocationManagerRedesigned'),
    'comparison': () => import('../dashboard/ComparisonDashboard'),
    'bulk': () => import('../dashboard/BulkActionsDashboard'),
    'vessel-requirements': () => import('../dashboard/VesselRequirementDashboard'),
    'vessel-forecast': () => import('../dashboard/VesselForecastDashboard'),
    'admin': () => import('../admin/AdminDashboard'),
    'admin-reference': () => import('../admin/ReferenceDataManager'),
    'tv-display': () => import('../TVKioskDisplay'),
    'aviation': () => import('../aviation/AviationDashboard'),
  };

  const preloadFunc = preloadMap[routeName];
  if (preloadFunc) {
    preloadFunc().catch(error => {
      console.warn('Route preload failed:', routeName, error);
    });
  }
};