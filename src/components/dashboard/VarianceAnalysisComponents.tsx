import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Target, Ship, Info, HelpCircle, DollarSign, Calendar } from 'lucide-react';
import { VarianceAnalysis } from '../../utils/statisticalVariance';

// Currency formatting helper function
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  } else {
    return '$' + value.toFixed(0);
  }
};

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Reusable Tooltip Component
 */
const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
            {content}
          </div>
          <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

interface BoxPlotProps {
  data: VarianceAnalysis;
  title: string;
  unit: string;
  color?: string;
}

interface ControlChartProps {
  data: Array<{
    vesselName: string;
    value: number;
    date?: Date;
  }>;
  title: string;
  unit: string;
  mean: number;
  upperControlLimit: number;
  lowerControlLimit: number;
  color?: string;
}

interface VarianceStatsCardProps {
  title: string;
  variance: VarianceAnalysis;
  unit: string;
  icon: React.ElementType;
  color?: string;
  tooltipContent?: string;
}

/**
 * Box Plot Component for Statistical Distribution
 */
export const BoxPlot: React.FC<BoxPlotProps> = ({ 
  data, 
  title, 
  unit, 
  color = 'bg-bp-green' 
}) => {
  const { min, max, quartile1, median, quartile3, outliers } = data;
  const [hoveredOutlier, setHoveredOutlier] = useState<number | null>(null);
  
  // Validate data to prevent NaN errors
  if (!data || data.count === 0 || !isFinite(min) || !isFinite(max) || min === max || !isFinite(quartile1) || !isFinite(quartile3) || !isFinite(median)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <Tooltip content="Box plot shows data distribution with median (center line), quartiles (box edges), range (whiskers), and outliers (red/orange dots). Lower box = more consistent performance.">
            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex items-center justify-center h-20 text-gray-500 text-sm">
          No data available for analysis
        </div>
      </div>
    );
  }
  
  // Calculate plot dimensions
  const plotWidth = 300;
  const plotHeight = 80;
  const range = max - min;
  const scale = range > 0 ? plotWidth / range : 1;
  
  const getPosition = (value: number) => ((value - min) * scale);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Tooltip content="Box plot shows data distribution with median (center line), quartiles (box edges), range (whiskers), and outliers (red/orange dots). Lower box = more consistent performance.">
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
        </Tooltip>
      </div>
      
      <div className="relative">
        {/* Box plot visualization */}
        <div className="relative h-20 mb-4">
          <svg width={plotWidth} height={plotHeight} className="border border-gray-300 rounded">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Box plot elements */}
            {/* Whiskers */}
            <line 
              x1={getPosition(min)} 
              y1={40} 
              x2={getPosition(quartile1)} 
              y2={40}
              stroke="#666" 
              strokeWidth="2"
            />
            <line 
              x1={getPosition(quartile3)} 
              y1={40} 
              x2={getPosition(max)} 
              y2={40}
              stroke="#666" 
              strokeWidth="2"
            />
            
            {/* Box */}
            <rect
              x={getPosition(quartile1)}
              y={25}
              width={getPosition(quartile3) - getPosition(quartile1)}
              height={30}
              fill="#00754F"
              fillOpacity={0.3}
              stroke="#00754F"
              strokeWidth="2"
            />
            
            {/* Median line */}
            <line
              x1={getPosition(median)}
              y1={25}
              x2={getPosition(median)}
              y2={55}
              stroke="#00754F"
              strokeWidth="3"
            />
            
            {/* Min/Max markers */}
            <line x1={getPosition(min)} y1={35} x2={getPosition(min)} y2={45} stroke="#666" strokeWidth="2"/>
            <line x1={getPosition(max)} y1={35} x2={getPosition(max)} y2={45} stroke="#666" strokeWidth="2"/>
            
            {/* Outliers */}
            {outliers.map((outlier, index) => {
              const isHovered = hoveredOutlier === index;
              return (
                <g key={index}>
                  <circle
                    cx={getPosition(outlier.value)}
                    cy={40}
                    r={isHovered ? "5" : "3"}
                    fill={outlier.isUpperOutlier ? "#ef4444" : "#f59e0b"}
                    stroke="#fff"
                    strokeWidth="1"
                    style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                    onMouseEnter={() => setHoveredOutlier(index)}
                    onMouseLeave={() => setHoveredOutlier(null)}
                  />
                  {isHovered && outlier.vesselName && (
                    <g>
                      {(() => {
                        // Smart tooltip positioning for box plot outliers  
                        const minTopSpace = 10;
                        
                        // If there's not enough space above, show below the outlier
                        const showBelow = 15 < minTopSpace;
                        const tooltipY = showBelow ? 50 : 15;
                        const textY1 = showBelow ? 58 : 23;
                        const textY2 = showBelow ? 66 : 31;
                        
                        return (
                          <>
                            {/* Tooltip background */}
                            <rect
                              x={getPosition(outlier.value) - 35}
                              y={tooltipY}
                              width="70"
                              height="20"
                              fill="rgba(0, 0, 0, 0.8)"
                              rx="3"
                              ry="3"
                            />
                            {/* Tooltip text */}
                            <text
                              x={getPosition(outlier.value)}
                              y={textY1}
                              fill="white"
                              fontSize="8"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {outlier.vesselName}
                            </text>
                            <text
                              x={getPosition(outlier.value)}
                              y={textY2}
                              fill="white"
                              fontSize="7"
                              textAnchor="middle"
                            >
                              {unit === '$' ? formatCurrency(outlier.value) : outlier.value.toFixed(1)}{unit}
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Value labels */}
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>Min: {unit === '$' ? formatCurrency(min) : min.toFixed(1)}{unit}</span>
          <span>Q1: {unit === '$' ? formatCurrency(quartile1) : quartile1.toFixed(1)}{unit}</span>
          <span>Median: {unit === '$' ? formatCurrency(median) : median.toFixed(1)}{unit}</span>
          <span>Q3: {unit === '$' ? formatCurrency(quartile3) : quartile3.toFixed(1)}{unit}</span>
          <span>Max: {unit === '$' ? formatCurrency(max) : max.toFixed(1)}{unit}</span>
        </div>
        
        {/* Summary statistics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-600">
            <Tooltip content="Average value across all vessels. Shows typical performance level.">
              <span className="font-medium border-b border-dotted border-gray-400 cursor-help">Mean:</span>
            </Tooltip> {unit === '$' ? formatCurrency(data.mean) : data.mean.toFixed(1)}{unit}
          </div>
          <div className="text-gray-600">
            <Tooltip content="Standard Deviation measures spread from average. Lower = more consistent performance.">
              <span className="font-medium border-b border-dotted border-gray-400 cursor-help">Std Dev:</span>
            </Tooltip> {unit === '$' ? formatCurrency(data.standardDeviation) : data.standardDeviation.toFixed(1)}{unit}
          </div>
          <div className="text-gray-600">
            <Tooltip content="Coefficient of Variation: consistency measure. <10% = Excellent, <20% = Good, <30% = Fair, >30% = High Variance.">
              <span className="font-medium border-b border-dotted border-gray-400 cursor-help">CV:</span>
            </Tooltip> {data.coefficientOfVariation.toFixed(1)}%
          </div>
          <div className="text-gray-600">
            <Tooltip content="Vessels performing unusually high or low. Red dots = extremely high, orange dots = extremely low.">
              <span className="font-medium border-b border-dotted border-gray-400 cursor-help">Outliers:</span>
            </Tooltip> {outliers.length}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Control Chart Component for Process Control
 */
export const ControlChart: React.FC<ControlChartProps> = ({
  data,
  title,
  unit,
  mean,
  upperControlLimit,
  lowerControlLimit,
  color = '#00754F'
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  
  // Validate data to prevent NaN errors
  if (!data || data.length === 0 || !isFinite(mean) || !isFinite(upperControlLimit) || !isFinite(lowerControlLimit)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <Tooltip content="Control chart monitors process stability. Points outside red dashed lines (±2σ) indicate out-of-control performance needing investigation.">
            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          No data available for analysis
        </div>
      </div>
    );
  }
  
  const chartHeight = 200;
  const chartWidth = 400;
  const maxValue = Math.max(...data.map(d => d.value), upperControlLimit);
  const minValue = Math.min(...data.map(d => d.value), lowerControlLimit);
  const range = maxValue - minValue > 0 ? maxValue - minValue : 1; // Prevent division by zero
  const padding = 20;
  
  const getY = (value: number) => {
    if (!isFinite(value)) return chartHeight / 2; // Fallback for invalid values
    return chartHeight - padding - ((value - minValue) / range) * (chartHeight - 2 * padding);
  };
  const getX = (index: number) => {
    if (data.length <= 1) return chartWidth / 2; // Fallback for single data point
    return padding + (index / (data.length - 1)) * (chartWidth - 2 * padding);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Tooltip content="Control chart monitors process stability. Points outside red dashed lines (±2σ) indicate out-of-control performance needing investigation.">
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
        </Tooltip>
      </div>
      
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="border border-gray-300 rounded">
          {/* Control limits */}
          <line
            x1={padding}
            y1={getY(upperControlLimit)}
            x2={chartWidth - padding}
            y2={getY(upperControlLimit)}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <line
            x1={padding}
            y1={getY(lowerControlLimit)}
            x2={chartWidth - padding}
            y2={getY(lowerControlLimit)}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Mean line */}
          <line
            x1={padding}
            y1={getY(mean)}
            x2={chartWidth - padding}
            y2={getY(mean)}
            stroke={color}
            strokeWidth="2"
          />
          
          {/* Data points and line */}
          {data.length > 1 && (
            <polyline
              points={data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity={0.7}
            />
          )}
          
          {/* Data points */}
          {data.map((d, index) => {
            const isOutOfControl = d.value > upperControlLimit || d.value < lowerControlLimit;
            const isHovered = hoveredPoint === index;
            return (
              <g key={index}>
                <circle
                  cx={getX(index)}
                  cy={getY(d.value)}
                  r={isHovered ? "6" : "4"}
                  fill={isOutOfControl ? "#ef4444" : color}
                  stroke="#fff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {isHovered && (
                  <g>
                    {(() => {
                      // Smart tooltip positioning to avoid cutoff
                      const pointY = getY(d.value);
                      const tooltipHeight = 30;
                      const tooltipPadding = 5;
                      
                      // If point is too close to top, show tooltip below
                      const showBelow = pointY < (tooltipHeight + tooltipPadding);
                      const tooltipY = showBelow ? pointY + 10 : pointY - 35;
                      const textY1 = showBelow ? pointY + 25 : pointY - 25;
                      const textY2 = showBelow ? pointY + 35 : pointY - 15;
                      
                      return (
                        <>
                          {/* Tooltip background */}
                          <rect
                            x={getX(index) - 40}
                            y={tooltipY}
                            width="80"
                            height="30"
                            fill="rgba(0, 0, 0, 0.8)"
                            rx="4"
                            ry="4"
                          />
                          {/* Tooltip text */}
                          <text
                            x={getX(index)}
                            y={textY1}
                            fill="white"
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {d.vesselName}
                          </text>
                          <text
                            x={getX(index)}
                            y={textY2}
                            fill="white"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            {unit === '$' ? formatCurrency(d.value) : d.value.toFixed(1)}{unit}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Labels */}
          <text x={chartWidth - padding - 50} y={getY(upperControlLimit) - 5} fontSize="10" fill="#ef4444">
            UCL: {unit === '$' ? formatCurrency(upperControlLimit) : upperControlLimit.toFixed(1)}
          </text>
          <text x={chartWidth - padding - 50} y={getY(mean) - 5} fontSize="10" fill={color}>
            Mean: {unit === '$' ? formatCurrency(mean) : mean.toFixed(1)}
          </text>
          <text x={chartWidth - padding - 50} y={getY(lowerControlLimit) + 15} fontSize="10" fill="#ef4444">
            LCL: {unit === '$' ? formatCurrency(lowerControlLimit) : lowerControlLimit.toFixed(1)}
          </text>
        </svg>
        
        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {data.slice(0, 5).map((d, index) => (
            <span key={index} className="text-gray-600">
              {d.vesselName}: {unit === '$' ? formatCurrency(d.value) : d.value.toFixed(1)}{unit}
            </span>
          ))}
          {data.length > 5 && <span className="text-gray-500">+{data.length - 5} more</span>}
        </div>
      </div>
    </div>
  );
};

/**
 * Variance Statistics Card Component
 */
export const VarianceStatsCard: React.FC<VarianceStatsCardProps> = ({
  title,
  variance,
  unit,
  icon: Icon,
  color = 'bg-bp-green',
  tooltipContent = "Statistical variance analysis measures consistency and identifies operational performance patterns."
}) => {
  // Validate variance data
  if (!variance || variance.count === 0 || !isFinite(variance.mean) || !isFinite(variance.standardDeviation)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <Tooltip content={tooltipContent}>
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
            </Tooltip>
          </div>
          <Icon className="h-5 w-5 text-bp-green" />
        </div>
        <div className="flex items-center justify-center h-20 text-gray-500 text-sm">
          No data available for analysis
        </div>
      </div>
    );
  }

  const getVarianceStatus = () => {
    const cv = variance.coefficientOfVariation;
    if (!isFinite(cv)) return { status: 'No Data', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    if (cv < 10) return { status: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (cv < 20) return { status: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (cv < 30) return { status: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'High Variance', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const status = getVarianceStatus();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <Tooltip content={tooltipContent}>
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </Tooltip>
        </div>
        <Icon className="h-5 w-5 text-bp-green" />
      </div>
      
      <div className="space-y-3">
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Tooltip content="Average performance across all vessels in this metric.">
              <p className="text-xs text-gray-500 border-b border-dotted border-gray-300 cursor-help">Mean</p>
            </Tooltip>
            <p className="text-lg font-bold text-gray-900">
              {unit === '$' ? formatCurrency(variance.mean) : variance.mean.toFixed(1)}<span className="text-sm font-normal">{unit !== '$' ? unit : ''}</span>
            </p>
          </div>
          <div>
            <Tooltip content="Standard deviation shows how much performance varies. Lower values indicate more consistent operations.">
              <p className="text-xs text-gray-500 border-b border-dotted border-gray-300 cursor-help">Std Dev</p>
            </Tooltip>
            <p className="text-lg font-bold text-gray-900">
              {unit === '$' ? formatCurrency(variance.standardDeviation) : variance.standardDeviation.toFixed(1)}<span className="text-sm font-normal">{unit !== '$' ? unit : ''}</span>
            </p>
          </div>
        </div>
        
        {/* Variance status */}
        <Tooltip content={`Consistency rating based on Coefficient of Variation (CV). ${status.status} means ${status.status === 'Excellent' ? 'very consistent operations (CV < 10%)' : status.status === 'Good' ? 'acceptable consistency (CV < 20%)' : status.status === 'Fair' ? 'some operational variation (CV < 30%)' : 'high operational inconsistency (CV > 30%)'}.`}>
          <div className={`rounded-lg p-2 ${status.bgColor} cursor-help`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Consistency:</span>
              <span className={`text-xs font-semibold ${status.color}`}>{status.status}</span>
            </div>
            <div className="mt-1">
              <span className="text-xs text-gray-600">CV: {variance.coefficientOfVariation.toFixed(1)}%</span>
            </div>
          </div>
        </Tooltip>
        
        {/* Outliers alert */}
        {variance.outliers.length > 0 && (
          <Tooltip content="Outliers are vessels performing significantly above or below normal ranges. Investigate these for operational insights or issues.">
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded p-2 cursor-help">
              <AlertTriangle className="h-4 w-4" />
              <span>{variance.outliers.length} outlier{variance.outliers.length > 1 ? 's' : ''} detected</span>
            </div>
          </Tooltip>
        )}
        
        {/* Range */}
        <div className="text-xs text-gray-600">
          <span className="font-medium">Range:</span> {unit === '$' ? formatCurrency(variance.min) : variance.min.toFixed(1)} - {unit === '$' ? formatCurrency(variance.max) : variance.max.toFixed(1)}{unit !== '$' ? unit : ''}
        </div>
      </div>
    </div>
  );
};

/**
 * Operational KPI Variance Dashboard Component for Drilling Operations
 */
interface DrillingOperationalVarianceDashboardProps {
  liftsPerHourVariance: VarianceAnalysis;
  visitsPerWeekVariance: VarianceAnalysis;
  vesselOperationalData: Array<{
    vesselName: string;
    liftsPerHour: number;
    visitsPerWeek: number;
    totalLifts: number;
    totalTonnage: number;
    totalVisits: number;
    cargoOpsHours: number;
    weeksActive: number;
  }>;
}

export const DrillingOperationalVarianceDashboard: React.FC<DrillingOperationalVarianceDashboardProps> = ({
  liftsPerHourVariance,
  visitsPerWeekVariance,
  vesselOperationalData
}) => {
  // Prepare control chart data
  const liftsControlData = vesselOperationalData
    .filter(v => v.liftsPerHour > 0)
    .map(v => ({
      vesselName: v.vesselName,
      value: v.liftsPerHour
    }));

  const visitsControlData = vesselOperationalData
    .filter(v => v.visitsPerWeek > 0)
    .map(v => ({
      vesselName: v.vesselName,
      value: v.visitsPerWeek
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-bp-green to-emerald-600 text-white rounded-lg p-4">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-bold">Drilling Operations KPI Variance Analysis</h2>
          <Tooltip content="Business-critical KPI variance analysis focuses on operational efficiency metrics that directly impact drilling performance. Analyzes consistency and identifies optimization opportunities.">
            <HelpCircle className="h-5 w-5 text-white/80 hover:text-white cursor-help" />
          </Tooltip>
        </div>
        <p className="text-sm opacity-90">Statistical analysis of lifts/hr and visits per week</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VarianceStatsCard
          title="Lifts per Hour Variance"
          variance={liftsPerHourVariance}
          unit=" lifts/hr"
          icon={BarChart3}
          tooltipContent="Measures cargo handling efficiency variance. Low variance indicates consistent lifting operations. High variance suggests training needs or equipment issues affecting productivity."
        />
        <VarianceStatsCard
          title="Visits per Week Variance"
          variance={visitsPerWeekVariance}
          unit=" visits/week"
          icon={Ship}
          tooltipContent="Evaluates operational tempo consistency. Low variance indicates steady scheduling and capacity utilization. High variance suggests irregular operations or demand fluctuations affecting resource allocation."
        />
      </div>
      
      {/* Box Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BoxPlot
          data={liftsPerHourVariance}
          title="Lifts per Hour Distribution"
          unit=" lifts/hr"
        />
        <BoxPlot
          data={visitsPerWeekVariance}
          title="Visits per Week Distribution"
          unit=" visits/week"
        />
      </div>
      
      {/* Control Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ControlChart
          data={liftsControlData}
          title="Lifts per Hour Control Chart"
          unit=" lifts/hr"
          mean={liftsPerHourVariance.mean}
          upperControlLimit={liftsPerHourVariance.mean + 2 * liftsPerHourVariance.standardDeviation}
          lowerControlLimit={Math.max(0, liftsPerHourVariance.mean - 2 * liftsPerHourVariance.standardDeviation)}
        />
        <ControlChart
          data={visitsControlData}
          title="Visits per Week Control Chart"
          unit=" visits/week"
          mean={visitsPerWeekVariance.mean}
          upperControlLimit={visitsPerWeekVariance.mean + 2 * visitsPerWeekVariance.standardDeviation}
          lowerControlLimit={Math.max(0, visitsPerWeekVariance.mean - 2 * visitsPerWeekVariance.standardDeviation)}
        />
      </div>
    </div>
  );
};

/**
 * Vessel Utilization Variance Dashboard Component
 */
interface VesselUtilizationVarianceDashboardProps {
  utilizationVariance: VarianceAnalysis;
  productiveHoursVariance: VarianceAnalysis;
  vesselUtilizationData: Array<{
    vesselName: string;
    utilizationPercentage: number;
    productiveHours: number;
    totalOffshoreHours: number;
    waitingHours: number;
    transitHours: number;
  }>;
}

export const VesselUtilizationVarianceDashboard: React.FC<VesselUtilizationVarianceDashboardProps> = ({
  utilizationVariance,
  productiveHoursVariance,
  vesselUtilizationData
}) => {
  // Prepare control chart data
  const utilizationControlData = vesselUtilizationData
    .filter(v => v.utilizationPercentage > 0)
    .map(v => ({
      vesselName: v.vesselName,
      value: v.utilizationPercentage
    }));

  const productiveHoursControlData = vesselUtilizationData
    .filter(v => v.productiveHours > 0)
    .map(v => ({
      vesselName: v.vesselName,
      value: v.productiveHours
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-4">
        <h2 className="text-lg font-bold mb-1">Vessel Utilization Variance Analysis</h2>
        <p className="text-sm opacity-90">Statistical analysis of drilling vessel utilization efficiency</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VarianceStatsCard
          title="Utilization % Variance"
          variance={utilizationVariance}
          unit="%"
          icon={Target}
        />
        <VarianceStatsCard
          title="Productive Hours Variance"
          variance={productiveHoursVariance}
          unit=" hrs"
          icon={TrendingUp}
        />
      </div>
      
      {/* Box Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BoxPlot
          data={utilizationVariance}
          title="Utilization Percentage Distribution"
          unit="%"
          color="bg-blue-600"
        />
        <BoxPlot
          data={productiveHoursVariance}
          title="Productive Hours Distribution"
          unit=" hrs"
          color="bg-blue-600"
        />
      </div>
      
      {/* Control Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ControlChart
          data={utilizationControlData}
          title="Utilization % Control Chart"
          unit="%"
          mean={utilizationVariance.mean}
          upperControlLimit={Math.min(100, utilizationVariance.mean + 2 * utilizationVariance.standardDeviation)}
          lowerControlLimit={Math.max(0, utilizationVariance.mean - 2 * utilizationVariance.standardDeviation)}
          color="#2563eb"
        />
        <ControlChart
          data={productiveHoursControlData}
          title="Productive Hours Control Chart"
          unit=" hrs"
          mean={productiveHoursVariance.mean}
          upperControlLimit={productiveHoursVariance.mean + 2 * productiveHoursVariance.standardDeviation}
          lowerControlLimit={Math.max(0, productiveHoursVariance.mean - 2 * productiveHoursVariance.standardDeviation)}
          color="#2563eb"
        />
      </div>
    </div>
  );
};

/**
 * Operational KPI Variance Dashboard Component for Production Operations
 */
interface ProductionOperationalVarianceDashboardProps {
  liftsPerHourVariance: VarianceAnalysis;
  visitsPerWeekVariance?: VarianceAnalysis;
  vesselOperationalData: Array<{
    vesselName: string;
    liftsPerHour: number;
    visitsPerWeek: number;
    totalLifts: number;
    totalTonnage: number;
    totalVisits: number;
    cargoOpsHours: number;
    weeksActive: number;
  }>;
}

export const ProductionOperationalVarianceDashboard: React.FC<ProductionOperationalVarianceDashboardProps> = ({
  liftsPerHourVariance,
  visitsPerWeekVariance,
  vesselOperationalData
}) => {
  // Prepare control chart data
  const liftsControlData = vesselOperationalData
    .filter(v => v.liftsPerHour > 0)
    .map(v => ({
      vesselName: v.vesselName,
      value: v.liftsPerHour
    }));

  const visitsControlData = vesselOperationalData
    .filter(v => v.visitsPerWeek > 0)
    .map(v => ({
      vesselName: v.vesselName,
      value: v.visitsPerWeek
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-4">
        <h2 className="text-lg font-bold mb-1">Production Operations KPI Variance Analysis</h2>
        <p className="text-sm opacity-90">Statistical analysis of production vessel operational efficiency</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VarianceStatsCard
          title="Lifts per Hour Variance"
          variance={liftsPerHourVariance}
          unit=" lifts/hr"
          icon={BarChart3}
        />
        {visitsPerWeekVariance && (
          <VarianceStatsCard
            title="Visits per Week Variance"
            variance={visitsPerWeekVariance}
            unit=" visits/week"
            icon={Ship}
          />
        )}
      </div>
      
      {/* Box Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BoxPlot
          data={liftsPerHourVariance}
          title="Lifts per Hour Distribution"
          unit=" lifts/hr"
        />
        {visitsPerWeekVariance && (
          <BoxPlot
            data={visitsPerWeekVariance}
            title="Visits per Week Distribution"
            unit=" visits/week"
          />
        )}
      </div>
      
      {/* Control Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ControlChart
          data={liftsControlData}
          title="Lifts per Hour Control Chart"
          unit=" lifts/hr"
          mean={liftsPerHourVariance.mean}
          upperControlLimit={liftsPerHourVariance.mean + 2 * liftsPerHourVariance.standardDeviation}
          lowerControlLimit={Math.max(0, liftsPerHourVariance.mean - 2 * liftsPerHourVariance.standardDeviation)}
        />
        {visitsPerWeekVariance && (
          <ControlChart
            data={visitsControlData}
            title="Visits per Week Control Chart"
            unit=" visits/week"
            mean={visitsPerWeekVariance.mean}
            upperControlLimit={visitsPerWeekVariance.mean + 2 * visitsPerWeekVariance.standardDeviation}
            lowerControlLimit={Math.max(0, visitsPerWeekVariance.mean - 2 * visitsPerWeekVariance.standardDeviation)}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Production Support Variance Dashboard Component
 */
interface ProductionSupportVarianceDashboardProps {
  monthlyCostVariance: VarianceAnalysis;
  visitsPerWeekVariance?: VarianceAnalysis;
  facilityEfficiencyData: Array<{
    facilityName: string;
    averageMonthlyCost: number;
    averageVisitsPerWeek: number;
    totalSupplyRuns: number;
    totalSupportHours: number;
    utilityTransfers: number;
    chemicalTransfers: number;
  }>;
}

export const ProductionSupportVarianceDashboard: React.FC<ProductionSupportVarianceDashboardProps> = ({
  monthlyCostVariance,
  visitsPerWeekVariance,
  facilityEfficiencyData
}) => {
  // Prepare control chart data
  const monthlyCostControlData = facilityEfficiencyData
    .filter(f => f.averageMonthlyCost > 0)
    .map(f => ({
      vesselName: f.facilityName,
      value: f.averageMonthlyCost
    }));

  const visitsControlData = facilityEfficiencyData
    .filter(f => f.averageVisitsPerWeek > 0)
    .map(f => ({
      vesselName: f.facilityName,
      value: f.averageVisitsPerWeek
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg p-4">
        <h2 className="text-lg font-bold mb-1">Production Support Variance Analysis</h2>
        <p className="text-sm opacity-90">Statistical analysis of production facility cost and visit patterns</p>
      </div>
      
      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${visitsPerWeekVariance ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4`}>
        <VarianceStatsCard
          title="Monthly Cost Variance"
          variance={monthlyCostVariance}
          unit="$"
          icon={DollarSign}
          tooltipContent="Monthly vessel cost variance measures consistency in production facility support costs. Lower variance indicates more predictable operational expenses."
        />
        {visitsPerWeekVariance && (
        <VarianceStatsCard
          title="Visits per Week Variance"
          variance={visitsPerWeekVariance}
          unit=" visits/week"
          icon={Calendar}
          tooltipContent="Visits per week variance measures consistency in production facility support frequency. Lower variance indicates more predictable supply schedules."
        />
        )}
      </div>
      
      {/* Box Plots */}
      <div className={`grid grid-cols-1 ${visitsPerWeekVariance ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4`}>
        <BoxPlot
          data={monthlyCostVariance}
          title="Monthly Cost Distribution"
          unit="$"
          color="bg-emerald-600"
        />
        {visitsPerWeekVariance && (
        <BoxPlot
          data={visitsPerWeekVariance}
          title="Visits per Week Distribution"
          unit=" visits/week"
          color="bg-emerald-600"
        />
        )}
      </div>
      
      {/* Control Charts */}
      <div className={`grid grid-cols-1 ${visitsPerWeekVariance ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4`}>
        <ControlChart
          data={monthlyCostControlData}
          title="Monthly Cost Control Chart"
          unit="$"
          mean={monthlyCostVariance.mean}
          upperControlLimit={monthlyCostVariance.mean + 2 * monthlyCostVariance.standardDeviation}
          lowerControlLimit={Math.max(0, monthlyCostVariance.mean - 2 * monthlyCostVariance.standardDeviation)}
          color="#059669"
        />
        {visitsPerWeekVariance && (
        <ControlChart
          data={visitsControlData}
          title="Visits per Week Control Chart"
          unit=" visits/week"
          mean={visitsPerWeekVariance.mean}
          upperControlLimit={visitsPerWeekVariance.mean + 2 * visitsPerWeekVariance.standardDeviation}
          lowerControlLimit={Math.max(0, visitsPerWeekVariance.mean - 2 * visitsPerWeekVariance.standardDeviation)}
          color="#059669"
        />
        )}
      </div>
    </div>
  );
};