// src/App.tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import FileUploadPage from './components/dashboard/FileUploadPage';
import MainDashboard from './components/dashboard/MainDashboard';
import LandingPage from './components/LandingPage';
import { DataProvider, useData } from './context/DataContext';
import './index.css';
import DrillingDashboard from './components/dashboard/DrillingDashboard';
import VoyageAnalyticsDashboard from './components/dashboard/VoyageAnalyticsDashboard';
import CostAllocationManager from './components/dashboard/CostAllocationManager';
import ProductionDashboard from './components/dashboard/ProductionDashboard';

// Main application content component
const AppContent: React.FC = () => {
  const { isDataReady, isLoading, voyageEvents, vesselManifests, costAllocation } = useData();
  const [currentView, setCurrentView] = useState<'landing' | 'upload' | 'dashboard' | 'drilling' | 'production' | 'voyage' | 'cost'>('landing');
  
  // Handle navigation based on data ready state
  useEffect(() => {
    console.log('🔄 App: isDataReady changed to:', isDataReady);
    console.log('📊 App: Data counts:', {
      voyageEvents: voyageEvents.length,
      vesselManifests: vesselManifests.length,
      costAllocation: costAllocation.length
    });
    console.log('🎯 App: Current view:', currentView);
    
    // Only auto-redirect to dashboard if data becomes ready and we're on upload page
    if (isDataReady && currentView === 'upload') {
      console.log('🎯 App: Data is ready, navigating to dashboard...');
      setCurrentView('dashboard');
    } else if (!isDataReady && (currentView === 'dashboard' || currentView === 'drilling' || currentView === 'production' || currentView === 'voyage' || currentView === 'cost')) {
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
      setCurrentView('dashboard');
    } else {
      setCurrentView('upload');
    }
  };

  const handleNavigateHome = () => {
    setCurrentView('landing');
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
    // TODO: Implement comparison view
    if (isDataReady) {
      setCurrentView('dashboard'); // For now, redirect to main dashboard
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

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage 
          onGetStarted={handleGetStarted}
          onViewDashboard={handleViewDashboard}
          hasData={isDataReady}
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
        >
          <VoyageAnalyticsDashboard onNavigateToUpload={() => setCurrentView('upload')} />
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
        >
          <CostAllocationManager onNavigateToUpload={() => setCurrentView('upload')} />
        </DashboardLayout>
      )}
    </>
  );
};

// Main App component with data provider
const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;