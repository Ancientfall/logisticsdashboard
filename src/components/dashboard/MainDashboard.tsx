// src/components/dashboard/MainDashboard.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Calendar, Database, FileText, AlertTriangle, CheckCircle, Users, MapPin, Clock, TrendingUp, Download, RefreshCw, Settings } from 'lucide-react';

interface MainDashboardProps {
  onNavigateToUpload?: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onNavigateToUpload }) => {
  const { 
    voyageEvents, 
    vesselManifests, 
    masterFacilities, 
    costAllocation,
    voyageList,
    vesselClassifications,
    bulkActions,
    isDataReady,
    lastUpdated,
    forceRefreshFromStorage,
    clearAllData
  } = useData();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'vessels' | 'timeline'>('overview');

  // Comprehensive data analysis
  const dataAnalysis = useMemo(() => {
    // Basic counts
    const totalRecords = voyageEvents.length + vesselManifests.length + costAllocation.length + voyageList.length;
    
    // Date range analysis
    const allDates = [
      ...voyageEvents.map(e => new Date(e.eventDate)),
      ...vesselManifests.map(m => new Date(m.manifestDate))
    ].filter(d => !isNaN(d.getTime()));
    
    const dateRange = allDates.length > 0 ? {
      start: new Date(Math.min(...allDates.map(d => d.getTime()))),
      end: new Date(Math.max(...allDates.map(d => d.getTime())))
    } : null;
    
    // Vessel analysis
    const uniqueVesselsFromEvents = new Set(voyageEvents.map(e => e.vessel).filter(Boolean));
    const uniqueVesselsFromManifests = new Set(vesselManifests.map(m => m.transporter).filter(Boolean));
    const uniqueVesselsFromVoyageList = new Set(voyageList.map(v => v.vessel).filter(Boolean));
    const allUniqueVessels = new Set([
      ...uniqueVesselsFromEvents,
      ...uniqueVesselsFromManifests,
      ...uniqueVesselsFromVoyageList
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
      duplicateEventIds: voyageEvents.length - new Set(voyageEvents.map(e => e.id)).size
    };
    
    // Monthly breakdown
    const monthlyData = voyageEvents.reduce((acc, event) => {
      const date = new Date(event.eventDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { label: monthLabel, events: 0, hours: 0 };
      }
      acc[monthKey].events += 1;
      acc[monthKey].hours += event.finalHours;
      return acc;
    }, {} as Record<string, { label: string; events: number; hours: number }>);
    
    return {
      totalRecords,
      dateRange,
      uniqueVessels: {
        total: allUniqueVessels.size,
        fromEvents: uniqueVesselsFromEvents.size,
        fromManifests: uniqueVesselsFromManifests.size,
        fromVoyageList: uniqueVesselsFromVoyageList.size,
        list: Array.from(allUniqueVessels).sort()
      },
      departmentBreakdown,
      uniqueLocations: uniqueLocations.size,
      locationsList: Array.from(uniqueLocations).sort(),
      dataQuality,
      monthlyData: Object.values(monthlyData).sort((a, b) => a.label.localeCompare(b.label))
    };
  }, [voyageEvents, vesselManifests, costAllocation, voyageList]);

  if (!isDataReady || voyageEvents.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data processing summary...</p>
        </div>
      </div>
    );
  }

  const DataCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
    action?: () => void;
    actionLabel?: string;
  }> = ({ title, value, subtitle, icon, color, action, actionLabel }) => {
    const colorClasses = {
      green: 'bg-green-50 text-green-700 border-green-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200'
    };
    
    return (
      <div className={`rounded-lg p-6 border ${colorClasses[color]}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {icon}
              <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {action && actionLabel && (
            <button
              onClick={action}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Data Processing Summary</h2>
          <p className="text-gray-600">
            Comprehensive overview of your uploaded data and processing insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => forceRefreshFromStorage()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh Data
          </button>
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings size={16} />
            Manage Data
          </button>
        </div>
      </div>

      {/* Data Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DataCard
          title="Total Records"
          value={dataAnalysis.totalRecords}
          subtitle={`Last updated: ${lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Unknown'}`}
          icon={<Database size={20} className="text-green-600" />}
          color="green"
        />
        <DataCard
          title="Unique Vessels"
          value={dataAnalysis.uniqueVessels.total}
          subtitle={`Across all data sources`}
          icon={<Users size={20} className="text-blue-600" />}
          color="blue"
        />
        <DataCard
          title="Locations"
          value={dataAnalysis.uniqueLocations}
          subtitle={`Operational locations`}
          icon={<MapPin size={20} className="text-purple-600" />}
          color="purple"
        />
        <DataCard
          title="Date Range"
          value={dataAnalysis.dateRange ? 
            `${Math.ceil((dataAnalysis.dateRange.end.getTime() - dataAnalysis.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days` : 
            'No dates'
          }
          subtitle={dataAnalysis.dateRange ? 
            `${dataAnalysis.dateRange.start.toLocaleDateString()} - ${dataAnalysis.dateRange.end.toLocaleDateString()}` : 
            'Invalid date range'
          }
          icon={<Calendar size={20} className="text-orange-600" />}
          color="orange"
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Data Overview', icon: <Database size={16} /> },
            { id: 'quality', label: 'Data Quality', icon: <CheckCircle size={16} /> },
            { id: 'vessels', label: 'Vessel Analysis', icon: <Users size={16} /> },
            { id: 'timeline', label: 'Timeline View', icon: <TrendingUp size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Source Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-green-600" />
                  <span className="font-medium">Voyage Events</span>
                </div>
                <span className="text-lg font-bold text-green-700">{voyageEvents.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-blue-600" />
                  <span className="font-medium">Vessel Manifests</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{vesselManifests.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-purple-600" />
                  <span className="font-medium">Cost Allocations</span>
                </div>
                <span className="text-lg font-bold text-purple-700">{costAllocation.length.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-orange-600" />
                  <span className="font-medium">Voyage Lists</span>
                </div>
                <span className="text-lg font-bold text-orange-700">{voyageList.length.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
            <div className="space-y-3">
              {Object.entries(dataAnalysis.departmentBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([dept, count]) => {
                  const percentage = ((count / voyageEvents.length) * 100).toFixed(1);
                  return (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{dept}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
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
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Assessment</h3>
            <div className="space-y-4">
              {[
                { label: 'Events with missing vessel', count: dataAnalysis.dataQuality.voyageEventsWithMissingVessel, severity: 'high' },
                { label: 'Events with missing location', count: dataAnalysis.dataQuality.voyageEventsWithMissingLocation, severity: 'medium' },
                { label: 'Manifests with missing transporter', count: dataAnalysis.dataQuality.manifestsWithMissingTransporter, severity: 'high' },
                { label: 'Events with zero hours', count: dataAnalysis.dataQuality.eventsWithZeroHours, severity: 'low' },
                { label: 'Duplicate event IDs', count: dataAnalysis.dataQuality.duplicateEventIds, severity: 'high' }
              ].map((issue) => (
                <div key={issue.label} className={`flex items-center justify-between p-3 rounded-lg ${
                  issue.count === 0 ? 'bg-green-50' : 
                  issue.severity === 'high' ? 'bg-red-50' :
                  issue.severity === 'medium' ? 'bg-yellow-50' : 'bg-orange-50'
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
          <div className="bg-white rounded-lg p-6 shadow-md">
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
                }
              ].map((item) => (
                <div key={item.source} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{item.source}</span>
                    <span className="text-sm text-gray-600">{item.completeness.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        item.completeness >= 95 ? 'bg-green-500' :
                        item.completeness >= 80 ? 'bg-yellow-500' : 'bg-red-500'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vessel Source Analysis */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vessel Data Sources</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">From Voyage Events</span>
                <span className="text-lg font-bold text-blue-700">{dataAnalysis.uniqueVessels.fromEvents}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">From Manifests</span>
                <span className="text-lg font-bold text-green-700">{dataAnalysis.uniqueVessels.fromManifests}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="font-medium">From Voyage Lists</span>
                <span className="text-lg font-bold text-purple-700">{dataAnalysis.uniqueVessels.fromVoyageList}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-bold">Total Unique Vessels</span>
                <span className="text-xl font-bold text-gray-900">{dataAnalysis.uniqueVessels.total}</span>
              </div>
            </div>
          </div>

          {/* Vessel List */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Vessels ({dataAnalysis.uniqueVessels.total})</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {dataAnalysis.uniqueVessels.list.map((vessel, index) => (
                <div key={vessel} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">{vessel}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Activity Timeline</h3>
          <div className="space-y-3">
            {dataAnalysis.monthlyData.map((month) => (
              <div key={month.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
      <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <AlertTriangle size={16} />
          Clear All Data
        </button>
      </div>
    </div>
  );
};

export default MainDashboard;