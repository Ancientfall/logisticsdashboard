// src/components/dashboard/MainDashboard.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { Database, FileText, AlertTriangle, CheckCircle, Users, TrendingUp, Download, RefreshCw, Settings, Package, Bell } from 'lucide-react';
import { getVesselTypeFromName, getVesselCompanyFromName, getVesselStatistics } from '../../data/vesselClassification';

interface MainDashboardProps {
  onNavigateToUpload?: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onNavigateToUpload }) => {
  const navigate = useNavigate();
  const { 
    voyageEvents, 
    vesselManifests, 
    costAllocation,
    voyageList,
    bulkActions,
    isDataReady,
    forceRefreshFromStorage,
    clearAllData
  } = useData();
  
  const { addNotification } = useNotifications();
  
  const handleNavigateToUpload = () => {
    if (onNavigateToUpload) {
      onNavigateToUpload();
    } else {
      navigate('/upload');
    }
  };
  
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'vessels' | 'timeline'>('overview');

  // ENHANCED DEBUGGING: Log the exact state causing loading issues
  React.useEffect(() => {
    console.log('🔍 MainDashboard - Current State:', {
      isDataReady,
      voyageEventsLength: voyageEvents.length,
      vesselManifestsLength: vesselManifests.length,
      costAllocationLength: costAllocation.length,
      voyageListLength: voyageList.length,
      bulkActionsLength: bulkActions.length,
      shouldShowLoading: (!isDataReady || voyageEvents.length === 0),
      timestamp: new Date().toISOString()
    });
    
    // If we should be showing content but aren't, log more details
    if (isDataReady && voyageEvents.length === 0) {
      console.warn('⚠️ MainDashboard - Data paradox detected:');
      console.log('  - isDataReady is true but voyageEvents is empty');
      console.log('  - This suggests a data loading issue in DataContext');
      console.log('  - Attempting to force refresh...');
      
      // Try to force refresh if we detect this state
      setTimeout(() => {
        console.log('🔄 MainDashboard - Auto-triggering forceRefreshFromStorage');
        forceRefreshFromStorage();
      }, 1000);
    }
  }, [isDataReady, voyageEvents.length, vesselManifests.length, costAllocation.length, voyageList.length, bulkActions.length, forceRefreshFromStorage]);

  // Comprehensive data analysis
  const dataAnalysis = useMemo(() => {
    // Basic counts
    const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length + bulkActions.length;
    
    // Date range analysis
    const allDates = [
      ...voyageEvents.map(e => new Date(e.eventDate)),
      ...vesselManifests.map(m => new Date(m.manifestDate)),
      ...bulkActions.map(b => new Date(b.startDate))
    ].filter(d => !isNaN(d.getTime()));
    
    const dateRange = allDates.length > 0 ? {
      start: new Date(Math.min(...allDates.map(d => d.getTime()))),
      end: new Date(Math.max(...allDates.map(d => d.getTime())))
    } : null;
    
    // Vessel analysis
    const uniqueVesselsFromEvents = new Set(voyageEvents.map(e => e.vessel).filter(Boolean));
    const uniqueVesselsFromManifests = new Set(vesselManifests.map(m => m.transporter).filter(Boolean));
    const uniqueVesselsFromVoyageList = new Set(voyageList.map(v => v.vessel).filter(Boolean));
    const uniqueVesselsFromBulkActions = new Set(bulkActions.map(b => b.vesselName).filter(Boolean));
    const allUniqueVessels = new Set([
      ...uniqueVesselsFromEvents,
      ...uniqueVesselsFromManifests,
      ...uniqueVesselsFromVoyageList,
      ...uniqueVesselsFromBulkActions
    ]);
    
    // Department breakdown
    const departmentBreakdown = voyageEvents.reduce((acc, event) => {
      const dept = event.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Location analysis
    const uniqueLocations = new Set(voyageEvents.map(e => e.location).filter(Boolean));
    
    // Data quality checks
    const dataQuality = {
      voyageEventsWithMissingVessel: voyageEvents.filter(e => !e.vessel || e.vessel.trim() === '').length,
      voyageEventsWithMissingLocation: voyageEvents.filter(e => !e.location || e.location.trim() === '').length,
      manifestsWithMissingTransporter: vesselManifests.filter(m => !m.transporter || m.transporter.trim() === '').length,
      eventsWithZeroHours: voyageEvents.filter(e => e.finalHours === 0).length,
      duplicateEventIds: voyageEvents.length - new Set(voyageEvents.map(e => e.id)).size,
      bulkActionsWithMissingDestination: bulkActions.filter(b => !b.destinationPort || b.destinationPort.trim() === '').length,
      bulkActionsWithZeroVolume: bulkActions.filter(b => b.volumeBbls === 0).length
    };
    
    // Monthly breakdown
    const monthlyData = voyageEvents.reduce((acc, event) => {
      const date = new Date(event.eventDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { key: monthKey, label: monthLabel, events: 0, hours: 0 };
      }
      acc[monthKey].events += 1;
      acc[monthKey].hours += event.finalHours;
      return acc;
    }, {} as Record<string, { key: string; label: string; events: number; hours: number }>);
    
    // Bulk Actions analysis
    const bulkActionsAnalysis = {
      totalTransfers: bulkActions.length,
      totalVolumeBbls: bulkActions.reduce((sum, action) => sum + action.volumeBbls, 0),
      uniqueBulkTypes: new Set(bulkActions.map(b => b.bulkType)).size,
      shorebaseToRig: bulkActions.filter(b => b.portType === 'base' && b.destinationPort).length,
      rigToShorebase: bulkActions.filter(b => b.portType === 'rig' || b.isReturn).length
    };
    
    return {
      totalRecords,
      dateRange,
      uniqueVessels: {
        total: allUniqueVessels.size,
        fromEvents: uniqueVesselsFromEvents.size,
        fromManifests: uniqueVesselsFromManifests.size,
        fromVoyageList: uniqueVesselsFromVoyageList.size,
        fromBulkActions: uniqueVesselsFromBulkActions.size,
        list: Array.from(allUniqueVessels).sort()
      },
      departmentBreakdown,
      uniqueLocations: uniqueLocations.size,
      locationsList: Array.from(uniqueLocations).sort(),
      dataQuality,
      monthlyData: Object.values(monthlyData).sort((a, b) => a.key.localeCompare(b.key)),
      bulkActionsAnalysis
    };
  }, [voyageEvents, vesselManifests, costAllocation, voyageList, bulkActions]);

  if (!isDataReady) {
    // Still loading initial data check
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-8">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Loading data processing summary...</p>
        </div>
      </div>
    );
  }

  if (voyageEvents.length === 0) {
    // Data is ready but no data exists - show upload prompt
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-lg bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-8">
          <Database size={64} className="text-gray-400 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to BP Logistics Dashboard</h3>
          <p className="text-gray-600 mb-6">
            Get started by uploading your first dataset. You can upload Excel files containing voyage events, vessel manifests, cost allocations, and more.
          </p>
          <button
            onClick={handleNavigateToUpload}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md text-lg font-medium"
          >
            <FileText size={20} />
            Upload Your First Dataset
          </button>
          <div className="mt-6 text-sm text-gray-500">
            <p>Supported formats: Excel (.xlsx), CSV files</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Data Processing Summary */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Data Processing Summary</h2>
            <p className="text-gray-600">
              Comprehensive overview of your uploaded data and processing insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Test different notification types
                addNotification('system-update', {
                  version: '2.1.0'
                });
                setTimeout(() => {
                  addNotification('efficiency-improvement', {
                    metric: 'Vessel Utilization',
                    percentage: 15,
                    period: 'week'
                  });
                }, 500);
                setTimeout(() => {
                  addNotification('high-cost', {
                    entity: 'LC-2024-001',
                    current: 1250000,
                    threshold: 1000000,
                    percentage: 25
                  });
                }, 1000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md"
            >
              <Bell size={16} />
              Test Notifications
            </button>
            <button
              onClick={() => forceRefreshFromStorage()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md"
            >
              <RefreshCw size={16} />
              Refresh Data
            </button>
            <button
              onClick={handleNavigateToUpload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 hover:bg-gray-50/80 transition-all duration-200"
            >
              <Settings size={16} />
              Manage Data
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-2">
        <nav className="flex space-x-1">
          {[
            { id: 'overview', label: 'Data Overview', icon: <Database size={16} /> },
            { id: 'quality', label: 'Data Quality', icon: <CheckCircle size={16} /> },
            { id: 'vessels', label: 'Vessel Analysis', icon: <Users size={16} /> },
            { id: 'timeline', label: 'Timeline View', icon: <TrendingUp size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Source Breakdown */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Source Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-lg border border-green-100/50">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-green-600" />
                  <span className="font-medium">Voyage Events</span>
                </div>
                <span className="text-lg font-bold text-green-700">{voyageEvents.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-blue-600" />
                  <span className="font-medium">Vessel Manifests</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{vesselManifests.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50/50 rounded-lg border border-purple-100/50">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-purple-600" />
                  <span className="font-medium">Cost Allocations</span>
                </div>
                <span className="text-lg font-bold text-purple-700">{costAllocation.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50/50 rounded-lg border border-orange-100/50">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-orange-600" />
                  <span className="font-medium">Voyage Lists</span>
                </div>
                <span className="text-lg font-bold text-orange-700">{voyageList.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                <div className="flex items-center gap-3">
                  <Package size={20} className="text-indigo-600" />
                  <span className="font-medium">Bulk Actions</span>
                </div>
                <span className="text-lg font-bold text-indigo-700">{bulkActions.length.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
            <div className="space-y-3">
              {Object.entries(dataAnalysis.departmentBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([dept, count]) => {
                  const percentage = ((count / voyageEvents.length) * 100).toFixed(2);
                  return (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{dept}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200/50 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-right">
                          {count.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Quality Issues */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Assessment</h3>
            <div className="space-y-4">
              {[
                { label: 'Events with missing vessel', count: dataAnalysis.dataQuality.voyageEventsWithMissingVessel, severity: 'high' },
                { label: 'Events with missing location', count: dataAnalysis.dataQuality.voyageEventsWithMissingLocation, severity: 'medium' },
                { label: 'Manifests with missing transporter', count: dataAnalysis.dataQuality.manifestsWithMissingTransporter, severity: 'high' },
                { label: 'Events with zero hours', count: dataAnalysis.dataQuality.eventsWithZeroHours, severity: 'low' },
                { label: 'Duplicate event IDs', count: dataAnalysis.dataQuality.duplicateEventIds, severity: 'high' },
                { label: 'Bulk actions with missing destination', count: dataAnalysis.dataQuality.bulkActionsWithMissingDestination, severity: 'medium' },
                { label: 'Bulk actions with zero volume', count: dataAnalysis.dataQuality.bulkActionsWithZeroVolume, severity: 'low' }
              ].map((issue) => (
                <div key={issue.label} className={`flex items-center justify-between p-3 rounded-lg border ${
                  issue.count === 0 ? 'bg-green-50/50 border-green-100/50' : 
                  issue.severity === 'high' ? 'bg-red-50/50 border-red-100/50' :
                  issue.severity === 'medium' ? 'bg-yellow-50/50 border-yellow-100/50' : 'bg-orange-50/50 border-orange-100/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {issue.count === 0 ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertTriangle size={16} className={
                        issue.severity === 'high' ? 'text-red-600' :
                        issue.severity === 'medium' ? 'text-yellow-600' : 'text-orange-600'
                      } />
                    )}
                    <span className="font-medium">{issue.label}</span>
                  </div>
                  <span className={`font-bold ${
                    issue.count === 0 ? 'text-green-700' :
                    issue.severity === 'high' ? 'text-red-700' :
                    issue.severity === 'medium' ? 'text-yellow-700' : 'text-orange-700'
                  }`}>
                    {issue.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Completeness */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Completeness Score</h3>
            <div className="space-y-4">
              {[
                { 
                  source: 'Voyage Events', 
                  completeness: ((voyageEvents.length - dataAnalysis.dataQuality.voyageEventsWithMissingVessel - dataAnalysis.dataQuality.voyageEventsWithMissingLocation) / Math.max(1, voyageEvents.length)) * 100,
                  total: voyageEvents.length
                },
                { 
                  source: 'Vessel Manifests', 
                  completeness: ((vesselManifests.length - dataAnalysis.dataQuality.manifestsWithMissingTransporter) / Math.max(1, vesselManifests.length)) * 100,
                  total: vesselManifests.length
                },
                { 
                  source: 'Bulk Actions', 
                  completeness: ((bulkActions.length - dataAnalysis.dataQuality.bulkActionsWithMissingDestination - dataAnalysis.dataQuality.bulkActionsWithZeroVolume) / Math.max(1, bulkActions.length)) * 100,
                  total: bulkActions.length
                }
              ].map((item) => (
                <div key={item.source} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{item.source}</span>
                    <span className="text-sm text-gray-600">{item.completeness.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-gray-200/50 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        item.completeness >= 95 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        item.completeness >= 80 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${item.completeness}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{item.total.toLocaleString()} total records</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vessels' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vessel Source Analysis */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vessel Data Sources</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                <span className="font-medium">From Voyage Events</span>
                <span className="text-lg font-bold text-blue-700">{dataAnalysis.uniqueVessels.fromEvents}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-lg border border-green-100/50">
                <span className="font-medium">From Manifests</span>
                <span className="text-lg font-bold text-green-700">{dataAnalysis.uniqueVessels.fromManifests}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50/50 rounded-lg border border-purple-100/50">
                <span className="font-medium">From Voyage Lists</span>
                <span className="text-lg font-bold text-purple-700">{dataAnalysis.uniqueVessels.fromVoyageList}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50/50 rounded-lg border-2 border-gray-200/50">
                <span className="font-bold">Total Unique Vessels</span>
                <span className="text-xl font-bold text-gray-900">{dataAnalysis.uniqueVessels.total}</span>
              </div>
            </div>
          </div>

          {/* Vessel Type Classification */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vessel Type Classification</h3>
            <div className="space-y-3">
              {(() => {
                const vesselStats = getVesselStatistics();
                return Object.entries(vesselStats.vesselsByType)
                  .sort(([,a], [,b]) => b - a)
                  .map(([type, count]) => {
                    const percentage = ((count / vesselStats.totalVessels) * 100).toFixed(2);
                    const colors = {
                      'OSV': 'bg-gradient-to-r from-blue-500 to-blue-600',
                      'FSV': 'bg-gradient-to-r from-green-500 to-green-600', 
                      'Support': 'bg-gradient-to-r from-purple-500 to-purple-600',
                      'Specialty': 'bg-gradient-to-r from-orange-500 to-orange-600',
                      'AHTS': 'bg-gradient-to-r from-red-500 to-red-600',
                      'MSV': 'bg-gradient-to-r from-yellow-500 to-yellow-600',
                      'PSV': 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                    };
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[type as keyof typeof colors] || 'bg-gradient-to-r from-gray-500 to-gray-600'}`}></div>
                          <span className="font-medium text-gray-700">{type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20 bg-gray-200/50 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${colors[type as keyof typeof colors] || 'bg-gradient-to-r from-gray-500 to-gray-600'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-16 text-right">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>

          {/* Vessel List with Classification */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vessel Details ({dataAnalysis.uniqueVessels.total})</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {dataAnalysis.uniqueVessels.list.map((vessel, index) => {
                const vesselType = getVesselTypeFromName(vessel);
                const vesselCompany = getVesselCompanyFromName(vessel);
                const typeColors = {
                  'OSV': 'text-blue-600 bg-blue-50',
                  'FSV': 'text-green-600 bg-green-50',
                  'Support': 'text-purple-600 bg-purple-50',
                  'Specialty': 'text-orange-600 bg-orange-50',
                  'Unknown': 'text-gray-600 bg-gray-50'
                };
                return (
                  <div key={vessel} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">{vessel}</div>
                      {vesselCompany !== 'Unknown' && (
                        <div className="text-xs text-gray-500">{vesselCompany}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        typeColors[vesselType as keyof typeof typeColors] || typeColors.Unknown
                      }`}>
                        {vesselType}
                      </span>
                      <span className="text-xs text-gray-400">#{index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Activity Timeline</h3>
          <div className="space-y-3">
            {dataAnalysis.monthlyData.map((month) => (
              <div key={month.label} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100/50">
                <span className="font-medium text-gray-700">{month.label}</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-blue-600">
                    <strong>{month.events.toLocaleString()}</strong> events
                  </span>
                  <span className="text-green-600">
                    <strong>{Math.round(month.hours).toLocaleString()}</strong> hours
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Action Buttons */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-gray-200/50 p-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              const dataBlob = new Blob([JSON.stringify({
                voyageEvents,
                vesselManifests,
                costAllocation,
                voyageList,
                analysis: dataAnalysis,
                exportedAt: new Date().toISOString()
              }, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `data-summary-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md"
          >
            <Download size={16} />
            Export Summary Report
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                clearAllData();
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md"
          >
            <AlertTriangle size={16} />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;