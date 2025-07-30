/**
 * AccessibilityProvider - Comprehensive accessibility wrapper for BP Logistics Dashboard
 * Provides WCAG 2.1 AA compliance features throughout the application
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAriaLiveRegion, screenReader } from '../../utils/accessibility';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  focusManagement: {
    setFocusToMain: () => void;
    setFocusToNavigation: () => void;
    restoreFocus: () => void;
  };
  preferences: {
    respectSystemPreferences: boolean;
    setRespectSystemPreferences: (value: boolean) => void;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusIndicators: true,
    screenReaderOptimized: false,
    keyboardNavigation: true,
  });

  const [respectSystemPreferences, setRespectSystemPreferences] = useState(true);
  const { announce } = useAriaLiveRegion();
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Detect system preferences
  useEffect(() => {
    if (!respectSystemPreferences) return;

    const checkSystemPreferences = () => {
      const mediaQueries = {
        highContrast: window.matchMedia('(prefers-contrast: high)'),
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      };

      setSettings(prev => ({
        ...prev,
        highContrast: mediaQueries.highContrast.matches,
        reducedMotion: mediaQueries.reducedMotion.matches,
      }));

      // Listen for changes
      Object.entries(mediaQueries).forEach(([key, mq]) => {
        const handler = () => {
          setSettings(prev => ({
            ...prev,
            [key]: mq.matches,
          }));
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      });
    };

    checkSystemPreferences();
  }, [respectSystemPreferences]);

  // Apply accessibility styles to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Enhanced focus indicators
    if (settings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Screen reader optimizations
    if (settings.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }, [settings]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if not using keyboard navigation
      if (!settings.keyboardNavigation) return;

      // Handle global keyboard shortcuts
      switch (event.key) {
        case 'F6':
          // Cycle through main sections
          event.preventDefault();
          cycleThroughSections();
          break;
        
        case 'Escape':
          // Close modals, dropdowns, etc.
          const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
          if (activeModal) {
            const closeButton = activeModal.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement;
            closeButton?.click();
          }
          break;

        case '/':
          // Focus search when available
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]') as HTMLInputElement;
            searchInput?.focus();
          }
          break;
      }

      // Alt + number keys for quick navigation
      if (event.altKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const landmarkIndex = parseInt(event.key) - 1;
        const landmarks = document.querySelectorAll('[role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
        const landmark = landmarks[landmarkIndex] as HTMLElement;
        landmark?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);

  // Detect if user is using keyboard navigation
  useEffect(() => {
    let isUsingKeyboard = false;

    const handleKeyDown = () => {
      isUsingKeyboard = true;
      document.body.classList.add('user-is-tabbing');
    };

    const handleMouseDown = () => {
      isUsingKeyboard = false;
      document.body.classList.remove('user-is-tabbing');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));

    // Announce the change
    const settingLabels = {
      highContrast: 'High contrast mode',
      reducedMotion: 'Reduced motion',
      largeText: 'Large text',
      focusIndicators: 'Enhanced focus indicators',
      screenReaderOptimized: 'Screen reader optimizations',
      keyboardNavigation: 'Keyboard navigation',
    };

    announce(`${settingLabels[key]} ${value ? 'enabled' : 'disabled'}`);

    // Save to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify({
      ...settings,
      [key]: value,
    }));
  };

  const cycleThroughSections = () => {
    const sections = [
      document.querySelector('[role="navigation"]'),
      document.querySelector('[role="main"]'),
      document.querySelector('[role="complementary"]'),
      document.querySelector('[role="contentinfo"]'),
    ].filter(Boolean) as HTMLElement[];

    const currentFocus = document.activeElement;
    let nextIndex = 0;

    sections.forEach((section, index) => {
      if (section.contains(currentFocus)) {
        nextIndex = (index + 1) % sections.length;
      }
    });

    const nextSection = sections[nextIndex];
    if (nextSection) {
      nextSection.focus();
      announce(`Focused ${nextSection.getAttribute('aria-label') || nextSection.tagName.toLowerCase()}`);
    }
  };

  const focusManagement = {
    setFocusToMain: () => {
      const main = document.querySelector('[role="main"], main') as HTMLElement;
      if (main) {
        main.focus();
        announce('Focused main content');
      }
    },

    setFocusToNavigation: () => {
      const nav = document.querySelector('[role="navigation"], nav') as HTMLElement;
      if (nav) {
        nav.focus();
        announce('Focused navigation');
      }
    },

    restoreFocus: () => {
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    },
  };

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error);
      }
    }

    const savedPreferences = localStorage.getItem('respect-system-preferences');
    if (savedPreferences) {
      setRespectSystemPreferences(savedPreferences === 'true');
    }
  }, []);

  // Save system preferences setting
  const handleSetRespectSystemPreferences = (value: boolean) => {
    setRespectSystemPreferences(value);
    localStorage.setItem('respect-system-preferences', value.toString());
    announce(`System preference detection ${value ? 'enabled' : 'disabled'}`);
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    announce,
    focusManagement,
    preferences: {
      respectSystemPreferences,
      setRespectSystemPreferences: handleSetRespectSystemPreferences,
    },
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Global accessibility styles and behaviors */}
      <div className="accessibility-provider">
        {children}
        
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="skip-link sr-only-focusable"
          onClick={(e) => {
            e.preventDefault();
            focusManagement.setFocusToMain();
          }}
        >
          Skip to main content
        </a>

        {/* Global ARIA live region */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="global-announcements"
        />

        {/* Emergency/Alert announcements */}
        <div
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
          id="emergency-announcements"
        />
      </div>
    </AccessibilityContext.Provider>
  );
};

// Accessibility settings panel component
export const AccessibilityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { settings, updateSetting, preferences } = useAccessibility();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="accessibility-title" className="text-lg font-semibold">
            Accessibility Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close accessibility settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* System preferences */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.respectSystemPreferences}
                onChange={(e) => preferences.setRespectSystemPreferences(e.target.checked)}
                className="mr-3"
              />
              Respect system accessibility preferences
            </label>
          </div>

          <hr />

          {/* Individual settings */}
          {Object.entries(settings).map(([key, value]) => (
            <div key={key}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateSetting(key as keyof AccessibilitySettings, e.target.checked)}
                  className="mr-3"
                  disabled={preferences.respectSystemPreferences && (key === 'highContrast' || key === 'reducedMotion')}
                />
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};