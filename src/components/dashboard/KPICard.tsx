import React from 'react';
import { Info } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number | null;
  isPositive?: boolean | null;
  unit?: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'pink' | 'yellow';
  tooltip?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, isPositive, unit, subtitle, color = 'blue', tooltip }) => {
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

  return (
    <div className="relative overflow-hidden bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1 group">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
              {tooltip && (
                <>
                  <Info className="w-3 h-3 text-gray-400" />
                  <div className="absolute z-10 bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="max-w-xs whitespace-normal">
                      {tooltip}
                    </div>
                    <div className="absolute top-full left-4 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </>
              )}
            </div>
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
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClasses[color]}`} />
    </div>
  );
};

export default KPICard; 