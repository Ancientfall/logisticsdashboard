// src/components/ui/LoadingScreen.tsx
import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading data, please wait...' 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md text-center">
        <div className="flex flex-col items-center">
          {/* BP Logo with glowing effect */}
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-yellow-400 opacity-20 animate-pulse"></div>
            <svg 
              className="w-20 h-20 relative z-10" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="40" fill="#FFFFFF" />
              <path 
                d="M50 90C72.0914 90 90 72.0914 90 50C90 27.9086 72.0914 10 50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90Z" 
                fill="white" 
              />
              <path 
                d="M50 80C66.5685 80 80 66.5685 80 50C80 33.4315 66.5685 20 50 20C33.4315 20 20 33.4315 20 50C20 66.5685 33.4315 80 50 80Z" 
                fill="#00914F" 
              />
              <path 
                d="M50 70C61.0457 70 70 61.0457 70 50C70 38.9543 61.0457 30 50 30C38.9543 30 30 38.9543 30 50C30 61.0457 38.9543 70 50 70Z" 
                fill="#FFCB05" 
              />
            </svg>
          </div>
          
          {/* Loading spinner */}
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-4"></div>
          
          {/* Message */}
          <p className="text-lg font-medium text-gray-700">{message}</p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-6">
            <div className="h-full bg-gradient-to-r from-green-500 to-yellow-400 rounded-full animate-progressBar"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;