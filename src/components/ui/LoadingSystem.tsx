/**
 * Unified Loading System for BP Logistics Dashboard
 * Provides consistent loading states and skeleton screens across the application
 */

import React from 'react';
import { Spinner } from '@nextui-org/react';
import { Loader2, Database, Upload, RefreshCw } from 'lucide-react';

export type LoadingState = 
  | 'idle'
  | 'loading'
  | 'uploading'
  | 'processing'
  | 'syncing'
  | 'error'
  | 'success';

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  state: LoadingState;
  size?: LoadingSize;
  message?: string;
  className?: string;
}

interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
  rows?: number;
}

interface LoadingOverlayProps {
  isVisible: boolean;
  state: LoadingState;
  message?: string;
  progress?: number;
  onCancel?: () => void;
}

// Loading icons for different states
const LoadingIcons = {
  loading: Loader2,
  uploading: Upload,
  processing: Database,
  syncing: RefreshCw,
  error: null,
  success: null,
  idle: null
};

// Loading messages for different states
const LoadingMessages = {
  loading: 'Loading data...',
  uploading: 'Uploading files...',
  processing: 'Processing data...',
  syncing: 'Syncing with server...',
  error: 'Something went wrong',
  success: 'Complete!',
  idle: ''
};

// Size configurations
const SizeConfig = {
  sm: { spinner: 'sm', icon: 16, text: 'text-sm' },
  md: { spinner: 'md', icon: 20, text: 'text-base' },
  lg: { spinner: 'lg', icon: 24, text: 'text-lg' },
  xl: { spinner: 'lg', icon: 32, text: 'text-xl' }
} as const;

/**
 * Unified loading spinner with consistent styling
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  state,
  size = 'md',
  message,
  className = ''
}) => {
  if (state === 'idle') return null;

  const config = SizeConfig[size];
  const Icon = LoadingIcons[state];
  const defaultMessage = LoadingMessages[state];
  const displayMessage = message || defaultMessage;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {Icon ? (
        <Icon 
          size={config.icon} 
          className={`animate-spin ${
            state === 'error' ? 'text-red-500' : 
            state === 'success' ? 'text-green-500' : 
            'text-blue-500'
          }`} 
        />
      ) : (
        <Spinner 
          size={config.spinner} 
          color={
            state === 'error' ? 'danger' : 
            state === 'success' ? 'success' : 
            'primary'
          }
        />
      )}
      {displayMessage && (
        <p className={`${config.text} text-gray-600 font-medium`}>
          {displayMessage}
        </p>
      )}
    </div>
  );
};

/**
 * Skeleton loader for content placeholders
 */
export const SkeletonLoader: React.FC<SkeletonProps> = ({
  height = '4',
  width = 'full',
  className = '',
  rows = 1
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 animate-pulse rounded h-${height} w-${width}`}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '1.5s'
          }}
        />
      ))}
    </div>
  );
};

/**
 * Full-screen loading overlay
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  state,
  message,
  progress,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <LoadingSpinner state={state} size="lg" message={message} />
          
          {progress !== undefined && (
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% complete</p>
            </div>
          )}

          {onCancel && state !== 'success' && state !== 'error' && (
            <button
              onClick={onCancel}
              className="mt-6 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * KPI Card skeleton for dashboard loading states
 */
export const KPICardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <SkeletonLoader height="4" width="20" />
      <SkeletonLoader height="8" width="8" />
    </div>
    <SkeletonLoader height="8" width="24" className="mb-2" />
    <SkeletonLoader height="3" width="16" />
  </div>
);

/**
 * Dashboard grid skeleton
 */
export const DashboardSkeleton: React.FC<{ cards?: number }> = ({ cards = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: cards }).map((_, index) => (
      <KPICardSkeleton key={index} />
    ))}
  </div>
);

/**
 * Table skeleton for data tables
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    {/* Header */}
    <div className="bg-gray-50 p-4 border-b">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLoader key={index} height="4" width="20" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonLoader 
                key={colIndex} 
                height="4" 
                width={colIndex === 0 ? '32' : '24'} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Hook for managing loading states
 */
export const useLoadingState = (initialState: LoadingState = 'idle') => {
  const [state, setState] = React.useState<LoadingState>(initialState);
  const [progress, setProgress] = React.useState<number>(0);
  const [message, setMessage] = React.useState<string>('');

  const setLoading = (newState: LoadingState, newMessage?: string, newProgress?: number) => {
    setState(newState);
    if (newMessage !== undefined) setMessage(newMessage);
    if (newProgress !== undefined) setProgress(newProgress);
  };

  const reset = () => {
    setState('idle');
    setProgress(0);
    setMessage('');
  };

  return {
    state,
    progress,
    message,
    setLoading,
    reset,
    isLoading: state !== 'idle' && state !== 'success' && state !== 'error'
  };
};