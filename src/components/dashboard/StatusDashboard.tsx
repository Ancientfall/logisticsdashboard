import React from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {heroMetrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                {metric.status && (
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === 'good' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                )}
              </div>
              
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {metric.value}
                {metric.unit && <span className="text-lg font-normal text-gray-500 ml-1">{metric.unit}</span>}
              </div>
              
              {metric.trend !== undefined && metric.trend !== null && (
                <div className="flex items-center justify-center gap-1">
                  {metric.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metric.trend).toFixed(1)}%
                  </span>
                </div>
              )}
              
              {metric.target && (
                <div className="text-xs text-gray-500 mt-2">
                  Target: {metric.target}{metric.unit}
                </div>
              )}
              
              {metric.contextualHelp && (
                <div className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {metric.contextualHelp}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusDashboard;