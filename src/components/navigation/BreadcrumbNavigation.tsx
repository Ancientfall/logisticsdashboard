/**
 * Breadcrumb Navigation System for BP Logistics Dashboard
 * Provides contextual navigation with smart route detection
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, BarChart3, Settings, Database, TrendingUp } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
  isActive?: boolean;
}

interface BreadcrumbNavigationProps {
  customItems?: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

// Route mapping for breadcrumb generation
const RouteMap: Record<string, { label: string; icon?: React.ComponentType<any> }> = {
  '/': { label: 'Home', icon: Home },
  '/dashboards': { label: 'Analytics Dashboard', icon: BarChart3 },
  '/upload': { label: 'Data Upload', icon: Database },
  '/drilling': { label: 'Drilling Analytics', icon: BarChart3 },
  '/production': { label: 'Production Analytics', icon: BarChart3 },
  '/voyage': { label: 'Voyage Intelligence', icon: BarChart3 },
  '/cost': { label: 'Cost Allocation', icon: BarChart3 },
  '/comparison': { label: 'Comparison Analytics', icon: BarChart3 },
  '/bulk': { label: 'Bulk Operations', icon: BarChart3 },
  '/vessel-requirements': { label: 'Vessel Requirements', icon: BarChart3 },
  '/vessel-forecast': { label: 'Vessel Forecasting', icon: TrendingUp },
  '/tv-display': { label: 'TV Kiosk Display', icon: BarChart3 },
  '/aviation': { label: 'Aviation Dashboard', icon: BarChart3 },
  '/dashboard': { label: 'Data Summary', icon: BarChart3 },
  '/admin': { label: 'Administration', icon: Settings },
  '/admin/reference': { label: 'Reference Data', icon: Database },
};

/**
 * Generate breadcrumb items from current route
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with home if not on home page
  if (pathname !== '/') {
    breadcrumbs.push({
      label: 'Home',
      path: '/',
      icon: Home
    });
  }

  // Build path progressively
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const routeInfo = RouteMap[currentPath];
    
    if (routeInfo) {
      breadcrumbs.push({
        label: routeInfo.label,
        path: currentPath,
        icon: routeInfo.icon,
        isActive: index === segments.length - 1
      });
    }
  });

  return breadcrumbs;
};

/**
 * Individual breadcrumb item component
 */
const BreadcrumbItemComponent: React.FC<{ 
  item: BreadcrumbItem; 
  isLast: boolean; 
  onClick: (path: string) => void;
}> = ({ item, isLast, onClick }) => {
  const Icon = item.icon;

  return (
    <div className="flex items-center">
      <button
        onClick={() => onClick(item.path)}
        disabled={item.isActive}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${item.isActive 
            ? 'text-green-700 bg-green-50 cursor-default' 
            : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
          }
        `}
      >
        {Icon && <Icon size={16} />}
        <span>{item.label}</span>
      </button>
      
      {!isLast && (
        <ChevronRight size={16} className="text-gray-400 mx-1" />
      )}
    </div>
  );
};

/**
 * Main breadcrumb navigation component
 */
export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  customItems,
  showHome = true,
  className = ''
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Use custom items if provided, otherwise generate from route
  const breadcrumbItems = customItems || generateBreadcrumbs(location.pathname);

  // Filter out home if showHome is false
  const filteredItems = showHome ? breadcrumbItems : breadcrumbItems.filter(item => item.path !== '/');

  const handleItemClick = (path: string) => {
    navigate(path);
  };

  if (filteredItems.length === 0) return null;

  return (
    <nav 
      className={`bg-white border-b border-gray-200 px-6 py-3 ${className}`}
      aria-label="Breadcrumb"
    >
      <div className="flex items-center space-x-1 overflow-x-auto">
        {filteredItems.map((item, index) => (
          <BreadcrumbItemComponent
            key={item.path}
            item={item}
            isLast={index === filteredItems.length - 1}
            onClick={handleItemClick}
          />
        ))}
      </div>
    </nav>
  );
};

/**
 * Compact breadcrumb for mobile/small screens
 */
export const CompactBreadcrumb: React.FC<BreadcrumbNavigationProps> = ({
  customItems,
  className = ''
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbItems = customItems || generateBreadcrumbs(location.pathname);
  const currentItem = breadcrumbItems[breadcrumbItems.length - 1];
  const parentItem = breadcrumbItems[breadcrumbItems.length - 2];

  if (!currentItem) return null;

  const Icon = currentItem.icon;

  return (
    <nav className={`bg-white border-b border-gray-200 px-4 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-gray-500" />}
          <span className="text-sm font-medium text-gray-900">{currentItem.label}</span>
        </div>
        
        {parentItem && (
          <button
            onClick={() => navigate(parentItem.path)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back
          </button>
        )}
      </div>
    </nav>
  );
};

/**
 * Hook to get current breadcrumb context
 */
export const useBreadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const breadcrumbs = generateBreadcrumbs(location.pathname);
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];

  const navigateUp = () => {
    if (parentBreadcrumb) {
      navigate(parentBreadcrumb.path);
    }
  };

  const navigateToRoot = () => {
    navigate('/');
  };

  return {
    breadcrumbs,
    currentBreadcrumb,
    parentBreadcrumb,
    navigateUp,
    navigateToRoot,
    canNavigateUp: !!parentBreadcrumb
  };
};