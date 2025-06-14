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
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
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
    
    if (isPositive) {
      return numValue >= target ? 'good' : numValue >= target * 0.8 ? 'warning' : 'critical';
    } else {
      return numValue <= target ? 'good' : numValue <= target * 1.2 ? 'warning' : 'critical';
    }
  };

  const finalStatus = status === 'neutral' && target ? getAutoStatus() : status;

  useEffect(() => {
    if (showTooltip && tooltipRef.current && triggerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      
      // Check if tooltip would go above viewport
      if (triggerRect.top - tooltipRect.height - 8 < 0) {
        setTooltipPosition('bottom');
      } else {
        setTooltipPosition('top');
      }
    }
  }, [showTooltip]);

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
                <div className="relative" ref={triggerRef}>
                  <Info 
                    className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors" 
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  />
                  {showTooltip && (
                    <div 
                      ref={tooltipRef}
                      className={`absolute z-50 ${tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 transform -translate-x-1/2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity duration-200 pointer-events-none shadow-xl`}
                      style={{ minWidth: '250px', maxWidth: '350px' }}
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
                      <div className={`absolute ${tooltipPosition === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'} left-1/2 transform -translate-x-1/2`}>
                        <div className={`border-4 border-transparent ${tooltipPosition === 'top' ? 'border-t-gray-900' : 'border-b-gray-900'}`}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {trend !== null && trend !== undefined && showTrendIcon && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
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
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClasses[color]}`} />
      </div>
    );
  }

  // Compact variant - minimal display
  if (variant === 'compact') {
    return (
      <div className={`relative rounded-lg border ${statusClasses[finalStatus]} p-4 hover:shadow-sm transition-all duration-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusIcons[finalStatus]}
            <span className="text-sm font-medium text-gray-700">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
            </span>
            {trend !== null && trend !== undefined && showTrendIcon && (
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{trend.toFixed(1)}%
              </span>
            )}
          </div>
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
                <div className="relative" ref={triggerRef}>
                  <Info 
                    className="w-3 h-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" 
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  />
                  {showTooltip && (
                    <div 
                      ref={tooltipRef}
                      className={`absolute z-50 ${tooltipPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 pointer-events-none`}
                      style={{ minWidth: '200px', maxWidth: '300px' }}
                    >
                      <div className="whitespace-normal">
                        {contextualHelp || tooltip}
                        {target && (
                          <div className="mt-1 text-xs text-gray-300">
                            Target: {target}{unit}
                          </div>
                        )}
                      </div>
                      <div className={`absolute ${tooltipPosition === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'} left-1/2 transform -translate-x-1/2`}>
                        <div className={`border-4 border-transparent ${tooltipPosition === 'top' ? 'border-t-gray-900' : 'border-b-gray-900'}`}></div>
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
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClasses[color]}`} />
    </div>
  );
};

export default KPICard;