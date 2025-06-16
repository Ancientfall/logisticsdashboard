import React, { useState, useEffect } from 'react';
import { BarChart2, Factory, GitBranch, Ship, DollarSign, Settings2, Bell, Clock, ChevronRight, Package, Grid3X3, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import NotificationPanel from '../notifications/NotificationPanel';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar } from '@nextui-org/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView?: 'dashboard' | 'drilling' | 'production' | 'comparison' | 'voyage' | 'cost' | 'bulk';
  onNavigateHome?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToDrilling?: () => void;
  onNavigateToProduction?: () => void;
  onNavigateToComparison?: () => void;
  onNavigateToVoyage?: () => void;
  onNavigateToCost?: () => void;
  onNavigateToBulk?: () => void;
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
  onNavigateToCost,
  onNavigateToBulk
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const { clearAllData, lastUpdated } = useData();
  const { state: notificationState } = useNotifications();
  const { user, logout } = useAuth();

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
                  onClick={onNavigateHome}
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
                <button
                  onClick={onNavigateToDrilling}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                    currentView === 'drilling'
                      ? 'border-green-500 text-white bg-gray-800/50'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  <Factory size={20} />
                  <span className="font-medium">Drilling</span>
                </button>

                <button
                  onClick={onNavigateToProduction}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                    currentView === 'production'
                      ? 'border-green-500 text-white bg-gray-800/50'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  <BarChart2 size={20} />
                  <span className="font-medium">Production</span>
                </button>

                <button
                  onClick={onNavigateToComparison}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                    currentView === 'comparison'
                      ? 'border-green-500 text-white bg-gray-800/50'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  <GitBranch size={20} />
                  <span className="font-medium">Comparison</span>
                </button>

                <button
                  onClick={onNavigateToVoyage}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                    currentView === 'voyage'
                      ? 'border-green-500 text-white bg-gray-800/50'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  <Ship size={20} />
                  <span className="font-medium">Voyage Analytics</span>
                </button>

                <button
                  onClick={onNavigateToCost}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                    currentView === 'cost'
                      ? 'border-green-500 text-white bg-gray-800/50'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  <DollarSign size={20} />
                  <span className="font-medium">Cost Allocation</span>
                </button>

                <button
                  onClick={onNavigateToBulk}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all duration-200 ${
                    currentView === 'bulk'
                      ? 'border-green-500 text-white bg-gray-800/50'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                >
                  <Package size={20} />
                  <span className="font-medium">Bulk Actions</span>
                </button>
              </div>

              {/* Settings Button - Separated */}
              <button
                onClick={onNavigateToDashboard}
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
                  onClick={onNavigateHome}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                  title="Return to Dashboard Selection"
                >
                  <Grid3X3 size={16} />
                  <span className="font-medium">All Dashboards</span>
                </button>
                <ChevronRight size={16} className="text-gray-400" />
                <span className="text-gray-700 font-medium">
                  {currentView === 'drilling' && 'Drilling Dashboard'}
                  {currentView === 'production' && 'Production Dashboard'}
                  {currentView === 'comparison' && 'Comparison Dashboard'}
                  {currentView === 'voyage' && 'Voyage Analytics'}
                  {currentView === 'cost' && 'Cost Allocation'}
                  {currentView === 'bulk' && 'Bulk Actions'}
                  {currentView === 'dashboard' && 'Data Settings'}
                </span>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Last updated: {lastUpdated.toLocaleDateString()}
                  </span>
                )}
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export Data
                </button>
                <button 
                  onClick={handleResetData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors"
                  title="Reset data and return to upload mode"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
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
      
      {/* Notification Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;