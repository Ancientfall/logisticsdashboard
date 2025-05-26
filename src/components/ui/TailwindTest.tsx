import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bp-green to-bp-blue p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">
          Tailwind CSS is Working! 🎉
        </h1>
        <p className="text-lg text-white/90 mb-8">
          Your Tailwind CSS setup is complete. You can now use all Tailwind utilities in your components.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-bp-green rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-xl">✓</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Utility Classes</h3>
            <p className="text-gray-600">Use classes like `bg-blue-500`, `p-4`, `rounded-lg` directly in your JSX.</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-bp-yellow rounded-full flex items-center justify-center mb-4">
              <span className="text-bp-gray text-xl">🎨</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Custom Colors</h3>
            <p className="text-gray-600">BP brand colors are available: `bg-bp-green`, `text-bp-blue`, etc.</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-bp-blue rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Responsive Design</h3>
            <p className="text-gray-600">Use prefixes like `md:`, `lg:` for responsive layouts.</p>
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-3">Next Steps:</h3>
          <ul className="space-y-2 text-white/90">
            <li className="flex items-start">
              <span className="text-bp-yellow mr-2">•</span>
              Remove this test component when you're ready
            </li>
            <li className="flex items-start">
              <span className="text-bp-yellow mr-2">•</span>
              Start using Tailwind classes in your components
            </li>
            <li className="flex items-start">
              <span className="text-bp-yellow mr-2">•</span>
              Check the Tailwind docs at tailwindcss.com
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;