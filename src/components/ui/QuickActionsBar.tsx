/**
 * Floating Quick Actions Bar for BP Logistics Dashboard
 * Provides easy access to common operations with context-aware actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  Settings, 
  HelpCircle, 
  Zap, 
  MoreHorizontal,
  X,
  Home,
  BarChart3,
  Database,
  Monitor
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { logInfo } from '../../utils/logger';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  isVisible?: boolean;
  isPrimary?: boolean;
  badge?: string | number;
  tooltip?: string;
}

interface QuickActionsBarProps {
  customActions?: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showOnMobile?: boolean;
  className?: string;
}

/**
 * Get context-aware actions based on current route
 */
const useContextActions = (): QuickAction[] => {
  const navigate = useNavigate();
  const location = useLocation();
  const { forceRefreshFromStorage, isDataReady, voyageEvents } = useData();
  
  return [
    // Always available actions
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onClick: () => navigate('/'),
      tooltip: 'Go to home page',
      isVisible: location.pathname !== '/'
    },
    {
      id: 'dashboards',
      label: 'Analytics',
      icon: BarChart3,
      onClick: () => navigate('/dashboards'),
      tooltip: 'View all dashboards',
      isVisible: location.pathname !== '/dashboards'
    },
    {
      id: 'refresh',
      label: 'Refresh Data',
      icon: RefreshCw,
      onClick: () => {
        logInfo('Manual data refresh triggered', { component: 'quick-actions' });
        forceRefreshFromStorage();
      },
      tooltip: 'Refresh all data from server',
      isVisible: isDataReady
    },
    {
      id: 'upload',
      label: 'Upload Data',
      icon: Upload,
      onClick: () => navigate('/upload'),
      tooltip: 'Upload new data files',
      isVisible: true,
      isPrimary: !isDataReady
    },
    {
      id: 'tv-display',
      label: 'TV Display',
      icon: Monitor,
      onClick: () => navigate('/tv-display'),
      tooltip: 'Open kiosk display mode',
      isVisible: location.pathname !== '/tv-display'
    },
    // Context-specific actions
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      onClick: () => {
        // Implement export functionality
        logInfo('Export action triggered', { 
          component: 'quick-actions',
          data: { currentPath: location.pathname }
        });
      },
      tooltip: 'Export current view data',
      isVisible: isDataReady && location.pathname !== '/' && location.pathname !== '/upload'
    }
  ];
};

/**
 * Position classes for different placements
 */
const positionClasses = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6'
};

/**
 * Individual action button component
 */
const ActionButton: React.FC<{ 
  action: QuickAction;
  isExpanded: boolean;
  index: number;
}> = ({ action, isExpanded, index }) => {
  const Icon = action.icon;

  return (
    <button
      onClick={action.onClick}
      title={action.tooltip}
      className={`
        group relative flex items-center gap-3 p-3 rounded-full shadow-lg transition-all duration-300
        ${action.isPrimary 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
        }
        ${isExpanded ? 'w-auto min-w-12' : 'w-12 h-12'}
        hover:scale-105 active:scale-95
      `}
      style={{
        animationDelay: `${index * 0.05}s`
      }}
    >
      <Icon size={20} className="flex-shrink-0" />
      
      {isExpanded && (
        <span className="whitespace-nowrap font-medium animate-fade-in">
          {action.label}
        </span>
      )}
      
      {action.badge && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {action.badge}
        </div>
      )}
    </button>
  );
};

/**
 * Main Quick Actions Bar component
 */
export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  customActions = [],
  position = 'bottom-right',
  showOnMobile = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const contextActions = useContextActions();

  // Combine context actions with custom actions
  const allActions = [...contextActions, ...customActions].filter(action => 
    action.isVisible !== false
  );

  // Hide on scroll (optional UX improvement)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsVisible(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsVisible(true), 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  // Don't render if no actions or hidden on mobile
  if (allActions.length === 0 || (!showOnMobile && window.innerWidth < 768)) {
    return null;
  }

  return (
    <div 
      className={`
        fixed z-40 transition-all duration-300
        ${positionClasses[position]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${!showOnMobile ? 'hidden md:block' : ''}
        ${className}
      `}
    >
      <div 
        className={`
          flex items-center gap-2 transition-all duration-300
          ${position.includes('left') ? 'flex-row' : 'flex-row-reverse'}
          ${position.includes('top') ? 'flex-col-reverse' : 'flex-col'}
        `}
      >
        {/* Main Actions */}
        <div className={`
          flex gap-2 transition-all duration-300 overflow-hidden
          ${position.includes('left') ? 'flex-row' : 'flex-row-reverse'}
          ${position.includes('top') ? 'flex-col-reverse' : 'flex-col'}
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          {allActions.slice(0, -1).map((action, index) => (
            <ActionButton
              key={action.id}
              action={action}
              isExpanded={isExpanded}
              index={index}
            />
          ))}
        </div>

        {/* Primary Action / Toggle */}
        <div className={`
          flex gap-2
          ${position.includes('left') ? 'flex-row' : 'flex-row-reverse'}
        `}>
          {/* Primary action if available */}
          {allActions.find(a => a.isPrimary) && (
            <ActionButton
              action={allActions.find(a => a.isPrimary)!}
              isExpanded={false}
              index={0}
            />
          )}

          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              w-12 h-12 rounded-full shadow-lg transition-all duration-300
              bg-gray-900 hover:bg-gray-800 text-white
              flex items-center justify-center
              hover:scale-105 active:scale-95
              ${isExpanded ? 'rotate-45' : 'rotate-0'}
            `}
            title={isExpanded ? 'Close quick actions' : 'Open quick actions'}
          >
            {isExpanded ? <X size={20} /> : <MoreHorizontal size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Keyboard shortcut hook for quick actions
 */
export const useQuickActionShortcuts = (actions: QuickAction[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt + number keys for quick actions (1-9)
      if (event.altKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const index = parseInt(event.key) - 1;
        const action = actions[index];
        if (action && action.isVisible !== false) {
          action.onClick();
          logInfo('Quick action triggered via keyboard', {
            component: 'quick-actions',
            data: { actionId: action.id, shortcut: `Alt+${event.key}` }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};