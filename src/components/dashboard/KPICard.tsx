import React, { useState, useRef, useEffect } from 'react';
import { Info, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

type KPIStatus = 'good' | 'warning' | 'critical' | 'neutral';
type KPIVariant = 'hero' | 'secondary' | 'compact';

interface KPICardProps {
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
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  trend, 
  isPositive, 
  unit, 
  subtitle, 
  color = 'blue', 
  tooltip, 
  status = 'neutral',
  variant = 'secondary',
  contextualHelp,
  target,
  showTrendIcon = true
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Enhanced color system with status support
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    yellow: 'bg-yellow-500'
  };

  // Status-based colors that override explicit colors when target is present
  const statusBarColors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500', 
    critical: 'bg-red-500',
    neutral: colorClasses[color] || 'bg-gray-400'
  };

  const statusClasses = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
    neutral: 'border-gray-100 bg-white'
  };

  const statusIcons = {
    good: <CheckCircle className="w-4 h-4 text-green-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
    neutral: null
  };

  // Determine if value meets target (for status calculation)
  const getAutoStatus = (): KPIStatus => {
    if (!target) return 'neutral';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(numValue)) return 'neutral';
    
    // For metrics where higher is better (isPositive = true or null/undefined)
    if (isPositive !== false) {
      return numValue >= target ? 'good' : numValue >= target * 0.8 ? 'warning' : 'critical';
    } else {
      // For metrics where lower is better (isPositive = false)
      return numValue <= target ? 'good' : numValue <= target * 1.2 ? 'warning' : 'critical';
    }
  };

  const finalStatus = status === 'neutral' && target ? getAutoStatus() : status;

  // DEBUG: Log status calculation for Operational Efficiency
  if (title === "Operational Efficiency" || title === "Efficiency") {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    console.log(`🎯 KPI Status Debug for ${title}:`, {
      value: numValue,
      target,
      isPositive,
      calculatedStatus: target ? getAutoStatus() : 'no target',
      finalStatus,
      comparison: target ? `${numValue} ${isPositive !== false ? '>=' : '<='} ${target}` : 'no comparison'
    });
  }

  useEffect(() => {
    if (showTooltip && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // More sophisticated positioning logic
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      
      // Determine tooltip position
      const position = spaceAbove >= 120 && spaceAbove > spaceBelow ? 'top' : 'bottom';
      
      // Calculate tooltip style
      const tooltipWidth = variant === 'hero' ? 350 : 300;
      const style: React.CSSProperties = {
        minWidth: variant === 'hero' ? '250px' : '200px',
        maxWidth: `${tooltipWidth}px`,
        top: position === 'top' 
          ? `${triggerRect.top - 8}px`
          : `${triggerRect.bottom + 8}px`,
        left: `${Math.max(8, Math.min(
          viewportWidth - tooltipWidth - 8,
          triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2
        ))}px`,
        transform: position === 'top' ? 'translateY(-100%)' : 'translateY(0)'
      };
      
      setTooltipStyle(style);
    }
  }, [showTooltip, variant]);

  // Hero variant - large, prominent display
  if (variant === 'hero') {
    return (
      <div className={`relative rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${statusClasses[finalStatus]} overflow-hidden`}>
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {statusIcons[finalStatus]}
              {(tooltip || contextualHelp) && (
                <div className="relative z-auto" ref={triggerRef}>
                  <Info 
                    className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors" 
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  />
                  {showTooltip && (
                    <div 
                      ref={tooltipRef}
                      className="fixed z-[9999] px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none shadow-xl border border-gray-700"
                      style={tooltipStyle}
                    >
                      <div className="whitespace-normal">
                        <div className="font-medium mb-1">{title}</div>
                        {contextualHelp || tooltip}
                        {target && (
                          <div className="mt-2 text-xs text-gray-300">
                            Target: {target}{unit}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {trend !== null && trend !== undefined && showTrendIcon && (
              <div className="flex items-center gap-3">
                {/* Small trend line */}
                <div className="flex items-center">
                  <svg width="40" height="20" className="mr-2">
                    <defs>
                      <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{stopColor: isPositive ? '#10b981' : '#ef4444', stopOpacity: 0.2}} />
                        <stop offset="100%" style={{stopColor: isPositive ? '#10b981' : '#ef4444', stopOpacity: 0.8}} />
                      </linearGradient>
                    </defs>
                    <path
                      d={isPositive ? "M2,18 Q10,12 20,8 T38,2" : "M2,2 Q10,8 20,12 T38,18"}
                      stroke={isPositive ? '#10b981' : '#ef4444'}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle 
                      cx="38" 
                      cy={isPositive ? "2" : "18"} 
                      r="2" 
                      fill={isPositive ? '#10b981' : '#ef4444'}
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{trend.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {value}
              {unit && <span className="text-2xl font-normal text-gray-500 ml-2">{unit}</span>}
            </div>
            {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
            {target && (
              <div className="mt-4 text-sm text-gray-500">
                Target: {target}{unit} • Status: <span className={`font-medium ${
                  finalStatus === 'good' ? 'text-green-600' : 
                  finalStatus === 'warning' ? 'text-yellow-600' : 
                  finalStatus === 'critical' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {finalStatus.charAt(0).toUpperCase() + finalStatus.slice(1)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${target ? statusBarColors[finalStatus] : colorClasses[color]}`} />
      </div>
    );
  }

  // Compact variant - minimal display
  if (variant === 'compact') {
    return (
      <div className={`relative rounded-lg border ${statusClasses[finalStatus]} p-4 hover:shadow-sm transition-all duration-200`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {statusIcons[finalStatus]}
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          {trend !== null && trend !== undefined && showTrendIcon && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </span>
          {trend !== null && trend !== undefined && showTrendIcon && (
            <svg width="24" height="12" className="ml-2">
              <path
                d={isPositive ? "M2,10 Q6,6 12,4 T22,2" : "M2,2 Q6,6 12,8 T22,10"}
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle 
                cx="22" 
                cy={isPositive ? "2" : "10"} 
                r="1.5" 
                fill={isPositive ? '#10b981' : '#ef4444'}
              />
            </svg>
          )}
        </div>
      </div>
    );
  }

  // Secondary variant - default improved design
  return (
    <div className={`relative rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border ${statusClasses[finalStatus]} overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {statusIcons[finalStatus]}
              <p className="text-sm font-medium text-gray-700">{title}</p>
              {(tooltip || contextualHelp) && (
                <div className="relative z-auto" ref={triggerRef}>
                  <Info 
                    className="w-3 h-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" 
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  />
                  {showTooltip && (
                    <div 
                      ref={tooltipRef}
                      className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 pointer-events-none shadow-xl border border-gray-700"
                      style={tooltipStyle}
                    >
                      <div className="whitespace-normal">
                        {contextualHelp || tooltip}
                        {target && (
                          <div className="mt-1 text-xs text-gray-300">
                            Target: {target}{unit}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
            
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">
                {value}{unit && <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>}
              </p>
              
              {trend !== null && trend !== undefined && showTrendIcon && (
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            
            {target && (
              <div className="mt-2 text-xs text-gray-500">
                Target: {target}{unit}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${target ? statusBarColors[finalStatus] : colorClasses[color]}`} />
    </div>
  );
};

export default KPICard;