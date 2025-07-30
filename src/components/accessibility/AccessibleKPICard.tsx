/**
 * AccessibleKPICard - WCAG 2.1 AA Compliant KPI Card Component
 * Provides comprehensive accessibility features for dashboard KPIs
 */

import React, { useState, useRef, useEffect } from 'react';
import { Info, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { semanticHelpers, ariaBuilder, useAriaLiveRegion } from '../../utils/accessibility';

type KPIStatus = 'good' | 'warning' | 'critical' | 'neutral';
type KPIVariant = 'hero' | 'secondary' | 'compact';

interface AccessibleKPICardProps {
  title: string;
  value: string | number;
  trend?: number | null;
  isPositive?: boolean | null;
  unit?: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink' | 'yellow';
  tooltip?: string;
  status?: KPIStatus;
  variant?: KPIVariant;
  contextualHelp?: string;
  target?: number;
  showTrendIcon?: boolean;
  onInteraction?: (action: string) => void;
}

const AccessibleKPICard: React.FC<AccessibleKPICardProps> = ({ 
  title, 
  value, 
  trend, 
  isPositive, 
  unit = '', 
  subtitle, 
  color = 'blue', 
  tooltip, 
  status = 'neutral',
  variant = 'secondary',
  contextualHelp,
  target,
  showTrendIcon = true,
  onInteraction
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  
  const { announce } = useAriaLiveRegion();
  
  // Generate unique IDs for ARIA relationships
  const cardId = semanticHelpers.generateId('kpi-card');
  const titleId = semanticHelpers.generateId('kpi-title');
  const valueId = semanticHelpers.generateId('kpi-value');
  const tooltipId = semanticHelpers.generateId('kpi-tooltip');
  const trendId = semanticHelpers.generateId('kpi-trend');

  // Position tooltip dynamically
  useEffect(() => {
    if (showTooltip && infoButtonRef.current && tooltipRef.current) {
      const buttonRect = infoButtonRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;
      let top = buttonRect.top - tooltipRect.height - 8;

      // Adjust horizontal position if tooltip goes off screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }

      // Adjust vertical position if tooltip goes off screen
      if (top < 8) {
        top = buttonRect.bottom + 8;
      }

      setTooltipStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999
      });
    }
  }, [showTooltip]);

  // Status color mapping with high contrast support
  const getStatusStyles = () => {
    const baseStyles = "transition-all duration-200 border-2";
    
    switch (status) {
      case 'good':
        return `${baseStyles} border-green-200 bg-green-50 hover:bg-green-100`;
      case 'warning':
        return `${baseStyles} border-orange-200 bg-orange-50 hover:bg-orange-100`;
      case 'critical':
        return `${baseStyles} border-red-200 bg-red-50 hover:bg-red-100`;
      default:
        return `${baseStyles} border-gray-200 bg-white hover:bg-gray-50`;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" aria-hidden="true" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />;
      default:
        return null;
    }
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendDescription = (): string => {
    if (trend === null || trend === undefined) return '';
    
    const direction = isPositive ? 'increased' : 'decreased';
    const magnitude = Math.abs(trend);
    return `${title} has ${direction} by ${magnitude}% ${isPositive ? '(positive trend)' : '(negative trend)'}`;
  };

  const getValueDescription = (): string => {
    let description = `${title}: ${formatValue(value)}${unit}`;
    
    if (subtitle) {
      description += `, ${subtitle}`;
    }
    
    if (target) {
      const percentage = ((Number(value) / target) * 100).toFixed(1);
      description += `, ${percentage}% of target ${target}${unit}`;
    }
    
    return description;
  };

  const handleInfoClick = () => {
    setShowTooltip(!showTooltip);
    onInteraction?.('info-toggle');
    
    if (!showTooltip && (tooltip || contextualHelp)) {
      announce(`Additional information: ${contextualHelp || tooltip}`, 'polite');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && showTooltip) {
      setShowTooltip(false);
      infoButtonRef.current?.focus();
    }
  };

  // Build ARIA attributes
  const cardAriaProps = {
    'aria-labelledby': titleId,
    'aria-describedby': `${valueId} ${trendId}`.trim(),
    role: 'region',
    tabIndex: 0
  };

  const infoButtonAriaProps = ariaBuilder.button({
    label: `Additional information about ${title}`,
    description: tooltip || contextualHelp,
    expanded: showTooltip,
    disabled: !tooltip && !contextualHelp
  });

  return (
    <div
      ref={cardRef}
      id={cardId}
      className={`${getStatusStyles()} rounded-lg p-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${variant === 'compact' ? 'p-4' : variant === 'hero' ? 'p-8' : 'p-6'}`}
      onKeyDown={handleKeyDown}
      {...cardAriaProps}
    >
      {/* Status Indicator */}
      {status !== 'neutral' && (
        <div className="flex items-center gap-2 mb-2">
          {getStatusIcon()}
          <span className="sr-only">Status: {status}</span>
        </div>
      )}

      {/* Header with Title and Info Button */}
      <div className="flex items-start justify-between mb-2">
        <h3 
          id={titleId}
          className={`font-semibold text-gray-900 ${variant === 'hero' ? 'text-lg' : 'text-base'}`}
        >
          {title}
        </h3>
        
        {(tooltip || contextualHelp) && (
          <button
            ref={infoButtonRef}
            onClick={handleInfoClick}
            className="ml-2 p-1 rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            {...infoButtonAriaProps}
          >
            <Info className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Value Display */}
      <div className="mb-2">
        <div 
          id={valueId}
          className={`font-bold text-gray-900 ${variant === 'hero' ? 'text-3xl' : variant === 'compact' ? 'text-xl' : 'text-2xl'}`}
        >
          {formatValue(value)}
          {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </div>
        
        {/* Screen reader description */}
        <div className="sr-only" aria-live="polite">
          {getValueDescription()}
        </div>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-3">
          {subtitle}
        </p>
      )}

      {/* Trend Indicator */}
      {trend !== null && trend !== undefined && showTrendIcon && (
        <div 
          id={trendId}
          className="flex items-center gap-2"
          role="img"
          aria-label={getTrendDescription()}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600" aria-hidden="true" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600" aria-hidden="true" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend)}%
            <span className="sr-only"> {isPositive ? 'increase' : 'decrease'}</span>
          </span>
        </div>
      )}

      {/* Target Progress */}
      {target && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress to Target</span>
            <span>{((Number(value) / target) * 100).toFixed(1)}%</span>
          </div>
          <div 
            className="w-full bg-gray-200 rounded-full h-2"
            role="progressbar"
            aria-valuenow={Number(value)}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label={`Progress towards target of ${target}${unit}`}
          >
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((Number(value) / target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (tooltip || contextualHelp) && (
        <>
          {/* Overlay for click-away */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowTooltip(false)}
            aria-hidden="true"
          />
          
          <div 
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className="bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl border border-gray-700 max-w-xs z-[9999]"
            style={tooltipStyle}
          >
            <div className="font-medium mb-2">{title}</div>
            <div className="text-gray-200">
              {contextualHelp || tooltip}
            </div>
            {target && (
              <div className="mt-2 text-xs text-gray-300">
                Target: {target}{unit}
              </div>
            )}
            
            {/* Close button for keyboard users */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 rounded"
              onClick={() => setShowTooltip(false)}
              aria-label="Close additional information"
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AccessibleKPICard;