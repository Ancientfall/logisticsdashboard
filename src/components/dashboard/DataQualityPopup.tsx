import React from 'react';
import { X, AlertTriangle, CheckCircle, XCircle, Info, FileSpreadsheet } from 'lucide-react';

interface DataQualityIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  affectedRecords?: number;
  details?: string[];
}

interface DataQualityPopupProps {
  isOpen: boolean;
  onClose: () => void;
  issues: DataQualityIssue[];
  totalRecords: number;
  validRecords: number;
}

const DataQualityPopup: React.FC<DataQualityPopupProps> = ({
  isOpen,
  onClose,
  issues,
  totalRecords,
  validRecords
}) => {
  if (!isOpen) return null;

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getIssueColorClasses = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, DataQualityIssue[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Data Quality Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{totalRecords}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validRecords}</div>
              <div className="text-sm text-gray-600">Valid Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Data Quality Score</span>
              <span>{Math.round((validRecords / totalRecords) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(validRecords / totalRecords) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          {Object.entries(groupedIssues).map(([category, categoryIssues]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <span className="flex-1">{category}</span>
                <span className="text-sm font-normal text-gray-500">
                  {categoryIssues.length} issue{categoryIssues.length !== 1 ? 's' : ''}
                </span>
              </h3>
              
              <div className="space-y-3">
                {categoryIssues.map((issue, idx) => (
                  <div 
                    key={idx} 
                    className={`border rounded-lg p-4 ${getIssueColorClasses(issue.type)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIssueIcon(issue.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{issue.message}</div>
                        {issue.affectedRecords && (
                          <div className="text-sm text-gray-600 mt-1">
                            Affects {issue.affectedRecords} record{issue.affectedRecords !== 1 ? 's' : ''}
                          </div>
                        )}
                        {issue.details && issue.details.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">Details:</div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {issue.details.map((detail, detailIdx) => (
                                <li key={detailIdx} className="flex items-start">
                                  <span className="text-gray-400 mr-2">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800">No Data Quality Issues Found!</h3>
              <p className="text-gray-600 mt-2">Your data is clean and ready for analysis.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Last checked: {new Date().toLocaleString()}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataQualityPopup;