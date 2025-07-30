/**
 * Accessibility Utilities for BP Logistics Dashboard
 * Provides WCAG 2.1 AA compliant accessibility features
 */

import { useEffect, useRef, useState } from 'react';

// ARIA Live Region Types
export type LiveRegionType = 'polite' | 'assertive' | 'off';

// Focus Management
export const focusManagement = {
  /**
   * Trap focus within a container element
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  /**
   * Move focus to next/previous focusable element
   */
  moveFocusToNext: () => {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  },

  moveFocusToPrevious: () => {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }
};

// Screen Reader Utilities
export const screenReader = {
  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority: LiveRegionType = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  /**
   * Create screen reader only text
   */
  createSROnlyText: (text: string) => {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  }
};

// Color and Contrast Utilities
export const colorContrast = {
  /**
   * Check if color combination meets WCAG AA contrast ratio (4.5:1)
   */
  meetsAAContrast: (foreground: string, background: string): boolean => {
    const ratio = getContrastRatio(foreground, background);
    return ratio >= 4.5;
  },

  /**
   * Check if color combination meets WCAG AAA contrast ratio (7:1)
   */
  meetsAAAContrast: (foreground: string, background: string): boolean => {
    const ratio = getContrastRatio(foreground, background);
    return ratio >= 7;
  },

  /**
   * Get high contrast color for text based on background
   */
  getHighContrastText: (backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
};

// Helper functions for color calculations
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Keyboard Navigation Utilities
export const keyboardNavigation = {
  /**
   * Handle arrow key navigation in grids/lists
   */
  handleArrowNavigation: (
    event: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    columns?: number
  ) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        if (columns) {
          newIndex = Math.min(currentIndex + columns, items.length - 1);
        } else {
          newIndex = Math.min(currentIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowUp':
        if (columns) {
          newIndex = Math.max(currentIndex - columns, 0);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      default:
        return currentIndex;
    }

    event.preventDefault();
    items[newIndex]?.focus();
    return newIndex;
  }
};

// Custom Hooks for Accessibility
export const useAriaLiveRegion = () => {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<LiveRegionType>('polite');

  const announce = (text: string, livePriority: LiveRegionType = 'polite') => {
    setMessage(''); // Clear first to ensure announcement
    setTimeout(() => {
      setMessage(text);
      setPriority(livePriority);
    }, 100);
  };

  return { message, priority, announce };
};

export const useKeyboardNavigation = (itemCount: number, columns?: number) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const newIndex = keyboardNavigation.handleArrowNavigation(
      event,
      itemRefs.current.filter(Boolean) as HTMLElement[],
      currentIndex,
      columns
    );
    setCurrentIndex(newIndex);
  };

  const setItemRef = (index: number) => (ref: HTMLElement | null) => {
    itemRefs.current[index] = ref;
  };

  return { currentIndex, setCurrentIndex, handleKeyDown, setItemRef };
};

export const useSkipLink = () => {
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && !event.shiftKey && document.activeElement === document.body) {
        skipLinkRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return skipLinkRef;
};

// Semantic HTML Helpers
export const semanticHelpers = {
  /**
   * Generate unique IDs for ARIA relationships
   */
  generateId: (prefix: string = 'bp-element'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create proper heading hierarchy
   */
  getHeadingLevel: (context: 'page' | 'section' | 'subsection' | 'detail'): 'h1' | 'h2' | 'h3' | 'h4' => {
    switch (context) {
      case 'page': return 'h1';
      case 'section': return 'h2';
      case 'subsection': return 'h3';
      case 'detail': return 'h4';
    }
  }
};

// ARIA Attributes Builder
export const ariaBuilder = {
  /**
   * Build button ARIA attributes
   */
  button: (props: {
    label?: string;
    description?: string;
    expanded?: boolean;
    pressed?: boolean;
    disabled?: boolean;
  }) => ({
    'aria-label': props.label,
    'aria-describedby': props.description ? semanticHelpers.generateId('desc') : undefined,
    'aria-expanded': props.expanded,
    'aria-pressed': props.pressed,
    'aria-disabled': props.disabled,
    role: 'button',
    tabIndex: props.disabled ? -1 : 0
  }),

  /**
   * Build form input ARIA attributes
   */
  input: (props: {
    label: string;
    description?: string;
    required?: boolean;
    invalid?: boolean;
    errorMessage?: string;
  }) => ({
    'aria-label': props.label,
    'aria-describedby': props.description ? semanticHelpers.generateId('desc') : undefined,
    'aria-required': props.required,
    'aria-invalid': props.invalid,
    'aria-errormessage': props.invalid && props.errorMessage ? semanticHelpers.generateId('error') : undefined
  }),

  /**
   * Build table ARIA attributes
   */
  table: (props: {
    caption?: string;
    sortable?: boolean;
    rowCount?: number;
    colCount?: number;
  }) => ({
    role: 'table',
    'aria-label': props.caption,
    'aria-rowcount': props.rowCount,
    'aria-colcount': props.colCount,
    'aria-sort': props.sortable ? 'none' : undefined
  })
};

export default {
  focusManagement,
  screenReader,
  colorContrast,
  keyboardNavigation,
  useAriaLiveRegion,
  useKeyboardNavigation,
  useSkipLink,
  semanticHelpers,
  ariaBuilder
};