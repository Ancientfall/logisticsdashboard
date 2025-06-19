import React, { useState, useEffect } from 'react';
import { BarChart2, Factory, GitBranch, Ship, DollarSign, Settings2, Bell, Clock, ChevronRight, Package, Upload, Shield, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from '../notifications/NotificationPanel';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const { lastUpdated } = useData();
  const { state: notificationState } = useNotifications();

  // Determine current view based on route
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/drilling') return 'drilling';
    if (path === '/production') return 'production';
    if (path === '/comparison') return 'comparison';
    if (path === '/voyage') return 'voyage';
    if (path === '/cost') return 'cost';
    if (path === '/bulk') return 'bulk';
    if (path === '/upload') return 'upload';
    if (path === '/dashboard') return 'dashboard';
    return 'selector';
  };

  const currentView = getCurrentView();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { 
      path: '/drilling', 
      icon: Factory, 
      label: 'Drilling',
      view: 'drilling'
    },
    { 
      path: '/production', 
      icon: Settings2, 
      label: 'Production',
      view: 'production'
    },
    { 
      path: '/voyage', 
      icon: Ship, 
      label: 'Voyage',
      view: 'voyage'
    },
    { 
      path: '/bulk', 
      icon: Package, 
      label: 'Bulk Actions',
      view: 'bulk'
    },
    { 
      path: '/cost', 
      icon: DollarSign, 
      label: 'Cost Allocation',
      view: 'cost'
    },
    { 
      path: '/comparison', 
      icon: GitBranch, 
      label: 'Comparison',
      view: 'comparison'
    },
    { 
      path: '/dashboard', 
      icon: BarChart2, 
      label: 'Summary',
      view: 'dashboard'
    }
  ];

  // Show all navigation items for internal tool
  const visibleNavItems = navItems;

  const hasUnreadNotifications = notificationState.notifications.some(n => !n.isRead);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-xl">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-8">
              {/* Logo/Brand */}
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">bp</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">BP Logistics Analytics</h1>
                  <p className="text-sm text-gray-300">Internal Operations Dashboard</p>
                </div>
              </button>

              {/* Data Status */}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">
                    {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'No data loaded'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Current Time */}
              <div className="flex items-center gap-2 text-gray-300">
                <Clock size={16} />
                <span className="text-sm font-mono">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>

              {/* Notifications */}
              <button
                onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                className={`relative p-2 rounded-lg transition-colors ${
                  hasUnreadNotifications 
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Bell size={20} />
                {hasUnreadNotifications && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
                )}
              </button>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                >
                  <Home size={16} />
                  <span className="text-sm">Home</span>
                </button>
                <button 
                  onClick={() => navigate('/upload')}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                >
                  <Upload size={16} />
                  <span className="text-sm">Upload</span>
                </button>
                <button 
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                >
                  <Shield size={16} />
                  <span className="text-sm">Admin</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-gray-850 border-b border-gray-800">
          <div className="max-w-screen-2xl mx-auto px-6">
            <nav className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Navigation Items */}
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                        currentView === item.view
                          ? 'border-green-500 text-white bg-gray-800/50'
                          : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-400">
                  {currentView && (
                    <>
                      <span className="capitalize">{currentView}</span>
                      <ChevronRight size={12} className="inline mx-1" />
                      Dashboard
                    </>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      {isNotificationPanelOpen && (
        <NotificationPanel 
          isOpen={isNotificationPanelOpen}
          onClose={() => setIsNotificationPanelOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;