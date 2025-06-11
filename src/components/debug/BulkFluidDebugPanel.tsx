import React, { useState } from 'react';
import { BulkAction } from '../../types';
import { debugBulkFluidClassification } from '../../utils/bulkFluidDebugger';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

interface BulkFluidDebugPanelProps {
  bulkActions: BulkAction[];
}

const BulkFluidDebugPanel: React.FC<BulkFluidDebugPanelProps> = ({ bulkActions }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const debugInfo = debugBulkFluidClassification(bulkActions);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-yellow-800">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-semibold">Bulk Fluid Classification Debug Panel</h3>
      </div>
      
      {/* Summary */}
      <div className="bg-white rounded p-3 space-y-2">
        <h4 className="font-medium text-sm">Classification Summary:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>Total Actions: <span className="font-semibold">{debugInfo.totalBulkActions}</span></div>
          <div>Drilling Fluids: <span className="font-semibold text-blue-600">{debugInfo.drillingFluids}</span></div>
          <div>Completion Fluids: <span className="font-semibold text-purple-600">{debugInfo.completionFluids}</span></div>
          <div>Other: <span className="font-semibold text-gray-600">{debugInfo.otherFluids}</span></div>
        </div>
      </div>
      
      {/* Unique Bulk Types */}
      <div className="bg-white rounded p-3">
        <button
          onClick={() => toggleSection('bulkTypes')}
          className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-blue-600"
        >
          {expandedSections.bulkTypes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Unique Bulk Types ({debugInfo.uniqueBulkTypes.length})
        </button>
        {expandedSections.bulkTypes && (
          <div className="mt-2 space-y-1">
            {debugInfo.uniqueBulkTypes.map((type, idx) => (
              <div key={idx} className="text-xs bg-gray-50 px-2 py-1 rounded">
                {type}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Unique Descriptions */}
      <div className="bg-white rounded p-3">
        <button
          onClick={() => toggleSection('descriptions')}
          className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-blue-600"
        >
          {expandedSections.descriptions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Unique Descriptions ({debugInfo.uniqueDescriptions.length})
        </button>
        {expandedSections.descriptions && (
          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {debugInfo.uniqueDescriptions.map((desc, idx) => (
              <div key={idx} className="text-xs bg-gray-50 px-2 py-1 rounded">
                {desc || '(empty)'}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Potentially Misclassified */}
      {debugInfo.sampleMisclassified.length > 0 && (
        <div className="bg-white rounded p-3">
          <button
            onClick={() => toggleSection('misclassified')}
            className="flex items-center gap-2 w-full text-left font-medium text-sm hover:text-blue-600"
          >
            {expandedSections.misclassified ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Potentially Misclassified ({debugInfo.sampleMisclassified.length})
          </button>
          {expandedSections.misclassified && (
            <div className="mt-2 space-y-2">
              {debugInfo.sampleMisclassified.map((item, idx) => (
                <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                  <div><span className="font-medium">Type:</span> {item.bulkType}</div>
                  {item.description && <div><span className="font-medium">Description:</span> {item.description}</div>}
                  <div><span className="font-medium">Classification:</span> {item.classification}</div>
                  <div><span className="font-medium">Is Drilling:</span> {item.isDrillingFluid ? 'Yes' : 'No'}</div>
                  <div><span className="font-medium">Is Completion:</span> {item.isCompletionFluid ? 'Yes' : 'No'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="text-xs text-gray-600">
        <p>Check browser console for detailed logging.</p>
        <p>If drilling/completion fluids aren't detected, update keywords in bulkFluidClassification.ts</p>
      </div>
    </div>
  );
};

export default BulkFluidDebugPanel;