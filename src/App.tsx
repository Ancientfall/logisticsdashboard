// src/App.tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import FileUploadPage from './components/dashboard/FileUploadPage';
import MainDashboard from './components/dashboard/MainDashboard';
import LandingPage from './components/LandingPage';
import DashboardSelector from './components/DashboardSelector';
import { DataProvider, useData } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';
import DrillingDashboard from './components/dashboard/DrillingDashboard';
import VoyageAnalyticsDashboard from './components/dashboard/VoyageAnalyticsDashboard';
import CostAllocationManagerRedesigned from './components/dashboard/CostAllocationManagerRedesigned';
import ProductionDashboard from './components/dashboard/ProductionDashboard';
import ComparisonDashboard from './components/dashboard/ComparisonDashboard';
import BulkActionsDashboard from './components/dashboard/BulkActionsDashboard';
import { useNotificationIntegration } from './hooks/useNotificationIntegration';

// Main application content component
const AppContent: React.FC = () => {
  // Initialize notification integration
  useNotificationIntegration();
  const { isDataReady, isLoading, voyageEvents, vesselManifests, costAllocation } = useData();
  const [currentView, setCurrentView] = useState<'landing' | 'upload' | 'selector' | 'dashboard' | 'drilling' | 'production' | 'comparison' | 'voyage' | 'cost' | 'bulk'>('landing');
  
  // Handle navigation based on data ready state
  useEffect(() => {
    console.log('🔄 App: isDataReady changed to:', isDataReady);
    console.log('📊 App: Data counts:', {
      voyageEvents: voyageEvents.length,
      vesselManifests: vesselManifests.length,
      costAllocation: costAllocation.length
    });
    console.log('🎯 App: Current view:', currentView);
    
    // Only auto-redirect to selector if data becomes ready and we're on upload page
    if (isDataReady && currentView === 'upload') {
      console.log('🎯 App: Data is ready, navigating to dashboard selector...');
      setCurrentView('selector');
    } else if (!isDataReady && (currentView === 'selector' || currentView === 'dashboard' || currentView === 'drilling' || currentView === 'production' || currentView === 'comparison' || currentView === 'voyage' || currentView === 'cost' || currentView === 'bulk')) {
      console.log('❌ App: Data not ready, redirecting to upload...');
      setCurrentView('upload');
    }
    // Note: We don't automatically redirect from other views anymore
  }, [isDataReady, currentView, voyageEvents.length, vesselManifests.length, costAllocation.length]);

  // Show loading state during processing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl mb-6">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Data</h2>
          <p className="text-gray-600">
            Please wait while we process your Excel files and prepare the dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Function to handle navigation from landing page
  const handleGetStarted = () => {
    setCurrentView('upload');
  };

  const handleViewDashboard = () => {
    if (isDataReady) {
      setCurrentView('selector');
    } else {
      setCurrentView('upload');
    }
  };

  const handleNavigateHome = () => {
    // If data is loaded, go to dashboard selector instead of landing page
    if (isDataReady) {
      setCurrentView('selector');
    } else {
      setCurrentView('landing');
    }
  };

  const handleNavigateToDashboard = () => {
    if (isDataReady) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('upload');
    }
  };

  // Navigation functions for different dashboard views
  const handleNavigateToDrilling = () => {
    if (isDataReady) {
      setCurrentView('drilling');
    } else {
      setCurrentView('upload');
    }
  };

  const handleNavigateToProduction = () => {
    if (isDataReady) {
      setCurrentView('production');
    } else {
      setCurrentView('upload');
    }
  };

  const handleNavigateToComparison = () => {
    if (isDataReady) {
      setCurrentView('comparison');
    } else {
      setCurrentView('upload');
    }
  };

  const handleNavigateToVoyage = () => {
    if (isDataReady) {
      setCurrentView('voyage');
    } else {
      setCurrentView('upload');
    }
  };

  const handleNavigateToCost = () => {
    // Cost allocation manager can work with or without data
    setCurrentView('cost');
  };

  const handleNavigateToBulk = () => {
    if (isDataReady) {
      setCurrentView('bulk');
    } else {
      setCurrentView('upload');
    }
  };

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage 
          onGetStarted={handleGetStarted}
          onViewDashboard={handleViewDashboard}
          hasData={isDataReady}
        />
      )}
      {currentView === 'selector' && (
        <DashboardSelector
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToOverview={handleNavigateToDashboard}
          onNavigateToLanding={() => setCurrentView('landing')}
        />
      )}
      {currentView === 'dashboard' && (
        <DashboardLayout 
          currentView="dashboard"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <MainDashboard onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
      {currentView === 'upload' && (
        <FileUploadPage 
          onNavigateHome={handleNavigateHome}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        />
      )}
      {currentView === 'drilling' && (
        <DashboardLayout 
          currentView="drilling"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <DrillingDashboard onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
      {currentView === 'production' && (
        <DashboardLayout 
          currentView="production"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <ProductionDashboard onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
      {currentView === 'voyage' && (
        <DashboardLayout 
          currentView="voyage"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <VoyageAnalyticsDashboard onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
      {currentView === 'comparison' && (
        <DashboardLayout 
          currentView="comparison"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <ComparisonDashboard onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
      {currentView === 'cost' && (
        <DashboardLayout 
          currentView="cost"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <CostAllocationManagerRedesigned onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
      {currentView === 'bulk' && (
        <DashboardLayout 
          currentView="bulk"
          onNavigateHome={handleNavigateHome}
          onNavigateToDashboard={handleNavigateToDashboard}
          onNavigateToDrilling={handleNavigateToDrilling}
          onNavigateToProduction={handleNavigateToProduction}
          onNavigateToComparison={handleNavigateToComparison}
          onNavigateToVoyage={handleNavigateToVoyage}
          onNavigateToCost={handleNavigateToCost}
          onNavigateToBulk={handleNavigateToBulk}
        >
          <BulkActionsDashboard />
        </DashboardLayout>
      )}
    </>
  );
};

// Main App component with data provider
const App: React.FC = () => {
  return (
    <DataProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </DataProvider>
  );
};

export default App;