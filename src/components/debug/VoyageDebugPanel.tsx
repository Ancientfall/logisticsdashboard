import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';

interface VoyageDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const VoyageDebugPanel: React.FC<VoyageDebugPanelProps> = ({ isOpen, onClose }) => {
  const { voyageList } = useData();
  const [selectedVessel, setSelectedVessel] = useState('Stena IceMAX');
  const [selectedMonth, setSelectedMonth] = useState('May 2025');

  const debugAnalysis = useMemo(() => {
    if (!voyageList || voyageList.length === 0) {
      return null;
    }

    // Filter for specific vessel
    const vesselVoyages = voyageList.filter(voyage => 
      voyage.vessel && voyage.vessel.toLowerCase().includes(selectedVessel.toLowerCase())
    );

    // Filter by month/year
    const monthYearVoyages = vesselVoyages.filter(voyage => {
      if (!voyage.voyageDate) return false;
      const itemDate = new Date(voyage.voyageDate);
      const monthLabel = `${itemDate.toLocaleString('default', { month: 'long' })} ${itemDate.getFullYear()}`;
      return monthLabel === selectedMonth;
    });

    // Check for duplicates
    const voyageNumbers = monthYearVoyages.map(v => v.voyageNumber);
    const uniqueVoyageNumbers = new Set(voyageNumbers);
    const duplicates = voyageNumbers.filter((num, index) => voyageNumbers.indexOf(num) !== index);

    // Group by unique voyage ID
    const uniqueVoyageIds = new Set(monthYearVoyages.map(v => v.uniqueVoyageId));

    // Date analysis
    const dateIssues = monthYearVoyages.filter(v => !v.voyageDate);
    const validDates = monthYearVoyages.filter(v => v.voyageDate);

    return {
      totalVesselVoyages: vesselVoyages.length,
      monthYearVoyages: monthYearVoyages.length,
      uniqueVoyageNumbers: uniqueVoyageNumbers.size,
      uniqueVoyageIds: uniqueVoyageIds.size,
      duplicateVoyageNumbers: duplicates,
      dateIssues: dateIssues.length,
      validDates: validDates.length,
      voyageDetails: monthYearVoyages.map(v => ({
        voyageNumber: v.voyageNumber,
        uniqueVoyageId: v.uniqueVoyageId,
        voyageDate: v.voyageDate?.toISOString().substring(0, 10),
        startDate: v.startDate?.toISOString().substring(0, 10),
        endDate: v.endDate?.toISOString().substring(0, 10),
        locations: v.locations,
        mission: v.mission,
        durationHours: v.durationHours
      }))
    };
  }, [voyageList, selectedVessel, selectedMonth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Voyage Debug Panel</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="mt-4 flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vessel</label>
              <input
                type="text"
                value={selectedVessel}
                onChange={(e) => setSelectedVessel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter vessel name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="text"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., May 2025"
              />
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {debugAnalysis ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{debugAnalysis.totalVesselVoyages}</div>
                  <div className="text-sm text-blue-600">Total Vessel Voyages</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{debugAnalysis.monthYearVoyages}</div>
                  <div className="text-sm text-green-600">Filtered Voyages</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{debugAnalysis.uniqueVoyageNumbers}</div>
                  <div className="text-sm text-purple-600">Unique Voyage Numbers</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">{debugAnalysis.uniqueVoyageIds}</div>
                  <div className="text-sm text-orange-600">Unique Voyage IDs</div>
                </div>
              </div>

              {/* Issues Detection */}
              {(debugAnalysis.duplicateVoyageNumbers.length > 0 || debugAnalysis.dateIssues > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Issues Detected</h3>
                  {debugAnalysis.duplicateVoyageNumbers.length > 0 && (
                    <div className="mb-2">
                      <span className="text-red-700">Duplicate voyage numbers: </span>
                      <span className="text-red-600">{debugAnalysis.duplicateVoyageNumbers.join(', ')}</span>
                    </div>
                  )}
                  {debugAnalysis.dateIssues > 0 && (
                    <div>
                      <span className="text-red-700">Voyages with date issues: </span>
                      <span className="text-red-600">{debugAnalysis.dateIssues}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Voyage Details Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <h3 className="text-lg font-semibold p-4 bg-gray-50 border-b border-gray-200">
                  Voyage Details ({debugAnalysis.voyageDetails.length} records)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Voyage #</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Unique ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Voyage Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Start Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Duration (hrs)</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Mission</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Locations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {debugAnalysis.voyageDetails.map((voyage, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{voyage.voyageNumber}</td>
                          <td className="px-4 py-2 text-xs text-gray-600">{voyage.uniqueVoyageId}</td>
                          <td className="px-4 py-2">{voyage.voyageDate || '❌ Missing'}</td>
                          <td className="px-4 py-2">{voyage.startDate || '❌ Missing'}</td>
                          <td className="px-4 py-2">{voyage.durationHours?.toFixed(1) || 'N/A'}</td>
                          <td className="px-4 py-2">{voyage.mission}</td>
                          <td className="px-4 py-2 max-w-xs truncate" title={voyage.locations}>
                            {voyage.locations}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Console Log Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    console.clear();
                    console.log('🔍 === VOYAGE DEBUG ANALYSIS ===');
                    console.log('Filter:', { vessel: selectedVessel, month: selectedMonth });
                    console.log('Analysis:', debugAnalysis);
                    console.log('Raw voyage details:', debugAnalysis.voyageDetails);
                    console.log('=== END DEBUG ===');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Log Details to Console
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500">No voyage data available for debugging</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoyageDebugPanel;