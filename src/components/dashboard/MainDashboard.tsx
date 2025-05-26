// src/components/dashboard/MainDashboard.tsx
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Filter, 
  Clock, 
  Ship, 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Download,
  RefreshCw,
  Settings,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import './MainDashboard.css';

const MainDashboard: React.FC = () => {
  const { 
    voyageEvents, 
    vesselManifests, 
    masterFacilities, 
    vesselClassifications,
    isDataReady,
    lastUpdated,
    resetToUpload
  } = useData();
  
  const goBackToUpload = () => {
    resetToUpload();
  };

  // Filters state
  const [filters, setFilters] = useState({
    selectedMonth: 'all',
    selectedDepartment: 'all',
    selectedVessel: 'all',
    selectedCompany: 'all'
  });

  // Compute basic statistics from the data
  const statistics = useMemo(() => {
    const totalVoyageEvents = voyageEvents.length;
    const totalManifests = vesselManifests.length;
    const totalFacilities = masterFacilities.length;
    const uniqueVessels = new Set(voyageEvents.map(ve => ve.vessel)).size;
    
    const totalHours = voyageEvents.reduce((sum, event) => sum + event.finalHours, 0);
    const productiveHours = voyageEvents
      .filter(event => event.activityCategory === 'Productive')
      .reduce((sum, event) => sum + event.finalHours, 0);
    
    const utilizationRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    
    return {
      totalVoyageEvents,
      totalManifests,
      totalFacilities,
      uniqueVessels,
      totalHours: Math.round(totalHours),
      productiveHours: Math.round(productiveHours),
      utilizationRate: Math.round(utilizationRate * 10) / 10
    };
  }, [voyageEvents, vesselManifests, masterFacilities]);

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const months = Array.from(new Set(voyageEvents.map(ve => ve.monthName))).sort();
    const departments = Array.from(new Set(voyageEvents.map(ve => ve.department))).filter(dept => dept !== undefined) as ("Drilling" | "Production" | "Logistics")[];
    const vessels = Array.from(new Set(voyageEvents.map(ve => ve.vessel))).sort();
    const companies = Array.from(new Set(vesselClassifications.map(vc => vc.company))).sort();

    return { months, departments, vessels, companies };
  }, [voyageEvents, vesselClassifications]);

  if (!isDataReady || voyageEvents.length === 0) {
    return (
      <div className="main-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBackToUpload}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Upload
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Upload size={16} />
              Data loaded: {lastUpdated ? lastUpdated.toLocaleString() : 'No data loaded'}
            </div>
          </div>
          <h1 className="dashboard-title">Voyage Events Dashboard</h1>
          <p className="dashboard-subtitle">
            Comprehensive analysis of offshore vessel operations and cargo logistics
          </p>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-item">
            <div className="stat-label">Total Events</div>
            <div className="stat-value">{statistics.totalVoyageEvents.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Active Vessels</div>
            <div className="stat-value">{statistics.uniqueVessels}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Hours</div>
            <div className="stat-value">{statistics.totalHours.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Utilization Rate</div>
            <div className="stat-value">{statistics.utilizationRate}%</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-section">
          <Filter className="filter-icon" />
          <span className="filter-label">Filters</span>
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <Calendar size={16} />
            <select 
              className="filter-select"
              value={filters.selectedMonth}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
            >
              <option value="all">All Months</option>
              {filterOptions.months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <MapPin size={16} />
            <select 
              className="filter-select"
              value={filters.selectedDepartment}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedDepartment: e.target.value }))}
            >
              <option value="all">All Departments</option>
              {filterOptions.departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <Ship size={16} />
            <select 
              className="filter-select"
              value={filters.selectedVessel}
              onChange={(e) => setFilters(prev => ({ ...prev, selectedVessel: e.target.value }))}
            >
              <option value="all">All Vessels</option>
              {filterOptions.vessels.slice(0, 20).map(vessel => (
                <option key={vessel} value={vessel}>{vessel}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button className="filter-reset-btn" onClick={() => setFilters({
            selectedMonth: 'all',
            selectedDepartment: 'all',
            selectedVessel: 'all',
            selectedCompany: 'all'
          })}>
            Reset
          </button>
          <button className="filter-apply-btn">
            Apply Filters
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Clock size={24} style={{ color: '#10b981' }} />
            </div>
            <div className="kpi-info">
              <h3 className="kpi-title">Total Offshore Time</h3>
              <p className="kpi-subtitle">All vessel activities at offshore locations</p>
            </div>
          </div>
          <div className="kpi-value">
            <div className="kpi-number">{statistics.totalHours.toLocaleString()}</div>
          </div>
          <div className="kpi-change">
            <div className="kpi-change-value" style={{ color: '#10b981' }}>
              <TrendingUp size={16} />
              <span>5.2% vs last month</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Activity size={24} style={{ color: '#3b82f6' }} />
            </div>
            <div className="kpi-info">
              <h3 className="kpi-title">Productive Hours</h3>
              <p className="kpi-subtitle">Time spent on productive activities</p>
            </div>
          </div>
          <div className="kpi-value">
            <div className="kpi-number">{statistics.productiveHours.toLocaleString()}</div>
          </div>
          <div className="kpi-change">
            <div className="kpi-change-value" style={{ color: '#10b981' }}>
              <TrendingUp size={16} />
              <span>3.1% vs last month</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <div className="kpi-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Ship size={24} style={{ color: '#f59e0b' }} />
            </div>
            <div className="kpi-info">
              <h3 className="kpi-title">Vessel Utilization</h3>
              <p className="kpi-subtitle">Percentage of time vessels are productive</p>
            </div>
          </div>
          <div className="kpi-value">
            <div className="kpi-number">{statistics.utilizationRate}%</div>
          </div>
          <div className="kpi-change">
            <div className="kpi-change-value" style={{ color: '#ef4444' }}>
              <TrendingDown size={16} />
              <span>1.8% vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* First Row */}
        <div className="chart-row">
          <div className="chart-container" style={{ height: '400px' }}>
            <div className="chart-header">
              <div className="chart-title-container">
                <BarChart3 className="chart-icon" size={20} />
                <h3 className="chart-title">Activity Breakdown by Type</h3>
              </div>
              <div className="chart-actions">
                <button className="chart-action-btn">
                  <Download size={16} />
                </button>
                <button className="chart-action-btn">
                  <Settings size={16} />
                </button>
              </div>
            </div>
            <div className="chart-content">
              <div className="chart-placeholder-content">
                <BarChart3 className="chart-placeholder-icon" />
                <div className="chart-placeholder-text">Activity Analysis</div>
                <div className="chart-placeholder-subtext">
                  Interactive charts will be available in the next phase
                </div>
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ height: '400px' }}>
            <div className="chart-header">
              <div className="chart-title-container">
                <PieChart className="chart-icon" size={20} />
                <h3 className="chart-title">Vessel Distribution</h3>
              </div>
              <div className="chart-actions">
                <button className="chart-action-btn">
                  <Download size={16} />
                </button>
              </div>
            </div>
            <div className="chart-content">
              <div className="chart-placeholder-content">
                <PieChart className="chart-placeholder-icon" />
                <div className="chart-placeholder-text">Fleet Overview</div>
                <div className="chart-placeholder-subtext">
                  Vessel utilization by company and type
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="chart-row">
          <div className="chart-container" style={{ height: '300px' }}>
            <div className="chart-header">
              <div className="chart-title-container">
                <TrendingUp className="chart-icon" size={20} />
                <h3 className="chart-title">Performance Trends</h3>
              </div>
            </div>
            <div className="chart-content">
              <div className="chart-placeholder-content">
                <TrendingUp className="chart-placeholder-icon" />
                <div className="chart-placeholder-text">Time Series Analysis</div>
                <div className="chart-placeholder-subtext">Month-over-month performance tracking</div>
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ height: '300px' }}>
            <div className="chart-header">
              <div className="chart-title-container">
                <MapPin className="chart-icon" size={20} />
                <h3 className="chart-title">Location Analytics</h3>
              </div>
            </div>
            <div className="chart-content">
              <div className="chart-placeholder-content">
                <MapPin className="chart-placeholder-icon" />
                <div className="chart-placeholder-text">Facility Operations</div>
                <div className="chart-placeholder-subtext">Activity by offshore location</div>
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ height: '300px' }}>
            <div className="chart-header">
              <div className="chart-title-container">
                <Activity className="chart-icon" size={20} />
                <h3 className="chart-title">KPI Summary</h3>
              </div>
            </div>
            <div className="chart-content">
              <div className="chart-placeholder-content">
                <Activity className="chart-placeholder-icon" />
                <div className="chart-placeholder-text">Key Metrics</div>
                <div className="chart-placeholder-subtext">Executive dashboard overview</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="chart-container" style={{ marginTop: '2rem' }}>
        <div className="chart-header">
          <div className="chart-title-container">
            <Activity className="chart-icon" size={20} />
            <h3 className="chart-title">Data Processing Summary</h3>
          </div>
          <div className="chart-actions">
            <button className="chart-action-btn">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className="chart-content">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{statistics.totalVoyageEvents}</div>
              <div className="text-sm text-green-600">Voyage Events</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalManifests}</div>
              <div className="text-sm text-blue-600">Vessel Manifests</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{statistics.totalFacilities}</div>
              <div className="text-sm text-yellow-600">Facilities</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{statistics.uniqueVessels}</div>
              <div className="text-sm text-purple-600">Unique Vessels</div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Processing Status</h4>
            <p className="text-sm text-gray-600">
              ✅ Data successfully processed at {lastUpdated ? lastUpdated.toLocaleString() : 'Unknown'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Ready for advanced analytics and visualizations in Phase 3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;