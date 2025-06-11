import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView?: 'dashboard' | 'drilling' | 'production' | 'comparison' | 'voyage' | 'cost';
  onNavigateHome?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToDrilling?: () => void;
  onNavigateToProduction?: () => void;
  onNavigateToComparison?: () => void;
  onNavigateToVoyage?: () => void;
  onNavigateToCost?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  currentView = 'dashboard',
  onNavigateHome, 
  onNavigateToDashboard,
  onNavigateToDrilling, 
  onNavigateToProduction, 
  onNavigateToComparison,
  onNavigateToVoyage,
  onNavigateToCost
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { clearAllData, lastUpdated } = useData();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This will clear the dashboard and return to upload mode.')) {
      clearAllData();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-xl relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left Section - Logo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <span className="text-white font-bold text-xl">bp</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Logistics Analytics
                </h1>
                <p className="text-sm text-gray-300">
                  Offshore Vessel Operations
                </p>
              </div>
            </div>

            {/* Center Section - Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button 
                onClick={onNavigateToDrilling}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group ${
                  currentView === 'drilling' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="relative z-10">Drilling</span>
                {currentView !== 'drilling' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
              <button 
                onClick={onNavigateToProduction}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group ${
                  currentView === 'production' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="relative z-10">Production</span>
                {currentView !== 'production' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
              <button 
                onClick={onNavigateToComparison}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group ${
                  currentView === 'comparison' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="relative z-10">Comparison</span>
                {currentView !== 'comparison' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
              <button 
                onClick={onNavigateToVoyage}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group ${
                  currentView === 'voyage' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="relative z-10">Voyage Analytics</span>
                {currentView !== 'voyage' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
              <button 
                onClick={onNavigateToCost}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group ${
                  currentView === 'cost' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="relative z-10">Cost Allocation</span>
                {currentView !== 'cost' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
              <button 
                onClick={onNavigateToDashboard}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group ${
                  currentView === 'dashboard' 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <span className="relative z-10">Data Settings</span>
                {currentView !== 'dashboard' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
            </nav>

            {/* Right Section - Date/Time */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-gray-100">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-400">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <button className="p-2.5 hover:bg-white/10 rounded-lg transition-all duration-200 backdrop-blur-sm">
                <svg className="w-5 h-5 text-gray-300 hover:text-white transition-colors duration-200" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-header with breadcrumb */}
        <div className="bg-gray-800 border-t border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <button 
                  onClick={onNavigateHome}
                  className="text-gray-400 hover:text-green-400 transition-all duration-200 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-700/50"
                >
                  Home
                </button>
                <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200 font-medium">
                  {currentView === 'drilling' && 'Drilling Dashboard'}
                  {currentView === 'production' && 'Production Dashboard'}
                  {currentView === 'comparison' && 'Comparison Dashboard'}
                  {currentView === 'voyage' && 'Voyage Analytics Dashboard'}
                  {currentView === 'cost' && 'Cost Allocation Management'}
                  {currentView === 'dashboard' && 'Data Settings Dashboard'}
                </span>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {lastUpdated && (
                  <span className="text-xs text-gray-400 mr-2">
                    Data updated: {lastUpdated.toLocaleDateString()}
                  </span>
                )}
                <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export
                </button>
                <button 
                  onClick={handleResetData}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm shadow-sm transition-all duration-200"
                  title="Reset data and return to upload mode"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200/50 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <span>© 2024 BP p.l.c.</span>
              <span className="text-gray-400">•</span>
              <span>Offshore Logistics Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;