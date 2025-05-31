import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number | null;
  isPositive?: boolean | null;
  unit?: string;
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, isPositive, unit, subtitle }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
        <div className="flex items-baseline gap-1">
          {trend !== null && trend !== undefined && (
            <div className="flex items-center gap-1 mr-2">
              {isPositive ? (
                <svg className="w-3 h-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <p className="text-lg font-bold text-gray-900">
          {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  </div>
);

export default KPICard; 