// src/App.tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import FileUploadPage from './components/dashboard/FileUploadPage';
import MainDashboard from './components/dashboard/MainDashboard';
import { DataProvider, useData } from './context/DataContext';
import './index.css';

// Main application content component
const AppContent: React.FC = () => {
  const { isDataReady, isLoading } = useData();
  const [currentView, setCurrentView] = useState<'upload' | 'dashboard'>('upload');
  
  // Handle navigation based on data ready state
  useEffect(() => {
    if (isDataReady) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('upload');
    }
  }, [isDataReady]);

  // Show loading state during processing
  if (isLoading) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {currentView === 'dashboard' ? (
        <MainDashboard />
      ) : (
        <FileUploadPage />
      )}
    </DashboardLayout>
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