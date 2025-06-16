import React, { useState, useEffect } from 'react';
import { BarChart2, Factory, GitBranch, Ship, DollarSign, Settings2, Bell, Clock, ChevronRight, Package, Grid3X3, User, LogOut, Upload } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import NotificationPanel from '../notifications/NotificationPanel';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@nextui-org/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const { clearAllData, lastUpdated } = useData();
  const { state: notificationState } = useNotifications();
  const { user, logout } = useAuth();

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

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This will clear the dashboard and return to upload mode.')) {
      clearAllData();
      navigate('/upload');
    }
  };

  const navItems = [
    { 
      path: '/drilling', 
      icon: Factory, 
      label: 'Drilling',
      view: 'drilling'
    },
    { 
      path: '/production', 
      icon: BarChart2, 
      label: 'Production',
      view: 'production'
    },
    { 
      path: '/comparison', 
      icon: GitBranch, 
      label: 'Comparison',
      view: 'comparison'
    },
    { 
      path: '/voyage', 
      icon: Ship, 
      label: 'Voyage Analytics',
      view: 'voyage'
    },
    { 
      path: '/cost', 
      icon: DollarSign, 
      label: 'Cost Allocation',
      view: 'cost',
      requiredRole: 'manager'
    },
    { 
      path: '/bulk', 
      icon: Package, 
      label: 'Bulk Actions',
      view: 'bulk'
    }
  ];

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    if (!item.requiredRole) return true;
    
    const roleHierarchy = {
      viewer: 1,
      manager: 2,
      admin: 3
    };
    
    const userRoleLevel = roleHierarchy[user?.role || 'viewer'];
    const requiredRoleLevel = roleHierarchy[item.requiredRole];
    
    return userRoleLevel >= requiredRoleLevel;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gray-900 relative z-20">
        {/* Top Bar */}
        <div className="border-b border-gray-800">
          <div className="max-w-screen-2xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section - Logo & Title */}
              <div className="flex items-center gap-6">
                <div 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">bp</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Logistics Analytics</h1>
                    <p className="text-xs text-gray-400">Offshore Vessel Operations</p>
                  </div>
                </div>
              </div>

              {/* Right Section - Date/Time, Notifications & User */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock size={16} />
                  <span className="text-sm">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • 
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button 
                  onClick={() => setIsNotificationPanelOpen(true)}
                  className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Bell size={18} className="text-gray-300" />
                  {notificationState.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {notificationState.unreadCount > 99 ? '99+' : notificationState.unreadCount}
                    </span>
                  )}
                </button>
                
                {/* User Dropdown */}
                {user && (
                  <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                      <button className="flex items-center gap-3 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                        <Avatar
                          size="sm"
                          name={`${user.firstName} ${user.lastName}`}
                          className="bg-bp-green text-white"
                        />
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                        </div>
                      </button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User menu">
                      <DropdownItem key="profile" startContent={<User size={16} />}>
                        Profile Settings
                      </DropdownItem>
                      {user.role !== 'viewer' && (
                        <DropdownItem 
                          key="upload" 
                          startContent={<Upload size={16} />}
                          onClick={() => navigate('/upload')}
                        >
                          Upload Data
                        </DropdownItem>
                      )}
                      <DropdownItem 
                        key="logout" 
                        startContent={<LogOut size={16} />}
                        color="danger"
                        onClick={logout}
                      >
                        Log Out
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                )}
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

              {/* Settings Button - Separated */}
              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center gap-3 px-6 py-4 ml-6 border-b-2 transition-all duration-200 ${
                  currentView === 'dashboard'
                    ? 'border-green-500 text-white bg-gray-800/50'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                }`}
              >
                <Settings2 size={20} />
                <span className="font-medium">Data Settings</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Breadcrumb Bar */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-screen-2xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm">
                <button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                >
                  <Grid3X3 size={16} />
                  <span>Dashboard Selector</span>
                </button>
                
                {currentView !== 'selector' && (
                  <>
                    <ChevronRight size={16} className="text-gray-400" />
                    <span className="text-gray-700 font-medium">
                      {navItems.find(item => item.view === currentView)?.label || 
                       (currentView === 'dashboard' ? 'Data Settings' : 
                        currentView === 'upload' ? 'Upload Data' : 'Dashboard')}
                    </span>
                  </>
                )}
              </div>

              {/* Last Updated */}
              {lastUpdated && (
                <div className="text-xs text-gray-500">
                  Last data update: {new Date(lastUpdated).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;