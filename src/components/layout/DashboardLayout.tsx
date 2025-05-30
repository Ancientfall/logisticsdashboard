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
    <div className="min-h-screen bg-gray-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-100 to-gray-50 opacity-5 pointer-events-none" />
      
      {/* Header */}
      <header className="bg-white shadow-lg relative z-20">
        <div className="border-b-4 border-green-600">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section - Logo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-2xl">bp</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Logistics Analytics
                  </h1>
                  <p className="text-sm text-gray-600">
                    Offshore Vessel Operations
                  </p>
                </div>
              </div>

              {/* Center Section - Navigation */}
              <nav className="hidden md:flex items-center gap-8">
                <button 
                  onClick={onNavigateToDrilling}
                  className={`transition-colors font-medium pb-1 ${
                    currentView === 'drilling' 
                      ? 'text-green-600 font-semibold border-b-2 border-green-600' 
                      : 'text-gray-700 hover:text-green-600'
                  }`}
                >
                  Drilling
                </button>
                <button 
                  onClick={onNavigateToProduction}
                  className={`transition-colors font-medium pb-1 ${
                    currentView === 'production' 
                      ? 'text-green-600 font-semibold border-b-2 border-green-600' 
                      : 'text-gray-700 hover:text-green-600'
                  }`}
                >
                  Production
                </button>
                <button 
                  onClick={onNavigateToComparison}
                  className={`transition-colors font-medium pb-1 ${
                    currentView === 'comparison' 
                      ? 'text-green-600 font-semibold border-b-2 border-green-600' 
                      : 'text-gray-700 hover:text-green-600'
                  }`}
                >
                  Comparison
                </button>
                <button 
                  onClick={onNavigateToVoyage}
                  className={`transition-colors font-medium pb-1 ${
                    currentView === 'voyage' 
                      ? 'text-green-600 font-semibold border-b-2 border-green-600' 
                      : 'text-gray-700 hover:text-green-600'
                  }`}
                >
                  Voyage Analytics
                </button>
                <button 
                  onClick={onNavigateToCost}
                  className={`transition-colors font-medium pb-1 ${
                    currentView === 'cost' 
                      ? 'text-green-600 font-semibold border-b-2 border-green-600' 
                      : 'text-gray-700 hover:text-green-600'
                  }`}
                >
                  Cost Allocation
                </button>
                <button 
                  onClick={onNavigateToDashboard}
                  className={`transition-colors font-medium pb-1 ${
                    currentView === 'dashboard' 
                      ? 'text-green-600 font-semibold border-b-2 border-green-600' 
                      : 'text-gray-700 hover:text-green-600'
                  }`}
                >
                  Data Settings
                </button>
              </nav>

              {/* Right Section - User Info */}
              <div className="flex items-center gap-6">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center text-white font-semibold">
                    <span>JD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-header with breadcrumb */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <button 
                  onClick={onNavigateHome}
                  className="text-gray-500 hover:text-green-600 transition-colors cursor-pointer"
                >
                  Home
                </button>
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 font-medium">
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
                  <span className="text-xs text-gray-500 mr-2">
                    Data updated: {lastUpdated.toLocaleDateString()}
                  </span>
                )}
                <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export
                </button>
                <button 
                  onClick={handleResetData}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                  title="Reset data and return to upload mode"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Reset Data
                </button>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                  </svg>
                  New Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Main Content Area */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {children}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <span>© 2024 BP p.l.c.</span>
              <button className="hover:text-green-600 transition-colors">Privacy</button>
              <button className="hover:text-green-600 transition-colors">Terms</button>
              <button className="hover:text-green-600 transition-colors">Support</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;