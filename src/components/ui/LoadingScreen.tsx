// src/components/ui/LoadingScreen.tsx
import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading data, please wait...' 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-80 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md text-center animate-fade-in">
        <div className="flex flex-col items-center">
          {/* BP Logo */}
          <div className="relative mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center shadow-xl animate-pulse">
              <span className="text-white font-bold text-lg">bp</span>
            </div>
            {/* Rotating ring - properly centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-28 h-28 animate-spin-slow" viewBox="0 0 112 112">
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeDasharray="180 100"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          {/* Message */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{message}</h3>
          <p className="text-sm text-gray-600 mb-6">Processing your offshore vessel operations data</p>
          
          {/* Progress indicators */}
          <div className="w-full space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-600 to-green-700 rounded-full animate-pulse" 
                   style={{ width: '75%', transition: 'width 0.5s ease-out' }} />
            </div>
            
            {/* Loading dots */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
          
          {/* Status text */}
          <div className="mt-6 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Analyzing vessel performance metrics...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;