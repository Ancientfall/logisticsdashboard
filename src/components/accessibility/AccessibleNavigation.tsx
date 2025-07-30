/**
 * AccessibleNavigation - WCAG 2.1 AA Compliant Navigation Component
 * Provides keyboard navigation, skip links, and screen reader support
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, Home, BarChart3, Database, Settings } from 'lucide-react';
import { useKeyboardNavigation, useSkipLink, semanticHelpers, focusManagement } from '../../utils/accessibility';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  description?: string;
}

interface AccessibleNavigationProps {
  navigationItems: NavItem[];
  currentPath: string;
  onNavigate?: (path: string) => void;
  brandName?: string;
  brandLogo?: string;
}

const AccessibleNavigation: React.FC<AccessibleNavigationProps> = ({
  navigationItems,
  currentPath,
  onNavigate,
  brandName = "BP Logistics Dashboard",
  brandLogo
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [announcementText, setAnnouncementText] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const skipLinkRef = useSkipLink();
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  
  const { currentIndex, setCurrentIndex, handleKeyDown, setItemRef } = useKeyboardNavigation(navigationItems.length);

  // Close menu on location change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key and focus trapping
  useEffect(() => {
    if (isMenuOpen && menuRef.current) {
      const cleanup = focusManagement.trapFocus(menuRef.current);
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      };

      document.addEventListener('keydown', handleEscape);
      
      return () => {
        cleanup();
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isMenuOpen]);

  const handleMenuToggle = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    setAnnouncementText(newState ? 'Navigation menu opened' : 'Navigation menu closed');
    
    if (newState) {
      // Focus first menu item when opening
      setTimeout(() => {
        const firstMenuItem = menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement;
        firstMenuItem?.focus();
      }, 100);
    }
  };

  const handleItemToggle = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
      setAnnouncementText(`${getItemById(itemId)?.label} submenu collapsed`);
    } else {
      newExpanded.add(itemId);
      setAnnouncementText(`${getItemById(itemId)?.label} submenu expanded`);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (path: string, label: string) => {
    navigate(path);
    onNavigate?.(path);
    setIsMenuOpen(false);
    setAnnouncementText(`Navigated to ${label}`);
    
    // Focus main content after navigation
    setTimeout(() => {
      mainContentRef.current?.focus();
    }, 100);
  };

  const getItemById = (id: string): NavItem | undefined => {
    const findItem = (items: NavItem[]): NavItem | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
    };
    return findItem(navigationItems);
  };

  const isCurrentPath = (path: string): boolean => {
    return currentPath === path || location.pathname === path;
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isCurrent = isCurrentPath(item.path);
    const itemId = semanticHelpers.generateId(`nav-item-${item.id}`);

    return (
      <li key={item.id} role="none">
        {hasChildren ? (
          // Expandable menu item
          <div>
            <button
              id={itemId}
              ref={setItemRef(currentIndex)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left text-gray-700 hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                level > 0 ? 'pl-8' : ''
              } ${isCurrent ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : ''}`}
              onClick={() => handleItemToggle(item.id)}
              onKeyDown={handleKeyDown}
              aria-expanded={isExpanded}
              aria-describedby={item.description ? `${itemId}-desc` : undefined}
              role="menuitem"
              tabIndex={-1}
            >
              <div className="flex items-center gap-3">
                {item.icon && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="font-medium">{item.label}</span>
                {isCurrent && <span className="sr-only">(current page)</span>}
              </div>
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            
            {item.description && (
              <div id={`${itemId}-desc`} className="sr-only">
                {item.description}
              </div>
            )}
            
            {isExpanded && (
              <ul 
                role="menu" 
                aria-labelledby={itemId}
                className="bg-gray-50 border-l-2 border-gray-200"
              >
                {item.children?.map(child => renderNavItem(child, level + 1))}
              </ul>
            )}
          </div>
        ) : (
          // Regular navigation link
          <button
            id={itemId}
            ref={setItemRef(currentIndex)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
              level > 0 ? 'pl-8' : ''
            } ${isCurrent ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : ''}`}
            onClick={() => handleNavigation(item.path, item.label)}
            onKeyDown={handleKeyDown}
            aria-current={isCurrent ? 'page' : undefined}
            aria-describedby={item.description ? `${itemId}-desc` : undefined}
            role="menuitem"
            tabIndex={-1}
          >
            {item.icon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="font-medium">{item.label}</span>
            {isCurrent && <span className="sr-only">(current page)</span>}
          </button>
        )}
        
        {item.description && !hasChildren && (
          <div id={`${itemId}-desc`} className="sr-only">
            {item.description}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Skip Links */}
      <a
        ref={skipLinkRef}
        href="#main-content"
        className="skip-link sr-only-focusable"
        onClick={(e) => {
          e.preventDefault();
          mainContentRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      
      <a
        href="#navigation"
        className="skip-link sr-only-focusable"
        onClick={(e) => {
          e.preventDefault();
          menuButtonRef.current?.focus();
        }}
      >
        Skip to navigation
      </a>

      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand/Logo */}
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation('/', 'Home')}
                className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg p-2"
                aria-label={`${brandName} - Go to homepage`}
              >
                {brandLogo ? (
                  <img 
                    src={brandLogo} 
                    alt="" 
                    className="h-8 w-auto"
                    aria-hidden="true"
                  />
                ) : (
                  <Home className="h-8 w-8 text-blue-600" aria-hidden="true" />
                )}
                <span className="text-xl font-bold text-gray-900">{brandName}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              ref={menuButtonRef}
              id="navigation"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              onClick={handleMenuToggle}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 bg-white shadow-lg"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <nav>
                <ul role="menubar" aria-label="Navigation menu">
                  {navigationItems.map(item => renderNavItem(item))}
                </ul>
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Navigation (if needed) */}
      <nav 
        className="hidden md:block bg-white shadow-sm border-b border-gray-200"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex space-x-8" role="menubar">
            {navigationItems.map(item => (
              <li key={item.id} role="none">
                <button
                  className={`inline-flex items-center gap-2 px-1 pt-1 pb-4 text-sm font-medium border-b-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    isCurrentPath(item.path)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleNavigation(item.path, item.label)}
                  aria-current={isCurrentPath(item.path) ? 'page' : undefined}
                  role="menuitem"
                >
                  {item.icon && <span aria-hidden="true">{item.icon}</span>}
                  {item.label}
                  {isCurrentPath(item.path) && <span className="sr-only">(current page)</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Anchor */}
      <main
        ref={mainContentRef}
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none"
        role="main"
        aria-label="Main content"
      >
        {/* Main content will be rendered here by parent component */}
      </main>

      {/* ARIA Live Region for Announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcementText}
      </div>
    </>
  );
};

export default AccessibleNavigation;