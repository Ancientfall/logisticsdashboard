import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  BarChart3, 
  Database, 
  TrendingUp, 
  Shield, 
  Zap, 
  ArrowRight, 
  Play,
  CheckCircle,
  DollarSign,
  Drill,
  Factory
} from 'lucide-react';
import { useData } from '../context/DataContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onViewDashboard: () => void;
  hasData: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onViewDashboard, hasData }) => {
  const { forceRefreshFromStorage } = useData();
  const [currentStat, setCurrentStat] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const stats = [
    { value: '24', label: 'Active Vessels', icon: Ship },
    { value: '157K', label: 'MT Cargo Capacity', icon: Database },
    { value: '87.3%', label: 'Efficiency Rate', icon: TrendingUp },
    { value: '$2.4M', label: 'Cost Savings', icon: DollarSign }
  ];

  const features = [
    {
      icon: Database,
      title: 'Cost Allocation Management',
      description: 'Track and analyze vessel costs across drilling and production operations with intelligent cost attribution.',
      color: 'bg-blue-500'
    },
    {
      icon: BarChart3,
      title: 'Vessel Performance Analytics',
      description: 'Monitor vessel operations, efficiency metrics, and cost optimization across your fleet.',
      color: 'bg-green-500'
    },
    {
      icon: Drill,
      title: 'Drilling Operations',
      description: 'Comprehensive tracking of drilling activities, including Thunder Horse and Mad Dog operations.',
      color: 'bg-purple-500'
    },
    {
      icon: Factory,
      title: 'Production Analytics',
      description: 'Monitor production facilities performance, vessel visits, and operational efficiency.',
      color: 'bg-orange-500'
    },
    {
      icon: Shield,
      title: 'Data Security',
      description: 'Enterprise-grade security with local data storage and automatic data validation.',
      color: 'bg-red-500'
    },
    {
      icon: Zap,
      title: 'Real-Time Processing',
      description: 'Instant data processing and validation for immediate insights and analysis.',
      color: 'bg-yellow-500'
    }
  ];

  const dashboards = [
    {
      title: 'Cost Allocation Dashboard',
      description: 'Track and analyze vessel costs across drilling and production operations',
      image: '💰',
      metrics: ['Daily Rates', 'Cost Attribution', 'Budget Analysis', 'Cost Trends']
    },
    {
      title: 'Vessel Operations',
      description: 'Monitor vessel performance, efficiency, and operational metrics',
      image: '🚢',
      metrics: ['Vessel Utilization', 'Operational Hours', 'Efficiency Metrics', 'Cost Analysis']
    },
    {
      title: 'Drilling & Production',
      description: 'Comprehensive analytics for Thunder Horse and Mad Dog operations',
      image: '🛢️',
      metrics: ['Drilling Metrics', 'Production Analytics', 'Cost Allocation', 'Performance KPIs']
    }
  ];

  // Debug localStorage on component mount and check for storage issues
  useEffect(() => {
    console.log('🔍 LandingPage mounted - Debugging localStorage:');
    try {
      // Check for storage quota issues first
      try {
        localStorage.setItem('quota-test', 'test');
        localStorage.removeItem('quota-test');
        console.log('✅ localStorage is accessible');
      } catch (quotaError) {
        console.error('🚨 STORAGE QUOTA EXCEEDED - localStorage is full!');
        console.error('💡 Go to Upload page and click "🚨 Emergency Clear" to fix this');
        return;
      }

      const savedData = localStorage.getItem('bp-logistics-data');
      const isChunked = localStorage.getItem('bp-logistics-data-chunked') === 'true';
      const isCompressed = localStorage.getItem('bp-logistics-data-compressed') === 'true';
      const hasMinimal = !!localStorage.getItem('bp-logistics-data-minimal');
      const hasEmergency = !!localStorage.getItem('bp-logistics-data-emergency');
      
      console.log('💾 localStorage Analysis:', {
        hasData: !!savedData,
        dataSize: savedData ? (savedData.length / 1024).toFixed(1) + 'KB' : 'No data',
        isChunked,
        isCompressed,
        hasMinimal,
        hasEmergency,
        hasDataProp: hasData
      });

      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('📊 Parsed data structure:', {
          hasMetadata: !!parsed.metadata,
          totalRecords: parsed.metadata?.totalRecords || 0,
          voyageEventsCount: (parsed.voyageEvents || []).length,
          vesselManifestsCount: (parsed.vesselManifests || []).length,
          voyageListCount: (parsed.voyageList || []).length,
          costAllocationCount: (parsed.costAllocation || []).length
        });
      }
    } catch (error) {
      console.error('❌ Failed to debug localStorage:', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('🚨 Storage is completely full! Go to Upload page and use Emergency Clear.');
      }
    }
  }, [hasData]);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stats.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-green-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            {/* Logo */}
            <div className={`inline-flex items-center gap-4 mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-3xl">bp</span>
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold text-white">Logistics Analytics</h1>
                <p className="text-green-300 text-lg">Offshore Operations Intelligence</p>
              </div>
            </div>

            {/* Main Headline */}
            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
                Optimize Your
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent"> Offshore Operations</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Advanced analytics platform for drilling and production operations. Track vessel costs, 
                monitor performance, and optimize your offshore logistics with intelligent dashboards.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <button 
                onClick={onGetStarted}
                className="group bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-3 justify-center"
              >
                Upload Data
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              <button 
                onClick={hasData ? onViewDashboard : onGetStarted}
                className="group bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20 flex items-center gap-3 justify-center"
              >
                <Play size={20} />
                {hasData ? 'View Analytics' : 'View Demo'}
              </button>
            </div>
            

            {/* Live Stats */}
            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl mx-auto border border-white/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isActive = index === currentStat;
                    return (
                      <div 
                        key={index}
                        className={`text-center transition-all duration-500 ${
                          isActive ? 'scale-110 text-green-300' : 'text-white'
                        }`}
                      >
                        <Icon className={`mx-auto mb-2 transition-all duration-500 ${
                          isActive ? 'text-green-400 scale-125' : 'text-gray-300'
                        }`} size={32} />
                        <div className="text-3xl font-bold mb-1">{stat.value}</div>
                        <div className="text-sm opacity-80">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Offshore Analytics
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From cost allocation to vessel operations, our platform provides detailed insights 
              for optimizing your offshore operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200 hover:-translate-y-2"
                >
                  <div className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dashboard Showcase */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Specialized Analytics Dashboards
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Purpose-built analytics for cost allocation, vessel operations, and drilling/production analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {dashboards.map((dashboard, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="text-6xl mb-6 text-center">{dashboard.image}</div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4 text-center">{dashboard.title}</h4>
                <p className="text-gray-600 mb-6 text-center">{dashboard.description}</p>
                <div className="space-y-3">
                  {dashboard.metrics.map((metric, metricIndex) => (
                    <div key={metricIndex} className="flex items-center gap-3">
                      <CheckCircle className="text-green-500" size={16} />
                      <span className="text-gray-700">{metric}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Get Started in Minutes
            </h3>
            <p className="text-xl text-gray-600">
              Simple three-step process to transform your data into actionable insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database className="text-white" size={32} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">1. Upload Your Data</h4>
              <p className="text-gray-600">
                Upload your cost allocation, vessel operations, and drilling data. 
                Our system handles validation and processing automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="text-white" size={32} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">2. Process & Validate</h4>
              <p className="text-gray-600">
                Our system validates your data, processes cost allocations, and prepares 
                it for comprehensive analysis.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="text-white" size={32} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">3. Analyze & Optimize</h4>
              <p className="text-gray-600">
                Access detailed analytics for cost allocation, vessel operations, and 
                drilling/production performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to Optimize Your Operations?
          </h3>
          <p className="text-xl text-green-100 mb-8">
            Start analyzing your offshore operations data today and gain valuable insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={onGetStarted}
              className="bg-white text-green-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-3 justify-center"
            >
              Upload Data
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={hasData ? onViewDashboard : onGetStarted}
              className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 border border-white/30"
            >
              {hasData ? 'View Analytics' : 'View Demo'}
            </button>
            
            {/* Debug refresh button */}
            <button
              onClick={() => {
                console.log('🔄 Manual debug refresh triggered');
                forceRefreshFromStorage();
              }}
              className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/20 transition-all duration-300 border border-white/20"
              title="Force refresh data from localStorage"
            >
              🔄 Debug Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">bp</span>
              </div>
              <div>
                <div className="font-bold text-lg">BP Logistics Analytics</div>
                <div className="text-gray-400 text-sm">Offshore Operations Intelligence</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-sm">All systems operational</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© 2024 BP p.l.c. All rights reserved. | Privacy Policy | Terms of Service</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 