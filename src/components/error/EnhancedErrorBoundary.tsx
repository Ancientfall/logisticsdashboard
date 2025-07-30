/**
 * Enhanced Error Boundary with User-Friendly Recovery Options
 * Provides graceful error handling with contextual recovery actions
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { logError } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showErrorDetails: boolean;
  retryCount: number;
}

/**
 * Enhanced Error Boundary with recovery options
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    logError('Component error caught by boundary', {
      component: 'error-boundary',
      data: {
        context: this.props.context,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      }
    });

    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleErrorDetails = () => {
    this.setState(prevState => ({
      showErrorDetails: !prevState.showErrorDetails
    }));
  };

  getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'medium';
    }
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'low';
    }
    
    return 'high';
  };

  getRecoveryActions = () => {
    const { error, retryCount } = this.state;
    const severity = error ? this.getErrorSeverity(error) : 'high';

    const actions = [];

    // Retry action (limit retries)
    if (retryCount < 3) {
      actions.push({
        label: retryCount === 0 ? 'Try Again' : `Retry (${retryCount + 1}/3)`,
        icon: RefreshCw,
        onClick: this.handleRetry,
        primary: true
      });
    }

    // Refresh page for medium/high severity
    if (severity !== 'low') {
      actions.push({
        label: 'Refresh Page',
        icon: RefreshCw,
        onClick: this.handleRefresh,
        primary: false
      });
    }

    // Go to home
    actions.push({
      label: 'Go to Home',
      icon: Home,
      onClick: this.handleGoHome,
      primary: false
    });

    return actions;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showErrorDetails } = this.state;
      const severity = error ? this.getErrorSeverity(error) : 'high';
      const recoveryActions = this.getRecoveryActions();

      const severityConfig = {
        low: {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-800'
        },
        medium: {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-800'
        },
        high: {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800'
        }
      };

      const config = severityConfig[severity];

      return (
        <div className={`min-h-96 flex items-center justify-center p-8 ${config.bgColor}`}>
          <div className={`max-w-md w-full ${config.bgColor} ${config.borderColor} border-2 rounded-lg p-6 shadow-lg`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className={config.iconColor} />
              <h2 className={`text-lg font-semibold ${config.titleColor}`}>
                Something went wrong
              </h2>
            </div>

            {/* Error message */}
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                {severity === 'low' && "We encountered a minor issue that shouldn't affect your experience."}
                {severity === 'medium' && "There was a problem loading some content. This might be a temporary issue."}
                {severity === 'high' && "An unexpected error occurred. We're working to fix this issue."}
              </p>
              
              {this.props.context && (
                <p className="text-sm text-gray-600">
                  Context: {this.props.context}
                </p>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="space-y-3 mb-4">
              {recoveryActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`
                      w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
                      ${action.primary 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                    `}
                  >
                    <Icon size={16} />
                    {action.label}
                  </button>
                );
              })}
            </div>

            {/* Error Details Toggle */}
            {(this.props.showDetails || process.env.NODE_ENV === 'development') && error && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={this.toggleErrorDetails}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Bug size={14} />
                  Error Details
                  {showErrorDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showErrorDetails && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs font-mono">
                    <div className="mb-2">
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1 max-h-32 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1 max-h-32 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Async error boundary for handling async errors
 */
export const useAsyncError = () => {
  const [, setState] = React.useState();
  
  return React.useCallback((error: Error) => {
    setState(() => {
      throw error;
    });
  }, []);
};