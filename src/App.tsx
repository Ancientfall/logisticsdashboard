// src/App.tsx - WORKING VERSION
import React, { useState, useEffect } from 'react';
import FileUploadPage from './components/dashboard/FileUploadPage';
import { DataProvider, useData } from './context/DataContext';
import './App.css';

// Main application content
const AppContent: React.FC = () => {
  console.log('AppContent is rendering!');
  const { isDataReady } = useData();
  const [currentPage, setCurrentPage] = useState<'upload' | 'dashboard'>('upload');
  
  console.log('Current page:', currentPage, 'Data ready:', isDataReady);
  
  // If data is ready, show dashboard, otherwise show upload page
  useEffect(() => {
    if (isDataReady) {
      setCurrentPage('dashboard');
    }
  }, [isDataReady]);
  
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {currentPage === 'dashboard' && isDataReady ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
            Dashboard Coming Soon! 🚀
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            The data has been successfully processed. Dashboard visualizations are under development.
          </p>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h3 style={{ color: '#059669', marginBottom: '1rem' }}>✅ Phase 1 Complete!</h3>
            <p style={{ color: '#374151', lineHeight: '1.6' }}>
              Your React TypeScript foundation is now set up with:
              <br />• Modern component architecture
              <br />• Type-safe data interfaces
              <br />• Context for state management
              <br />• Beautiful styling system
            </p>
          </div>
        </div>
      ) : (
        <FileUploadPage />
      )}
    </div>
  );
};

// App with providers
const App: React.FC = () => {
  console.log('App is rendering!');
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;