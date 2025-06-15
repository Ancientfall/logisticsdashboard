import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  BarChart3, 
  Database, 
  Zap, 
  ArrowRight,
  CheckCircle,
  DollarSign,
  Anchor,
  Activity,
  Layers,
  Target,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onViewDashboard: () => void;
  hasData: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onViewDashboard, hasData }) => {
  const [currentStat, setCurrentStat] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse position for interactive gradient
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const stats = [
    { value: '5', label: 'Analytics Dashboards', icon: BarChart3, suffix: '' },
    { value: '24/7', label: 'Real-time Updates', icon: Activity, suffix: '' },
    { value: '100', label: 'Data Accuracy', icon: Target, suffix: '%' },
    { value: '60', label: 'Faster Insights', icon: Zap, suffix: '%' }
  ];

  const dashboards = [
    {
      id: 'drilling',
      title: 'Drilling Operations',
      description: 'Track Thunder Horse & Mad Dog drilling activities with intelligent cost allocation',
      icon: Anchor,
      gradient: 'from-blue-500 to-cyan-600',
      features: ['Well-specific tracking', 'LC-based allocation', 'Real-time monitoring', 'Cost analysis'],
      metrics: { wells: 12, efficiency: '94%', savings: '$1.2M' }
    },
    {
      id: 'production',
      title: 'Production Analytics',
      description: 'Monitor production facility performance and vessel operations',
      icon: Activity,
      gradient: 'from-purple-500 to-pink-600',
      features: ['Facility tracking', 'Vessel visits', 'Efficiency metrics', 'Performance KPIs'],
      metrics: { facilities: 8, uptime: '98.5%', vessels: 24 }
    },
    {
      id: 'voyage',
      title: 'Voyage Intelligence',
      description: 'Comprehensive voyage analytics with route optimization and cost tracking',
      icon: Ship,
      gradient: 'from-green-500 to-emerald-600',
      features: ['Route analysis', 'Port operations', 'Fuel efficiency', 'Timeline tracking'],
      metrics: { voyages: 157, routes: 32, efficiency: '87%' }
    },
    {
      id: 'cost',
      title: 'Cost Allocation',
      description: 'Intelligent cost distribution across drilling and production operations',
      icon: DollarSign,
      gradient: 'from-orange-500 to-red-600',
      features: ['Smart allocation', 'Budget tracking', 'Cost trends', 'Department analysis'],
      metrics: { tracked: '$42M', savings: '15%', accuracy: '99.2%' }
    },
    {
      id: 'comparison',
      title: 'Comparison Analytics',
      description: 'Compare performance across vessels, facilities, and time periods',
      icon: Layers,
      gradient: 'from-indigo-500 to-purple-600',
      features: ['Multi-vessel analysis', 'Trend comparison', 'Benchmarking', 'Performance gaps'],
      metrics: { comparisons: 450, insights: 89, improvements: '23%' }
    }
  ];

  const workflow = [
    {
      step: '01',
      title: 'Access Real-Time Data',
      description: 'Connect to live operational data streams from vessels, drilling platforms, and production facilities',
      icon: Database,
      color: 'text-blue-500'
    },
    {
      step: '02',
      title: 'Automatic Processing',
      description: 'Our AI validates, enriches, and processes your data with intelligent categorization',
      icon: Sparkles,
      color: 'text-purple-500'
    },
    {
      step: '03',
      title: 'Instant Analytics',
      description: 'Access powerful dashboards with real-time insights and actionable intelligence',
      icon: BarChart3,
      color: 'text-green-500'
    }
  ];

  // Debug localStorage on component mount
  useEffect(() => {
    console.log('🔍 LandingPage mounted - Checking for data:', { hasData });
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stats.length, hasData]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      {/* Dynamic gradient background */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(34, 197, 94, 0.15), transparent 50%)`
        }}
      />

      {/* Hero Section */}
      <div className="relative">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
          {/* Navigation */}
          <nav className="flex items-center justify-between mb-16">
            <div className={`flex items-center gap-3 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">bp</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Logistics Analytics</h1>
                <p className="text-sm text-gray-600">Offshore Intelligence Platform</p>
              </div>
            </div>
            <div className={`flex items-center gap-4 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <button 
                onClick={hasData ? onViewDashboard : onGetStarted}
                className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {hasData ? 'View Analytics' : 'Demo'}
              </button>
              <button 
                onClick={hasData ? onViewDashboard : onGetStarted}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                {hasData ? 'Select Dashboard' : 'Get Started'}
              </button>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="text-center max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
                <Sparkles size={16} />
                AI-Powered Analytics for Offshore Operations
                <ChevronRight size={16} />
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your
                <span className="block bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent">
                  Offshore Operations
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
                Unlock powerful insights from your vessel operations, drilling activities, and production data 
                with our comprehensive analytics platform.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <button 
                  onClick={hasData ? onViewDashboard : onGetStarted}
                  className="group bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center gap-3 justify-center"
                >
                  <BarChart3 size={20} />
                  {hasData ? 'View Analytics' : 'Get Started'}
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </button>
                <button 
                  onClick={hasData ? onViewDashboard : onGetStarted}
                  className="group bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 shadow-lg border border-gray-200 flex items-center gap-3 justify-center"
                >
                  <Activity size={20} />
                  {hasData ? 'Select Dashboard' : 'Upload Data'}
                </button>
              </div>
            </div>

            {/* Live Stats Ticker */}
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const isActive = index === currentStat;
                    return (
                      <div 
                        key={index}
                        className={`text-center transition-all duration-500 ${
                          isActive ? 'scale-110' : ''
                        }`}
                      >
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 transition-all duration-500 ${
                          isActive ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg' : 'bg-gray-100'
                        }`}>
                          <Icon className={`transition-all duration-500 ${
                            isActive ? 'text-white' : 'text-gray-600'
                          }`} size={24} />
                        </div>
                        <div className={`text-3xl font-bold mb-1 transition-colors duration-500 ${
                          isActive ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {stat.value}{stat.suffix}
                        </div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Showcase */}
      <div className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Five Powerful Analytics Dashboards
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Each dashboard is purpose-built to deliver actionable insights for your specific operational needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard, index) => {
              const Icon = dashboard.icon;
              return (
                <div 
                  key={dashboard.id}
                  className={`group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:-translate-y-2 ${
                    index === 4 ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${dashboard.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`} />
                  
                  <div className={`relative z-10`}>
                    <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${dashboard.gradient} rounded-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{dashboard.title}</h3>
                    <p className="text-gray-600 mb-6">{dashboard.description}</p>
                    
                    <div className="space-y-2 mb-6">
                      {dashboard.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="text-green-500" size={16} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-6 border-t border-gray-100">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {Object.entries(dashboard.metrics).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-lg font-bold text-gray-900">{value}</div>
                            <div className="text-xs text-gray-500 capitalize">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workflow Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple Three-Step Process
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From raw data to actionable insights in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {index < workflow.length - 1 && (
                    <div className="hidden md:block absolute top-24 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent -translate-x-4" />
                  )}
                  
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-5xl font-bold text-gray-200">{step.step}</div>
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${step.color} bg-opacity-10`}>
                        <Icon className={step.color} size={28} />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Optimizing Today
          </h2>
          <p className="text-xl text-green-100 mb-10">
            Join leading offshore operators who've transformed their operations with data-driven insights
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={hasData ? onViewDashboard : onGetStarted}
              className="bg-white text-green-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center gap-3 justify-center"
            >
              <BarChart3 size={20} />
              {hasData ? 'Select Analytics Dashboard' : 'Get Started'}
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={hasData ? onViewDashboard : onGetStarted}
              className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 border-2 border-white/30"
            >
              {hasData ? 'View All Dashboards' : 'Request Access'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">bp</span>
                </div>
                <div>
                  <div className="font-bold text-xl">BP Logistics Analytics</div>
                  <div className="text-gray-400">Offshore Operations Intelligence</div>
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Empowering offshore operations with advanced analytics and intelligent insights 
                for drilling, production, and vessel management.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">Features</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Analytics</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Security</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Pricing</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">About</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Contact</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Support</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Careers</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex items-center justify-between">
            <p className="text-gray-400">© 2024 BP p.l.c. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400 text-sm">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;