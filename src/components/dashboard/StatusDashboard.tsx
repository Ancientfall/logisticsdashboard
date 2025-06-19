import React, { useState, useRef, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface StatusDashboardProps {
  title: string;
  subtitle: string;
  overallStatus: 'excellent' | 'good' | 'fair' | 'poor';
  heroMetrics: Array<{
    title: string;
    value: string | number;
    unit?: string;
    trend?: number;
    isPositive?: boolean;
    status?: 'good' | 'warning' | 'critical';
    target?: number;
    contextualHelp?: string;
  }>;
  onViewDetails?: () => void;
  onExportData?: () => void;
  lastUpdated?: Date;
}

const StatusDashboard: React.FC<StatusDashboardProps> = ({
  title,
  subtitle,
  overallStatus,
  heroMetrics,
  onViewDetails,
  onExportData,
  lastUpdated
}) => {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (activeTooltip !== null && triggerRefs.current[activeTooltip]) {
      const triggerRect = triggerRefs.current[activeTooltip]!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      
      const position = spaceAbove >= 120 && spaceAbove > spaceBelow ? 'top' : 'bottom';
      
      const tooltipWidth = 300;
      const style: React.CSSProperties = {
        minWidth: '250px',
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
  }, [activeTooltip]);
  const statusConfig = {
    excellent: {
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      text: 'EXCELLENT',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    },
    good: {
      icon: <CheckCircle className="w-6 h-6 text-blue-500" />,
      text: 'GOOD',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    },
    fair: {
      icon: <AlertCircle className="w-6 h-6 text-yellow-500" />,
      text: 'FAIR',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800'
    },
    poor: {
      icon: <AlertCircle className="w-6 h-6 text-red-500" />,
      text: 'POOR',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800'
    }
  };

  const status = statusConfig[overallStatus];

  return (
    <div className={`rounded-2xl shadow-lg border-2 ${status.borderColor} ${status.bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${status.bgColor} ${status.borderColor} border`}>
              {status.icon}
              <span className={`text-sm font-semibold ${status.textColor}`}>
                {status.text}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  View Details
                </button>
              )}
              {onExportData && (
                <button
                  onClick={onExportData}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Export Data
                </button>
              )}
            </div>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastUpdated.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Hero Metrics */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {heroMetrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                {metric.status && (
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === 'good' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                )}
                {metric.contextualHelp && (
                  <div 
                    ref={el => { triggerRefs.current[index] = el; }}
                    className="relative"
                  >
                    <Info 
                      className="w-3 h-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" 
                      onMouseEnter={() => setActiveTooltip(index)}
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  {metric.unit && <span className="text-lg font-normal text-gray-500 ml-1">{metric.unit}</span>}
                </div>
                
                {/* Trend Line SVG */}
                {metric.trend !== undefined && metric.trend !== null && (
                  <div className="flex items-center">
                    <svg width="24" height="12" className="ml-2">
                      <path
                        d={metric.isPositive ? "M2,10 Q6,6 12,4 T22,2" : "M2,2 Q6,6 12,8 T22,10"}
                        stroke={metric.isPositive ? '#10b981' : '#ef4444'}
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                      <circle 
                        cx="22" 
                        cy={metric.isPositive ? "2" : "10"} 
                        r="1.5" 
                        fill={metric.isPositive ? '#10b981' : '#ef4444'}
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              {metric.trend !== undefined && metric.trend !== null && (
                <div className="flex items-center justify-center gap-1 mb-2">
                  {metric.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.isPositive ? '+' : ''}{metric.trend.toFixed(1)}%
                  </span>
                </div>
              )}
              
              {metric.target && (
                <div className="text-xs text-gray-500">
                  Target: {metric.target}{metric.unit}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Tooltip */}
        {activeTooltip !== null && heroMetrics[activeTooltip]?.contextualHelp && (
          <div 
            ref={tooltipRef}
            className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 pointer-events-none shadow-xl border border-gray-700"
            style={tooltipStyle}
          >
            <div className="whitespace-normal">
              <div className="font-medium mb-1">{heroMetrics[activeTooltip].title}</div>
              {heroMetrics[activeTooltip].contextualHelp}
              {heroMetrics[activeTooltip].target && (
                <div className="mt-1 text-xs text-gray-300">
                  Target: {heroMetrics[activeTooltip].target}{heroMetrics[activeTooltip].unit}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusDashboard;