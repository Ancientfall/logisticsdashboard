import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ship, 
  BarChart3, 
  Activity,
  DollarSign,
  Anchor,
  Layers,
  ArrowRight,
  Target,
  Settings,
  Database,
  Zap,
  Monitor,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { DashboardSkeleton, useLoadingState } from './ui/LoadingSystem';

const DashboardShowcase: React.FC = () => {
  const navigate = useNavigate();
  const { isDataReady, voyageEvents, isLoading } = useData();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { isLoading: isInitialLoading, setLoading } = useLoadingState();

  // Simulate progressive loading for better UX
  useEffect(() => {
    if (isLoading || !isDataReady) {
      setLoading('loading', 'Loading dashboard information...');
    } else {
      setLoading('success', 'Dashboard ready!');
      setTimeout(() => setLoading('idle'), 1000);
    }
  }, [isLoading, isDataReady, setLoading]);

  // Track mouse position for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const dashboards = [
    {
      id: 'drilling',
      title: 'Drilling Analytics',
      description: 'Track drilling fluid movements, voyage performance, and weather impact on drilling operations',
      icon: Anchor,
      route: '/drilling',
      gradient: 'from-blue-500 to-cyan-600',
      features: ['Fluid Movement (bbls)', 'Weather Impact Analysis', 'Drilling Voyages', 'Maneuvering Hours'],
      stats: { voyages: '157', weather: '12%', fluids: '45K' }
    },
    {
      id: 'production',
      title: 'Production Analytics',
      description: 'Monitor chemical transfers and vessel operations supporting production facilities',
      icon: Activity,
      route: '/production',
      gradient: 'from-purple-500 to-pink-600',
      features: ['Chemical Movement', 'Production Support', 'Vessel Performance', 'Weather Impact'],
      stats: { chemicals: '28K', voyages: '89', impact: '8%' }
    },
    {
      id: 'voyage',
      title: 'Voyage Intelligence',
      description: 'Comprehensive voyage analytics with duration tracking, route efficiency, and mission analysis',
      icon: Ship,
      route: '/voyage',
      gradient: 'from-green-500 to-emerald-600',
      features: ['Route Efficiency', 'Mission Analysis', 'Duration Tracking', 'Multi-Stop Analysis'],
      stats: { voyages: '246', routes: '32', ontime: '87%' }
    },
    {
      id: 'cost',
      title: 'Cost Allocation',
      description: 'Financial analytics with department cost breakdown, project tracking, and spend analysis',
      icon: DollarSign,
      route: '/cost',
      gradient: 'from-orange-500 to-red-600',
      features: ['Department Analysis', 'Project Tracking', 'Cost Trends', 'Spend Breakdown'],
      stats: { spend: '$42M', depts: '8', projects: '15' }
    },
    {
      id: 'comparison',
      title: 'Comparison Analytics',
      description: 'Side-by-side performance comparison by months, locations, departments, or project types',
      icon: Layers,
      route: '/comparison',
      gradient: 'from-indigo-500 to-purple-600',
      features: ['Multi-Dimension Compare', 'Trend Analysis', 'Performance Metrics', 'Variance Analysis'],
      stats: { metrics: '10+', comparisons: '4', trends: '6mo' }
    },
    {
      id: 'bulk',
      title: 'Bulk Operations',
      description: 'Track bulk fluid transfers with anti-duplication engine and drilling vs completion fluid analysis',
      icon: Target,
      route: '/bulk',
      gradient: 'from-cyan-500 to-blue-600',
      features: ['Transfer Tracking', 'Fluid Type Analysis', 'Route Performance', 'Volume Analytics'],
      stats: { transfers: '234', volume: '67K', routes: '18' }
    },
    {
      id: 'vessel-requirements',
      title: 'Vessel Requirements',
      description: 'Calculate optimal PSV fleet size using whiteboard formula: vessels required = (voyages × 7 days) ÷ 24 hours',
      icon: Calculator,
      route: '/vessel-requirements',
      gradient: 'from-teal-500 to-cyan-600',
      features: ['Fleet Optimization', 'Rig-by-Rig Analysis', 'Utilization Metrics', 'Voyage Patterns'],
      stats: { rigs: '15+', vessels: '8', utilization: '72%' }
    },
    {
      id: 'vessel-forecast',
      title: 'Vessel Demand Forecasting',
      description: '🔮 Strategic 12-month vessel planning with predictive analytics, scenario planning, and management decision support',
      icon: TrendingUp,
      route: '/vessel-forecast',
      gradient: 'from-purple-500 to-indigo-600',
      features: ['12-Month Forecasts', 'Scenario Planning', 'Management Injects', 'Decision Support'],
      stats: { scenarios: '3', accuracy: '85%', horizon: '12mo' }
    },
    {
      id: 'tv-display',
      title: 'TV Kiosk Display',
      description: 'Large-screen rotating KPI display optimized for 110" TVs and operational monitoring centers',
      icon: Monitor,
      route: '/tv-display',
      gradient: 'from-slate-600 to-gray-700',
      features: ['Auto-Rotating KPIs', 'Large Screen Optimized', 'Real-time Metrics', 'Professional Display'],
      stats: { rotation: '10s', metrics: '8', screens: 'TV Ready' }
    },
    {
      id: 'dashboard',
      title: 'Data Processing Summary',
      description: 'Overview of data processing status, quality metrics, and system health monitoring',
      icon: Database,
      route: '/dashboard',
      gradient: 'from-emerald-500 to-teal-600',
      features: ['Data Quality Metrics', 'Processing Status', 'System Health', 'Quick Actions'],
      stats: { processed: '100%', quality: '98.5%', files: '5' }
    },
    {
      id: 'admin',
      title: 'Admin Dashboard',
      description: 'System administration, user management, and configuration settings',
      icon: Settings,
      route: '/admin',
      gradient: 'from-gray-500 to-slate-600',
      features: ['User Management', 'System Config', 'Data Sources', 'Performance Monitoring'],
      stats: { users: '12', sources: '5', uptime: '99.9%' }
    }
  ];

  const handleDashboardClick = (dashboard: typeof dashboards[0]) => {
    navigate(dashboard.route);
  };

  const hasData = isDataReady && voyageEvents.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Dynamic gradient background */}
      <div 
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(34, 197, 94, 0.1), transparent 50%)`
        }}
      />

      {/* Header */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-16">
          {/* Navigation */}
          <nav className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">bp</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600">Choose your analytics view</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Home
              </button>
              {!hasData && (
                <button 
                  onClick={() => navigate('/upload')}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300"
                >
                  Load Data
                </button>
              )}
            </div>
          </nav>

          {/* Status Banner */}
          {hasData ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-12 flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-medium">Data loaded and ready for analysis</span>
              <div className="ml-auto text-sm text-green-600">
                {voyageEvents.length.toLocaleString()} voyage events processed
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-12 flex items-center gap-3">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-amber-700 font-medium">No data loaded - some dashboards may have limited functionality</span>
              <button 
                onClick={() => navigate('/upload')}
                className="ml-auto text-amber-700 hover:text-amber-900 font-medium underline"
              >
                Load Data →
              </button>
            </div>
          )}

          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Analytics
              <span className="block bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
                Dashboards
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Comprehensive offshore operations analytics designed for BP teams. 
              Choose from our specialized dashboards to access the insights you need.
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="relative max-w-7xl mx-auto px-6 pb-24">
        {/* Show skeleton loading while data is loading */}
        {isInitialLoading ? (
          <DashboardSkeleton cards={10} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dashboards.map((dashboard) => {
            const Icon = dashboard.icon;
            const isHovered = hoveredCard === dashboard.id;
            
            return (
              <div
                key={dashboard.id}
                className="group relative cursor-pointer transition-all duration-500 hover:scale-105"
                onMouseEnter={() => setHoveredCard(dashboard.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleDashboardClick(dashboard)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDashboardClick(dashboard);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Card */}
                <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden">
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${dashboard.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  
                  {/* Hover glow effect */}
                  {isHovered && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${dashboard.gradient} opacity-10 blur-xl transition-all duration-300`} />
                  )}

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${dashboard.gradient} rounded-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="text-white" size={24} />
                    </div>

                    {/* Content */}
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">
                      {dashboard.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {dashboard.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-1 mb-4">
                      {dashboard.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                          <div className={`w-1.5 h-1.5 bg-gradient-to-r ${dashboard.gradient} rounded-full`} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                      {Object.entries(dashboard.stats).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="font-bold text-gray-900 text-sm">
                            {value}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{key}</div>
                        </div>
                      ))}
                    </div>

                    {/* Hover arrow */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <div className={`w-8 h-8 bg-gradient-to-br ${dashboard.gradient} rounded-lg flex items-center justify-center shadow-lg`}>
                        <ArrowRight className="text-white" size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover border glow */}
                {isHovered && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${dashboard.gradient} opacity-20 blur-sm -z-10`} />
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Platform Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-gray-900">8</div>
              <div className="text-sm text-gray-600">Analytics Views</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Database className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{hasData ? '5' : '0'}</div>
              <div className="text-sm text-gray-600">Data Sources</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Target className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-gray-900">50+</div>
              <div className="text-sm text-gray-600">KPIs Tracked</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="text-white" size={24} />
              </div>
              <div className="text-2xl font-bold text-gray-900">24/7</div>
              <div className="text-sm text-gray-600">Real-time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardShowcase;