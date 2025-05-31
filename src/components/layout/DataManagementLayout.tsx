import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, Database, FileText, Home, User } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface DataManagementLayoutProps {
  children: React.ReactNode;
  onNavigateHome?: () => void;
  onNavigateToDrilling?: () => void;
  onNavigateToProduction?: () => void;
  onNavigateToComparison?: () => void;
  onNavigateToVoyage?: () => void;
  onNavigateToCost?: () => void;
}

const DataManagementLayout: React.FC<DataManagementLayoutProps> = ({ 
  children, 
  onNavigateHome, 
  onNavigateToDrilling, 
  onNavigateToProduction, 
  onNavigateToComparison,
  onNavigateToVoyage,
  onNavigateToCost
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { lastUpdated, voyageEvents, vesselManifests, costAllocation } = useData();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate data summary
  const dataSummary = {
    voyageEvents: voyageEvents?.length || 0,
    vesselManifests: vesselManifests?.length || 0,
    costAllocations: costAllocation?.length || 0,
    total: (voyageEvents?.length || 0) + (vesselManifests?.length || 0) + (costAllocation?.length || 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">bp</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Data Management</h1>
                <p className="text-sm text-gray-600">Upload & Process Offshore Data</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={onNavigateHome}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              >
                <Home size={16} />
                <span>Home</span>
              </button>
              <button 
                onClick={onNavigateToDrilling}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              >
                <BarChart3 size={16} />
                <span>Drilling</span>
              </button>
              <button 
                onClick={onNavigateToVoyage}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              >
                <Database size={16} />
                <span>Voyage Analytics</span>
              </button>
              <button 
                onClick={onNavigateToCost}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              >
                <FileText size={16} />
                <span>Cost Allocation</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg">
                <Upload size={16} />
                <span className="font-medium">Data Upload</span>
              </div>
            </nav>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-gray-700">
                  {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                <User size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Data Summary Bar */}
        {dataSummary.total > 0 && (
          <div className="bg-green-50/50 border-t border-green-100">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">
                      <span className="font-semibold text-green-600">{dataSummary.total.toLocaleString()}</span> records loaded
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {dataSummary.voyageEvents > 0 && `${dataSummary.voyageEvents.toLocaleString()} voyage events`}
                    {dataSummary.voyageEvents > 0 && dataSummary.vesselManifests > 0 && ' • '}
                    {dataSummary.vesselManifests > 0 && `${dataSummary.vesselManifests.toLocaleString()} vessel manifests`}
                    {(dataSummary.voyageEvents > 0 || dataSummary.vesselManifests > 0) && dataSummary.costAllocations > 0 && ' • '}
                    {dataSummary.costAllocations > 0 && `${dataSummary.costAllocations.toLocaleString()} cost allocations`}
                  </div>
                </div>
                {lastUpdated && (
                  <div className="text-xs text-gray-500">
                    Last updated: {lastUpdated.toLocaleDateString()} at {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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

export default DataManagementLayout; 