import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import BulkFluidDebugPanel from './BulkFluidDebugPanel';
import { testBulkFluidClassification } from '../../utils/testBulkClassification';
import { Bug, CheckCircle, XCircle } from 'lucide-react';

const BulkFluidTestPage: React.FC = () => {
  const { bulkActions } = useData();
  const [testsRun, setTestsRun] = useState(false);
  
  useEffect(() => {
    // Run tests when component mounts
    if (!testsRun) {
      console.log('Running bulk fluid classification tests...');
      testBulkFluidClassification();
      setTestsRun(true);
    }
  }, [testsRun]);
  
  // Count drilling and completion fluids
  const drillingFluidCount = bulkActions.filter(a => a.isDrillingFluid).length;
  const completionFluidCount = bulkActions.filter(a => a.isCompletionFluid).length;
  const totalBulkActions = bulkActions.length;
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bug className="h-8 w-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">Bulk Fluid Classification Debug</h1>
            </div>
            <div className="text-sm text-gray-600">
              Total Bulk Actions: {totalBulkActions}
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Drilling Fluids Detected</p>
                  <p className="text-2xl font-bold text-blue-900">{drillingFluidCount}</p>
                  <p className="text-sm text-blue-600">
                    {totalBulkActions > 0 ? ((drillingFluidCount / totalBulkActions) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
                {drillingFluidCount > 0 ? (
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Completion Fluids Detected</p>
                  <p className="text-2xl font-bold text-purple-900">{completionFluidCount}</p>
                  <p className="text-sm text-purple-600">
                    {totalBulkActions > 0 ? ((completionFluidCount / totalBulkActions) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
                {completionFluidCount > 0 ? (
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Unclassified/Other</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalBulkActions - drillingFluidCount - completionFluidCount}
                  </p>
                  <p className="text-sm text-gray-600">
                    {totalBulkActions > 0 
                      ? (((totalBulkActions - drillingFluidCount - completionFluidCount) / totalBulkActions) * 100).toFixed(1) 
                      : 0}% of total
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Debug Panel */}
        <BulkFluidDebugPanel bulkActions={[]} />
        
        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-3">Debugging Instructions</h2>
          <ol className="space-y-2 text-sm text-yellow-800">
            <li>1. Check the browser console for detailed test results and data analysis</li>
            <li>2. Review the unique bulk types and descriptions in the debug panel above</li>
            <li>3. Look for patterns in the "Unclassified Samples" section</li>
            <li>4. Check the "Potential Drilling/Completion Fluids" sections for items that should be classified</li>
            <li>5. Update the classification keywords in bulkFluidClassification.ts based on the actual data patterns</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-100 rounded">
            <p className="text-sm font-medium text-yellow-900">Common Issues:</p>
            <ul className="mt-1 text-sm text-yellow-800 list-disc list-inside">
              <li>Field names might be different than expected (check capitalization)</li>
              <li>Keywords might need to be adjusted based on actual data terminology</li>
              <li>Some fluids might use abbreviations not covered in the classification logic</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkFluidTestPage;